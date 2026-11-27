// No 'use client': server components (e.g. a <Link> styled as a button) call buttonClasses() too.
import { cn } from '../cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-soft';
export type ButtonSize = 'md' | 'sm';
/** idle → loading while the request runs → success for a moment after it lands. */
export type ButtonStatus = 'idle' | 'loading' | 'success';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-surface text-foreground border border-border hover:bg-hover',
  ghost: 'bg-transparent text-foreground hover:bg-hover',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
  'danger-soft': 'bg-destructive-bg text-destructive-text hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'h-control px-4 text-label gap-2',
  sm: 'h-9 px-3 text-sm gap-1.5',
};

/** Class names for a button look on something that isn't a <button>, e.g. a Next.js <Link>. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md font-semibold',
    'transition-[background-color,opacity,transform] duration-snappy ease-snappy active:scale-[0.97] active:duration-75',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
