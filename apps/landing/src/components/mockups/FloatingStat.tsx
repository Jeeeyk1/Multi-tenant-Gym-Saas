import clsx from 'clsx';

export function FloatingStat({
  icon,
  iconClassName,
  iconStyle,
  title,
  subtitle,
  className,
  style,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  iconStyle?: React.CSSProperties;
  title: string;
  subtitle: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx('glass-card absolute z-10 flex items-center gap-2.5 rounded-[14px] px-3.5 py-2.5 text-white', className)}
      style={style}
    >
      <span
        className={clsx('flex h-[30px] w-[30px] items-center justify-center rounded-[9px]', iconClassName)}
        style={iconStyle}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <b className="text-[13px]">{title}</b>
        <span className="text-[11px] text-ink-muted">{subtitle}</span>
      </span>
    </div>
  );
}
