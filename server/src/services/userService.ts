import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface UserSettings {
    language: string
    theme: string
    model: string
    temperature: number
    maxTokens: number
    apiUrl: string
    apiKey: string
    topP: number
    topK: number
    showTokenStats: boolean
    authMethod?: 'api-key' | 'google-service-account' | 'azure-entra-id' | 'aws-iam'
    oauthConfig?: {
        googleJson?: string
        azureTenantId?: string
        azureClientId?: string
        azureClientSecret?: string
        awsAccessKey?: string
        awsSecretKey?: string
        awsRegion?: string
        awsSessionToken?: string
    }
}

export interface UserRecord {
    id: string
    email: string
    password: string
    role: 'admin' | 'user'
    enable: boolean
    emailVerified: boolean
    emailVerificationToken: string | null
    emailVerificationTokenExpiry: string | null
    createdAt: string
    lastLoginAt: string | null
    settings: UserSettings
}

export interface SessionRecord {
    userId: string
    email: string
    role: 'admin' | 'user'
    createdAt: string
    expiresAt: string
}

class UserService {
    usersFile: string
    sessionsFile: string
    conversationsDir: string
    users: UserRecord[]
    sessions: Record<string, SessionRecord>
    private readonly ENCRYPTION_KEY = Buffer.from('4a616d6573426f6e643030374c4c4d43686174526f636b733132333435363738', 'hex') // 32 bytes
    private readonly IV_LENGTH = 16

    constructor() {
        this.usersFile = path.join(__dirname, '..', '..', 'data', 'users.json')
        this.sessionsFile = path.join(__dirname, '..', '..', 'data', 'sessions.json')
        this.conversationsDir = path.join(__dirname, '..', '..', 'data', 'conversations')
        this.users = []
        this.sessions = {}
        this.ensureDataDirectory()
        this.loadUsers()
        this.loadSessions()
    }

