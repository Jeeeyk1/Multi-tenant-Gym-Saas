import clsx from 'clsx';

type PhoneSize = 'sm' | 'lg';

const SIZE: Record<PhoneSize, string> = {
  sm: 'gap-2 rounded-[28px] border-[6px] px-2.5 pb-2.5 pt-6',
  lg: 'gap-2.5 rounded-[36px] border-[7px] px-3.5 pb-3.5 pt-[30px]',
};

export function PhoneFrame({
  size = 'lg',
  className,
  style,
  children,
}: {
  size?: PhoneSize;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col border-member-border bg-member-bg text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]',
        SIZE[size],
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
