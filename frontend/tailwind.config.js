/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // World Bank Primary Colors
        'wb-blue': {
          50: '#e6f0f7',
          100: '#cce1ef',
          200: '#99c3df',
          300: '#66a5cf',
          400: '#3387bf',
          500: '#0069af',  // World Bank primary blue
          600: '#00548c',
          700: '#003f69',
          800: '#002a46',
          900: '#002244',  // World Bank dark blue (header)
          950: '#001522',
        },
        // World Bank Accent Colors
        'wb-accent': {
          50: '#e6f7fc',
          100: '#cceff9',
          200: '#99dff3',
          300: '#66cfed',
          400: '#33bfe7',
          500: '#009fda',  // World Bank accent blue
          600: '#007fae',
          700: '#005f83',
          800: '#004057',
          900: '#00202c',
        },
        // Semantic Colors
        'positive': '#059669',  // emerald-600
        'negative': '#dc2626',  // red-600
        'warning': '#d97706',   // amber-600
        // Chart Colors (colorblind-safe)
        'chart': {
          1: '#0069af',  // World Bank blue
          2: '#009fda',  // Accent blue
          3: '#059669',  // Emerald
          4: '#d97706',  // Amber
          5: '#7c3aed',  // Violet
          6: '#db2777',  // Pink
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}
