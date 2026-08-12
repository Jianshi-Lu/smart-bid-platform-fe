import { defineConfig } from 'vite'
import type { Connect, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath} from "node:url";

const healthHandler: Connect.NextHandleFunction = (request, response, next) => {
  const pathname = request.url?.split('?', 1)[0]
  if (pathname !== '/health') {
    next()
    return
  }

  response.statusCode = 200
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify({ status: 'ok' }))
}

function healthEndpointPlugin(): Plugin {
  return {
    name: 'frontend-health-endpoint',
    configureServer(server) {
      server.middlewares.use(healthHandler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(healthHandler)
    }
  }
}

// https://vite.dev/config/
// @ 别名:让 import '@/api/...' 解析到 src/ 下,避免冗长的相对路径
// 代理:把业务 API 前缀转发到 BE 8080,绕过浏览器 CORS 限制
export default defineConfig({
  plugins: [vue(), healthEndpointPlugin()],
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
      '/bidder':             { target: 'http://localhost:8080', changeOrigin: true },
      '/bid-inviter':          { target: 'http://localhost:8080', changeOrigin: true },
      '/bid-record':         { target: 'http://localhost:8080', changeOrigin: true },
      '/risk-analysis':      { target: 'http://localhost:8080', changeOrigin: true },
      '/credential-files':   { target: 'http://localhost:8080', changeOrigin: true },
      '/knowledge-files':    { target: 'http://localhost:8080', changeOrigin: true },
      '/chat-agent':         { target: 'http://localhost:8080', changeOrigin: true },
      '/service-status':     { target: 'http://localhost:8080', changeOrigin: true }
    }
  }
})
