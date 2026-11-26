import { cn } from '@/lib/utils';

export function VerSolutionsEndorsement({ className }: { className?: string }) {
  return <p className={cn('font-mono text-xs text-muted-foreground', className)}>a VerSolutions product</p>;
}
