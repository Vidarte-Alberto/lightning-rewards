import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

import { PrismaClient, Role } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = 'DemoPass123!';

const optionalClinkPointer = (environmentVariable: string, prefix: 'noffer1' | 'ndebit1') => {
  const value = process.env[environmentVariable]?.trim();

  if (value && !value.startsWith(prefix)) {
    throw new Error(`${environmentVariable} must start with ${prefix}`);
  }

  return value;
};

const demoCustomerNdebit = optionalClinkPointer('DEMO_CUSTOMER_NDEBIT', 'ndebit1');

const businesses = [
  {
    email: 'cafe@lightning-rewards.local',
    name: 'Lightning Coffee',
    category: 'Coffee',
    description: 'Specialty coffee and fresh pastries paid over Lightning.',
    nofferString: optionalClinkPointer('DEMO_CAFE_NOFFER', 'noffer1'),
    placeholderNoffer: 'noffer1replace-with-cafe-offer',
    rewardDescription: 'A free house drink',
  },
  {
    email: 'tacos@lightning-rewards.local',
    name: 'Tacos Satoshi',
    category: 'Restaurant',
    description: 'Street tacos and instant Lightning checkout.',
    nofferString: optionalClinkPointer('DEMO_TACOS_NOFFER', 'noffer1'),
    placeholderNoffer: 'noffer1replace-with-tacos-offer',
    rewardDescription: 'A free taco order',
  },
  {
    email: 'bici@lightning-rewards.local',
    name: 'Bitcoin Bikes',
    category: 'Bike Shop',
    description: 'Bike accessories, repairs, and Lightning payments.',
    nofferString: optionalClinkPointer('DEMO_BIKES_NOFFER', 'noffer1'),
    placeholderNoffer: 'noffer1replace-with-bikes-offer',
    rewardDescription: 'A free basic tune-up',
  },
  {
    email: 'books@lightning-rewards.local',
    name: 'Block & Book',
    category: 'Bookstore',
    description: 'Independent books, local events, and Bitcoin culture.',
    nofferString: optionalClinkPointer('DEMO_BOOKS_NOFFER', 'noffer1'),
    placeholderNoffer: 'noffer1replace-with-books-offer',
    rewardDescription: 'A free paperback',
  },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@lightning-rewards.local' },
    update: {
      isActive: true,
      role: Role.CUSTOMER,
      passwordHash,
      ...(demoCustomerNdebit ? { ndebitString: demoCustomerNdebit } : {}),
    },
    create: {
      email: 'customer@lightning-rewards.local',
      passwordHash,
      role: Role.CUSTOMER,
      ndebitString: demoCustomerNdebit,
    },
  });

  const createdBusinesses = [];

  for (const businessData of businesses) {
    const owner = await prisma.user.upsert({
      where: { email: businessData.email },
      update: {
        isActive: true,
        role: Role.BUSINESS,
        ndebitString: null,
        passwordHash,
      },
      create: {
        email: businessData.email,
        passwordHash,
        role: Role.BUSINESS,
      },
    });

    const existingBusiness = await prisma.business.findUnique({
      where: { ownerId: owner.id },
      select: { nofferString: true },
    });
    const nofferUpdate =
      businessData.nofferString ??
      (existingBusiness && !existingBusiness.nofferString.startsWith('noffer1')
        ? businessData.placeholderNoffer
        : undefined);

    const business = await prisma.business.upsert({
      where: { ownerId: owner.id },
      update: {
        name: businessData.name,
        category: businessData.category,
        description: businessData.description,
        ...(nofferUpdate ? { nofferString: nofferUpdate } : {}),
        rewardDescription: businessData.rewardDescription,
        isActive: true,
      },
      create: {
        ownerId: owner.id,
        name: businessData.name,
        category: businessData.category,
        description: businessData.description,
        nofferString: businessData.nofferString ?? businessData.placeholderNoffer,
        rewardDescription: businessData.rewardDescription,
      },
    });

    createdBusinesses.push(business);
  }

  const progress = [2, 4];

  for (const [index, currentStamps] of progress.entries()) {
    const business = createdBusinesses[index];

    if (!business) continue;

    await prisma.loyaltyCard.upsert({
      where: {
        businessId_customerId: {
          businessId: business.id,
          customerId: customer.id,
        },
      },
      update: { currentStamps, totalStampsEver: currentStamps },
      create: {
        businessId: business.id,
        customerId: customer.id,
        currentStamps,
        totalStampsEver: currentStamps,
      },
    });
  }

  console.log('Seed completed');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
