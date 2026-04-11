/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'Cambria', 'Times', 'serif'],
        sans: ['"Inter Tight"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        ivory: {
          DEFAULT: '#F6F1E7',
          50: '#FBF8F1',
          100: '#F6F1E7',
          200: '#EDE4D0',
          300: '#E0D2B4',
          400: '#CBBD9C',
        },
        ink: {
          DEFAULT: '#0F0F0E',
          50: '#F4F3F0',
          100: '#E3E1DC',
          200: '#B8B6AE',
          300: '#87857D',
          400: '#5A5853',
          500: '#2E2D2A',
          600: '#1A1A18',
          700: '#0F0F0E',
          800: '#080807',
          900: '#000000',
        },
        // Named semantic ink tones (used as text-ink-soft, text-ink-muted, etc.)
        'ink-soft': '#2E2D2A',
        'ink-muted': '#5A5853',
        'ink-quiet': '#87857D',
        vermilion: {
          DEFAULT: '#D94B2B',
          50: '#FBEDE8',
          100: '#F5CFC3',
          200: '#EE9A80',
          300: '#E5724F',
          400: '#D94B2B',
          500: '#B83B1E',
          600: '#902D17',
          700: '#6B1F0E',
        },
        'vermilion-deep': '#B83B1E',
        // Re-map legacy Tailwind palettes so existing utility classes
        // (text-purple-700, bg-blue-600, from-blue-500, etc.) inherit
        // the editorial theme without requiring per-page rewrites.
        purple: {
          50: '#FBEDE8',
          100: '#F5CFC3',
          200: '#EE9A80',
          300: '#E5724F',
          400: '#D94B2B',
          500: '#D94B2B',
          600: '#B83B1E',
          700: '#902D17',
          800: '#6B1F0E',
          900: '#46120A',
        },
        blue: {
          50: '#F4F3F0',
          100: '#E3E1DC',
          200: '#B8B6AE',
          300: '#87857D',
          400: '#5A5853',
          500: '#2E2D2A',
          600: '#1A1A18',
          700: '#0F0F0E',
          800: '#080807',
          900: '#000000',
        },
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
        'display': '-0.02em',
        'tight-display': '-0.035em',
      },
    },
  },
  plugins: [],
}
