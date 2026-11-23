/**
 * Display conversions only. The API always stores and returns kg and cm, so convert
 * user input to metric before sending and convert API values for display.
 */

const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

/** Rounded to the 2 decimals the API accepts. */
export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 100) / 100;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

/** Whole centimetres, as the API stores height. */
export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

/** API decimals arrive as strings (e.g. "80.5"); normalise before doing maths. */
export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
