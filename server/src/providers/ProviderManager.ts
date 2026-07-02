import axios from 'axios'
import { tokenService } from '../services/tokenService.js'
import { signAwsRequest } from '../services/awsSigner.js'

// Provider 類型定義
export type ProviderType = 
    | 'openai' 
    | 'anthropic' 
    | 'google-gemini' 
    | 'mistral' 
    | 'groq' 
    | 'xai-grok'
    | 'github-copilot'
    | 'nvidia'
    | 'together' 
    | 'openrouter' 
    | 'kilo-gateway' 
    | 'synthetic' 
    | 'moonshot' 
    | 'deepseek'
    | 'vercel-gateway' 
    | 'cloudflare-gateway' 
    | 'ollama-cloud' 
    | 'ollama' 
    | 'vllm' 
    | 'sglang' 
    | 'lm-studio' 
    | 'custom'

// 所有支援的 Provider 完整列表
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
        description: 'xAI Grok 系列模型',
        requiresApiKey: true,
        modelPlaceholder: 'grok-3, grok-3-mini'
    },
    {
        name: 'GitHub Copilot',
        type: 'github-copilot',
        baseUrl: 'https://api.githubcopilot.com',
        description: 'GitHub Copilot Chat API (支援 OAuth 登入)',
        requiresApiKey: true,
        modelPlaceholder: 'gpt-4o, claude-3.5-sonnet'
    },
    {
        name: 'DeepSeek',
        type: 'deepseek',
        baseUrl: 'https://api.deepseek.com/v1',
        description: 'DeepSeek-V3, DeepSeek-R1 推理模型',
        requiresApiKey: true,
        modelPlaceholder: 'deepseek-chat, deepseek-reasoner'
    },
    {
        name: 'NVIDIA NIM',
        type: 'nvidia',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        description: 'NVIDIA 雲端 NIM 推理服務',
        requiresApiKey: true,
        modelPlaceholder: 'meta/llama-3.1-70b-instruct'
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
        description: 'OpenRouter 多模型聚合路由平台',
        requiresApiKey: true,
        modelPlaceholder: 'openai/gpt-4o, anthropic/claude-3.5-sonnet'
    },
    {
        name: 'Kilo Gateway',
        type: 'kilo-gateway',
        baseUrl: 'https://api.kilo.ai/api/gateway',
        description: 'Kilo AI Gateway 企業路由',
        requiresApiKey: true,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Synthetic (Anthropic-compatible)',
        type: 'synthetic',
        baseUrl: 'https://api.synthetic.new/anthropic',
        description: 'Synthetic AI (Anthropic 格式相容)',
        requiresApiKey: true,
        modelPlaceholder: 'claude-3-7-sonnet-20250219'
    },
    {
        name: 'Moonshot AI (Kimi)',
        type: 'moonshot',
        baseUrl: 'https://api.moonshot.ai/v1',
        description: '月之暗面 Kimi 系列模型（全球版）',
        requiresApiKey: true,
        modelPlaceholder: 'kimi-k2.6, moonshot-v1-8k'
    },
    {
        name: 'Vercel AI Gateway',
        type: 'vercel-gateway',
        baseUrl: 'https://gateway.ai.vercel.com/v1',
        description: 'Vercel AI Gateway 統一路由',
        requiresApiKey: true,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Cloudflare AI Gateway',
        type: 'cloudflare-gateway',
        baseUrl: 'https://gateway.ai.cloudflare.com/v1',
        description: 'Cloudflare AI Gateway 統一路由',
        requiresApiKey: true,
        modelPlaceholder: 'auto'
    },
    {
        name: 'Ollama Cloud',
        type: 'ollama-cloud',
        baseUrl: 'https://ollama.com',
        description: 'Ollama Cloud 官方服務（需要 API Key）',
        requiresApiKey: true,
        modelPlaceholder: 'llama3.2, qwen2.5'
    },
    {
        name: 'Ollama',
        type: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        description: '本地 Ollama 服務（支援 llama, qwen, deepseek 等）',
        requiresApiKey: false,
        modelPlaceholder: 'llama3.2, qwen2.5, deepseek-r1'
    },
    {
        name: 'vLLM',
        type: 'vllm',
        baseUrl: 'http://127.0.0.1:8000/v1',
        description: 'vLLM 高效能本地推理服務',
        requiresApiKey: false,
        modelPlaceholder: '（自動從服務獲取）'
    },
    {
        name: 'SGLang',
        type: 'sglang',
        baseUrl: 'http://127.0.0.1:30000/v1',
        description: 'SGLang 本地推理服務',
        requiresApiKey: false,
        modelPlaceholder: '（自動從服務獲取）'
    },
    {
        name: 'LM Studio',
        type: 'lm-studio',
        baseUrl: 'http://127.0.0.1:1234/v1',
        description: 'LM Studio 本地 GUI 推理服務',
        requiresApiKey: false,
        modelPlaceholder: '（自動從服務獲取）'
    },
    {
        name: 'Custom Provider (自訂)',
        type: 'custom',
        baseUrl: 'http://127.0.0.1:11434/v1',
        description: '企業 Gateway 或自架 OpenAI 相容服務',
        requiresApiKey: true,
        modelPlaceholder: '請填寫實際模型名稱'
    }
]

