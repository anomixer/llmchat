import { useEffect } from 'react'

export function useKeyboardShortcuts(args: {
    showSettings: boolean
    showConversations: boolean
    setShowSettings: (v: boolean) => void
    setShowConversations: (v: boolean) => void
    onNewConversation: () => void
    onClearChat: () => void
}) {
    const {
        showSettings,
        showConversations,
        setShowSettings,
        setShowConversations,
        onNewConversation,
        onClearChat
    } = args

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
                event.preventDefault()
                onNewConversation()
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault()
                onClearChat()
            }
            if ((event.ctrlKey || event.metaKey) && event.key === ',') {
                event.preventDefault()
                setShowSettings(!showSettings)
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault()
                setShowConversations(!showConversations)
            }
            if (event.key === 'Escape') {
                if (showSettings) setShowSettings(false)
                if (showConversations) setShowConversations(false)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [
        onClearChat,
        onNewConversation,
        setShowConversations,
        setShowSettings,
        showConversations,
        showSettings
    ])
}
