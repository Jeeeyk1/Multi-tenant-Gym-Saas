/**
 * apply-seeds.ts
 *
 * Applies SQL seed files from db/seeds/ to the database in lexical order.
 * Seeds are always re-applied — write them to be idempotent (use ON CONFLICT DO NOTHING).
 *
 * Usage: pnpm db:seed
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env (copy from .env.example)
 *   - Migrations applied (run `pnpm db:migrate` first)
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

const SEEDS_DIR = path.resolve(process.cwd(), 'db/seeds');

async function run(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database\n');

    const files = fs
      .readdirSync(SEEDS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexical order: 0001_, 0002_, …

    if (files.length === 0) {
      console.log('No seed files found in db/seeds/');
      return;
    }

    for (const file of files) {
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`  applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Seed failed for ${file}: ${(err as Error).message}`);
      }
    }

    console.log('\nSeeds complete.');
  } finally {
    await client.end();
  }
}

run().catch((err: Error) => {
  console.error('\nSeed error:', err.message);
  process.exit(1);
});
