/**
 * apply-migrations.ts
 *
 * Applies SQL migration files from db/migrations/ to the database in lexical
 * order, skipping files that have already been applied.
 *
 * Usage: pnpm db:migrate
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env (copy from .env.example)
 *   - PostgreSQL reachable (run `pnpm db:up` first)
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'db/migrations');

async function run(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Explicitly set search_path for PostgreSQL 15+ compatibility.
    // PG 15 revoked the automatic CREATE privilege on the public schema,
    // so we must select it explicitly before any DDL statements.
    await client.query('SET search_path = public');

    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    );
    const applied = new Set(rows.map((r) => r.version));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexical order: 0001_, 0002_, …

    if (files.length === 0) {
      console.log('No migration files found in db/migrations/');
      return;
    }

    let count = 0;

    for (const file of files) {
      const version = path.basename(file, '.sql');

      if (applied.has(version)) {
        console.log(`  skip    ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        console.log(`  applied ${file}`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed for ${file}: ${(err as Error).message}`);
      }
    }

    const skipped = files.length - count;
    console.log(
      `\nMigrations complete — ${count} applied, ${skipped} already up to date.`,
    );
  } finally {
    await client.end();
  }
}

run().catch((err: Error) => {
  console.error('\nMigration error:', err.message);
  process.exit(1);
});
