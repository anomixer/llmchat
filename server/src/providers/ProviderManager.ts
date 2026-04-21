import axios from 'axios'

// Provider 類型定義
export type ProviderType = 
    | 'openai' 
    | 'anthropic' 
    | 'google-gemini' 
    | 'mistral' 
    | 'groq' 
    | 'xai-grok' 
    | 'nvidia' 
    | 'together' 
    | 'openrouter' 
    | 'kilo-gateway' 
    | 'synthetic' 
    | 'moonshot' 
    | 'vercel-gateway' 
    | 'cloudflare-gateway' 
    | 'ollama-cloud' 
    | 'ollama' 
    | 'vllm' 
    | 'sglang' 
    | 'lm-studio' 
    | 'custom'

// 所有支援的 Provider 完整列表（與 aipc-agent 完全一致）
export const AVAILABLE_PROVIDERS = [
    {
        name: 'OpenAI',
        type: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        description: 'GPT-4, GPT-3.5 等模型',
        requiresApiKey: true,
        modelPlaceholder: 'gpt-4.1, gpt-4o-mini'
    },
    {
        name: 'Anthropic Claude',
        type: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        description: 'Claude 系列模型',
        requiresApiKey: true,
        modelPlaceholder: 'claude-sonnet-4-20250514'
    },
    {
        name: 'Google Gemini',
        type: 'google-gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        description: 'Gemini 系列模型',
        requiresApiKey: true,
        modelPlaceholder: 'gemini-2.5-flash'
    },
    {
        name: 'Mistral',
        type: 'mistral',
        baseUrl: 'https://api.mistral.ai/v1',
        description: 'Mistral 系列模型',
        requiresApiKey: true,
        modelPlaceholder: 'mistral-large'
    },
    {
        name: 'Groq',
        type: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        description: '高速推理引擎',
        requiresApiKey: true,
        modelPlaceholder: 'llama3-70b'
    },
    {
        name: 'xAI (Grok)',
        type: 'xai-grok',
        baseUrl: 'https://api.x.ai/v1',
        description: 'xAI Grok 模型',
        requiresApiKey: true,
        modelPlaceholder: 'grok-beta'
    },
    {
        name: 'NVIDIA NIM',
        type: 'nvidia',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        description: 'NVIDIA 雲端服務',
        requiresApiKey: true,
        modelPlaceholder: 'nvidia/nemotron-4-340b-instruct'
    },
    {
        name: 'Together AI',
        type: 'together',
        baseUrl: 'https://api.together.xyz/v1',
        description: 'Together AI 平台',
        requiresApiKey: true,
        modelPlaceholder: 'meta-llama/Llama-3.1-70B'
    },
    {
        name: 'OpenRouter',
        type: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        description: 'OpenRouter 聚合平台',
        requiresApiKey: true,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Kilo Gateway',
        type: 'kilo-gateway',
        baseUrl: 'https://api.kilo.ai/api/gateway/',
        description: 'Kilo AI Gateway',
        requiresApiKey: true,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Synthetic (Anthropic-compatible)',
        type: 'synthetic',
        baseUrl: 'https://api.synthetic.new/anthropic',
        description: 'Synthetic AI (Anthropic 相容)',
        requiresApiKey: true,
        modelPlaceholder: 'claude-3-sonnet'
    },
    {
        name: 'Moonshot AI (Kimi)',
        type: 'moonshot',
        baseUrl: 'https://api.moonshot.ai/v1',
        description: '月之暗面 Kimi 模型',
        requiresApiKey: true,
        modelPlaceholder: 'moonshot-v1-8k'
    },
    {
        name: 'Vercel AI Gateway',
        type: 'vercel-gateway',
        baseUrl: 'https://gateway.ai.vercel.com/v1/',
        description: 'Vercel AI Gateway',
        requiresApiKey: true,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Cloudflare AI Gateway',
        type: 'cloudflare-gateway',
        baseUrl: 'https://gateway.ai.cloudflare.com/v1/',
        description: 'Cloudflare AI Gateway',
        requiresApiKey: true,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Ollama Cloud',
        type: 'ollama-cloud',
        baseUrl: 'https://ollama.com',
        description: 'Ollama 雲端服務',
        requiresApiKey: false,
        modelPlaceholder: 'llama3'
    },
    {
        name: 'Ollama',
        type: 'ollama',
        baseUrl: 'http://127.0.0.1:11434/v1',
        description: '本地 Ollama 服務器',
        requiresApiKey: false,
        modelPlaceholder: 'llama3'
    },
    {
        name: 'vLLM',
        type: 'vllm',
        baseUrl: 'http://127.0.0.1:8000/v1',
        description: 'vLLM 本地服務',
        requiresApiKey: false,
        modelPlaceholder: 'auto'
    },
    {
        name: 'SGLang',
        type: 'sglang',
        baseUrl: 'http://127.0.0.1:30000/v1',
        description: 'SGLang 本地服務',
        requiresApiKey: false,
        modelPlaceholder: 'auto'
    },
    {
        name: 'LM Studio',
        type: 'lm-studio',
        baseUrl: 'http://127.0.0.1:1234/v1',
        description: 'LM Studio 本地服務',
        requiresApiKey: false,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Customer Provider (自訂)',
        type: 'custom',
        baseUrl: 'http://127.0.0.1:11434/v1',
        description: '企業 Gateway 或自架服務',
        requiresApiKey: true,
        modelPlaceholder: '請填寫實際模型名稱'
    }
]

