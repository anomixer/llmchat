import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 透過 loadEnv 正確載入 .env 中的 VITE_ 變數（在 vite.config.js 裡使用 process.env.* 可能拿不到）
    const env = loadEnv(mode, process.cwd())
    const allowedFromEnv = env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
        : []

    const allowedHosts = [
        'localhost',
        '127.0.0.1',
        ...allowedFromEnv
    ]



    return {
        plugins: [react()],
        server: {
            // 若你想要能從局域網/自訂 domain 存取 dev server，請啟用 host: true
            // 等同於 host: '0.0.0.0'
            host: true,
            port: 3000,
            open: true,
            // 允許的主機列表：預設值 + 環境變數
            allowedHosts,
            // 禁用 HMR WebSocket 以避免連接錯誤
            hmr: false,
            proxy: {
                // 代理 API 請求到後端服務器
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    secure: false,
                    logLevel: 'debug'
                }
            }
        },
        build: {
            outDir: 'dist',
            sourcemap: true
        },
        preview: {
            host: true,
            port: 3000,
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    secure: false
                }
            }
        },
        resolve: {
            alias: {
                '@': '/src',
                '@/components': '/src/components',
                '@/utils': '/src/utils'
            }
        }
    }
})
