import { cn } from '../cn';

/** Small loading ring in the current text colour. */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block h-4 w-4 animate-spin-fast rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}
