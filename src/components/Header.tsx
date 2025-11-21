import React from 'react'
import { Send, Bot, Settings, Trash2, Moon, Sun, Plus, MessageSquare, Download, Maximize2, Minimize2, LogOut, Users } from 'lucide-react'
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
    isLoadingModels?: boolean
    onToggleTheme: () => void
    onToggleFullscreen: () => void
    onToggleSettings: () => void
    onToggleConversations: () => void
    onNewConversation: () => void
    onClearChat: () => void
    onExportConversation: (format: 'json' | 'markdown') => void
    onLogout: () => void
    user: User
    onAdminView?: () => void
}

export const Header: React.FC<HeaderProps> = ({
    isDarkMode,
    isFullscreen,
    showSettings,
    showConversations,
    settings,
    conversations,
    isLoadingModels = false,
    onToggleTheme,
    onToggleFullscreen,
    onToggleSettings,
    onToggleConversations,
    onNewConversation,
    onClearChat,
    onExportConversation,
    onLogout,
    user,
    onAdminView
}) => {
    const { t } = useTranslation()

    return (
        <div className={`shadow-sm border-b px-4 py-3 flex items-center justify-between transition-colors ${isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
            }`}>
            <div className="flex items-center space-x-2">
                <Bot className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{t('app.title')} <span className={`text-xs font-extralight transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{t('app.version')}</span></h1>
                <button
                    onClick={onToggleSettings}
                    className={`px-2 py-1 text-xs rounded-md transition-colors cursor-pointer ${isDarkMode
                        ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                    title={showSettings ? t('header.model.closeSettings') : t('header.model.openSettings')}
                    data-button="model"
                >
                    {isLoadingModels ? t('header.model.loading') : (settings.model || t('header.model.none'))}
                </button>
            </div>
            <div className="flex items-center space-x-2">
                {/* GitHub 連結 */}
                <a
                    href="https://github.com/anomixer/llmchat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-1 rounded transition-colors ${isDarkMode
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-500 hover:text-gray-700'
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
                    title={t('header.new')}
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
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 hidden border border-gray-200 dark:border-gray-700"
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
                            管理員
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
                        title="用戶管理"
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
        </div>
    )
}