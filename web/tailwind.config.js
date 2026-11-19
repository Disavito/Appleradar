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
        graphite: {
          base: '#18181b',
          surface: '#202024',
          elevated: '#27272c',
        }
      }
    },
  },
  plugins: [],
}
