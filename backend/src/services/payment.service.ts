import {
  Role,
  TransactionStatus,
  type PrismaClient,
  type Transaction,
} from '../generated/prisma/client';
import { ClinkServiceError } from './clink.errors';
import type { DebitPaymentResult } from './clink.service';
import { PaymentServiceError } from './payment.errors';

export type PurchaseInput = {
  businessId: string;
  customerId: string;
  amountSats: number;
  idempotencyKey: string;
};

export type PurchaseOutcome = 'paid' | 'denied' | 'failed' | 'unknown' | 'pending';

export type PurchaseResult = {
  outcome: PurchaseOutcome;
  transaction: Transaction;
  code?: string;
  message?: string;
};

export type ClinkPaymentPort = {
  requestInvoiceFromOffer(
    nofferString: string,
    amountSats: number,
    description?: string,
  ): Promise<string>;
  requestDebitPayment(
    ndebitString: string,
    bolt11: string,
    amountSats: number,
    description?: string,
  ): Promise<DebitPaymentResult>;
};

const statusOutcome: Record<TransactionStatus, PurchaseOutcome> = {
  [TransactionStatus.PENDING]: 'pending',
  [TransactionStatus.PAID]: 'paid',
  [TransactionStatus.FAILED]: 'failed',
  [TransactionStatus.UNKNOWN]: 'unknown',
};

export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clink: ClinkPaymentPort,
  ) {}

  async purchase(input: PurchaseInput): Promise<PurchaseResult> {
    this.validateInput(input);

    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existing) return this.existingResult(existing, input);

    const [business, customer] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: input.businessId },
        select: { id: true, name: true, nofferString: true, isActive: true },
      }),
      this.prisma.user.findUnique({
        where: { id: input.customerId },
        select: { id: true, role: true, ndebitString: true, isActive: true },
      }),
    ]);

    if (!business || !business.isActive) {
      throw new PaymentServiceError('BUSINESS_NOT_AVAILABLE', 'El negocio no está disponible.', 404);
    }

    if (!customer || !customer.isActive || customer.role !== Role.CUSTOMER) {
      throw new PaymentServiceError('CUSTOMER_NOT_AVAILABLE', 'El cliente no está disponible.', 403);
    }

    if (!customer.ndebitString) {
      throw new PaymentServiceError(
        'WALLET_NOT_CONNECTED',
        'Conecta una wallet antes de realizar la compra.',
        409,
      );
    }

    const pendingTransaction = await this.createPendingTransaction(input);
    if (!pendingTransaction.created) {
      return this.existingResult(pendingTransaction.transaction, input);
    }

    const transaction = pendingTransaction.transaction;
    const description = `Compra en ${business.name}`.slice(0, 100);

    let bolt11: string;
    try {
      bolt11 = await this.requestInvoiceWithRetry(
        business.nofferString,
        input.amountSats,
        description,
      );
    } catch (error: unknown) {
      return this.finishWithClinkError(transaction.id, error, false);
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { bolt11 },
    });

    let payment: DebitPaymentResult;
    try {
      payment = await this.clink.requestDebitPayment(
        customer.ndebitString,
        bolt11,
        input.amountSats,
        description,
      );
    } catch (error: unknown) {
      return this.finishWithClinkError(transaction.id, error, true);
    }

    const paidTransaction = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.PAID,
        preimage: payment.preimage,
        paidAt: new Date(),
      },
    });

    return { outcome: 'paid', transaction: paidTransaction };
  }

  private validateInput(input: PurchaseInput) {
    if (!input.businessId.trim()) {
      throw new PaymentServiceError('INVALID_BUSINESS_ID', 'El negocio es obligatorio.', 400);
    }

    if (!input.customerId.trim()) {
      throw new PaymentServiceError('INVALID_CUSTOMER_ID', 'El cliente es obligatorio.', 400);
    }

    if (!Number.isSafeInteger(input.amountSats) || input.amountSats <= 0 || input.amountSats > 2_147_483_647) {
      throw new PaymentServiceError('INVALID_AMOUNT', 'El monto debe ser un entero positivo en sats.', 400);
    }

    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new PaymentServiceError(
        'INVALID_IDEMPOTENCY_KEY',
        'La clave de idempotencia no es válida.',
        400,
      );
    }
  }

  private async createPendingTransaction(input: PurchaseInput) {
    try {
      return {
        transaction: await this.prisma.transaction.create({
          data: {
            idempotencyKey: input.idempotencyKey.trim(),
            businessId: input.businessId,
            customerId: input.customerId,
            amountSats: input.amountSats,
          },
        }),
        created: true,
      };
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) throw error;

      const existing = await this.prisma.transaction.findUniqueOrThrow({
        where: { idempotencyKey: input.idempotencyKey.trim() },
      });
      return { transaction: this.assertSamePurchase(existing, input), created: false };
    }
  }

  private existingResult(transaction: Transaction, input: PurchaseInput): PurchaseResult {
    this.assertSamePurchase(transaction, input);
    return {
      outcome:
        transaction.status === TransactionStatus.FAILED &&
        transaction.failureCode === 'CLINK_DEBIT_DENIED'
          ? 'denied'
          : statusOutcome[transaction.status],
      transaction,
      code: transaction.failureCode ?? undefined,
      message: transaction.failureMessage ?? undefined,
    };
  }

  private assertSamePurchase(transaction: Transaction, input: PurchaseInput) {
    if (
      transaction.businessId !== input.businessId ||
      transaction.customerId !== input.customerId ||
      transaction.amountSats !== input.amountSats
    ) {
      throw new PaymentServiceError(
        'IDEMPOTENCY_CONFLICT',
        'La clave de idempotencia ya fue utilizada para otra compra.',
        409,
      );
    }

    return transaction;
  }

  private async requestInvoiceWithRetry(
    nofferString: string,
    amountSats: number,
    description: string,
  ) {
    try {
      return await this.clink.requestInvoiceFromOffer(nofferString, amountSats, description);
    } catch (error: unknown) {
      if (!(error instanceof ClinkServiceError) || !error.retryable) throw error;
      return this.clink.requestInvoiceFromOffer(nofferString, amountSats, description);
    }
  }

  private async finishWithClinkError(
    transactionId: string,
    error: unknown,
    debitWasRequested: boolean,
  ): Promise<PurchaseResult> {
    const clinkError =
      error instanceof ClinkServiceError
        ? error
        : new ClinkServiceError({
            operation: debitWasRequested ? 'debit' : 'offer',
            code: 'CLINK_UNEXPECTED_ERROR',
            publicMessage: 'No se pudo completar la operación Lightning.',
            indeterminate: debitWasRequested,
            cause: error,
          });
    const unknown = debitWasRequested && clinkError.indeterminate;
    const denied = clinkError.code === 'CLINK_DEBIT_DENIED';
    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: unknown ? TransactionStatus.UNKNOWN : TransactionStatus.FAILED,
        failureCode: clinkError.code,
        failureMessage: clinkError.publicMessage,
      },
    });

    return {
      outcome: unknown ? 'unknown' : denied ? 'denied' : 'failed',
      transaction: updated,
      code: clinkError.code,
      message: clinkError.publicMessage,
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
