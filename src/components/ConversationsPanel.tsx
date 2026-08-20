import React from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Conversation } from '../hooks/useConversations'

interface ConversationsPanelProps {
    isDarkMode: boolean
    conversations: Conversation[]
    currentConversationId: string
    onSwitch: (conversationId: string) => void
    onDelete: (conversationId: string) => void
}

export const ConversationsPanel: React.FC<ConversationsPanelProps> = ({
    isDarkMode,
    conversations,
    currentConversationId,
    onSwitch,
    onDelete
}) => {
    const { t, i18n } = useTranslation()

    return (
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
                                    onClick={() => onSwitch(conversation.id)}
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
                                            onDelete(conversation.id)
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
    )
}
