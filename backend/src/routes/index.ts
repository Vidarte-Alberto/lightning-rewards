import { Router } from 'express';

import config from '../config';
import prisma from '../db/prisma';
import { ClinkService, PaymentService } from '../services';
import { createPaymentRouter } from './payment.routes';

const router = Router();
const clinkService = new ClinkService({
  privateKeyHex: config.clinkPrivateKey,
  timeoutSeconds: config.clinkTimeoutSeconds,
});
const paymentService = new PaymentService(prisma, clinkService);

router.use('/payments', createPaymentRouter(paymentService));

export default router;
