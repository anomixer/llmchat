import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
    { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' }
]

interface LanguageSelectorProps {
    isDarkMode: boolean
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isDarkMode }) => {
    const { i18n, t } = useTranslation()

    const handleLanguageChange = (languageCode: string) => {
        i18n.changeLanguage(languageCode)
        // 更新 HTML lang 屬性
        const htmlElement = document.getElementById('html-root') as HTMLHtmlElement
        if (htmlElement) {
            htmlElement.lang = languageCode
        }
        // ✅ 儲存到 localStorage，確保刷新頁面後保留
        try {
            localStorage.setItem('llmchat_language', languageCode)
        } catch (e) {}
    }

    return (
        <div className="relative">
            <select
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${isDarkMode
                    ? 'bg-gray-700 border border-gray-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                title={t('language.selector')}
            >
                {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
        </div>
    )
}