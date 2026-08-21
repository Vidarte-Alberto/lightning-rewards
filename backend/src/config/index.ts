import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
};

export default config;
