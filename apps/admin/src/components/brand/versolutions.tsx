// Placeholder until the real VerSolutions logo file arrives.
export function VerSolutionsLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="w-7 h-7 rounded-lg border-[1.5px] border-dashed border-slate text-slate text-[8px] inline-flex items-center justify-center">
        LOGO
      </span>
      <span className="font-heading text-[19px] font-extrabold tracking-[-0.03em]">VerSolutions</span>
    </span>
  );
}

export function FitOpsMarkReversed({ size = 26 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/fitops-mark-reversed.svg" alt="" width={size} height={size} aria-hidden="true" />;
}

export function FitOpsWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-heading tracking-[-0.035em] ${className}`}>
      <span className="font-extrabold">Fit</span>
      <span className="font-medium">Ops</span>
    </span>
  );
}
