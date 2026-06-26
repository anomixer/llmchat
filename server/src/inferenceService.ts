import { ProviderFactory, AVAILABLE_PROVIDERS } from './src/providers/ProviderManager.js'

/**
 * 推理服務器
 * 支援多個 LLM Provider
 */
export class InferenceService {
    constructor() {
        this.providers = new Map()
        this.defaultProvider = this.loadDefaultProvider()
    }

    /**
     * 從環境變數加載默認 Provider 配置
     */
    loadDefaultProvider() {
        const providerType = process.env.LLM_PROVIDER || 'ollama'
        const baseUrl = process.env.LLM_BASE_URL || 
            (providerType === 'ollama' ? 'http://localhost:11434' : 
             providerType === 'anthropic' ? 'https://api.anthropic.com' :
             providerType === 'openai' ? 'https://api.openai.com' :
             providerType === 'groq' ? 'https://api.groq.com/openai' :
             'https://api.openai.com')
        const apiKey = process.env.LLM_API_KEY || ''
        const model = process.env.LLM_MODEL || 'llama2'
        const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7')
        const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '2048')

        return {
            type: providerType,
            baseUrl,
            apiKey,
            model,
            temperature,
            maxTokens,
            authMethod: 'api-key',
            oauthConfig: {}
        }
    }

    /**
     * 獲取可用的 Provider 列表
     */
    getAvailableProviders() {
        return AVAILABLE_PROVIDERS
    }

    /**
     * 獲取當前配置的 Provider
     */
    getCurrentProvider() {
        return {
            type: this.defaultProvider.type,
            baseUrl: this.defaultProvider.baseUrl,
            model: this.defaultProvider.model,
            requiresApiKey: AVAILABLE_PROVIDERS.find(p => p.type === this.defaultProvider.type)?.requiresApiKey || false,
            authMethod: this.defaultProvider.authMethod || 'api-key',
            oauthConfig: this.defaultProvider.oauthConfig || {}
        }
    }

    /**
     * 更新 Provider 配置
     */
    updateProvider(config) {
        const { type, baseUrl, apiKey, model, temperature, topP, topK, maxTokens, authMethod, oauthConfig } = config
        
        this.defaultProvider = {
            type,
            baseUrl,
            apiKey,
            model,
            temperature,
            topP,
            topK,
            maxTokens,
            authMethod: authMethod || 'api-key',
            oauthConfig: oauthConfig || {}
        }

        try {
            const provider = ProviderFactory.createProvider(type, this.defaultProvider)
            this.providers.set(type, provider)
            console.log(`✅ Provider 已更新：${type}`)
            return true
        } catch (error) {
            console.error(`❌ Provider 更新失敗：${error.message}`)
            return false
        }
    }

    /**
     * 檢查 Provider 連接
     */
    async checkConnection() {
        try {
            const provider = this.providers.get(this.defaultProvider.type) || 
                            ProviderFactory.createProvider(this.defaultProvider.type, this.defaultProvider)
            
            const isConnected = await provider.checkConnection()
            
            if (isConnected) {
                console.log('✅ Provider 連接成功')
            } else {
                console.warn('⚠️ Provider 連接失敗')
            }
            
            return isConnected
        } catch (error) {
            console.error('❌ Provider 連接檢查失敗:', error.message)
            return false
        }
    }

    /**
     * 獲取可用模型列表
     */
    async getAvailableModels() {
        try {
            const provider = this.providers.get(this.defaultProvider.type) || 
                            ProviderFactory.createProvider(this.defaultProvider.type, this.defaultProvider)
            
            const models = await provider.getAvailableModels()
            console.log(`✅ 獲取到 ${models.length} 個模型`)
            
            return models.map(m => ({
                id: m.name,
                name: m.name,
                size: m.size
            }))
        } catch (error) {
            console.error('❌ 獲取模型列表失敗:', error.message)
            return []
        }
    }

    /**
     * 生成回應（非流式）
     */
    async generateResponse({ message, history, settings = {} }) {
        try {
            const provider = this.providers.get(this.defaultProvider.type) || 
                            ProviderFactory.createProvider(this.defaultProvider.type, this.defaultProvider)
            
            const response = await provider.generateResponse({
                message,
                history,
                settings: {
                    ...this.defaultProvider,
                    ...settings
                }
            })

            return {
                content: response.content,
                usage: response.usage
            }
        } catch (error) {
            console.error('❌ 生成回應失敗:', error.message)
            throw error
        }
    }

    /**
     * 流式生成回應
     */
    async *generateStream({ message, history, settings = {} }) {
        try {
            const provider = this.providers.get(this.defaultProvider.type) || 
                            ProviderFactory.createProvider(this.defaultProvider.type, this.defaultProvider)
            
            const response = await provider.generateResponse({
                message,
                history,
                settings: {
                    ...this.defaultProvider,
                    ...settings
                }
            })

            // 模擬流式輸出
            const chunks = response.content.split(' ')
            for (const chunk of chunks) {
                yield { content: chunk + ' ' }
                await new Promise(resolve => setTimeout(resolve, 50))
            }
        } catch (error) {
            console.error('❌ 流式生成失敗:', error.message)
            throw error
        }
    }
}

// 創建單例
export const inferenceService = new InferenceService()
