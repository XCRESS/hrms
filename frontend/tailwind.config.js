/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px', // Add extra small breakpoint
      },
      fontFamily: {
        'sans': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'segoe ui', 'roboto', 'helvetica', 'arial', 'sans-serif'],
        'inter': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'segoe ui', 'roboto', 'helvetica', 'arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 