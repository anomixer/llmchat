import { useCallback, useEffect, useState, type RefObject } from 'react'

type UseAutoScrollArgs = {
    isStreaming: boolean
    messagesEndRef: RefObject<HTMLDivElement>
    messagesContainerRef: RefObject<HTMLDivElement>
    currentMessages: unknown
    streamingMessage: string
}

export function useAutoScroll(args: UseAutoScrollArgs) {
    const { isStreaming, messagesEndRef, messagesContainerRef, currentMessages, streamingMessage } = args

    const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

    const scrollToBottom = useCallback(() => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messagesEndRef, shouldAutoScroll])

    const isNearBottom = useCallback(() => {
        const container = messagesContainerRef.current
        if (!container) return true

        const scrollTop = container.scrollTop
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight
        const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100

        if (scrollHeight <= clientHeight) return true

        return scrollPercent > 98
    }, [messagesContainerRef])

    const handleScroll = useCallback(() => {
        if (isNearBottom()) {
            setShouldAutoScroll(true)
        } else if (isStreaming) {
            setShouldAutoScroll(false)
        } else {
            setShouldAutoScroll(false)
        }
    }, [isNearBottom, isStreaming])

    useEffect(() => {
        scrollToBottom()
    }, [currentMessages, scrollToBottom])

    useEffect(() => {
        scrollToBottom()
    }, [streamingMessage, scrollToBottom])

    useEffect(() => {
        const container = messagesContainerRef.current
        if (container) {
            container.addEventListener('scroll', handleScroll)
            return () => container.removeEventListener('scroll', handleScroll)
        }
    }, [handleScroll, messagesContainerRef])

    return { shouldAutoScroll, setShouldAutoScroll, scrollToBottom }
}
