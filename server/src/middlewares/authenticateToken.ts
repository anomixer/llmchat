import type { NextFunction, Request, Response } from 'express'
import type UserService from '../services/userService.js'

export type AuthedRequest = Request & {
    user?: {
        userId: string
        email: string
        role: string
        createdAt: string
        expiresAt: string
    }
}

export function authenticateToken(userService: UserService) {
    return (req: AuthedRequest, res: Response, next: NextFunction) => {
        const authHeader = req.headers['authorization']
        let token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

        // 如果 Header 中沒有 token，試著從 Query 參數中取得（適用於 window.open 等 GET 請求）
        if (!token && req.query.token) {
            token = req.query.token as string
        }

        if (!token) {
            return res.status(401).json({ error: '缺少認證令牌' })
        }

        const session = userService.validateSession(token)
        if (!session) {
            return res.status(401).json({ error: '無效或過期的認證令牌' })
        }

        req.user = session
        next()
    }
}
