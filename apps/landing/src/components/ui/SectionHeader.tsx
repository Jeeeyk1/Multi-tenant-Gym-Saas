import clsx from 'clsx';
import { Eyebrow } from './Eyebrow';

type HeaderTone = 'light' | 'navy';

export function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  tone = 'light',
  align = 'left',
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: HeaderTone;
  align?: 'left' | 'center';
}) {
  const onNavy = tone === 'navy';

  return (
    <div className={clsx('reveal flex flex-col gap-3.5', align === 'center' && 'items-center text-center')}>
      <Eyebrow tone={onNavy ? 'volt' : 'light'}>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className={clsx(
          'max-w-[780px] font-display text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.08] tracking-[-0.035em]',
          onNavy ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={clsx('max-w-[640px] text-lg leading-relaxed', onNavy ? 'text-ink-on-navy' : 'text-ink-secondary')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
