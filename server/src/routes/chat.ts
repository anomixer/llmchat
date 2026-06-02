import { Router, type Request, type Response } from 'express'
import type UserService from '../services/userService.js'
import { ProviderFactory } from '../providers/ProviderManager.js'
import { type ChatSettings } from '../providers/ollamaProvider.js'
import { ChatProvider } from '../providers/chatProvider.js'
import { getSystemPrompt, normalizeLanguage } from '../prompts.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'
import { searchWeb } from '../services/searchService.js'

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
            apiKey: payload?.settings?.apiKey,
            providerType: payload?.settings?.providerType || payload?.settings?.type
        },
        {
            name: 'user',
            apiUrl: (userSettings as any)?.apiUrl,
            apiKey: (userSettings as any)?.apiKey,
            providerType: (userSettings as any)?.type || (userSettings as any)?.providerType
        },
        {
            name: 'admin',
            apiUrl: (adminSettings as any)?.apiUrl,
            apiKey: (adminSettings as any)?.apiKey,
            providerType: (adminSettings as any)?.type || (adminSettings as any)?.providerType
        },
        {
            name: 'env',
            apiUrl: defaultApiUrl,
            apiKey: defaultApiKey,
            providerType: process.env.LLM_PROVIDER || 'ollama'
        }
    ]

    // 尋找第一個有定義 apiUrl 的層級
    let selectedApiUrl = 'http://localhost:11434'
    let selectedApiKey = ''
    let selectedProviderType = 'ollama'
    let source = 'hardcoded default'

    for (const config of configs) {
        if (config.apiUrl && config.apiUrl.trim() !== '') {
            selectedApiUrl = config.apiUrl
            selectedApiKey = config.apiKey || '' // 就算是空的也要帶，不能去抓下一個層級的 Key
            selectedProviderType = (config as any).providerType || (config as any).type || 'ollama'
            source = config.name
            break
        }
    }

    console.log(`[ChatSettings] 使用配置來源: ${source}, Type: ${selectedProviderType}, URL: ${selectedApiUrl}, Key: ${selectedApiKey ? '********' : '(empty)'}`)

    const now = new Date()
    const formatter = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long'
    })
    const dateStr = formatter.format(now)
    const baseSystemPrompt = payload?.settings?.systemPrompt || getSystemPrompt(language)
    const finalSystemPrompt = `${baseSystemPrompt}\n\n[目前系統時間]\n${dateStr}\n請務必以此系統時間為基準，回答使用者關於「今天」、「明天」、「後天」、「星期幾」或日期時間相關的提問。`

    return {
        providerType: selectedProviderType,
        model: payload?.settings?.model || (userSettings as any)?.model || 'llama2',
        temperature: parseFloat(payload?.settings?.temperature || (userSettings as any)?.temperature || 0.7),
        maxTokens: parseInt(payload?.settings?.maxTokens || (userSettings as any)?.maxTokens || 8192),
        systemPrompt: finalSystemPrompt,
        apiUrl: selectedApiUrl,
        apiKey: selectedApiKey,
        topP: parseFloat(payload?.settings?.topP || (userSettings as any)?.topP || 0.9),
        topK: parseInt(payload?.settings?.topK || (userSettings as any)?.topK || 40),
        showTokenStats: payload?.settings?.showTokenStats ?? (userSettings as any)?.showTokenStats ?? true,
        language
    } as Required<ChatSettings> & { providerType: string }
}

export function createChatRouter(deps: { userService: UserService; defaultApiUrl: string; defaultApiKey: string }) {
    const { userService, defaultApiUrl, defaultApiKey } = deps
    const router = Router()

    // 存儲活躍的流式請求，用於停止
    const activeStreams = new Map<string, AbortController>()

    // 聊天端點 - 支持自定義 API URL 和 API Key，需要認證
    router.post('/chat', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { message, history, images, webSearch } = (req as any).body

            if (!message) {
                return res.status(400).json({ error: '消息不能為空' })
            }

            let finalMessage = message
            let searchResults = ''
            if (webSearch) {
                searchResults = await searchWeb(message)
            }

            if (searchResults) {
                finalMessage = `[以下是與用戶問題相關的最新網路搜尋結果]
${searchResults}

請結合系統指令中的「目前系統時間」與以上最新網路搜尋結果來回答用戶的問題。如果搜尋結果中的日期/時間與系統時間不符（例如過期或快取的舊網頁），請務必以系統提示詞中的「目前系統時間」為基準來推算確切日期與星期。如果搜尋結果中沒有相關資訊，請使用你既有的知識回答。

[用戶問題]
${message}`
            }

            const chatSettings = buildChatSettings((req as any).body, userService, req.user!.userId, defaultApiUrl, defaultApiKey)
            const adminSettings = userService.getAdminSettings()

            const dynamicProvider = ProviderFactory.createProvider(chatSettings.providerType, {
                type: chatSettings.providerType,
                baseUrl: chatSettings.apiUrl,
                apiKey: chatSettings.apiKey,
                model: chatSettings.model,
                temperature: chatSettings.temperature,
                maxTokens: chatSettings.maxTokens,
                authMethod: adminSettings?.authMethod,
                oauthConfig: adminSettings?.oauthConfig
            })
            const dynamicChatProvider = new ChatProvider(dynamicProvider as any)

            const response = await dynamicChatProvider.generateResponse({
                message: finalMessage,
                history: history || [],
                images: images || [],
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
            const { message, history, images, webSearch } = (req as any).body

            if (!message) {
                return res.status(400).json({ error: '消息不能為空' })
            }

            let finalMessage = message
            let searchResults = ''
            if (webSearch) {
                searchResults = await searchWeb(message)
            }

            if (searchResults) {
                finalMessage = `[以下是與用戶問題相關的最新網路搜尋結果]
${searchResults}

請結合系統指令中的「目前系統時間」與以上最新網路搜尋結果來回答用戶的問題。如果搜尋結果中的日期/時間與系統時間不符（例如過期或快取的舊網頁），請務必以系統提示詞中的「目前系統時間」為基準來推算確切日期與星期。如果搜尋結果中沒有相關資訊，請使用你既有的知識回答。

[用戶問題]
${message}`
            }

            activeStreams.set(requestId, abortController)

            // 當客戶端中斷連線時（例如關閉瀏覽器、手動停止），自動終止後端生成
            req.on('close', () => {
                if (activeStreams.has(requestId)) {
                    console.log(`[ChatStream] 連結被客戶端中斷，終止後端模型生成: ${requestId}`)
                    abortController.abort()
                    activeStreams.delete(requestId)
                }
            })

            res.setHeader('X-Request-ID', requestId)
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')

            const chatSettings = buildChatSettings((req as any).body, userService, req.user!.userId, defaultApiUrl, defaultApiKey)
            const adminSettings = userService.getAdminSettings()
            const dynamicProvider = ProviderFactory.createProvider(chatSettings.providerType, {
                type: chatSettings.providerType,
                baseUrl: chatSettings.apiUrl,
                apiKey: chatSettings.apiKey,
                model: chatSettings.model,
                temperature: chatSettings.temperature,
                maxTokens: chatSettings.maxTokens,
                authMethod: adminSettings?.authMethod,
                oauthConfig: adminSettings?.oauthConfig
            }) as any

            try {
                const streamGenerator = dynamicProvider.generateResponseStream({
                    message: finalMessage,
                    history: history || [],
                    images: images || [],
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
