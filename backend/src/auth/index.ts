import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import config from '../config';
import prisma from '../db/prisma';
import { Role, type Business, type User } from '../generated/prisma/client';
import { AppError } from '../middlewares';
import {
  clinkFormatMessage,
  hasClinkPrefix,
  type ClinkPointerType,
} from '../validation/clink';

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN = '7d';

type RegisterInput = {
  role?: unknown;
  email?: unknown;
  password?: unknown;
  name?: unknown;
  category?: unknown;
  nofferString?: unknown;
  rewardDescription?: unknown;
  logoUrl?: unknown;
  description?: unknown;
};

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

type UpdateCustomerInput = {
  ndebitString?: unknown;
};

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

type PublicUser = AuthUser & {
  ndebitString?: string | null;
};

type RegisterResult = {
  user: PublicUser;
  business?: Pick<Business, 'id' | 'name' | 'category' | 'rewardDescription'>;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const readRequiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, `${field} is required`);
  }

  return value.trim();
};

const readRequiredClinkPointer = (
  value: unknown,
  field: string,
  type: ClinkPointerType,
) => {
  const pointer = readRequiredString(value, field);

  if (!hasClinkPrefix(pointer, type)) {
    throw new AppError(400, clinkFormatMessage(field, type));
  }

  return pointer;
};

const readOptionalString = (value: unknown, field: string) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError(400, `${field} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseRole = (value: unknown) => {
  if (value !== Role.BUSINESS && value !== Role.CUSTOMER) {
    throw new AppError(400, 'role must be BUSINESS or CUSTOMER');
  }

  return value;
};

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  ndebitString: user.ndebitString,
});

export const signAuthToken = (user: AuthUser) =>
  jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: TOKEN_EXPIRES_IN,
      subject: user.id,
    },
  );

export const register = async (input: RegisterInput): Promise<RegisterResult> => {
  const role = parseRole(input.role);
  const email = normalizeEmail(readRequiredString(input.email, 'email'));
  const password = readRequiredString(input.password, 'password');

  if (password.length < 8) {
    throw new AppError(400, 'password must be at least 8 characters');
  }

  const businessInput =
    role === Role.BUSINESS
      ? {
          name: readRequiredString(input.name, 'name'),
          category: readRequiredString(input.category, 'category'),
          nofferString: readRequiredClinkPointer(
            input.nofferString,
            'nofferString',
            'noffer',
          ),
          rewardDescription: readRequiredString(
            input.rewardDescription,
            'rewardDescription',
          ),
          logoUrl: readOptionalString(input.logoUrl, 'logoUrl'),
          description: readOptionalString(input.description, 'description'),
        }
      : undefined;

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError(409, 'email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  if (role === Role.CUSTOMER) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });

    return { user: toPublicUser(user) };
  }

  if (!businessInput) {
    throw new AppError(400, 'business profile is required');
  }

  const { user, business } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });

    const createdBusiness = await tx.business.create({
      data: {
        ownerId: createdUser.id,
        name: businessInput.name,
        category: businessInput.category,
        nofferString: businessInput.nofferString,
        rewardDescription: businessInput.rewardDescription,
        logoUrl: businessInput.logoUrl,
        description: businessInput.description,
      },
      select: {
        id: true,
        name: true,
        category: true,
        rewardDescription: true,
      },
    });

    return { user: createdUser, business: createdBusiness };
  });

  return { user: toPublicUser(user), business };
};

export const login = async (input: LoginInput) => {
  const email = normalizeEmail(readRequiredString(input.email, 'email'));
  const password = readRequiredString(input.password, 'password');
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new AppError(401, 'invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'invalid email or password');
  }

  const publicUser = toPublicUser(user);

  return {
    token: signAuthToken(publicUser),
    user: publicUser,
  };
};

export const updateCustomerProfile = async (userId: string, input: UpdateCustomerInput) => {
  const ndebitString = readRequiredClinkPointer(
    input.ndebitString,
    'ndebitString',
    'ndebit',
  );

  const user = await prisma.user.update({
    where: { id: userId },
    data: { ndebitString },
  });

  return toPublicUser(user);
};
