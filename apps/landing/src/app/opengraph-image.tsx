import { ImageResponse } from 'next/og';

export const alt = 'FitOps · Gym management software. Keep your members. Lose the logbook.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The image renderer can't use Tailwind, so brand colors are repeated here.
const NAVY = '#0A2540';
const VOLT = '#CCFF00';
const SIGNAL = '#3B82F6';
const SKY = '#93C5FD';

// The renderer needs TTF; null falls back to the default font.
async function loadManrope(weight: 500 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Manrope:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const [medium, extraBold] = await Promise.all([loadManrope(500), loadManrope(800)]);
  const fonts = [
    ...(medium ? [{ name: 'Manrope', data: medium, weight: 500 as const }] : []),
    ...(extraBold ? [{ name: 'Manrope', data: extraBold, weight: 800 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          fontFamily: 'Manrope',
          color: '#FFFFFF',
          backgroundColor: NAVY,
          backgroundImage: `radial-gradient(circle at 85% 30%, rgba(59,130,246,0.45), transparent 55%), radial-gradient(circle at 95% 100%, rgba(204,255,0,0.18), transparent 45%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg viewBox="0 0 48 48" width="64" height="64">
            <rect x="3" y="3" width="19" height="19" rx="5" fill="#FFFFFF" />
            <circle cx="35.5" cy="12.5" r="9.5" fill={SIGNAL} />
            <rect x="3" y="26" width="19" height="19" rx="5" fill="#FFFFFF" />
            <rect x="26" y="26" width="19" height="19" rx="5" fill="#FFFFFF" />
          </svg>
          <div style={{ display: 'flex', fontSize: 48, letterSpacing: '-0.035em' }}>
            <span style={{ fontWeight: 800 }}>Fit</span>
            <span style={{ fontWeight: 500 }}>Ops</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.045em' }}>
          <span>Keep your members.</span>
          <span style={{ color: VOLT }}>Lose the logbook.</span>
        </div>

        <div style={{ display: 'flex', fontSize: 30, fontWeight: 500, color: SKY }}>Gym management software</div>
      </div>
    ),
    { ...size, fonts },
  );
}
