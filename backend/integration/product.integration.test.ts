import { randomUUID } from 'node:crypto';

import { Role } from '../src/generated/prisma/client';
import prisma from '../src/db/prisma';
import {
  archiveOwnedProduct,
  createOwnedProduct,
  listOwnedProducts,
  listPublicProducts,
  updateOwnedProduct,
} from '../src/services';

const testId = randomUUID();
let ownerId: string;
let otherOwnerId: string;
let businessId: string;

beforeAll(async () => {
  const [owner, otherOwner] = await Promise.all([
    prisma.user.create({
      data: {
        email: `product-owner-${testId}@example.com`,
        passwordHash: 'integration-test-only',
        role: Role.BUSINESS,
      },
    }),
    prisma.user.create({
      data: {
        email: `product-other-${testId}@example.com`,
        passwordHash: 'integration-test-only',
        role: Role.BUSINESS,
      },
    }),
  ]);
  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'Product Test Business',
      category: 'Test',
      nofferString: `noffer1products${testId}`,
      rewardDescription: 'Test reward',
    },
  });
  ownerId = owner.id;
  otherOwnerId = otherOwner.id;
  businessId = business.id;
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherOwnerId] } } });
  await prisma.$disconnect();
});

test('creates, lists, updates, archives, and reactivates an owned product', async () => {
  const created = await createOwnedProduct(ownerId, {
    name: ' House Latte ',
    description: ' Espresso and milk ',
    priceSats: 150,
  });
  expect(created).toMatchObject({
    businessId,
    name: 'House Latte',
    description: 'Espresso and milk',
    priceSats: 150,
    isActive: true,
  });

  await updateOwnedProduct(ownerId, created.id, { priceSats: 175 });
  expect(await listOwnedProducts(ownerId)).toEqual([
    expect.objectContaining({ id: created.id, priceSats: 175 }),
  ]);

  await archiveOwnedProduct(ownerId, created.id);
  expect(await listPublicProducts(businessId)).toEqual([]);

  await updateOwnedProduct(ownerId, created.id, { isActive: true });
  expect(await listPublicProducts(businessId)).toEqual([
    expect.objectContaining({ id: created.id, isActive: true }),
  ]);
});

test('prevents another owner from changing a product', async () => {
  const product = (await listOwnedProducts(ownerId))[0];
  await expect(
    updateOwnedProduct(otherOwnerId, product.id, { priceSats: 1 }),
  ).rejects.toMatchObject({ statusCode: 404 });
});

test('validates product fields and duplicate names', async () => {
  await expect(
    createOwnedProduct(ownerId, { name: 'Invalid', priceSats: 0 }),
  ).rejects.toMatchObject({ statusCode: 400 });

  await expect(
    createOwnedProduct(ownerId, { name: 'House Latte', priceSats: 200 }),
  ).rejects.toMatchObject({ statusCode: 409 });
});

test('converts and stores a product priced in Mexican pesos', async () => {
  const converter = {
    convertMxnToSats: vi.fn().mockResolvedValue({
      amountSats: 2_500,
      btcMxnRate: 2_000_000,
      rateUpdatedAt: new Date('2026-08-21T12:00:00.000Z'),
    }),
  };

  const product = await createOwnedProduct(
    ownerId,
    { name: 'Fiat Latte', priceCurrency: 'MXN', priceMxn: 50 },
    converter,
  );

  expect(product).toMatchObject({
    priceCurrency: 'MXN',
    priceMxnCents: 5_000,
    priceSats: 2_500,
  });
  expect(converter.convertMxnToSats).toHaveBeenCalledWith(5_000);
});
