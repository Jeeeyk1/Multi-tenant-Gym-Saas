'use client';

import { useEffect, useRef, useState } from 'react';

/** Counts up to `value` on first render (ease-out, ~0.8s). Shows the final number at once for reduced motion. */
export function AnimatedNumber({ value, durationMs = 800 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(origin + (value - origin) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <>{shown.toLocaleString('en-US')}</>;
}
