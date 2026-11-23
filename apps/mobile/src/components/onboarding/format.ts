import { kgToLb } from '../../lib/units';

/** "Apr 2027" from YYYY-MM-DD, or "—" when there is no goal date. */
export function formatGoalDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const [y, m] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "−0.5 kg" / "+0.2 lb" for a signed weekly rate in kg. */
export function formatWeeklyRate(rateKg: number, unit: 'kg' | 'lb'): string {
  const value = unit === 'lb' ? kgToLb(rateKg) : rateKg;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(unit === 'lb' ? 1 : 2).replace(/\.?0+$/, '')} ${unit}`;
}
