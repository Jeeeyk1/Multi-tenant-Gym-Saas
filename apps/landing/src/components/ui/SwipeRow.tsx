import clsx from 'clsx';

// Focusable so keyboard users can scroll it with the arrow keys.
export function SwipeRow({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="-mx-5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 md:mx-0 md:overflow-visible md:px-0 md:pb-0"
    >
      <ul
        className={clsx(
          'flex w-max snap-x snap-mandatory gap-7 md:w-auto md:snap-none md:flex-wrap md:justify-center',
          className,
        )}
      >
        {children}
      </ul>
    </div>
  );
}
