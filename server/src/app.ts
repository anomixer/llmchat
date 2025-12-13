import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import type { OllamaProvider } from './providers/ollamaProvider.js'
import type UserService from './services/userService.js'
import type EmailService from './services/emailService.js'
import { createAuthRouter } from './routes/auth.js'
import { createChatRouter } from './routes/chat.js'
import { createUserRouter } from './routes/user.js'
import { createAdminRouter } from './routes/admin.js'
import { createApiMiscRouter, createOpenAiRouter } from './routes/misc.js'

export function createApp(deps: {
    userService: UserService
    emailService: EmailService
    ollamaProvider: OllamaProvider
    defaultApiUrl: string
    defaultApiKey: string
}) {
    const app = express()

    app.use(cors())
    app.use(express.json())

    // API (proxied by Vite)
    app.use('/api', createApiMiscRouter({
        emailService: deps.emailService,
        defaultApiUrl: deps.defaultApiUrl,
        defaultApiKey: deps.defaultApiKey
    }))

    app.use('/api', createAuthRouter({ userService: deps.userService, emailService: deps.emailService }))
    app.use('/api', createChatRouter({ userService: deps.userService }))
    app.use('/api', createUserRouter({ userService: deps.userService }))
    app.use('/api', createAdminRouter({ userService: deps.userService }))

    // OpenAI compatible
    app.use('/v1', createOpenAiRouter({ ollamaProvider: deps.ollamaProvider }))

    // 全局錯誤處理
    app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('Global error:', error)
        res.status(500).json({
            error: '服務器內部錯誤',
            message: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
        })
    })

    return app
}
