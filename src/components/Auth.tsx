import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

interface AuthProps {
    onLogin: (email: string, password: string) => Promise<void>
    onRegister: (email: string, password: string) => Promise<{ verificationUrl: string; emailSent: boolean; alreadyExists?: boolean }>
    onResendVerification: (email: string) => Promise<{ verificationUrl: string; emailSent: boolean }>
    isLoading: boolean
    error: string | null
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onRegister, onResendVerification, isLoading, error }) => {
    const { t } = useTranslation()
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [registrationSuccess, setRegistrationSuccess] = useState<{ email: string; verificationUrl: string; emailSent: boolean } | null>(null)
    const [resendSuccess, setResendSuccess] = useState<{ email: string; verificationUrl: string; emailSent: boolean } | null>(null)
    const [showRegistrationMessage, setShowRegistrationMessage] = useState(false)
    const [isDuplicateRegistration, setIsDuplicateRegistration] = useState(false)
    const [smtpEnabled, setSmtpEnabled] = useState(true) // 預設為 true，避免載入時閃爍

    // 載入配置
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await fetch('/api/config')
                if (response.ok) {
                    const config = await response.json()
                    setSmtpEnabled(config.smtpEnabled || false)
                } else {
                    setSmtpEnabled(false)
                }
            } catch (error) {
                setSmtpEnabled(false) // 載入失敗時禁用註冊
            }
        }

        loadConfig()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        console.log('handleSubmit called, isLogin:', isLogin, 'email:', email, 'password:', password)

        if (!email.trim() || !password.trim()) {
            console.log('Email or password is empty')
            return
        }

        if (!isLogin && password !== confirmPassword) {
            console.log('Passwords do not match')
            return
        }

        try {
            if (isLogin) {
                await onLogin(email.trim(), password)
            } else {
                // 調用註冊API
                const result = await onRegister(email.trim(), password)

                if (result.alreadyExists) {
                    // 重複註冊，顯示特殊訊息
                    setIsDuplicateRegistration(true)
                    setShowRegistrationMessage(true)
                    // 不清空表單，讓用戶知道這個email已經存在
                    // 5秒後自動返回登入畫面
                    setTimeout(() => {
                        setShowRegistrationMessage(false)
                        setIsDuplicateRegistration(false)
                        setIsLogin(true)
                    }, 5000)
                } else {
                    // 成功註冊
                    console.log('Setting showRegistrationMessage to true')
                    setIsDuplicateRegistration(false)
                    setShowRegistrationMessage(true)
                    // 清空表單
                    setEmail('')
                    setPassword('')
                    setConfirmPassword('')

                    // 5秒後自動返回登入畫面
                    setTimeout(() => {
                        setShowRegistrationMessage(false)
                        setIsLogin(true)
                    }, 5000)
                }
            }
        } catch (error) {
            // 錯誤由父組件處理
        }
    }

    const handleResendVerification = async () => {
        if (!email.trim()) return

        try {
            const result = await onResendVerification(email.trim())
            setResendSuccess({
                email: email.trim(),
                verificationUrl: result.verificationUrl,
                emailSent: result.emailSent
            })
        } catch (error) {
            // 錯誤由父組件處理
        }
    }

    const isFormValid = email.trim() && password.trim() &&
        (isLogin || password === confirmPassword)

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4">
            <div className="max-w-md w-full space-y-8">
                {/* 標題 */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        LLMChat
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {t('auth.welcome')}
                    </p>
                </div>

                {/* 註冊成功臨時訊息 */}
                {showRegistrationMessage && (
                    <div className={`${isDuplicateRegistration
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        } rounded-2xl p-6 mb-6 animate-pulse`}>
                        <div className="text-center">
                            <div className={`w-12 h-12 ${isDuplicateRegistration
                                ? 'bg-red-100 dark:bg-red-800'
                                : 'bg-green-100 dark:bg-green-800'
                                } rounded-full flex items-center justify-center mx-auto mb-4`}>
                                <svg className={`w-6 h-6 ${isDuplicateRegistration
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-green-600 dark:text-green-400'
                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                        isDuplicateRegistration
                                            ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                            : "M5 13l4 4L19 7"
                                    } />
                                </svg>
                            </div>
                            <h3 className={`text-lg font-semibold ${isDuplicateRegistration
                                ? 'text-red-800 dark:text-red-200'
                                : 'text-green-800 dark:text-green-200'
                                } mb-2`}>
                                {isDuplicateRegistration ? '此 Email 已經註冊過了' : t('auth.registrationSuccess')}
                            </h3>
                            <p className={`text-sm ${isDuplicateRegistration
                                ? 'text-red-700 dark:text-red-300'
                                : 'text-green-700 dark:text-green-300'
                                } mb-4`}>
                                {isDuplicateRegistration ? '請使用其他 Email 註冊，或直接登入' : '正在返回登入頁面...'}
                            </p>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                                <div className={`h-2 rounded-full animate-pulse ${isDuplicateRegistration
                                    ? 'bg-red-600'
                                    : 'bg-green-600'
                                    }`} style={{ width: '100%' }}></div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRegistrationMessage(false)
                                    setIsDuplicateRegistration(false)
                                    setIsLogin(true)
                                }}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                返回登入
                            </button>
                        </div>
                    </div>
                )}

                {/* 註冊成功提示 */}
                {registrationSuccess && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 mb-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                                {t('auth.registrationSuccess')}
                            </h3>
                            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                                {registrationSuccess.emailSent
                                    ? `${t('auth.verificationEmailSent')} ${registrationSuccess.email}`
                                    : `${t('auth.verificationLinkGenerated')} ${registrationSuccess.email}`
                                }
                            </p>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t('auth.verificationLink')}</p>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={registrationSuccess.verificationUrl}
                                        readOnly
                                        className="flex-1 text-xs font-mono bg-white dark:bg-gray-700 p-2 rounded border text-gray-900 dark:text-white"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(registrationSuccess.verificationUrl)
                                            alert(t('auth.linkCopied'))
                                        }}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    >
                                        {t('auth.copyLink')}
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400 mb-4">
                                {t('auth.verificationInstructions')}
                            </p>
                            <button
                                onClick={() => {
                                    setRegistrationSuccess(null)
                                    setShowRegistrationMessage(false)
                                    setIsLogin(true)
                                }}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                {t('auth.backToLogin')}
                            </button>
                        </div>
                    </div>
                )}

                {/* 重新發送驗證成功提示 */}
                {resendSuccess && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                {t('auth.resendVerificationSuccess')}
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                                {resendSuccess.emailSent
                                    ? `${t('auth.verificationEmailSent')} ${resendSuccess.email}`
                                    : `${t('auth.verificationLinkGenerated')} ${resendSuccess.email}`
                                }
                            </p>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t('auth.verificationLink')}</p>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={resendSuccess.verificationUrl}
                                        readOnly
                                        className="flex-1 text-xs font-mono bg-white dark:bg-gray-700 p-2 rounded border text-gray-900 dark:text-white"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(resendSuccess.verificationUrl)
                                            alert(t('auth.linkCopied'))
                                        }}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    >
                                        {t('auth.copyLink')}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setResendSuccess(null)}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                {t('auth.backToLogin')}
                            </button>
                        </div>
                    </div>
                )}

                {/* 認證表單 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                    {/* 切換登入/註冊 - 只有在SMTP啟用時才顯示註冊選項 */}
                    {smtpEnabled ? (
                        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-6">
                            <button
                                type="button"
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${isLogin
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {t('auth.login')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${!isLogin
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {t('auth.register')}
                            </button>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                            註冊功能未啟用
                                        </h4>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                            系統管理員尚未配置郵件服務，無法發送驗證郵件。如需註冊帳號，請聯繫管理員。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 表單 */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('auth.email')}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder={t('auth.emailPlaceholder')}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        {/* 密碼 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('auth.password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    placeholder={t('auth.passwordPlaceholder')}
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* 確認密碼（僅註冊時顯示） */}
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('auth.confirmPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                        placeholder={t('auth.confirmPasswordPlaceholder')}
                                        disabled={isLoading}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {password && confirmPassword && password !== confirmPassword && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                        {t('auth.passwordMismatch')}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 錯誤訊息 */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {error}
                                </p>
                                {error === '請先驗證您的 Email 地址' && (
                                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                                        <button
                                            onClick={handleResendVerification}
                                            disabled={isLoading}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? t('auth.processing') : t('auth.resendVerification')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 提交按鈕 */}
                        <button
                            type="submit"
                            disabled={!isFormValid || isLoading}
                            className={`w-full flex items-center justify-center py-3 px-4 rounded-lg text-white font-medium transition-colors ${isFormValid && !isLoading
                                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                : 'bg-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>{t('auth.processing')}</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                                    <span>{isLogin ? t('auth.login') : t('auth.register')}</span>
                                </div>
                            )}
                        </button>
                    </form>

                    {/* 底部提示 - 只有在SMTP啟用時才顯示切換提示 */}
                    {smtpEnabled && (
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                                >
                                    {isLogin ? t('auth.register') : t('auth.login')}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}