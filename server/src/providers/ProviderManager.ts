import axios from 'axios'

// Provider 類型定義
export type ProviderType = 'ollama' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'nvidia' | 'mistral' | 'together'

export interface ProviderConfig {
    name: string
    type: ProviderType
    baseUrl: string
    apiKey?: string
    model: string
    temperature?: number
    maxTokens?: number
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface ProviderResponse {
    content: string
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
}

/**
 * Provider 端點資料庫
 */
const PROVIDER_ENDPOINTS: Record<ProviderType, {
    list: string
    chat: string
    headers?: (config: ProviderConfig) => Record<string, string>
}> = {
    ollama: {
        list: '/api/tags',
        chat: '/api/chat'
    },
    openai: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    anthropic: {
        list: '/v1/models',
        chat: '/v1/messages',
        headers: (config) => ({
            'x-api-key': config.apiKey || '',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        })
    },
    groq: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    deepseek: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    nvidia: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    mistral: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    together: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    }
}

/**
 * 基礎 Provider 類別
 */
export abstract class BaseProvider {
    protected config: ProviderConfig
    protected client: any

    constructor(config: ProviderConfig) {
        this.config = config
        this.client = axios.create({
            baseURL: config.baseUrl,
            timeout: 60000,
            headers: PROVIDER_ENDPOINTS[config.type].headers?.(config) || {}
        })
    }

    abstract checkConnection(): Promise<boolean>
    abstract getAvailableModels(): Promise<Array<{ name: string; size: number }>>
    abstract generateResponse(params: {
        message: string
        history: ChatMessage[]
        settings?: any
    }): Promise<ProviderResponse>
}

/**
 * Ollama Provider
 */
export class OllamaProvider extends BaseProvider {
    async checkConnection(): Promise<boolean> {
        try {
            const response = await this.client.get('/api/version')
            console.log('Ollama 版本:', response.data.version)
            return true
        } catch (error) {
            console.error('Ollama 連接失敗:', error.message)
            return false
        }
    }

    async getAvailableModels(): Promise<Array<{ name: string; size: number }>> {
        try {
            const response = await this.client.get('/api/tags')
            return response.data.models.map(model => ({
                name: model.name,
                size: model.size
            }))
        } catch (error) {
            console.error('獲取模型列表失敗:', error.message)
            return []
        }
    }

    async generateResponse(params: {
        message: string
        history: ChatMessage[]
        settings?: any
    }): Promise<ProviderResponse> {
        const { message, history, settings = {} } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 2048
        } = settings

        const messages = [
            ...history,
            { role: 'user' as const, content: message }
        ]

        const requestData = {
            model,
            messages,
            stream: false,
            options: {
                temperature: parseFloat(temperature.toString()),
                num_predict: parseInt(maxTokens.toString()),
                num_ctx: parseInt(maxTokens.toString()),
                top_p: parseFloat(settings?.topP || 0.9),
                top_k: parseInt(settings?.topK || 40)
            }
        }

        const response = await this.client.post('/api/chat', requestData)
        
        return {
            content: response.data.message?.content || '',
            usage: {
                promptTokens: response.data.eval_count || 0,
                completionTokens: response.data.eval_count || 0,
                totalTokens: (response.data.eval_count || 0) * 2
            }
        }
    }
}

/**
 * OpenAI-compatible Provider (OpenAI, Groq, DeepSeek, NVIDIA, Mistral, Together)
 */
export class OpenAIProvider extends BaseProvider {
    async checkConnection(): Promise<boolean> {
        try {
            await this.client.get('/v1/models')
            return true
        } catch (error) {
            console.error('API 連接失敗:', error.message)
            return false
        }
    }

    async getAvailableModels(): Promise<Array<{ name: string; size: number }>> {
        try {
            const response = await this.client.get('/v1/models')
            return response.data.data.map(model => ({
                name: model.id,
                size: 0
            }))
        } catch (error) {
            console.error('獲取模型列表失敗:', error.message)
            return []
        }
    }

