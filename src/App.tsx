import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Settings, Trash2, Moon, Sun, Plus, MessageSquare, Paperclip, X, Mic, MicOff, Volume2, VolumeX, Download, Square, Maximize2, Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarkdownMessage from './MarkdownMsg'
import { Header } from './components/Header'

// Web Speech API types
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition
        webkitSpeechRecognition: typeof SpeechRecognition
    }
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null
    onend: ((this: SpeechRecognition, ev: Event) => any) | null
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
    resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string
    message: string
}

interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
    isFinal: boolean
}

interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
}

declare var SpeechRecognition: {
    prototype: SpeechRecognition
    new(): SpeechRecognition
}

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    thinking?: string
    timestamp: Date
    expandedFiles?: boolean
    interrupted?: boolean
}

interface Conversation {
    id: string
    title: string
    messages: Message[]
    createdAt: Date
    updatedAt: Date
}

interface ChatSettings {
    model: string
    temperature: number
    maxTokens: number
    apiUrl: string
    apiKey: string
    topP: number
    topK: number
}

const App: React.FC = () => {
    const { t, i18n } = useTranslation()

    // 創建初始對話
    const createInitialConversation = (): Conversation => ({
        id: Date.now().toString(),
        title: `${t('conversation.defaultTitle')} 1`,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
    })

    // 初始化對話列表
    const initialConversations = (() => {
        try {
            const saved = localStorage.getItem('conversations')
            if (saved) {
                const parsed = JSON.parse(saved)
                // 確保Date對象正確解析
                const parsedConversations = parsed.map((conv: any) => ({
                    ...conv,
                    createdAt: new Date(conv.createdAt),
                    updatedAt: new Date(conv.updatedAt),
                    messages: conv.messages.map((msg: any) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    }))
                }))
                if (parsedConversations.length > 0) {
                    return parsedConversations
                }
            }
            return [createInitialConversation()]
        } catch (error) {
            console.error('Error loading conversations from localStorage:', error)
            return [createInitialConversation()]
        }
    })()

    const [conversations, setConversations] = useState<Conversation[]>(initialConversations)

    const [currentConversationId, setCurrentConversationId] = useState<string>(() => {
        try {
            const saved = localStorage.getItem('currentConversationId')
            if (saved && initialConversations.some((c: Conversation) => c.id === saved)) {
                return saved
            }
            return initialConversations[0].id
        } catch (error) {
            console.error('Error loading currentConversationId from localStorage:', error)
            return initialConversations[0].id
        }
    })
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // 防抖輸入處理，避免頻繁的高度調整
    const inputTimeoutRef = useRef<number | null>(null)

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
        topK: 40
    })
    const [attachedFiles, setAttachedFiles] = useState<File[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isStreaming, setIsStreaming] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    // 永遠啟用串流模式
    const streamingModeEnabled = true
    const [streamingMessage, setStreamingMessage] = useState('')
    const [streamingThinking, setStreamingThinking] = useState('')
    const [stopRequested, setStopRequested] = useState(false)
    const [stopConfirmText, setStopConfirmText] = useState('')

    // 用於存儲最終串流狀態的 ref
    const finalStateRef = useRef({ content: '', thinking: '' })
    const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
    const [showStreamingThinking, setShowStreamingThinking] = useState(false)
    // 用於控制串流是否應該繼續的 ref
    const shouldContinueStreamingRef = useRef(true)
    const currentRequestIdRef = useRef<string | null>(null) // 存儲當前串流請求ID
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

    // 當前對話的消息
    const currentMessages = conversations.find(c => c.id === currentConversationId)?.messages || []

    const scrollToBottom = () => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }

    // 檢查用戶是否在底部附近
    const isNearBottom = () => {
        const container = messagesContainerRef.current
        if (!container) return true

        // 使用百分比計算：距離底部5%內算作底部
        const scrollTop = container.scrollTop
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight
        const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100

        // 如果內容高度小於等於容器高度，總是算作底部
        if (scrollHeight <= clientHeight) return true

        // 距離底部2%內算作底部（即滾動到98%位置）
        return scrollPercent > 98
    }

    // 處理滾動事件
    const handleScroll = () => {
        if (isNearBottom()) {
            // 無論是否在串流中，只要用戶滾動到底部附近就重新啟用自動滾動
            setShouldAutoScroll(true)
        } else if (isStreaming) {
            // 在串流過程中，如果沒有在底部附近就禁用自動滾動
            setShouldAutoScroll(false)
        } else {
            // 非串流狀態下，遠離底部時禁用自動滾動
            setShouldAutoScroll(false)
        }
    }

    // 切換主題函數
    const toggleTheme = () => {
        const newTheme = !isDarkMode
        setIsDarkMode(newTheme)
        localStorage.setItem('theme', JSON.stringify(newTheme))
        // 更新 body 類別以應用玻璃擬態主題
        document.body.classList.toggle('dark-theme', newTheme)
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

    useEffect(() => {
        scrollToBottom()
    }, [currentMessages])

    // 當流式消息更新時也滾動到底部
    useEffect(() => {
        scrollToBottom()
    }, [streamingMessage])

    // 添加滾動事件監聽器
    useEffect(() => {
        const container = messagesContainerRef.current
        if (container) {
            container.addEventListener('scroll', handleScroll)
            return () => container.removeEventListener('scroll', handleScroll)
        }
    }, [shouldAutoScroll])

    // 移除舊的高度調整 useEffect，因為現在在防抖函數中處理

    // 初始化主題類別
    useEffect(() => {
        document.body.classList.toggle('dark-theme', isDarkMode)
    }, [isDarkMode])

    // 保存對話到本地存儲
    useEffect(() => {
        localStorage.setItem('conversations', JSON.stringify(conversations))
    }, [conversations])

    useEffect(() => {
        localStorage.setItem('currentConversationId', currentConversationId)
    }, [currentConversationId])

    // 創建新對話
    const createNewConversation = () => {
        const newConversation: Conversation = {
            id: Date.now().toString(),
            title: `${t('conversation.defaultTitle')} ${conversations.length + 1}`,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        }
        setConversations(prev => [...prev, newConversation])
        setCurrentConversationId(newConversation.id)
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

        setConversations(prev => prev.filter(c => c.id !== conversationId))
        if (currentConversationId === conversationId) {
            const remaining = conversations.filter(c => c.id !== conversationId)
            setCurrentConversationId(remaining.length > 0 ? remaining[0].id : '')
        }
    }

    // 更新對話標題
    const updateConversationTitle = (conversationId: string, title: string) => {
        setConversations(prev => prev.map(c =>
            c.id === conversationId ? { ...c, title, updatedAt: new Date() } : c
        ))
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

    // 初始化語音識別
    const initSpeechRecognition = () => {
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            alert(t('input.voice.unsupported'))
            return null
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = false
        recognition.interimResults = false

        // 根據當前語言設定語音識別語言
        const languageMap: { [key: string]: string } = {
            'zh-TW': 'zh-TW',
            'zh-CN': 'zh-CN',
            'en': 'en-US',
            'ja': 'ja-JP',
            'ko': 'ko-KR'
        }
        recognition.lang = languageMap[i18n.language] || 'zh-TW'

        recognition.onstart = () => {
            setIsRecording(true)
        }

        recognition.onend = () => {
            setIsRecording(false)
        }

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            setInput(prev => prev + transcript)
        }

        recognition.onerror = (event) => {
            console.error('語音識別錯誤:', event.error)
            setIsRecording(false)
        }

        return recognition
    }

    // 開始語音輸入
    const startVoiceInput = () => {
        if (isRecording) {
            recognitionRef.current?.stop()
            return
        }

        if (!recognitionRef.current) {
            recognitionRef.current = initSpeechRecognition()
        }

        if (recognitionRef.current) {
            recognitionRef.current.start()
        }
    }

    // 語音輸出
    const speakText = (text: string) => {
        if (!('speechSynthesis' in window)) {
            alert(t('messages.voice.unsupported'))
            return
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
            return
        }

        const utterance = new SpeechSynthesisUtterance(text)

        // 根據當前語言設定語音合成語言
        const languageMap: { [key: string]: string } = {
            'zh-TW': 'zh-TW',
            'zh-CN': 'zh-CN',
            'en': 'en-US',
            'ja': 'ja-JP',
            'ko': 'ko-KR'
        }
        utterance.lang = languageMap[i18n.language] || 'zh-TW'
        utterance.rate = 1
        utterance.pitch = 1

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        window.speechSynthesis.speak(utterance)
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

    // 串流思考標籤解析器狀態
    let streamParserState = {
        inThinkTag: false,
        accumulatedThinking: '',
        accumulatedContent: '',
        pendingBuffer: '' // 待處理的buffer
    }

    // 重置解析器狀態
    const resetStreamParser = () => {
        streamParserState = {
            inThinkTag: false,
            accumulatedThinking: '',
            accumulatedContent: '',
            pendingBuffer: ''
        }
    }

    // 處理串流內容的增量解析
    const processStreamChunk = (chunk: string) => {
        streamParserState.pendingBuffer += chunk

        // 持續處理直到不能再處理
        let continueProcessing = true
        while (continueProcessing && streamParserState.pendingBuffer.length > 0) {
            continueProcessing = false

            if (!streamParserState.inThinkTag) {
                // 尋找 <think> 標籤
                const thinkStart = streamParserState.pendingBuffer.indexOf('<think>')

                if (thinkStart !== -1) {
                    // 找到 <think> 標籤
                    const contentBeforeTag = streamParserState.pendingBuffer.substring(0, thinkStart)
                    streamParserState.accumulatedContent += contentBeforeTag
                    streamParserState.inThinkTag = true
                    streamParserState.pendingBuffer = streamParserState.pendingBuffer.substring(thinkStart + 7) // 移除 '<think>'
                    continueProcessing = true // 繼續處理剩餘內容
                }
                // 如果沒有找到 <think>，保留在buffer中
            } else {
                // 在思考標籤內，尋找 </think> 標籤
                const thinkEnd = streamParserState.pendingBuffer.indexOf('</think>')

                if (thinkEnd !== -1) {
                    // 找到 </think> 標籤
                    const thinkingContent = streamParserState.pendingBuffer.substring(0, thinkEnd)
                    streamParserState.accumulatedThinking += thinkingContent
                    streamParserState.inThinkTag = false
                    streamParserState.pendingBuffer = streamParserState.pendingBuffer.substring(thinkEnd + 8) // 移除 '</think>'
                    continueProcessing = true // 繼續處理剩餘內容
                }
                // 如果沒有找到 </think>，保留在buffer中
            }
        }

        // 將剩餘的buffer內容加到對應的累積內容中
        if (streamParserState.pendingBuffer.length > 0) {
            if (streamParserState.inThinkTag) {
                streamParserState.accumulatedThinking += streamParserState.pendingBuffer
            } else {
                streamParserState.accumulatedContent += streamParserState.pendingBuffer
            }
            streamParserState.pendingBuffer = ''
        }

        return {
            thinking: streamParserState.accumulatedThinking,
            content: streamParserState.accumulatedContent
        }
    }

    // 流式發送消息
    const sendStreamingMessage = async () => {
        if ((!input.trim() && attachedFiles.length === 0) || isLoading) return

        // 處理附加檔案
        let messageContent = input.trim()
        if (attachedFiles.length > 0) {
            messageContent = messageContent + '\n\n[附加檔案: ' + attachedFiles.map(f => f.name).join(', ') + ']'
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageContent,
            timestamp: new Date()
        }

        // 如果沒有當前對話，創建一個新的並包含用戶消息
        let conversationId = currentConversationId
        if (!conversationId) {
            const newConversation: Conversation = {
                id: Date.now().toString(),
                title: `對話 ${conversations.length + 1}`,
                messages: [userMessage],
                createdAt: new Date(),
                updatedAt: new Date()
            }
            setConversations(prev => [...prev, newConversation])
            setCurrentConversationId(newConversation.id)
            conversationId = newConversation.id
        } else {
            // 更新現有對話消息
            setConversations(prev => prev.map(c =>
                c.id === conversationId
                    ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() }
                    : c
            ))
        }

        setInput('')
        setAttachedFiles([]) // 清除附加檔案
        setIsLoading(true)
        setStreamingMessage('')
        setStreamingThinking('')
        resetStreamParser() // 重置串流解析器狀態
        finalStateRef.current = { content: '', thinking: '' } // 重置最終狀態
        shouldContinueStreamingRef.current = true // 重置串流繼續標誌
        setStopRequested(false) // 重置停止請求狀態
        setStopConfirmText('') // 重置確認文字
        let currentRequestId: string | null = null // 存儲當前請求ID

        try {
            const currentConversation = conversations.find(c => c.id === conversationId)
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    settings: settings,
                    history: currentConversation?.messages || [],
                    language: i18n.language
                }),
            })

            // 獲取 request ID 用於停止
            currentRequestId = response.headers.get('X-Request-ID')
            currentRequestIdRef.current = currentRequestId

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let accumulatedContent = ''

            if (reader) {
                try {
                    while (shouldContinueStreamingRef.current) {
                        const { done, value } = await reader.read()
                        if (done) {
                            console.log('Stream reader done')
                            break
                        }

                        const chunk = decoder.decode(value, { stream: true })
                        console.log('Received chunk:', chunk)

                        // 解析 Ollama 的 JSON Lines 格式
                        const lines = chunk.split('\n').filter(line => line.trim())

                        for (const line of lines) {
                            // 檢查是否在中斷過程中
                            if (!shouldContinueStreamingRef.current) {
                                break
                            }

                            try {
                                const data = JSON.parse(line)
                                console.log('Parsed stream data:', data)

                                // 處理 content 字段（可能包含標籤式思考）
                                if (data.message?.content) {
                                    const { thinking, content } = processStreamChunk(data.message.content)
                                    setStreamingThinking(thinking)
                                    setStreamingMessage(content)
                                    finalStateRef.current.content = content
                                    // 只在有實際思考內容時才設置，避免覆蓋原生 thinking
                                    if (thinking) {
                                        finalStateRef.current.thinking = thinking
                                    }
                                }

                                // 處理 thinking 字段（原生 thinking 模型）
                                if (data.message?.thinking) {
                                    setStreamingThinking(prev => {
                                        const newThinking = prev + data.message.thinking
                                        finalStateRef.current.thinking = newThinking
                                        return newThinking
                                    })
                                }

                                if (data.done) {
                                    console.log('Stream completed')
                                    break
                                }
                            } catch (e) {
                                console.error('Parse error:', e, 'Line:', line)
                                // 忽略解析錯誤
                            }
                        }

                        // 如果在中斷過程中，跳出外層循環
                        if (!shouldContinueStreamingRef.current) {
                            break
                        }
                    }

                    // 使用 finalStateRef 獲取最終狀態，避免狀態更新時機問題
                    const finalContent = finalStateRef.current.content
                    const finalThinking = finalStateRef.current.thinking

                    console.log('Stream completed, final response:', finalContent, 'thinking:', finalThinking)

                    // 檢查是否被用戶中斷
                    const wasInterrupted = !shouldContinueStreamingRef.current

                    // 流式回應完成
                    const assistantMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: wasInterrupted ? finalContent + '\n\n**' + t('messages.interrupted') + '**' : finalContent,
                        thinking: finalThinking || undefined,
                        timestamp: new Date(),
                        interrupted: wasInterrupted
                    }

                    setConversations(prev => prev.map(c =>
                        c.id === conversationId
                            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
                            : c
                    ))

                    // 更新對話標題（如果這是第一條消息）
                    if (currentConversation && currentConversation.messages.length === 0) {
                        const title = userMessage.content.length > 20
                            ? userMessage.content.substring(0, 20) + '...'
                            : userMessage.content
                        updateConversationTitle(conversationId, title)
                    }
                } finally {
                    reader.releaseLock()

                    // 如果被中斷，確保最終狀態已更新
                    if (!shouldContinueStreamingRef.current) {
                        // 處理剩餘的buffer內容
                        if (streamParserState.pendingBuffer.length > 0) {
                            const { thinking, content } = processStreamChunk('')
                            finalStateRef.current.content += content
                            if (thinking) {
                                finalStateRef.current.thinking += thinking
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error sending streaming message:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: t('messages.error'),
                timestamp: new Date()
            }
            setConversations(prev => prev.map(c =>
                c.id === conversationId
                    ? { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date() }
                    : c
            ))
        } finally {
            setIsLoading(false)
            setIsStreaming(false)
            setStreamingMessage('')
            setStreamingThinking('')
            setStopRequested(false) // 清除停止請求狀態
            setStopConfirmText('') // 清除確認文字
            currentRequestIdRef.current = null // 清除請求ID
            // 發送完成後自動聚焦到輸入框
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 100)
        }
    }

    // 組件掛載時載入預設配置和模型列表
    useEffect(() => {
        loadDefaultConfig().then(() => {
            loadAvailableModels()
        })
    }, [])


    // 鍵盤快捷鍵
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl/Cmd + I: 新對話
            if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
                event.preventDefault()
                createNewConversation()
            }
            // Ctrl/Cmd + K: 清除對話
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault()
                clearChat()
            }
            // Ctrl/Cmd + ,: 開啟設定
            if ((event.ctrlKey || event.metaKey) && event.key === ',') {
                event.preventDefault()
                setShowSettings(!showSettings)
            }
            // Ctrl/Cmd + B: 切換對話列表
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault()
                setShowConversations(!showConversations)
            }
            // Escape: 關閉面板
            if (event.key === 'Escape') {
                if (showSettings) setShowSettings(false)
                if (showConversations) setShowConversations(false)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [showSettings, showConversations])

    // 點擊外部關閉面板
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // 關閉導出菜單
            const menu = document.getElementById('export-menu')
            const exportButton = document.querySelector('[data-button="export"]')
            if (menu && exportButton && !menu.contains(event.target as Node) && !exportButton.contains(event.target as Node)) {
                menu.classList.add('hidden')
            }

            // 關閉對話列表面板 - 點擊任何地方都關閉，除了對話列表面板和按鈕本身
            const conversationsPanel = document.querySelector('[data-panel="conversations"]')
            const conversationsButton = document.querySelector('[data-button="conversations"]')
            if (showConversations && conversationsPanel && conversationsButton &&
                !conversationsPanel.contains(event.target as Node) && !conversationsButton.contains(event.target as Node)) {
                setShowConversations(false)
            }

            // 關閉設定面板 - 排除模型按鈕
            const settingsPanel = document.querySelector('[data-panel="settings"]')
            const settingsButton = document.querySelector('[data-button="settings"]')
            const modelButton = document.querySelector('[data-button="model"]')
            if (showSettings && settingsPanel && settingsButton &&
                !settingsPanel.contains(event.target as Node) && !settingsButton.contains(event.target as Node) &&
                !modelButton?.contains(event.target as Node)) {
                setShowSettings(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showConversations, showSettings])

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
        console.log('Starting streaming message...')
        setIsStreaming(true) // 立即設置串流狀態
        await sendStreamingMessage()
    }

    // 處理發送按鈕點擊
    const handleSendClick = () => {
        if (isStreaming) {
            // 在串流過程中，按鈕用於停止
            if (!stopRequested) {
                // 第一次點擊，顯示確認提示
                setStopRequested(true)
                setStopConfirmText('再按一次停止生成')
                // 設置定時器，5秒後重置狀態
                setTimeout(() => {
                    setStopRequested(false)
                    setStopConfirmText('')
                }, 5000)
            } else {
                // 第二次點擊，真正停止
                shouldContinueStreamingRef.current = false
                setStopRequested(false)
                setStopConfirmText('')
                // 調用後端停止端點
                if (currentRequestIdRef.current) {
                    fetch('/api/chat/stop', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            requestId: currentRequestIdRef.current
                        }),
                    }).catch(error => {
                        console.error('停止請求失敗:', error)
                    })
                }
            }
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

    const clearChat = () => {
        if (currentConversationId) {
            const confirmed = window.confirm(t('conversation.clear.confirm'))
            if (!confirmed) return

            setConversations(prev => prev.map(c =>
                c.id === currentConversationId
                    ? { ...c, messages: [], updatedAt: new Date() }
                    : c
            ))
        }
    }

    return (
        <div className={`flex flex-col h-full transition-colors ${isFullscreen ? 'fullscreen-app' : ''}`}>
            <Header
                isDarkMode={isDarkMode}
                isFullscreen={isFullscreen}
                showSettings={showSettings}
                showConversations={showConversations}
                settings={settings}
                conversations={conversations}
                onToggleTheme={toggleTheme}
                onToggleFullscreen={toggleFullscreen}
                onToggleSettings={() => setShowSettings(!showSettings)}
                onToggleConversations={() => setShowConversations(!showConversations)}
                onNewConversation={createNewConversation}
                onClearChat={clearChat}
                onExportConversation={exportConversation}
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
            {showSettings && (
                <div data-panel="settings" className={`border-b px-4 py-3 transition-colors ${isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                    }`}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 左側：LLM 配置 */}
                        <div className="space-y-4">
                            <h3 className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                }`}>
                                {t('settings.panels.llm')}
                            </h3>

                            <div>
                                <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                    {t('settings.api.url')}
                                </label>
                                <input
                                    type="text"
                                    value={settings.apiUrl}
                                    onChange={(e) => setSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
                                    placeholder="http://localhost:11434"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                    {t('settings.api.key')}
                                </label>
                                <input
                                    type="password"
                                    value={settings.apiKey}
                                    onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder={t('settings.api.keyPlaceholder')}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300'
                                        }`}
                                />
                            </div>

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
                                    onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
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
                                    onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
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
                                    onChange={(e) => setSettings(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
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
                                    onChange={(e) => setSettings(prev => ({ ...prev, topK: parseInt(e.target.value) }))}
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
                                    onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                    className={`w-full ${isDarkMode ? 'accent-blue-400' : 'accent-blue-600'
                                        }`}
                                />
                            </div>

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
                            className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
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
                                <div className={`inline-block px-4 py-2 rounded-lg transition-colors chat-message-content ${message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : isDarkMode
                                        ? 'bg-gray-800 text-gray-100 border border-gray-700'
                                        : 'bg-white text-gray-900 border border-gray-200'
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
                                            <button
                                                onClick={() => speakText(message.content)}
                                                className={`mt-2 p-1 rounded transition-colors ${isSpeaking
                                                    ? 'text-green-500'
                                                    : isDarkMode
                                                        ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                                                        : 'text-gray-500 hover:text-green-600 hover:bg-gray-100'
                                                    }`}
                                                title={isSpeaking ? t('messages.voice.stop') : t('messages.voice.play')}
                                            >
                                                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            </button>
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
                {isStreaming && (() => {
                    console.log('Rendering streaming UI, message:', streamingMessage, 'thinking:', streamingThinking)
                    return (
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
                    )
                })()}
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
                                placeholder={t('input.placeholder')}
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