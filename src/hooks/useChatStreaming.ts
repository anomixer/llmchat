import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface StreamChatInput {
    message: string
    settings: any
    history: Array<{ role: string; content: string }>
    language: string
    images?: string[]
    webSearch?: boolean
}

export interface StreamChatResult {
    content: string
    thinking: string
    wasInterrupted: boolean
    tokenCount: number
    tokensPerSecond: number
}

type ParserState = {
    inThinkTag: boolean
    accumulatedThinking: string
    accumulatedContent: string
    pendingBuffer: string
}

function createInitialParserState(): ParserState {
    return {
        inThinkTag: false,
        accumulatedThinking: '',
        accumulatedContent: '',
        pendingBuffer: ''
    }
}

export function useChatStreaming(args: { token: string | null }) {
    const { token } = args
    const { t } = useTranslation()

    const [isStreaming, setIsStreaming] = useState(false)
    const [streamingMessage, setStreamingMessage] = useState('')
    const [streamingThinking, setStreamingThinking] = useState('')
    const [stopRequested, setStopRequested] = useState(false)
    const [stopConfirmText, setStopConfirmText] = useState('')
    const [tokenCount, setTokenCount] = useState(0)
    const [tokensPerSecond, setTokensPerSecond] = useState(0)

    const shouldContinueRef = useRef(true)
    const currentRequestIdRef = useRef<string | null>(null)
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
    const stopResetTimerRef = useRef<number | null>(null)

    const parserStateRef = useRef<ParserState>(createInitialParserState())
    const finalStateRef = useRef({ content: '', thinking: '' })

    const resetParser = useCallback(() => {
        parserStateRef.current = createInitialParserState()
    }, [])

    const processStreamChunk = useCallback((chunk: string) => {
        const state = parserStateRef.current
        state.pendingBuffer += chunk

        let continueProcessing = true
        while (continueProcessing && state.pendingBuffer.length > 0) {
            continueProcessing = false

            if (!state.inThinkTag) {
                const thinkStart = state.pendingBuffer.indexOf('<think>')

                if (thinkStart !== -1) {
                    const contentBeforeTag = state.pendingBuffer.substring(0, thinkStart)
                    state.accumulatedContent += contentBeforeTag
                    state.inThinkTag = true
                    state.pendingBuffer = state.pendingBuffer.substring(thinkStart + 7)
                    continueProcessing = true
                }
            } else {
                const thinkEnd = state.pendingBuffer.indexOf('</think>')

                if (thinkEnd !== -1) {
                    const thinkingContent = state.pendingBuffer.substring(0, thinkEnd)
                    state.accumulatedThinking += thinkingContent
                    state.inThinkTag = false
                    state.pendingBuffer = state.pendingBuffer.substring(thinkEnd + 8)
                    continueProcessing = true
                }
            }
        }

        if (state.pendingBuffer.length > 0) {
            if (state.inThinkTag) {
                state.accumulatedThinking += state.pendingBuffer
            } else {
                state.accumulatedContent += state.pendingBuffer
            }
            state.pendingBuffer = ''
        }

        return {
            thinking: state.accumulatedThinking,
            content: state.accumulatedContent
        }
    }, [])

    const clearStopTimer = useCallback(() => {
        if (stopResetTimerRef.current) {
            window.clearTimeout(stopResetTimerRef.current)
            stopResetTimerRef.current = null
        }
    }, [])

    const requestStop = useCallback((force = false) => {
        if (!isStreaming) return

        if (!stopRequested && !force) {
            setStopRequested(true)
            setStopConfirmText(t('input.stopDoubleConfirm', '再按一次停止生成'))

            clearStopTimer()
            stopResetTimerRef.current = window.setTimeout(() => {
                setStopRequested(false)
                setStopConfirmText('')
            }, 5000)
            return
        }

        // second click or force
        shouldContinueRef.current = false
        setStopRequested(false)
        setStopConfirmText('')
        clearStopTimer()

        try {
            readerRef.current?.cancel().catch(() => { })
        } catch {
            // ignore
        }

        const requestId = currentRequestIdRef.current
        if (requestId) {
            fetch('/api/chat/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requestId })
            }).catch(() => { })
        }
    }, [clearStopTimer, isStreaming, stopRequested])

    const streamChat = useCallback(async (input: StreamChatInput): Promise<StreamChatResult> => {
        if (!token) {
            throw new Error('Missing auth token')
        }

        setIsStreaming(true)
        setStreamingMessage('')
        setStreamingThinking('')
        setStopRequested(false)
        setStopConfirmText('')
        setTokenCount(0)
        setTokensPerSecond(0)
        clearStopTimer()

        resetParser()
        finalStateRef.current = { content: '', thinking: '' }
        shouldContinueRef.current = true
        currentRequestIdRef.current = null

        let pendingContentUpdate = ''
        let pendingThinkingUpdate = ''
        let currentTokenCount = 0
        const generationStartTime = Date.now()
        let lastUpdateTime = Date.now()
        const UPDATE_INTERVAL = 50

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: input.message,
                    settings: input.settings,
                    history: input.history,
                    language: input.language,
                    images: input.images,
                    webSearch: input.webSearch
                })
            })

            currentRequestIdRef.current = response.headers.get('X-Request-ID')

            if (!response.ok) {
                const errText = await response.text().catch(() => '')
                throw new Error(`[${response.status}]: ${errText || response.statusText}`)
            }

            const reader = response.body?.getReader()
            readerRef.current = reader || null
            const decoder = new TextDecoder()

            if (reader) {
                while (shouldContinueRef.current) {
                    const { done, value } = await reader.read()
                    if (done) {
                        break
                    }

                    const chunk = decoder.decode(value, { stream: true })
                    const lines = chunk.split('\n').filter(line => line.trim())

                    for (const line of lines) {
                        if (!shouldContinueRef.current) break

                        try {
                            const data = JSON.parse(line)

                            if (data.message?.content) {
                                const { thinking, content } = processStreamChunk(data.message.content)
                                pendingContentUpdate = content
                                finalStateRef.current.content = content

                                if (thinking) {
                                    pendingThinkingUpdate = thinking
                                    finalStateRef.current.thinking = thinking
                                }

                                currentTokenCount++
                            }

                            if (data.message?.thinking) {
                                pendingThinkingUpdate = (pendingThinkingUpdate || finalStateRef.current.thinking) + data.message.thinking
                                finalStateRef.current.thinking = pendingThinkingUpdate
                                currentTokenCount++ // 思考區塊也計入 Token 數
                            }

                            if (data.done) {
                                // 當串流結束時，如果 Ollama 有提供精確的 Token 數統計，優先使用
                                if (data.eval_count) {
                                    currentTokenCount = data.eval_count
                                }
                                break
                            }
                        } catch {
                            if (line.includes('"message":{') && !line.includes('}')) {
                                const completedLine = line + '}}'
                                try {
                                    const data = JSON.parse(completedLine)

                                    if (data.message?.content) {
                                        const { thinking, content } = processStreamChunk(data.message.content)
                                        pendingContentUpdate = content
                                        finalStateRef.current.content = content
                                        if (thinking) {
                                            pendingThinkingUpdate = thinking
                                            finalStateRef.current.thinking = thinking
                                        }
                                        currentTokenCount++
                                    }

                                    if (data.message?.thinking) {
                                        pendingThinkingUpdate = (pendingThinkingUpdate || finalStateRef.current.thinking) + data.message.thinking
                                        finalStateRef.current.thinking = pendingThinkingUpdate
                                        currentTokenCount++ // 思考區塊也計入 Token 數
                                    }

                                    if (data.done) {
                                        if (data.eval_count) {
                                            currentTokenCount = data.eval_count
                                        }
                                        break
                                    }
                                } catch {
                                    // ignore
                                }
                            }
                        }
                    }

                    const now = Date.now()
                    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                        if (pendingContentUpdate !== '') {
                            setStreamingMessage(pendingContentUpdate)
                        }
                        if (pendingThinkingUpdate !== '') {
                            setStreamingThinking(pendingThinkingUpdate)
                        }
                        setTokenCount(currentTokenCount)
                        const elapsedSeconds = (now - generationStartTime) / 1000
                        const speed = currentTokenCount / (elapsedSeconds || 1)
                        setTokensPerSecond(speed)
                        lastUpdateTime = now
                        pendingContentUpdate = ''
                        pendingThinkingUpdate = ''
                    }

                    if (!shouldContinueRef.current) {
                        break
                    }
                }

                if (pendingContentUpdate !== '') {
                    setStreamingMessage(pendingContentUpdate)
                }
                if (pendingThinkingUpdate !== '') {
                    setStreamingThinking(pendingThinkingUpdate)
                }
                setTokenCount(currentTokenCount)
                const elapsedSeconds = (Date.now() - generationStartTime) / 1000
                setTokensPerSecond(currentTokenCount / (elapsedSeconds || 1))
            }

            const finalContent = finalStateRef.current.content
            const finalThinking = finalStateRef.current.thinking

            return {
                content: finalContent,
                thinking: finalThinking,
                wasInterrupted: !shouldContinueRef.current,
                tokenCount: currentTokenCount,
                tokensPerSecond: currentTokenCount / ((Date.now() - generationStartTime) / 1000 || 1)
            }
        } finally {
            try {
                readerRef.current?.releaseLock()
            } catch {
                // ignore
            }
            readerRef.current = null
            currentRequestIdRef.current = null
            setIsStreaming(false)
            setStopRequested(false)
            setStopConfirmText('')
        }
    }, [clearStopTimer, processStreamChunk, resetParser, token])

    useEffect(() => {
        return () => {
            clearStopTimer()
            try {
                readerRef.current?.cancel().catch(() => { })
            } catch {
                // ignore
            }
        }
    }, [clearStopTimer])

    return {
        isStreaming,
        streamingMessage,
        streamingThinking,
        stopRequested,
        stopConfirmText,
        tokenCount,
        tokensPerSecond,
        requestStop,
        streamChat
    }
}
