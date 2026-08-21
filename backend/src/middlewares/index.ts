import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import config from '../config';
import prisma from '../db/prisma';
import { Role } from '../generated/prisma/client';

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };

const readBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    throw new AppError(401, 'authorization header is required');
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'authorization header must use Bearer token');
  }

  return token;
};

const readJwtSubject = (payload: string | jwt.JwtPayload) => {
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new AppError(401, 'invalid token');
  }

  return payload.sub;
};

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req.header('authorization'));
  const payload = jwt.verify(token, config.jwtSecret);
  const userId = readJwtSubject(payload);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'invalid token');
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  next();
});

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, 'authentication is required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'insufficient permissions'));
      return;
    }

    next();
  };
};

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, 'route not found'));
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  void _next;

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ error: 'invalid token' });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'internal server error' });
};
