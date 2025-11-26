import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { OllamaProvider } from './ollamaProvider.js'
import { ChatProvider } from './chatProvider.js'
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
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

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

// 初始化提供者 - 支援環境變數設定
const defaultApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434'
const defaultApiKey = process.env.OLLAMA_API_KEY || ''
const ollamaProvider = new OllamaProvider(defaultApiUrl, defaultApiKey)
const chatProvider = new ChatProvider(ollamaProvider)

function getVerificationPageHTML(isSuccess, errorMessage, language, frontendUrl) {
    const pageTexts = {
        'zh-TW': {
            successTitle: 'Email 驗證成功！',
            successMessage: '您的帳號已成功啟用。現在您可以登入使用了。',
            successButton: '返回登入頁面',
            errorTitle: 'Email 驗證失敗',
            errorButton: '返回首頁'
        },
        'zh-CN': {
            successTitle: '邮箱验证成功！',
            successMessage: '您的账号已成功启用。现在您可以登录使用了。',
            successButton: '返回登录页面',
            errorTitle: '邮箱验证失败',
            errorButton: '返回首页'
        },
        'en': {
            successTitle: 'Email Verification Successful!',
            successMessage: 'Your account has been successfully activated. You can now log in.',
            successButton: 'Back to Login',
            errorTitle: 'Email Verification Failed',
            errorButton: 'Back to Home'
        },
        'ja': {
            successTitle: 'メール確認成功！',
            successMessage: 'アカウントが正常にアクティブ化されました。今すぐログインできます。',
            successButton: 'ログインページに戻る',
            errorTitle: 'メール確認失敗',
            errorButton: 'ホームに戻る'
        },
        'ko': {
            successTitle: '이메일 확인 성공！',
            successMessage: '계정이 성공적으로 활성화되었습니다. 이제 로그인할 수 있습니다.',
            successButton: '로그인 페이지로 돌아가기',
            errorTitle: '이메일 확인 실패',
            errorButton: '홈으로 돌아가기'
        }
    }

    const texts = pageTexts[language] || pageTexts['zh-TW']
    const title = isSuccess ? texts.successTitle : texts.errorTitle
    const message = isSuccess ? texts.successMessage : errorMessage
    const buttonText = isSuccess ? texts.successButton : texts.errorButton
    const iconSvg = isSuccess ? '✓' : '✕'
    const iconColor = isSuccess ? '#10b981' : '#ef4444'

    return `
        <!DOCTYPE html>
        <html lang="${language}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    border-radius: 12px;
                    padding: 2rem;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                .icon {
                    color: ${iconColor};
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    color: #1f2937;
                    margin-bottom: 1rem;
                }
                p {
                    color: #6b7280;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }
                .btn {
                    display: inline-block;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 500;
                    transition: background-color 0.2s;
                    cursor: pointer;
                }
                .btn:hover {
                    background: #2563eb;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">${iconSvg}</div>
                <h1>${title}</h1>
                <p>${message}</p>
                <a href="${frontendUrl}?lang=${language}" class="btn">${buttonText}</a>
            </div>
        </body>
        </html>
    `
}

// 驗證頁面多語言文本
const verificationPageTexts = {
    'zh-TW': {
        successTitle: 'Email 驗證成功！',
        successMessage: '您的帳號已成功啟用。現在您可以登入使用了。',
        successButton: '返回登入頁面',
        errorTitle: 'Email 驗證失敗',
        errorButton: '返回首頁'
    },
    'zh-CN': {
        successTitle: '邮箱验证成功！',
        successMessage: '您的账号已成功启用。现在您可以登录使用了。',
        successButton: '返回登录页面',
        errorTitle: '邮箱验证失败',
        errorButton: '返回首页'
    },
    'en': {
        successTitle: 'Email Verification Successful!',
        successMessage: 'Your account has been successfully activated. You can now log in.',
        successButton: 'Back to Login',
        errorTitle: 'Email Verification Failed',
        errorButton: 'Back to Home'
    },
    'ja': {
        successTitle: 'メール確認成功！',
        successMessage: 'アカウントが正常にアクティブ化されました。今すぐログインできます。',
        successButton: 'ログインページに戻る',
        errorTitle: 'メール確認失敗',
        errorButton: 'ホームに戻る'
    },
    'ko': {
        successTitle: '이메일 확인 성공！',
        successMessage: '계정이 성공적으로 활성화되었습니다. 이제 로그인할 수 있습니다。',
        successButton: '로그인 페이지로 돌아가기',
        errorTitle: '이메일 확인 실패',
        errorButton: '홈으로 돌아가기'
    }
}

