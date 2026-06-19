/**
 * backfill-onefithz.ts
 *
 * One-off script: adds the missing gym_profile, gym_schedule rows, and
 * community conversation for the ONEFITHZ gym, and sets checkinQrToken
 * if it is null.
 *
 * Usage: pnpm tsx db/scripts/backfill-onefithz.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

function timeToDate(hh: number, mm: number): string {
  // Store as a timestamp at epoch-zero date, matching the app's convention.
  return `1970-01-01T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`;
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Find the gym
    const gymRes = await client.query(
      `SELECT id, name, checkin_qr_token FROM gyms WHERE code = $1`,
      ['ONEFITHZ'],
    );
    if (gymRes.rowCount === 0) {
      console.error('Gym with code ONEFITHZ not found.');
      process.exit(1);
    }
    const gym = gymRes.rows[0] as { id: string; name: string; checkin_qr_token: string | null };
    console.log(`Found gym: ${gym.name} (${gym.id})`);

    await client.query('BEGIN');

    // 2. Set checkin_qr_token if missing
    if (!gym.checkin_qr_token) {
      const token = crypto.randomBytes(24).toString('hex');
      await client.query(`UPDATE gyms SET checkin_qr_token = $1 WHERE id = $2`, [token, gym.id]);
      console.log('  ✓ checkin_qr_token set');
    } else {
      console.log('  · checkin_qr_token already set, skipping');
    }

    // 3. Upsert gym_profile
    await client.query(
      `INSERT INTO gym_profile (gym_id) VALUES ($1) ON CONFLICT (gym_id) DO NOTHING`,
      [gym.id],
    );
    console.log('  ✓ gym_profile upserted');

    // 4. Insert default schedules (0=Sun … 6=Sat), skip if already present
    for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
      await client.query(
        `INSERT INTO gym_schedules (gym_id, day_of_week, open_time, close_time, is_closed)
         VALUES ($1, $2, '06:00', '22:00', false)
         ON CONFLICT (gym_id, day_of_week) DO NOTHING`,
        [gym.id, dayOfWeek],
      );
    }
    console.log('  ✓ gym_schedules upserted (7 days)');

    // 5. Create community conversation if missing
    const convRes = await client.query(
      `SELECT id FROM conversations WHERE gym_id = $1 AND type = 'COMMUNITY'`,
      [gym.id],
    );
    if (convRes.rowCount === 0) {
      await client.query(
        `INSERT INTO conversations (gym_id, type, name, is_default)
         VALUES ($1, 'COMMUNITY', $2, true)`,
        [gym.id, `${gym.name} Community`],
      );
      console.log('  ✓ COMMUNITY conversation created');
    } else {
      console.log('  · COMMUNITY conversation already exists, skipping');
    }

    await client.query('COMMIT');
    console.log('\nDone — ONEFITHZ gym is fully set up.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
