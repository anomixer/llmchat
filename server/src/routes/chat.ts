import { Router, type Request, type Response } from 'express'
import type UserService from '../services/userService.js'
import { OllamaProvider, type ChatSettings } from '../providers/ollamaProvider.js'
import { ChatProvider } from '../providers/chatProvider.js'
import { getSystemPrompt, normalizeLanguage } from '../prompts.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

const DEBUG_STREAM = process.env.DEBUG_STREAM === '1'

function buildChatSettings(payload: any, userService: UserService, userId: string, defaultApiUrl: string, defaultApiKey: string): Required<ChatSettings> {
    const language = normalizeLanguage(payload?.language || payload?.settings?.language)

    // 獲取用戶設定
    const userSettings = userService.getUserSettings(userId)

    // 獲取 admin 設定（如果用戶不是 admin）
    let adminSettings = null
    const currentUser = userService['users'].find((u: any) => u.id === userId)
    if (currentUser && currentUser.role !== 'admin') {
        const adminUser = userService['users'].find((u: any) => u.role === 'admin')
        if (adminUser) {
            adminSettings = adminUser.settings
        }
    }

    // 優先順序：payload > 用戶設定 > admin 設定 > .env 設定 > 預設值
    const getSettingValue = (key: string, defaultValue: any) => {
        // 1. 優先使用 payload 中的值
        if (payload?.settings?.[key] !== undefined && payload?.settings?.[key] !== '') {
            return payload.settings[key]
        }
        // 2. 使用用戶設定
        if (userSettings?.[key as keyof typeof userSettings] !== undefined && (userSettings as any)[key] !== '') {
            return (userSettings as any)[key]
        }
        // 3. 使用 admin 設定（如果用戶不是 admin）
        if (adminSettings?.[key as keyof typeof adminSettings] !== undefined && (adminSettings as any)[key] !== '') {
            return (adminSettings as any)[key]
        }
        // 4. 使用 .env 設定
        if (key === 'apiUrl' && defaultApiUrl) {
            return defaultApiUrl
        }
        if (key === 'apiKey' && defaultApiKey) {
            return defaultApiKey
        }
        // 5. 使用預設值
        return defaultValue
    }

    return {
        model: payload?.settings?.model || 'llama2',
        temperature: payload?.settings?.temperature ?? 0.7,
        maxTokens: payload?.settings?.maxTokens ?? 2048,
        systemPrompt: payload?.settings?.systemPrompt || getSystemPrompt(language),
        apiUrl: getSettingValue('apiUrl', 'http://localhost:11434'),
        apiKey: getSettingValue('apiKey', ''),
        topP: payload?.settings?.topP ?? 0.9,
        topK: payload?.settings?.topK ?? 40,
        language
    }
}

export function createChatRouter(deps: { userService: UserService; defaultApiUrl: string; defaultApiKey: string }) {
    const { userService, defaultApiUrl, defaultApiKey } = deps
    const router = Router()

    // 存儲活躍的流式請求，用於停止
    const activeStreams = new Map<string, AbortController>()

    // 聊天端點 - 支持自定義 API URL 和 API Key，需要認證
    router.post('/chat', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { message, history } = (req as any).body

            if (!message) {
                return res.status(400).json({ error: '消息不能為空' })
            }

            const chatSettings = buildChatSettings((req as any).body, userService, req.user!.userId, defaultApiUrl, defaultApiKey)

            const dynamicProvider = new OllamaProvider(chatSettings.apiUrl, chatSettings.apiKey)
            const dynamicChatProvider = new ChatProvider(dynamicProvider)

            const response = await dynamicChatProvider.generateResponse({
                message,
                history: history || [],
                settings: chatSettings
            })

            res.json({ response })
        } catch (error: any) {
            console.error('Chat error:', error)
            console.error('Error stack:', error.stack)
            res.status(500).json({ error: '處理請求時發生錯誤', details: error.message })
        }
    })

    // 停止流式請求端點
    router.post('/chat/stop', (req: Request, res: Response) => {
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
    router.post('/chat/stream', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
        const abortController = new AbortController()

        try {
            const { message, history } = (req as any).body

            if (!message) {
                return res.status(400).json({ error: '消息不能為空' })
            }

            activeStreams.set(requestId, abortController)

            res.setHeader('X-Request-ID', requestId)
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')

            const chatSettings = buildChatSettings((req as any).body, userService, req.user!.userId, defaultApiUrl, defaultApiKey)
            const dynamicProvider = new OllamaProvider(chatSettings.apiUrl, chatSettings.apiKey)

            try {
                const streamGenerator = dynamicProvider.generateResponseStream({
                    message,
                    history: history || [],
                    settings: chatSettings,
                    abortSignal: abortController.signal
                })

                for await (const chunk of streamGenerator) {
                    if (DEBUG_STREAM) {
                        console.log('Streaming chunk:', chunk)
                    }
                    res.write(chunk)
                }

                res.end()
            } catch (error: any) {
                if (error?.name === 'AbortError') {
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

        } catch (error: any) {
            console.error('Stream chat error:', error)
            if (!res.headersSent) {
                res.status(500).json({ error: '處理請求時發生錯誤', details: error.message })
            } else {
                res.end()
            }
        } finally {
            activeStreams.delete(requestId)
        }
    })

    return router
}
