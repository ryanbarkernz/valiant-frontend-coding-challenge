/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js}',
  ],
  theme: {
    extend: {},
    fontFamily: {
      inter: ['Inter', 'sans-serif'],
    },
    fontSize: {
      sm: '0.8rem',
      base: '1rem',
      xl: '1.25rem',
      '2xl': 'clamp(20px, 4vmin, 50px)',
    },
  },
  plugins: [],
}
