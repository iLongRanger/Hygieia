/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B2545',
          dark: '#081A31',
        },
        gold: '#C9A227',
        emerald: {
          DEFAULT: '#0FA36B',
          dark: '#0C8A5B',
        },
      },
    },
  },
  plugins: [],
};
