import { Router, type Request, type Response } from 'express';

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
      if (!request.user) {
        response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' } });
        return;
      }

      const input = purchaseInputFromRequest(request.body, request.user.id);
      const result = await paymentService.purchase(input);

      response.status(responseStatus(result)).json({
        outcome: result.outcome,
        transaction: result.transaction,
        ...(result.loyalty && { loyalty: result.loyalty }),
        ...(result.code && { error: { code: result.code, message: result.message } }),
      });
    } catch (error: unknown) {
      if (error instanceof PaymentServiceError) {
        response.status(error.httpStatus).json({
          error: { code: error.code, message: error.message },
        });
        return;
      }

      console.error('Purchase request failed unexpectedly', error);

      response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'The purchase could not be processed.' },
      });
    }
  });

  return router;
};
