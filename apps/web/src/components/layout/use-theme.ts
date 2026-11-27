'use client';

import { useEffect, useState } from 'react';

/** Light/dark toggle. The root layout's inline script applies the saved choice before first paint. */
export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* localStorage unavailable */
    }
  }

  return { dark, toggle };
}
