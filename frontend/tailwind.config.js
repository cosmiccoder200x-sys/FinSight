/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#080A0F',
          soft: '#0C0F16',
          card: '#11141B',
          raised: '#171B24',
          line: '#1F2430',
        },
        accent: {
          DEFAULT: '#10B981',
          soft: '#34D399',
          dim: '#065F46',
          wash: '#0A2E24',
        },
        danger: '#F87171',
        warn: '#FBBF24',
        info: '#60A5FA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(255,255,255,0.02)',
        glow: '0 0 24px rgba(16,185,129,0.15)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
