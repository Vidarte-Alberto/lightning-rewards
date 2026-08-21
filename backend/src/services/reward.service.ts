import prisma from '../db/prisma';
import { RewardStatus, Role } from '../generated/prisma/client';
import { AppError } from '../middlewares';

const assertRequiredId = (value: string, field: string) => {
  if (!value || !value.trim()) {
    throw new AppError(400, `${field} is required`);
  }
};

const assertActiveCustomer = async (customerId: string) => {
  assertRequiredId(customerId, 'customerId');
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { role: true, isActive: true },
  });
  if (!customer || !customer.isActive || customer.role !== Role.CUSTOMER) {
    throw new AppError(404, 'customer not found');
  }
};

const rewardSelect = {
  id: true,
  description: true,
  status: true,
  earnedAt: true,
  redeemedAt: true,
  transaction: {
    select: {
      business: {
        select: {
          id: true,
          name: true,
          category: true,
          logoUrl: true,
          isActive: true,
        },
      },
    },
  },
} as const;

export const getCustomerRewards = async (customerId: string) => {
  await assertActiveCustomer(customerId);
  return prisma.reward.findMany({
    where: { transaction: { customerId } },
    orderBy: [{ status: 'asc' }, { earnedAt: 'desc' }],
    select: rewardSelect,
  });
};

export const redeemCustomerReward = async (customerId: string, rewardId: string) => {
  await assertActiveCustomer(customerId);
  assertRequiredId(rewardId, 'rewardId');

  const ownedReward = await prisma.reward.findFirst({
    where: { id: rewardId, transaction: { customerId } },
    select: { id: true, status: true },
  });
  if (!ownedReward) throw new AppError(404, 'reward not found');

  if (ownedReward.status === RewardStatus.AVAILABLE) {
    await prisma.reward.updateMany({
      where: { id: ownedReward.id, status: RewardStatus.AVAILABLE },
      data: { status: RewardStatus.REDEEMED, redeemedAt: new Date() },
    });
  }

  return prisma.reward.findUniqueOrThrow({
    where: { id: ownedReward.id },
    select: rewardSelect,
  });
};
