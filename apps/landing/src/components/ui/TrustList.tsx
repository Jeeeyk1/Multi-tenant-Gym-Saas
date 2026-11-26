import clsx from 'clsx';
import { CheckIcon } from './icons';

type TrustTone = 'navy' | 'light';

const TONE: Record<TrustTone, { text: string; icon: string }> = {
  navy: { text: 'text-ink-muted', icon: 'text-volt' },
  light: { text: 'text-ink-secondary', icon: 'text-code' },
};

export function TrustList({
  items,
  tone,
  className,
  style,
}: {
  items: string[];
  tone: TrustTone;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <ul className={clsx('flex flex-wrap gap-x-[22px] gap-y-2.5 text-sm', TONE[tone].text, className)} style={style}>
      {items.map((item) => (
        <li key={item} className="inline-flex items-center gap-1.5">
          <CheckIcon className={TONE[tone].icon} />
          {item}
        </li>
      ))}
    </ul>
  );
}