    ensureDataDirectory() {
        const dataDir = path.join(__dirname, '..', '..', 'data')
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true })
        }

        // 確保對話目錄存在
        if (!fs.existsSync(this.conversationsDir)) {
            fs.mkdirSync(this.conversationsDir, { recursive: true })
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
    async register(email: string, password: string, language = 'zh-TW') {
        // 檢查 email 是否已存在
        if (this.users.find(user => user.email === email)) {
            throw new Error('Email 已存在')
        }

        // 檢查是否為首位用戶（成為 admin）
        const isFirstUser = this.users.length === 0
        const role: 'admin' | 'user' = isFirstUser ? 'admin' : 'user'

        // 哈希密碼
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const user: UserRecord = {
            id: crypto.randomUUID(),
            email,
            password: hashedPassword,
            role,
            enable: isFirstUser ? true : false, // 首位用戶自動啟用，其他用戶需要驗證 Email 後才能啟用
            emailVerified: isFirstUser ? true : false, // 首位用戶自動驗證，其他註冊用戶需要驗證 Email
            emailVerificationToken: isFirstUser ? null : crypto.randomBytes(32).toString('hex'), // 驗證令牌，管理員不需要
            emailVerificationTokenExpiry: isFirstUser ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 過期時間，管理員不需要
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
            settings: {
                language: language,
                theme: 'auto',
                model: '',
                temperature: 0.7,
                maxTokens: 8192,
                apiUrl: '',
                apiKey: '',
                topP: 0.9,
                topK: 40,
                showTokenStats: true
            }
        }

        this.users.push(user)
        this.saveUsers()

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            emailVerificationToken: user.emailVerificationToken
        }
    }

    // 用戶登入
    async login(email: string, password: string) {
        const user = this.users.find(user => user.email === email)
        if (!user) {
            throw new Error('Email 或密碼錯誤')
        }

        // 檢查用戶是否已驗證 Email
        if (!user.emailVerified) {
            throw new Error('請先驗證您的 Email 地址')
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
        const sessionData: SessionRecord = {
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
    validateSession(token: string): SessionRecord | null {
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

    // 獲取用戶對話文件路徑
    getUserConversationsFile(email: string) {
        // 將 email 中的特殊字符替換為安全字符
        const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_')
        return path.join(this.conversationsDir, `${safeEmail}.json`)
    }

    // 載入用戶的對話記錄
    loadUserConversations(email: string) {
        const filePath = this.getUserConversationsFile(email)
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8')
                return JSON.parse(data)
            }
            return []
        } catch (error) {
            console.error('Error loading user conversations:', error)
            return []
        }
    }

    // 保存用戶的對話記錄
    saveUserConversations(email: string, conversations: any) {
        const filePath = this.getUserConversationsFile(email)
        try {
            fs.writeFileSync(filePath, JSON.stringify(conversations, null, 2))
        } catch (error) {
            console.error('Error saving user conversations:', error)
        }
    }

    // 更新用戶的對話
    updateUserConversations(userId: string, conversations: any) {
        const user = this.users.find(user => user.id === userId)
        if (user) {
            // 保存到單獨的文件
            this.saveUserConversations(user.email, conversations)
        }
    }

    // 獲取用戶的對話列表
    getUserConversations(userId: string) {
        const user = this.users.find(user => user.id === userId)
        if (user) {
            return this.loadUserConversations(user.email)
        }
        return []
    }

    // 獲取管理員設定
    getAdminSettings() {
        const admin = this.users.find(u => u.role === 'admin')
        return admin ? this.getUserSettings(admin.id) : null
    }

    // 獲取用戶設定
    getUserSettings(userId: string) {
        const user = this.users.find(user => user.id === userId)
        if (!user) return null

        // 為了不影響 memory 中的原始資料，我們返回一個副本並解密其中的 apiKey 與 oauthConfig 敏感欄位
        const settings = { ...user.settings }
        if (settings.apiKey) {
            settings.apiKey = this.decrypt(settings.apiKey)
        }
        if (settings.oauthConfig && typeof settings.oauthConfig === 'object') {
            const conf = { ...settings.oauthConfig }
            if (conf.googleJson) conf.googleJson = this.decrypt(conf.googleJson)
            if (conf.azureClientSecret) conf.azureClientSecret = this.decrypt(conf.azureClientSecret)
            if (conf.awsSecretKey) conf.awsSecretKey = this.decrypt(conf.awsSecretKey)
            settings.oauthConfig = conf
        }
        return settings
    }

    // 加密方法 (AES-256-CBC)
    private encrypt(text: string): string {
        if (!text) return ''
        try {
            const iv = crypto.randomBytes(this.IV_LENGTH)
            const cipher = crypto.createCipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv)
            let encrypted = cipher.update(text)
            encrypted = Buffer.concat([encrypted, cipher.final()])
            return iv.toString('hex') + ':' + encrypted.toString('hex')
        } catch (e) {
            console.error('加密 apiKey 失敗:', e)
            return text
        }
    }

    // 解解方法
    private decrypt(text: string): string {
        if (!text) return ''
        // 如果不包含冒號，表示是舊的明文資料，直接返回
        if (!text.includes(':')) return text

        try {
            const textParts = text.split(':')
            const iv = Buffer.from(textParts.shift()!, 'hex')
            const encryptedText = Buffer.from(textParts.join(':'), 'hex')
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv)
            let decrypted = decipher.update(encryptedText)
            decrypted = Buffer.concat([decrypted, decipher.final()])
            return decrypted.toString()
        } catch (e) {
            console.error('解密 apiKey 失敗 (可能不是有效的加密格式):', e)
            return text
        }
    }

    // 更新用戶設定
    updateUserSettings(userId: string, settings: any) {
        const user = this.users.find(user => user.id === userId)
        if (user) {
            // 如果用戶不是 admin，則過濾掉敏感配置
            if (user.role !== 'admin') {
                delete settings.apiUrl
                delete settings.apiKey
                delete settings.authMethod
                delete settings.oauthConfig
            }

            // 如果有設定 apiKey，存入前先加密
            if (settings.apiKey !== undefined && settings.apiKey !== null) {
                settings.apiKey = this.encrypt(settings.apiKey)
            }

            // 如果有設定 oauthConfig 的敏感欄位，存入前先加密
            if (settings.oauthConfig && typeof settings.oauthConfig === 'object') {
                const conf = { ...settings.oauthConfig }
                if (conf.googleJson) conf.googleJson = this.encrypt(conf.googleJson)
                if (conf.azureClientSecret) conf.azureClientSecret = this.encrypt(conf.azureClientSecret)
                if (conf.awsSecretKey) conf.awsSecretKey = this.encrypt(conf.awsSecretKey)
                settings.oauthConfig = conf
            }

            user.settings = { ...user.settings, ...settings }
            this.saveUsers()

            // 返回給前端時解密
            return this.getUserSettings(userId)
        }
        return null
    }

    // 登出
    logout(token?: string) {
        if (token && this.sessions[token]) {
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
    updateUserRole(userId: string, newRole: 'admin' | 'user') {
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

    // 管理員直接新增用戶（跳過 Email 驗證流程）
    async adminCreateUser(email: string, password: string, role: 'admin' | 'user' = 'user') {
        if (this.users.find(u => u.email === email)) {
            throw new Error('Email 已存在')
        }
        if (password.length < 6) {
            throw new Error('密碼長度至少需要 6 個字符')
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user: UserRecord = {
            id: crypto.randomUUID(),
            email,
            password: hashedPassword,
            role,
            enable: true,
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationTokenExpiry: null,
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
            settings: {
                language: 'zh-TW',
                theme: 'auto',
                model: '',
                temperature: 0.7,
                maxTokens: 8192,
                apiUrl: '',
                apiKey: '',
                topP: 0.9,
                topK: 40,
                showTokenStats: true
            }
        }
        this.users.push(user)
        this.saveUsers()
        return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt }
    }

    // 管理員編輯用戶（改 email / 密碼 / 角色）
    async adminUpdateUser(userId: string, updates: { email?: string; password?: string; role?: 'admin' | 'user' }) {
        const user = this.users.find(u => u.id === userId)
        if (!user) throw new Error('用戶不存在')

        if (updates.email && updates.email !== user.email) {
            if (this.users.find(u => u.email === updates.email)) {
                throw new Error('Email 已被其他用戶使用')
            }
            user.email = updates.email
        }

        if (updates.password) {
            if (updates.password.length < 6) throw new Error('密碼長度至少需要 6 個字符')
            user.password = await bcrypt.hash(updates.password, 10)
        }

        if (updates.role && updates.role !== user.role) {
            if (user.role === 'admin' && updates.role === 'user') {
                const adminCount = this.users.filter(u => u.role === 'admin').length
                if (adminCount <= 1) throw new Error('至少需要一個管理員')
            }
            user.role = updates.role
        }

        this.saveUsers()
        return { id: user.id, email: user.email, role: user.role }
    }

    // 刪除用戶（管理員功能）
    deleteUser(userId: string) {
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
    toggleUserEnable(userId: string) {
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
    isAdmin(userId: string) {
        const user = this.users.find(user => user.id === userId)
        return user && user.role === 'admin'
    }

    // 獲取當前用戶ID（從會話中）
    getCurrentUserId() {
        // 這個方法需要從請求中獲取，但這裡先返回null
        // 實際使用時會從中間件傳遞
        return null
    }

    // 驗證 Email
    verifyEmail(token: string) {
        if (!token || token === 'null') {
            throw new Error('無效或過期的驗證鏈接')
        }
        const user = this.users.find(user => user.emailVerificationToken === token)
        if (!user) {
            throw new Error('無效或過期的驗證鏈接')
        }

        if (user.emailVerified) {
            throw new Error('Email 已經驗證過了')
        }

        // 檢查令牌是否過期
        if (user.emailVerificationTokenExpiry && new Date() > new Date(user.emailVerificationTokenExpiry)) {
            throw new Error('驗證鏈接已過期，請重新註冊帳號')
        }

        user.emailVerified = true
        user.enable = true // 驗證後自動啟用帳號
        user.emailVerificationToken = null // 清除驗證令牌
        user.emailVerificationTokenExpiry = null // 清除過期時間
        this.saveUsers()

        return user
    }

    // 重新發送驗證 Email
    resendVerificationEmail(email: string) {
        const user = this.users.find(user => user.email === email)
        if (!user) {
            throw new Error('用戶不存在')
        }

        if (user.emailVerified) {
            throw new Error('Email 已經驗證過了')
        }

        // 生成新的驗證令牌和過期時間
        user.emailVerificationToken = crypto.randomBytes(32).toString('hex')
        user.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        this.saveUsers()

        return user.emailVerificationToken
    }

    // 更改密碼
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = this.users.find(user => user.id === userId)
        if (!user) {
            throw new Error('用戶不存在')
        }

        // 驗證當前密碼
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password)
        if (!isValidCurrentPassword) {
            throw new Error('當前密碼不正確')
        }

        // 檢查新密碼長度
        if (newPassword.length < 6) {
            throw new Error('新密碼長度至少需要6個字符')
        }

        // 哈希新密碼
        const saltRounds = 10
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

        // 更新密碼
        user.password = hashedNewPassword
        this.saveUsers()

        return { success: true, message: '密碼更改成功' }
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
