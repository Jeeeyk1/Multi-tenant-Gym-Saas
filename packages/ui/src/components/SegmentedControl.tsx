'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../cn';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Status filter". */
  label: string;
  className?: string;
}

/** Tabs-style switch with an indicator that glides to the selected option (bouncy spring). */
export function SegmentedControl<T extends string>({ options, value, onChange, label, className }: SegmentedControlProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options]);

  return (
    <div role="radiogroup" aria-label={label} className={cn('relative inline-flex rounded-md bg-segment-track p-1', className)}>
      {indicator ? (
        <span
          aria-hidden
          className="absolute bottom-1 top-1 rounded-sm bg-surface shadow-sm transition-[left,width] duration-bouncy ease-bouncy"
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[o.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-[1] h-8 rounded-sm px-3 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
              selected ? 'text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
