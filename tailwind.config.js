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
        // Studio Calm neutral palette. Surfaces resolve from channel variables
        // for the same reason ink does: a hardcoded light hex here leaves
        // near-white cards sitting on a dark page, and any themed text on top
        // of them disappears. Ivory is deliberately exempt — it is the fixed
        // light text for .glass-card-dark, which stays dark in both themes.
        paper: {
          DEFAULT: 'rgb(var(--paper-rgb) / <alpha-value>)',
          warm: 'rgb(var(--paper-warm-rgb) / <alpha-value>)',
        },
        // Fixed light text for the Ink sidebar (.glass-card-dark), which stays
        // dark in BOTH themes — so this must NOT flip with the theme tokens.
        ivory: '#F4F1EA',
        // Ink resolves from CSS channel variables so the text scale follows
        // the theme. `<alpha-value>` is what lets `border-ink/10` keep an
        // alpha modifier against a var()-based colour — a plain var cannot.
        // (The functional form `({ opacityValue }) => ({...})` does not: it
        // emits --tw-text-opacity with no colour at all.)
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted-rgb) / <alpha-value>)',
          quiet: 'rgb(var(--ink-quiet-rgb) / <alpha-value>)',
        },
        // Accent resolves from CSS variables so per-app overrides
        // (html[data-app='study'] etc.) propagate into Tailwind utilities.
        accent: {
          DEFAULT: 'var(--accent)',
          deep: 'var(--accent-deep)',
          soft: 'var(--accent-soft)',
        },
        // Status red is themed too — the dark palette lightens it for contrast.
        error: 'rgb(var(--error-rgb) / <alpha-value>)',
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
        // Legacy blue is remapped to the ink scale — but 700–900 are dark
        // surfaces paired with hardcoded text-white, so they must stay dark in
        // BOTH themes. Only the text shades flip, and they do it in CSS under
        // html[data-theme='dark'] rather than here, so a themed bg-blue-700
        // can never end up under white text.
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
