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
            
            const safeOauthConfig = adminSettings?.oauthConfig ? { ...adminSettings.oauthConfig } : undefined
            if (safeOauthConfig) {
                if (safeOauthConfig.googleJson) safeOauthConfig.googleJson = '********'
                if (safeOauthConfig.azureClientSecret) safeOauthConfig.azureClientSecret = '********'
                if (safeOauthConfig.awsSecretKey) safeOauthConfig.awsSecretKey = '********'
            }

            const currentProvider = {
                type: providerType,
                name: AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.name || providerType,
                baseUrl: adminSettings?.apiUrl || process.env.LLM_BASE_URL || 
                    (providerType === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1'),
                model: adminSettings?.model || process.env.LLM_MODEL || 'llama2',
                apiKey: adminSettings?.apiKey ? '********' : (process.env.LLM_API_KEY ? '********' : ''),
                temperature: adminSettings?.temperature || parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: adminSettings?.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '4096'),
                requiresApiKey: !['ollama', 'ollama-cloud', 'vllm', 'sglang', 'lm-studio', 'custom'].includes(providerType),
                authMethod: adminSettings?.authMethod || 'api-key',
                oauthConfig: safeOauthConfig
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
            const { type, baseUrl, apiKey, model, temperature, maxTokens, authMethod, oauthConfig } = req.body
            
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
                    // 如果傳來的是遮蔽的 '********'，則保留資料庫中原有的密鑰
                    const existingSettings = userService.getUserSettings(admin.id)
                    const finalApiKey = apiKey === '********' ? existingSettings?.apiKey : (apiKey || '')
                    
                    let finalOauthConfig = oauthConfig ? { ...oauthConfig } : undefined
                    if (finalOauthConfig && existingSettings?.oauthConfig) {
                        if (finalOauthConfig.googleJson === '********') finalOauthConfig.googleJson = existingSettings.oauthConfig.googleJson
                        if (finalOauthConfig.azureClientSecret === '********') finalOauthConfig.azureClientSecret = existingSettings.oauthConfig.azureClientSecret
                        if (finalOauthConfig.awsSecretKey === '********') finalOauthConfig.awsSecretKey = existingSettings.oauthConfig.awsSecretKey
                    }

                    userService.updateUserSettings(admin.id, {
                        type,
                        apiUrl: baseUrl,
                        apiKey: finalApiKey,
                        model,
                        temperature: parseFloat(temperature || '0.7'),
                        maxTokens: parseInt(maxTokens || '4096'),
                        authMethod: authMethod || 'api-key',
                        oauthConfig: finalOauthConfig
                    })
                    console.log(`已將 Provider 設定 (${type}) 持久化到管理員 [${admin.email}] 的帳號中`)
                }
            }

            // 測試連接
            try {
                const admin = userService ? userService.users.find((u: any) => u.role === 'admin') : null
                const existingSettings = admin ? userService.getUserSettings(admin.id) : null
                
                const finalApiKey = apiKey === '********' ? existingSettings?.apiKey : (apiKey || '')
                let finalOauthConfig = oauthConfig ? { ...oauthConfig } : undefined
                if (finalOauthConfig && existingSettings?.oauthConfig) {
                    if (finalOauthConfig.googleJson === '********') finalOauthConfig.googleJson = existingSettings.oauthConfig.googleJson
                    if (finalOauthConfig.azureClientSecret === '********') finalOauthConfig.azureClientSecret = existingSettings.oauthConfig.azureClientSecret
                    if (finalOauthConfig.awsSecretKey === '********') finalOauthConfig.awsSecretKey = existingSettings.oauthConfig.awsSecretKey
                }

                const provider = ProviderFactory.createProvider(type, {
                    type,
                    baseUrl,
                    apiKey: finalApiKey,
                    model,
                    temperature,
                    maxTokens,
                    authMethod: authMethod || 'api-key',
                    oauthConfig: finalOauthConfig
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
            const { type, baseUrl, apiKey, model, authMethod, oauthConfig } = req.body || {}
            
            const providerType = type || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = baseUrl || process.env.LLM_BASE_URL || 
                (providerType === 'ollama' ? 'http://localhost:11434' : 
                 providerType === 'anthropic' ? 'https://api.anthropic.com/v1' :
                 providerType === 'openai' ? 'https://api.openai.com/v1' :
                 providerType === 'groq' ? 'https://api.groq.com/openai/v1' :
                 'https://api.openai.com/v1')
            
            const admin = userService ? userService.users.find((u: any) => u.role === 'admin') : null
            const existingSettings = admin ? userService.getUserSettings(admin.id) : null
            
            const providerApiKey = apiKey === '********' ? existingSettings?.apiKey : (apiKey || process.env.LLM_API_KEY || '')
            const providerModel = model || process.env.LLM_MODEL || 'llama2'

            let finalOauthConfig = oauthConfig ? { ...oauthConfig } : undefined
            if (finalOauthConfig && existingSettings?.oauthConfig) {
                if (finalOauthConfig.googleJson === '********') finalOauthConfig.googleJson = existingSettings.oauthConfig.googleJson
                if (finalOauthConfig.azureClientSecret === '********') finalOauthConfig.azureClientSecret = existingSettings.oauthConfig.azureClientSecret
                if (finalOauthConfig.awsSecretKey === '********') finalOauthConfig.awsSecretKey = existingSettings.oauthConfig.awsSecretKey
            }

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),
                authMethod: authMethod || existingSettings?.authMethod || 'api-key',
                oauthConfig: finalOauthConfig || existingSettings?.oauthConfig
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
            const adminSettings = userService ? userService.getAdminSettings() : null
            const providerType = req.query.type as string || adminSettings?.type || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = req.query.baseUrl as string || adminSettings?.apiUrl || process.env.LLM_BASE_URL || 
                (providerType === 'ollama' ? 'http://localhost:11434' : 
                 providerType === 'anthropic' ? 'https://api.anthropic.com/v1' :
                 providerType === 'openai' ? 'https://api.openai.com/v1' :
                 providerType === 'groq' ? 'https://api.groq.com/openai/v1' :
                 'https://api.openai.com/v1')
            
            const providerApiKey = req.query.apiKey as string === '********' ? adminSettings?.apiKey : (req.query.apiKey as string || adminSettings?.apiKey || process.env.LLM_API_KEY || '')
            const providerModel = req.query.model as string || adminSettings?.model || process.env.LLM_MODEL || 'llama2'

            let authMethod = req.query.authMethod as string || adminSettings?.authMethod || 'api-key'
            let oauthConfig = adminSettings?.oauthConfig
            if (req.query.oauthConfig && req.query.oauthConfig !== 'undefined') {
                try {
                    const parsed = JSON.parse(req.query.oauthConfig as string)
                    if (parsed && typeof parsed === 'object') {
                        oauthConfig = { ...adminSettings?.oauthConfig, ...parsed }
                        if (parsed.googleJson === '********') oauthConfig.googleJson = adminSettings?.oauthConfig?.googleJson
                        if (parsed.azureClientSecret === '********') oauthConfig.azureClientSecret = adminSettings?.oauthConfig?.azureClientSecret
                        if (parsed.awsSecretKey === '********') oauthConfig.awsSecretKey = adminSettings?.oauthConfig?.awsSecretKey
                    }
                } catch (e) {}
            }

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),
                authMethod,
                oauthConfig
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
