import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names; later Tailwind classes win over earlier ones (e.g. a caller's `h-9` over the default `h-11`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
