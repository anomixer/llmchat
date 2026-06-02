import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import type { OllamaProvider } from './providers/ollamaProvider.js'
import type UserService from './services/userService.js'
import type EmailService from './services/emailService.js'
import { createAuthRouter } from './routes/auth.js'
import { createChatRouter } from './routes/chat.js'
import { createUserRouter } from './routes/user.js'
import { createAdminRouter } from './routes/admin.js'
import { createApiMiscRouter, createOpenAiRouter } from './routes/misc.js'
import { createMultiProviderRouter } from './routes/multi-provider.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createApp(deps: {
    userService: UserService
    emailService: EmailService
    ollamaProvider: OllamaProvider
    defaultApiUrl: string
    defaultApiKey: string
}) {
    const app = express()

    app.use(cors())
    app.use(express.json({ limit: '50mb' }))

    // API (proxied by Vite)
    app.use('/api', createApiMiscRouter({
        userService: deps.userService,
        emailService: deps.emailService,
        defaultApiUrl: deps.defaultApiUrl,
        defaultApiKey: deps.defaultApiKey
    }))

    app.use('/api', createAuthRouter({ userService: deps.userService, emailService: deps.emailService }))
    app.use('/api', createChatRouter({
        userService: deps.userService,
        defaultApiUrl: deps.defaultApiUrl,
        defaultApiKey: deps.defaultApiKey
    }))
    app.use('/api', createUserRouter({ userService: deps.userService }))
    app.use('/api', createAdminRouter({ userService: deps.userService }))
    
    // Multi-Provider API
    app.use('/api', createMultiProviderRouter({ userService: deps.userService }))

    // OpenAI compatible
    app.use('/v1', createOpenAiRouter({ ollamaProvider: deps.ollamaProvider }))

    // 靜態檔案 serve（Docker/雲端用 SERVE_STATIC=true，本機 npm start 用 vite preview）
    if (process.env.SERVE_STATIC === 'true') {
        const distPath = path.join(path.dirname(path.dirname(__dirname)), 'dist')
        app.use(express.static(distPath))
        app.use((req, res, next) => {
            if (!req.path.startsWith('/api') && !req.path.startsWith('/v1')) {
                return res.sendFile(path.join(distPath, 'index.html'))
            }
            next()
        })
    }

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
