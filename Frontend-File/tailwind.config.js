/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',     // Hitam Premium
          light: '#F9FAFB',    // Background Abu sangat muda
          primary: '#78081C',  // Emerald Red / Ruby
          secondary: '#BE123C', // Merah gelap untuk hover
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}