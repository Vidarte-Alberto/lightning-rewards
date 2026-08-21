import { randomUUID } from 'node:crypto';
import type { Mocked } from 'vitest';

import {
  ProductPriceCurrency,
  Role,
  TransactionStatus,
} from '../src/generated/prisma/client';
import prisma from '../src/db/prisma';
import { ClinkServiceError } from '../src/services/clink.errors';
import { addStamp } from '../src/services/loyalty.service';
import {
  PaymentService,
  type ClinkPaymentPort,
  type PurchaseInput,
} from '../src/services/payment.service';

const testId = randomUUID();

let businessId: string;
let customerId: string;
let ownerId: string;
let productId: string;

const clink: Mocked<ClinkPaymentPort> = {
  requestInvoiceFromOffer: vi.fn(),
  requestDebitPayment: vi.fn(),
};

const paymentService = new PaymentService(prisma, clink, { addStamp });

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

  const product = await prisma.product.create({
    data: {
      businessId,
      name: 'Integration Latte',
      description: 'Server-priced test product',
      priceSats: 150,
    },
  });
  productId = product.id;
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
  await prisma.product.deleteMany({ where: { businessId } });
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
  expect(result.loyalty).toMatchObject({
    rewardUnlocked: false,
    card: { currentStamps: 1, totalStampsEver: 1 },
  });
});

test('returns the original transaction for an idempotent replay', async () => {
  const input = purchaseInput('idempotent');
  const first = await paymentService.purchase(input);
  const second = await paymentService.purchase(input);

  expect(second.transaction.id).toBe(first.transaction.id);
  expect(second.loyalty?.card.totalStampsEver).toBe(first.loyalty?.card.totalStampsEver);
  expect(clink.requestInvoiceFromOffer).toHaveBeenCalledTimes(1);
  expect(clink.requestDebitPayment).toHaveBeenCalledTimes(1);
});

test('uses the authoritative product price and preserves its transaction snapshot', async () => {
  const input: PurchaseInput = {
    businessId,
    customerId,
    productId,
    idempotencyKey: `${testId}-product`,
  };

  const first = await paymentService.purchase(input);
  await prisma.product.update({ where: { id: productId }, data: { priceSats: 999 } });
  const replay = await paymentService.purchase(input);

  expect(first.transaction).toMatchObject({
    productId,
    productName: 'Integration Latte',
    amountSats: 150,
    status: TransactionStatus.PAID,
  });
  expect(replay.transaction.id).toBe(first.transaction.id);
  expect(replay.transaction.amountSats).toBe(150);
  expect(clink.requestInvoiceFromOffer).toHaveBeenCalledWith(
    'noffer1integration',
    150,
    'Integration Latte at Payment Integration Business',
  );
});

test('persists a customer denial as failed with a distinct outcome', async () => {
  clink.requestDebitPayment.mockRejectedValueOnce(
    new ClinkServiceError({
      operation: 'debit',
      code: 'CLINK_DEBIT_DENIED',
      publicMessage: 'The payment was not approved in your wallet.',
    }),
  );

  const input = purchaseInput('denied');
  const result = await paymentService.purchase(input);
  const replay = await paymentService.purchase(input);

  expect(result).toMatchObject({
    outcome: 'denied',
    code: 'CLINK_DEBIT_DENIED',
    message: 'The payment was not approved in your wallet.',
  });
  expect(replay).toMatchObject({
    outcome: 'denied',
    code: 'CLINK_DEBIT_DENIED',
  });
  expect(result.transaction.status).toBe(TransactionStatus.FAILED);
  expect(replay.transaction.id).toBe(result.transaction.id);
});

test('refreshes an MXN product conversion at checkout and stores the rate snapshot', async () => {
  const mxnProduct = await prisma.product.create({
    data: {
      businessId,
      name: `MXN Latte ${testId}`,
      priceCurrency: ProductPriceCurrency.MXN,
      priceMxnCents: 5_000,
      priceSats: 2_500,
      lastBtcMxnRate: 2_000_000,
      rateUpdatedAt: new Date('2026-08-21T12:00:00.000Z'),
    },
  });
  const converter = {
    convertMxnToSats: vi.fn().mockResolvedValue({
      amountSats: 2_400,
      btcMxnRate: 2_083_333.33,
      rateUpdatedAt: new Date('2026-08-21T13:00:00.000Z'),
    }),
  };
  const service = new PaymentService(prisma, clink, { addStamp }, converter);

  const result = await service.purchase({
    businessId,
    customerId,
    productId: mxnProduct.id,
    idempotencyKey: `${testId}-mxn-product`,
  });

  expect(result.transaction).toMatchObject({
    amountSats: 2_400,
    productPriceCurrency: ProductPriceCurrency.MXN,
    productPriceMxnCents: 5_000,
  });
  expect(Number(result.transaction.btcMxnRate)).toBe(2_083_333.33);
  expect(clink.requestDebitPayment).toHaveBeenCalledWith(
    'ndebit1integration',
    expect.any(String),
    2_400,
    `${mxnProduct.name} at Payment Integration Business`,
  );
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
