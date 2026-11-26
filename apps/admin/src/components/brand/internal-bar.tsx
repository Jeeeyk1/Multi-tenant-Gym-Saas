export function InternalBar() {
  const env = (process.env.CONSOLE_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development')).toUpperCase();
  return (
    <div className="h-8 flex-shrink-0 flex items-center gap-2.5 px-5 bg-amber text-navy font-mono text-xs font-semibold tracking-[0.06em]">
      <span aria-hidden className="w-2 h-2 rounded-full bg-navy" />
      INTERNAL · VERSOLUTIONS CONSOLE · {env}
    </div>
  );
}
