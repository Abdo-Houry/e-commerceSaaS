import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Monorepo-root .env, then an optional backend/.env. Real environment variables always win.
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),
  API_PUBLIC_URL: z.url().default('http://localhost:4000'),
  WEB_PUBLIC_URL: z.url().default('http://localhost:3000'),
  WEB_INTERNAL_URL: z.url().optional(),
  REVALIDATE_SECRET: z.string().default(''),
  APP_TIMEZONE: z.string().default('Asia/Damascus'),

  // Managed hosts (Render, Railway, Neon…) hand out a single connection string; it wins over DB_*.
  DATABASE_URL: z.string().default(''),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USERNAME: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('matjari'),
  DB_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default('Matjari <no-reply@matjari.local>'),

  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

/**
 * Database connection details: DATABASE_URL when a managed host provides one, otherwise the DB_* values.
 * Tests always use DB_* so a DATABASE_URL left in .env can never point them at a real database
 * (the test setup drops and recreates whatever it connects to).
 */
export const db = (() => {
  const fromParts = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL,
  };
  if (!env.DATABASE_URL || env.NODE_ENV === 'test') return fromParts;

  const url = new URL(env.DATABASE_URL);
  const sslmode = url.searchParams.get('sslmode');
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, '') || env.DB_NAME,
    ssl: env.DB_SSL || (sslmode !== null && sslmode !== 'disable'),
  };
})();

/** Managed Postgres usually terminates TLS with a certificate the driver can't chain to a root CA. */
export const dbSsl = db.ssl ? { rejectUnauthorized: false } : false;
export const uploadRoot = path.resolve(__dirname, '../..', env.UPLOAD_DIR);
