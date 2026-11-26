import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          inverse: 'hsl(var(--surface-inverse))',
        },
        border: 'hsl(var(--border))',
        scrim: 'hsl(var(--scrim))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-fg))',
        },
        foreground: 'hsl(var(--text))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted))',
        },
        inverse: {
          foreground: 'hsl(var(--text-on-inverse))',
          muted: 'hsl(var(--text-secondary-on-inverse))',
          number: 'hsl(var(--number-on-inverse))',
        },
        icon: {
          muted: 'hsl(var(--icon-muted))',
        },
        hover: 'hsl(var(--hover))',
        disabled: {
          DEFAULT: 'hsl(var(--disabled))',
          foreground: 'hsl(var(--disabled-fg))',
        },
        'segment-track': 'hsl(var(--segment-track))',
        link: 'hsl(var(--link))',
        'nav-active': {
          DEFAULT: 'hsl(var(--nav-active))',
          foreground: 'hsl(var(--nav-active-fg))',
        },
        'focus-ring': 'hsl(var(--focus-ring))',
        chart: {
          primary: 'hsl(var(--chart-primary))',
          highlight: 'hsl(var(--chart-highlight))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          solid: 'hsl(var(--warning-solid))',
          bg: 'hsl(var(--warning-bg))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-fg))',
          bg: 'hsl(var(--destructive-bg))',
          text: 'hsl(var(--destructive-text))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          bg: 'hsl(var(--success-bg))',
        },
        active: {
          DEFAULT: 'hsl(var(--success))',
        },
        expired: {
          DEFAULT: 'hsl(var(--destructive))',
        },
        suspended: {
          DEFAULT: 'hsl(var(--warning))',
        },
      },
      ringColor: {
        DEFAULT: 'hsl(var(--focus-ring))',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'var(--font-body)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['48px', { lineHeight: '52px', letterSpacing: '-0.03em', fontWeight: '800' }],
        heading: ['32px', { lineHeight: '38px', letterSpacing: '-0.03em', fontWeight: '800' }],
        title: ['22px', { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '700' }],
        body: ['16px', { lineHeight: '24px' }],
        label: ['14px', { lineHeight: '20px', fontWeight: '500' }],
        eyebrow: ['12px', { lineHeight: '16px', letterSpacing: '0.16em', fontWeight: '600' }],
        sm: ['13px', { lineHeight: '1.5' }],
        xs: ['12px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        pill: '999px',
        full: '9999px',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
      },
      height: {
        control: '44px',
        'nav-item': '40px',
        tile: '48px',
      },
      minHeight: {
        control: '44px',
        'nav-item': '40px',
      },
    },
  },
  plugins: [],
};

export default config;
