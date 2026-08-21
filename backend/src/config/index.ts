import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const configuredClinkTimeout = Number(process.env.CLINK_TIMEOUT_SECONDS ?? 30);
const clinkTimeoutSeconds =
  Number.isFinite(configuredClinkTimeout) && configuredClinkTimeout > 0
    ? configuredClinkTimeout
    : 30;

const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  clinkPrivateKey: process.env.CLINK_PRIVATE_KEY,
  clinkTimeoutSeconds,
};

export default config;
