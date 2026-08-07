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
          50: '#F0F6FE',
          100: '#DCEDFC',
          200: '#B8D9F8',
          300: '#8ABFF3',
          400: '#4E9DEB',
          500: '#1573D6',
          600: '#1163C0',
          700: '#1151A0',
          800: '#0F4482',
          900: '#0D376A',
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
        surface: '#F7F8FA',
      },
    },
  },
  plugins: [],
};
