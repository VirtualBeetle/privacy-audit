import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['dataguard.local', 'api.dataguard.local', 'localhost'],
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
})
