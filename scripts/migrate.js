import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migrations must run with owner/superuser privileges
const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: Neither MIGRATION_DATABASE_URL nor DATABASE_URL is set in environment.');
  process.exit(1);
}

async function runMigrations() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Connected to database for migration execution.');

    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, '../db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const { rows: appliedRows } = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(appliedRows.map((r) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[SKIPPED] ${file} (already applied)`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[SUCCESS] ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[FAILED] ${file}:`, err.message);
        throw err;
      }
    }

    console.log('All migrations executed successfully.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

