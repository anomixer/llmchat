import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// @ts-ignore
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
interface MarkdownMessageProps {
    content: string
    isDarkMode: boolean
    isUser?: boolean
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = React.memo(({ content, isDarkMode, isUser = false }) => {
    const { t } = useTranslation()
    const [copiedBlocks, setCopiedBlocks] = React.useState<Set<string>>(new Set())

    const cleanedContent = React.useMemo(() => {
        if (!content) return ''
        
        let txt = content
        
        // 1. 自動過濾剝皮 AI 產生的 LaTeX $\text{...}$ 或是 \text{...} 標記
        txt = txt.replace(/\$?\\text\{([\s\S]*?)\}\$?/g, '$1')
        
        // 2. 替換常見的 LaTeX 數學/箭頭符號為漂亮的 Unicode 符號，提升閱讀美感
        const latexMap: Record<string, string> = {
            '\\$\\s*\\\\rightarrow\\s*\\$': '→',
            '\\\\rightarrow': '→',
            '\\$\\s*\\\\to\\s*\\$': '→',
            '\\\\to': '→',
            '\\$\\s*\\\\leftarrow\\s*\\$': '←',
            '\\\\leftarrow': '←',
            '\\$\\s*\\\\times\\s*\\$': '×',
            '\\\\times': '×',
            '\\$\\s*\\\\approx\\s*\\$': '≈',
            '\\\\approx': '≈',
            '\\$\\s*\\\\le\\s*\\$': '≤',
            '\\\\le': '≤',
            '\\$\\s*\\\\leq\\s*\\$': '≤',
            '\\\\leq': '≤',
            '\\$\\s*\\\\ge\\s*\\$': '≥',
            '\\\\ge': '≥',
            '\\$\\s*\\\\geq\\s*\\$': '≥',
            '\\\\geq': '≥',
            '\\$\\s*\\\\ne\\s*\\$': '≠',
            '\\\\ne': '≠',
            '\\$\\s*\\\\neq\\s*\\$': '≠',
            '\\\\neq': '≠'
        }

        for (const [pattern, replacement] of Object.entries(latexMap)) {
            txt = txt.replace(new RegExp(pattern, 'g'), replacement)
        }
        
        return txt;
    }, [content])

    const getTextColor = () => {
        if (isDarkMode) return 'text-gray-100'
        return isUser ? 'text-white' : 'text-gray-800'
    }

    const copyToClipboard = async (text: string, blockId: string) => {
        try {
            // 嘗試使用現代的 Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text)
            } else {
                // Fallback 到舊的 execCommand 方法
                const textArea = document.createElement('textarea')
                textArea.value = text
                textArea.style.position = 'fixed'
                textArea.style.left = '-999999px'
                textArea.style.top = '-999999px'
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                const successful = document.execCommand('copy')
                document.body.removeChild(textArea)
                if (!successful) {
                    throw new Error('Copy command failed')
                }
            }
            setCopiedBlocks(prev => new Set(prev).add(blockId))
            setTimeout(() => {
                setCopiedBlocks(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(blockId)
                    return newSet
                })
            }, 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
            // 顯示用戶友好的錯誤提示
            alert(t('messages.copy.failed'))
        }
    }

    // 不處理內容，保持原樣

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code(props) {
                    const { children, className, node, ...rest } = props
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : ''
                    const codeContent = String(children).replace(/\n$/, '')

                    // 檢查是否為程式碼區塊（有多行或有語言標記）
                    const isCodeBlock = codeContent.includes('\n') || language

                    if (isCodeBlock) {
                        const blockId = `code-${Math.random().toString(36).substr(2, 9)}`
                        const isCopied = copiedBlocks.has(blockId)

                        return (
                            <div className="relative group">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        copyToClipboard(codeContent, blockId)
                                    }}
                                    className={`absolute top-2 right-2 p-1 rounded text-xs transition-colors opacity-0 group-hover:opacity-100 ${isDarkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                        }`}
                                    title={t('messages.copy.buttonTitle')}
                                >
                                    {isCopied ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </button>
                                <SyntaxHighlighter
                                    style={isDarkMode ? {
                                        ...oneDark,
                                        'comment': { color: '#9ca3af', fontStyle: 'italic' }, // 調整註解顏色為更明顯的灰色並斜體
                                        'prolog': { color: '#9ca3af', fontStyle: 'italic' },
                                        'doctype': { color: '#9ca3af', fontStyle: 'italic' },
                                        'cdata': { color: '#9ca3af', fontStyle: 'italic' }
                                    } : {
                                        ...oneLight,
                                        'comment': { color: '#6b7280', fontStyle: 'italic' }, // 調整亮色模式註解顏色並斜體
                                        'prolog': { color: '#6b7280', fontStyle: 'italic' },
                                        'doctype': { color: '#6b7280', fontStyle: 'italic' },
                                        'cdata': { color: '#6b7280', fontStyle: 'italic' }
                                    }}
                                    language={language}
                                    PreTag="div"
                                    className="rounded-md !mt-0 text-sm"
                                    customStyle={{
                                        backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        padding: '1rem'
                                    }}
                                    codeTagProps={{
                                        style: {
                                            background: 'inherit'
                                        }
                                    }}
                                >
                                    {codeContent}
                                </SyntaxHighlighter>
                            </div>
                        )
                    }

                    return (
                        <code
                            className={`px-1 py-0.5 rounded text-sm ${isDarkMode
                                ? 'bg-gray-600 text-gray-100'
                                : 'bg-gray-300 text-gray-900'
                                }`}
                            {...props}
                        >
                            {children}
                        </code>
                    )
                },
                // 自定義其他markdown元素樣式
                h1: ({ children }) => (
                    <h1 className={`text-2xl font-bold mb-4 mt-6 first:mt-0 ${isDarkMode ? 'text-white' : (isUser ? 'text-white' : 'text-gray-900')
                        }`}>
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 className={`text-xl font-bold mb-3 mt-5 first:mt-0 ${isDarkMode ? 'text-white' : (isUser ? 'text-white' : 'text-gray-900')
                        }`}>
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 className={`text-lg font-semibold mb-2 mt-4 first:mt-0 ${isDarkMode ? 'text-white' : (isUser ? 'text-white' : 'text-gray-900')
                        }`}>
                        {children}
                    </h3>
                ),
                p: ({ children }) => (
                    <p className={`${getTextColor()}`}>
                        {children}
                    </p>
                ),
                ul: ({ children }) => (
                    <ul className={`mb-3 last:mb-0 ml-4 list-disc ${getTextColor()}`}>
                        {children}
                    </ul>
                ),
                ol: ({ children }) => (
                    <ol className={`mb-3 last:mb-0 ml-4 list-decimal ${getTextColor()}`}>
                        {children}
                    </ol>
                ),
                li: ({ children }) => (
                    <li className="mb-1">{children}</li>
                ),
                blockquote: ({ children }) => (
                    <blockquote className={`border-l-4 pl-4 mb-3 italic ${isDarkMode
                        ? 'border-gray-600 text-gray-300 bg-gray-800'
                        : `border-gray-300 ${isUser ? 'text-white' : 'text-gray-700'} bg-gray-50`
                        }`}>
                        {children}
                    </blockquote>
                ),
                table: ({ children }) => (
                    <div className="overflow-x-auto mb-3">
                        <table className={`min-w-full border-collapse ${getTextColor()}`}>
                            {children}
                        </table>
                    </div>
                ),
                thead: ({ children }) => (
                    <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        {children}
                    </thead>
                ),
                tbody: ({ children }) => (
                    <tbody>{children}</tbody>
                ),
                tr: ({ children }) => (
                    <tr className={isDarkMode ? 'border-gray-600' : 'border-gray-300'}>
                        {children}
                    </tr>
                ),
                th: ({ children }) => (
                    <th className={`px-4 py-2 text-left font-semibold border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'
                        }`}>
                        {children}
                    </th>
                ),
                td: ({ children }) => (
                    <td className={`px-4 py-2 border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'
                        }`}>
                        {children}
                    </td>
                ),
                hr: () => (
                    <hr className={`my-6 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'
                        }`} />
                ),
                a: ({ children, href }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`underline ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : (isUser ? 'text-white hover:text-gray-200' : 'text-blue-600 hover:text-blue-800')
                            }`}
                    >
                        {children}
                    </a>
                ),
            }}
        >
            {cleanedContent}
        </ReactMarkdown>
    )
})

export default MarkdownMessage