import { Router } from 'express';

import config from '../config';
import prisma from '../db/prisma';
import { Role } from '../generated/prisma/client';
import { asyncHandler, requireAuth, requireRole } from '../middlewares';
import { ClinkService, PaymentService } from '../services';
import { login, register, updateCustomerProfile } from '../auth';
import { createPaymentRouter } from './payment.routes';

const router = Router();
const clinkService = new ClinkService({
  privateKeyHex: config.clinkPrivateKey,
  timeoutSeconds: config.clinkTimeoutSeconds,
});
const paymentService = new PaymentService(prisma, clinkService);

router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const result = await register(req.body);
    res.status(201).json(result);
  }),
);

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const result = await login(req.body);
    res.json(result);
  }),
);

router.patch(
  '/customers/me',
  requireAuth,
  requireRole(Role.CUSTOMER),
  asyncHandler(async (req, res) => {
    const user = await updateCustomerProfile(req.user.id, req.body);
    res.json({ user });
  }),
);

router.use(
  '/payments',
  requireAuth,
  requireRole(Role.CUSTOMER),
  createPaymentRouter(paymentService),
);

export default router;
