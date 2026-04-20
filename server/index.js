import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { inferenceService } from './inferenceService.js'
import UserService from './userService.js'
import EmailService from './emailService.js'

const app = express()
const PORT = process.env.PORT || 3001

// 存儲活躍的流式請求，用於停止
const activeStreams = new Map()

// 初始化用戶服務
const userService = new UserService()
const emailService = new EmailService()

// 中間件
app.use(cors())
app.use(express.json())

// 認證中間件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: '缺少認證令牌' })
    }

    const session = userService.validateSession(token)
    if (!session) {
        return res.status(401).json({ error: '無效或過期的認證令牌' })
    }

    req.user = session
    next()
}

// 健康檢查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 獲取可用的 Provider 列表
app.get('/api/providers', authenticateToken, (req, res) => {
    try {
        const providers = inferenceService.getAvailableProviders()
        res.json({ providers })
    } catch (error) {
        console.error('Error fetching providers:', error)
        res.status(500).json({ error: '獲取 Provider 列表失敗' })
    }
})

// 獲取當前 Provider 配置
app.get('/api/providers/current', authenticateToken, (req, res) => {
    try {
        const current = inferenceService.getCurrentProvider()
        res.json({ current })
    } catch (error) {
        console.error('Error fetching current provider:', error)
        res.status(500).json({ error: '獲取當前 Provider 失敗' })
    }
})

// 更新 Provider 配置
app.post('/api/providers/update', authenticateToken, async (req, res) => {
    try {
        const { type, baseUrl, apiKey, model, temperature, maxTokens } = req.body
        
        const success = inferenceService.updateProvider({
            type,
            baseUrl,
            apiKey,
            model,
            temperature,
            maxTokens
        })

        if (success) {
            // 測試連接
            const isConnected = await inferenceService.checkConnection()
            res.json({ 
                success: true, 
                isConnected,
                message: isConnected ? 'Provider 設定已更新' : 'Provider 設定已更新，但連接失敗'
            })
        } else {
            res.status(400).json({ success: false, message: 'Provider 設定失敗' })
        }
    } catch (error) {
        console.error('Error updating provider:', error)
        res.status(500).json({ error: '更新 Provider 設定失敗' })
    }
})

// 檢查 Provider 連接
app.post('/api/providers/check', authenticateToken, async (req, res) => {
    try {
        const isConnected = await inferenceService.checkConnection()
        res.json({ isConnected })
    } catch (error) {
        console.error('Error checking connection:', error)
        res.status(500).json({ error: '檢查連接失敗' })
    }
})

// 獲取可用模型列表
app.get('/api/models', authenticateToken, async (req, res) => {
    try {
        const models = await inferenceService.getAvailableModels()
        res.json({ models })
    } catch (error) {
        console.error('Error fetching models:', error)
        res.status(500).json({ error: '獲取模型列表失敗' })
    }
})

// OpenAI 相容的模型端點
app.get('/v1/models', authenticateToken, async (req, res) => {
    try {
        const models = await inferenceService.getAvailableModels()
        
        const openaiModels = models.map(model => ({
            id: model.id,
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: inferenceService.getCurrentProvider().type
        }))

        res.json({
            object: 'list',
            data: openaiModels
        })
    } catch (error) {
        console.error('Error fetching models:', error)
        res.status(500).json({
            error: {
                message: '無法獲取模型列表',
                type: 'invalid_request_error'
            }
        })
    }
})

// 聊天端點
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { message, settings, history, conversationId } = req.body
        const userId = req.user.userId

        if (!message) {
            return res.status(400).json({ error: '消息不能為空' })
        }

        console.log('Generating response for message:', message.substring(0, 50))
        
        const response = await inferenceService.generateResponse({
            message,
            history: history || [],
            settings: settings || {}
        })

        console.log('Response generated:', response.content.substring(0, 50))
        
        res.json({ 
            response: response.content,
            usage: response.usage
        })
    } catch (error) {
        console.error('Chat error:', error)
        res.status(500).json({ 
            error: '處理請求時發生錯誤', 
            details: error.message 
        })
    }
})

