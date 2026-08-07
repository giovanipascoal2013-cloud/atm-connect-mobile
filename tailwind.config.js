/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF6FE',
          100: '#D8ECFD',
          200: '#B0D7FA',
          300: '#84C0F6',
          400: '#55A7F0',
          500: '#2094F3',
          600: '#1A7ED6',
          700: '#166BB7',
          800: '#125692',
          900: '#0F4576',
        },
        accent: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        money: '#10B981',
      },
    },
  },
  plugins: [],
};
