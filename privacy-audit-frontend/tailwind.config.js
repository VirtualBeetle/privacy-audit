/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Disable preflight to avoid MUI CSS reset conflicts
  corePlugins: {
    preflight: false,
  },
  // Scope Tailwind to #root so it wins over MUI when needed
  important: '#root',
};
