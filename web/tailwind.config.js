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

        // Decorative only — surfaces, gradients and vector art. Never body text.
        grad: {
          1: 'rgb(var(--s-grad-1) / <alpha-value>)',
          2: 'rgb(var(--s-grad-2) / <alpha-value>)',
          3: 'rgb(var(--s-grad-3) / <alpha-value>)',
        },
        deco: {
          teal: 'rgb(var(--s-deco-teal) / <alpha-value>)',
          amber: 'rgb(var(--s-deco-amber) / <alpha-value>)',
          cyan: 'rgb(var(--s-deco-cyan) / <alpha-value>)',
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
        // Coloured lift used on hover for cards that sit over the aurora.
        glow: '0 2px 6px rgb(var(--s-grad-1) / 0.10), 0 20px 44px -20px rgb(var(--s-grad-2) / 0.45)',
        'glow-sm': '0 1px 3px rgb(var(--s-grad-1) / 0.14), 0 8px 20px -10px rgb(var(--s-grad-2) / 0.4)',
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
        // Decorative motion — every consumer is aria-hidden and every one of
        // these is neutered by the prefers-reduced-motion block in index.css.
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2.5%,-3%,0) scale(1.06)' },
        },
        'drift-slow': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1.04)' },
          '50%': { transform: 'translate3d(-3%,2.5%,0) scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        spin_slow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
        'burst-ring': {
          '0%': { transform: 'scale(0.35)', opacity: '0.9' },
          '80%,100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'burst-spark': {
          '0%': { transform: 'scale(0.2)', opacity: '0' },
          '25%': { opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        'sheen-sweep': {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(320%) skewX(-18deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'caret-blink': 'caret-blink 1.1s ease-in-out infinite',
        drift: 'drift 26s ease-in-out infinite',
        'drift-slow': 'drift-slow 34s ease-in-out infinite',
        float: 'float 11s ease-in-out infinite',
        'spin-slow': 'spin_slow 60s linear infinite',
        'pulse-soft': 'pulse-soft 4.5s ease-in-out infinite',
        'burst-ring': 'burst-ring 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'burst-spark': 'burst-spark 760ms cubic-bezier(0.22, 1, 0.36, 1) both',
        sheen: 'sheen-sweep 900ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
