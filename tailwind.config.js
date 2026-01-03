/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./demo/**/*.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Prefix to avoid conflicts with host page styles
  prefix: 'nbw-',
}
