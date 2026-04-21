import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhTW from '../locales/zh-TW.json'
import zhCN from '../locales/zh-CN.json'
import en from '../locales/en.json'
import ja from '../locales/ja.json'
import ko from '../locales/ko.json'
import { APP_CONFIG } from '../constants'

// 為每個語言資源注入全局配置
const injectGlobalConfig = (localeData: any) => ({
    ...localeData,
    app: {
        ...localeData.app,
        title: APP_CONFIG.title,
        version: APP_CONFIG.version
    }
})

const resources = {
    'zh-TW': { translation: injectGlobalConfig(zhTW) },
    'zh-CN': { translation: injectGlobalConfig(zhCN) },
    'en': { translation: injectGlobalConfig(en) },
    'ja': { translation: injectGlobalConfig(ja) },
    'ko': { translation: injectGlobalConfig(ko) }
}

// 同步讀取上次儲存的語言偏好，讓第一次 render 就是正確語言（無閃爍）
const getSavedLanguage = (): string => {
    try {
        return localStorage.getItem('llmchat_language') || 'zh-TW'
    } catch {
        return 'zh-TW'
    }
}

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getSavedLanguage(),
        fallbackLng: 'zh-TW',
        interpolation: {
            escapeValue: false
        }
    })

export default i18n