import prisma from '../db/prisma';
import { ProductPriceCurrency, type Prisma } from '../generated/prisma/client';
import { AppError } from '../middlewares';
import type { MxnPriceConverter } from './coingecko.service';

const MAX_PRICE_SATS = 2_147_483_647;
const PRODUCT_NAME_MAX_LENGTH = 100;
const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;

type ProductInput = {
  name?: unknown;
  description?: unknown;
  priceCurrency?: unknown;
  priceSats?: unknown;
  priceMxn?: unknown;
  isActive?: unknown;
};

type CurrentProductPrice = {
  priceCurrency: ProductPriceCurrency;
  priceSats: number;
  priceMxnCents: number | null;
};

type ProductPricingData = {
  priceCurrency: ProductPriceCurrency;
  priceSats: number;
  priceMxnCents: number | null;
  lastBtcMxnRate: number | null;
  rateUpdatedAt: Date | null;
};

const productSelect = {
  id: true,
  businessId: true,
  name: true,
  description: true,
  priceCurrency: true,
  priceSats: true,
  priceMxnCents: true,
  lastBtcMxnRate: true,
  rateUpdatedAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const readName = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'product name is required');
  }

  const name = value.trim();
  if (name.length > PRODUCT_NAME_MAX_LENGTH) {
    throw new AppError(400, `product name must be ${PRODUCT_NAME_MAX_LENGTH} characters or fewer`);
  }
  return name;
};

const readDescription = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new AppError(400, 'product description must be a string');
  }

  const description = value.trim();
  if (description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
    throw new AppError(
      400,
      `product description must be ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters or fewer`,
    );
  }
  return description || null;
};

const readPrice = (value: unknown) => {
  if (!Number.isSafeInteger(value) || Number(value) <= 0 || Number(value) > MAX_PRICE_SATS) {
    throw new AppError(400, 'product price must be a positive integer in sats');
  }
  return Number(value);
};

const readMxnCents = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new AppError(400, 'product price must be a positive amount in MXN');
  }
  const cents = Math.round(value * 100);
  if (
    !Number.isSafeInteger(cents) ||
    cents > 2_147_483_647 ||
    Math.abs(cents / 100 - value) > 0.000_001
  ) {
    throw new AppError(400, 'product price in MXN can have at most two decimal places');
  }
  return cents;
};

const resolvePricing = async (
  input: ProductInput,
  converter: MxnPriceConverter | undefined,
  current?: CurrentProductPrice,
): Promise<ProductPricingData> => {
  const priceCurrency = input.priceCurrency ?? current?.priceCurrency ?? ProductPriceCurrency.SATS;
  if (
    priceCurrency !== ProductPriceCurrency.SATS &&
    priceCurrency !== ProductPriceCurrency.MXN
  ) {
    throw new AppError(400, 'priceCurrency must be SATS or MXN');
  }

  if (priceCurrency === ProductPriceCurrency.SATS) {
    const unchangedSatsPrice = current?.priceCurrency === ProductPriceCurrency.SATS
      ? current.priceSats
      : undefined;
    return {
      priceCurrency,
      priceSats: readPrice(input.priceSats ?? unchangedSatsPrice),
      priceMxnCents: null,
      lastBtcMxnRate: null,
      rateUpdatedAt: null,
    };
  }

  const unchangedMxnPrice = current?.priceCurrency === ProductPriceCurrency.MXN
    ? current.priceMxnCents
    : undefined;
  const priceMxnCents = input.priceMxn === undefined
    ? unchangedMxnPrice
    : readMxnCents(input.priceMxn);
  if (!priceMxnCents) {
    throw new AppError(400, 'product price in MXN is required');
  }
  if (!converter) {
    throw new AppError(503, 'MXN price conversion is not configured');
  }

  try {
    const conversion = await converter.convertMxnToSats(priceMxnCents);
    return {
      priceCurrency,
      priceMxnCents,
      priceSats: conversion.amountSats,
      lastBtcMxnRate: conversion.btcMxnRate,
      rateUpdatedAt: conversion.rateUpdatedAt,
    };
  } catch {
    throw new AppError(503, 'The BTC/MXN exchange rate is temporarily unavailable');
  }
};

const getOwnedBusinessId = async (ownerId: string) => {
  const business = await prisma.business.findUnique({
    where: { ownerId },
    select: { id: true },
  });
  if (!business) throw new AppError(404, 'business profile not found');
  return business.id;
};

const getOwnedProduct = async (ownerId: string, productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, business: { ownerId } },
    select: productSelect,
  });
  if (!product) throw new AppError(404, 'product not found');
  return product;
};

const translateUniqueNameError = (error: unknown): never => {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
    throw new AppError(409, 'a product with this name already exists');
  }
  throw error;
};

export const listOwnedProducts = async (ownerId: string) => {
  const businessId = await getOwnedBusinessId(ownerId);
  return prisma.product.findMany({
    where: { businessId },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: productSelect,
  });
};

export const listPublicProducts = async (businessId: unknown) => {
  if (typeof businessId !== 'string' || !businessId.trim()) {
    throw new AppError(400, 'businessId is required');
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, isActive: true },
    select: { id: true },
  });
  if (!business) throw new AppError(404, 'business not found');

  return prisma.product.findMany({
    where: { businessId: business.id, isActive: true },
    orderBy: { name: 'asc' },
    select: productSelect,
  });
};

export const createOwnedProduct = async (
  ownerId: string,
  input: ProductInput,
  converter?: MxnPriceConverter,
) => {
  const businessId = await getOwnedBusinessId(ownerId);
  const name = readName(input.name);
  const description = readDescription(input.description);
  const pricing = await resolvePricing(input, converter);

  try {
    return await prisma.product.create({
      data: {
        businessId,
        name,
        description,
        ...pricing,
      },
      select: productSelect,
    });
  } catch (error: unknown) {
    return translateUniqueNameError(error);
  }
};

export const updateOwnedProduct = async (
  ownerId: string,
  productId: string,
  input: ProductInput,
  converter?: MxnPriceConverter,
) => {
  const current = await getOwnedProduct(ownerId, productId);
  const data: Prisma.ProductUncheckedUpdateInput = {};

  if (input.name !== undefined) data.name = readName(input.name);
  if (input.description !== undefined) data.description = readDescription(input.description);
  if (
    input.priceCurrency !== undefined ||
    input.priceSats !== undefined ||
    input.priceMxn !== undefined
  ) {
    Object.assign(data, await resolvePricing(input, converter, current));
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') {
      throw new AppError(400, 'isActive must be a boolean');
    }
    data.isActive = input.isActive;
  }
  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'at least one product field is required');
  }

  try {
    return await prisma.product.update({
      where: { id: current.id },
      data,
      select: productSelect,
    });
  } catch (error: unknown) {
    return translateUniqueNameError(error);
  }
};

export const archiveOwnedProduct = async (ownerId: string, productId: string) => {
  const product = await getOwnedProduct(ownerId, productId);
  return prisma.product.update({
    where: { id: product.id },
    data: { isActive: false },
    select: productSelect,
  });
};
