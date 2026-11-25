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
