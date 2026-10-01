/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#faf8f5',
          100: '#f4ede4',
          200: '#e9dac9',
          300: '#dac2a6',
          400: '#c8a47f',
          500: '#ba8c60',
          600: '#ac7851',
          700: '#8f5f41',
          800: '#744e39',
          900: '#5f4131',
        },
      },
    },
  },
  plugins: [],
}
