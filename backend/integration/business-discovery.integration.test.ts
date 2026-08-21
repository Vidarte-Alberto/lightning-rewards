import { randomUUID } from 'node:crypto';

import { Role } from '../src/generated/prisma/client';
import prisma from '../src/db/prisma';
import { getBusinessDetail, listBusinesses } from '../src/services';

const testId = randomUUID();

let customerId: string;
let businessOneId: string;
let businessTwoId: string;
let inactiveBusinessId: string;
let ownerIds: string[] = [];

beforeAll(async () => {
  const customer = await prisma.user.create({
    data: {
      email: `discovery-customer-${testId}@example.com`,
      passwordHash: 'integration-test-only',
      role: Role.CUSTOMER,
    },
  });

  const owners = await Promise.all(
    ['one', 'two', 'inactive'].map((label) =>
      prisma.user.create({
        data: {
          email: `discovery-owner-${label}-${testId}@example.com`,
          passwordHash: 'integration-test-only',
          role: Role.BUSINESS,
        },
      }),
    ),
  );

  const businessOne = await prisma.business.create({
    data: {
      ownerId: owners[0].id,
      name: `Discovery Alpha Cafe ${testId}`,
      category: 'Cafe',
      description: 'Fresh coffee and rewards',
      nofferString: `noffer-alpha-${testId}`,
      rewardDescription: 'Coffee reward',
      stampsRequired: 5,
    },
  });

  const businessTwo = await prisma.business.create({
    data: {
      ownerId: owners[1].id,
      name: `Discovery Beta Tacos ${testId}`,
      category: 'Food',
      description: 'Tacos with lightning checkout',
      nofferString: `noffer-beta-${testId}`,
      rewardDescription: 'Taco reward',
      stampsRequired: 3,
    },
  });

  const inactiveBusiness = await prisma.business.create({
    data: {
      ownerId: owners[2].id,
      name: `Discovery Hidden Cafe ${testId}`,
      category: 'Cafe',
      nofferString: `noffer-hidden-${testId}`,
      rewardDescription: 'Hidden reward',
      isActive: false,
    },
  });

  await prisma.loyaltyCard.create({
    data: {
      businessId: businessOne.id,
      customerId: customer.id,
      currentStamps: 2,
      totalStampsEver: 7,
    },
  });

  customerId = customer.id;
  businessOneId = businessOne.id;
  businessTwoId = businessTwo.id;
  inactiveBusinessId = inactiveBusiness.id;
  ownerIds = owners.map((owner) => owner.id);
});

afterAll(async () => {
  await prisma.loyaltyCard.deleteMany({ where: { customerId } });
  await prisma.business.deleteMany({
    where: { id: { in: [businessOneId, businessTwoId, inactiveBusinessId] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [customerId, ...ownerIds] } } });
  await prisma.$disconnect();
});

test('lists active businesses with category and search filters', async () => {
  const businesses = await listBusinesses({
    category: 'cafe',
    search: 'alpha',
  });

  const names = businesses.map((business) => business.name);

  expect(names).toContain(`Discovery Alpha Cafe ${testId}`);
  expect(names).not.toContain(`Discovery Beta Tacos ${testId}`);
  expect(names).not.toContain(`Discovery Hidden Cafe ${testId}`);
});

test('includes customer progress when customerId is provided', async () => {
  const businesses = await listBusinesses({ customerId, search: `Discovery` });
  const businessWithProgress = businesses.find((business) => business.id === businessOneId);
  const businessWithoutProgress = businesses.find((business) => business.id === businessTwoId);

  expect(businessWithProgress).toMatchObject({
    myProgress: {
      currentStamps: 2,
      totalStampsEver: 7,
    },
  });
  expect(businessWithoutProgress).toMatchObject({
    myProgress: null,
  });
});

test('returns active business details with optional customer progress', async () => {
  const business = await getBusinessDetail(businessOneId, { customerId });

  expect(business).toMatchObject({
    id: businessOneId,
    name: `Discovery Alpha Cafe ${testId}`,
    category: 'Cafe',
    myProgress: {
      currentStamps: 2,
      totalStampsEver: 7,
    },
  });

  await expect(getBusinessDetail(inactiveBusinessId)).rejects.toMatchObject({
    statusCode: 404,
  });
});
