/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', 'dark-theme'],
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--color-primary) / <alpha-value>)',
        secondary: 'hsl(var(--color-secondary) / <alpha-value>)',
        neutral: {
          50: 'hsl(var(--color-neutral-50) / <alpha-value>)',
          100: 'hsl(var(--color-neutral-100) / <alpha-value>)',
          200: 'hsl(var(--color-neutral-200) / <alpha-value>)',
          300: 'hsl(var(--color-neutral-300) / <alpha-value>)',
          400: 'hsl(var(--color-neutral-400) / <alpha-value>)',
          500: 'hsl(var(--color-neutral-500) / <alpha-value>)',
          600: 'hsl(var(--color-neutral-600) / <alpha-value>)',
          700: 'hsl(var(--color-neutral-700) / <alpha-value>)',
          800: 'hsl(var(--color-neutral-800) / <alpha-value>)',
          900: 'hsl(var(--color-neutral-900) / <alpha-value>)',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio')
    ,require('@tailwindcss/forms')
    ,require('@tailwindcss/typography')
  ],
};
