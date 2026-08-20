import { Router, type Request, type Response } from 'express'
import { ProviderFactory, AVAILABLE_PROVIDERS } from '../providers/ProviderManager.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

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
    router.get('/providers/current', authenticateToken(userService), (_req: AuthedRequest, res: Response) => {
        try {
            // 優先從管理員設定中讀取
            const adminSettings = userService ? userService.getAdminSettings() : null
            const providerType = adminSettings?.type || process.env.LLM_PROVIDER || 'ollama'
            
            const safeOauthConfig = adminSettings?.oauthConfig ? { ...adminSettings.oauthConfig } : undefined
            if (safeOauthConfig) {
                if (safeOauthConfig.googleJson) safeOauthConfig.googleJson = '********'
                if (safeOauthConfig.azureClientSecret) safeOauthConfig.azureClientSecret = '********'
                if (safeOauthConfig.awsSecretKey) safeOauthConfig.awsSecretKey = '********'
                if (safeOauthConfig.githubToken) safeOauthConfig.githubToken = '********'
                if (safeOauthConfig.googleUserRefreshToken) safeOauthConfig.googleUserRefreshToken = '********'
                if (safeOauthConfig.chatgptAccessToken) safeOauthConfig.chatgptAccessToken = '********'
                if (safeOauthConfig.googleUserClientId) safeOauthConfig.googleUserClientId = '********'
                if (safeOauthConfig.googleUserClientSecret) safeOauthConfig.googleUserClientSecret = '********'
            }

            const currentProvider = {
                type: providerType,
                name: AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.name || providerType,
                baseUrl: adminSettings?.apiUrl || process.env.LLM_BASE_URL || 
                    (AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.baseUrl || 'https://api.openai.com/v1'),
                model: adminSettings?.model || process.env.LLM_MODEL || 'llama2',
                apiKey: adminSettings?.apiKey ? '********' : (process.env.LLM_API_KEY ? '********' : ''),
                temperature: adminSettings?.temperature || parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: adminSettings?.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '8192'),
                requiresApiKey: AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.requiresApiKey ?? true,
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
    router.post('/providers/update', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            // 只有管理員才能改動全域 Provider 配置
            if (!userService.isAdmin(req.user!.userId)) {
                return res.status(403).json({ error: '需要管理員權限' })
            }

            const { type, baseUrl, apiKey, model, temperature, maxTokens, authMethod, oauthConfig } = req.body
            
            // 保存配置到環境變數（作為緩存）
            process.env.LLM_PROVIDER = type
            process.env.LLM_BASE_URL = baseUrl
            process.env.LLM_API_KEY = apiKey || ''
            process.env.LLM_MODEL = model
            process.env.LLM_TEMPERATURE = temperature?.toString() || '0.7'
            process.env.LLM_MAX_TOKENS = maxTokens?.toString() || '8192'

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
                        if (finalOauthConfig.githubToken === '********') finalOauthConfig.githubToken = existingSettings.oauthConfig.githubToken
                        if (finalOauthConfig.googleUserRefreshToken === '********') finalOauthConfig.googleUserRefreshToken = existingSettings.oauthConfig.googleUserRefreshToken
                        if (finalOauthConfig.chatgptAccessToken === '********') finalOauthConfig.chatgptAccessToken = existingSettings.oauthConfig.chatgptAccessToken
                        if (finalOauthConfig.googleUserClientId === '********') finalOauthConfig.googleUserClientId = existingSettings.oauthConfig.googleUserClientId
                        if (finalOauthConfig.googleUserClientSecret === '********') finalOauthConfig.googleUserClientSecret = existingSettings.oauthConfig.googleUserClientSecret
                    }

                    userService.updateUserSettings(admin.id, {
                        type,
                        apiUrl: baseUrl,
                        apiKey: finalApiKey,
                        model,
                        temperature: parseFloat(temperature || '0.7'),
                        maxTokens: parseInt(maxTokens || '8192'),
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
    router.post('/providers/check', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { type, baseUrl, apiKey, model, authMethod, oauthConfig } = req.body || {}
            
            const providerType = type || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = baseUrl || process.env.LLM_BASE_URL || 
                (AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.baseUrl || 'https://api.openai.com/v1')
            
            const admin = userService ? userService.users.find((u: any) => u.role === 'admin') : null
            const existingSettings = admin ? userService.getUserSettings(admin.id) : null
            
            const providerApiKey = apiKey === '********' ? existingSettings?.apiKey : (apiKey || process.env.LLM_API_KEY || '')
            const providerModel = model || process.env.LLM_MODEL || 'llama2'

            let finalOauthConfig = oauthConfig ? { ...oauthConfig } : undefined
            if (finalOauthConfig && existingSettings?.oauthConfig) {
                if (finalOauthConfig.googleJson === '********') finalOauthConfig.googleJson = existingSettings.oauthConfig.googleJson
                if (finalOauthConfig.azureClientSecret === '********') finalOauthConfig.azureClientSecret = existingSettings.oauthConfig.azureClientSecret
                if (finalOauthConfig.awsSecretKey === '********') finalOauthConfig.awsSecretKey = existingSettings.oauthConfig.awsSecretKey
                if (finalOauthConfig.githubToken === '********') finalOauthConfig.githubToken = existingSettings.oauthConfig.githubToken
                if (finalOauthConfig.googleUserRefreshToken === '********') finalOauthConfig.googleUserRefreshToken = existingSettings.oauthConfig.googleUserRefreshToken
                if (finalOauthConfig.chatgptAccessToken === '********') finalOauthConfig.chatgptAccessToken = existingSettings.oauthConfig.chatgptAccessToken
                if (finalOauthConfig.googleUserClientId === '********') finalOauthConfig.googleUserClientId = existingSettings.oauthConfig.googleUserClientId
                if (finalOauthConfig.googleUserClientSecret === '********') finalOauthConfig.googleUserClientSecret = existingSettings.oauthConfig.googleUserClientSecret
            }

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '8192'),
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
    router.get('/models', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const adminSettings = userService ? userService.getAdminSettings() : null
            const providerType = req.query.type as string || adminSettings?.type || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = req.query.baseUrl as string || adminSettings?.apiUrl || process.env.LLM_BASE_URL || 
                (AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.baseUrl || 'https://api.openai.com/v1')
            
            // API Key 優先從 header 讀（避免放進 URL query 洩漏到日誌/瀏覽器歷史）；query 作為舊版相容 fallback
            const rawApiKey = (req.headers['x-provider-api-key'] as string) || (req.query.apiKey as string) || ''
            const providerApiKey = rawApiKey === '********' ? adminSettings?.apiKey : (rawApiKey || adminSettings?.apiKey || process.env.LLM_API_KEY || '')
            const providerModel = req.query.model as string || adminSettings?.model || process.env.LLM_MODEL || 'llama2'

            let authMethod = req.query.authMethod as string || adminSettings?.authMethod || 'api-key'
            let oauthConfig = adminSettings?.oauthConfig
            // oauthConfig 可能含 token，優先從 header 讀（避免放進 URL 洩漏）；query 作為舊版相容 fallback
            const oauthConfigRaw = (req.headers['x-provider-oauth-config'] as string) || req.query.oauthConfig as string || ''
            if (oauthConfigRaw && oauthConfigRaw !== 'undefined') {
                try {
                    const parsed = JSON.parse(oauthConfigRaw)
                    if (parsed && typeof parsed === 'object') {
                        oauthConfig = { ...adminSettings?.oauthConfig, ...parsed }
                        if (parsed.googleJson === '********') oauthConfig.googleJson = adminSettings?.oauthConfig?.googleJson
                        if (parsed.azureClientSecret === '********') oauthConfig.azureClientSecret = adminSettings?.oauthConfig?.azureClientSecret
                        if (parsed.awsSecretKey === '********') oauthConfig.awsSecretKey = adminSettings?.oauthConfig?.awsSecretKey
                        if (parsed.githubToken === '********') oauthConfig.githubToken = adminSettings?.oauthConfig?.githubToken
                        if (parsed.googleUserRefreshToken === '********') oauthConfig.googleUserRefreshToken = adminSettings?.oauthConfig?.googleUserRefreshToken
                        if (parsed.chatgptAccessToken === '********') oauthConfig.chatgptAccessToken = adminSettings?.oauthConfig?.chatgptAccessToken
                        if (parsed.googleUserClientId === '********') oauthConfig.googleUserClientId = adminSettings?.oauthConfig?.googleUserClientId
                        if (parsed.googleUserClientSecret === '********') oauthConfig.googleUserClientSecret = adminSettings?.oauthConfig?.googleUserClientSecret
                    }
                } catch (e) {}
            }

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '8192'),
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
    router.post('/chat', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { message, history, settings } = req.body

            if (!message) {
                return res.status(400).json({ error: '消息不能為空' })
            }

            const providerType = settings?.providerType || process.env.LLM_PROVIDER || 'ollama'
            const providerBaseUrl = settings?.baseUrl || process.env.LLM_BASE_URL || 
                (AVAILABLE_PROVIDERS.find(p => p.type === providerType)?.baseUrl || 'https://api.openai.com/v1')
            const providerApiKey = settings?.apiKey || process.env.LLM_API_KEY || ''
            const providerModel = settings?.model || process.env.LLM_MODEL || 'llama2'

            const provider = ProviderFactory.createProvider(providerType, {
                type: providerType,
                baseUrl: providerBaseUrl,
                apiKey: providerApiKey,
                model: providerModel,
                temperature: parseFloat(settings?.temperature || process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(settings?.maxTokens || process.env.LLM_MAX_TOKENS || '8192')
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
