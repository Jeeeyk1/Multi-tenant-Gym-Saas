'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';

// Shown between the hero and the trial form; the right padding leaves room for the chat button.
export function MobileTrialBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const trial = document.getElementById('trial');
    if (!hero || !trial) return;

    let frame = 0;
    function update() {
      frame = 0;
      const pastHero = hero!.getBoundingClientRect().bottom < 0;
      const beforeTrial = trial!.getBoundingClientRect().top > window.innerHeight;
      setVisible(pastHero && beforeTrial);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={clsx(
        'fixed inset-x-0 bottom-0 z-40 border-t border-navy-line bg-navy/95 pt-3 pl-5 pr-[88px] backdrop-blur transition duration-200 md:hidden',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        visible ? 'translate-y-0' : 'invisible translate-y-full',
      )}
    >
      <a
        href="#trial"
        className="flex h-[52px] items-center justify-center rounded-full bg-volt text-base font-semibold text-navy"
      >
        Start free trial
      </a>
    </div>
  );
}
