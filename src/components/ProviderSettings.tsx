import React, { useState, useEffect } from 'react'
import { Check, AlertCircle, Loader2, ExternalLink, LogIn, LogOut, Copy, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Provider {
    name: string
    type: string
    baseUrl: string
    description: string
    requiresApiKey: boolean
}

interface OAuthStatus {
    isConnected: boolean
    email: string
}

interface ProviderSettingsProps {
    currentProvider: {
        type: string
        baseUrl: string
        model: string
        requiresApiKey: boolean
    }
    availableProviders: Provider[]
    onSave: (provider: {
        type: string
        baseUrl: string
        apiKey: string
        model: string
        temperature: number
        maxTokens: number
    }) => Promise<void>
    onClose: () => void
}

const CHATGPT_TOKEN_STEPS = [
    { step: '1', text: '開啟 chatgpt.com 並登入你的帳號' },
    { step: '2', text: '按 F12 開啟開發者工具 → Application → Cookies' },
    { step: '3', text: '找到 __Secure-next-auth.session-token，複製其值貼入下方' },
]

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({
    currentProvider,
    availableProviders,
    onSave,
    onClose
}) => {
    const { t } = useTranslation()
    const [selectedProvider, setSelectedProvider] = useState(
        availableProviders.find(p => p.type === currentProvider.type) || availableProviders[0]
    )
    const [baseUrl, setBaseUrl] = useState(currentProvider.baseUrl)
    const [apiKey, setApiKey] = useState('')
    const [model, setModel] = useState(currentProvider.model)
    const [temperature, setTemperature] = useState(currentProvider.temperature !== undefined ? currentProvider.temperature : 0.7)
    const [maxTokens, setMaxTokens] = useState(currentProvider.maxTokens !== undefined ? currentProvider.maxTokens : 2048)
    const [isChecking, setIsChecking] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
    const [connectionMessage, setConnectionMessage] = useState('')

    const checkConnection = async () => {
        setIsChecking(true)
        setConnectionStatus('checking')
        setConnectionMessage('')
        try {
            const response = await fetch('/api/providers/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    type: selectedProvider.type,
                    baseUrl,
                    apiKey: apiKey || (selectedProvider.requiresApiKey ? 'test' : ''),
                    model
                })
            })
            const data = await response.json()
            if (data.isConnected) {
                setConnectionStatus('success')
                setConnectionMessage('✅ ' + t('admin.llm.connectSuccess', '連接成功'))
            } else {
                setConnectionStatus('error')
                setConnectionMessage('❌ ' + t('admin.llm.connectFailed', '連接失敗'))
            }
        } catch (error) {
            setConnectionStatus('error')
            setConnectionMessage('❌ ' + t('admin.llm.connectError', '連接錯誤：') + (error as any).message)
        } finally {
            setIsChecking(false)
        }
    }

    const handleSave = async () => {
        try {
            await onSave({ type: selectedProvider.type, baseUrl, apiKey, model, temperature, maxTokens })
            onClose()
        } catch (error) {
            alert(t('admin.llm.saveFailed', '保存失敗：') + (error as any).message)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">🔧 {t('admin.llm.providerSettings', 'Provider 設置')}</h2>

            {/* Provider 選擇 */}
            <div>
                <label className="block text-sm font-medium mb-2">{t('admin.llm.selectProvider', '選擇 Provider')}</label>
                <select
                    value={selectedProvider?.type || ''}
                    onChange={(e) => {
                        const provider = availableProviders.find(p => p.type === e.target.value)
                        if (provider) {
                            setSelectedProvider(provider)
                            setBaseUrl(provider.baseUrl)
                        }
                    }}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                >
                    {availableProviders.map(provider => (
                        <option key={provider.type} value={provider.type}>
                            {provider.name} {provider.requiresApiKey ? '🔑' : '🔓'}
                        </option>
                    ))}
                </select>
                {selectedProvider && (
                    <p className="text-sm text-gray-400 mt-1">{selectedProvider.description}</p>
                )}
            </div>

            {/* ── API URL ── */}
            <div>
                <label className="block text-sm font-medium mb-2">API URL</label>
                <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                />
            </div>

            {/* ── API Key ── */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    API Key 🔑 {!selectedProvider?.requiresApiKey && ` (${t('admin.llm.optional', 'optional')})`}
                </label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={selectedProvider?.requiresApiKey ? "sk-..." : t('admin.llm.apiKeyPlaceholder', 'API Key (可選)')}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">{t('admin.llm.apiKeyHint', '此密鑰將安全地儲存在您的伺服器中')}</p>
            </div>

            {/* ── Model ── */}
            <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="llama2"
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                />
            </div>

            {/* ── Temperature ── */}
            <div>
                <label className="block text-sm font-medium mb-2">{t('admin.llm.temperature', 'Temperature')}: {temperature}</label>
                <input type="range" min="0" max="1" step="0.1" value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
            </div>

            {/* ── Context Size ── */}
            <div>
                <label className="block text-sm font-medium mb-2">{t('admin.llm.contextSize', 'Context Size')}: {maxTokens}</label>
                <input type="range" min="256" max="8192" step="256" value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full" />
            </div>

            {/* ── {t('admin.llm.checkConnection', '檢查連接')} / 保存 ── */}
            <div className="flex gap-2">
                <button onClick={checkConnection} disabled={isChecking}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center justify-center gap-2">
                    {isChecking ? <><Loader2 className="w-4 h-4 animate-spin" />{t('admin.llm.checking', '檢查中...')}</> : <><Check className="w-4 h-4" />{t('admin.llm.checkConnection', '檢查連接')}</>}
                </button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md">
                    {t('common.save', '保存設置')}
                </button>
            </div>

            {connectionStatus !== 'idle' && (
                <div className={`p-3 rounded-md flex items-center gap-2 ${
                    connectionStatus === 'success' ? 'bg-green-900 text-green-200' :
                    connectionStatus === 'error' ? 'bg-red-900 text-red-200' :
                    'bg-gray-700 text-gray-200'
                }`}>
                    {connectionStatus === 'success' ? <Check className="w-5 h-5" /> :
                     connectionStatus === 'error' ? <AlertCircle className="w-5 h-5" /> : null}
                    <span>{connectionMessage}</span>
                </div>
            )}
        </div>
    )
}