// 流式聊天端點
app.post('/api/chat/stream', authenticateToken, async (req, res) => {
    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const abortController = new AbortController()

    try {
        const { message, settings, history } = req.body

        if (!message) {
            return res.status(400).json({ error: '消息不能為空' })
        }

        activeStreams.set(requestId, abortController)
        res.setHeader('X-Request-ID', requestId)

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const streamGenerator = inferenceService.generateStream({
            message,
            history: history || [],
            settings: settings || {}
        })

        for await (const chunk of streamGenerator) {
            res.write(chunk.content)
        }

        res.end()
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Stream aborted by user')
            res.end()
        } else {
            console.error('Stream processing error:', error)
            if (!res.headersSent) {
                res.status(500).json({ error: '流式處理錯誤', details: error.message })
            } else {
                res.end()
            }
        }
    } finally {
        activeStreams.delete(requestId)
    }
})

// 停止流式請求
app.post('/api/chat/stop', (req, res) => {
    try {
        const { requestId } = req.body

        if (!requestId) {
            return res.status(400).json({ error: '缺少 requestId' })
        }

        const abortController = activeStreams.get(requestId)
        if (abortController) {
            console.log(`停止流式請求：${requestId}`)
            abortController.abort()
            activeStreams.delete(requestId)
            res.json({ success: true, message: '請求已停止' })
        } else {
            res.status(404).json({ error: '請求未找到或已完成' })
        }
    } catch (error) {
        console.error('停止請求錯誤:', error)
        res.status(500).json({ error: '停止請求時發生錯誤' })
    }
})

// 用戶註冊
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, language } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email 和密碼不能為空' })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '請輸入有效的 Email 地址' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密碼至少 6 個字符' })
        }

        const user = await userService.register(email, password, language || 'zh-TW')
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const verificationUrl = `${frontendUrl}/api/auth/verify-email/${user.emailVerificationToken}?lang=${user.language}`

        let emailSent = false
        try {
            await emailService.sendVerificationEmail(email, verificationUrl, user.email.split('@')[0], user.language)
            emailSent = true
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError)
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            },
            verificationUrl: verificationUrl,
            emailSent: emailSent
        })
    } catch (error) {
        console.error('Registration error:', error)
        res.status(400).json({ error: error.message })
    }
})

// 用戶登入
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email 和密碼不能為空' })
        }

        const result = await userService.login(email, password)
        res.json(result)
    } catch (error) {
        console.error('Login error:', error)
        res.status(401).json({ error: error.message })
    }
})

// 用戶登出
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        userService.logout(token)
        res.json({ message: '登出成功' })
    } catch (error) {
        console.error('Logout error:', error)
        res.status(500).json({ error: '登出失敗' })
    }
})

// 驗證會話
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user })
})

// Email 驗證
app.get('/api/auth/verify-email/:token', (req, res) => {
    try {
        const { token } = req.params
        const { lang } = req.query
        const language = lang && ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'].includes(lang) ? lang : 'zh-TW'

        const user = userService.verifyEmail(token)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        
        res.json({ 
            success: true, 
            message: '驗證成功',
            user: { id: user.id, email: user.email }
        })
    } catch (error) {
        console.error('Email verification error:', error)
        res.status(400).json({ success: false, message: error.message })
    }
})

// 重新發送驗證 Email
app.post('/api/auth/resend-verification', async (req, res) => {
    try {
        const { email, language } = req.body

        if (!email) {
            return res.status(400).json({ error: '請提供 Email 地址' })
        }

        const user = userService.users.find(u => u.email === email)
        const userLanguage = language || (user?.settings?.language) || 'zh-TW'

        const token = userService.resendVerificationEmail(email)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const verificationUrl = `${frontendUrl}/api/auth/verify-email/${token}?lang=${userLanguage}`

        let emailSent = false
        try {
            await emailService.sendVerificationEmail(email, verificationUrl, email.split('@')[0], userLanguage)
            emailSent = true
        } catch (emailError) {
            console.error('Failed to resend verification email:', emailError)
        }

        res.json({
            message: emailSent ? '驗證郵件已重新發送' : '驗證鏈接已重新生成',
            verificationUrl: verificationUrl,
            emailSent: emailSent
        })
    } catch (error) {
        console.error('Resend verification error:', error)
        res.status(400).json({ error: error.message })
    }
})

