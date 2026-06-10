/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#ffffff', // Primary acts as pure white highlight
          600: '#fafafa',
          700: '#f4f4f5',
          800: '#71717a',
          900: '#27272a',
        },
        dark: {
          900: '#050505', // Deep black base
          800: '#080809', // Page background
          700: '#101012', // Card/container background
          600: '#141417', // Lighter container/input base
          500: '#1f1f24', // Dark thin borders
          400: '#2a2a32', // Highlights/accent borders
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #ffffff, #d4d4d8)',
        'gradient-dark': 'linear-gradient(135deg, #000000, #09090b)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      },
      boxShadow: {
        'glow': '0 0 0 1px rgba(255,255,255,0.05)',
        'glow-lg': '0 0 0 1px rgba(255,255,255,0.08)',
        'card': '0 2px 10px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
