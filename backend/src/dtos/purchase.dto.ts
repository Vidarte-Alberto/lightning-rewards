import { PaymentServiceError, type PurchaseInput } from '../services';

type PurchaseBody = {
  businessId?: unknown;
  amountSats?: unknown;
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

  if (typeof purchaseBody.amountSats !== 'number') {
    throw new PaymentServiceError('INVALID_AMOUNT', 'The amount must be expressed in sats.', 400);
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
    amountSats: purchaseBody.amountSats,
    idempotencyKey: purchaseBody.idempotencyKey,
  };
};
