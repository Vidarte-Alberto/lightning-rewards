import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const configuredClinkTimeout = Number(process.env.CLINK_TIMEOUT_SECONDS ?? 30);
const clinkTimeoutSeconds =
  Number.isFinite(configuredClinkTimeout) && configuredClinkTimeout > 0
    ? configuredClinkTimeout
    : 30;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  clinkPrivateKey: process.env.CLINK_PRIVATE_KEY,
  clinkTimeoutSeconds,
  coinGeckoApiKey: process.env.COINGECKO_API_KEY,
  jwtSecret,
};

export default config;
