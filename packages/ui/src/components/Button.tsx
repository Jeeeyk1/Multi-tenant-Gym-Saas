'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { buttonClasses, type ButtonSize, type ButtonStatus, type ButtonVariant } from './button-classes';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

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
