/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens -> CSS variables (see src/styles/tokens.css).
        // Mirrors the mobile app's "quantum-indigo" palette so both clients
        // read as the same product.
        page: 'rgb(var(--s-page) / <alpha-value>)',
        surface: 'rgb(var(--s-surface) / <alpha-value>)',
        'surface-alt': 'rgb(var(--s-surface-alt) / <alpha-value>)',
        card: 'rgb(var(--s-card) / <alpha-value>)',
        line: 'rgb(var(--s-border) / <alpha-value>)',
        'line-strong': 'rgb(var(--s-border-strong) / <alpha-value>)',

        ink: 'rgb(var(--s-text) / <alpha-value>)',
        'ink-soft': 'rgb(var(--s-text-soft) / <alpha-value>)',
        'ink-muted': 'rgb(var(--s-text-muted) / <alpha-value>)',
        'ink-faint': 'rgb(var(--s-text-disabled) / <alpha-value>)',
        'ink-inverse': 'rgb(var(--s-text-inverse) / <alpha-value>)',

        accent: {
          DEFAULT: 'rgb(var(--s-accent) / <alpha-value>)',
          strong: 'rgb(var(--s-accent-strong) / <alpha-value>)',
          soft: 'rgb(var(--s-accent-soft) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--s-success) / <alpha-value>)',
          bg: 'rgb(var(--s-success-bg) / <alpha-value>)',
          text: 'rgb(var(--s-success-text) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--s-warning) / <alpha-value>)',
          bg: 'rgb(var(--s-warning-bg) / <alpha-value>)',
          text: 'rgb(var(--s-warning-text) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--s-danger) / <alpha-value>)',
          bg: 'rgb(var(--s-danger-bg) / <alpha-value>)',
          text: 'rgb(var(--s-danger-text) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--s-info) / <alpha-value>)',
          bg: 'rgb(var(--s-info-bg) / <alpha-value>)',
          text: 'rgb(var(--s-info-text) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--s-font-sans)'],
        mono: ['var(--s-font-mono)'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06)',
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.14)',
        lift: '0 2px 4px rgb(0 0 0 / 0.04), 0 18px 40px -18px rgb(0 0 0 / 0.28)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0.2' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'caret-blink': 'caret-blink 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
