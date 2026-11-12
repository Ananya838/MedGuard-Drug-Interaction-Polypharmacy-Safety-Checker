import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

// Load server/.env first if present; fallback to workspace root .env
const serverEnvPath = path.resolve(process.cwd(), 'server/.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-32-chars-long-medguard',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-32-chars-long-medguard',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// Validate mandatory production configuration
if (config.NODE_ENV === 'production') {
  if (!config.DATABASE_URL) {
    throw new Error('Configuration Error: DATABASE_URL is required in production.');
  }
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 16) {
    throw new Error('Configuration Error: JWT_ACCESS_SECRET must be set and at least 16 characters in production.');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 16) {
    throw new Error('Configuration Error: JWT_REFRESH_SECRET must be set and at least 16 characters in production.');
  }
}

// Global Connection Pool using medguard_app role
let activePool = new Pool({
  connectionString: config.DATABASE_URL,
});

export function getPool() {
  return activePool;
}

export function setPool(customPool) {
  activePool = customPool;
}

export async function closePool() {
  if (activePool) {
    await activePool.end();
  }
}

/**
 * Executes a scoped transaction setting PostgreSQL RLS session identity.
 * Essential for pooled connections where SET SESSION would leak to other users.
 *
 * @param {string} userId - UUID of the authenticated caregiver
 * @param {function(pg.PoolClient): Promise<any>} callback
 */
export async function withUserTransaction(userId, callback) {
  if (!userId) {
    throw new Error('Security Error: withUserTransaction requires an authenticated userId.');
  }
  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
