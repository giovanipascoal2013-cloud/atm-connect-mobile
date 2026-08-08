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
          50: '#F0F6FF',
          100: '#DCECFE',
          200: '#BBD8FC',
          300: '#8EBBF9',
          400: '#5B9BFB',
          500: '#2F7BF0',
          600: '#1C5FD1',
          700: '#184FA9',
          800: '#164289',
          900: '#14366E',
        },
        accent: {
          50: '#EAF6EE',
          100: '#D5EDDC',
          200: '#ABDCBC',
          300: '#80CA9B',
          400: '#66C687',
          500: '#4CAF6B',
          600: '#399256',
          700: '#2F7A48',
          800: '#28613C',
          900: '#225032',
        },
        money: '#4CAF6B',
        surface: '#F7F8FA',
      },
    },
  },
  plugins: [],
};
