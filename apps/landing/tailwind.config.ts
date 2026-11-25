import type { Config } from 'tailwindcss';

// FitOps tokens: design/landing/fitops-tokens.json
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A2540',
          deep: '#071A2E',
          raised: '#12304F',
          line: '#1E3A5F',
        },
        volt: '#CCFF00',
        signal: '#3B82F6',
        code: {
          DEFAULT: '#1D4ED8',
          hover: '#1E40AF',
        },
        sky: '#93C5FD',
        tint: '#DBEAFE',
        cloud: '#F5F7FA',
        line: '#E2E8F0',
        ink: {
          DEFAULT: '#0A2540',
          secondary: '#475569',
          muted: '#93A4BA',
          'on-navy': '#CBD5E1',
        },
        success: '#087A55',
        warning: { DEFAULT: '#9A3412', bg: '#FCE7DD' },
        danger: { DEFAULT: '#B42318', bg: '#FDECEA' },
        member: {
          bg: '#0E1116',
          surface: '#171B22',
          border: '#23272F',
          secondary: '#C9CDD6',
          'warning-bg': '#3A1D0E',
          'warning-border': '#FB923C',
          'warning-text': '#FDBA74',
          success: '#4ADE80',
          'success-bg': '#0F2E22',
        },
        founding: { tint: '#F4FFCC', border: '#D4F25A' },
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        wordmark: '-0.035em',
        heading: '-0.03em',
        eyebrow: '0.08em',
      },
      maxWidth: {
        page: '1200px',
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