// 本地 / 不需要 API Key 的 Provider 列表
export const LOCAL_NOAUTH_PROVIDERS = [
    'ollama',
    'vllm',
    'sglang',
    'lm-studio'
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
    authMethod?: 'api-key' | 'google-service-account' | 'azure-entra-id' | 'aws-iam' | 'github-copilot-oauth' | 'google-oauth-user'
    oauthConfig?: {
        googleJson?: string
        azureTenantId?: string
        azureClientId?: string
        azureClientSecret?: string
        awsAccessKey?: string
        awsSecretKey?: string
        awsRegion?: string
        awsSessionToken?: string
        githubToken?: string
        googleUserRefreshToken?: string
        googleUserClientId?: string
        googleUserClientSecret?: string
    }
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
 *
 * ⚠️ 重要設計說明：
 * - list / chat 路徑是「相對於 baseUrl」的路徑，不含 /v1 前綴
 * - BaseProvider 的 axios baseURL 直接使用 config.baseUrl（只去尾部斜線）
 */
const PROVIDER_ENDPOINTS: Record<ProviderType, {
    list: string
    chat: string
    headers?: (config: ProviderConfig) => Record<string, string>
}> = {
    openai: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    anthropic: {
        list: '/models',
        chat: '/messages',
        headers: (config) => ({
            'x-api-key': config.apiKey || '',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        })
    },
    'google-gemini': {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    // Gemini OAuth：路徑與 google-gemini 相同，Authorization 由 interceptor 注入
    'gemini-oauth': {
        list: '/models',
        chat: '/chat/completions',
        headers: (_config) => ({
            'Content-Type': 'application/json'
        })
    },
    mistral: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    groq: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    'xai-grok': {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    deepseek: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    nvidia: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    together: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    openrouter: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'HTTP-Referer': 'https://llmchat.app',
            'X-Title': 'LLMChat',
            'Content-Type': 'application/json'
        })
    },
    'kilo-gateway': {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    synthetic: {
        list: '/models',
        chat: '/messages',
        headers: (config) => ({
            'x-api-key': config.apiKey || '',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        })
    },
    moonshot: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    'vercel-gateway': {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    'cloudflare-gateway': {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    ollama: {
        list: '/api/tags',
        chat: '/api/chat',
        headers: (_config) => ({
            'Content-Type': 'application/json'
        })
    },
    'ollama-cloud': {
        list: '/api/tags',
        chat: '/api/chat',
        headers: (config) => ({
            'Content-Type': 'application/json',
            ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        })
    },
    vllm: {
        list: '/models',
        chat: '/chat/completions',
        headers: (_config) => ({
            'Content-Type': 'application/json'
        })
    },
    sglang: {
        list: '/models',
        chat: '/chat/completions',
        headers: (_config) => ({
            'Content-Type': 'application/json'
        })
    },
    'lm-studio': {
        list: '/models',
        chat: '/chat/completions',
        headers: (_config) => ({
            'Content-Type': 'application/json'
        })
    },
    custom: {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json'
        })
    },
    'github-copilot': {
        list: '/models',
        chat: '/chat/completions',
        headers: (config) => ({
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json',
            'Editor-Version': 'vscode/1.96.0',
            'Editor-Plugin-Version': 'copilot-chat/0.23.0',
            'User-Agent': 'GithubCopilot/1.234.0'
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
        const normalizedBaseUrl = config.baseUrl.replace(/\/+$/, '')
        this.client = axios.create({
            baseURL: normalizedBaseUrl,
            timeout: 60000,
            headers: PROVIDER_ENDPOINTS[config.type]?.headers?.(config) || {}
        })

        // 注入 dynamic OAuth 2.0 / Cloud IAM SigV4 攔截器
        this.client.interceptors.request.use(async (axiosConfig: any) => {
            const authMethod = this.config.authMethod
            const oauthConfig = this.config.oauthConfig

            if (authMethod === 'google-service-account' && oauthConfig?.googleJson) {
                try {
                    const token = await tokenService.getGoogleAccessToken(oauthConfig.googleJson)
                    axiosConfig.headers['Authorization'] = `Bearer ${token}`
                } catch (e: any) {
                    console.error('Google OAuth interceptor error:', e.message)
                }
            } else if (authMethod === 'azure-entra-id' && oauthConfig) {
                try {
                    const token = await tokenService.getAzureAccessToken(
                        oauthConfig.azureTenantId || '',
                        oauthConfig.azureClientId || '',
                        oauthConfig.azureClientSecret || ''
                    )
                    axiosConfig.headers['Authorization'] = `Bearer ${token}`
                } catch (e: any) {
                    console.error('Azure AD OAuth interceptor error:', e.message)
                }
            } else if (authMethod === 'github-copilot-oauth' && oauthConfig?.githubToken) {
                try {
                    const token = await tokenService.getGitHubCopilotToken(oauthConfig.githubToken)
                    axiosConfig.headers['Authorization'] = `Bearer ${token}`
                    axiosConfig.headers['Editor-Version'] = 'vscode/1.96.0'
                    axiosConfig.headers['Editor-Plugin-Version'] = 'copilot-chat/0.23.0'
                    axiosConfig.headers['User-Agent'] = 'GithubCopilot/1.234.0'
                } catch (e: any) {
                    console.error('GitHub Copilot token exchange interceptor error:', e.message)
                }
            } else if (
                authMethod === 'google-oauth-user'
                && oauthConfig?.googleUserRefreshToken
            ) {
                try {
                    const token = await tokenService.getGoogleUserAccessToken(
                        oauthConfig.googleUserRefreshToken,
                        oauthConfig.googleUserClientId,
                        oauthConfig.googleUserClientSecret
                    )
                    axiosConfig.headers['Authorization'] = `Bearer ${token}`
                    if (oauthConfig.googleUserClientId) {
                        const projectNumber = oauthConfig.googleUserClientId.split('-')[0]
                        if (projectNumber) {
                            axiosConfig.headers['x-goog-user-project'] = projectNumber
                        }
                    }
                } catch (e: any) {
                    console.error('Google User OAuth interceptor error:', e.message)
                }

            } else if (authMethod === 'aws-iam' && oauthConfig) {
                try {
                    const fullUrl = (axiosConfig.baseURL || '') + (axiosConfig.url || '')
                    const body = axiosConfig.data ? (typeof axiosConfig.data === 'string' ? axiosConfig.data : JSON.stringify(axiosConfig.data)) : ''
                    const signedHeaders = signAwsRequest({
                        url: fullUrl,
                        method: axiosConfig.method || 'POST',
                        headers: axiosConfig.headers || {},
                        body,
                        credentials: {
                            accessKeyId: oauthConfig.awsAccessKey || '',
                            secretAccessKey: oauthConfig.awsSecretKey || '',
                            region: oauthConfig.awsRegion || 'us-east-1',
                            sessionToken: oauthConfig.awsSessionToken
                        }
                    })
                    for (const [key, value] of Object.entries(signedHeaders)) {
                        axiosConfig.headers[key] = value
                    }
                } catch (e: any) {
                    console.error('AWS IAM SigV4 signing interceptor error:', e.message)
                }
            }

            return axiosConfig
        }, (error: any) => {
            return Promise.reject(error)
        })

        // github-copilot：gho_ / ghp_ 前綴自動換 token
        if (config.type === 'github-copilot' && config.apiKey && (config.apiKey.startsWith('gho_') || config.apiKey.startsWith('ghp_') || config.apiKey.startsWith('github_pat_'))) {
            this.client.interceptors.request.use(async (axiosConfig: any) => {
                try {
                    const token = await tokenService.getGitHubCopilotToken(config.apiKey!)
                    axiosConfig.headers['Authorization'] = `Bearer ${token}`
                    axiosConfig.headers['Editor-Version'] = 'vscode/1.96.0'
                    axiosConfig.headers['Editor-Plugin-Version'] = 'copilot-chat/0.23.0'
                    axiosConfig.headers['User-Agent'] = 'GithubCopilot/1.234.0'
                } catch (e: any) {
                    console.error('GitHub Copilot token exchange error:', e.message)
                }
                return axiosConfig
            }, (error: any) => {
                return Promise.reject(error)
            })
        }

        // 攔截 Axios 錯誤，如果是 Stream 則讀取其內容並附加到 error.message 中，以便前端除錯
        this.client.interceptors.response.use(
            (response: any) => response,
            async (error: any) => {
                if (error.response?.data && typeof error.response.data.on === 'function') {
                    try {
                        const details = await new Promise<string>((resolve) => {
                            let data = ''
                            error.response.data.on('data', (chunk: any) => {
                                data += chunk.toString()
                            })
                            error.response.data.on('end', () => {
                                resolve(data)
                            })
                            error.response.data.on('error', () => {
                                resolve('')
                            })
                        })
                        if (details) {
                            error.message = `${error.message}. Details: ${details}`
                        }
                    } catch (e) {
                        // ignore
                    }
                } else if (error.response?.data) {
                    const details = typeof error.response.data === 'object'
                        ? JSON.stringify(error.response.data)
                        : String(error.response.data)
                    error.message = `${error.message}. Details: ${details}`
                }
                return Promise.reject(error)
            }
        )
    }

    abstract checkConnection(): Promise<boolean>
    abstract getAvailableModels(): Promise<Array<{ name: string; size: number }>>
    abstract generateResponse(params: {
        message: string
        history: ChatMessage[]
        images?: string[]
        settings?: any
    }): Promise<ProviderResponse>

    abstract generateResponseStream(params: {
        message: string
        history: ChatMessage[]
        images?: string[]
        settings?: any
        abortSignal?: AbortSignal
    }): AsyncGenerator<string, void, unknown>
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
        images?: string[]
        settings?: any
    }): Promise<ProviderResponse> {
        const { message, history, images, settings = {} } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 2048,
            systemPrompt = settings.systemPrompt || 'You are a helpful AI assistant.'
        } = settings

        const ollamaImages = images?.map(img => {
            const match = img.match(/^data:image\/[^;]+;base64,(.+)$/)
            return match ? match[1] : img
        })

        const messages = [
            ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
            ...history,
            { 
                role: 'user' as const, 
                content: message,
                ...(ollamaImages && ollamaImages.length > 0 ? { images: ollamaImages } : {})
            }
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

    async *generateResponseStream(params: {
        message: string
        history: ChatMessage[]
        images?: string[]
        settings?: any
        abortSignal?: AbortSignal
    }): AsyncGenerator<string, void, unknown> {
        const { message, history, images, settings = {}, abortSignal } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 2048,
            systemPrompt = settings.systemPrompt || 'You are a helpful AI assistant.'
        } = settings

        const ollamaImages = images?.map(img => {
            const match = img.match(/^data:image\/[^;]+;base64,(.+)$/)
            return match ? match[1] : img
        })

        const messages = [
            ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
            ...history,
            { 
                role: 'user' as const, 
                content: message,
                ...(ollamaImages && ollamaImages.length > 0 ? { images: ollamaImages } : {})
            }
        ]

        const options: any = {
            temperature: parseFloat(temperature.toString()),
            top_p: parseFloat(settings?.topP || 0.9),
            top_k: parseInt(settings?.topK || 40)
        }

        const parsedMaxTokens = parseInt(maxTokens.toString())
        if (!isNaN(parsedMaxTokens) && parsedMaxTokens > 0) {
            options.num_ctx = parsedMaxTokens
        }

        const requestData = {
            model,
            messages,
            stream: true,
            options
        }

        const response = await this.client.post('/api/chat', requestData, {
            responseType: 'stream',
            signal: abortSignal
        })

        const stream = response.data
        for await (const chunk of stream) {
            yield chunk.toString()
        }
    }
}

/**
 * OpenAI-compatible Provider
 */
export class OpenAIProvider extends BaseProvider {
    private get listPath(): string {
        return PROVIDER_ENDPOINTS[this.config.type]?.list || '/models'
    }

    private get chatPath(): string {
        return PROVIDER_ENDPOINTS[this.config.type]?.chat || '/chat/completions'
    }

    async checkConnection(): Promise<boolean> {
        try {
            await this.client.get(this.listPath)
            return true
        } catch (error) {
            console.error('API 連接失敗:', error.message)
            return false
        }
    }

    async getAvailableModels(): Promise<Array<{ name: string; size: number }>> {
        try {
            const response = await this.client.get(this.listPath)
            const rawData = response.data
            if (rawData?.data && Array.isArray(rawData.data)) {
                return rawData.data.map((model: any) => ({
                    name: model.id,
                    size: 0
                }))
            }
            if (Array.isArray(rawData)) {
                return rawData.map((model: any) => ({
                    name: model.id || model.name,
                    size: 0
                }))
            }
            return []
        } catch (error) {
            console.error('獲取模型列表失敗:', error.message)
            return []
        }
    }

    async generateResponse(params: {
        message: string
        history: ChatMessage[]
        images?: string[]
        settings?: any
    }): Promise<ProviderResponse> {
        const { message, history, images, settings = {} } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 2048,
            systemPrompt = settings.systemPrompt || 'You are a helpful AI assistant.'
        } = settings

        let userContent: any = message
        if (images && images.length > 0) {
            userContent = [
                { type: 'text', text: message },
                ...images.map(img => ({
                    type: 'image_url',
                    image_url: { url: img }
                }))
            ]
        }

        const messages = [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...history,
            { role: 'user', content: userContent }
        ]

        const requestData = {
            model,
            messages,
            stream: false,
            temperature: parseFloat(temperature.toString()),
            max_tokens: parseInt(maxTokens.toString())
        }

        const response = await this.client.post(this.chatPath, requestData)
        
        return {
            content: response.data.choices?.[0]?.message?.content || '',
            usage: response.data.usage || {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
            }
        }
    }

    async *generateResponseStream(params: {
        message: string
        history: ChatMessage[]
        images?: string[]
        settings?: any
        abortSignal?: AbortSignal
    }): AsyncGenerator<string, void, unknown> {
        const { message, history, images, settings = {}, abortSignal } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 2048,
            systemPrompt = settings.systemPrompt || 'You are a helpful AI assistant.'
        } = settings

        let userContent: any = message
        if (images && images.length > 0) {
            userContent = [
                { type: 'text', text: message },
                ...images.map(img => ({
                    type: 'image_url',
                    image_url: { url: img }
                }))
            ]
        }

        const messages = [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...history,
            { role: 'user', content: userContent }
        ]

        const requestData = {
            model,
            messages,
            stream: true,
            temperature: parseFloat(temperature.toString()),
            max_tokens: parseInt(maxTokens.toString())
        }

        const response = await this.client.post(this.chatPath, requestData, {
            responseType: 'stream',
            signal: abortSignal
        })

        const stream = response.data
        let buffer = ''
        
        for await (const chunk of stream) {
            const chunkStr = chunk.toString()
            buffer += chunkStr
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
                const trimmedLine = line.trim()
                if (!trimmedLine) continue
                if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.replace('data: ', '')
                    if (dataStr === '[DONE]') {
                        yield JSON.stringify({ done: true }) + '\n'
                        continue
                    }
                    try {
                        const data = JSON.parse(dataStr)
                        const content = data.choices?.[0]?.delta?.content || ''
                        if (content) {
                            yield JSON.stringify({ message: { content }, done: false }) + '\n'
                        }
                    } catch (e) { }
                }
            }
        }
        
        if (buffer.trim().startsWith('data: ')) {
            const dataStr = buffer.trim().replace('data: ', '')
            if (dataStr !== '[DONE]') {
                try {
                    const data = JSON.parse(dataStr)
                    const content = data.choices?.[0]?.delta?.content || ''
                    if (content) {
                        yield JSON.stringify({ message: { content }, done: false }) + '\n'
                    }
                } catch (e) { }
            }
        }
    }
}

