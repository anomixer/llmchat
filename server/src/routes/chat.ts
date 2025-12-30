import { Router, type Request, type Response } from 'express'
import type UserService from '../services/userService.js'
import { OllamaProvider, type ChatSettings } from '../providers/ollamaProvider.js'
import { ChatProvider } from '../providers/chatProvider.js'
import { getSystemPrompt, normalizeLanguage } from '../prompts.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

const DEBUG_STREAM = process.env.DEBUG_STREAM === '1'

function buildChatSettings(payload: any, userService: UserService, userId: string, defaultApiUrl: string, defaultApiKey: string): Required<ChatSettings> {
    const language = normalizeLanguage(payload?.language || payload?.settings?.language)

    // 獲取各層級配置
    const userSettings = userService.getUserSettings(userId)
    const adminSettings = userService.getAdminSettings()

    // 定義配置層級 (由高到低)
    const configs = [
        {
            name: 'payload',
            apiUrl: payload?.settings?.apiUrl,
            apiKey: payload?.settings?.apiKey
        },
        {
            name: 'user',
            apiUrl: (userSettings as any)?.apiUrl,
            apiKey: (userSettings as any)?.apiKey
        },
        {
            name: 'admin',
            apiUrl: (adminSettings as any)?.apiUrl,
            apiKey: (adminSettings as any)?.apiKey
        },
        {
            name: 'env',
            apiUrl: defaultApiUrl,
            apiKey: defaultApiKey
        }
    ]

    // 尋找第一個有定義 apiUrl 的層級
    let selectedApiUrl = 'http://localhost:11434'
    let selectedApiKey = ''
    let source = 'hardcoded default'

    for (const config of configs) {
        if (config.apiUrl && config.apiUrl.trim() !== '') {
            selectedApiUrl = config.apiUrl
            selectedApiKey = config.apiKey || '' // 就算是空的也要帶，不能去抓下一個層級的 Key
            source = config.name
            break
        }
    }

    console.log(`[ChatSettings] 使用配置來源: ${source}, URL: ${selectedApiUrl}, Key: ${selectedApiKey ? '********' : '(empty)'}`)

    return {
        model: payload?.settings?.model || userSettings?.model || 'llama2',
        temperature: parseFloat(payload?.settings?.temperature || userSettings?.temperature || 0.7),
        maxTokens: parseInt(payload?.settings?.maxTokens || userSettings?.maxTokens || 8192),
        systemPrompt: payload?.settings?.systemPrompt || getSystemPrompt(language),
        apiUrl: selectedApiUrl,
        apiKey: selectedApiKey,
        topP: parseFloat(payload?.settings?.topP || userSettings?.topP || 0.9),
        topK: parseInt(payload?.settings?.topK || userSettings?.topK || 40),
        showTokenStats: payload?.settings?.showTokenStats ?? (userSettings as any)?.showTokenStats ?? true,
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
