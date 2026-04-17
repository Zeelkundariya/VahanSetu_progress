import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true, secure: false },
      '/login': { target: 'http://127.0.0.1:5000', changeOrigin: true, secure: false },
      '/signup': { target: 'http://127.0.0.1:5000', changeOrigin: true, secure: false },
      '/logout': { target: 'http://127.0.0.1:5000', changeOrigin: true, secure: false },
    }
  }
})
