export type SupportedLanguage = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko'

export function normalizeLanguage(lang: unknown): SupportedLanguage {
    const value = typeof lang === 'string' ? lang : ''
    if (value === 'zh-TW' || value === 'zh-CN' || value === 'en' || value === 'ja' || value === 'ko') {
        return value
    }
    return 'zh-TW'
}

export function getSystemPrompt(lang: unknown): string {
    const language = normalizeLanguage(lang)
    const prompts: Record<SupportedLanguage, string> = {
        'zh-TW': '你是一個有用的AI助手，請簡潔地用繁體中文回答用戶的問題。',
        'zh-CN': '你是一个有用的AI助手，请简洁地用简体中文回答用户的问题。',
        'en': 'You are a helpful AI assistant. Please answer user questions concisely in English.',
        'ja': 'あなたは役立つAIアシスタントです。ユーザーの質問に簡潔に日本語で答えてください。',
        'ko': '당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 간결하게 한국어로 답변해 주세요.'
    }

    return prompts[language]
}
