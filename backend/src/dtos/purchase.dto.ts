import { PaymentServiceError, type PurchaseInput } from '../services';

type PurchaseBody = {
  businessId?: unknown;
  amountSats?: unknown;
  productId?: unknown;
  idempotencyKey?: unknown;
};

export const purchaseInputFromRequest = (
  body: unknown,
  customerId: string,
): PurchaseInput => {
  if (!body || typeof body !== 'object') {
    throw new PaymentServiceError('INVALID_BODY', 'The request body is invalid.', 400);
  }

  const purchaseBody = body as PurchaseBody;

  if (typeof purchaseBody.businessId !== 'string') {
    throw new PaymentServiceError('INVALID_BUSINESS_ID', 'The business is required.', 400);
  }

  const hasAmount = purchaseBody.amountSats !== undefined;
  const hasProduct = purchaseBody.productId !== undefined;

  if (hasAmount === hasProduct) {
    throw new PaymentServiceError(
      'INVALID_PURCHASE_SELECTION',
      'Choose either a product or a custom amount.',
      400,
    );
  }

  if (hasAmount && typeof purchaseBody.amountSats !== 'number') {
    throw new PaymentServiceError('INVALID_AMOUNT', 'The amount must be expressed in sats.', 400);
  }

  if (hasProduct && typeof purchaseBody.productId !== 'string') {
    throw new PaymentServiceError('INVALID_PRODUCT_ID', 'The product is required.', 400);
  }

  if (typeof purchaseBody.idempotencyKey !== 'string') {
    throw new PaymentServiceError(
      'INVALID_IDEMPOTENCY_KEY',
      'The idempotency key is required.',
      400,
    );
  }

  return {
    businessId: purchaseBody.businessId,
    customerId,
    ...(hasAmount ? { amountSats: purchaseBody.amountSats as number } : {}),
    ...(hasProduct ? { productId: purchaseBody.productId as string } : {}),
    idempotencyKey: purchaseBody.idempotencyKey,
  };
};
