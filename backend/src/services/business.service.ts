import prisma from '../db/prisma';
import { AppError } from '../middlewares';

type BusinessFilters = {
  category?: unknown;
  search?: unknown;
  customerId?: unknown;
};

type UpdateOwnedBusinessInput = {
  stampsRequired?: unknown;
  rewardDescription?: unknown;
  nofferString?: unknown;
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

const ownedBusinessSelect = {
  ...businessSelect,
  ownerId: true,
  nofferString: true,
  createdAt: true,
  updatedAt: true,
} as const;

const readRequiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, `${field} is required`);
  }

  return value.trim();
};

const getOwnedBusinessOrThrow = async (ownerId: string) => {
  const business = await prisma.business.findUnique({
    where: { ownerId },
    select: ownedBusinessSelect,
  });

  if (!business) {
    throw new AppError(404, 'business profile not found');
  }

  return business;
};

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

export const getOwnedBusiness = (ownerId: string) => getOwnedBusinessOrThrow(ownerId);

export const updateOwnedBusiness = async (
  ownerId: string,
  input: UpdateOwnedBusinessInput,
) => {
  const data: {
    stampsRequired?: number;
    rewardDescription?: string;
    nofferString?: string;
  } = {};

  if (input.stampsRequired !== undefined) {
    if (!Number.isSafeInteger(input.stampsRequired) || Number(input.stampsRequired) <= 0) {
      throw new AppError(400, 'stampsRequired must be a positive integer');
    }
    data.stampsRequired = Number(input.stampsRequired);
  }

  if (input.rewardDescription !== undefined) {
    data.rewardDescription = readRequiredString(
      input.rewardDescription,
      'rewardDescription',
    );
  }

  if (input.nofferString !== undefined) {
    data.nofferString = readRequiredString(input.nofferString, 'nofferString');
  }

  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'at least one program setting is required');
  }

  await getOwnedBusinessOrThrow(ownerId);

  return prisma.business.update({
    where: { ownerId },
    data,
    select: ownedBusinessSelect,
  });
};

export const getOwnedBusinessCustomers = async (ownerId: string) => {
  const business = await getOwnedBusinessOrThrow(ownerId);

  return prisma.loyaltyCard.findMany({
    where: { businessId: business.id },
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

export const getOwnedBusinessTransactions = async (ownerId: string) => {
  const business = await getOwnedBusinessOrThrow(ownerId);

  return prisma.transaction.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amountSats: true,
      status: true,
      failureCode: true,
      failureMessage: true,
      paidAt: true,
      createdAt: true,
      customer: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
};
