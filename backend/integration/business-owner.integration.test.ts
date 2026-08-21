import { randomUUID } from 'node:crypto';

import { Role, TransactionStatus } from '../src/generated/prisma/client';
import prisma from '../src/db/prisma';
import {
  getOwnedBusiness,
  getOwnedBusinessCustomers,
  getOwnedBusinessTransactions,
  updateOwnedBusiness,
} from '../src/services';

const testId = randomUUID();

let ownerId: string;
let customerId: string;
let businessId: string;

beforeAll(async () => {
  const [owner, customer] = await Promise.all([
    prisma.user.create({
      data: {
        email: `dashboard-owner-${testId}@example.com`,
        passwordHash: 'integration-test-only',
        role: Role.BUSINESS,
      },
    }),
    prisma.user.create({
      data: {
        email: `dashboard-customer-${testId}@example.com`,
        passwordHash: 'integration-test-only',
        role: Role.CUSTOMER,
      },
    }),
  ]);

  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'Dashboard Test Business',
      category: 'Test',
      nofferString: `noffer-dashboard-${testId}`,
      stampsRequired: 5,
      rewardDescription: 'Original reward',
    },
  });

  await prisma.loyaltyCard.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      currentStamps: 3,
      totalStampsEver: 8,
    },
  });

  await Promise.all([
    prisma.transaction.create({
      data: {
        idempotencyKey: `dashboard-paid-${testId}`,
        businessId: business.id,
        customerId: customer.id,
        amountSats: 2_500,
        bolt11: `dashboard-bolt11-${testId}`,
        preimage: `dashboard-preimage-${testId}`,
        status: TransactionStatus.PAID,
        paidAt: new Date(),
      },
    }),
    prisma.transaction.create({
      data: {
        idempotencyKey: `dashboard-failed-${testId}`,
        businessId: business.id,
        customerId: customer.id,
        amountSats: 13,
        status: TransactionStatus.FAILED,
        failureCode: 'CLINK_DEBIT_DENIED',
        failureMessage: 'The payment was not approved in your wallet.',
      },
    }),
  ]);

  ownerId = owner.id;
  customerId = customer.id;
  businessId = business.id;
});

afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { businessId } });
  await prisma.loyaltyCard.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, customerId] } } });
  await prisma.$disconnect();
});

test('returns and updates the authenticated owner business', async () => {
  const business = await getOwnedBusiness(ownerId);
  expect(business).toMatchObject({
    id: businessId,
    ownerId,
    stampsRequired: 5,
    rewardDescription: 'Original reward',
  });

  const updated = await updateOwnedBusiness(ownerId, {
    stampsRequired: 7,
    rewardDescription: 'Updated reward',
    nofferString: `noffer-updated-${testId}`,
  });

  expect(updated).toMatchObject({
    stampsRequired: 7,
    rewardDescription: 'Updated reward',
    nofferString: `noffer-updated-${testId}`,
  });
});

test('returns customer progress for the authenticated owner', async () => {
  const customers = await getOwnedBusinessCustomers(ownerId);

  expect(customers).toHaveLength(1);
  expect(customers[0]).toMatchObject({
    businessId,
    customerId,
    currentStamps: 3,
    totalStampsEver: 8,
  });
  expect(customers[0].customer.email).toBe(
    `dashboard-customer-${testId}@example.com`,
  );
});

test('returns newest business transactions with customer details', async () => {
  const transactions = await getOwnedBusinessTransactions(ownerId);

  expect(transactions).toHaveLength(2);
  expect(transactions.map((transaction) => transaction.status)).toEqual(
    expect.arrayContaining([TransactionStatus.PAID, TransactionStatus.FAILED]),
  );
  expect(transactions[0].customer.email).toBe(
    `dashboard-customer-${testId}@example.com`,
  );
});

test('validates program updates and missing business profiles', async () => {
  await expect(
    updateOwnedBusiness(ownerId, { stampsRequired: 0 }),
  ).rejects.toMatchObject({ statusCode: 400 });

  await expect(getOwnedBusiness(randomUUID())).rejects.toMatchObject({
    statusCode: 404,
  });
});