// 本地 Provider 列表（不需要 API Key）
export const LOCAL_NOAUTH_PROVIDERS = [
    'ollama',
    'ollama-cloud',
    'vllm',
    'sglang',
    'lm-studio',
    'custom'
]

export interface ProviderConfig {
    name: string
    type: ProviderType
    baseUrl: string
    apiKey?: string
    model: string
    temperature?: number
    maxTokens?: number
    visionModel?: string
    authConfig?: any
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
    'google-gemini': {
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
    groq: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    'xai-grok': {
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
    together: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    openrouter: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'HTTP-Referer': 'https://llmchat.example.com',
            'X-Title': 'LLMChat'
        })
    },
    'kilo-gateway': {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    synthetic: {
        list: '/v1/models',
        chat: '/v1/messages',
        headers: (config) => ({
            'x-api-key': config.apiKey || '',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        })
    },
    moonshot: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    'vercel-gateway': {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    'cloudflare-gateway': {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        })
    },
    'ollama-cloud': {
        list: '/api/tags',
        chat: '/api/chat',
        headers: (config) => ({
            'Content-Type': 'application/json'
        })
    },
    ollama: {
        list: '/api/tags',
        chat: '/api/chat',
        headers: (config) => ({
            'Content-Type': 'application/json'
        })
    },
    vllm: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Content-Type': 'application/json'
        })
    },
    sglang: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Content-Type': 'application/json'
        })
    },
    'lm-studio': {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Content-Type': 'application/json'
        })
    },
    custom: {
        list: '/v1/models',
        chat: '/v1/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
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
            baseURL: config.baseUrl.replace(/\/v1\/?$/, ''),
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
 * OpenAI-compatible Provider (OpenAI, Google Gemini, Mistral, Groq, xAI, NVIDIA, Together, OpenRouter, Kilo, Moonshot, Vercel, Cloudflare, vLLM, SGLang, LM Studio, Custom)
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
 * Anthropic-compatible Provider (Anthropic, Synthetic)
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
            case 'ollama-cloud':
                return new OllamaProvider(config)
            case 'anthropic':
            case 'synthetic':
                return new AnthropicProvider(config)
            case 'openai':
            case 'google-gemini':
            case 'mistral':
            case 'groq':
            case 'xai-grok':
            case 'nvidia':
            case 'together':
            case 'openrouter':
            case 'kilo-gateway':
            case 'moonshot':
            case 'vercel-gateway':
            case 'cloudflare-gateway':
            case 'vllm':
            case 'sglang':
            case 'lm-studio':
            case 'custom':
                return new OpenAIProvider(config)
            default:
                throw new Error(`不支持的 Provider 類型：${type}`)
        }
    }
}
