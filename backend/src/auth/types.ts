import type { Role } from '../generated/prisma/client';

declare global {
  // Express exposes Request through a namespace specifically for declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: Role;
      };
    }
  }
}

export {};
