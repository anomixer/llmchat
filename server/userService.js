import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class UserService {
    constructor() {
        this.usersFile = path.join(__dirname, '..', 'data', 'users.json')
        this.sessionsFile = path.join(__dirname, '..', 'data', 'sessions.json')
        this.ensureDataDirectory()
        this.loadUsers()
        this.loadSessions()
    }

    ensureDataDirectory() {
        const dataDir = path.join(__dirname, '..', 'data')
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true })
        }
    }

    loadUsers() {
        try {
            if (fs.existsSync(this.usersFile)) {
                const data = fs.readFileSync(this.usersFile, 'utf8')
                this.users = JSON.parse(data)
            } else {
                this.users = []
                this.saveUsers()
            }
        } catch (error) {
            console.error('Error loading users:', error)
            this.users = []
        }
    }

    saveUsers() {
        try {
            fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2))
        } catch (error) {
            console.error('Error saving users:', error)
        }
    }

    loadSessions() {
        try {
            if (fs.existsSync(this.sessionsFile)) {
                const data = fs.readFileSync(this.sessionsFile, 'utf8')
                this.sessions = JSON.parse(data)
            } else {
                this.sessions = {}
                this.saveSessions()
            }
        } catch (error) {
            console.error('Error loading sessions:', error)
            this.sessions = {}
        }
    }

    saveSessions() {
        try {
            fs.writeFileSync(this.sessionsFile, JSON.stringify(this.sessions, null, 2))
        } catch (error) {
            console.error('Error saving sessions:', error)
        }
    }

    // 註冊新用戶
    async register(email, password) {
        // 檢查 email 是否已存在
        if (this.users.find(user => user.email === email)) {
            throw new Error('Email 已存在')
        }

        // 檢查是否為首位用戶（成為 admin）
        const isFirstUser = this.users.length === 0
        const role = isFirstUser ? 'admin' : 'user'

        // 哈希密碼
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const user = {
            id: crypto.randomUUID(),
            email,
            password: hashedPassword,
            role,
            enable: true, // 預設啟用新用戶
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
            conversations: []
        }

        this.users.push(user)
        this.saveUsers()

        return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt }
    }

    // 用戶登入
    async login(email, password) {
        const user = this.users.find(user => user.email === email)
        if (!user) {
            throw new Error('Email 或密碼錯誤')
        }

        // 檢查用戶是否被啟用
        if (!user.enable) {
            throw new Error('帳號已被停權，請聯繫管理員')
        }

        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            throw new Error('Email 或密碼錯誤')
        }

        // 更新最後登入時間
        user.lastLoginAt = new Date().toISOString()
        this.saveUsers()

        // 生成會話令牌
        const sessionToken = crypto.randomBytes(32).toString('hex')
        const sessionData = {
            userId: user.id,
            email: user.email,
            role: user.role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天後過期
        }

        this.sessions[sessionToken] = sessionData
        this.saveSessions()

        return {
            token: sessionToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt
            }
        }
    }

    // 驗證會話令牌
    validateSession(token) {
        const session = this.sessions[token]
        if (!session) {
            return null
        }

        // 檢查會話是否過期
        if (new Date() > new Date(session.expiresAt)) {
            delete this.sessions[token]
            this.saveSessions()
            return null
        }

        // 檢查用戶是否仍然存在且啟用
        const user = this.users.find(u => u.id === session.userId)
        if (!user || !user.enable) {
            delete this.sessions[token]
            this.saveSessions()
            return null
        }

        return session
    }

    // 獲取用戶資料
    getUser(userId) {
        return this.users.find(user => user.id === userId)
    }

    // 更新用戶的對話
    updateUserConversations(userId, conversations) {
        const user = this.users.find(user => user.id === userId)
        if (user) {
            user.conversations = conversations
            this.saveUsers()
        }
    }

    // 登出
    logout(token) {
        if (this.sessions[token]) {
            delete this.sessions[token]
            this.saveSessions()
            return true
        }
        return false
    }

    // 獲取所有用戶（管理員功能）
    getAllUsers() {
        return this.users.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            enable: user.enable,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        }))
    }

    // 更新用戶角色（管理員功能）
    updateUserRole(userId, newRole) {
        if (!['admin', 'user'].includes(newRole)) {
            throw new Error('無效的角色')
        }

        const user = this.users.find(user => user.id === userId)
        if (!user) {
            throw new Error('用戶不存在')
        }

        // 確保至少有一個管理員
        if (user.role === 'admin' && newRole === 'user') {
            const adminCount = this.users.filter(u => u.role === 'admin').length
            if (adminCount <= 1) {
                throw new Error('至少需要一個管理員')
            }
        }

        user.role = newRole
        this.saveUsers()
        return user
    }

    // 刪除用戶（管理員功能）
    deleteUser(userId) {
        const userIndex = this.users.findIndex(user => user.id === userId)
        if (userIndex === -1) {
            throw new Error('用戶不存在')
        }

        const user = this.users[userIndex]

        // 確保至少有一個管理員
        if (user.role === 'admin') {
            const adminCount = this.users.filter(u => u.role === 'admin').length
            if (adminCount <= 1) {
                throw new Error('至少需要一個管理員')
            }
        }

        // 刪除用戶的所有會話
        for (const [token, session] of Object.entries(this.sessions)) {
            if (session.userId === userId) {
                delete this.sessions[token]
            }
        }
        this.saveSessions()

        this.users.splice(userIndex, 1)
        this.saveUsers()
        return user
    }

    // 切換用戶啟用狀態（管理員功能）
    toggleUserEnable(userId) {
        const user = this.users.find(user => user.id === userId)
        if (!user) {
            throw new Error('用戶不存在')
        }

        // 不能禁用自己
        const currentUserId = this.getCurrentUserId()
        if (currentUserId === userId) {
            throw new Error('不能禁用自己的帳號')
        }

        user.enable = !user.enable
        this.saveUsers()

        // 如果禁用用戶，刪除其所有會話
        if (!user.enable) {
            for (const [token, session] of Object.entries(this.sessions)) {
                if (session.userId === userId) {
                    delete this.sessions[token]
                }
            }
            this.saveSessions()
        }

        return user
    }

    // 檢查用戶是否為管理員
    isAdmin(userId) {
        const user = this.users.find(user => user.id === userId)
        return user && user.role === 'admin'
    }

    // 獲取當前用戶ID（從會話中）
    getCurrentUserId() {
        // 這個方法需要從請求中獲取，但這裡先返回null
        // 實際使用時會從中間件傳遞
        return null
    }

    // 清理過期的會話
    cleanupExpiredSessions() {
        const now = new Date()
        let cleaned = false

        for (const [token, session] of Object.entries(this.sessions)) {
            if (new Date(session.expiresAt) < now) {
                delete this.sessions[token]
                cleaned = true
            }
        }

        if (cleaned) {
            this.saveSessions()
        }
    }
}

export default UserService