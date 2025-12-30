import { Router, type Response } from 'express'
import type UserService from '../services/userService.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

export function createUserRouter(deps: { userService: UserService }) {
    const { userService } = deps
    const router = Router()

    // 獲取用戶的對話列表
    router.get('/conversations', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const conversations = userService.getUserConversations(req.user!.userId)
            res.json({ conversations })
        } catch (error) {
            console.error('Get conversations error:', error)
            res.status(500).json({ error: '獲取對話列表失敗' })
        }
    })

    // 保存用戶的對話
    router.post('/conversations', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const { conversations } = (req as any).body
            userService.updateUserConversations(req.user!.userId, conversations)
            res.json({ message: '對話已保存' })
        } catch (error) {
            console.error('Save conversations error:', error)
            res.status(500).json({ error: '保存對話失敗' })
        }
    })

    // 獲取用戶設定
    router.get('/user/settings', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const userId = req.user!.userId
            let settings = userService.getUserSettings(userId)
            if (!settings) {
                return res.status(404).json({ error: '用戶不存在' })
            }

            // 深度克隆以避免修改原始物件
            settings = JSON.parse(JSON.stringify(settings))

            // 如果不是管理員且沒有自己的 API 設定，嘗試獲取管理員的設定作為補充
            const currentUser = userService['users'].find((u: any) => u.id === userId)
            if (currentUser && currentUser.role !== 'admin') {
                const adminUser = userService['users'].find((u: any) => u.role === 'admin')
                if (adminUser && adminUser.settings) {
                    if (!settings!.apiUrl || settings!.apiUrl === '') {
                        settings!.apiUrl = adminUser.settings.apiUrl
                    }
                    if (!settings!.apiKey || settings!.apiKey === '') {
                        settings!.apiKey = adminUser.settings.apiKey
                    }
                }
            }

            res.json({ settings })
        } catch (error) {
            console.error('Get user settings error:', error)
            res.status(500).json({ error: '獲取用戶設定失敗' })
        }
    })

    // 更新用戶設定
    router.post('/user/settings', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const { settings } = (req as any).body
            const updatedSettings = userService.updateUserSettings(req.user!.userId, settings)
            if (!updatedSettings) {
                return res.status(404).json({ error: '用戶不存在' })
            }
            res.json({ settings: updatedSettings })
        } catch (error) {
            console.error('Update user settings error:', error)
            res.status(500).json({ error: '更新用戶設定失敗' })
        }
    })

    // 更改密碼
    router.post('/user/change-password', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { currentPassword, newPassword } = (req as any).body

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: '當前密碼和新密碼不能為空' })
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: '新密碼長度至少需要6個字符' })
            }

            const result = await userService.changePassword(req.user!.userId, currentPassword, newPassword)
            res.json(result)
        } catch (error: any) {
            console.error('Change password error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    return router
}
