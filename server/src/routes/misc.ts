import { Router, type Request, type Response } from 'express'
import type EmailService from '../services/emailService.js'
import type UserService from '../services/userService.js'
import { OllamaProvider } from '../providers/ollamaProvider.js'

export function createApiMiscRouter(deps: {
    userService: UserService
    emailService: EmailService
    defaultApiUrl: string
    defaultApiKey: string
}) {
    const { userService, emailService, defaultApiUrl, defaultApiKey } = deps
    const router = Router()

    // 健康檢查端點
    router.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // 獲取預設配置
    router.get('/config', async (_req: Request, res: Response) => {
        const hasUsers = userService.users.length > 0
        // 優化：避免每次請求都進行慢速的 SMTP 連線測試，只要有配置 transporter 就視為啟用；且系統無用戶時強制開啟以註冊首位管理員
        const smtpEnabled = !!(emailService as any).transporter || !hasUsers

        res.json({
            apiUrl: defaultApiUrl,
            apiKey: defaultApiKey || '',
            smtpEnabled: smtpEnabled,
            hasUsers: hasUsers
        })
    })



    // 聊天歷史端點（可選功能）
    router.get('/history', (_req: Request, res: Response) => {
        res.json({ history: [] })
    })

    return router
}

export function createOpenAiRouter(deps: { ollamaProvider: OllamaProvider }) {
    const { ollamaProvider } = deps
    const router = Router()

    // 獲取可用模型 - OpenAI API 相容格式
    router.get('/models', async (_req: Request, res: Response) => {
        try {
            const models = await ollamaProvider.getAvailableModels()

            const openaiModels = models.map((model: any) => ({
                id: model.name,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'local'
            }))

            res.json({
                object: 'list',
                data: openaiModels
            })
        } catch (error) {
            console.error('Error fetching models:', error)
            res.status(500).json({
                error: {
                    message: '無法獲取模型列表',
                    type: 'invalid_request_error'
                }
            })
        }
    })

    return router
}
