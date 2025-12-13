import { Router, type Request, type Response } from 'express'
import type UserService from '../services/userService.js'
import type EmailService from '../services/emailService.js'
import { normalizeLanguage } from '../prompts.js'
import { getVerificationPageHTML, verificationErrorMessages } from '../templates/verificationPage.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

export function createAuthRouter(deps: { userService: UserService; emailService: EmailService }) {
    const { userService, emailService } = deps
    const router = Router()

    // 用戶註冊
    router.post('/auth/register', async (req: Request, res: Response) => {
        try {
            const { email, password, language } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email 和密碼不能為空' })
            }

            // 簡單的 email 格式驗證
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: '請輸入有效的 Email 地址' })
            }

            if (password.length < 6) {
                return res.status(400).json({ error: '密碼至少6個字符' })
            }

            const userLanguage = normalizeLanguage(language)
            const user = await userService.register(email, password, userLanguage)

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const verificationUrl = `${frontendUrl}/api/auth/verify-email/${user.emailVerificationToken}?lang=${userLanguage}`

            let emailSent = false
            try {
                await emailService.sendVerificationEmail(email, verificationUrl, user.email.split('@')[0], userLanguage)
                emailSent = true
                console.log('Verification email sent to:', email)
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError)
            }

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt
                },
                verificationUrl,
                emailSent
            })
        } catch (error: any) {
            console.error('Registration error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    // 用戶登入
    router.post('/auth/login', async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email 和密碼不能為空' })
            }

            const result = await userService.login(email, password)
            res.json(result)
        } catch (error: any) {
            console.error('Login error:', error)
            res.status(401).json({ error: error.message })
        }
    })

    // 用戶登出
    router.post('/auth/logout', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            userService.logout(token)
            res.json({ message: '登出成功' })
        } catch (error) {
            console.error('Logout error:', error)
            res.status(500).json({ error: '登出失敗' })
        }
    })

    // 驗證會話
    router.get('/auth/verify', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        res.json({ user: req.user })
    })

    // Email 驗證
    router.get('/auth/verify-email/:token', (req: Request, res: Response) => {
        try {
            const { token } = req.params
            const language = normalizeLanguage(req.query.lang)

            userService.verifyEmail(token)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const html = getVerificationPageHTML(true, '', language, frontendUrl)

            res.set('Content-Type', 'text/html; charset=utf-8')
            res.send(html)

        } catch (error: any) {
            console.error('Email verification error:', error)

            const language = normalizeLanguage(req.query.lang)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

            let errorMessage = verificationErrorMessages[language].invalid
            if (typeof error.message === 'string' && (error.message.includes('過期') || error.message.includes('过期'))) {
                errorMessage = verificationErrorMessages[language].expired
            }

            const html = getVerificationPageHTML(false, errorMessage, language, frontendUrl)

            res.status(400)
            res.set('Content-Type', 'text/html; charset=utf-8')
            res.send(html)
        }
    })

    // 重新發送驗證 Email
    router.post('/auth/resend-verification', async (req: Request, res: Response) => {
        try {
            const { email, language } = req.body

            if (!email) {
                return res.status(400).json({ error: '請提供 Email 地址' })
            }

            const user = userService.users.find((u) => u.email === email)
            const userLanguage = normalizeLanguage(language || user?.settings?.language)

            const token = userService.resendVerificationEmail(email)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const verificationUrl = `${frontendUrl}/api/auth/verify-email/${token}?lang=${userLanguage}`

            let emailSent = false
            try {
                await emailService.sendVerificationEmail(email, verificationUrl, email.split('@')[0], userLanguage)
                emailSent = true
                console.log('Resend verification email sent to:', email)
            } catch (emailError) {
                console.error('Failed to resend verification email:', emailError)
            }

            res.json({
                message: emailSent ? '驗證郵件已重新發送' : '驗證鏈接已重新生成',
                verificationUrl,
                emailSent
            })
        } catch (error: any) {
            console.error('Resend verification error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    return router
}
