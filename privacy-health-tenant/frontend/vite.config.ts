import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:8081'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['health.local', 'localhost'],
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
})
