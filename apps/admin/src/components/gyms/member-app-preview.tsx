import { normalizeHex, onAccent } from '@/lib/accent';
import { GymAvatar, memberAccent } from './gym-avatar';

export function MemberAppPreview({
  name,
  logoUrl,
  accent,
}: {
  name: string;
  logoUrl: string | null | undefined;
  accent: string | null | undefined;
}) {
  const color = memberAccent(accent);
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex gap-6 items-start">
      <div className="flex-1 space-y-3 text-sm">
        <p className="text-sm font-semibold text-foreground">Member app branding</p>
        <div className="flex justify-between items-center py-1 border-b border-border">
          <span className="text-muted-foreground">Logo</span>
          <span className="text-foreground font-medium">{logoUrl ? 'Uploaded' : 'None (initial shown)'}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-border">
          <span className="text-muted-foreground">Accent</span>
          <span className="inline-flex items-center gap-2 font-mono text-xs text-foreground">
            <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: color }} />
            {normalizeHex(accent) ? color : `${color} (default)`}
          </span>
        </div>
      </div>

      <div className="w-[150px] flex-shrink-0 rounded-[22px] border-4 border-navy bg-[#0E1116] p-3 space-y-3" aria-hidden>
        <div className="flex items-center gap-2">
          <GymAvatar name={name} logoUrl={logoUrl} accent={accent} size={24} />
          <span className="text-white text-[11px] font-semibold truncate">{name}</span>
        </div>
        <div className="rounded-lg p-2" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <p className="text-[9px] text-white/70">Streak</p>
          <p className="text-white font-heading font-extrabold text-sm">5 days</p>
        </div>
        <div className="rounded-lg py-1.5 text-center text-[10px] font-semibold" style={{ backgroundColor: color, color: onAccent(color) }}>
          Check in
        </div>
      </div>
    </div>
  );
}
