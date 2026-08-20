import type { Message } from '../hooks/useConversations'

// Token estimation helpers
function estimateTokens(text: string): number {
    if (!text) return 0
    let tokens = 0
    // CJK characters match range: Chinese, Japanese, Korean
    const cjkRegex = /[　-〿぀-ゟ゠-ヿ＀-￯一-鿿㐀-䶿가-힣]/g
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

export function estimateConversationTokens(
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
