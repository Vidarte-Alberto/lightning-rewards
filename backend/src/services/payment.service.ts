import {
  ProductPriceCurrency,
  Role,
  TransactionStatus,
  type PrismaClient,
  type Transaction,
} from '../generated/prisma/client';
import { ClinkServiceError } from './clink.errors';
import type { DebitPaymentResult } from './clink.service';
import type { LoyaltyResult } from './loyalty.service';
import { PaymentServiceError } from './payment.errors';
import type { MxnPriceConverter } from './coingecko.service';

export type PurchaseInput = {
  businessId: string;
  customerId: string;
  amountSats?: number;
  productId?: string;
  idempotencyKey: string;
};

type ResolvedPurchase = Omit<PurchaseInput, 'amountSats' | 'productId'> & {
  amountSats: number;
  productId: string | null;
  productName: string | null;
  productPriceCurrency: ProductPriceCurrency | null;
  productPriceMxnCents: number | null;
  btcMxnRate: number | null;
};

export type PurchaseOutcome = 'paid' | 'denied' | 'failed' | 'unknown' | 'pending';

export type PurchaseResult = {
  outcome: PurchaseOutcome;
  transaction: Transaction;
  code?: string;
  message?: string;
  loyalty?: LoyaltyResult;
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

export type LoyaltyPort = {
  addStamp(input: {
    businessId: string;
    customerId: string;
    transactionId: string;
  }): Promise<LoyaltyResult>;
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
    private readonly loyalty?: LoyaltyPort,
    private readonly mxnConverter?: MxnPriceConverter,
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
      throw new PaymentServiceError('BUSINESS_NOT_AVAILABLE', 'The business is not available.', 404);
    }

    if (!customer || !customer.isActive || customer.role !== Role.CUSTOMER) {
      throw new PaymentServiceError('CUSTOMER_NOT_AVAILABLE', 'The customer is not available.', 403);
    }

    if (!customer.ndebitString) {
      throw new PaymentServiceError(
        'WALLET_NOT_CONNECTED',
        'Connect a wallet before making a purchase.',
        409,
      );
    }

    const resolvedPurchase = await this.resolvePurchase(input);
    const pendingTransaction = await this.createPendingTransaction(resolvedPurchase);
    if (!pendingTransaction.created) {
      return this.existingResult(pendingTransaction.transaction, input);
    }

    const transaction = pendingTransaction.transaction;
    const description = resolvedPurchase.productName
      ? `${resolvedPurchase.productName} at ${business.name}`.slice(0, 100)
      : `Purchase at ${business.name}`.slice(0, 100);

    let bolt11: string;
    try {
      bolt11 = await this.requestInvoiceWithRetry(
        business.nofferString,
        resolvedPurchase.amountSats,
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
        resolvedPurchase.amountSats,
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

    return this.completePaidPurchase(paidTransaction);
  }

  private validateInput(input: PurchaseInput) {
    if (!input.businessId.trim()) {
      throw new PaymentServiceError('INVALID_BUSINESS_ID', 'The business is required.', 400);
    }

    if (!input.customerId.trim()) {
      throw new PaymentServiceError('INVALID_CUSTOMER_ID', 'The customer is required.', 400);
    }

    const hasAmount = input.amountSats !== undefined;
    const hasProduct = input.productId !== undefined;
    if (hasAmount === hasProduct) {
      throw new PaymentServiceError(
        'INVALID_PURCHASE_SELECTION',
        'Choose either a product or a custom amount.',
        400,
      );
    }

    if (hasAmount && (!Number.isSafeInteger(input.amountSats) || Number(input.amountSats) <= 0 || Number(input.amountSats) > 2_147_483_647)) {
      throw new PaymentServiceError('INVALID_AMOUNT', 'The amount must be a positive integer in sats.', 400);
    }

    if (hasProduct && !input.productId?.trim()) {
      throw new PaymentServiceError('INVALID_PRODUCT_ID', 'The product is required.', 400);
    }

    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new PaymentServiceError(
        'INVALID_IDEMPOTENCY_KEY',
        'The idempotency key is invalid.',
        400,
      );
    }
  }

  private async resolvePurchase(input: PurchaseInput): Promise<ResolvedPurchase> {
    if (input.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: input.productId,
          businessId: input.businessId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          priceCurrency: true,
          priceSats: true,
          priceMxnCents: true,
        },
      });

      if (!product) {
        throw new PaymentServiceError(
          'PRODUCT_NOT_AVAILABLE',
          'The selected product is not available.',
          404,
        );
      }

      let amountSats = product.priceSats;
      let btcMxnRate: number | null = null;
      if (product.priceCurrency === ProductPriceCurrency.MXN) {
        if (!product.priceMxnCents || !this.mxnConverter) {
          throw new PaymentServiceError(
            'EXCHANGE_RATE_UNAVAILABLE',
            'The BTC/MXN exchange rate is temporarily unavailable.',
            503,
          );
        }

        try {
          const conversion = await this.mxnConverter.convertMxnToSats(product.priceMxnCents);
          amountSats = conversion.amountSats;
          btcMxnRate = conversion.btcMxnRate;
          await this.prisma.product.update({
            where: { id: product.id },
            data: {
              priceSats: conversion.amountSats,
              lastBtcMxnRate: conversion.btcMxnRate,
              rateUpdatedAt: conversion.rateUpdatedAt,
            },
          });
        } catch {
          throw new PaymentServiceError(
            'EXCHANGE_RATE_UNAVAILABLE',
            'The BTC/MXN exchange rate is temporarily unavailable.',
            503,
          );
        }
      }

      return {
        ...input,
        amountSats,
        productId: product.id,
        productName: product.name,
        productPriceCurrency: product.priceCurrency,
        productPriceMxnCents: product.priceMxnCents,
        btcMxnRate,
      };
    }

    return {
      ...input,
      amountSats: input.amountSats as number,
      productId: null,
      productName: null,
      productPriceCurrency: null,
      productPriceMxnCents: null,
      btcMxnRate: null,
    };
  }

  private async createPendingTransaction(input: ResolvedPurchase) {
    try {
      return {
        transaction: await this.prisma.transaction.create({
          data: {
            idempotencyKey: input.idempotencyKey.trim(),
            businessId: input.businessId,
            customerId: input.customerId,
            amountSats: input.amountSats,
            productId: input.productId,
            productName: input.productName,
            productPriceCurrency: input.productPriceCurrency,
            productPriceMxnCents: input.productPriceMxnCents,
            btcMxnRate: input.btcMxnRate,
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

  private async existingResult(
    transaction: Transaction,
    input: PurchaseInput,
  ): Promise<PurchaseResult> {
    this.assertSamePurchase(transaction, input);

    if (transaction.status === TransactionStatus.PAID) {
      return this.completePaidPurchase(transaction);
    }

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

  private async completePaidPurchase(transaction: Transaction): Promise<PurchaseResult> {
    const loyalty = this.loyalty
      ? await this.loyalty.addStamp({
          businessId: transaction.businessId,
          customerId: transaction.customerId,
          transactionId: transaction.id,
        })
      : undefined;

    return {
      outcome: 'paid',
      transaction,
      ...(loyalty && { loyalty }),
    };
  }

  private assertSamePurchase(
    transaction: Transaction,
    input: PurchaseInput | ResolvedPurchase,
  ) {
    if (
      transaction.businessId !== input.businessId ||
      transaction.customerId !== input.customerId ||
      transaction.productId !== (input.productId ?? null) ||
      (!input.productId && transaction.amountSats !== input.amountSats)
    ) {
      throw new PaymentServiceError(
        'IDEMPOTENCY_CONFLICT',
        'The idempotency key was already used for another purchase.',
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
            publicMessage: 'The Lightning operation could not be completed.',
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
