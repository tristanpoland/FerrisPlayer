/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          'primary': {
            DEFAULT: '#E50914',
            '50': '#FFCDD2',
            '100': '#EF9A9A',
            '200': '#E57373',
            '300': '#EF5350',
            '400': '#F44336',
            '500': '#E50914',
            '600': '#D32F2F',
            '700': '#C62828',
            '800': '#B71C1C',
            '900': '#7F0000',
          },
          'background': {
            light: '#F5F5F5',
            DEFAULT: '#141414',
            dark: '#090909',
          },
          'surface': {
            light: '#FFFFFF',
            DEFAULT: '#1F1F1F',
            dark: '#141414',
          },
        },
        fontFamily: {
          sans: ['var(--font-inter)'],
        },
        height: {
          '128': '32rem',
          '144': '36rem',
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
      },
    },
    plugins: [],
  }