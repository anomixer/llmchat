export class ChatProvider {
    constructor(ollamaProvider) {
        this.ollamaProvider = ollamaProvider
        this.conversationHistory = new Map()
    }

    // 生成回應
    async generateResponse({ message, history = [], settings = {} }) {
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

        } catch (error) {
            console.error('ChatProvider 生成回應失敗:', error)

            // 根據錯誤類型返回適當的錯誤訊息
            if (error.message.includes('無法連接到 Ollama')) {
                throw new Error('Ollama 服務未運行，請先啟動 Ollama')
            }

            if (error.message.includes('模型') && error.message.includes('未找到')) {
                throw new Error(`模型 '${settings.model}' 不存在，請檢查模型名稱或下載模型`)
            }

            if (error.message.includes('請求參數錯誤')) {
                throw new Error('請求參數有誤，請檢查設定')
            }

            throw new Error(`生成回應失敗: ${error.message}`)
        }
    }

    // 更新對話歷史
    _updateConversationHistory(userMessage, assistantMessage) {
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

    // 預處理消息（可選功能）
    _preprocessMessage(message) {
        // 移除多餘的空白字符
        let processed = message.trim()

        // 處理常見的格式化問題
        processed = processed.replace(/\s+/g, ' ')

        // 移除字符長度限制，讓模型自行處理
        // 現代LLM模型可以處理更長的輸入

        return processed
    }

    // 後處理回應（可選功能）
    _postprocessResponse(response) {
        if (!response) return ''

        let processed = response.trim()

        // 移除可能的重複文本
        const sentences = processed.split('。').filter(s => s.trim())
        const uniqueSentences = [...new Set(sentences)]
        processed = uniqueSentences.join('。') + '。'

        // 確保回應以適當的標點符號結尾
        if (!processed.match(/[.!?。！？]$/)) {
            processed += '。'
        }

        return processed
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
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                ollamaConnected: false
            }
        }
    }

    // 獲取使用統計（可選功能）
    getUsageStats() {
        const stats = {
            totalConversations: this.conversationHistory.size,
            totalMessages: 0,
            conversationIds: []
        }

        for (const [id, history] of this.conversationHistory) {
            stats.totalMessages += history.length
            stats.conversationIds.push({
                id,
                messageCount: history.length,
                lastActivity: history.length > 0 ? history[history.length - 1].timestamp : null
            })
        }

        return stats
    }
}