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
        const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

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
