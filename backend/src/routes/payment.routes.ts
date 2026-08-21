import { Router, type Request, type Response } from 'express';

import { Role } from '../generated/prisma/client';
import { purchaseInputFromRequest } from '../dtos';
import { PaymentService, PaymentServiceError, type PurchaseResult } from '../services';

const responseStatus = (result: PurchaseResult) => {
  if (result.outcome === 'paid') return 200;
  if (result.outcome === 'pending' || result.outcome === 'unknown') return 202;
  return result.code?.endsWith('_2') || result.code?.includes('NETWORK') ? 503 : 422;
};

export const createPaymentRouter = (paymentService: PaymentService) => {
  const router = Router();

  router.post('/purchase', async (request: Request, response: Response) => {
    try {
      if (!request.auth || request.auth.role !== Role.CUSTOMER) {
        response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Autenticación requerida.' } });
        return;
      }

      const input = purchaseInputFromRequest(request.body, request.auth.userId);
      const result = await paymentService.purchase(input);

      response.status(responseStatus(result)).json({
        outcome: result.outcome,
        transaction: result.transaction,
        ...(result.code && { error: { code: result.code, message: result.message } }),
      });
    } catch (error: unknown) {
      if (error instanceof PaymentServiceError) {
        response.status(error.httpStatus).json({
          error: { code: error.code, message: error.message },
        });
        return;
      }

      response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'No se pudo procesar la compra.' },
      });
    }
  });

  return router;
};
