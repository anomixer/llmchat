import React, { useState, useRef, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { Send, Bot, User, Settings, Trash2, Moon, Sun, Plus, MessageSquare, Paperclip, X, Mic, MicOff, Volume2, VolumeX, Download, Square, Maximize2, Minimize2, LogOut, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarkdownMessage from './MarkdownMsg'
import { Header } from './components/Header'
import { Auth } from './components/Auth'
import { Admin } from './components/Admin'

import { useAuth } from './AuthContext'
import { useChatStreaming } from './hooks/useChatStreaming'
import { useConversations } from './hooks/useConversations'
import type { Conversation, Message } from './hooks/useConversations'
import { useSpeech } from './hooks/useSpeech'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useOutsideClickClosePanels } from './hooks/useOutsideClickClosePanels'
import { useMobileView } from './hooks/useMobileView'
import { useAutoScroll } from './hooks/useAutoScroll'
import { useApplyThemeClasses, usePrefersColorSchemeSync } from './hooks/useThemeEffects'

interface ChatSettings {
    type?: string
    model: string
    temperature: number
    maxTokens: number
    apiUrl: string
    apiKey: string
    topP: number
    topK: number
    showTokenStats: boolean
}

const App: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { user, token, login, register, resendVerification, logout, isLoading: authLoading, error: authError } = useAuth()
    const { isStreaming, streamingMessage, streamingThinking, stopRequested, stopConfirmText, tokenCount, tokensPerSecond, requestStop, streamChat } = useChatStreaming({ token })
    const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat')

    const {
        conversations,
        conversationsLoaded,
        currentConversationId,
        setCurrentConversationId,
        setConversations,
        createConversation,
        createNewConversation: createNewConversationInternal,
        addConversation,
        removeConversation,
        updateConversationTitle,
        clearConversationMessages,
        appendMessage,
        deleteMessage
    } = useConversations({
        token,
        getDefaultConversationTitle: (index: number) => `${t('conversation.defaultTitle')} ${index}`
    })
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const {
        isRecording,
        startVoiceInput,
        isSpeaking,
        speechQueue,
        globalSpeakingMessageId,
        currentPlayingItemRef,
        toggleSpeechForMessage,
        getSpeechButtonState,
        isSpeechButtonDisabled
    } = useSpeech({
        userId: user?.id,
        language: i18n.language,
        onTranscript: (text: string) => setInput(prev => prev + text),
        unsupportedVoiceInputText: t('input.voice.unsupported'),
        unsupportedVoiceText: t('messages.voice.unsupported')
    })

    // 防抖輸入處理，避免頻繁的高度調整
    const inputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // 用 ref 追蹤是否已為當前用戶執行過 loadUserSettings，避免 race condition
    const settingsLoadedRef = useRef<string | null>(null)

    const setInputDebounced = useCallback((value: string) => {
        setInput(value)

        // 清除之前的定時器
        if (inputTimeoutRef.current) {
            clearTimeout(inputTimeoutRef.current)
        }

        // 設置新的定時器來調整高度
        inputTimeoutRef.current = setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
            }
        }, 100) // 100ms 防抖
    }, [])
    const [showSettings, setShowSettings] = useState(false)
    const [showModelOnly, setShowModelOnly] = useState(false)
    const [showConversations, setShowConversations] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('theme')
            if (saved === 'dark') return true
            if (saved === 'light') return false
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        } catch (error) {
            console.error('Error loading theme from localStorage:', error)
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        }
    })
    const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([])
    const [isLoadingModels, setIsLoadingModels] = useState(false)
    const [availableProviders, setAvailableProviders] = useState<any[]>([])
    const [currentProvider, setCurrentProvider] = useState<any>(null)
    const [settings, setSettings] = useState<ChatSettings>(() => {
        // 從 localStorage 讀取 Provider 連線設定（apiUrl/apiKey/type）
        // 注意：model 不從 localStorage 讀，由 server (/api/user/settings) 決定
        const adminSettings = localStorage.getItem('adminProviderSettings')
        if (adminSettings) {
            try {
                const parsed = JSON.parse(adminSettings)
                return {
                    type: parsed.type || 'ollama',
                    model: '',  // 永遠從 '' 開始，由 loadUserSettings 從 server 覆蓋
                    temperature: parsed.temperature || 0.7,
                    maxTokens: parsed.maxTokens || 8192,
                    apiUrl: parsed.baseUrl || 'http://127.0.0.1:11434',
                    apiKey: parsed.apiKey || '',
                    topP: parsed.topP || 0.9,
                    topK: parsed.topK || 40,
                    showTokenStats: true
                }
            } catch (e) {}
        }
        return {
            type: 'ollama',
            model: '',
            temperature: 0.7,
            maxTokens: 8192,
            apiUrl: 'http://127.0.0.1:11434',
            apiKey: '',
            topP: 0.9,
            topK: 40,
            showTokenStats: true
        }
    })
    const [userSettings, setUserSettings] = useState(() => {
        const savedTheme = localStorage.getItem('theme')
        return {
            type: 'ollama',
            language: 'zh-TW',
            theme: (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'auto')
                ? savedTheme
                : 'auto',
            model: '',
            temperature: 0.7,
            maxTokens: 8192,
            apiUrl: '',
            apiKey: '',
            topP: 0.9,
            topK: 40,
            showTokenStats: true
        }
    })
    const [attachedFiles, setAttachedFiles] = useState<File[]>([])
    const [webSearchEnabled, setWebSearchEnabled] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const isMobileView = useMobileView(768)
    // 密碼更改相關狀態
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [passwordChangeMessage, setPasswordChangeMessage] = useState('')
    const [passwordChangeError, setPasswordChangeError] = useState('')
    // 永遠啟用串流模式
    const streamingModeEnabled = true
    const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
    const [showStreamingThinking, setShowStreamingThinking] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)

    // 當前對話的消息
    const currentMessages = conversations.find(c => c.id === currentConversationId)?.messages || []

    const { shouldAutoScroll, setShouldAutoScroll, scrollToBottom } = useAutoScroll({
        isStreaming,
        messagesEndRef,
        messagesContainerRef,
        currentMessages,
        streamingMessage
    })

     // 主題切換循環: light -> dark -> auto -> light
     const toggleTheme = () => {
        const order: Array<'light'|'dark'|'auto'> = ['light', 'dark', 'auto']
        const current = userSettings.theme as 'light' | 'dark' | 'auto'
        const next = order[(order.indexOf(current) + 1) % 3]
        const newIsDark = next === 'dark' ? true : next === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
        setIsDarkMode(newIsDark)
        updateAndSaveSettings('theme', next)
    }

    // 切換全螢幕函數
    const toggleFullscreen = () => {
        const newFullscreen = !isFullscreen
        setIsFullscreen(newFullscreen)
        // 更新 body 類別以應用全螢幕樣式
        document.body.classList.toggle('fullscreen-mode', newFullscreen)
    }

    // 切換thinking展開狀態
    const toggleThinking = (messageId: string) => {
        setExpandedThinking(prev => {
            const newSet = new Set(prev)
            if (newSet.has(messageId)) {
                newSet.delete(messageId)
            } else {
                newSet.add(messageId)
                // 展開時滾動到底部
                setTimeout(() => scrollToBottom(), 100)
            }
            return newSet
        })
    }

    // 切換檔案展開狀態
    const toggleFiles = (messageId: string) => {
        setExpandedFiles(prev => {
            const newSet = new Set(prev)
            if (newSet.has(messageId)) {
                newSet.delete(messageId)
            } else {
                newSet.add(messageId)
            }
            return newSet
        })
    }

    // 加載系統預設配置
    const loadDefaultConfig = async () => {
        try {
            const response = await fetch(`/api/config?t=${Date.now()}`)
            if (response.ok) {
                const data = await response.json()

                // 如果是未登錄狀態，應用預設 API 配置
                if (!token) {
                    setSettings(prev => ({
                        ...prev,
                        apiUrl: data.apiUrl || 'http://localhost:11434',
                        apiKey: ''
                    }))
                }
            }
        } catch (error) {
            console.error('Error loading default config:', error)
        }
    }

    // 載入可用模型列表 - 支持自定義 API URL
    const loadAvailableModels = async (currentModelOverride?: string) => {
        const callId = Date.now()
        try {
            setIsLoadingModels(true)
            
            // currentModelOverride 由 loadUserSettings 傳入，避免 React 閉包捕捉舊值
            const effectiveModel = currentModelOverride ? currentModelOverride : settings.model



            const adminSettings = localStorage.getItem('adminProviderSettings')
            let apiUrl = 'http://127.0.0.1:11434'
            let apiKey = ''
            let providerType = 'ollama'

            if (adminSettings) {
                const parsed = JSON.parse(adminSettings)
                apiUrl = parsed.baseUrl || 'http://127.0.0.1:11434'
                apiKey = parsed.apiKey || ''
                providerType = parsed.type || 'ollama'
            } else {
                // 如果沒有 localStorage 設定，使用 settings
                apiUrl = settings.apiUrl || 'http://127.0.0.1:11434'
                apiKey = settings.apiKey || ''
            }

            console.log('載入模型列表 - type:', providerType, 'apiUrl:', apiUrl, 'apiKey:', apiKey ? '***' : '')

            const response = await fetch(`/api/models?type=${encodeURIComponent(providerType)}&baseUrl=${encodeURIComponent(apiUrl)}&apiKey=${encodeURIComponent(apiKey)}&t=${Date.now()}`)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            const models = data.models.map((model: any) => ({
                id: model.name,
                name: model.name
            }))

            setAvailableModels(models)

            // ✅ 核心修正：以抓到的模型為準
            if (models.length > 0) {
                const adminSettingsStr = localStorage.getItem('adminProviderSettings')
                if (adminSettingsStr) {
                    try {
                        const parsed = JSON.parse(adminSettingsStr)
                        // 同步所有參數，包括 maxTokens (Context Size)
                        setSettings(prev => ({
                            ...prev,
                            type: parsed.type || prev.type,
                            apiUrl: parsed.baseUrl || prev.apiUrl,
                            apiKey: parsed.apiKey || prev.apiKey,
                            temperature: parsed.temperature || prev.temperature,
                            maxTokens: parsed.maxTokens || prev.maxTokens,
                            topP: parsed.topP || prev.topP,
                            topK: parsed.topK || prev.topK,
                            visionModel: parsed.visionModel || prev.visionModel
                        }))
                        setUserSettings(prev => ({
                            ...prev,
                            type: parsed.type || prev.type,
                            apiUrl: parsed.baseUrl || prev.apiUrl,
                            apiKey: parsed.apiKey || prev.apiKey,
                            temperature: parsed.temperature || prev.temperature,
                            maxTokens: parsed.maxTokens || prev.maxTokens,
                            topP: parsed.topP || prev.topP,
                            topK: parsed.topK || prev.topK,
                            visionModel: parsed.visionModel || prev.visionModel
                        }))
                    } catch (e) {}
                }

                // 階層解析選用模型：
                // 1. 若 effectiveModel（server 儲存的模型）非空，永遠優先使用它（即使不在模型列表中，Ollama 可能暫時無法列出）
                // 2. 若 effectiveModel 為空，嘗試使用 admin settings 中儲存的 model（需在列表中）
                // 3. 仍無效，則使用模型列表的第一個模型
                let selectedModel = ''
                if (effectiveModel) {
                    // Server 儲存的模型優先 — 用戶明確設定過，不受即時模型列表限制
                    selectedModel = effectiveModel
                } else {
                    let adminModel = ''
                    if (adminSettingsStr) {
                        try {
                            const parsed = JSON.parse(adminSettingsStr)
                            adminModel = parsed.model || ''
                        } catch (e) {}
                    }
                    const isAdminModelValid = adminModel && models.some((m: any) => m.id === adminModel)
                    selectedModel = isAdminModelValid ? adminModel : models[0].id
                }

                console.log(`[${callId}] 確認選擇模型為: ${selectedModel}, effectiveModel=${effectiveModel}`)
                setSettings(prev => ({ ...prev, model: selectedModel }))
                setUserSettings(prev => ({ ...prev, model: selectedModel }))
            } else {
                // 如果抓不到任何模型，清空選定
                setSettings(prev => ({ ...prev, model: '' }))
            }
        } catch (error) {
            console.error('Error loading models:', error)
            setAvailableModels([])
            // 不要清空已選擇的模型，API 失敗不代表模型無效
        } finally {
            setIsLoadingModels(false)
        }
    }

    // 加載可用的 Provider 列表
    const loadAvailableProviders = async () => {
        try {
            const response = await fetch('/api/providers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setAvailableProviders(data.providers)

                // 獲取當前 Provider 配置
                const currentResponse = await fetch('/api/providers/current', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (currentResponse.ok) {
                    const currentData = await currentResponse.json()
                    setCurrentProvider(currentData.current)
                }
            }
        } catch (error) {
            console.error('Error loading providers:', error)
        }
    }

    // 監聽瀏覽器主題變化
    usePrefersColorSchemeSync({ setIsDarkMode })

    // 初始化主題類別
    useApplyThemeClasses({ isDarkMode })

    // 從服務器加載用戶設定
    const loadUserSettings = async () => {
        if (!token) return

        try {
            // 先載入預設配置（從 .env），加上時間戳避免快取
            const configResponse = await fetch(`/api/config?t=${Date.now()}`)
            let defaultConfig: any = { apiUrl: 'http://localhost:11434', apiKey: '' }
            if (configResponse.ok) {
                defaultConfig = await configResponse.json()
            }

            // ✅ 檢查 localStorage 中是否有 Admin 設定的設定
            const adminSettings = localStorage.getItem('adminProviderSettings')
            if (adminSettings) {
                try {
                    const parsed = JSON.parse(adminSettings)
                    // 如果 Admin 有設定，優先使用
                    if (parsed.baseUrl) {
                        defaultConfig.apiUrl = parsed.baseUrl
                    }
                    if (parsed.apiKey) {
                        defaultConfig.apiKey = parsed.apiKey
                    }
                    if (parsed.model) {
                        defaultConfig.model = parsed.model
                    }
                } catch (e) {
                    console.error('解析 adminSettings 失敗:', e)
                }

            }
            // 獲取用戶設定，加上時間戳避免快取
            const response = await fetch(`/api/user/settings?t=${Date.now()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                const serverSettings: any = data.settings

                // 主題：localStorage 為優先來源（使用者手動設定過），否則回退到伺服器
                const localTheme = localStorage.getItem('theme')
                const effectiveTheme = (localTheme === 'dark' || localTheme === 'light' || localTheme === 'auto')
                    ? localTheme
                    : serverSettings.theme

                // 1. 強制更新用戶設定狀態（以 localStorage 主題為準）
                setUserSettings({ ...serverSettings, theme: effectiveTheme })

                // 處理語言設定：檢查是否有登入畫面的新選擇
                const loginLangChanged = sessionStorage.getItem('login_language_changed')
                const localLang = localStorage.getItem('llmchat_language')
                let finalLanguage = serverSettings.language

                if (loginLangChanged === 'true' && localLang && localLang !== serverSettings.language) {
                    finalLanguage = localLang
                    serverSettings.language = localLang
                    fetch('/api/user/settings', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ settings: { language: localLang } }),
                    }).catch(err => console.error('Error saving language:', err))
                    sessionStorage.removeItem('login_language_changed')
                }

                // 應用語言設定
                if (finalLanguage) {
                    await i18n.changeLanguage(finalLanguage)
                    try { localStorage.setItem('llmchat_language', finalLanguage) } catch {}
                    const htmlElement = document.getElementById('html-root') as HTMLHtmlElement
                    if (htmlElement) {
                        htmlElement.lang = finalLanguage
                    }
                }
                // 應用主題設定（以 effectiveTheme 為準，避免伺服器舊值覆蓋 localStorage）
                if (effectiveTheme) {
                    if (effectiveTheme === 'auto') {
                        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
                        setIsDarkMode(mediaQuery.matches)
                    } else {
                        setIsDarkMode(effectiveTheme === 'dark')
                    }
                }

                // 2. 更新聊天設定，確保全域 settings 與 serverSettings 完全同步
                setSettings(prev => {
                    const newSettings: any = { ...prev }

                    // ✅ 成對綁定邏輯：一旦選定 URL 來源，API Key 必須跟隨同個來源
                    if (serverSettings.apiUrl && serverSettings.apiUrl !== '') {
                        // 如果用戶有設定（或是從 Admin 繼承而來），使用這一對
                        newSettings.apiUrl = serverSettings.apiUrl
                        newSettings.apiKey = serverSettings.apiKey || ''
                    } else if (defaultConfig.apiUrl && defaultConfig.apiUrl !== '') {
                        // 否則使用系統預設環境變數這一對
                        newSettings.apiUrl = defaultConfig.apiUrl
                        newSettings.apiKey = defaultConfig.apiKey || ''
                    } else {
                        // 最後回降到 localhost
                        newSettings.apiUrl = 'http://localhost:11434'
                        newSettings.apiKey = ''
                    }

                    // 合併其他非連動參數
                    Object.keys(serverSettings).forEach(key => {
                        if (key !== 'apiUrl' && key !== 'apiKey') {
                            const val = serverSettings[key]
                            if (val !== '' && val !== null && val !== undefined) {
                                newSettings[key] = val
                            }
                        }
                    })

                    // adminProviderSettings 只覆蓋連線參數（apiUrl/apiKey/type），不動 model
                    try {
                        const adminSettingsStr = localStorage.getItem('adminProviderSettings')
                        if (adminSettingsStr) {
                            const adminLocalSettings = JSON.parse(adminSettingsStr)
                            if (adminLocalSettings.apiKey) newSettings.apiKey = adminLocalSettings.apiKey
                            if (adminLocalSettings.type) newSettings.type = adminLocalSettings.type
                            if (adminLocalSettings.baseUrl) newSettings.apiUrl = adminLocalSettings.baseUrl
                            // ⚠️ 不從 adminProviderSettings 讀 model！model 由 server 設定
                        }
                    } catch (e) { /* ignore */ }

                    return newSettings
                })

                // model 直接從 server 設定（單一來源）
                const serverModel = serverSettings.model || ''
                if (serverModel) {
                    setSettings(prev => ({ ...prev, model: serverModel }))
                    setUserSettings(prev => ({ ...prev, model: serverModel }))
                }

                // 載入模型列表，傳入 serverModel 避免 React 閉包舊值問題
                loadAvailableModels(serverModel || undefined)
            }
        } catch (error) {
            console.error('Error loading user settings:', error)
        }
    }

    // 保存用戶設定到服務器
    const saveUserSettingsToServer = async (settingsToSave: any) => {
        if (!token) return

        try {
            const response = await fetch('/api/user/settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings: settingsToSave }),
            })

            if (response.ok) {
                const data = await response.json()
                // 主題以 localStorage 為優先，避免伺服器返回的舊值覆蓋本地手動設定
                const localTheme = localStorage.getItem('theme')
                if (localTheme && data.settings) {
                    data.settings.theme = localTheme
                }
                setUserSettings(data.settings)
            }
        } catch (error) {
            console.error('Error saving user settings:', error)
        }
    }
    
    // 統一更新並保存設定的函式，避免 React 狀態延遲問題
    const updateAndSaveSettings = async (key: string, value: any) => {
        // 計算出最新的設定對象
        const nextSettings = { ...userSettings, [key]: value };
        
        // 1. 更新 UI 狀態
        setUserSettings(nextSettings);
        
        // 2. 如果是通用聊天設定，也要同步更新 settings 狀態
        setSettings(prev => ({ ...prev, [key]: value }));
        
        // 3. 本地持久化：主題與語言必須同步寫入 localStorage，
        //    因為 usePrefersColorSchemeSync / 登入畫面只讀 localStorage
        if (key === 'theme') {
            localStorage.setItem('theme', value);
        }
        if (key === 'language') {
            try { localStorage.setItem('llmchat_language', value) } catch {}
        }
        
        // 4. 只傳「變更的這一個欄位」到伺服器（避免整個 settings 包含鈕字等失效欄位導致存檔失敗）
        await saveUserSettingsToServer({ [key]: value });
        
        return nextSettings;
    };

    // 處理密碼更改
    const handlePasswordChange = async () => {
        if (!token) return

        // 驗證輸入
        if (!currentPassword || !newPassword) {
            setPasswordChangeError(t('settings.password.error'))
            return
        }

        if (newPassword.length < 6) {
            setPasswordChangeError(t('settings.password.weak'))
            return
        }

        setIsChangingPassword(true)
        setPasswordChangeError('')
        setPasswordChangeMessage('')

        try {
            const response = await fetch('/api/user/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                }),
            })

            const data = await response.json()

            if (response.ok) {
                setPasswordChangeMessage(t('settings.password.success'))
                // 清除表單
                setCurrentPassword('')
                setNewPassword('')
            } else {
                setPasswordChangeError(data.error || t('settings.password.error'))
            }
        } catch (error) {
            console.error('Error changing password:', error)
            setPasswordChangeError(t('settings.password.error'))
        } finally {
            setIsChangingPassword(false)
        }
    }

    // 當用戶登入時加載設定，當用戶登出時重置狀態
    // 使用 ref 避免 !conversationsLoaded 的 race condition
    useEffect(() => {
        if (user && token) {
            // 只在此 user 的設定還沒載入過時才執行
            if (settingsLoadedRef.current !== user.id) {
                settingsLoadedRef.current = user.id
                loadUserSettings()
                loadAvailableProviders()
            }
        } else if (!user) {
            // 登出時重置
            settingsLoadedRef.current = null
            const initialSettings = {
                type: 'ollama',
                language: 'zh-TW',
                theme: 'auto',
                model: '',
                temperature: 0.7,
                maxTokens: 8192,
                apiUrl: 'http://localhost:11434',
                apiKey: '',
                topP: 0.9,
                topK: 40,
                showTokenStats: true
            }
            setUserSettings(initialSettings)
            setSettings(initialSettings)
            setAvailableProviders([])
            setCurrentProvider(null)
        }
    }, [user, token])

    // mount 時從 localStorage 讀 provider 連線設定（apiUrl/apiKey/type）
    // ⚠️ 不再從這裡讀 model，避免覆蓋 server 設定
    useEffect(() => {
        try {
            const adminSettings = localStorage.getItem('adminProviderSettings')
            if (adminSettings) {
                const parsed = JSON.parse(adminSettings)
                setSettings(prev => ({
                    ...prev,
                    type: parsed.type || prev.type,
                    // model: 不動！server 來的才是正確的
                    apiUrl: parsed.baseUrl || prev.apiUrl,
                    apiKey: parsed.apiKey || prev.apiKey,
                    temperature: parsed.temperature || prev.temperature,
                    maxTokens: parsed.maxTokens || prev.maxTokens,
                    topP: parsed.topP || prev.topP,
                    topK: parsed.topK || prev.topK
                }))
            }
        } catch (e) {}
    }, [])

    // ✅ 監聽 localStorage 變化（當 Admin 保存設定時）
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'adminProviderSettings') {
                console.log('Admin 設定已更新，重新載入模型...')
                // 延遲載入，確保 localStorage 已更新
                setTimeout(() => {
                    loadAvailableModels()
                }, 100)
            }
        }

        // ✅ 監聽自定義事件（來自 Admin 頁面）
        const handleModelListUpdated = (e: CustomEvent) => {
            const models = e.detail.models || []
            const selectedModel: string = e.detail.selectedModel || ''

            console.log('模型列表已更新:', models.length, '個模型, selectedModel=', selectedModel)
            setAvailableModels(models)

            // 同步連線參數（不含 model）
            const adminSettingsStr = localStorage.getItem('adminProviderSettings')
            if (adminSettingsStr) {
                try {
                    const parsed = JSON.parse(adminSettingsStr)
                    setSettings(prev => ({
                        ...prev,
                        apiUrl: parsed.baseUrl || prev.apiUrl,
                        apiKey: parsed.apiKey || prev.apiKey,
                        type: parsed.type || prev.type || 'ollama',
                        maxTokens: parsed.maxTokens || prev.maxTokens,
                        temperature: parsed.temperature || prev.temperature,
                        topP: parsed.topP || prev.topP,
                        topK: parsed.topK || prev.topK,
                    }))
                } catch (e) { }
            }

            // Admin 存設定時有指定 model → 直接同步到 header
            if (selectedModel) {
                setSettings(prev => ({ ...prev, model: selectedModel }))
                setUserSettings(prev => ({ ...prev, model: selectedModel }))
            }
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('modelListUpdated', handleModelListUpdated as EventListener)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('modelListUpdated', handleModelListUpdated as EventListener)
        }
    }, [])

    // 創建新對話
    const createNewConversation = () => {
        createNewConversationInternal()
        setShouldAutoScroll(true) // 創建新對話時啟用自動滾動
    }

    // 切換對話
    const switchConversation = (conversationId: string) => {
        setCurrentConversationId(conversationId)
        setShowConversations(false)
    }

    // 刪除對話
    const deleteConversation = (conversationId: string) => {
        const conversation = conversations.find(c => c.id === conversationId)
        if (!conversation) return

        const confirmed = window.confirm(t('conversation.delete.confirm', { title: conversation.title }))
        if (!confirmed) return

        // 如果刪除的是當前正在對話且正在進行 AI 生成的視窗，強制中止後端生成
        if (conversationId === currentConversationId && isStreaming) {
            requestStop(true)
        }

        removeConversation(conversationId)
    }

    // 刪除訊息
    const handleDeleteMessage = (conversationId: string, messageId: string) => {
        const conversation = conversations.find(c => c.id === conversationId)
        if (!conversation) return

        const message = conversation.messages.find(m => m.id === messageId)
        if (!message) return

        // 刪除確認
        const confirmed = window.confirm(t('messages.delete.confirm'))
        if (!confirmed) return

        // 執行刪除
        deleteMessage(conversationId, messageId)
    }

    // 處理檔案選擇
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || [])
        const validFiles = files.filter(file => {
            // 限制檔案大小 (50MB)
            if (file.size > 50 * 1024 * 1024) {
                alert(t('input.files.sizeError', { name: file.name }))
                return false
            }
            // 限制檔案類型
            const allowedTypes = ['image/', 'text/', 'application/pdf', 'application/json']
            if (!allowedTypes.some(type => file.type.startsWith(type))) {
                alert(t('input.files.typeError', { type: file.type }))
                return false
            }
            return true
        })
        setAttachedFiles(prev => [...prev, ...validFiles])
        // 重置 input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // 移除附加檔案
    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index))
    }

    // 讀取檔案內容
    const readFileContent = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            // 檢查檔案類型
            if (file.type === 'application/pdf') {
                // PDF檔案無法在前端直接讀取內容
                resolve(`[PDF檔案: ${file.name}]\n${t('input.files.pdfNote')}`)
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = () => reject(reader.error)
                reader.readAsDataURL(file)
            } else {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = () => reject(reader.error)
                reader.readAsText(file)
            }
        })
    }

    // 導出對話記錄
    const exportConversation = (format: 'json' | 'markdown' = 'json') => {
        if (!currentConversationId) return

        const conversation = conversations.find(c => c.id === currentConversationId)
        if (!conversation) return

        let content = ''
        let filename = ''
        let mimeType = ''

        if (format === 'json') {
            content = JSON.stringify(conversation, null, 2)
            filename = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
            mimeType = 'application/json'
        } else if (format === 'markdown') {
            content = `# ${conversation.title}\n\n`
            content += `${t('conversation.export.created')}: ${conversation.createdAt.toLocaleString(i18n.language)}\n`
            content += `${t('conversation.export.updated')}: ${conversation.updatedAt.toLocaleString(i18n.language)}\n\n`
            content += `---\n\n`

            conversation.messages.forEach((message, index) => {
                const role = message.role === 'user' ? t('messages.user') : t('messages.assistant')
                content += `## ${role} (${message.timestamp.toLocaleString(i18n.language)})\n\n`
                content += `${message.content}\n\n`
                if (message.role === 'assistant' && message.thinking) {
                    content += `**${t('messages.thinking')}：**\n\n${message.thinking}\n\n`
                }
                if (index < conversation.messages.length - 1) {
                    content += `---\n\n`
                }
            })

            filename = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`
            mimeType = 'text/markdown'
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // 流式發送消息
    const sendStreamingMessage = async () => {
        if ((!input.trim() && attachedFiles.length === 0) || isLoading) return

        let messageContent = input.trim()
        if (messageContent.toLowerCase() === '/compact') {
            setInput('')
            handleCompactConversation()
            return
        }
        if (attachedFiles.length > 0) {
            messageContent = messageContent + '\n\n[附加檔案: ' + attachedFiles.map(f => f.name).join(', ') + ']'
        }

        // 讀取檔案內容並構建隱藏內容
        let hiddenContent = messageContent
        const images: string[] = []
        if (attachedFiles.length > 0) {
            try {
                const fileContents = await Promise.all(attachedFiles.map(async file => {
                    const content = await readFileContent(file)
                    if (file.type.startsWith('image/')) {
                        images.push(content)
                        return `--- Image: ${file.name} (Base64) ---`
                    }
                    return `--- File: ${file.name} ---\n${content}\n--- End of File ---`
                }))
                hiddenContent = messageContent + '\n\n' + fileContents.join('\n\n')
            } catch (error) {
                console.error('Error reading attached files:', error)
            }
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageContent,
            hiddenContent: hiddenContent !== messageContent ? hiddenContent : undefined,
            timestamp: new Date()
        }

        // 如果沒有當前對話，創建一個新的並包含用戶消息
        let conversationId = currentConversationId
        if (!conversationId) {
            const newConversation = createConversation({
                title: `對話 ${conversations.length + 1}`,
                messages: [userMessage]
            })
            addConversation(newConversation, true)
            conversationId = newConversation.id
        } else {
            // 更新現有對話消息
            appendMessage(conversationId, userMessage)
        }

        setInput('')
        setAttachedFiles([]) // 清除附加檔案
        setIsLoading(true)

        try {
            const baseConversation = conversations.find(c => c.id === conversationId)
            const historyMessages = baseConversation?.messages || []

            // ✅ 最終防禦：發送前永遠直接從 localStorage 讀取最新設定，完全跳過 React state 閉包陷阱
            let finalSettings = settings;
            const hasImage = images.length > 0;
            try {
                const adminSettings = localStorage.getItem('adminProviderSettings');
                if (adminSettings) {
                    const parsed = JSON.parse(adminSettings);
                    // 核心多模態邏輯：若有圖片且配置了 Vision 模型，則動態切換為 Vision 模型，避免文字模型因二進位字串解析出錯
                    const selectedModel = (hasImage && parsed.visionModel) 
                        ? parsed.visionModel 
                        : (parsed.model || settings.model);

                    finalSettings = {
                        ...settings,
                        type: parsed.type || settings.type,
                        model: selectedModel,
                        apiUrl: parsed.baseUrl || settings.apiUrl,
                        apiKey: parsed.apiKey || settings.apiKey
                    };
                }
            } catch (e) {}

            const result = await streamChat({
                message: userMessage.hiddenContent || userMessage.content,
                settings: finalSettings,
                history: historyMessages.map(msg => ({
                    role: msg.role,
                    content: msg.hiddenContent || msg.content
                })),
                images: images.length > 0 ? images : undefined,
                language: i18n.language,
                webSearch: webSearchEnabled
            })

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.wasInterrupted ? result.content + '\n\n**' + t('messages.interrupted') + '**' : result.content,
                thinking: result.thinking || undefined,
                timestamp: new Date(),
                interrupted: result.wasInterrupted,
                tokenCount: result.tokenCount,
                tokensPerSecond: result.tokensPerSecond
            }

            appendMessage(conversationId, assistantMessage)

            if (baseConversation && baseConversation.messages.length === 0) {
                const title = userMessage.content.length > 20
                    ? userMessage.content.substring(0, 20) + '...'
                    : userMessage.content
                updateConversationTitle(conversationId, title)
            }
        } catch (error) {
            console.error('Error sending streaming message:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `${t('messages.error')}\n\n${(error as any)?.message || ''}`,
                timestamp: new Date()
            }
            appendMessage(conversationId, errorMessage)
        } finally {
            setIsLoading(false)
            // 發送完成後自動聚焦到輸入框
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 100)
        }
    }

    // 組件掛載時載入預設配置
    // 注意：model 列表由 loadUserSettings（登入後）負責載入，不在這裡呼叫
    useEffect(() => {
        loadDefaultConfig()
    }, [])


    // 鍵盤快捷鍵
    useKeyboardShortcuts({
        showSettings,
        showConversations,
        setShowSettings,
        setShowConversations,
        onNewConversation: createNewConversation,
        onClearChat: clearChat
    })

    // 點擊外部關閉面板
    useOutsideClickClosePanels({ showConversations, showSettings, setShowConversations, setShowSettings })



    // 清理輸入框防抖定時器
    useEffect(() => {
        return () => {
            if (inputTimeoutRef.current) {
                clearTimeout(inputTimeoutRef.current)
            }
        }
    }, [])

    const sendMessage = async () => {
        await sendStreamingMessage()
    }

    // 處理發送按鈕點擊
    const handleSendClick = () => {
        if (isStreaming) {
            requestStop()
        } else {
            // 非串流狀態，正常發送
            sendMessage()
        }
    }


    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    function clearChat() {
        if (currentConversationId) {
            const confirmed = window.confirm(t('conversation.clear.confirm'))
            if (!confirmed) return

            // 如果正在 AI 生成，強制停止並中止後端
            if (isStreaming) {
                requestStop(true)
            }

            clearConversationMessages(currentConversationId)
        }
    }

    const handleCompactConversation = async () => {
        if (currentMessages.length < 3) {
            alert(t('conversation.compact.tooShort', '對話訊息尚少，無須壓縮！'))
            return
        }
        if (isLoading || isStreaming) {
            alert(t('conversation.compact.busy', '系統忙碌中，請稍後再試。'))
            return
        }

        const confirmed = window.confirm(t('conversation.compact.confirm', '確定要壓縮當前對話歷史以節省空間嗎？舊的對話將被自動摘要以釋放 Context 空間。'))
        if (!confirmed) return

        setIsLoading(true)
        
        // 保留最後兩條訊息，壓縮其餘所有舊訊息
        const messagesToCompress = currentMessages.slice(0, -2)
        const preservedMessages = currentMessages.slice(-2)

        const historyText = messagesToCompress
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n\n')

        // 插入一個臨時的載入訊息
        const tempMsgId = 'compact-temp-' + Date.now()
        const tempMessage: Message = {
            id: tempMsgId,
            role: 'assistant',
            content: '⏳ ' + t('conversation.compact.processing', '正在壓縮歷史對話中，請稍候...'),
            timestamp: new Date()
        }
        
        appendMessage(currentConversationId, tempMessage)

        try {
            // 解析當前的 LLM 設定
            const adminSettings = localStorage.getItem('adminProviderSettings')
            let finalSettings = { ...settings }
            if (adminSettings) {
                try {
                    const parsed = JSON.parse(adminSettings)
                    finalSettings = {
                        ...settings,
                        type: parsed.type || settings.type,
                        apiUrl: parsed.baseUrl ?? settings.apiUrl,
                        apiKey: parsed.apiKey || settings.apiKey,
                        temperature: parsed.temperature ?? settings.temperature,
                        maxTokens: parsed.maxTokens ?? settings.maxTokens,
                        topP: parsed.topP ?? settings.topP,
                        topK: parsed.topK ?? settings.topK
                    }
                } catch (e) {}
            }

            const prompt = t('system.summarizationPrompt', '請對以下對話歷史進行結構化的詳細摘要。摘要中必須保留：1. 討論的核心主題與上下文脈絡；2. 使用者特別提出的具體需求、偏好與關鍵設定；3. 雙方達成的最終結論、產出的程式碼關鍵段落或解決方案。請使用與對話相同的語言撰寫，直接輸出摘要，不要包含任何引言或解釋，確保 AI 閱讀此摘要後能完全承接先前的記憶與細節。')
            
            const result = await streamChat({
                message: historyText,
                settings: {
                    ...finalSettings,
                    systemPrompt: prompt,
                    temperature: 0.3
                },
                history: [],
                language: i18n.language
            })

            const summaryText = result.content.trim()
            const summaryMessage: Message = {
                id: 'summary-' + Date.now(),
                role: 'assistant',
                content: `📝 **${t('conversation.compact.summaryTitle', '先前對話歷史摘要')}**:\n\n${summaryText}\n\n---`,
                timestamp: new Date()
            }

            // 更新 Conversation 狀態
            const newMessages = [summaryMessage, ...preservedMessages]
            setConversations(prev =>
                prev.map(c =>
                    c.id === currentConversationId ? { ...c, messages: newMessages, updatedAt: new Date() } : c
                )
            )
        } catch (error) {
            console.error('Failed to compact conversation:', error)
            alert(t('conversation.compact.failed', '壓縮歷史對話時發生錯誤。') + '\n\nDetails: ' + (error instanceof Error ? error.message : String(error)))
            // 移除臨時訊息
            setConversations(prev =>
                prev.map(c =>
                    c.id === currentConversationId
                        ? { ...c, messages: c.messages.filter(m => m.id !== tempMsgId), updatedAt: new Date() }
                        : c
                )
            )
        } finally {
            setIsLoading(false)
        }
    }

    // 如果正在檢查認證狀態，顯示加載畫面
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">載入中...</p>
                </div>
            </div>
        )
    }

    // 如果未登入，顯示認證界面
    if (!user) {
        return (
            <Auth
                onLogin={login}
                onRegister={register}
                onResendVerification={resendVerification}
                isLoading={authLoading}
                error={authError}
            />
        )
    }

    // 如果是管理員視圖，顯示管理界面
    if (currentView === 'admin') {
        return <Admin onBack={() => setCurrentView('chat')} />
    }

    const tokenUsage = {
        used: estimateConversationTokens(currentMessages, settings.systemPrompt, streamingMessage, streamingThinking, isStreaming),
        max: settings.maxTokens || 8192
    }

    return (
        <div className={`flex flex-col h-full transition-colors ${isFullscreen ? 'fullscreen-app' : ''} ${isMobileView && !isFullscreen ? 'pt-16' : ''}`}>
            {/* OAuth 授權結果 Toast 通知 */}


            <Header
                isDarkMode={isDarkMode}
                isFullscreen={isFullscreen}
                showSettings={showSettings}
                showConversations={showConversations}
                settings={settings}
                conversations={conversations}
                availableModels={availableModels}
                isLoadingModels={isLoadingModels}
                tokenUsage={tokenUsage}
                onCompactConversation={handleCompactConversation}
                currentTheme={(userSettings.theme as 'auto' | 'light' | 'dark')}
                onToggleTheme={toggleTheme}
                onToggleFullscreen={toggleFullscreen}
                onToggleSettings={() => setShowSettings(!showSettings)}
                onToggleModelOnly={() => {
                    setShowModelOnly(!showModelOnly)
                    setShowSettings(false) // 關閉完整設定面板
                }}
                onToggleConversations={() => setShowConversations(!showConversations)}
                onNewConversation={createNewConversation}
                onClearChat={clearChat}
                onExportConversation={exportConversation}
                onModelChange={(modelId: string) => {
                    // 只更新 model，不觸碰連線參數（由 Admin / defaultConfig 管理）
                    const newPartialSettings = { model: modelId };
                    
                    setSettings(prev => ({ ...prev, ...newPartialSettings }));
                    setUserSettings(prev => ({ ...prev, ...newPartialSettings }));
                    
                    // ✅ 同步更新 localStorage adminProviderSettings，確保刷新頁面後設定不會遺失
                    try {
                        const existing = localStorage.getItem('adminProviderSettings');
                        if (existing) {
                            const parsed = JSON.parse(existing);
                            parsed.model = modelId;
                            localStorage.setItem('adminProviderSettings', JSON.stringify(parsed));
                            
                            // ✅ 額外同步 type 參數，確保傳送給後端的 settings 永遠包含正確的 provider 類型
                            if (parsed.type) {
                                setSettings(prev => ({ ...prev, type: parsed.type }));
                                setUserSettings(prev => ({ ...prev, type: parsed.type }));
                            }
                        }
                    } catch (e) {}
                    
                    // 原子化儲存，只存 model 欄位
                    saveUserSettingsToServer(newPartialSettings);
                }}
                onLogout={logout}
                user={user}
                onAdminView={() => setCurrentView('admin')}
                isMobileView={isMobileView}
            />

            {/* Conversations Panel */}
            {showConversations && (
                <div data-panel="conversations" className={`border-b px-4 py-3 transition-colors ${isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                    }`}>
                    <div className="space-y-2">
                        <h3 className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                            }`}>
                            {t('conversation.list')}
                        </h3>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {conversations.length === 0 ? (
                                <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                    {t('conversation.empty')}
                                </p>
                            ) : (
                                conversations
                                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                                    .map((conversation) => (
                                        <div
                                            key={conversation.id}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${currentConversationId === conversation.id
                                                ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                                                : (isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                                                }`}
                                            onClick={() => switchConversation(conversation.id)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {conversation.title}
                                                </p>
                                                <p className="text-xs opacity-70">
                                                    {conversation.messages.length} {t('conversation.messages')} · {conversation.updatedAt.toLocaleDateString(i18n.language)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteConversation(conversation.id)
                                                }}
                                                className={`p-1 rounded transition-colors ${isDarkMode
                                                    ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600'
                                                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title={t('conversation.delete.button')}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Dropdown */}
            {(showSettings || showModelOnly) && (
                <div 
                    data-panel="settings" 
                    className={`absolute top-16 right-4 w-72 md:w-80 rounded-lg shadow-xl z-50 border overflow-hidden transition-all duration-200 ease-in-out ${isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                    }`}>
                    <div className="p-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                        {/* 只有在完整設定模式下才顯示用戶設定 */}
                        {!showModelOnly && (
                            <>
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
                                                await updateAndSaveSettings('language', newLanguage)
                                                
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
                                            value={userSettings.theme}
                                            onChange={async (e) => {
                                                const newTheme = e.target.value
                                                await updateAndSaveSettings('theme', newTheme)
                                                
                                                // 應用主題變更
                                                if (newTheme === 'auto') {
                                                    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
                                                    setIsDarkMode(mediaQuery.matches)
                                                } else {
                                                    setIsDarkMode(newTheme === 'dark')
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
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
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
                                                    onChange={(e) => setNewPassword(e.target.value)}
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
                                                onClick={handlePasswordChange}
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
                                                            updateAndSaveSettings('showTokenStats', !userSettings.showTokenStats)
                                                        }}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${settings.showTokenStats
                                                            ? 'bg-blue-600'
                                                            : isDarkMode
                                                                ? 'bg-gray-600'
                                                                : 'bg-gray-200'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showTokenStats ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                    <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                        }`}>
                                                        {settings.showTokenStats ? t('settings.parameters.on') : t('settings.parameters.off')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </>
                        )}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 chat-messages">
                {currentMessages.length === 0 ? (
                    <div className={`text-center mt-12 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-700'
                        }`}>
                        <Bot className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-300'
                            }`} />
                        <p className="text-lg mb-2">{t('app.welcome.title')}</p>
                        <p className="text-sm">{t('app.welcome.subtitle')}</p>
                        <p className="text-sm">{t('app.welcome.fileHint')}</p>
                    </div>
                ) : (
                    currentMessages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex items-start space-x-3 group ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : isDarkMode
                                    ? 'bg-gray-700 text-gray-300'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                {message.role === 'user' ? (
                                    <User className="h-4 w-4" />
                                ) : (
                                    <Bot className="h-4 w-4" />
                                )}
                            </div>
                            <div className={`flex-1 max-w-[90%] ${message.role === 'user' ? 'text-right' : ''
                                }`}>
                                <div className={`inline-block px-4 py-2 rounded-lg transition-colors chat-message-content relative ${message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : `pr-8 ${isDarkMode
                                        ? 'bg-gray-800 text-gray-100 border border-gray-700'
                                        : 'bg-white text-gray-900 border border-gray-200'
                                    }`
                                    }`}>
                                    {(() => {
                                        const lines = message.content.split('\n')
                                        const fileLineIndex = lines.findIndex(line => line.startsWith('[附加檔案:'))
                                        const hasFiles = fileLineIndex !== -1

                                        // 分離內容和檔案部分
                                        const contentLines = hasFiles ? lines.slice(0, fileLineIndex) : lines
                                        const fileLines = hasFiles ? lines.slice(fileLineIndex) : []

                                        return (
                                            <>
                                                {/* 主要內容使用Markdown渲染 */}
                                                <MarkdownMessage
                                                    content={contentLines.join('\n')}
                                                    isDarkMode={isDarkMode}
                                                    isUser={message.role === 'user'}
                                                />

                                                {/* 附加檔案部分 */}
                                                {fileLines.map((line, index) => {
                                                    if (line.startsWith('[附加檔案:')) {
                                                        return (
                                                            <div key={index} className={`mt-3 border-t pt-3 ${message.role === 'user'
                                                                ? (isDarkMode ? 'border-blue-200' : 'border-blue-100')
                                                                : 'border-gray-200 dark:border-gray-600'
                                                                }`}>
                                                                <button
                                                                    onClick={() => toggleFiles(message.id)}
                                                                    className={`flex items-center space-x-2 text-sm font-medium transition-colors ${message.role === 'user'
                                                                        ? (isDarkMode ? 'text-blue-200 hover:text-blue-100' : 'text-blue-100 hover:text-white')
                                                                        : (isDarkMode
                                                                            ? 'text-gray-400 hover:text-gray-200'
                                                                            : 'text-gray-600 hover:text-gray-800')
                                                                        }`}
                                                                >
                                                                    <span>{t('messages.files')}</span>
                                                                    <svg
                                                                        className={`w-4 h-4 transition-transform ${expandedFiles.has(message.id) ? 'rotate-90' : ''}`}
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </button>
                                                                {expandedFiles.has(message.id) && (
                                                                    <div className={`mt-2 p-3 rounded-md text-sm transition-colors ${isDarkMode
                                                                        ? 'bg-gray-700 text-gray-300 border border-gray-600'
                                                                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                                                                        }`}>
                                                                        <pre className="whitespace-pre-wrap break-words font-mono text-xs">{line}</pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                })}
                                            </>
                                        )
                                    })()}
                                    {message.role === 'assistant' && (
                                        <>
                                            {message.thinking && (
                                                <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                                                    <button
                                                        onClick={() => toggleThinking(message.id)}
                                                        className={`flex items-center space-x-2 text-sm font-medium transition-colors ${isDarkMode
                                                            ? 'text-gray-400 hover:text-gray-200'
                                                            : 'text-gray-600 hover:text-gray-800'
                                                            }`}
                                                    >
                                                        <span>{t('messages.thinking')}</span>
                                                        <svg
                                                            className={`w-4 h-4 transition-transform ${expandedThinking.has(message.id) ? 'rotate-90' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                    {expandedThinking.has(message.id) && (
                                                        <div className={`mt-2 p-3 rounded-md text-sm transition-colors ${isDarkMode
                                                            ? 'bg-gray-700 text-gray-300 border border-gray-600'
                                                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                                                            }`}>
                                                            <pre className="whitespace-pre-wrap break-words font-mono text-xs">{message.thinking}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 語音按鈕 - 放在對話框右上角，不遮擋內容 */}
                                    {message.role === 'assistant' && (
                                        <div className="absolute top-1 right-1 flex flex-col items-center space-y-1 z-10">
                                            <button
                                                key={`speech-btn-${message.id}`}
                                                onClick={(e) => {
                                                    e.stopPropagation()

                                                    toggleSpeechForMessage({ messageId: message.id, text: message.content })
                                                }}
                                                className={`p-1 rounded-full transition-colors shadow-sm ${(() => {
                                                    const { isPlayingThis, isGlobalPlaying, isInQueue } = getSpeechButtonState(message.id)

                                                    if (isPlayingThis) {
                                                        return 'bg-green-500 text-white hover:bg-green-600' // 本session播放中 - 綠色 (最高優先級)
                                                    } else if (isInQueue) {
                                                        return 'bg-orange-500 text-white hover:bg-red-400' // 隊列中 - 橘色
                                                    } else if (isGlobalPlaying) {
                                                        return 'bg-red-500 text-white' // 其他session播放中 - 紅色
                                                    } else {
                                                        return isDarkMode
                                                            ? 'bg-gray-600 text-gray-300 hover:text-green-400 hover:bg-gray-500'
                                                            : 'bg-gray-200 text-gray-600 hover:text-green-600 hover:bg-gray-300'
                                                    }
                                                })()
                                                    }`}
                                                title={
                                                    isSpeaking && currentPlayingItemRef.current?.messageId === message.id
                                                        ? t('messages.voice.stop')
                                                        : globalSpeakingMessageId === message.id
                                                            ? t('messages.voice.otherTabPlaying')
                                                            : speechQueue.some(item => item.messageId === message.id)
                                                                ? t('messages.voice.removeFromQueue')
                                                                : t('messages.voice.play')
                                                }
                                                disabled={isSpeechButtonDisabled(message.id)} // 只有其他session播放時才禁用，本session播放時不禁用
                                                style={{ zIndex: 10, pointerEvents: 'auto' }}
                                            >
                                                <Volume2 className="h-3 w-3" />
                                            </button>
                                            {/* 刪除按鈕 - 在語音按鈕下方 */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteMessage(currentConversationId, message.id)
                                                }}
                                                className={`p-1 rounded-full transition-colors shadow-sm opacity-0 group-hover:opacity-100 ${isDarkMode
                                                    ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                                                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title={t('messages.delete.button')}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}

                                    {/* 刪除按鈕 - 用戶訊息右上角 */}
                                    {message.role === 'user' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteMessage(currentConversationId, message.id)
                                            }}
                                            className={`absolute top-1 right-1 p-1 rounded-full transition-colors shadow-sm opacity-0 group-hover:opacity-100 ${isDarkMode
                                                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600'
                                                : 'text-gray-500 hover:text-red-600 hover:bg-gray-200'
                                                }`}
                                            title={t('messages.delete.button')}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    )}

                                    {/* Token 統計 - AI 消息才顯示，根據設定控制 */}
                                    {message.role === 'assistant' && message.tokenCount !== undefined && settings.showTokenStats && (
                                        <div className={`mt-2 text-xs font-mono transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <span className="inline-block px-2 py-1 rounded-sm bg-gray-100 dark:bg-gray-700">
                                                {message.tokenCount} tokens | {(message.tokensPerSecond || 0).toFixed(2)} tokens/s
                                            </span>
                                        </div>
                                    )}
                                </div>


                                <p className={`text-xs mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                    {message.timestamp.toLocaleTimeString(i18n.language)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                {false && (
                    <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-200 text-gray-600'
                            }`}>
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className={`border rounded-lg px-4 py-2 transition-colors ${isDarkMode
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                            }`}>
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                {isStreaming && (
                    <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-200 text-gray-600'
                            }`}>
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className={`flex-1 max-w-[90%] transition-colors`}>
                            <div className={`inline-block px-4 py-2 rounded-lg transition-colors ${isDarkMode
                                ? 'bg-gray-800 text-gray-100 border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-200'
                                }`}>
                                <MarkdownMessage
                                    content={streamingMessage || t('messages.generating')}
                                    isDarkMode={isDarkMode}
                                    isUser={false}
                                />
                                <div className="flex space-x-1 mt-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                {streamingThinking && (
                                    <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                                        <button
                                            onClick={() => setShowStreamingThinking(!showStreamingThinking)}
                                            className={`flex items-center space-x-2 text-sm font-medium transition-colors ${isDarkMode
                                                ? 'text-gray-400 hover:text-gray-200'
                                                : 'text-gray-600 hover:text-gray-800'
                                                }`}
                                        >
                                            <span>{t('messages.thinking')}</span>
                                            <svg
                                                className={`w-4 h-4 transition-transform ${showStreamingThinking ? 'rotate-90' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                        {showStreamingThinking && (
                                            <div className={`mt-2 p-3 rounded-md text-sm transition-colors ${isDarkMode
                                                ? 'bg-gray-700 text-gray-300 border border-gray-600'
                                                : 'bg-gray-50 text-gray-700 border border-gray-200'
                                                }`}>
                                                <pre className="whitespace-pre-wrap break-words font-mono text-xs">{streamingThinking}</pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Token 統計 - 串流中即時顯示 */}
                                {settings.showTokenStats && (
                                    <div className={`mt-2 text-xs font-mono transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <span className="inline-block px-2 py-1 rounded-sm bg-gray-100 dark:bg-gray-700">
                                            {tokenCount} tokens | {tokensPerSecond.toFixed(2)} tokens/s
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`border-t px-4 py-4 transition-colors ${isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
                }`}>
                {/* 附加檔案顯示 */}
                {attachedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                        {attachedFiles.map((file, index) => (
                            <div
                                key={index}
                                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors ${isDarkMode
                                    ? 'bg-gray-700 text-gray-300'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate max-w-32">{file.name}</span>
                                <button
                                    onClick={() => removeFile(index)}
                                    className={`p-0.5 rounded-full transition-colors ${isDarkMode
                                        ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400'
                                        : 'hover:bg-gray-200 text-gray-500 hover:text-red-600'
                                        }`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-end space-x-3">
                    <div className="flex-1 relative">
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInputDebounced(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={isMobileView ? (input ? '' : '輸入訊息...') : t('input.placeholder')}
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[52px] max-h-32 transition-colors ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300'
                                    }`}
                                rows={1}
                                disabled={isLoading}
                            />
                            {stopConfirmText && (
                                <div className={`absolute right-6 top-1/2 transform -translate-y-1/2 text-sm font-medium pointer-events-none transition-colors ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                    {t('buttons.stopConfirm')}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* 檔案上傳按鈕 */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,text/*,.pdf,.json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    {/* 語音輸入按鈕 */}
                    <button
                        onClick={startVoiceInput}
                        className={`p-3 rounded-lg transition-colors ${isRecording
                            ? 'bg-red-600 text-white animate-pulse'
                            : isDarkMode
                                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'
                            }`}
                        title={isRecording ? t('input.voice.stop') : t('input.voice.start')}
                        disabled={isLoading}
                    >
                        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    {/* 網路搜尋開關按鈕 */}
                    <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`p-3 rounded-lg transition-all duration-200 ${webSearchEnabled
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                            : isDarkMode
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                            }`}
                        title={webSearchEnabled ? '網路搜尋已啟用' : '啟用網路搜尋'}
                        disabled={isLoading}
                    >
                        <Globe className={`h-5 w-5 ${webSearchEnabled ? 'animate-pulse' : ''}`} />
                    </button>
                    {/* 檔案上傳按鈕 */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3 rounded-lg transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                            }`}
                        title={t('input.files.button')}
                        disabled={isLoading}
                    >
                        <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleSendClick}
                        disabled={(!input.trim() && attachedFiles.length === 0) && !isStreaming || availableModels.length === 0}
                        className={`p-3 rounded-lg transition-colors ${(input.trim() || attachedFiles.length > 0 || isStreaming) && availableModels.length > 0
                            ? isStreaming
                                ? stopRequested
                                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            : isDarkMode
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        title={isStreaming ? (stopRequested ? t('buttons.stopAction') : t('buttons.stop')) : t('buttons.send')}
                    >
                        {isStreaming ? (
                            stopRequested ? (
                                <span className="text-xs font-medium">{t('buttons.stopAction')}</span>
                            ) : (
                                <Square className="h-5 w-5" />
                            )
                        ) : (
                            <Send className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Token estimation helpers
function estimateTokens(text: string): number {
    if (!text) return 0
    let tokens = 0
    // CJK characters match range: Chinese, Japanese, Korean
    const cjkRegex = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]/g
    const cjkMatches = text.match(cjkRegex)
    const cjkCount = cjkMatches ? cjkMatches.length : 0
    
    const remainingText = text.replace(cjkRegex, ' ')
    const words = remainingText.trim().split(/\s+/)
    let englishTokens = 0
    if (words.length > 0 && words[0] !== '') {
        englishTokens = Math.ceil(words.length * 1.3)
    }
    
    tokens = Math.ceil(cjkCount * 1.2) + englishTokens
    return tokens
}

function estimateConversationTokens(
    messages: Message[], 
    baseSystemPrompt?: string, 
    streamingMessage?: string, 
    streamingThinking?: string,
    isStreaming?: boolean
): number {
    let total = 0
    // Estimate System Prompt
    const systemPrompt = baseSystemPrompt || 'You are a helpful AI assistant.'
    total += estimateTokens(systemPrompt)
    total += 10 // buffer for system date/time warning suffix
    
    // Add messages in history
    for (const msg of messages) {
        if (msg.role === 'assistant') {
            total += estimateTokens(msg.content)
            if (msg.thinking) {
                total += estimateTokens(msg.thinking)
            }
        } else {
            total += estimateTokens(msg.hiddenContent || msg.content)
        }
        total += 4 // overhead per message
    }
    
    // Add active streaming message
    if (isStreaming) {
        if (streamingMessage) {
            total += estimateTokens(streamingMessage)
        }
        if (streamingThinking) {
            total += estimateTokens(streamingThinking)
        }
        if (streamingMessage || streamingThinking) {
            total += 4 // overhead
        }
    }
    
    return total
}

export default App
