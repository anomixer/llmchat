import { Router, type Response } from 'express'
import type UserService from '../services/userService.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

export function createAdminRouter(deps: { userService: UserService }) {
    const { userService } = deps
    const router = Router()

    // 管理員 API - 獲取所有用戶
    router.get('/admin/users', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            if (!userService.isAdmin(req.user!.userId)) {
                return res.status(403).json({ error: '需要管理員權限' })
            }

            const users = userService.getAllUsers()
            res.json({ users })
        } catch (error) {
            console.error('Get users error:', error)
            res.status(500).json({ error: '獲取用戶列表失敗' })
        }
    })

    // 管理員 API - 更新用戶角色
    router.put('/admin/users/:userId/role', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            if (!userService.isAdmin(req.user!.userId)) {
                return res.status(403).json({ error: '需要管理員權限' })
            }

            const { userId } = req.params
            const { role } = (req as any).body

            if (!['admin', 'user'].includes(role)) {
                return res.status(400).json({ error: '無效的角色' })
            }

            const user = userService.updateUserRole(userId, role)
            res.json({ user: { id: user.id, email: user.email, role: user.role } })
        } catch (error: any) {
            console.error('Update user role error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    // 管理員 API - 刪除用戶
    router.delete('/admin/users/:userId', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            if (!userService.isAdmin(req.user!.userId)) {
                return res.status(403).json({ error: '需要管理員權限' })
            }

            const { userId } = req.params
            const user = userService.deleteUser(userId)
            res.json({ message: '用戶已刪除', user: { id: user.id, email: user.email } })
        } catch (error: any) {
            console.error('Delete user error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    // 管理員 API - 切換用戶啟用狀態
    router.put('/admin/users/:userId/toggle-enable', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            if (!userService.isAdmin(req.user!.userId)) {
                return res.status(403).json({ error: '需要管理員權限' })
            }

            const { userId } = req.params
            const user = userService.toggleUserEnable(userId)
            res.json({
                message: `用戶已${user.enable ? '啟用' : '禁用'}`,
                user: {
                    id: user.id,
                    email: user.email,
                    enable: user.enable
                }
            })
        } catch (error: any) {
            console.error('Toggle user enable error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    return router
}
