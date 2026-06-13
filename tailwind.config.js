/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aero-dark': '#0f172a',
        'aero-panel': '#1e293b',
        'aero-accent': '#38bdf8',
        'aero-accent-hover': '#0ea5e9'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