// 健康檢查端點
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 用戶註冊
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, language } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email 和密碼不能為空' })
        }

        // 簡單的 email 格式驗證
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '請輸入有效的 Email 地址' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密碼至少6個字符' })
        }

        // 使用用戶選擇的語言，如果沒有則使用預設值
        const userLanguage = language || 'zh-TW'
        const user = await userService.register(email, password, userLanguage)

        // 生成驗證鏈接 - 使用前端URL，前端會代理到後端
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const verificationUrl = `${frontendUrl}/api/auth/verify-email/${user.emailVerificationToken}?lang=${userLanguage}`

        // 嘗試發送驗證郵件
        let emailSent = false
        try {
            // 使用用戶註冊時選擇的語言
            await emailService.sendVerificationEmail(email, verificationUrl, user.email.split('@')[0], userLanguage)
            emailSent = true
            console.log('Verification email sent to:', email)
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError)
            // 不阻擋註冊，但記錄錯誤
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

// 多語言錯誤消息
const verificationErrorMessages = {
    'zh-TW': {
        expired: '驗證鏈接已過期，請重新註冊帳號',
        invalid: '無效或過期的驗證鏈接'
    },
    'zh-CN': {
        expired: '验证链接已过期，请重新注册账号',
        invalid: '无效或过期的验证链接'
    },
    'en': {
        expired: 'Verification link has expired, please register again',
        invalid: 'Invalid or expired verification link'
    },
    'ja': {
        expired: '確認リンクが期限切れです。もう一度登録してください',
        invalid: '無効または期限切れの確認リンク'
    },
    'ko': {
        expired: '확인 링크가 만료되었습니다. 다시 등록하세요',
        invalid: '유효하지 않거나 만료된 확인 링크'
    }
}

