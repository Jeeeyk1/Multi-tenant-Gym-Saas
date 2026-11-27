import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fitops = require('@gym-saas/ui/tailwind-preset');

// Tokens, type scale and motion come from the FitOps preset (packages/ui). The navy, sky, slate and amber
// below are the provider console's own frame (dark sidebar, internal bar), so it never looks like a gym's app.
const config: Config = {
  presets: [fitops],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-heading)', 'var(--font-body)', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: { DEFAULT: '#0A2540', raised: '#12304F', line: '#1E3A5F' },
        sky: '#93C5FD',
        slate: { DEFAULT: '#93A4BA', light: '#CBD5E1' },
        amber: '#F59E0B',
      },
    },
  },
};

export default config;
