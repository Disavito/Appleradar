/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        appleDark: '#121214',
        appleCard: '#1c1c1e',
        appleBorder: '#2c2c2e'
      }
    },
  },
  plugins: [],
}
