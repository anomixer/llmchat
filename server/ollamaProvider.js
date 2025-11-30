import axios from 'axios'

export class OllamaProvider {
    constructor(baseUrl = 'http://localhost:11434', apiKey = '') {
        this.baseUrl = baseUrl
        this.apiKey = apiKey

        const headers = {
            'Content-Type': 'application/json'
        }

        // 如果提供了API Key，添加到請求頭
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
        }

        this.client = axios.create({
            baseURL: baseUrl,
            timeout: 30000, // 30秒超時
            headers
        })
    }

    // 檢查 Ollama 連接
    async checkConnection() {
        try {
            const response = await this.client.get('/api/version')
            console.log('Ollama 版本:', response.data.version)
            return true
        } catch (error) {
            console.error('Ollama 連接失敗:', error.message)
            return false
        }
    }

    // 獲取可用模型列表
    async getAvailableModels() {
        try {
            console.log('正在從 Ollama 獲取模型列表...')
            const response = await this.client.get('/api/tags')
            console.log('Ollama 響應:', response.data)

            const models = response.data.models.map(model => ({
                name: model.name,
                size: model.size,
                modifiedAt: model.modified_at
            }))

            console.log('成功獲取模型列表:', models)
            return models
        } catch (error) {
            console.error('獲取模型列表失敗:', error.message)
            console.error('錯誤詳情:', error)

            // 如果是連接錯誤，拋出錯誤而不是返回備用列表
            if (error.code === 'ECONNREFUSED' || error.response?.status === 0) {
                throw new Error('Ollama 服務未運行，請啟動 Ollama 服務')
            }

            // 如果是其他錯誤，也拋出錯誤
            throw new Error(`獲取模型列表失敗: ${error.message}`)
        }
    }

    // 生成回應
    async generateResponse({ message, history = [], settings = {} }) {
        // 根據語言選擇系統提示
        const getSystemPrompt = (language) => {
            const prompts = {
                'zh-TW': '你是一個有用的AI助手，請簡潔地用繁體中文回答用戶的問題。',
                'zh-CN': '你是一个有用的AI助手，请简洁地用简体中文回答用户的问题。',
                'en': 'You are a helpful AI assistant. Please answer user questions concisely in English.',
                'ja': 'あなたは役立つAIアシスタントです。ユーザーの質問に簡潔に日本語で答えてください。',
                'ko': '당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 간결하게 한국어로 답변해 주세요.'
            }
            return prompts[language] || prompts['zh-TW'] // 預設為繁體中文
        }

        const {
            model = 'llama2',
            temperature = 0.7,
            maxTokens = 2048,
            systemPrompt = getSystemPrompt(settings.language)
        } = settings

        try {
            console.log('OllamaProvider.generateResponse called with:', { message: message.substring(0, 50), model, temperature })

            // 構建完整的對話歷史
            const messages = []

            // 添加系統提示
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                })
            }

            // 添加歷史對話
            history.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                })
            })

            // 添加當前用戶消息
            messages.push({
                role: 'user',
                content: message
            })

            // 準備請求數據
            const requestData = {
                model: model,
                messages: messages,
                stream: false,
                options: {
                    temperature: parseFloat(temperature),
                    num_predict: parseInt(maxTokens),
                    num_ctx: parseInt(maxTokens),
                    top_p: parseFloat(settings?.topP || 0.9),
                    top_k: parseInt(settings?.topK || 40),
                    repeat_penalty: 1.1
                }
            }

            console.log('發送請求到 Ollama:', JSON.stringify(requestData, null, 2))

            const response = await this.client.post('/api/chat', requestData)
            console.log('Ollama response:', response.data)

            if (response.data && response.data.message) {
                return response.data.message.content
            } else {
                throw new Error('無效的回應格式: ' + JSON.stringify(response.data))
            }

        } catch (error) {
            console.error('Ollama 生成回應失敗:', error.message)

            if (error.code === 'ECONNREFUSED') {
                throw new Error('無法連接到 Ollama 服務，請確保 Ollama 正在運行 (http://localhost:11434)')
            }

            if (error.response?.status === 404) {
                throw new Error(`模型 '${model}' 未找到，請確保模型已下載`)
            }

            if (error.response?.status === 400) {
                throw new Error(`請求參數錯誤: ${error.response.data?.error || error.message}`)
            }

            throw new Error(`Ollama 錯誤: ${error.message}`)
        }
    }

    // 流式生成回應
    async *generateResponseStream({ message, history = [], settings = {}, abortSignal }) {
        // 根據語言選擇系統提示
        const getSystemPrompt = (language) => {
            const prompts = {
                'zh-TW': '你是一個有用的AI助手，請簡潔地用繁體中文回答用戶的問題。',
                'zh-CN': '你是一个有用的AI助手，请简洁地用简体中文回答用户的问题。',
                'en': 'You are a helpful AI assistant. Please answer user questions concisely in English.',
                'ja': 'あなたは役立つAIアシスタントです。ユーザーの質問に簡潔に日本語で答えてください。',
                'ko': '당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 간결하게 한국어로 답변해 주세요.'
            }
            return prompts[language] || prompts['zh-TW'] // 預設為繁體中文
        }

        const {
            model = 'llama2',
            temperature = 0.7,
            maxTokens = 2048,
            systemPrompt = getSystemPrompt(settings.language)
        } = settings

        try {
            const messages = []

            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                })
            }

            history.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                })
            })

            messages.push({
                role: 'user',
                content: message
            })

            const requestData = {
                model: model,
                messages: messages,
                stream: true,
                options: {
                    temperature: parseFloat(temperature),
                    num_predict: parseInt(maxTokens),
                    num_ctx: parseInt(maxTokens),
                    top_p: parseFloat(settings?.topP || 0.9),
                    top_k: parseInt(settings?.topK || 40),
                    repeat_penalty: 1.1
                }
            }

            console.log('Sending streaming request to Ollama:', JSON.stringify(requestData, null, 2))

            const response = await this.client.post('/api/chat', requestData, {
                responseType: 'stream',
                timeout: 60000,
                signal: abortSignal // 添加 abort signal 支持
            })

            const stream = response.data

            for await (const chunk of stream) {
                // 檢查是否已被中止
                if (abortSignal?.aborted) {
                    console.log('Stream aborted by signal')
                    throw new Error('Aborted')
                }

                const lines = chunk.toString().split('\n').filter(line => line.trim())

                for (const line of lines) {
                    // 再次檢查是否已被中止
                    if (abortSignal?.aborted) {
                        console.log('Stream aborted by signal during processing')
                        throw new Error('Aborted')
                    }

                    // 跳過空行
                    if (!line.trim()) continue

                    try {
                        const data = JSON.parse(line)
                        console.log('Stream data received:', data)

                        // Yield the entire JSON line instead of just content
                        yield line + '\n'

                        if (data.done) {
                            console.log('Stream completed')
                            return
                        }
                    } catch (e) {
                        console.error('Parse error:', e.message, 'Line:', line)

                        // 嘗試處理不完整的JSON - 如果是以"message":{"開頭但沒有結尾，可能是被截斷
                        if (line.includes('"message":{') && !line.includes('}')) {
                            console.warn('Detected potentially truncated JSON line, attempting to complete it')

                            // 嘗試添加缺失的結尾
                            const completedLine = line + '}}'
                            try {
                                const data = JSON.parse(completedLine)
                                console.log('Successfully recovered truncated JSON:', data)
                                yield completedLine + '\n'

                                if (data.done) {
                                    console.log('Stream completed after recovery')
                                    return
                                }
                            } catch (recoveryError) {
                                console.error('Failed to recover truncated JSON:', recoveryError.message)
                                // 仍然忽略這個錯誤，但記錄更詳細的信息
                            }
                        } else {
                            // 對於其他類型的解析錯誤，記錄詳細信息但不丟棄數據
                            console.warn('Skipping malformed JSON line, but this may cause data loss')
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Ollama 流式生成失敗:', error.message)
            throw error
        }
    }
}