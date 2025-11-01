// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', 
    port: 3001,
    proxy: {
      '/api': {
        target: 'https://p3000.m961.opf-testnet-rofl-25.rofl.app/',
        
        changeOrigin: true,
        
      }
    }
  }
})