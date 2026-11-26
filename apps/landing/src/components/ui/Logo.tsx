import clsx from 'clsx';

type LogoSize = 'md' | 'sm';

const MARK_SIZE: Record<LogoSize, number> = { md: 30, sm: 24 };
const WORDMARK_SIZE: Record<LogoSize, string> = { md: 'text-[22px]', sm: 'text-lg' };

export function Logo({ size = 'md' }: { size?: LogoSize }) {
  const markSize = MARK_SIZE[size];

  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 48 48" width={markSize} height={markSize} aria-hidden="true">
        <rect x="3" y="3" width="19" height="19" rx="5" fill="#FFFFFF" />
        <circle cx="35.5" cy="12.5" r="9.5" fill="#3B82F6" />
        <rect x="3" y="26" width="19" height="19" rx="5" fill="#FFFFFF" />
        <rect x="26" y="26" width="19" height="19" rx="5" fill="#FFFFFF" />
      </svg>
      <span className={clsx('font-display leading-none tracking-wordmark text-white', WORDMARK_SIZE[size])}>
        <span className="font-extrabold">Fit</span>
        <span className="font-medium">Ops</span>
      </span>
    </span>
  );
}