// Email 驗證
app.get('/api/auth/verify-email/:token', (req, res) => {
    try {
        const { token } = req.params
        const { lang } = req.query
        const language = lang && ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'].includes(lang) ? lang : 'zh-TW'

        const user = userService.verifyEmail(token)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const html = getVerificationPageHTML(true, '', language, frontendUrl)

        res.set('Content-Type', 'text/html; charset=utf-8')
        res.send(html)

    } catch (error) {
        console.error('Email verification error:', error)

        const { lang } = req.query
        const language = lang && ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'].includes(lang) ? lang : 'zh-TW'
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        
        // 根據錯誤類型返回對應語言的消息
        let errorMessage = verificationErrorMessages[language].invalid
        if (error.message.includes('過期') || error.message.includes('过期')) {
            errorMessage = verificationErrorMessages[language].expired
        }
        
        const html = getVerificationPageHTML(false, errorMessage, language, frontendUrl)

        res.status(400)
        res.set('Content-Type', 'text/html; charset=utf-8')
        res.send(html)
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
            console.log('Resend verification email sent to:', email)
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

// 獲取預設配置
app.get('/api/config', async (req, res) => {
    const smtpEnabled = await emailService.testConnection()

    res.json({
        apiUrl: defaultApiUrl,
        apiKey: defaultApiKey ? 'configured' : '',
        smtpEnabled: smtpEnabled
    })
})

// 獲取可用模型 - OpenAI API 相容格式
app.get('/v1/models', async (req, res) => {
    try {
        const models = await ollamaProvider.getAvailableModels()

        // OpenAI API 相容的響應格式
        const openaiModels = models.map(model => ({
            id: model.name,
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'local'
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

// 獲取可用模型 - 支持自定義 API URL
app.get('/api/models', async (req, res) => {
    try {
        const apiUrl = req.query.apiUrl || 'http://localhost:11434'
        const dynamicProvider = new OllamaProvider(apiUrl)
        const models = await dynamicProvider.getAvailableModels()
        res.json({ models })
    } catch (error) {
        console.error('Error fetching models:', error)
        res.status(500).json({ error: '無法獲取模型列表' })
    }
})

// 聊天端點 - 支持自定義 API URL 和 API Key，需要認證
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { message, settings, history, conversationId } = req.body
        const userId = req.user.userId

        if (!message) {
            return res.status(400).json({ error: '消息不能為空' })
        }

        // 設置預設設定
        const chatSettings = {
            model: settings?.model || 'llama2',
            temperature: settings?.temperature || 0.7,
            maxTokens: settings?.maxTokens || 2048,
            systemPrompt: settings?.systemPrompt || getSystemPrompt(req.body.language),
            apiUrl: settings?.apiUrl || 'http://localhost:11434',
            apiKey: settings?.apiKey || ''
        }

        // 使用自定義 API URL 和 API Key 的動態提供者
        const dynamicProvider = new OllamaProvider(chatSettings.apiUrl, chatSettings.apiKey)
        const dynamicChatProvider = new ChatProvider(dynamicProvider)

        // 生成回應
        console.log('Generating response for message:', message.substring(0, 50))
        const response = await dynamicChatProvider.generateResponse({
            message,
            history: history || [],
            settings: chatSettings
        })

        console.log('Response generated:', response.substring(0, 50))
        res.json({ response })
    } catch (error) {
        console.error('Chat error:', error)
        console.error('Error stack:', error.stack)
        res.status(500).json({ error: '處理請求時發生錯誤', details: error.message })
    }
})

// 停止流式請求端點
app.post('/api/chat/stop', (req, res) => {
    try {
        const { requestId } = req.body

        if (!requestId) {
            return res.status(400).json({ error: '缺少 requestId' })
        }

        const abortController = activeStreams.get(requestId)
        if (abortController) {
            console.log(`停止流式請求: ${requestId}`)
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

// 流式聊天端點 - 支持實時串流回應，需要認證
app.post('/api/chat/stream', authenticateToken, async (req, res) => {
    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const abortController = new AbortController()

    try {
        const { message, settings, history } = req.body

        if (!message) {
            return res.status(400).json({ error: '消息不能為空' })
        }

        // 存儲 abort controller 用於後續停止
        activeStreams.set(requestId, abortController)

        // 返回 requestId 給前端
        res.setHeader('X-Request-ID', requestId)

        // 設置流式回應頭
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        // 根據語言選擇系統提示
        const getSystemPrompt = (language) => {
            const prompts = {
                'zh-TW': '你是一個有用的AI助手，請用繁體中文回答用戶的問題。',
                'zh-CN': '你是一个有用的AI助手，请用简体中文回答用户的问题。',
                'en': 'You are a helpful AI assistant. Please answer user questions in English.',
                'ja': 'あなたは役立つAIアシスタントです。ユーザーの質問に日本語で答えてください。',
                'ko': '당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 한국어로 답변해 주세요.'
            }
            return prompts[language] || prompts['zh-TW'] // 預設為繁體中文
        }

        // 設置預設設定
        const chatSettings = {
            model: settings?.model || 'llama2',
            temperature: settings?.temperature || 0.7,
            maxTokens: settings?.maxTokens || 2048,
            systemPrompt: settings?.systemPrompt || getSystemPrompt(req.body.language),
            apiUrl: settings?.apiUrl || 'http://localhost:11434',
            apiKey: settings?.apiKey || ''
        }

        // 使用自定義 API URL 和 API Key 的動態提供者
        const dynamicProvider = new OllamaProvider(chatSettings.apiUrl, chatSettings.apiKey)

        // 使用 OllamaProvider 的流式生成方法
        try {
            const streamGenerator = dynamicProvider.generateResponseStream({
                message,
                history: history || [],
                settings: chatSettings,
                abortSignal: abortController.signal
            })

            for await (const chunk of streamGenerator) {
                console.log('Streaming chunk:', chunk)
                res.write(chunk)
            }

            console.log('Stream completed successfully')
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
        }

    } catch (error) {
        console.error('Stream chat error:', error)
        if (!res.headersSent) {
            res.status(500).json({ error: '處理請求時發生錯誤', details: error.message })
        } else {
            res.end()
        }
    } finally {
        // 清理 abort controller
        activeStreams.delete(requestId)
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

// 更改密碼
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '當前密碼和新密碼不能為空' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密碼長度至少需要6個字符' })
        }

        const result = await userService.changePassword(req.user.userId, currentPassword, newPassword)
        res.json(result)
    } catch (error) {
        console.error('Change password error:', error)
        res.status(400).json({ error: error.message })
    }
})

// 管理員 API - 獲取所有用戶
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

// 管理員 API - 更新用戶角色
app.put('/api/admin/users/:userId/role', authenticateToken, (req, res) => {
    try {
        if (!userService.isAdmin(req.user.userId)) {
            return res.status(403).json({ error: '需要管理員權限' })
        }

        const { userId } = req.params
        const { role } = req.body

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: '無效的角色' })
        }

        const user = userService.updateUserRole(userId, role)
        res.json({ user: { id: user.id, email: user.email, role: user.role } })
    } catch (error) {
        console.error('Update user role error:', error)
        res.status(400).json({ error: error.message })
    }
})

// 管理員 API - 刪除用戶
app.delete('/api/admin/users/:userId', authenticateToken, (req, res) => {
    try {
        if (!userService.isAdmin(req.user.userId)) {
            return res.status(403).json({ error: '需要管理員權限' })
        }

        const { userId } = req.params
        const user = userService.deleteUser(userId)
        res.json({ message: '用戶已刪除', user: { id: user.id, email: user.email } })
    } catch (error) {
        console.error('Delete user error:', error)
        res.status(400).json({ error: error.message })
    }
})

// 管理員 API - 切換用戶啟用狀態
app.put('/api/admin/users/:userId/toggle-enable', authenticateToken, (req, res) => {
    try {
        if (!userService.isAdmin(req.user.userId)) {
            return res.status(403).json({ error: '需要管理員權限' })
        }

        const { userId } = req.params
        const user = userService.toggleUserEnable(userId)
        res.json({
            message: `用戶已${user.enable ? '啟用' : '禁用'}`,
            user: {
                id: user.id,
                email: user.email,
                enable: user.enable
            }
        })
    } catch (error) {
        console.error('Toggle user enable error:', error)
        res.status(400).json({ error: error.message })
    }
})

// 聊天歷史端點（可選功能）
app.get('/api/history', (req, res) => {
    // 這裡可以實現從數據庫獲取聊天歷史的功能
    // 目前返回空數組，可以後續擴展
    res.json({ history: [] })
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
}, 60 * 60 * 1000) // 每小時清理一次

// 啟動服務器
app.listen(PORT, () => {
    console.log(`🚀 Local LLM Chat Server 運行在 http://localhost:${PORT}`)
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
        .then(connected => {
            if (connected) {
                console.log('✅ Ollama 連接正常')
            } else {
                console.warn('⚠️  Ollama 連接失敗，請確保 Ollama 正在運行')
            }
        })
        .catch(error => {
            console.warn('⚠️  檢查 Ollama 連接時發生錯誤:', error.message)
        })

    // 測試 SMTP 連接
    emailService.testConnection()
        .then(connected => {
            if (connected) {
                console.log('✅ SMTP 連接正常')
            } else {
                console.warn('⚠️  SMTP 未設定或連接失敗，將取消用戶註冊功能')
            }
        })
        .catch(error => {
            console.warn('⚠️  檢查 SMTP 連接時發生錯誤:', error.message)
        })
})

export default app