    async generateResponse(params: {
        message: string
        history: ChatMessage[]
        settings?: any
    }): Promise<ProviderResponse> {
        const { message, history, settings = {} } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 2048
        } = settings

        const messages = [
            { role: 'system', content: 'You are a helpful AI assistant.' },
            ...history,
            { role: 'user', content: message }
        ]

        const requestData = {
            model,
            messages,
            stream: false,
            temperature: parseFloat(temperature.toString()),
            max_tokens: parseInt(maxTokens.toString())
        }

        const response = await this.client.post('/v1/chat/completions', requestData)
        
        return {
            content: response.data.choices?.[0]?.message?.content || '',
            usage: response.data.usage || {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
            }
        }
    }
}

/**
 * Anthropic Provider (Claude)
 */
export class AnthropicProvider extends BaseProvider {
    async checkConnection(): Promise<boolean> {
        try {
            await this.client.get('/v1/models')
            return true
        } catch (error) {
            console.error('Anthropic 連接失敗:', error.message)
            return false
        }
    }

    async getAvailableModels(): Promise<Array<{ name: string; size: number }>> {
        try {
            const response = await this.client.get('/v1/models')
            return response.data.data.map(model => ({
                name: model.id,
                size: 0
            }))
        } catch (error) {
            console.error('獲取模型列表失敗:', error.message)
            return []
        }
    }

    async generateResponse(params: {
        message: string
        history: ChatMessage[]
        settings?: any
    }): Promise<ProviderResponse> {
        const { message, history, settings = {} } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 4096
        } = settings

        // 轉換歷史對話格式
        const anthropicMessages = history
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }))

        const requestData = {
            model,
            messages: anthropicMessages,
            max_tokens: parseInt(maxTokens.toString()),
            temperature: parseFloat(temperature.toString()),
            system: 'You are a helpful AI assistant.'
        }

        const response = await this.client.post('/v1/messages', requestData)
        
        return {
            content: response.data.content?.[0]?.text || '',
            usage: {
                promptTokens: response.data.usage?.input_tokens || 0,
                completionTokens: response.data.usage?.output_tokens || 0,
                totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
            }
        }
    }
}

/**
 * Provider Factory
 */
export class ProviderFactory {
    static createProvider(type: ProviderType, config: ProviderConfig): BaseProvider {
        switch (type) {
            case 'ollama':
                return new OllamaProvider(config)
            case 'openai':
            case 'groq':
            case 'deepseek':
            case 'nvidia':
            case 'mistral':
            case 'together':
                return new OpenAIProvider(config)
            case 'anthropic':
                return new AnthropicProvider(config)
            default:
                throw new Error(`不支持的 Provider 類型：${type}`)
        }
    }
}

/**
 * 可用的 Provider 列表
 */
export const AVAILABLE_PROVIDERS = [
    {
        name: 'Ollama',
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        description: '本地 LLM 服務器',
        requiresApiKey: false
    },
    {
        name: 'OpenAI',
        type: 'openai',
        baseUrl: 'https://api.openai.com',
        description: 'OpenAI API',
        requiresApiKey: true
    },
    {
        name: 'Anthropic Claude',
        type: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        description: 'Claude 模型',
        requiresApiKey: true
    },
    {
        name: 'Groq',
        type: 'groq',
        baseUrl: 'https://api.groq.com/openai',
        description: '高速推理引擎',
        requiresApiKey: true
    },
    {
        name: 'DeepSeek',
        type: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        description: 'DeepSeek 模型',
        requiresApiKey: true
    },
    {
        name: 'NVIDIA NIM',
        type: 'nvidia',
        baseUrl: 'https://integrate.api.nvidia.com',
        description: 'NVIDIA 雲端服務',
        requiresApiKey: true
    },
    {
        name: 'Mistral',
        type: 'mistral',
        baseUrl: 'https://api.mistral.ai',
        description: 'Mistral 模型',
        requiresApiKey: true
    },
    {
        name: 'Together AI',
        type: 'together',
        baseUrl: 'https://api.together.xyz',
        description: 'Together AI 平台',
        requiresApiKey: true
    }
]
