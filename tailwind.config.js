/** Palette QELLEBLI : blanc dominant, beige clair, gris doux, accent sauge discret */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        beige: { 50: '#FBF9F5', 100: '#F5F0E8', 200: '#EAE2D4', 300: '#D9CDB8' },
        ink: '#2B2B28',
        muted: '#76736B',
        line: '#E7E2D8',
        accent: { DEFAULT: '#4A6358', dark: '#3A5046', soft: '#E3EAE5' },
        danger: { DEFAULT: '#9B4A3F', soft: '#F5E6E3' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
