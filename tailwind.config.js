/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--color-primary) / <alpha-value>)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio')
    ,require('@tailwindcss/forms')
    ,require('@tailwindcss/typography')
  ],
};
