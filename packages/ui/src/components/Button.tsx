'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

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

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  status?: ButtonStatus;
  /** Label while status is success. Defaults to the normal label. */
  successLabel?: string;
  /** An icon from `ionicons/icons`, shown before the label. */
  icon?: string;
}

/** The one button for staff web and admin. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', status = 'idle', successLabel, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  const busy = status === 'loading';
  const done = status === 'success';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {busy ? (
        <Spinner />
      ) : done ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={24}
            strokeDashoffset={24}
            style={{ animation: 'fo-draw 420ms var(--ease-snappy) forwards' }}
          />
        </svg>
      ) : icon ? (
        <Icon icon={icon} size={size === 'md' ? 18 : 16} />
      ) : null}
      {done && successLabel ? successLabel : children}
    </button>
  );
});
