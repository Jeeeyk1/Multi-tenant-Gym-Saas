/**
 * Epley formula: estimated 1-rep max = weight × (1 + reps / 30)
 * Returns value rounded to 2 decimal places.
 */
export function calculateEstimated1rm(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 100) / 100;
}
