/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        'ink-3': 'var(--color-ink-3)',
        accent: 'var(--color-accent)',
        'accent-2': 'var(--color-accent-2)',
        'accent-light': 'var(--color-accent-light)',
        premium: 'var(--color-premium)',
        'premium-light': 'var(--color-premium-light)',
        coral: 'var(--color-coral)',
        'coral-light': 'var(--color-coral-light)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        full: '999px',
      },
      boxShadow: {
        sm: '0 1px 4px rgba(26,25,22,0.06)',
        DEFAULT: '0 2px 12px rgba(26,25,22,0.08)',
        lg: '0 8px 32px rgba(26,25,22,0.12)',
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeSlideUp: 'fadeSlideUp 0.4s ease',
        fadeIn: 'fadeIn 0.2s ease',
      },
    },
  },
  plugins: [],
}
