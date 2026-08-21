import prisma from '../db/prisma';
import { AppError } from '../middlewares';

type BusinessFilters = {
  category?: unknown;
  search?: unknown;
  customerId?: unknown;
};

const readOptionalString = (value: unknown, field: string) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError(400, `${field} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const businessSelect = {
  id: true,
  name: true,
  category: true,
  logoUrl: true,
  description: true,
  stampsRequired: true,
  rewardDescription: true,
  isActive: true,
} as const;

const toBusinessWithProgress = <
  T extends object & {
    loyaltyCards?: Array<{
      id: string;
      currentStamps: number;
      totalStampsEver: number;
      updatedAt: Date;
    }>;
  },
>(
  business: T,
  includeProgress: boolean,
) => {
  const { loyaltyCards, ...publicBusiness } = business;
  const card = loyaltyCards?.[0] ?? null;

  if (!includeProgress) {
    return publicBusiness;
  }

  return {
    ...publicBusiness,
    myProgress: card
      ? {
          cardId: card.id,
          currentStamps: card.currentStamps,
          totalStampsEver: card.totalStampsEver,
          updatedAt: card.updatedAt,
        }
      : null,
  };
};

export const listBusinesses = async (filters: BusinessFilters = {}) => {
  const category = readOptionalString(filters.category, 'category');
  const search = readOptionalString(filters.search, 'search');
  const customerId = readOptionalString(filters.customerId, 'customerId');

  const businesses = await prisma.business.findMany({
    where: {
      isActive: true,
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: customerId
      ? {
          loyaltyCards: {
            where: { customerId },
            select: {
              id: true,
              currentStamps: true,
              totalStampsEver: true,
              updatedAt: true,
            },
            take: 1,
          },
        }
      : undefined,
  });

  return businesses.map((business) => toBusinessWithProgress(business, Boolean(customerId)));
};

export const getBusinessDetail = async (businessId: unknown, filters: BusinessFilters = {}) => {
  const id = readOptionalString(businessId, 'businessId');
  const customerId = readOptionalString(filters.customerId, 'customerId');

  if (!id) {
    throw new AppError(400, 'businessId is required');
  }

  const business = await prisma.business.findFirst({
    where: {
      id,
      isActive: true,
    },
    select: customerId
      ? {
          ...businessSelect,
          loyaltyCards: {
            where: { customerId },
            select: {
              id: true,
              currentStamps: true,
              totalStampsEver: true,
              updatedAt: true,
            },
            take: 1,
          },
        }
      : businessSelect,
  });

  if (!business) {
    throw new AppError(404, 'business not found');
  }

  return toBusinessWithProgress(business, Boolean(customerId));
};
