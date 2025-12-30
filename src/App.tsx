import React, { useState, useRef, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { Send, Bot, User, Settings, Trash2, Moon, Sun, Plus, MessageSquare, Paperclip, X, Mic, MicOff, Volume2, VolumeX, Download, Square, Maximize2, Minimize2, LogOut } from 'lucide-react'
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
            return saved ? JSON.parse(saved) : false
        } catch (error) {
            console.error('Error loading theme from localStorage:', error)
            return false
        }
    })
    const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([])
    const [isLoadingModels, setIsLoadingModels] = useState(true)
    const [settings, setSettings] = useState<ChatSettings>({
        model: '',
        temperature: 0.7,
        maxTokens: 8192,
        apiUrl: '',
        apiKey: '',
        topP: 0.9,
        topK: 40,
        showTokenStats: true
    })
    const [userSettings, setUserSettings] = useState({
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
    })
    const [attachedFiles, setAttachedFiles] = useState<File[]>([])
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

    // 切換主題函數
    const toggleTheme = () => {
        const newTheme = !isDarkMode
        setIsDarkMode(newTheme)
        localStorage.setItem('theme', JSON.stringify(newTheme))
        // 更新 body 類別以應用玻璃擬態主題和Tailwind dark模式
        document.body.classList.toggle('dark-theme', newTheme)
        document.documentElement.classList.toggle('dark', newTheme)
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

    // 載入預設配置
    const loadDefaultConfig = async () => {
        try {
            const response = await fetch('/api/config')
            if (response.ok) {
                const config = await response.json()
                setSettings(prev => ({
                    ...prev,
                    apiUrl: prev.apiUrl || config.apiUrl,
                    apiKey: prev.apiKey || (config.apiKey === 'configured' ? '' : config.apiKey)
                }))
            }
        } catch (error) {
            console.error('Error loading default config:', error)
            // 如果載入失敗，使用預設值
            setSettings(prev => ({
                ...prev,
                apiUrl: prev.apiUrl || 'http://localhost:11434'
            }))
        }
    }

    // 載入可用模型列表 - 支持自定義 API URL
    const loadAvailableModels = async () => {
        try {
            setIsLoadingModels(true)
            const apiUrl = settings.apiUrl || 'http://localhost:11434'
            const response = await fetch(`/api/models?apiUrl=${encodeURIComponent(apiUrl)}`)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            const models = data.models.map((model: any) => ({
                id: model.name,
                name: model.name
            }))
            setAvailableModels(models)

            // 如果有模型且當前模型為空，使用第一個
            if (models.length > 0 && !settings.model) {
                setSettings(prev => ({ ...prev, model: models[0].id }))
            }
        } catch (error) {
            console.error('Error loading models:', error)
            setAvailableModels([]) // 不使用備用列表，只從 Ollama 獲取
        } finally {
            setIsLoadingModels(false)
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
            // 先載入預設配置（從 .env）
            const configResponse = await fetch('/api/config')
            let defaultConfig = { apiUrl: 'http://localhost:11434', apiKey: '' }
            if (configResponse.ok) {
                defaultConfig = await configResponse.json()
            }

            const response = await fetch('/api/user/settings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                const serverSettings = data.settings

                // 更新用戶設定狀態
                setUserSettings(serverSettings)

                // 應用語言設定
                if (serverSettings.language && serverSettings.language !== i18n.language) {
                    i18n.changeLanguage(serverSettings.language)
                    const htmlElement = document.getElementById('html-root') as HTMLHtmlElement
                    if (htmlElement) {
                        htmlElement.lang = serverSettings.language
                    }
                }

                // 應用主題設定
                if (serverSettings.theme) {
                    if (serverSettings.theme === 'auto') {
                        // 跟隨瀏覽器主題
                        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
                        setIsDarkMode(mediaQuery.matches)
                    } else {
                        // 手動設定主題
                        setIsDarkMode(serverSettings.theme === 'dark')
                    }
                }

                // 更新聊天設定，實現優先順序：用戶設定 > .env 設定 > 預設值
                setSettings(prev => {
                    const newSettings: any = { ...prev }

                    // 對於每個設定項目，按優先順序選擇值
                    Object.keys(serverSettings).forEach(key => {
                        const userValue = serverSettings[key]
                        const envValue = (defaultConfig as any)[key]

                        // 如果用戶有設定值（非空），使用用戶設定
                        if (userValue !== '' && userValue !== null && userValue !== undefined) {
                            newSettings[key] = userValue
                        }
                        // 否則，如果 .env 有設定值，使用 .env 設定
                        else if (envValue !== '' && envValue !== null && envValue !== undefined) {
                            newSettings[key] = envValue
                        }
                    })

                    // 特別處理 apiUrl 和 apiKey：如果用戶沒設定，使用 .env 的值
                    if (!serverSettings.apiUrl || serverSettings.apiUrl === '') {
                        newSettings.apiUrl = defaultConfig.apiUrl
                    }
                    if (!serverSettings.apiKey || serverSettings.apiKey === '') {
                        newSettings.apiKey = defaultConfig.apiKey
                    }

                    return newSettings
                })

                // 用戶設定載入後，重新載入模型列表以確保使用正確的 apiUrl
                setTimeout(() => {
                    loadAvailableModels()
                }, 200) // 稍微延遲確保設定已更新
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
                setUserSettings(data.settings)
            }
        } catch (error) {
            console.error('Error saving user settings:', error)
        }
    }

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
    useEffect(() => {
        if (user && token && !conversationsLoaded) {
            loadUserSettings()
        } else if (!user && conversationsLoaded) {
            // 用戶登出時重置設定
            setUserSettings({
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
            })
        }
    }, [user, token, conversationsLoaded])

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

        // 處理附加檔案
        let messageContent = input.trim()
        if (attachedFiles.length > 0) {
            messageContent = messageContent + '\n\n[附加檔案: ' + attachedFiles.map(f => f.name).join(', ') + ']'
        }

        // 讀取檔案內容並構建隱藏內容
        let hiddenContent = messageContent
        if (attachedFiles.length > 0) {
            try {
                const fileContents = await Promise.all(attachedFiles.map(async file => {
                    const content = await readFileContent(file)
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
            const historyMessages = [...(baseConversation?.messages || []), userMessage]

            const result = await streamChat({
                message: userMessage.hiddenContent || userMessage.content,
                settings,
                history: historyMessages.map(msg => ({
                    role: msg.role,
                    content: msg.hiddenContent || msg.content
                })),
                language: i18n.language
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
                content: t('messages.error'),
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

    // 組件掛載時載入預設配置和模型列表
    useEffect(() => {
        loadDefaultConfig().then(() => {
            // 如果用戶還沒登入，先用預設設定載入模型列表
            // 用戶登入後會通過 loadUserSettings() 重新載入
            if (!token) {
                loadAvailableModels()
            }
        })
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

    // 當 API URL 變化時重新載入模型列表 (防抖)
    useEffect(() => {
        if (settings.apiUrl) {
            const timeoutId = setTimeout(() => {
                loadAvailableModels()
            }, 500) // 500ms 防抖
            return () => clearTimeout(timeoutId)
        }
    }, [settings.apiUrl])

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

            clearConversationMessages(currentConversationId)
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

    return (
        <div className={`flex flex-col h-full transition-colors ${isFullscreen ? 'fullscreen-app' : ''} ${isMobileView && !isFullscreen ? 'pt-16' : ''}`}>
            <Header
                isDarkMode={isDarkMode}
                isFullscreen={isFullscreen}
                showSettings={showSettings}
                showConversations={showConversations}
                settings={settings}
                conversations={conversations}
                availableModels={availableModels}
                isLoadingModels={isLoadingModels}
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
                    setSettings(prev => ({ ...prev, model: modelId }))
                    setUserSettings(prev => ({ ...prev, model: modelId }))
                    saveUserSettingsToServer({ ...userSettings, model: modelId })
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

            {/* Settings Panel */}
            {(showSettings || showModelOnly) && (
                <div data-panel="settings" className={`border-b px-4 py-3 transition-colors max-h-96 overflow-y-auto ${isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                    }`}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                            value={userSettings.language}
                                            onChange={(e) => {
                                                const newLanguage = e.target.value
                                                setUserSettings(prev => ({ ...prev, language: newLanguage }))
                                                // 立即應用語言變更
                                                i18n.changeLanguage(newLanguage)
                                                const htmlElement = document.getElementById('html-root') as HTMLHtmlElement
                                                if (htmlElement) {
                                                    htmlElement.lang = newLanguage
                                                }
                                                // 保存到服務器
                                                saveUserSettingsToServer({ ...userSettings, language: newLanguage })
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
                                            onChange={(e) => {
                                                const newTheme = e.target.value
                                                setUserSettings(prev => ({ ...prev, theme: newTheme }))
                                                // 應用主題變更
                                                if (newTheme === 'auto') {
                                                    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
                                                    setIsDarkMode(mediaQuery.matches)
                                                } else {
                                                    setIsDarkMode(newTheme === 'dark')
                                                }
                                                // 保存到服務器
                                                saveUserSettingsToServer({ ...userSettings, theme: newTheme })
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
                                        </div>
                                    </div>
                                </div>

                                {/* 右側：LLM 配置 */}
                                <div className="space-y-4">
                                    <h3 className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                        }`}>
                                        {t('settings.panels.llm')}
                                    </h3>

                                    {user?.role === 'admin' && (
                                        <div className="border-2 border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                                            <div className="flex items-center mb-3">
                                                <span className="text-red-600 dark:text-red-400 font-semibold text-sm bg-red-100 dark:bg-red-900 px-2 py-1 rounded">
                                                    {t('settings.adminOnly')}
                                                </span>
                                                <span className="text-red-600 dark:text-red-400 text-sm ml-2">
                                                    {t('settings.adminOnlyMessage')}
                                                </span>
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                    {t('settings.api.url')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settings.apiUrl}
                                                    onChange={(e) => {
                                                        const newApiUrl = e.target.value
                                                        setSettings(prev => ({ ...prev, apiUrl: newApiUrl }))
                                                        setUserSettings(prev => ({ ...prev, apiUrl: newApiUrl }))
                                                        saveUserSettingsToServer({ ...userSettings, apiUrl: newApiUrl })
                                                    }}
                                                    placeholder="http://localhost:11434"
                                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                                        : 'bg-white border-gray-300'
                                                        }`}
                                                />
                                            </div>

                                            <div className="mt-4">
                                                <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                    {t('settings.api.key')}
                                                </label>
                                                <input
                                                    type="password"
                                                    value={settings.apiKey}
                                                    onChange={(e) => {
                                                        const newApiKey = e.target.value
                                                        setSettings(prev => ({ ...prev, apiKey: newApiKey }))
                                                        setUserSettings(prev => ({ ...prev, apiKey: newApiKey }))
                                                        saveUserSettingsToServer({ ...userSettings, apiKey: newApiKey })
                                                    }}
                                                    placeholder={t('settings.api.keyPlaceholder')}
                                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                                        : 'bg-white border-gray-300'
                                                        }`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            {t('settings.model.label')} {isLoadingModels && <span className="text-xs text-gray-500">({t('settings.model.loading')})</span>}
                                            {availableModels.length === 0 && !isLoadingModels && (
                                                <span className="text-xs text-red-500 ml-2">({t('settings.model.none')})</span>
                                            )}
                                        </label>
                                        <select
                                            value={settings.model}
                                            onChange={(e) => {
                                                const newModel = e.target.value
                                                setSettings(prev => ({ ...prev, model: newModel }))
                                                setUserSettings(prev => ({ ...prev, model: newModel }))
                                                saveUserSettingsToServer({ ...userSettings, model: newModel })
                                            }}
                                            disabled={isLoadingModels}
                                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                                ? 'bg-gray-700 border-gray-600 text-white disabled:opacity-50'
                                                : 'bg-white border-gray-300 disabled:opacity-50'
                                                }`}
                                        >
                                            {isLoadingModels ? (
                                                <option value="">{t('settings.model.placeholder')}</option>
                                            ) : availableModels.length > 0 ? (
                                                availableModels.map(model => (
                                                    <option key={model.id} value={model.id}>
                                                        {model.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">{t('settings.model.noModels')}</option>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                {/* 右側：生成參數 */}
                                <div className="space-y-4">
                                    <h3 className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                        }`}>
                                        {t('settings.panels.generation')}
                                    </h3>

                                    <div>
                                        <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            {t('settings.parameters.temperature', { value: settings.temperature })}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={settings.temperature}
                                            onChange={(e) => {
                                                const newTemperature = parseFloat(e.target.value)
                                                setSettings(prev => ({ ...prev, temperature: newTemperature }))
                                                setUserSettings(prev => ({ ...prev, temperature: newTemperature }))
                                                saveUserSettingsToServer({ ...userSettings, temperature: newTemperature })
                                            }}
                                            className={`w-full ${isDarkMode ? 'accent-blue-400' : 'accent-blue-600'
                                                }`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            {t('settings.parameters.topP', { value: settings.topP })}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={settings.topP}
                                            onChange={(e) => {
                                                const newTopP = parseFloat(e.target.value)
                                                setSettings(prev => ({ ...prev, topP: newTopP }))
                                                setUserSettings(prev => ({ ...prev, topP: newTopP }))
                                                saveUserSettingsToServer({ ...userSettings, topP: newTopP })
                                            }}
                                            className={`w-full ${isDarkMode ? 'accent-blue-400' : 'accent-blue-600'
                                                }`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            {t('settings.parameters.topK', { value: settings.topK })}
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="100"
                                            step="1"
                                            value={settings.topK}
                                            onChange={(e) => {
                                                const newTopK = parseInt(e.target.value)
                                                setSettings(prev => ({ ...prev, topK: newTopK }))
                                                setUserSettings(prev => ({ ...prev, topK: newTopK }))
                                                saveUserSettingsToServer({ ...userSettings, topK: newTopK })
                                            }}
                                            className={`w-full ${isDarkMode ? 'accent-blue-400' : 'accent-blue-600'
                                                }`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            {t('settings.parameters.maxTokens', { value: settings.maxTokens })}
                                        </label>
                                        <input
                                            type="range"
                                            min="4096"
                                            max="262144"
                                            step="1024"
                                            value={settings.maxTokens}
                                            onChange={(e) => {
                                                const newMaxTokens = parseInt(e.target.value)
                                                setSettings(prev => ({ ...prev, maxTokens: newMaxTokens }))
                                                setUserSettings(prev => ({ ...prev, maxTokens: newMaxTokens }))
                                                saveUserSettingsToServer({ ...userSettings, maxTokens: newMaxTokens })
                                            }}
                                            className={`w-full ${isDarkMode ? 'accent-blue-400' : 'accent-blue-600'
                                                }`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            {t('settings.parameters.showTokenStats')}
                                        </label>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSettings(prev => ({ ...prev, showTokenStats: !prev.showTokenStats }))
                                                    setUserSettings(prev => ({ ...prev, showTokenStats: !prev.showTokenStats }))
                                                    saveUserSettingsToServer({ ...userSettings, showTokenStats: !userSettings.showTokenStats })
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${settings.showTokenStats
                                                    ? 'bg-blue-600'
                                                    : isDarkMode
                                                        ? 'bg-gray-600'
                                                        : 'bg-gray-300'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showTokenStats ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {settings.showTokenStats ? t('settings.parameters.on') : t('settings.parameters.off')}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            </>
                        )}
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
                                    {message.role === 'assistant' && (message.tokenCount !== undefined || isStreaming) && settings.showTokenStats && (
                                        <div className={`mt-2 text-xs font-mono transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {(isStreaming || message.tokenCount !== undefined) && (
                                                <span className="inline-block px-2 py-1 rounded-sm bg-gray-100 dark:bg-gray-700">
                                                    {message.tokenCount || tokenCount} tokens | {(message.tokensPerSecond || tokensPerSecond).toFixed(2)} tokens/s
                                                </span>
                                            )}
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

export default App