/**
 * GitHub Copilot Provider
 */
export class GitHubCopilotProvider extends OpenAIProvider {
    async checkConnection(): Promise<boolean> {
        try {
            await this.client.post(
                PROVIDER_ENDPOINTS['github-copilot']?.chat || '/chat/completions',
                { model: 'gpt-4o', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 },
                { timeout: 10000 }
            )
            return true
        } catch (error: any) {
            if (error.response) {
                const status = error.response.status
                if (status === 400 || status === 422 || status === 200) return true
            }
            console.error('GitHub Copilot 連接失敗:', error.message)
            return false
        }
    }

    async getAvailableModels(): Promise<Array<{ name: string; size: number }>> {
        return [
            { name: 'gpt-4o', size: 0 },
            { name: 'claude-3.5-sonnet', size: 0 },
            { name: 'o1-mini', size: 0 },
            { name: 'o1-preview', size: 0 }
        ]
    }
}

/**
 * Anthropic-compatible Provider
 */
export class AnthropicProvider extends BaseProvider {
    private get listPath(): string {
        return PROVIDER_ENDPOINTS[this.config.type]?.list || '/models'
    }

    private get chatPath(): string {
        return PROVIDER_ENDPOINTS[this.config.type]?.chat || '/messages'
    }

    async checkConnection(): Promise<boolean> {
        try {
            await this.client.get(this.listPath)
            return true
        } catch (error) {
            console.error('Anthropic 連接失敗:', error.message)
            return false
        }
    }

