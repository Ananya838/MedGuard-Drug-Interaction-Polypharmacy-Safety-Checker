import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL;

if (!connectionString) {
  console.error('Error: Neither DATABASE_URL nor MIGRATION_DATABASE_URL is set in environment.');
  process.exit(1);
}

const REQUIRED_TABLES = [
  'users',
  'refresh_tokens',
  'patients',
  'caregiver_access',
  'audit_log',
  'ingredients',
  'ingredient_synonyms',
  'drug_classes',
  'ingredient_drug_classes',
  'brands',
  'brand_ingredients',
  'interactions',
  'timing_rules',
  'contraindications',
  'beers_rules',
  'food_interactions',
  'dose_limits',
  'patient_medicines',
  'scan_history',
  'reminders',
  'adherence_log'
];

const RLS_TABLES = [
  'patients',
  'patient_medicines',
  'scan_history',
  'reminders',
  'adherence_log'
];

export async function verifyDatabase(clientInstance = null) {
  const client = clientInstance || new Client({ connectionString });
  const shouldClose = !clientInstance;
  if (shouldClose) {
    await client.connect();
  }

  console.log('================ MedGuard Database Health Verification ================');
  console.log(`Connecting to: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    // 1. Verify Tables and Record Counts
    console.log('1. Checking Schema Tables and Row Counts:');
    const { rows: tableRows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const existingTables = new Set(tableRows.map((r) => r.table_name));

    let allTablesPresent = true;
    for (const table of REQUIRED_TABLES) {
      if (existingTables.has(table)) {
        const { rows: countRows } = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
        console.log(`  [OK] Table '${table}' exists (${countRows[0].count} records)`);
      } else {
        console.error(`  [MISSING] Table '${table}' was NOT found in public schema!`);
        allTablesPresent = false;
      }
    }

    if (!allTablesPresent) {
      throw new Error('Database verification failed: missing one or more required tables.');
    }

    // 2. Verify Row-Level Security via pg_class.relrowsecurity and relforcerowsecurity
    console.log('\n2. Verifying Row-Level Security (RLS) Status (pg_class):');
    const { rows: rlsRows } = await client.query(`
      SELECT 
        c.relname AS tablename,
        c.relrowsecurity AS rowsecurity,
        c.relforcerowsecurity AS forcerowsecurity,
        r.rolname AS owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_roles r ON r.oid = c.relowner
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND c.relname = ANY($1)
    `, [RLS_TABLES]);

    const rlsMap = new Map(rlsRows.map((r) => [r.tablename, r]));
    let allRlsValid = true;

    for (const table of RLS_TABLES) {
      const info = rlsMap.get(table);
      if (!info) {
        console.error(`  [FAIL] RLS Table '${table}' not found in pg_class!`);
        allRlsValid = false;
        continue;
      }

      const isEnabled = Boolean(info.rowsecurity);
      const isForced = Boolean(info.forcerowsecurity);
      const notOwnedByApp = info.owner !== 'medguard_app';

      if (isEnabled && isForced && notOwnedByApp) {
        console.log(`  [OK] Table '${table}': RLS Enabled: YES, RLS Forced: YES, Owner: '${info.owner}' (Not owned by medguard_app: YES)`);
      } else {
        console.warn(`  [WARN] Table '${table}': RLS Enabled: ${isEnabled ? 'YES' : 'NO'}, RLS Forced: ${isForced ? 'YES' : 'NO'}, Owner: '${info.owner}' (Not owned by medguard_app: ${notOwnedByApp ? 'YES' : 'NO'})`);
        allRlsValid = false;
      }
    }

    if (!allRlsValid) {
      throw new Error('Database verification failed: RLS is not properly enabled, forced, or isolated on all sensitive tables.');
    }

    // 3. Verify Application Role (medguard_app)
    console.log('\n3. Verifying Application Role (medguard_app):');
    const { rows: roleRows } = await client.query(`
      SELECT 
        r.rolname,
        r.rolsuper,
        r.rolcanlogin,
        (
          SELECT COUNT(*)::int 
          FROM pg_class c 
          JOIN pg_namespace n ON n.oid = c.relnamespace 
          WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relowner = r.oid
        ) AS owned_tables_count
      FROM pg_roles r 
      WHERE r.rolname = 'medguard_app'
    `);

    if (roleRows.length > 0) {
      const role = roleRows[0];
      const isNotSuper = !role.rolsuper;
      const ownsNoTables = role.owned_tables_count === 0;

      console.log(`  [OK] Role 'medguard_app' exists`);
      console.log(`  [OK] Can Login: ${role.rolcanlogin ? 'YES' : 'NO'}`);
      console.log(`  [OK] Is Not Superuser: ${isNotSuper ? 'YES' : 'NO'}`);
      console.log(`  [OK] Does Not Own Tables: ${ownsNoTables ? 'YES' : 'NO'} (${role.owned_tables_count} tables owned)`);

      if (!isNotSuper || !ownsNoTables) {
        throw new Error("Application role 'medguard_app' security violation: role has superuser privileges or owns tables.");
      }
    } else {
      console.warn("  [NOTE] Role 'medguard_app' not found yet. (Apply migration 006 to provision it).");
    }

    console.log('\n================ Verification Complete: ALL CHECKS PASSED ================');
  } finally {
    if (shouldClose) {
      await client.end();
    }
  }
}

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('verify-db.js')) {
  verifyDatabase().catch((err) => {
    console.error('\nVerification Aborted:', err.message);
    process.exit(1);
  });
}
