import { randomUUID } from 'node:crypto';

import { Role, TransactionStatus } from '../src/generated/prisma/client';
import prisma from '../src/db/prisma';

const testId = randomUUID();

let businessId: string;
let customerId: string;
let ownerId: string;

beforeAll(async () => {
  const customer = await prisma.user.create({
    data: {
      email: `customer-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.CUSTOMER,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: `owner-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.BUSINESS,
    },
  });

  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'Integration Test Business',
      category: 'Test',
      nofferString: `noffer-${testId}`,
      rewardDescription: 'Integration test reward',
    },
  });

  customerId = customer.id;
  ownerId = owner.id;
  businessId = business.id;
});

afterAll(async () => {
  if (!businessId || !customerId || !ownerId) {
    await prisma.$disconnect();
    return;
  }

  await prisma.transaction.deleteMany({ where: { customerId } });
  await prisma.loyaltyCard.deleteMany({ where: { customerId } });
  await prisma.business.delete({ where: { id: businessId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerId, ownerId] } } });
  await prisma.$disconnect();
});

test('rejects transactions with a non-positive amount', async () => {
  await expect(
    prisma.transaction.create({
      data: {
        idempotencyKey: `invalid-amount-${testId}`,
        businessId,
        customerId,
        amountSats: 0,
      },
    }),
  ).rejects.toThrow();
});

test('rejects a paid transaction without payment evidence', async () => {
  await expect(
    prisma.transaction.create({
      data: {
        idempotencyKey: `invalid-paid-${testId}`,
        businessId,
        customerId,
        amountSats: 100,
        status: TransactionStatus.PAID,
      },
    }),
  ).rejects.toThrow();
});

test('rejects blank payment preimages', async () => {
  await expect(
    prisma.transaction.create({
      data: {
        idempotencyKey: `blank-preimage-${testId}`,
        businessId,
        customerId,
        amountSats: 100,
        bolt11: `blank-preimage-invoice-${testId}`,
        preimage: '   ',
        status: TransactionStatus.PAID,
        paidAt: new Date(),
      },
    }),
  ).rejects.toThrow();
});

test('rejects duplicate idempotency keys', async () => {
  const idempotencyKey = `duplicate-${testId}`;

  await prisma.transaction.create({
    data: { idempotencyKey, businessId, customerId, amountSats: 100 },
  });

  await expect(
    prisma.transaction.create({
      data: { idempotencyKey, businessId, customerId, amountSats: 100 },
    }),
  ).rejects.toThrow();
});
