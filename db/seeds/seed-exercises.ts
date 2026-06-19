/**
 * seed-exercises.ts
 *
 * Fetches the yuhonas/free-exercise-db open-source dataset and populates
 * the exercise_media table with exercise names, category, primary muscles,
 * and a static image URL for each exercise.
 *
 * Images are served from the GitHub raw CDN — no API key required.
 *
 * Usage: pnpm seed:exercises
 *
 * Safe to re-run — uses upsert on normalized_name.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

interface RawExercise {
  name: string;
  category: string;
  primaryMuscles: string[];
  images: string[];
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Fetching exercise dataset from yuhonas/free-exercise-db…');
    const res = await fetch(DATASET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching dataset`);

    const exercises: RawExercise[] = await res.json();
    console.log(`Found ${exercises.length} exercises. Seeding…\n`);

    let inserted = 0;
    let skipped = 0;

    for (const ex of exercises) {
      if (!ex.images?.length || !ex.name) {
        skipped++;
        continue;
      }

      // The images array contains paths like "3_4_Sit-Up/0.jpg"
      // Construct the full GitHub CDN URL for the first (start-position) image.
      const imagePath = ex.images[0]; // e.g. "3_4_Sit-Up/0.jpg"
      const gifUrl = `${IMAGE_BASE}/${imagePath}`;

      const normalizedName = ex.name.toLowerCase().trim();
      const primaryMuscle = ex.primaryMuscles?.[0] ?? null;

      await prisma.exerciseMedia.upsert({
        where: { normalizedName },
        create: {
          normalizedName,
          gifUrl,
          category: ex.category ?? null,
          primaryMuscles: primaryMuscle,
        },
        update: {
          gifUrl,
          category: ex.category ?? null,
          primaryMuscles: primaryMuscle,
        },
      });

      inserted++;
    }

    console.log(`Done. ${inserted} exercises seeded, ${skipped} skipped (no images).`);

    // Print a summary of what we have per muscle group
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
