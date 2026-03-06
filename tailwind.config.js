/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00D9FF',
        secondary: '#7B61FF',
        accent: '#FF6B9D',
        'bg-primary': '#0A0E27',
        'bg-secondary': '#151932',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0AEC0',
        'text-muted': '#718096',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        heading: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}
