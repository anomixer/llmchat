import 'dotenv/config'
import { exec } from 'child_process'
import { OllamaProvider } from './providers/ollamaProvider.js'
import UserService from './services/userService.js'
import EmailService from './services/emailService.js'
import { createApp } from './app.js'

const PORT = process.env.PORT || 3001

const userService = new UserService()
const emailService = new EmailService()

const defaultApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434'
const defaultApiKey = process.env.OLLAMA_API_KEY || ''

const ollamaProvider = new OllamaProvider(defaultApiUrl, defaultApiKey)

const app = createApp({
    userService,
    emailService,
    ollamaProvider,
    defaultApiUrl,
    defaultApiKey
})

// 定期清理過期的會話
setInterval(() => {
    userService.cleanupExpiredSessions()
}, 60 * 60 * 1000) // 每小時清理一次

app.listen(PORT, () => {
    console.log(`🚀 Local LLM Chat Server 運行在 http://localhost:${PORT}`)

    // 自動開啟瀏覽器至本機網址
    const url = `http://localhost:${PORT}`
    const startCmd = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' :
                     'xdg-open'
    exec(`${startCmd} ${url}`, { shell: process.platform === 'win32' }, (err) => {
        if (err) {
            console.warn('⚠️  無法自動開啟瀏覽器，請手動開啟:', err.message)
        } else {
            console.log('🌐 已自動開啟瀏覽器訪問本機對話網頁')
        }
    })
    console.log(`📝 API 端點:`)
    console.log(`   - GET  /api/health           - 健康檢查`)
    console.log(`   - POST /api/auth/register    - 用戶註冊`)
    console.log(`   - POST /api/auth/login       - 用戶登入`)
    console.log(`   - POST /api/auth/logout      - 用戶登出`)
    console.log(`   - GET  /api/auth/verify      - 驗證會話`)
    console.log(`   - GET  /api/conversations    - 獲取用戶對話列表`)
    console.log(`   - POST /api/conversations    - 保存用戶對話`)
    console.log(`   - GET  /api/user/settings    - 獲取用戶個人設定`)
    console.log(`   - POST /api/user/settings    - 更新用戶個人設定`)
    console.log(`   - GET  /v1/models            - 獲取模型列表 (OpenAI 格式)`)
    console.log(`   - GET  /api/models           - 獲取模型列表 (舊格式)`)
    console.log(`   - POST /api/chat             - 聊天`)
    console.log(`   - GET  /api/history          - 聊天歷史`)
    console.log(`🔧 配置:`)
    console.log(`   - Ollama API URL: ${defaultApiUrl}`)
    console.log(`   - API Key: ${defaultApiKey ? '已設定' : '未設定'}`)
    console.log(`   - VITE_ALLOWED_HOSTS: ${process.env.VITE_ALLOWED_HOSTS || '未設定'}`)
    console.log(`   - FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)

    // 測試 Ollama 連接
    ollamaProvider.checkConnection()
        .then((connected: boolean) => {
            if (connected) {
                console.log('✅ Ollama 連接正常')
            } else {
                console.warn('⚠️  Ollama 連接失敗，請確保 Ollama 正在運行')
            }
        })
        .catch((error: any) => {
            console.warn('⚠️  檢查 Ollama 連接時發生錯誤:', error.message)
        })

    // 測試 SMTP 連接
    emailService.testConnection()
        .then((connected: boolean) => {
            if (connected) {
                console.log('✅ SMTP 連接正常')
            } else {
                console.warn('⚠️  SMTP 未設定或連接失敗，將取消用戶註冊功能')
            }
        })
        .catch((error: any) => {
            console.warn('⚠️  檢查 SMTP 連接時發生錯誤:', error.message)
        })
})

export default app
