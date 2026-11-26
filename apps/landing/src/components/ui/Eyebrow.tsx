import clsx from 'clsx';

type EyebrowTone = 'light' | 'volt';

const TONE: Record<EyebrowTone, string> = {
  light: 'text-code',
  volt: 'text-volt',
};

export function Eyebrow({ tone = 'light', children }: { tone?: EyebrowTone; children: React.ReactNode }) {
  return (
    <p className={clsx('font-mono text-[13px] uppercase tracking-eyebrow', TONE[tone])}>{children}</p>
  );
}
