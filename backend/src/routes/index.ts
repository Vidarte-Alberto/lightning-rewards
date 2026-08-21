import { Router } from 'express';

import config from '../config';
import prisma from '../db/prisma';
import { Role } from '../generated/prisma/client';
import { asyncHandler, requireAuth, requireRole } from '../middlewares';
import {
  ClinkService,
  getBusinessCustomers,
  getBusinessDetail,
  getCustomerCards,
  listBusinesses,
  PaymentService,
} from '../services';
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

router.get(
  '/businesses',
  asyncHandler(async (req, res) => {
    const businesses = await listBusinesses(req.query);
    res.json({ businesses });
  }),
);

router.get(
  '/businesses/:id',
  asyncHandler(async (req, res) => {
    const business = await getBusinessDetail(req.params.id, req.query);
    res.json({ business });
  }),
);

router.get(
  '/customers/:id/cards',
  requireAuth,
  requireRole(Role.CUSTOMER),
  asyncHandler(async (req, res) => {
    if (req.user.id !== req.params.id) {
      res.status(403).json({ error: 'insufficient permissions' });
      return;
    }

    const cards = await getCustomerCards(req.params.id);
    res.json({ cards });
  }),
);

router.get(
  '/businesses/:id/customers',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const customers = await getBusinessCustomers(req.params.id, req.user.id);
    res.json({ customers });
  }),
);

export default router;
