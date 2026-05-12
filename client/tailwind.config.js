const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.resolve(__dirname, 'index.html'),
    path.resolve(__dirname, 'src/**/*.{ts,tsx,js,jsx}'),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1B4DFF',
          50: '#EEF2FF',
          100: '#DCE5FF',
          500: '#1B4DFF',
          600: '#1640D6',
          700: '#1232AA',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          subtle: '#94A3B8',
        },
        surface: {
          page: '#F8F9FA',
          card: '#FFFFFF',
          tile: '#F3F4F6',
          border: '#E5E7EB',
        },
        ok: '#16A34A',
        warn: '#F59E0B',
        bad: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
