import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fitops = require('@gym-saas/ui/tailwind-preset');

// Tokens, type scale and motion come from the FitOps preset (packages/ui).
const config: Config = {
  presets: [fitops],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};

export default config;
