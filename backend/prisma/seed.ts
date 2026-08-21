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

const businesses = [
  {
    email: 'cafe@lightning-rewards.local',
    name: 'Café Relámpago',
    category: 'Café',
    description: 'Café de especialidad y pan recién horneado.',
    nofferString: 'noffer-demo-cafe',
    rewardDescription: 'Una bebida de la casa gratis',
  },
  {
    email: 'tacos@lightning-rewards.local',
    name: 'Tacos Satoshi',
    category: 'Restaurante',
    description: 'Tacos, antojitos y pagos sobre Lightning.',
    nofferString: 'noffer-demo-tacos',
    rewardDescription: 'Una orden de tacos gratis',
  },
  {
    email: 'bici@lightning-rewards.local',
    name: 'Bici Bitcoin',
    category: 'Tienda',
    description: 'Accesorios y mantenimiento para bicicletas.',
    nofferString: 'noffer-demo-bici',
    rewardDescription: 'Un ajuste básico gratis',
  },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const customer = await prisma.user.upsert({
    where: { email: 'cliente@lightning-rewards.local' },
    update: { isActive: true, role: Role.CUSTOMER },
    create: {
      email: 'cliente@lightning-rewards.local',
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  const createdBusinesses = [];

  for (const businessData of businesses) {
    const owner = await prisma.user.upsert({
      where: { email: businessData.email },
      update: { isActive: true, role: Role.BUSINESS, ndebitString: null },
      create: {
        email: businessData.email,
        passwordHash,
        role: Role.BUSINESS,
      },
    });

    const business = await prisma.business.upsert({
      where: { ownerId: owner.id },
      update: {
        name: businessData.name,
        category: businessData.category,
        description: businessData.description,
        nofferString: businessData.nofferString,
        rewardDescription: businessData.rewardDescription,
        isActive: true,
      },
      create: {
        ownerId: owner.id,
        name: businessData.name,
        category: businessData.category,
        description: businessData.description,
        nofferString: businessData.nofferString,
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
