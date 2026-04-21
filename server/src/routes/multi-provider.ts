import { Router, type Request, type Response } from 'express'
import { ProviderFactory, AVAILABLE_PROVIDERS } from '../providers/ProviderManager.js'

export function createMultiProviderRouter(deps: any) {
    const { userService } = deps
    const router = Router()

    // 獲取可用的 Provider 列表
    router.get('/providers', (_req: Request, res: Response) => {
        try {
            const providers = AVAILABLE_PROVIDERS
            res.json({ providers })
        } catch (error: any) {
            console.error('Error fetching providers:', error)
            res.status(500).json({ error: '獲取 Provider 列表失敗' })
        }
    })

    // 獲取當前 Provider 配置（從環境變數）
    router.get('/providers/current', (_req: Request, res: Response) => {
        try {
            // 優先從管理員設定中讀取
            const adminSettings = userService ? userService.getAdminSettings() : null
            const providerType = adminSettings?.type || process.env.LLM_PROVIDER || 'ollama'
            
            const currentProvider = {
                type: providerType,
                name: AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.name || providerType,
                baseUrl: adminSettings?.apiUrl || process.env.LLM_BASE_URL || 
                    (providerType === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1'),
                model: adminSettings?.model || process.env.LLM_MODEL || 'llama2',
                apiKey: adminSettings?.apiKey ? '********' : (process.env.LLM_API_KEY ? '********' : ''),
                temperature: adminSettings?.temperature || parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: adminSettings?.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '4096'),
                requiresApiKey: !['ollama', 'ollama-cloud', 'vllm', 'sglang', 'lm-studio', 'custom'].includes(providerType)
            }
            res.json({ current: currentProvider })
        } catch (error: any) {
            console.error('Error fetching current provider:', error)
            res.status(500).json({ error: '獲取當前 Provider 失敗' })
        }
    })

    // 更新 Provider 配置
    router.post('/providers/update', async (req: Request, res: Response) => {
        try {
            const { type, baseUrl, apiKey, model, temperature, maxTokens } = req.body
            
            // 保存配置到環境變數（作為緩存）
            process.env.LLM_PROVIDER = type
            process.env.LLM_BASE_URL = baseUrl
            process.env.LLM_API_KEY = apiKey || ''
            process.env.LLM_MODEL = model
            process.env.LLM_TEMPERATURE = temperature?.toString() || '0.7'
            process.env.LLM_MAX_TOKENS = maxTokens?.toString() || '4096'

            // ✅ 持久化到資料庫
            if (userService) {
                const admin = userService.users.find((u: any) => u.role === 'admin')
                if (admin) {
                    userService.updateUserSettings(admin.id, {
                        type,
                        apiUrl: baseUrl,
                        apiKey: apiKey || '',
                        model,
                        temperature: parseFloat(temperature || '0.7'),
                        maxTokens: parseInt(maxTokens || '4096')
                    })
                    console.log(`已將 Provider 設定 (${type}) 持久化到管理員 [${admin.email}] 的帳號中`)
                }
            }

            // 測試連接
            try {
                const provider = ProviderFactory.createProvider(type, {
                    type,
                    baseUrl,
                    apiKey,
                    model,
                    temperature,
                    maxTokens
                })
                
                const isConnected = await provider.checkConnection()
                
                if (isConnected) {
                    res.json({ 
                        success: true, 
                        isConnected: true,
                        message: 'Provider 設定已更新'
                    })
                } else {
                    res.json({ 
                        success: true, 
                        isConnected: false,
                        message: 'Provider 設定已更新，但連接失敗'
                    })
                }
            } catch (error: any) {
                res.json({ 
                    success: false, 
                    isConnected: false,
                    message: error.message
                })
            }
        } catch (error: any) {
            console.error('Error updating provider:', error)
            res.status(500).json({ error: '更新 Provider 設定失敗' })
        }
    })

    // 檢查 Provider 連接
    router.post('/providers/check', async (req: Request, res: Response) => {
        try {
            const { type, baseUrl, apiKey, model } = req.body || {}
            
            const providerType = type || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = baseUrl || process.env.LLM_BASE_URL || 
                (providerType === 'ollama' ? 'http://localhost:11434' : 
                 providerType === 'anthropic' ? 'https://api.anthropic.com/v1' :
                 providerType === 'openai' ? 'https://api.openai.com/v1' :
                 providerType === 'groq' ? 'https://api.groq.com/openai/v1' :
                 'https://api.openai.com/v1')
            const providerApiKey = apiKey || process.env.LLM_API_KEY || ''
            const providerModel = model || process.env.LLM_MODEL || 'llama2'

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048')
            })
            
            const isConnected = await provider.checkConnection()
            res.json({ isConnected })
        } catch (error: any) {
            console.error('Error checking connection:', error)
            res.status(500).json({ error: '檢查連接失敗' })
        }
    })

    // 獲取可用模型列表
    router.get('/models', async (req: Request, res: Response) => {
        try {
            const providerType = req.query.type as string || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = req.query.baseUrl as string || process.env.LLM_BASE_URL || 
                (providerType === 'ollama' ? 'http://localhost:11434' : 
                 providerType === 'anthropic' ? 'https://api.anthropic.com/v1' :
                 providerType === 'openai' ? 'https://api.openai.com/v1' :
                 providerType === 'groq' ? 'https://api.groq.com/openai/v1' :
                 'https://api.openai.com/v1')
            const providerApiKey = req.query.apiKey as string || process.env.LLM_API_KEY || ''
            const providerModel = req.query.model as string || process.env.LLM_MODEL || 'llama2'

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048')
            })
            
            const models = await provider.getAvailableModels()
            res.json({ models })
        } catch (error: any) {
            console.error('Error fetching models:', error)
            res.status(500).json({ error: '獲取模型列表失敗' })
        }
    })

    // 聊天端點
    router.post('/chat', async (req: Request, res: Response) => {
        try {
            const { message, history, settings } = req.body

            if (!message) {
                return res.status(400).json({ error: '消息不能為空' })
            }

            const providerType = settings?.providerType || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = settings?.baseUrl || process.env.LLM_BASE_URL || 
                (providerType === 'ollama' ? 'http://localhost:11434' : 
                 providerType === 'anthropic' ? 'https://api.anthropic.com/v1' :
                 providerType === 'openai' ? 'https://api.openai.com/v1' :
                 providerType === 'groq' ? 'https://api.groq.com/openai/v1' :
                 'https://api.openai.com/v1')
            const providerApiKey = settings?.apiKey || process.env.LLM_API_KEY || ''
            const providerModel = settings?.model || process.env.LLM_MODEL || 'llama2'

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(settings?.temperature || process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(settings?.maxTokens || process.env.LLM_MAX_TOKENS || '2048')
            })
            
            const response = await provider.generateResponse({
                message,
                history: history || [],
                settings
            })

            res.json({ 
                response: response.content,
                usage: response.usage
            })
        } catch (error: any) {
            console.error('Chat error:', error)
            res.status(500).json({ 
                error: '處理請求時發生錯誤', 
                details: error.message 
            })
        }
    })

    return router
}
