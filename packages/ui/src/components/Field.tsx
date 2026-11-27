'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../cn';

const CONTROL =
  'w-full rounded-md border border-border bg-surface px-3 text-body text-foreground placeholder:text-muted ' +
  'transition-[border-color,box-shadow] duration-snappy ease-snappy ' +
  'focus:outline-none focus:border-transparent focus:ring-2 focus:ring-focus-ring ' +
  'disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground ' +
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive';

interface FieldFrameProps {
  label: string;
  /** Shown under the control; replaced by `error` when there is one. */
  hint?: ReactNode;
  error?: string | null;
  /** Hide the label visually (still read by screen readers), e.g. for a search box with a placeholder. */
  hideLabel?: boolean;
  className?: string;
}

function useFieldIds(id?: string) {
  const auto = useId();
  const controlId = id ?? auto;
  return { controlId, messageId: `${controlId}-message` };
}

function Frame({
  label,
  hint,
  error,
  hideLabel,
  className,
  controlId,
  messageId,
  children,
}: FieldFrameProps & { controlId: string; messageId: string; children: ReactNode }) {
  const message = error || hint;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className={cn('text-label text-foreground', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {message ? (
        <p id={messageId} className={cn('text-xs', error ? 'text-destructive-text' : 'text-muted')} role={error ? 'alert' : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = FieldFrameProps & InputHTMLAttributes<HTMLInputElement>;

/** Labelled text input with hint and error, wired for screen readers. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, hideLabel, className, id, ...props },
  ref,
) {
  const { controlId, messageId } = useFieldIds(id);
  return (
    <Frame {...{ label, hint, error, hideLabel, className, controlId, messageId }}>
      <input
        ref={ref}
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(CONTROL, 'h-control')}
        {...props}
      />
    </Frame>
  );
});

export type SelectFieldProps = FieldFrameProps & SelectHTMLAttributes<HTMLSelectElement>;

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, hideLabel, className, id, children, ...props },
  ref,
) {
  const { controlId, messageId } = useFieldIds(id);
  return (
    <Frame {...{ label, hint, error, hideLabel, className, controlId, messageId }}>
      <select
        ref={ref}
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(CONTROL, 'h-control pr-8')}
        {...props}
      >
        {children}
      </select>
    </Frame>
  );
});

export type TextAreaFieldProps = FieldFrameProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, hint, error, hideLabel, className, id, rows = 4, ...props },
  ref,
) {
  const { controlId, messageId } = useFieldIds(id);
  return (
    <Frame {...{ label, hint, error, hideLabel, className, controlId, messageId }}>
      <textarea
        ref={ref}
        id={controlId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(CONTROL, 'py-2.5')}
        {...props}
      />
    </Frame>
  );
});
