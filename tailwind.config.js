/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green:  { 50:'#EAF3DE', 100:'#C0DD97', 400:'#639922', 600:'#3B6D11', 800:'#27500A' },
        amber:  { 50:'#FAEEDA', 100:'#FAC775', 400:'#BA7517', 600:'#854F0B' },
        coral:  { 50:'#FAECE7', 100:'#F5C4B3', 400:'#993C1D', 600:'#712B13' },
        teal:   { 50:'#E1F5EE', 100:'#9FE1CB', 400:'#0F6E56', 600:'#085041' },
      },
    },
  },
  plugins: [],
}