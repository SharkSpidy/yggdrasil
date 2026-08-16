/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        parchment: '#fbf9f5',
        linen: '#fdfaf5',
        mahogany: '#361f1a',
        'mahogany-deep': '#4e342e',
        sage: '#7a8b6f',
      },
      boxShadow: {
        heirloom: '0 10px 40px -12px rgba(54, 31, 26, 0.15)',
        drawer: '-8px 0 32px -8px rgba(54, 31, 26, 0.2)',
      },
    },
  },
  plugins: [],
}
