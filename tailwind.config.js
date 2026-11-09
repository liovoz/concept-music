/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'hig-xs': '5px',
        'hig-sm': '8px',
        'hig-md': '10px',
        'hig-lg': '14px',
        'hig-xl': '18px',
        'hig-2xl': '24px',
      },
    },
  },
  plugins: [],
}
