/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7f5041',
        'primary-container': '#9b6858',
        'on-primary': '#ffffff',
        surface: '#fcf9f4',
        'surface-container-low': '#f6f3ee',
        'surface-container': '#f0ede9',
        'surface-container-high': '#ebe8e3',
        'surface-container-highest': '#e5e2dd',
        'on-surface': '#1c1c19',
        'on-surface-variant': '#514440',
        secondary: '#5a6052',
        tertiary: '#36645d',
        'outline-variant': '#d6c2bd',
      },
      fontFamily: {
        serif: ['var(--font-display)', 'serif'],
        headline: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        label: ['var(--font-label)', 'sans-serif'],
      },
      animation: {
        'soft-fade-in': 'fadeIn 450ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
