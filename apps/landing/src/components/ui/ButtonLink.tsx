import clsx from 'clsx';

type ButtonVariant = 'volt' | 'primary' | 'navy' | 'outline-navy';

// Volt only on Navy; Code Blue on white and Cloud sections.
const VARIANT: Record<ButtonVariant, string> = {
  volt: 'bg-volt text-navy hover:brightness-95',
  primary: 'bg-code text-white hover:bg-code-hover',
  navy: 'bg-navy text-white hover:bg-navy-raised',
  'outline-navy': 'border-[1.5px] border-navy-line text-white hover:bg-white/5',
};

export function ButtonLink({
  href,
  variant = 'volt',
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={clsx(
        'inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-[26px] text-base font-semibold transition hover:-translate-y-0.5 active:translate-y-0',
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </a>
  );
}
