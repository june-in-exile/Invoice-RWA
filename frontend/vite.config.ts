// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', 
    port: 3001,
    // 1. 關鍵設定：Vite 代理
    proxy: {
      // 2. 當你的 React 程式碼請求 '/api' 開頭的路徑時...
      '/api': {
        // 3. Vite 會自動幫你轉發到 'http://localhost:3000'
        target: ' https://p3000.m942.opf-testnet-rofl-25.rofl.app/',
        
        // 4. 這是必須的，它會更改請求頭中的 'Origin'
        changeOrigin: true,
        
        // 5. (可選) 如果你的後端 API 本身沒有 /api 前綴
        // 你才需要這行來重寫路徑，這個範例中不需要
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})