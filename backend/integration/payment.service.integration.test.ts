import { randomUUID } from 'node:crypto';

import { Role, TransactionStatus } from '../src/generated/prisma/client';
import prisma from '../src/db/prisma';
import { ClinkServiceError } from '../src/services/clink.errors';
import {
  PaymentService,
  type ClinkPaymentPort,
  type PurchaseInput,
} from '../src/services/payment.service';

const testId = randomUUID();

let businessId: string;
let customerId: string;
let ownerId: string;

const clink: jest.Mocked<ClinkPaymentPort> = {
  requestInvoiceFromOffer: jest.fn(),
  requestDebitPayment: jest.fn(),
};

const paymentService = new PaymentService(prisma, clink);

const purchaseInput = (suffix: string): PurchaseInput => ({
  businessId,
  customerId,
  amountSats: 2_500,
  idempotencyKey: `${testId}-${suffix}`,
});

beforeAll(async () => {
  const customer = await prisma.user.create({
    data: {
      email: `payment-customer-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.CUSTOMER,
      ndebitString: 'ndebit1integration',
    },
  });
  const owner = await prisma.user.create({
    data: {
      email: `payment-owner-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.BUSINESS,
    },
  });
  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'Payment Integration Business',
      category: 'Test',
      nofferString: 'noffer1integration',
      rewardDescription: 'Integration reward',
    },
  });

  customerId = customer.id;
  ownerId = owner.id;
  businessId = business.id;
});

beforeEach(() => {
  clink.requestInvoiceFromOffer
    .mockReset()
    .mockImplementation(async () => `lnbc-integration-${randomUUID()}`);
  clink.requestDebitPayment.mockReset().mockResolvedValue({
    preimage: randomUUID().replaceAll('-', '').padEnd(64, '0'),
    internalSettlement: false,
  });
});

afterAll(async () => {
  if (!businessId || !customerId || !ownerId) {
    await prisma.$disconnect();
    return;
  }

  await prisma.reward.deleteMany({
    where: { transaction: { customerId } },
  });
  await prisma.transaction.deleteMany({ where: { customerId } });
  await prisma.loyaltyCard.deleteMany({ where: { customerId } });
  await prisma.business.delete({ where: { id: businessId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerId, ownerId] } } });
  await prisma.$disconnect();
});

test('persists a successful CLINK payment as paid', async () => {
  const result = await paymentService.purchase(purchaseInput('paid'));

  expect(result.outcome).toBe('paid');
  expect(result.transaction).toMatchObject({
    status: TransactionStatus.PAID,
  });
  expect(result.transaction.bolt11).toMatch(/^lnbc-integration-/);
  expect(result.transaction.paidAt).toBeInstanceOf(Date);
});

test('returns the original transaction for an idempotent replay', async () => {
  const input = purchaseInput('idempotent');
  const first = await paymentService.purchase(input);
  const second = await paymentService.purchase(input);

  expect(second.transaction.id).toBe(first.transaction.id);
  expect(clink.requestInvoiceFromOffer).toHaveBeenCalledTimes(1);
  expect(clink.requestDebitPayment).toHaveBeenCalledTimes(1);
});

test('persists a definitive debit rejection as failed', async () => {
  clink.requestDebitPayment.mockRejectedValueOnce(
    new ClinkServiceError({
      operation: 'debit',
      code: 'CLINK_DEBIT_1',
      publicMessage: 'La wallet rechazó la solicitud de pago.',
    }),
  );

  const result = await paymentService.purchase(purchaseInput('failed'));

  expect(result).toMatchObject({ outcome: 'failed', code: 'CLINK_DEBIT_1' });
  expect(result.transaction.status).toBe(TransactionStatus.FAILED);
});

test('persists an indeterminate debit timeout as unknown', async () => {
  clink.requestDebitPayment.mockRejectedValueOnce(
    new ClinkServiceError({
      operation: 'debit',
      code: 'CLINK_DEBIT_TIMEOUT',
      publicMessage: 'No se pudo confirmar a tiempo el resultado del pago.',
      indeterminate: true,
    }),
  );

  const result = await paymentService.purchase(purchaseInput('unknown'));

  expect(result).toMatchObject({ outcome: 'unknown', code: 'CLINK_DEBIT_TIMEOUT' });
  expect(result.transaction.status).toBe(TransactionStatus.UNKNOWN);
});
