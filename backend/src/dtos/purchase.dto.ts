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
    throw new PaymentServiceError('INVALID_BODY', 'El cuerpo de la solicitud no es válido.', 400);
  }

  const purchaseBody = body as PurchaseBody;

  if (typeof purchaseBody.businessId !== 'string') {
    throw new PaymentServiceError('INVALID_BUSINESS_ID', 'El negocio es obligatorio.', 400);
  }

  if (typeof purchaseBody.amountSats !== 'number') {
    throw new PaymentServiceError('INVALID_AMOUNT', 'El monto debe expresarse en sats.', 400);
  }

  if (typeof purchaseBody.idempotencyKey !== 'string') {
    throw new PaymentServiceError(
      'INVALID_IDEMPOTENCY_KEY',
      'La clave de idempotencia es obligatoria.',
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