// 獲取用戶的對話列表
app.get('/api/conversations', authenticateToken, (req, res) => {
    try {
        const conversations = userService.getUserConversations(req.user.userId)
        res.json({ conversations })
    } catch (error) {
        console.error('Get conversations error:', error)
        res.status(500).json({ error: '獲取對話列表失敗' })
    }
})

// 保存用戶的對話
app.post('/api/conversations', authenticateToken, (req, res) => {
    try {
        const { conversations } = req.body
        userService.updateUserConversations(req.user.userId, conversations)
        res.json({ message: '對話已保存' })
    } catch (error) {
        console.error('Save conversations error:', error)
        res.status(500).json({ error: '保存對話失敗' })
    }
})

// 獲取用戶設定
app.get('/api/user/settings', authenticateToken, (req, res) => {
    try {
        const settings = userService.getUserSettings(req.user.userId)
        if (!settings) {
            return res.status(404).json({ error: '用戶不存在' })
        }
        res.json({ settings })
    } catch (error) {
        console.error('Get user settings error:', error)
        res.status(500).json({ error: '獲取用戶設定失敗' })
    }
})

// 更新用戶設定
app.post('/api/user/settings', authenticateToken, (req, res) => {
    try {
        const { settings } = req.body
        const updatedSettings = userService.updateUserSettings(req.user.userId, settings)
        if (!updatedSettings) {
            return res.status(404).json({ error: '用戶不存在' })
        }
        res.json({ settings: updatedSettings })
    } catch (error) {
        console.error('Update user settings error:', error)
        res.status(500).json({ error: '更新用戶設定失敗' })
    }
})

// 管理員 API
app.get('/api/admin/users', authenticateToken, (req, res) => {
    try {
        if (!userService.isAdmin(req.user.userId)) {
            return res.status(403).json({ error: '需要管理員權限' })
        }
        const users = userService.getAllUsers()
        res.json({ users })
    } catch (error) {
        console.error('Get users error:', error)
        res.status(500).json({ error: '獲取用戶列表失敗' })
    }
})

// 全局錯誤處理
app.use((error, req, res, next) => {
    console.error('Global error:', error)
    res.status(500).json({
        error: '服務器內部錯誤',
        message: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
    })
})

// 定期清理過期的會話
setInterval(() => {
    userService.cleanupExpiredSessions()
}, 60 * 60 * 1000)

// 啟動服務器
app.listen(PORT, async () => {
    console.log(`🚀 Multi-Provider LLM Chat Server 運行在 http://localhost:${PORT}`)
    console.log(`📋 可用的 Provider:`)
    inferenceService.getAvailableProviders().forEach(p => {
        console.log(`   - ${p.name} (${p.type}) ${p.requiresApiKey ? '🔑' : '🏠'}`)
    })
    console.log(`\n🔧 當前配置:`)
    const current = inferenceService.getCurrentProvider()
    console.log(`   - Provider: ${current.type}`)
    console.log(`   - Model: ${current.model}`)
    console.log(`   - URL: ${current.baseUrl}`)
    console.log(`   - API Key: ${current.requiresApiKey ? '🔑 已設定' : '🔓 不需要'}`)

    console.log(`\n📝 API 端點:`)
    console.log(`   - GET  /api/health           - 健康檢查`)
    console.log(`   - GET  /api/providers        - 獲取 Provider 列表`)
    console.log(`   - GET  /api/providers/current - 獲取當前 Provider`)
    console.log(`   - POST /api/providers/update - 更新 Provider`)
    console.log(`   - POST /api/providers/check  - 檢查連接`)
    console.log(`   - GET  /api/models           - 獲取模型列表`)
    console.log(`   - POST /api/chat             - 聊天`)
    console.log(`   - POST /api/chat/stream      - 流式聊天`)
    console.log(`   - POST /api/chat/stop        - 停止流式請求`)

    // 測試連接
    await inferenceService.checkConnection()
})

export default app
