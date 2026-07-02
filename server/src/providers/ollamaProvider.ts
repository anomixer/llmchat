import axios, { type AxiosInstance } from 'axios'
import { getSystemPrompt } from '../prompts.js'

const DEBUG_STREAM = process.env.DEBUG_STREAM === '1'

export interface OllamaModel {
    name: string
    size: number
    modifiedAt: string
}

export interface OllamaChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface ChatSettings {
    model?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
    apiUrl?: string
    apiKey?: string
    topP?: number
    topK?: number
    language?: string
    showTokenStats?: boolean
}

export class OllamaProvider {
    private baseUrl: string
    private apiKey: string
    private client: AxiosInstance

    constructor(baseUrl = 'http://localhost:11434', apiKey = '') {
        // 規範化 URL：去除末尾的斜槓並確保有協議
        this.baseUrl = baseUrl.replace(/\/+$/, '')
        this.apiKey = apiKey

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        // 如果提供了API Key，添加到請求頭
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 120000, // 增加到 120 秒超時
            headers
        })
    }

    // 檢查 Ollama 連接
    async checkConnection() {
        try {
            const response = await this.client.get('/api/version')
            console.log('Ollama 版本:', response.data.version)
            return true
        } catch (error: any) {
            console.error('Ollama 連接失敗:', error.message)
            return false
        }
    }

    // 獲取可用模型列表
    async getAvailableModels(): Promise<OllamaModel[]> {
        try {
            console.log('正在從 Ollama 獲取模型列表...')
            const response = await this.client.get('/api/tags')
            console.log('Ollama 響應:', response.data)

            const models = response.data.models.map((model: any) => ({
                name: model.name,
                size: model.size,
                modifiedAt: model.modified_at
            }))

            console.log('成功獲取模型列表:', models)
            return models
        } catch (error: any) {
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
    async generateResponse({ message, history = [], settings = {} as ChatSettings }: { message: string; history?: Array<{ role: string; content: string }>; settings?: ChatSettings }) {
        const {
            model = 'llama2',
            temperature = 0.7,
            maxTokens = 2048,
            systemPrompt = getSystemPrompt(settings.language)
        } = settings

        try {
            console.log('OllamaProvider.generateResponse called with:', { message: message.substring(0, 50), model, temperature })

            // 構建完整的對話歷史
            const messages: OllamaChatMessage[] = []

            // 添加系統提示
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                })
            }

            // 添加歷史對話
            history.forEach((msg: any) => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                } as OllamaChatMessage)
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
                    temperature: parseFloat(String(temperature)),
                    num_predict: parseInt(String(maxTokens)),
                    num_ctx: parseInt(String(maxTokens)),
                    top_p: parseFloat(String(settings?.topP || 0.9)),
                    top_k: parseInt(String(settings?.topK || 40)),
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

        } catch (error: any) {
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
    async *generateResponseStream({
        message,
        history = [],
        settings = {} as ChatSettings,
        abortSignal
    }: {
        message: string
        history?: Array<{ role: string; content: string }>
        settings?: ChatSettings
        abortSignal?: AbortSignal
    }) {
        const {
            model = 'llama2',
            temperature = 0.7,
            maxTokens = 2048,
            systemPrompt = getSystemPrompt(settings.language)
        } = settings

        try {
            const messages: OllamaChatMessage[] = []

            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                })
            }

            history.forEach((msg: any) => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                } as OllamaChatMessage)
            })

            messages.push({
                role: 'user',
                content: message
            })

            const options: any = {
                temperature: parseFloat(String(temperature)),
                top_p: parseFloat(String(settings?.topP || 0.9)),
                top_k: parseInt(String(settings?.topK || 40)),
                repeat_penalty: 1.1
            }

            const parsedMaxTokens = parseInt(String(maxTokens))
            if (!isNaN(parsedMaxTokens) && parsedMaxTokens > 0) {
                options.num_ctx = parsedMaxTokens
            }

            const requestData = {
                model: model,
                messages: messages,
                stream: true,
                options: options
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
                    const abortError = new Error('Aborted')
                        ; (abortError as any).name = 'AbortError'
                    throw abortError
                }

                const lines = chunk.toString().split('\n').filter((line: string) => line.trim())

                for (const line of lines) {
                    // 再次檢查是否已被中止
                    if (abortSignal?.aborted) {
                        console.log('Stream aborted by signal during processing')
                        const abortError = new Error('Aborted')
                            ; (abortError as any).name = 'AbortError'
                        throw abortError
                    }

                    // 跳過空行
                    if (!line.trim()) continue

                    try {
                        const data = JSON.parse(line)
                        if (DEBUG_STREAM) {
                            console.log('Stream data received:', data)
                        }

                        // Yield the entire JSON line instead of just content
                        yield line + '\n'

                        if (data.done) {
                            console.log('Stream completed')
                            return
                        }
                    } catch (e: any) {
                        console.error('Parse error:', e.message, 'Line:', line)

                        // 嘗試處理不完整的JSON - 如果是以"message":{開頭但沒有結尾，可能是被截斷
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
                            } catch (recoveryError: any) {
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

        } catch (error: any) {
            console.error('Ollama 流式生成失敗:', error.message)
            throw error
        }
    }
}
