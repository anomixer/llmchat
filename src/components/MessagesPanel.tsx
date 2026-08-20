import React from 'react'
import { Bot, User, Volume2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarkdownMessage from '../MarkdownMsg'
import type { Message } from '../hooks/useConversations'

interface MessagesPanelProps {
    isDarkMode: boolean
    messagesContainerRef: React.RefObject<HTMLDivElement>
    messagesEndRef: React.RefObject<HTMLDivElement>
    currentMessages: Message[]
    currentConversationId: string
    expandedThinking: Set<string>
    expandedFiles: Set<string>
    showTokenStats: boolean
    onToggleThinking: (messageId: string) => void
    onToggleFiles: (messageId: string) => void
    onDeleteMessage: (conversationId: string, messageId: string) => void
    // 語音
    onToggleSpeech: (args: { messageId: string; text: string }) => void
    getSpeechButtonState: (messageId: string) => { isPlayingThis: boolean; isGlobalPlaying: boolean; isInQueue: boolean }
    isSpeechButtonDisabled: (messageId: string) => boolean
    globalSpeakingMessageId: string | null
    speechQueue: Array<{ messageId: string }>
    // 串流
    isStreaming: boolean
    streamingMessage: string
    streamingThinking: string
    showStreamingThinking: boolean
    onSetShowStreamingThinking: (v: boolean) => void
    tokenCount: number
    tokensPerSecond: number
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({
    isDarkMode,
    messagesContainerRef,
    messagesEndRef,
    currentMessages,
    currentConversationId,
    expandedThinking,
    expandedFiles,
    showTokenStats,
    onToggleThinking,
    onToggleFiles,
    onDeleteMessage,
    onToggleSpeech,
    getSpeechButtonState,
    isSpeechButtonDisabled,
    globalSpeakingMessageId,
    speechQueue,
    isStreaming,
    streamingMessage,
    streamingThinking,
    showStreamingThinking,
    onSetShowStreamingThinking,
    tokenCount,
    tokensPerSecond
}) => {
    const { t, i18n } = useTranslation()

    return (
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
                                                                onClick={() => onToggleFiles(message.id)}
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
                                                    onClick={() => onToggleThinking(message.id)}
                                                    className={`flex items-center space-x-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200'
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

                                                onToggleSpeech({ messageId: message.id, text: message.content })
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
                                                getSpeechButtonState(message.id).isPlayingThis
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
                                                onDeleteMessage(currentConversationId, message.id)
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
                                            onDeleteMessage(currentConversationId, message.id)
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
                                {message.role === 'assistant' && message.tokenCount !== undefined && showTokenStats && (
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
                                        onClick={() => onSetShowStreamingThinking(!showStreamingThinking)}
                                        className={`flex items-center space-x-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200'
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
                            {showTokenStats && (
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
    )
}
