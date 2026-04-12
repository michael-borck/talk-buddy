/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        // Studio Calm neutral palette
        paper: {
          DEFAULT: '#F4F1EA',
          warm: '#FBF8F1',
        },
        ink: {
          DEFAULT: '#252420',
          soft: '#3B3830',
          muted: '#5C564C',
          quiet: '#8A8377',
        },
        // Accent resolves from CSS variables so per-app overrides
        // (html[data-app='study'] etc.) propagate into Tailwind utilities.
        accent: {
          DEFAULT: 'var(--accent)',
          deep: 'var(--accent-deep)',
          soft: 'var(--accent-soft)',
        },
        error: '#A8442F',
        // Backwards-compat remap — legacy purple/blue utility classes
        // (from pages not yet migrated) resolve to the accent/ink scales.
        purple: {
          50: 'var(--accent-soft)',
          100: 'var(--accent-soft)',
          200: 'var(--accent-soft)',
          300: 'var(--accent)',
          400: 'var(--accent)',
          500: 'var(--accent)',
          600: 'var(--accent-deep)',
          700: 'var(--accent-deep)',
          800: 'var(--accent-deep)',
          900: 'var(--accent-deep)',
        },
        blue: {
          50: '#F4F3F0',
          100: '#E3E1DC',
          200: '#B8B6AE',
          300: '#8A8377',
          400: '#5C564C',
          500: '#3B3830',
          600: '#252420',
          700: '#1B1A17',
          800: '#0F0E0B',
          900: '#000000',
        },
      },
      borderRadius: {
        'sharp': '2px',
        'soft': '6px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'reveal': 'reveal 0.6s cubic-bezier(0.2, 0, 0, 1) both',
        'reveal-delayed': 'reveal 0.6s cubic-bezier(0.2, 0, 0, 1) 0.15s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      letterSpacing: {
        'display': '-0.015em',
        'tight-display': '-0.015em',
        'wide-studio': '0.14em',
        'wider-studio': '0.22em',
      },
    },
  },
  plugins: [],
}
