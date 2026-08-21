import { Router } from 'express';

import config from '../config';
import prisma from '../db/prisma';
import { Role } from '../generated/prisma/client';
import { asyncHandler, requireAuth, requireRole } from '../middlewares';
import {
  ClinkService,
  CoinGeckoService,
  addStamp,
  archiveOwnedProduct,
  checkOwnedBusinessOffer,
  createOwnedProduct,
  getBusinessCustomers,
  getBusinessDetail,
  getCustomerCards,
  getCustomerClinkSetup,
  getOwnedBusiness,
  getOwnedBusinessCustomers,
  getOwnedBusinessTransactions,
  listBusinesses,
  listOwnedProducts,
  listPublicProducts,
  PaymentService,
  updateOwnedBusiness,
  updateOwnedProduct,
} from '../services';
import { login, register, updateCustomerProfile } from '../auth';
import { createPaymentRouter } from './payment.routes';

const router = Router();
const clinkService = new ClinkService({
  privateKeyHex: config.clinkPrivateKey,
  timeoutSeconds: config.clinkTimeoutSeconds,
});
const coinGeckoService = new CoinGeckoService({ apiKey: config.coinGeckoApiKey });
const paymentService = new PaymentService(
  prisma,
  clinkService,
  { addStamp },
  coinGeckoService,
);

router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const result = await register(req.body);
    res.status(201).json(result);
  }),
);

router.get(
  '/businesses/me/products',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const products = await listOwnedProducts(req.user.id);
    res.json({ products });
  }),
);

router.post(
  '/businesses/me/products',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const product = await createOwnedProduct(req.user.id, req.body, coinGeckoService);
    res.status(201).json({ product });
  }),
);

router.patch(
  '/businesses/me/products/:productId',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const product = await updateOwnedProduct(
      req.user.id,
      req.params.productId,
      req.body,
      coinGeckoService,
    );
    res.json({ product });
  }),
);

router.delete(
  '/businesses/me/products/:productId',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const product = await archiveOwnedProduct(req.user.id, req.params.productId);
    res.json({ product });
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

router.get(
  '/customers/me/businesses',
  requireAuth,
  requireRole(Role.CUSTOMER),
  asyncHandler(async (req, res) => {
    const businesses = await listBusinesses({
      ...req.query,
      customerId: req.user.id,
    });
    res.json({ businesses });
  }),
);

router.get(
  '/customers/me/cards',
  requireAuth,
  requireRole(Role.CUSTOMER),
  asyncHandler(async (req, res) => {
    const cards = await getCustomerCards(req.user.id);
    res.json({ cards });
  }),
);

router.get(
  '/customers/me/clink-setup',
  requireAuth,
  requireRole(Role.CUSTOMER),
  asyncHandler(async (_req, res) => {
    const clinkSetup = await getCustomerClinkSetup(clinkService);
    res.json({ clinkSetup });
  }),
);

router.use(
  '/payments',
  requireAuth,
  requireRole(Role.CUSTOMER),
  createPaymentRouter(paymentService),
);

router.get(
  '/businesses/me',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const business = await getOwnedBusiness(req.user.id);
    res.json({ business });
  }),
);

router.patch(
  '/businesses/me',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const business = await updateOwnedBusiness(req.user.id, req.body);
    res.json({ business });
  }),
);

router.get(
  '/businesses/me/customers',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const customers = await getOwnedBusinessCustomers(req.user.id);
    res.json({ customers });
  }),
);

router.get(
  '/businesses/me/transactions',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const transactions = await getOwnedBusinessTransactions(req.user.id);
    res.json({ transactions });
  }),
);

router.post(
  '/businesses/me/offer-test',
  requireAuth,
  requireRole(Role.BUSINESS),
  asyncHandler(async (req, res) => {
    const offerStatus = await checkOwnedBusinessOffer(req.user.id, clinkService);
    res.json({ offerStatus });
  }),
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
  '/businesses/:id/products',
  asyncHandler(async (req, res) => {
    const products = await listPublicProducts(req.params.id);
    res.json({ products });
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
