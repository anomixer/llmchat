import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    thinking?: string
    timestamp: Date
    expandedFiles?: boolean

    interrupted?: boolean
    hiddenContent?: string
    tokenCount?: number
    tokensPerSecond?: number
}

export interface Conversation {
    id: string
    title: string
    messages: Message[]
    createdAt: Date
    updatedAt: Date
}

type UseConversationsArgs = {
    token: string | null
    getDefaultConversationTitle: (index: number) => string
}

function reviveConversationDates(raw: any): Conversation {
    return {
        ...raw,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
        messages: (raw.messages || []).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
        }))
    }
}

export function useConversations(args: UseConversationsArgs) {
    const { token, getDefaultConversationTitle } = args

    const initialConversation = useMemo<Conversation>(() => {
        const now = new Date()
        return {
            id: Date.now().toString(),
            title: getDefaultConversationTitle(1),
            messages: [],
            createdAt: now,
            updatedAt: now
        }
    }, [getDefaultConversationTitle])

    const [conversations, setConversations] = useState<Conversation[]>([initialConversation])
    const [conversationsLoaded, setConversationsLoaded] = useState(false)

    // 保存防抖：避免每次 conversations 改變都立即 POST（串流時一輪會觸發多次）
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latestConversationsRef = useRef<Conversation[]>(conversations)
    latestConversationsRef.current = conversations
    const tokenRef = useRef(token)
    tokenRef.current = token
    // 載入完成後的第一次 save 是「把剛載入的資料再存回去」，純多餘 → 跳過
    const skipSaveRef = useRef(false)

    const [currentConversationId, setCurrentConversationId] = useState<string>(() => {
        try {
            return localStorage.getItem('currentConversationId') || ''
        } catch {
            return ''
        }
    })

    const loadUserConversations = useCallback(async () => {
        if (!token) return

        try {
            const response = await fetch('/api/conversations', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                const serverConversations: Conversation[] = (data.conversations || []).map(reviveConversationDates)

                if (serverConversations.length > 0) {
                    setConversations(serverConversations)
                    setCurrentConversationId(serverConversations[0].id)
                } else {
                    setConversations([initialConversation])
                    setCurrentConversationId(initialConversation.id)
                }
            }
        } catch (error) {
            console.error('Error loading conversations:', error)
        } finally {
            setConversationsLoaded(true)
        }
    }, [initialConversation, token])

    const saveConversationsToServer = useCallback(
        async (conversationsToSave: Conversation[]) => {
            if (!token) return

            try {
                await fetch('/api/conversations', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ conversations: conversationsToSave })
                })
            } catch (error) {
                console.error('Error saving conversations:', error)
            }
        },
        [token]
    )

    // 立即保存（元件卸載時用，確保防抖窗口內的變更不被丟失）
    const flushSave = useCallback(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
            saveTimerRef.current = null
        }
        if (tokenRef.current) {
            saveConversationsToServer(latestConversationsRef.current)
        }
    }, [saveConversationsToServer])

    useEffect(() => {
        if (token && !conversationsLoaded) {
            // 載入前先把「載入後的第一次 save」標記為跳過（那只是把剛載入的資料再存回去）
            skipSaveRef.current = true
            loadUserConversations()
        } else if (!token && conversationsLoaded) {
            setConversations([])
            setConversationsLoaded(false)
            setCurrentConversationId('')
        }
    }, [conversationsLoaded, loadUserConversations, token])

    // 防抖保存：串流時一輪的多個 appendMessage 會合併成一次 POST
    useEffect(() => {
        if (!conversationsLoaded || !token) return
        if (skipSaveRef.current) {
            skipSaveRef.current = false
            return
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            saveConversationsToServer(conversations)
        }, 800)
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
    }, [conversations, conversationsLoaded, saveConversationsToServer, token])

    // 卸載時把防抖窗口內的變更補存一次
    useEffect(() => {
        return () => flushSave()
    }, [flushSave])

    useEffect(() => {
        try {
            localStorage.setItem('currentConversationId', currentConversationId)
        } catch {
            // ignore
        }
    }, [currentConversationId])

    useEffect(() => {
        if (conversations.length === 0) return

        const exists = currentConversationId && conversations.some(c => c.id === currentConversationId)
        if (!exists) {
            setCurrentConversationId(conversations[0].id)
        }
    }, [conversations, currentConversationId])

    const createConversation = useCallback(
        (args: { title: string; messages?: Message[] }) => {
            const now = new Date()
            const messages = args.messages ?? []
            return {
                id: Date.now().toString(),
                title: args.title,
                messages,
                createdAt: now,
                updatedAt: now
            } satisfies Conversation
        },
        []
    )

    const addConversation = useCallback((conversation: Conversation, makeCurrent = true) => {
        setConversations(prev => [...prev, conversation])
        if (makeCurrent) {
            setCurrentConversationId(conversation.id)
        }
    }, [])

    const createNewConversation = useCallback(() => {
        const index = (conversations?.length || 0) + 1
        const conversation = createConversation({ title: getDefaultConversationTitle(index) })
        addConversation(conversation, true)
        return conversation
    }, [addConversation, conversations?.length, createConversation, getDefaultConversationTitle])

    const removeConversation = useCallback(
        (conversationId: string) => {
            setConversations(prev => prev.filter(c => c.id !== conversationId))
            if (currentConversationId === conversationId) {
                const remaining = conversations.filter(c => c.id !== conversationId)
                setCurrentConversationId(remaining.length > 0 ? remaining[0].id : '')
            }
        },
        [conversations, currentConversationId]
    )

    const updateConversationTitle = useCallback((conversationId: string, title: string) => {
        setConversations(prev =>
            prev.map(c => (c.id === conversationId ? { ...c, title, updatedAt: new Date() } : c))
        )
    }, [])

    const clearConversationMessages = useCallback((conversationId: string) => {
        setConversations(prev =>
            prev.map(c => (c.id === conversationId ? { ...c, messages: [], updatedAt: new Date() } : c))
        )
    }, [])

    const appendMessage = useCallback((conversationId: string, message: Message) => {
        setConversations(prev =>
            prev.map(c =>
                c.id === conversationId ? { ...c, messages: [...c.messages, message], updatedAt: new Date() } : c
            )
        )
    }, [])

    const deleteMessage = useCallback((conversationId: string, messageId: string) => {
        setConversations(prev =>
            prev.map(c =>
                c.id === conversationId
                    ? { ...c, messages: c.messages.filter(msg => msg.id !== messageId), updatedAt: new Date() }
                    : c
            )
        )
    }, [])

    return {
        conversations,
        conversationsLoaded,
        currentConversationId,
        setCurrentConversationId,
        setConversations,
        createConversation,
        addConversation,
        createNewConversation,
        removeConversation,
        updateConversationTitle,
        clearConversationMessages,
        appendMessage,
        deleteMessage
    }
}
