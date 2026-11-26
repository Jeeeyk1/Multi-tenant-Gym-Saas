import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FitOpsMarkProps {
  size: number;
  className?: string;
}

export function FitOpsMark({ size, className }: FitOpsMarkProps) {
  return (
    <span className={cn('inline-flex', className)} style={{ width: size, height: size }}>
      <Image src="/brand/fitops-mark.svg" alt="FitOps" width={size} height={size} unoptimized className="dark:hidden" />
      <Image src="/brand/fitops-mark-reversed.svg" alt="FitOps" width={size} height={size} unoptimized className="hidden dark:block" />
    </span>
  );
}

export function FitOpsWordmark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn('font-heading tracking-[-0.02em] text-foreground', className)} style={style}>
      <span className="font-extrabold">Fit</span>
      <span className="font-medium">Ops</span>
    </span>
  );
}

export function FitOpsLockup({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: Math.round(size * 0.4) }}>
      <FitOpsMark size={size} />
      <FitOpsWordmark className="leading-none" style={{ fontSize: Math.round(size * 0.95) }} />
    </span>
  );
}
