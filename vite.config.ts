import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath} from "node:url";

// https://vite.dev/config/
// @ 别名:让 import '@/api/...' 解析到 src/ 下,避免冗长的相对路径
// 代理:把 /invitation-for-bid 等 5 个前缀转发到 BE 8080,绕过浏览器 CORS 限制
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: false,                       // 仅监听本机,不对局域网暴露开发服务
    port: 5173,                       // 显式指定端口(默认 5173)
    proxy: {
      '/invitation-for-bid': { target: 'http://localhost:8080', changeOrigin: true },
      '/bid-handler-info':   { target: 'http://localhost:8080', changeOrigin: true },
      '/bid-record':         { target: 'http://localhost:8080', changeOrigin: true },
      '/risk-analysis':      { target: 'http://localhost:8080', changeOrigin: true },
      '/credential-files':   { target: 'http://localhost:8080', changeOrigin: true },
      '/service-status':     { target: 'http://localhost:8080', changeOrigin: true }
    }
  }
})
