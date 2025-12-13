import { OllamaProvider, type ChatSettings } from './ollamaProvider.js'

export class ChatProvider {
    private ollamaProvider: OllamaProvider
    private conversationHistory: Map<string, Array<{ role: string; content: string; timestamp: Date }>>

    constructor(ollamaProvider: OllamaProvider) {
        this.ollamaProvider = ollamaProvider
        this.conversationHistory = new Map()
    }

    // 生成回應
    async generateResponse({
        message,
        history = [],
        settings = {} as ChatSettings
    }: {
        message: string
        history?: Array<{ role: string; content: string }>
        settings?: ChatSettings
    }) {
        try {
            console.log('生成回應:', {
                message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                historyLength: history.length,
                model: settings.model
            })

            // 調用 Ollama 提供者生成回應
            const response = await this.ollamaProvider.generateResponse({
                message,
                history,
                settings
            })

            // 記錄對話歷史（可選）
            this._updateConversationHistory(message, response)

            return response

        } catch (error: any) {
            console.error('ChatProvider 生成回應失敗:', error)

            // 根據錯誤類型返回適當的錯誤訊息
            if (typeof error.message === 'string' && error.message.includes('無法連接到 Ollama')) {
                throw new Error('Ollama 服務未運行，請先啟動 Ollama')
            }

            if (typeof error.message === 'string' && error.message.includes('模型') && error.message.includes('未找到')) {
                throw new Error(`模型 '${settings.model}' 不存在，請檢查模型名稱或下載模型`)
            }

            if (typeof error.message === 'string' && error.message.includes('請求參數錯誤')) {
                throw new Error('請求參數有誤，請檢查設定')
            }

            throw new Error(`生成回應失敗: ${error.message}`)
        }
    }

    // 更新對話歷史
    private _updateConversationHistory(userMessage: string, assistantMessage: string) {
        const conversationId = 'default' // 可以擴展為多個對話
        const history = this.conversationHistory.get(conversationId) || []

        history.push(
            { role: 'user', content: userMessage, timestamp: new Date() },
            { role: 'assistant', content: assistantMessage, timestamp: new Date() }
        )

        // 保持歷史記錄在合理範圍內（最近 20 輪對話）
        if (history.length > 40) {
            history.splice(0, history.length - 40)
        }

        this.conversationHistory.set(conversationId, history)
    }

    // 獲取對話歷史
    getConversationHistory(conversationId = 'default') {
        return this.conversationHistory.get(conversationId) || []
    }

    // 清除對話歷史
    clearConversationHistory(conversationId = 'default') {
        this.conversationHistory.delete(conversationId)
    }

    // 獲取所有對話 ID
    getConversationIds() {
        return Array.from(this.conversationHistory.keys())
    }

    // 健康檢查
    async healthCheck() {
        try {
            const isConnected = await this.ollamaProvider.checkConnection()
            return {
                status: isConnected ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                ollamaConnected: isConnected
            }
        } catch (error: any) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                ollamaConnected: false
            }
        }
    }
}
