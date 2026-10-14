import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
      // Vietmap tiles/style proxy — same-origin để tránh CORS, cache được
      '/vietmap': {
        target: 'https://maps.vietmap.vn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vietmap/, ''),
      },
    },
  },
})