    async getAvailableModels(): Promise<Array<{ name: string; size: number }>> {
        try {
            const response = await this.client.get(this.listPath)
            if (response.data?.data && Array.isArray(response.data.data)) {
                return response.data.data.map((model: any) => ({
                    name: model.id,
                    size: 0
                }))
            }
            return []
        } catch (error) {
            console.error('獲取模型列表失敗:', error.message)
            return []
        }
    }

    async generateResponse(params: {
        message: string
        history: ChatMessage[]
        images?: string[]
        settings?: any
    }): Promise<ProviderResponse> {
        const { message, history, images, settings = {} } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 4096,
            systemPrompt = settings.systemPrompt || 'You are a helpful AI assistant.'
        } = settings

        const anthropicMessages = history
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }))

        let userContent: any = message
        if (images && images.length > 0) {
            userContent = [
                { type: 'text', text: message },
                ...images.map(img => {
                    const match = img.match(/^data:(image\/[^;]+);base64,(.+)$/)
                    const mediaType = match ? match[1] : 'image/jpeg'
                    const base64Data = match ? match[2] : img
                    return {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: base64Data }
                    }
                })
            ]
        }
        anthropicMessages.push({ role: 'user', content: userContent })

        const requestData = {
            model,
            messages: anthropicMessages,
            max_tokens: parseInt(maxTokens.toString()),
            temperature: parseFloat(temperature.toString()),
            system: systemPrompt
        }

        const response = await this.client.post(this.chatPath, requestData)
        
        return {
            content: response.data.content?.[0]?.text || '',
            usage: {
                promptTokens: response.data.usage?.input_tokens || 0,
                completionTokens: response.data.usage?.output_tokens || 0,
                totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
            }
        }
    }

    async *generateResponseStream(params: {
        message: string
        history: ChatMessage[]
        images?: string[]
        settings?: any
        abortSignal?: AbortSignal
    }): AsyncGenerator<string, void, unknown> {
        const { message, history, images, settings = {}, abortSignal } = params
        const {
            model = this.config.model,
            temperature = this.config.temperature || 0.7,
            maxTokens = this.config.maxTokens || 4096,
            systemPrompt = settings.systemPrompt || 'You are a helpful AI assistant.'
        } = settings

        const anthropicMessages = history
            .filter((msg: any) => msg.role !== 'system')
            .map((msg: any) => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }))
            
        let userContent: any = message
        if (images && images.length > 0) {
            userContent = [
                { type: 'text', text: message },
                ...images.map(img => {
                    const match = img.match(/^data:(image\/[^;]+);base64,(.+)$/)
                    const mediaType = match ? match[1] : 'image/jpeg'
                    const base64Data = match ? match[2] : img
                    return {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: base64Data }
                    }
                })
            ]
        }
        anthropicMessages.push({ role: 'user', content: userContent })

        const requestData = {
            model,
            messages: anthropicMessages,
            max_tokens: parseInt(maxTokens.toString()),
            temperature: parseFloat(temperature.toString()),
            system: systemPrompt,
            stream: true
        }

        const response = await this.client.post(this.chatPath, requestData, {
            responseType: 'stream',
            signal: abortSignal
        })

        const stream = response.data
        for await (const chunk of stream) {
            const lines = chunk.toString().split('\n').filter((line: string) => line.trim())
            for (const line of lines) {
                if (line.startsWith('event: ')) continue
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '')
                    try {
                        const data = JSON.parse(dataStr)
                        if (data.type === 'content_block_delta') {
                            const content = data.delta?.text || ''
                            if (content) {
                                yield JSON.stringify({ message: { content }, done: false }) + '\n'
                            }
                        } else if (data.type === 'message_stop') {
                            yield JSON.stringify({ done: true }) + '\n'
                        }
                    } catch (e) { }
                }
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
            case 'github-copilot':
                return new GitHubCopilotProvider(config)
            case 'openai':
            case 'chatgpt-web':       // ChatGPT 網頁版 session，使用 OpenAI 相容路徑
            case 'google-gemini':
            case 'mistral':
            case 'groq':
            case 'xai-grok':
            case 'deepseek':
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
