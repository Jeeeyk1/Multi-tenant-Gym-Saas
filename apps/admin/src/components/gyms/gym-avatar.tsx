import { DEFAULT_ACCENT, normalizeHex, onAccent } from '@/lib/accent';

export function memberAccent(accent: string | null | undefined): string {
  return normalizeHex(accent) ?? DEFAULT_ACCENT;
}

export function GymAvatar({
  name,
  logoUrl,
  accent,
  size = 34,
}: {
  name: string;
  logoUrl: string | null | undefined;
  accent: string | null | undefined;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.26) };
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" style={box} className="flex-shrink-0 object-contain border border-border bg-surface" />;
  }
  const color = memberAccent(accent);
  return (
    <span
      style={{ ...box, backgroundColor: color, color: onAccent(color), fontSize: Math.round(size * 0.41) }}
      className="flex-shrink-0 inline-flex items-center justify-center font-heading font-extrabold"
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

export type Tone = 'green' | 'blue' | 'orange' | 'grey';

const TONE: Record<Tone, string> = {
  green: 'bg-[#E3F4EC] text-[#087A55]',
  blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
  orange: 'bg-[#FCE7DD] text-[#9A3412]',
  grey: 'bg-background text-muted-foreground',
};

export function StatusTag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2.5 py-[3px] rounded-full text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  );
}
