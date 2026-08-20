import React from 'react'
import { useTranslation } from 'react-i18next'

interface SettingsPanelProps {
    isDarkMode: boolean
    theme: string
    userShowTokenStats: boolean
    settingsShowTokenStats: boolean
    currentPassword: string
    newPassword: string
    passwordChangeError: string
    passwordChangeMessage: string
    isChangingPassword: boolean
    onCurrentPasswordChange: (v: string) => void
    onNewPasswordChange: (v: string) => void
    onPasswordChange: () => void
    onChangeSetting: (key: string, value: any) => void
    onSetIsDarkMode: (v: boolean) => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isDarkMode,
    theme,
    userShowTokenStats,
    settingsShowTokenStats,
    currentPassword,
    newPassword,
    passwordChangeError,
    passwordChangeMessage,
    isChangingPassword,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onPasswordChange,
    onChangeSetting,
    onSetIsDarkMode
}) => {
    const { t, i18n } = useTranslation()

    return (
        <div
            data-panel="settings"
            className={`absolute top-16 right-4 w-72 md:w-80 rounded-lg shadow-xl z-50 border overflow-hidden transition-all duration-200 ease-in-out ${isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
                }`}>
            <div className="p-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                    {/* 左側：用戶設定 */}
                    <div className="space-y-4">
                                <h3 className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                    }`}>
                                    {t('settings.panels.user')}
                                </h3>

                                <div>
                                    <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        {t('settings.language.label')}
                                    </label>
                                    <select
                                        value={i18n.language}
                                        onChange={async (e) => {
                                            const newLanguage = e.target.value
                                            await onChangeSetting('language', newLanguage)

                                            // 立即應用語言變更
                                            await i18n.changeLanguage(newLanguage)
                                            try { localStorage.setItem('llmchat_language', newLanguage) } catch {}
                                            const htmlElement = document.getElementById('html-root') as HTMLHtmlElement
                                            if (htmlElement) {
                                                htmlElement.lang = newLanguage
                                            }
                                        }}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300'
                                            }`}
                                    >
                                        <option value="zh-TW">🇹🇼 繁體中文</option>
                                        <option value="zh-CN">🇨🇳 简体中文</option>
                                        <option value="en">🇺🇸 English</option>
                                        <option value="ja">🇯🇵 日本語</option>
                                        <option value="ko">🇰🇷 한국어</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        {t('settings.theme.label')}
                                    </label>
                                    <select
                                        value={theme}
                                        onChange={async (e) => {
                                            const newTheme = e.target.value
                                            await onChangeSetting('theme', newTheme)

                                            // 應用主題變更
                                            if (newTheme === 'auto') {
                                                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
                                                onSetIsDarkMode(mediaQuery.matches)
                                            } else {
                                                onSetIsDarkMode(newTheme === 'dark')
                                            }
                                        }}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300'
                                            }`}
                                    >
                                        <option value="auto">{t('settings.theme.auto')}</option>
                                        <option value="light">{t('settings.theme.light')}</option>
                                        <option value="dark">{t('settings.theme.dark')}</option>
                                    </select>
                                </div>

                                {/* 密碼更改區域 */}
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                                    <h4 className={`text-sm font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                        }`}>
                                        {t('settings.password.label')}
                                    </h4>

                                    <div className="space-y-3">
                                        <div>
                                            <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                {t('settings.password.current')}
                                            </label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                                                placeholder={t('settings.password.currentPlaceholder')}
                                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                                    : 'bg-white border-gray-300'
                                                    }`}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                {t('settings.password.new')}
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => onNewPasswordChange(e.target.value)}
                                                placeholder={t('settings.password.newPlaceholder')}
                                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                                    : 'bg-white border-gray-300'
                                                    }`}
                                            />
                                        </div>


                                        {/* 錯誤和成功消息 */}
                                        {passwordChangeError && (
                                            <div className="text-red-600 dark:text-red-400 text-sm">
                                                {passwordChangeError}
                                            </div>
                                        )}
                                        {passwordChangeMessage && (
                                            <div className="text-green-600 dark:text-green-400 text-sm">
                                                {passwordChangeMessage}
                                            </div>
                                        )}

                                        <button
                                            onClick={onPasswordChange}
                                            disabled={isChangingPassword || !currentPassword || !newPassword}
                                            className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${isChangingPassword || !currentPassword || !newPassword
                                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                }`}
                                        >
                                            {isChangingPassword ? t('auth.processing') : t('settings.password.button')}
                                        </button>

                                        {/* 顯示 Token 統計 */}
                                        <div className="mt-4">
                                            <label className={`block text-sm font-medium mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                {t('settings.parameters.showTokenStats')}
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onChangeSetting('showTokenStats', !userShowTokenStats)
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${settingsShowTokenStats
                                                        ? 'bg-blue-600'
                                                        : isDarkMode
                                                            ? 'bg-gray-600'
                                                            : 'bg-gray-200'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settingsShowTokenStats ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                                <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                    {settingsShowTokenStats ? t('settings.parameters.on') : t('settings.parameters.off')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                </div>
            </div>
        </div>
    )
}
