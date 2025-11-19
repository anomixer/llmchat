import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { OllamaProvider } from './ollamaProvider.js'
import { ChatProvider } from './chatProvider.js'

const app = express()
const PORT = process.env.PORT || 3001

// 存儲活躍的流式請求，用於停止
const activeStreams = new Map()

// 中間件
app.use(cors())
app.use(express.json())

// 初始化提供者 - 支援環境變數設定
const defaultApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434'
const defaultApiKey = process.env.OLLAMA_API_KEY || ''
const ollamaProvider = new OllamaProvider(defaultApiUrl, defaultApiKey)
const chatProvider = new ChatProvider(ollamaProvider)

// 健康檢查端點
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 獲取預設配置
app.get('/api/config', (req, res) => {
    res.json({
        apiUrl: defaultApiUrl,
        apiKey: defaultApiKey ? 'configured' : ''
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

// 聊天端點 - 支持自定義 API URL 和 API Key
app.post('/api/chat', async (req, res) => {
    try {
        const { message, settings, history } = req.body

        if (!message) {
            return res.status(400).json({ error: '消息不能為空' })
        }

        // 設置預設設定
        const chatSettings = {
            model: settings?.model || 'llama2',
            temperature: settings?.temperature || 0.7,
            maxTokens: settings?.maxTokens || 2048,
            systemPrompt: settings?.systemPrompt || '你是一個有用的AI助手，請用繁體中文回答用戶的問題。',
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

// 流式聊天端點 - 支持實時串流回應
app.post('/api/chat/stream', async (req, res) => {
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

        // 設置預設設定
        const chatSettings = {
            model: settings?.model || 'llama2',
            temperature: settings?.temperature || 0.7,
            maxTokens: settings?.maxTokens || 2048,
            systemPrompt: settings?.systemPrompt || '你是一個有用的AI助手，請用繁體中文回答用戶的問題。',
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

// 啟動服務器
app.listen(PORT, () => {
    console.log(`🚀 Local LLM Chat Server 運行在 http://localhost:${PORT}`)
    console.log(`📝 API 端點:`)
    console.log(`   - GET  /api/health     - 健康檢查`)
    console.log(`   - GET  /v1/models      - 獲取模型列表 (OpenAI 格式)`)
    console.log(`   - GET  /api/models     - 獲取模型列表 (舊格式)`)
    console.log(`   - POST /api/chat       - 聊天`)
    console.log(`   - GET  /api/history    - 聊天歷史`)
    console.log(`🔧 配置:`)
    console.log(`   - Ollama API URL: ${defaultApiUrl}`)
    console.log(`   - API Key: ${defaultApiKey ? '已設定' : '未設定'}`)
    console.log(`   - VITE_ALLOWED_HOSTS: ${process.env.VITE_ALLOWED_HOSTS || '未設定'}`)

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
})

export default app