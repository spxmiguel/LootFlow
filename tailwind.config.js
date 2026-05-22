/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Geist', 'system-ui', 'sans-serif'],
        body: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'base-bg': '#0d1117',
        surface: {
          DEFAULT: '#11161d',
          2: '#0d1117',
          3: '#111827',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.13)',
        },
        primary: {
          DEFAULT: 'var(--color-primary, #38bdf8)',
        },
        profit: { DEFAULT: 'var(--color-accent, #4ade80)' },
        loss:   { DEFAULT: '#f87171' },
        gold:   { DEFAULT: '#fbbf24' },
      },
      boxShadow: {
        glow:  '0 0 20px rgba(56,189,248,0.15)',
        card:  '0 4px 24px rgba(0,0,0,0.4)',
        modal: '0 24px 80px rgba(0,0,0,0.7)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity:'0', transform:'translateY(16px)' }, to: { opacity:'1', transform:'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
