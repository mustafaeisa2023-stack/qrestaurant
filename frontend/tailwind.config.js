/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6d28d9',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
      fontFamily: {
        display: ['"Black Ops One"', 'Impact', 'sans-serif'],
        body:    ['"Rajdhani"', 'system-ui', 'sans-serif'],
        mono:    ['"Share Tech Mono"', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'scale-in':   'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'splat-in':   'splatIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        splatIn:   { '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' }, '60%': { transform: 'scale(1.08) rotate(2deg)' }, '100%': { transform: 'scale(1) rotate(0)', opacity: '1' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 8px rgba(168,85,247,0.3)' }, '50%': { boxShadow: '0 0 22px rgba(168,85,247,0.6)' } },
      },
      boxShadow: {
        'card':       '0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)',
        'card-hover': '0 6px 20px rgba(0,0,0,0.15)',
        'card-dark':  '0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-dark-hover': '0 8px 28px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.2)',
        'neon':       '0 0 16px rgba(168,85,247,0.5)',
        'modal':      '0 25px 60px rgba(0,0,0,0.35)',
        'modal-dark': '0 25px 60px rgba(0,0,0,0.75)',
      },
    },
  },
  plugins: [],
};