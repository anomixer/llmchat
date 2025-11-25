import React, { useState, useEffect } from 'react'
import { Send, Bot, Settings, Trash2, Moon, Sun, Plus, MessageSquare, Download, Maximize2, Minimize2, LogOut, Users, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface User {
    id: string
    email: string
    role: string
    createdAt: string
    lastLoginAt: string | null
}

interface HeaderProps {
    isDarkMode: boolean
    isFullscreen: boolean
    showSettings: boolean
    showConversations: boolean
    settings: { model: string }
    conversations: Array<{ id: string; title: string }>
    availableModels: Array<{ id: string; name: string }>
    isLoadingModels?: boolean
    onToggleTheme: () => void
    onToggleFullscreen: () => void
    onToggleSettings: () => void
    onToggleModelOnly: () => void
    onToggleConversations: () => void
    onNewConversation: () => void
    onClearChat: () => void
    onExportConversation: (format: 'json' | 'markdown') => void
    onModelChange: (modelId: string) => void
    onLogout: () => void
    user: User
    onAdminView?: () => void
    isMobileView?: boolean
}

export const Header: React.FC<HeaderProps> = ({
    isDarkMode,
    isFullscreen,
    showSettings,
    showConversations,
    settings,
    conversations,
    availableModels,
    isLoadingModels = false,
    onToggleTheme,
    onToggleFullscreen,
    onToggleSettings,
    onToggleModelOnly,
    onToggleConversations,
    onNewConversation,
    onClearChat,
    onExportConversation,
    onModelChange,
    onLogout,
    user,
    onAdminView,
    isMobileView = false
}) => {
    const { t } = useTranslation()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // 監聽關閉手機選單事件
    useEffect(() => {
        const handleCloseMobileMenu = () => {
            setIsMobileMenuOpen(false)
        }

        window.addEventListener('closeMobileMenu', handleCloseMobileMenu)

        return () => window.removeEventListener('closeMobileMenu', handleCloseMobileMenu)
    }, [])

    return (
        <div className={`shadow-sm border-b px-4 py-3 flex items-center justify-between transition-colors ${isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
            } ${isMobileView ? 'fixed top-0 left-0 right-0 z-50' : ''}`}>
            <div className="flex items-center space-x-2">
                <Bot className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{t('app.title')} <span className={`text-xs font-extralight transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{t('app.version')}</span></h1>
                <div className="relative">
                    <button
                        onClick={() => {
                            const menu = document.getElementById('model-menu')
                            if (menu) menu.classList.toggle('hidden')
                        }}
                        className={`px-2 py-1 text-xs rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${isDarkMode
                            ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                            : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100'
                            }`}
                        title={t('header.model.openSettings')}
                        data-button="model"
                    >
                        <span>{isLoadingModels ? t('header.model.loading') : (settings.model || t('header.model.none'))}</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div
                        id="model-menu"
                        className={`absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg z-10 hidden border max-h-60 overflow-y-auto ${isDarkMode
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                            }`}
                    >
                        <div className="py-1">
                            {isLoadingModels ? (
                                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    {t('header.model.loading')}
                                </div>
                            ) : availableModels.length > 0 ? (
                                availableModels.map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            onModelChange(model.id)
                                            document.getElementById('model-menu')?.classList.add('hidden')
                                        }}
                                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${settings.model === model.id
                                            ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                                            : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100')
                                            }`}
                                    >
                                        {model.name}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    {t('header.model.noModels')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* 手機視圖：顯示收合選單 */}
            {isMobileView ? (
                <div className="relative">
                    <button
                        data-mobile-menu-button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        title={t('header.menu')}
                    >
                        <ChevronDown className={`h-5 w-5 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isMobileMenuOpen && (
                        <div data-mobile-menu className={`absolute right-0 top-full mt-2 w-64 rounded-md shadow-lg z-50 border ${isDarkMode
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                            }`}>
                            <div className="py-2">
                                {/* GitHub 連結 */}
                                <a
                                    href="https://github.com/anomixer/llmchat"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:bg-gray-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                >
                                    <img
                                        src="/github.svg"
                                        alt="GitHub"
                                        className={`h-4 w-4 ${isDarkMode ? 'filter invert' : ''}`}
                                    />
                                    <span>{t('header.github')}</span>
                                </a>
                                {/* 對話列表 */}
                                <button
                                    data-button="conversations"
                                    onClick={() => {
                                        onToggleConversations()
                                        setTimeout(() => {
                                            setIsMobileMenuOpen(false)
                                            window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                        }, 0)
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${showConversations
                                        ? (isDarkMode ? 'text-green-400 bg-gray-700' : 'text-green-800 bg-green-50')
                                        : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100')
                                        }`}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{t('header.conversations.button')}</span>
                                </button>
                                {/* 新對話 */}
                                <button
                                    onClick={() => {
                                        onNewConversation()
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-blue-400 hover:bg-gray-700'
                                        : 'text-blue-800 hover:bg-gray-100'
                                        }`}
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>{t('conversation.new')}</span>
                                </button>
                                {/* 導出 */}
                                <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                                <button
                                    onClick={() => {
                                        onExportConversation('json')
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:bg-gray-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <Download className="h-4 w-4" />
                                    <span>{t('conversation.export.json')}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        onExportConversation('markdown')
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:bg-gray-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <Download className="h-4 w-4" />
                                    <span>{t('conversation.export.markdown')}</span>
                                </button>
                                {/* 清除對話 */}
                                <button
                                    onClick={() => {
                                        onClearChat()
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:bg-gray-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>{t('conversation.clear.button')}</span>
                                </button>
                                {/* 主題切換 */}
                                <button
                                    onClick={() => {
                                        onToggleTheme()
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-yellow-400 hover:bg-gray-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                    <span>{isDarkMode ? t('header.theme.light') : t('header.theme.dark')}</span>
                                </button>
                                {/* 全螢幕切換 */}
                                <button
                                    onClick={() => {
                                        onToggleFullscreen()
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:bg-gray-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                    <span>{isFullscreen ? t('header.fullscreen.exit') : t('header.fullscreen.enter')}</span>
                                </button>
                                {/* 用戶信息 */}
                                <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                                <div className={`flex items-center justify-between px-4 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                    <span className="text-sm font-medium">{user.email}</span>
                                    {user.role === 'admin' && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white">
                                            {t('header.adminBadge')}
                                        </span>
                                    )}
                                </div>
                                {/* 管理按鈕 */}
                                {user.role === 'admin' && onAdminView && (
                                    <button
                                        onClick={() => {
                                            onAdminView()
                                            setIsMobileMenuOpen(false)
                                            window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                        }}
                                        className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                            ? 'text-purple-400 hover:bg-gray-700'
                                            : 'text-purple-800 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Users className="h-4 w-4" />
                                        <span>{t('header.adminButton')}</span>
                                    </button>
                                )}
                                {/* 登出 */}
                                <button
                                    onClick={() => {
                                        onLogout()
                                        setIsMobileMenuOpen(false)
                                        window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:bg-gray-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>{t('auth.logout')}</span>
                                </button>
                                {/* 設定 */}
                                <button
                                    data-button="settings"
                                    onClick={() => {
                                        onToggleSettings()
                                        setTimeout(() => {
                                            setIsMobileMenuOpen(false)
                                            // 發送事件通知App組件關閉手機選單
                                            window.dispatchEvent(new CustomEvent('closeMobileMenu'))
                                        }, 0)
                                    }}
                                    className={`flex items-center space-x-3 w-full text-left px-4 py-2 text-sm transition-colors ${showSettings
                                        ? (isDarkMode ? 'text-blue-400 bg-gray-700' : 'text-blue-800 bg-blue-50')
                                        : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100')
                                        }`}
                                >
                                    <Settings className="h-4 w-4" />
                                    <span>{t('header.settings.button')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* 桌面視圖：顯示所有按鈕 */
                <div className="flex items-center space-x-2">
                    {/* GitHub 連結 */}
                    <a
                        href="https://github.com/anomixer/llmchat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-1 rounded transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        title={t('header.github')}
                    >
                        <img
                            src="/github.svg"
                            alt="GitHub"
                            className={`h-5 w-5 ${isDarkMode ? 'filter invert' : ''}`}
                        />
                    </a>
                    {/* 對話列表按鈕 */}
                    <button
                        onClick={onToggleConversations}
                        className={`p-2 rounded-lg transition-colors ${showConversations
                            ? (isDarkMode ? 'text-green-400 bg-gray-700' : 'text-green-600 bg-green-50')
                            : (isDarkMode
                                ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50')
                            }`}
                        title={t('header.conversations.button')}
                        data-button="conversations"
                    >
                        <MessageSquare className="h-5 w-5" />
                    </button>
                    {/* 新對話按鈕 */}
                    <button
                        onClick={onNewConversation}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                            ? 'text-blue-400 hover:bg-gray-700'
                            : 'text-blue-600 hover:bg-blue-50'
                            }`}
                        title={t('conversation.new')}
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                    {/* 導出按鈕 */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const menu = document.getElementById('export-menu')
                                if (menu) menu.classList.toggle('hidden')
                            }}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode
                                ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                            title={t('conversation.export.button')}
                            data-button="export"
                        >
                            <Download className="h-5 w-5" />
                        </button>
                        <div
                            id="export-menu"
                            className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 hidden border ${isDarkMode
                                ? 'bg-gray-800 border-gray-700'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        onExportConversation('json')
                                        document.getElementById('export-menu')?.classList.add('hidden')
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    {t('conversation.export.json')}
                                </button>
                                <button
                                    onClick={() => {
                                        onExportConversation('markdown')
                                        document.getElementById('export-menu')?.classList.add('hidden')
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    {t('conversation.export.markdown')}
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* 清除對話按鈕 */}
                    <button
                        onClick={onClearChat}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                        title={t('conversation.clear.button')}
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                    {/* 主題切換按鈕 */}
                    <button
                        onClick={onToggleTheme}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                            ? 'text-yellow-400 hover:bg-gray-700'
                            : 'text-gray-500 hover:bg-gray-100'
                            }`}
                        title={isDarkMode ? t('header.theme.light') : t('header.theme.dark')}
                    >
                        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    {/* 全螢幕切換按鈕 */}
                    <button
                        onClick={onToggleFullscreen}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-green-600 hover:bg-gray-100'
                            }`}
                        title={isFullscreen ? t('header.fullscreen.exit') : t('header.fullscreen.enter')}
                    >
                        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </button>
                    {/* 用戶信息 */}
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                        }`}>
                        <span className="text-sm font-medium">{user.email}</span>
                        {user.role === 'admin' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-red-500 text-white`}>
                                {t('header.adminBadge')}
                            </span>
                        )}
                    </div>
                    {/* 管理按鈕（僅管理員可見） */}
                    {user.role === 'admin' && onAdminView && (
                        <button
                            onClick={onAdminView}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode
                                ? 'text-gray-400 hover:text-purple-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                            title={t('header.adminButton')}
                        >
                            <Users className="h-5 w-5" />
                        </button>
                    )}
                    {/* 登出按鈕 */}
                    <button
                        onClick={onLogout}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                        title={t('auth.logout')}
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                    {/* 設定按鈕 */}
                    <button
                        onClick={onToggleSettings}
                        className={`p-2 rounded-lg transition-colors ${showSettings
                            ? (isDarkMode ? 'text-blue-400 bg-gray-700' : 'text-blue-600 bg-blue-50')
                            : (isDarkMode
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50')
                            }`}
                        title={t('header.settings.button')}
                        data-button="settings"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    )
}