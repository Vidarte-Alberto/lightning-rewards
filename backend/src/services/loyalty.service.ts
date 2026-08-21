import prisma from '../db/prisma';
import { AppError } from '../middlewares';
import {
  Role,
  TransactionStatus,
  type LoyaltyCard,
  type PrismaClient,
  type Reward,
} from '../generated/prisma/client';

type AddStampInput = {
  businessId: string;
  customerId: string;
  transactionId?: string;
};

export type LoyaltyResult = {
  card: LoyaltyCard;
  reward: Reward | null;
  rewardUnlocked: boolean;
  stampsRequired: number;
};

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const assertRequiredId = (value: string, field: string) => {
  if (!value || value.trim().length === 0) {
    throw new AppError(400, `${field} is required`);
  }
};

export const addStamp = async ({ businessId, customerId, transactionId }: AddStampInput) => {
  assertRequiredId(businessId, 'businessId');
  assertRequiredId(customerId, 'customerId');

  return prisma.$transaction(async (tx: TransactionClient) => {
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        stampsRequired: true,
        rewardDescription: true,
        isActive: true,
      },
    });

    if (!business || !business.isActive) {
      throw new AppError(404, 'business not found');
    }

    const customer = await tx.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!customer || !customer.isActive || customer.role !== Role.CUSTOMER) {
      throw new AppError(404, 'customer not found');
    }

    if (transactionId) {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        select: {
          businessId: true,
          customerId: true,
          status: true,
          loyaltyGrantedAt: true,
        },
      });

      if (!transaction) {
        throw new AppError(404, 'transaction not found');
      }

      if (
        transaction.businessId !== businessId ||
        transaction.customerId !== customerId ||
        transaction.status !== TransactionStatus.PAID
      ) {
        throw new AppError(400, 'transaction cannot receive a loyalty stamp');
      }

      const claim = await tx.transaction.updateMany({
        where: {
          id: transactionId,
          loyaltyGrantedAt: null,
        },
        data: { loyaltyGrantedAt: new Date() },
      });

      if (claim.count === 0) {
        const [card, reward] = await Promise.all([
          tx.loyaltyCard.findUnique({
            where: { businessId_customerId: { businessId, customerId } },
          }),
          tx.reward.findUnique({ where: { transactionId } }),
        ]);

        if (!card) {
          throw new AppError(409, 'loyalty stamp state is inconsistent');
        }

        return {
          card,
          reward,
          rewardUnlocked: reward !== null,
          stampsRequired: business.stampsRequired,
        } satisfies LoyaltyResult;
      }
    }

    const existingCard = await tx.loyaltyCard.findUnique({
      where: {
        businessId_customerId: {
          businessId,
          customerId,
        },
      },
    });

    const nextCurrentStamps = (existingCard?.currentStamps ?? 0) + 1;
    const totalStampsEver = (existingCard?.totalStampsEver ?? 0) + 1;
    const rewardUnlocked = nextCurrentStamps >= business.stampsRequired;
    const currentStamps = rewardUnlocked ? 0 : nextCurrentStamps;

    const card = await tx.loyaltyCard.upsert({
      where: {
        businessId_customerId: {
          businessId,
          customerId,
        },
      },
      create: {
        businessId,
        customerId,
        currentStamps,
        totalStampsEver,
      },
      update: {
        currentStamps,
        totalStampsEver,
      },
    });

    const reward =
      rewardUnlocked && transactionId
        ? await tx.reward.create({
            data: {
              transactionId,
              description: business.rewardDescription,
            },
          })
        : null;

    return {
      card,
      reward,
      rewardUnlocked,
      stampsRequired: business.stampsRequired,
    } satisfies LoyaltyResult;
  });
};

export const getCustomerCards = async (customerId: string) => {
  assertRequiredId(customerId, 'customerId');

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!customer || !customer.isActive || customer.role !== Role.CUSTOMER) {
    throw new AppError(404, 'customer not found');
  }

  return prisma.loyaltyCard.findMany({
    where: { customerId },
    orderBy: { updatedAt: 'desc' },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          category: true,
          logoUrl: true,
          description: true,
          stampsRequired: true,
          rewardDescription: true,
          isActive: true,
        },
      },
    },
  });
};

export const getBusinessCustomers = async (businessId: string, ownerId: string) => {
  assertRequiredId(businessId, 'businessId');

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!business) {
    throw new AppError(404, 'business not found');
  }

  if (business.ownerId !== ownerId) {
    throw new AppError(403, 'insufficient permissions');
  }

  return prisma.loyaltyCard.findMany({
    where: { businessId },
    orderBy: { updatedAt: 'desc' },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });
};
