import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { MockedFunction } from 'vitest';

import { Role } from '../src/generated/prisma/client';
import { login, register, updateCustomerProfile } from '../src/auth';
import prisma from '../src/db/prisma';
import { requireRole, type AppError } from '../src/middlewares';

const testId = randomUUID();
const createdEmails = [
  `phase2-owner-${testId}@example.com`,
  `phase2-customer-${testId}@example.com`,
];

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: createdEmails } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  await prisma.business.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test('registers a business owner with a business profile', async () => {
  const result = await register({
    role: Role.BUSINESS,
    email: createdEmails[0],
    password: 'password123',
    name: 'Phase 2 Cafe',
    category: 'Cafe',
    nofferString: `noffer-${testId}`,
    rewardDescription: 'Un cafe gratis',
  });

  expect(result.user).toMatchObject({
    email: createdEmails[0],
    role: Role.BUSINESS,
  });
  expect(result).not.toHaveProperty('user.passwordHash');
  expect(result.business).toMatchObject({
    name: 'Phase 2 Cafe',
    category: 'Cafe',
  });
});

test('logs in a customer and lets them update their ndebit string', async () => {
  const registered = await register({
    role: Role.CUSTOMER,
    email: createdEmails[1],
    password: 'password123',
  });

  const loggedIn = await login({
    email: createdEmails[1],
    password: 'password123',
  });

  expect(typeof loggedIn.token).toBe('string');
  expect(loggedIn.user.role).toBe(Role.CUSTOMER);

  const updatedUser = await updateCustomerProfile(registered.user.id, {
    ndebitString: `ndebit-${testId}`,
  });

  expect(updatedUser.ndebitString).toBe(`ndebit-${testId}`);
});

test('rejects customer-only routes for business users', () => {
  const req = {
    user: {
      id: 'business-user',
      email: 'business@example.com',
      role: Role.BUSINESS,
    },
  } as Request;
  const res = {} as Response;
  const next = vi.fn() as MockedFunction<NextFunction>;

  requireRole(Role.CUSTOMER)(req, res, next);

  const error = next.mock.calls[0][0] as unknown as AppError;

  expect(error.statusCode).toBe(403);
});
