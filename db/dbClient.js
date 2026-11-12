import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Runtime client uses DATABASE_URL (medguard_app non-superuser role)
const connectionString = process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
  // Warning only so tests can import without an active DB connection
  console.warn('Warning: Neither DATABASE_URL nor MIGRATION_DATABASE_URL is set in environment.');
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * Execute a query scoped to an authenticated caregiver.
 * Runs inside a transaction and sets 'app.current_user_id' with SET LOCAL
 * so that Row-Level Security (RLS) policies apply cleanly.
 *
 * @param {string} caregiverId - UUID of the authenticated caregiver
 * @param {function(pg.PoolClient): Promise<any>} callback - Operations to execute
 * @returns {Promise<any>}
 */
export async function withCaregiverContext(caregiverId, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (caregiverId) {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', caregiverId]);
    }
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

export default pool;

