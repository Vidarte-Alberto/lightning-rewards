import { randomUUID } from 'node:crypto';

import { Role, TransactionStatus } from '../src/generated/prisma/client';
import prisma from '../src/db/prisma';
import { addStamp, getBusinessCustomers, getCustomerCards } from '../src/services';

const testId = randomUUID();

let businessId: string;
let customerId: string;
let ownerId: string;
let otherOwnerId: string;

beforeAll(async () => {
  const customer = await prisma.user.create({
    data: {
      email: `loyalty-customer-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.CUSTOMER,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: `loyalty-owner-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.BUSINESS,
    },
  });

  const otherOwner = await prisma.user.create({
    data: {
      email: `loyalty-other-owner-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.BUSINESS,
    },
  });

  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'Loyalty Test Business',
      category: 'Test',
      nofferString: `noffer-${testId}`,
      stampsRequired: 2,
      rewardDescription: 'Reward from integration test',
    },
  });

  customerId = customer.id;
  ownerId = owner.id;
  otherOwnerId = otherOwner.id;
  businessId = business.id;
});

afterAll(async () => {
  if (!businessId || !customerId || !ownerId || !otherOwnerId) {
    await prisma.$disconnect();
    return;
  }

  await prisma.reward.deleteMany({
    where: {
      transaction: {
        customerId,
      },
    },
  });
  await prisma.transaction.deleteMany({ where: { customerId } });
  await prisma.loyaltyCard.deleteMany({ where: { customerId } });
  await prisma.business.delete({ where: { id: businessId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerId, ownerId, otherOwnerId] } } });
  await prisma.$disconnect();
});

const createPaidTransaction = async (idempotencyKey: string) => {
  return prisma.transaction.create({
    data: {
      idempotencyKey,
      businessId,
      customerId,
      amountSats: 100,
      bolt11: `bolt11-${idempotencyKey}`,
      preimage: `preimage-${idempotencyKey}`,
      status: TransactionStatus.PAID,
      paidAt: new Date(),
    },
  });
};

test('adds stamps and unlocks a reward when the card reaches the required count', async () => {
  const firstTransaction = await createPaidTransaction(`first-${testId}`);
  const firstResult = await addStamp({
    businessId,
    customerId,
    transactionId: firstTransaction.id,
  });

  expect(firstResult.rewardUnlocked).toBe(false);
  expect(firstResult.reward).toBeNull();
  expect(firstResult.card.currentStamps).toBe(1);
  expect(firstResult.card.totalStampsEver).toBe(1);

  const firstReplay = await addStamp({
    businessId,
    customerId,
    transactionId: firstTransaction.id,
  });

  expect(firstReplay.card.totalStampsEver).toBe(1);
  expect(firstReplay.rewardUnlocked).toBe(false);

  const secondTransaction = await createPaidTransaction(`second-${testId}`);
  const secondResult = await addStamp({
    businessId,
    customerId,
    transactionId: secondTransaction.id,
  });

  expect(secondResult.rewardUnlocked).toBe(true);
  expect(secondResult.card.currentStamps).toBe(0);
  expect(secondResult.card.totalStampsEver).toBe(2);
  expect(secondResult.reward).toMatchObject({
    transactionId: secondTransaction.id,
    description: 'Reward from integration test',
  });
});

test('returns customer cards with business details', async () => {
  const cards = await getCustomerCards(customerId);

  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    businessId,
    customerId,
    currentStamps: 0,
    totalStampsEver: 2,
  });
  expect(cards[0].business).toMatchObject({
    name: 'Loyalty Test Business',
    stampsRequired: 2,
  });
});

test('returns business customers only to the business owner', async () => {
  const customers = await getBusinessCustomers(businessId, ownerId);

  expect(customers).toHaveLength(1);
  expect(customers[0]).toMatchObject({
    businessId,
    customerId,
    totalStampsEver: 2,
  });
  expect(customers[0].customer.email).toBe(`loyalty-customer-${testId}@example.com`);

  await expect(getBusinessCustomers(businessId, otherOwnerId)).rejects.toMatchObject({
    statusCode: 403,
  });
});
