import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/fiber-manager/api': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/fiber-manager\/api/, '/fiber-manager/api')
      }
    }
  }
})
