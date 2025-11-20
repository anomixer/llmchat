import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
    id: string
    email: string
    role: string
    createdAt: string
    lastLoginAt: string | null
}

interface AuthContextType {
    user: User | null
    token: string | null
    isLoading: boolean
    error: string | null
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    verifyAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true) // 初始加載狀態
    const [error, setError] = useState<string | null>(null)

    // 初始化時檢查本地存儲中的認證信息
    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem('authToken')
            if (savedToken) {
                setToken(savedToken)
                try {
                    await verifyAuth()
                } catch (error) {
                    console.error('Auto verification failed:', error)
                    // 如果自動驗證失敗，清除無效的 token
                    setToken(null)
                    localStorage.removeItem('authToken')
                }
            }
            setIsLoading(false)
        }

        initAuth()
    }, [])

    const login = async (email: string, password: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || '登入失敗')
            }

            setUser(data.user)
            setToken(data.token)
            localStorage.setItem('authToken', data.token)
        } catch (error) {
            setError(error instanceof Error ? error.message : '登入失敗')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const register = async (email: string, password: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || '註冊失敗')
            }

            setUser(data.user)
            setToken(data.token)
            localStorage.setItem('authToken', data.token)
        } catch (error) {
            setError(error instanceof Error ? error.message : '註冊失敗')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const logout = async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                })
            }
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            setUser(null)
            setToken(null)
            localStorage.removeItem('authToken')
            setIsLoading(false)
        }
    }

    const verifyAuth = async () => {
        if (!token) return

        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setUser(data.user)
            } else {
                // 認證失敗，靜默清除本地狀態（可能是會話過期或服務器重啟）
                console.log('Session expired or invalid, clearing local auth state')
                setUser(null)
                setToken(null)
                localStorage.removeItem('authToken')
            }
        } catch (error) {
            // 網路錯誤或其他問題，靜默清除狀態
            console.log('Auth verification failed, clearing local auth state')
            setUser(null)
            setToken(null)
            localStorage.removeItem('authToken')
        }
    }

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        verifyAuth,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}