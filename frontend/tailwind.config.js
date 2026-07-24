/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: {
          light: '#F8FAFC',
          dark: '#09090B',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#131318',
        },
        border: {
          light: '#E4E4E7',
          dark: '#27272A',
        },
        accent: {
          DEFAULT: '#22C55E',
          hover: '#16A34A',
          muted: '#22C55E1A',
          dark: '#4ADE80',
        },
        // Keep primary as indigo for the dashboard
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          dark: '#6366F1',
        },
        txt: {
          primary: {
            light: '#18181B',
            dark: '#FAFAFA',
          },
          secondary: {
            light: '#71717A',
            dark: '#A1A1AA',
          },
        },
        status: {
          active: '#22C55E',
          pending: '#F59E0B',
          failed: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Sora', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '18px',
        input: '18px',
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        card: '0 4px 24px -4px rgb(0 0 0 / 0.10), 0 1px 4px -1px rgb(0 0 0 / 0.08)',
        'card-dark': '0 4px 24px -4px rgb(0 0 0 / 0.4), 0 1px 4px -1px rgb(0 0 0 / 0.3)',
        'accent-glow': '0 0 0 3px rgba(34,197,94,0.18)',
        'primary-glow': '0 0 0 3px rgba(79,70,229,0.18)',
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'count-up': 'countUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
