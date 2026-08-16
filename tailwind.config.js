/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1b1c1a',
        parchment: '#fbf9f5',
        paper: '#fdfaf5',
        panel: '#f4f4f0',
        umber: {
          DEFAULT: '#4e342e',
          dark: '#361f1a',
        },
        slate: {
          DEFAULT: '#535f72',
        },
        dove: '#8d99ae',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        heritage: '0 10px 30px -10px rgba(78, 52, 46, 0.08)',
      },
    },
  },
  plugins: [],
};
