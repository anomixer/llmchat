import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SpeechQueueItem = {
    id: string
    text: string
    messageId: string
    timestamp: Date
}

type UseSpeechArgs = {
    userId: string | undefined
    language: string
    onTranscript: (text: string) => void
    unsupportedVoiceInputText: string
    unsupportedVoiceText: string
}

type SpeechButtonState = {
    isPlayingThis: boolean
    isGlobalPlaying: boolean
    isInQueue: boolean
}

function filterTextForSpeech(text: string): string {
    let filteredText = text

    filteredText = filteredText.replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        ''
    )

    filteredText = filteredText
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/^>\s*/gm, '')
        .replace(/^[\s]*[-\*\+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        .replace(/^[\s]*\|[\s\-\|]*\|[\s]*$/gm, '')
        .replace(/^\s*\|[:-]+\|\s*$/gm, '')
        .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\n\s*\n/g, '\n')
        .trim()

    return filteredText
}

function mapLanguageToBcp47(language: string): string {
    const languageMap: Record<string, string> = {
        'zh-TW': 'zh-TW',
        'zh-CN': 'zh-CN',
        en: 'en-US',
        ja: 'ja-JP',
        ko: 'ko-KR'
    }

    return languageMap[language] || 'zh-TW'
}

export function useSpeech(args: UseSpeechArgs) {
    const { userId, language, onTranscript, unsupportedVoiceInputText, unsupportedVoiceText } = args

    const [isRecording, setIsRecording] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [speechQueue, setSpeechQueue] = useState<SpeechQueueItem[]>([])
    const [isProcessingQueue, setIsProcessingQueue] = useState(false)
    const [globalSpeakingMessageId, setGlobalSpeakingMessageId] = useState<string | null>(null)
    const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<string | null>(null)

    const recognitionRef = useRef<any>(null)
    const speechChannelRef = useRef<BroadcastChannel | null>(null)
    const currentPlayingItemRef = useRef<SpeechQueueItem | null>(null)
    const isProcessingQueueRef = useRef(false)

    useEffect(() => {
        isProcessingQueueRef.current = isProcessingQueue
    }, [isProcessingQueue])

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return

        speechChannelRef.current = new BroadcastChannel('llmchat-speech-sync')
        speechChannelRef.current.onmessage = event => {
            const { type, messageId, sessionId } = event.data || {}
            if (sessionId !== userId) {
                if (type === 'speech-start') {
                    setGlobalSpeakingMessageId(messageId)
                } else if (type === 'speech-end') {
                    setGlobalSpeakingMessageId(null)
                }
            }
        }

        return () => {
            speechChannelRef.current?.close()
            speechChannelRef.current = null
        }
    }, [userId])

    const initSpeechRecognition = useCallback(() => {
        const win = window as any
        if (!('SpeechRecognition' in win) && !('webkitSpeechRecognition' in win)) {
            alert(unsupportedVoiceInputText)
            return null
        }

        const RecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition
        const recognition = new RecognitionCtor()

        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = mapLanguageToBcp47(language)

        recognition.onstart = () => {
            setIsRecording(true)
        }

        recognition.onend = () => {
            setIsRecording(false)
        }

        recognition.onresult = (event: any) => {
            const transcript = event?.results?.[0]?.[0]?.transcript
            if (typeof transcript === 'string') {
                onTranscript(transcript)
            }
        }

        recognition.onerror = (event: any) => {
            console.error('語音識別錯誤:', event?.error)
            setIsRecording(false)
        }

        return recognition
    }, [language, onTranscript, unsupportedVoiceInputText])

    const startVoiceInput = useCallback(() => {
        if (isRecording) {
            recognitionRef.current?.stop?.()
            return
        }

        if (!recognitionRef.current) {
            recognitionRef.current = initSpeechRecognition()
        }

        recognitionRef.current?.start?.()
    }, [initSpeechRecognition, isRecording])

    const broadcastSpeechEnd = useCallback(() => {
        if (speechChannelRef.current) {
            speechChannelRef.current.postMessage({
                type: 'speech-end',
                messageId: null,
                sessionId: userId
            })
        }
    }, [userId])

    const broadcastSpeechStart = useCallback(
        (messageId: string) => {
            if (speechChannelRef.current) {
                speechChannelRef.current.postMessage({
                    type: 'speech-start',
                    messageId,
                    sessionId: userId
                })
            }
        },
        [userId]
    )

    const stopCurrentSpeech = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
        }

        currentPlayingItemRef.current = null
        setIsSpeaking(false)
        setCurrentPlayingMessageId(null)
        setGlobalSpeakingMessageId(null)
        setIsProcessingQueue(false)

        broadcastSpeechEnd()

        setSpeechQueue(prev => {
            if (prev.length > 0 && prev[0].messageId === currentPlayingMessageId) {
                return prev.slice(1)
            }
            return prev
        })
    }, [broadcastSpeechEnd, currentPlayingMessageId])

    const addToSpeechQueue = useCallback(
        (text: string, messageId: string) => {
            if (!('speechSynthesis' in window)) {
                alert(unsupportedVoiceText)
                return
            }

            const queueItem: SpeechQueueItem = {
                id: Date.now().toString(),
                text,
                messageId,
                timestamp: new Date()
            }

            setSpeechQueue(prev => [...prev, queueItem])
        },
        [unsupportedVoiceText]
    )

    const processSpeechQueue = useCallback(() => {
        if (speechQueue.length === 0 || isProcessingQueueRef.current) {
            return
        }

        setIsProcessingQueue(true)
        const nextItem = speechQueue[0]

        const filteredText = filterTextForSpeech(nextItem.text)
        const utterance = new SpeechSynthesisUtterance(filteredText)

        utterance.lang = mapLanguageToBcp47(language)
        utterance.rate = 1
        utterance.pitch = 1

        utterance.onstart = () => {
            currentPlayingItemRef.current = nextItem
            setCurrentPlayingMessageId(nextItem.messageId)
            setIsSpeaking(true)
            broadcastSpeechStart(nextItem.messageId)
            setGlobalSpeakingMessageId(nextItem.messageId)
        }

        utterance.onend = () => {
            currentPlayingItemRef.current = null
            setIsSpeaking(false)
            setCurrentPlayingMessageId(null)
            setIsProcessingQueue(false)
            setGlobalSpeakingMessageId(null)
            broadcastSpeechEnd()
            setSpeechQueue(prev => prev.slice(1))
        }

        utterance.onerror = () => {
            currentPlayingItemRef.current = null
            setIsSpeaking(false)
            setCurrentPlayingMessageId(null)
            setIsProcessingQueue(false)
            setGlobalSpeakingMessageId(null)
            broadcastSpeechEnd()
            setSpeechQueue(prev => prev.slice(1))
        }

        window.speechSynthesis.speak(utterance)
    }, [broadcastSpeechEnd, broadcastSpeechStart, language, speechQueue])

    useEffect(() => {
        if (speechQueue.length > 0 && !isProcessingQueue) {
            processSpeechQueue()
        }
    }, [speechQueue, isProcessingQueue, processSpeechQueue])

    const clearSpeechQueue = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
        }

        currentPlayingItemRef.current = null
        setIsSpeaking(false)
        setCurrentPlayingMessageId(null)
        setGlobalSpeakingMessageId(null)
        setSpeechQueue([])
        setIsProcessingQueue(false)
        broadcastSpeechEnd()
    }, [broadcastSpeechEnd])

    const removeFromSpeechQueue = useCallback(
        (messageId: string) => {
            setSpeechQueue(prev => {
                const filtered = prev.filter(item => item.messageId !== messageId)

                if (prev.length > 0 && prev[0].messageId === messageId && isSpeaking) {
                    if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel()
                    }

                    currentPlayingItemRef.current = null
                    setIsSpeaking(false)
                    setCurrentPlayingMessageId(null)
                    setGlobalSpeakingMessageId(null)
                    setIsProcessingQueue(false)
                    broadcastSpeechEnd()

                    if (filtered.length > 0) {
                        setTimeout(() => {
                            if (!isProcessingQueueRef.current) {
                                processSpeechQueue()
                            }
                        }, 100)
                    }
                }

                return filtered
            })
        },
        [broadcastSpeechEnd, isSpeaking, processSpeechQueue]
    )

    const speakText = useCallback(
        (text: string, messageId?: string) => {
            const msgId = messageId || 'manual'
            addToSpeechQueue(text, msgId)
        },
        [addToSpeechQueue]
    )

    const toggleSpeechForMessage = useCallback(
        (args: { messageId: string; text: string }) => {
            const { messageId, text } = args

            const isCurrentMessagePlaying = isSpeaking && currentPlayingItemRef.current?.messageId === messageId

            if (isCurrentMessagePlaying) {
                stopCurrentSpeech()
                return
            }

            if (speechQueue.some(item => item.messageId === messageId)) {
                removeFromSpeechQueue(messageId)
                return
            }

            if (globalSpeakingMessageId !== messageId) {
                speakText(text, messageId)
            }
        },
        [globalSpeakingMessageId, isSpeaking, removeFromSpeechQueue, speechQueue, speakText, stopCurrentSpeech]
    )

    const getSpeechButtonState = useCallback(
        (messageId: string): SpeechButtonState => {
            const isPlayingThis = isSpeaking && currentPlayingItemRef.current?.messageId === messageId
            const isGlobalPlaying = globalSpeakingMessageId === messageId
            const isInQueue = speechQueue.some(item => item.messageId === messageId)

            return { isPlayingThis, isGlobalPlaying, isInQueue }
        },
        [globalSpeakingMessageId, isSpeaking, speechQueue]
    )

    const isSpeechButtonDisabled = useCallback(
        (messageId: string) => {
            return globalSpeakingMessageId === messageId && !(isSpeaking && currentPlayingItemRef.current?.messageId === messageId)
        },
        [globalSpeakingMessageId, isSpeaking]
    )

    const voiceButtonIcon = useMemo(() => {
        return isRecording
    }, [isRecording])

    return {
        isRecording,
        startVoiceInput,
        isSpeaking,
        speechQueue,
        globalSpeakingMessageId,
        currentPlayingMessageId,
        currentPlayingItemRef,
        voiceButtonIcon,
        addToSpeechQueue,
        speakText,
        removeFromSpeechQueue,
        clearSpeechQueue,
        stopCurrentSpeech,
        toggleSpeechForMessage,
        getSpeechButtonState,
        isSpeechButtonDisabled
    }
}
