/**
 * seed-exercises.ts
 *
 * Fetches the hasaneyldrm/exercises-dataset open-source dataset and populates
 * the exercise_media table with exercise names, GIF URLs, category, and primary
 * muscle target.
 *
 * GIFs are served from the GitHub raw CDN — no API key required.
 * Falls back to the static JPEG image when gif_url is absent.
 *
 * Usage:
 *   pnpm seed:exercises          — truncate + re-seed (clean run)
 *   pnpm seed:exercises --upsert — upsert only, keep existing rows
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATASET_URL =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
const MEDIA_BASE =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';

interface RawExercise {
  id: string;
  name: string;
  category: string;
  body_part: string;
  target: string;
  muscle_group?: string;
  gif_url?: string;
  image?: string;
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve the best available media URL for an exercise (GIF preferred, JPEG fallback). */
function resolveMediaUrl(ex: RawExercise): string | null {
  if (ex.gif_url?.trim()) return `${MEDIA_BASE}/${ex.gif_url.trim()}`;
  if (ex.image?.trim()) return `${MEDIA_BASE}/${ex.image.trim()}`;
  return null;
}

async function main() {
  const cleanRun = !process.argv.includes('--upsert');
  const prisma = new PrismaClient();

  try {
    console.log('Fetching exercise dataset from hasaneyldrm/exercises-dataset…');
    const res = await fetch(DATASET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching dataset`);

    const exercises: RawExercise[] = await res.json();
    console.log(`Found ${exercises.length} exercises.`);

    if (cleanRun) {
      console.log('Truncating exercise_media table for a clean seed…');
      await prisma.$executeRaw`TRUNCATE TABLE exercise_media`;
    }

    console.log('Seeding…\n');

    let gifCount = 0;
    let jpegFallbackCount = 0;
    let skipped = 0;

    for (const ex of exercises) {
      if (!ex.name?.trim()) {
        skipped++;
        continue;
      }

      const mediaUrl = resolveMediaUrl(ex);
      if (!mediaUrl) {
        skipped++;
        continue;
      }

      const isGif = ex.gif_url?.trim() !== undefined && ex.gif_url?.trim() !== '';
      if (isGif) gifCount++; else jpegFallbackCount++;

      const normalizedName = ex.name.toLowerCase().trim();
      const category = ex.category?.trim() || ex.body_part?.trim() || null;
      const primaryMuscles = ex.target?.trim() || ex.muscle_group?.trim() || null;

      await prisma.exerciseMedia.upsert({
        where: { normalizedName },
        create: { normalizedName, gifUrl: mediaUrl, category, primaryMuscles },
        update: { gifUrl: mediaUrl, category, primaryMuscles },
      });
    }

    const total = gifCount + jpegFallbackCount;
    console.log(`Done. ${total} exercises seeded (${gifCount} GIF, ${jpegFallbackCount} JPEG fallback), ${skipped} skipped.`);

    const groups = await prisma.exerciseMedia.groupBy({
      by: ['primaryMuscles'],
      _count: true,
      where: { primaryMuscles: { not: null } },
      orderBy: { _count: { primaryMuscles: 'desc' } },
    });

    console.log('\nExercises per primary muscle:');
    for (const g of groups) {
      console.log(`  ${toTitleCase(g.primaryMuscles ?? 'other')}: ${g._count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
