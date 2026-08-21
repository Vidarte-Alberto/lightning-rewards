declare module 'jsonwebtoken' {
  export class JsonWebTokenError extends Error {}

  export interface JwtPayload {
    [key: string]: unknown;
    exp?: number;
    iat?: number;
    sub?: string;
  }

  export interface SignOptions {
    expiresIn?: string | number;
    subject?: string;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string,
    options?: SignOptions,
  ): string;

  export function verify(token: string, secretOrPublicKey: string): string | JwtPayload;
}
