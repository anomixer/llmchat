import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, UserCheck, AlertTriangle, Shield, ArrowLeft, Trash2, UserPlus, Cpu, Settings, Check, X, Pencil, Unlink } from 'lucide-react'
import { useAuth } from '../AuthContext'

interface User {
    id: string
    email: string
    role: string
    enable: boolean
    createdAt: string
    lastLoginAt: string | null
}

interface AdminProps {
    onBack: () => void
}

const isVisionModel = (modelName: string): boolean => {
    const name = modelName.toLowerCase();
    return (
        name.includes('vision') ||
        name.includes('vl') ||
        name.includes('llava') ||
        name.includes('moondream') ||
        name.includes('gpt-4o') ||
        name.includes('gpt-4-') ||
        name.includes('claude-3') ||
        name.includes('gemini') ||
        name.includes('multimodal') ||
        name.includes('minicpm') ||
        name.includes('qwen-vl') ||
        name.includes('cogvlm') ||
        name.includes('internvl') ||
        name.includes('pixtral')
    );
};

export const Admin: React.FC<AdminProps> = ({ onBack }) => {
    const { t, i18n } = useTranslation()
    const { user: currentUser, token } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const usersPerPage = 10
    const [activeTab, setActiveTab] = useState<'users' | 'llm'>('users')

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [modalEmail, setModalEmail] = useState('')
    const [modalPassword, setModalPassword] = useState('')
    const [modalRole, setModalRole] = useState<'user' | 'admin'>('user')
    const [modalError, setModalError] = useState<string | null>(null)
    const [modalLoading, setModalLoading] = useState(false)

    const [providers, setProviders] = useState<any[]>([])
    const [currentProvider, setCurrentProvider] = useState<any>(null)
    const [selectedProvider, setSelectedProvider] = useState('')
    const [providerBaseUrl, setProviderBaseUrl] = useState('')
    const [providerApiKey, setProviderApiKey] = useState('')
    const [providerModel, setProviderModel] = useState('')
    const [providerTemperature, setProviderTemperature] = useState(0.7)
    const [providerTopP, setProviderTopP] = useState(0.9)
    const [providerTopK, setProviderTopK] = useState(40)
    const [providerMaxTokens, setProviderMaxTokens] = useState(2048)
    const [providerVisionModel, setProviderVisionModel] = useState('')
    const [checkingConnection, setCheckingConnection] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [connectionMessage, setConnectionMessage] = useState('')
    const [availableModels, setAvailableModels] = useState<any[]>([])
    const [loadingModels, setLoadingModels] = useState(false)

    const [providerAuthMethod, setProviderAuthMethod] = useState<'api-key' | 'google-service-account' | 'azure-entra-id' | 'aws-iam' | 'github-copilot-oauth' | 'google-oauth-user' | 'chatgpt-web-session'>('api-key')
    const [providerOauthConfig, setProviderOauthConfig] = useState({
        googleJson: '',
        azureTenantId: '',
        azureClientId: '',
        azureClientSecret: '',
        awsAccessKey: '',
        awsSecretKey: '',
        awsRegion: 'us-east-1',
        awsSessionToken: '',
        githubToken: '',
        googleUserRefreshToken: '',
        chatgptAccessToken: '',
        chatgptProxyUrl: '',
        googleUserClientId: '',
        googleUserClientSecret: ''
    })

    const [importAdcStatus, setImportAdcStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [importAdcError, setImportAdcError] = useState('')
    const [disconnectingGoogle, setDisconnectingGoogle] = useState(false)

    const handleOauthConfigChange = (key: string, value: string) => {
        setProviderOauthConfig(prev => ({ ...prev, [key]: value }))
    }

    const handleDisconnectGoogle = async () => {
        setDisconnectingGoogle(true)
        try {
            const res = await fetch('/api/oauth/google/revoke', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                const err = await res.json()
                console.error('撤銷 Google 授權失敗：', err.error || res.statusText)
            }
        } catch (error: any) {
            console.error('撤銷 Google 授權時連線失敗：', error.message)
        } finally {
            setDisconnectingGoogle(false)
        }
        setProviderOauthConfig(prev => ({
            ...prev,
            googleUserRefreshToken: '',
            googleUserClientId: '',
            googleUserClientSecret: ''
        }))
        setImportAdcStatus('idle')
        setImportAdcError('')
    }

    const PROVIDER_DEFAULTS: Record<string, string> = {
        'OpenAI': 'https://api.openai.com/v1',
        'Anthropic Claude': 'https://api.anthropic.com/v1',
        'Google Gemini': 'https://generativelanguage.googleapis.com/v1beta/openai',
        'Mistral': 'https://api.mistral.ai/v1',
        'Groq': 'https://api.groq.com/openai/v1',
        'xAI (Grok)': 'https://api.x.ai/v1',
        'DeepSeek': 'https://api.deepseek.com/v1',
        'NVIDIA NIM': 'https://integrate.api.nvidia.com/v1',
        'Together AI': 'https://api.together.xyz/v1',
        'OpenRouter': 'https://openrouter.ai/api/v1',
        'Kilo Gateway': 'https://api.kilo.ai/api/gateway',
        'Synthetic (Anthropic-compatible)': 'https://api.synthetic.new/anthropic',
        'Moonshot AI (Kimi)': 'https://api.moonshot.ai/v1',
        'Vercel AI Gateway': 'https://gateway.ai.vercel.com/v1',
        'Cloudflare AI Gateway': 'https://gateway.ai.cloudflare.com/v1',
        'Ollama Cloud': 'https://ollama.com',
        'Ollama': 'http://127.0.0.1:11434',
        'vLLM': 'http://127.0.0.1:8000/v1',
        'SGLang': 'http://127.0.0.1:30000/v1',
        'LM Studio': 'http://127.0.0.1:1234/v1',
        'Custom Provider (自訂)': 'http://127.0.0.1:11434/v1'
    }

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const providerType = e.target.value
        setSelectedProvider(providerType)
        
        let validMethods = ['api-key']
        if (providerType === 'google-gemini' || providerType === 'custom') validMethods.push('google-service-account')
        if (providerType === 'custom') {
            validMethods.push('azure-entra-id')
            validMethods.push('aws-iam')
        }
        let newAuthMethod = providerAuthMethod
        if (!validMethods.includes(providerAuthMethod)) {
            newAuthMethod = 'api-key'
            setProviderAuthMethod('api-key')
        }

        const provider = providers.find(p => p.type === providerType)
        if (provider) {
            const defaultUrl = PROVIDER_DEFAULTS[provider.name] || provider.baseUrl || 'http://127.0.0.1:11434/v1'
            setProviderBaseUrl(defaultUrl)
            let newApiKey = providerApiKey
            if (!provider.requiresApiKey) {
                setProviderApiKey('')
                newApiKey = ''
            }
            fetchAvailableModels(providerType, defaultUrl, newApiKey, '', newAuthMethod)
        } else {
            const hardcodedUrls: Record<string, string> = {
                'ollama': 'http://127.0.0.1:11434',
                'ollama-cloud': 'https://ollama.com',
                'openai': 'https://api.openai.com/v1',
                'anthropic': 'https://api.anthropic.com/v1',
                'google-gemini': 'https://generativelanguage.googleapis.com/v1beta/openai',
                'mistral': 'https://api.mistral.ai/v1',
                'groq': 'https://api.groq.com/openai/v1',
                'xai-grok': 'https://api.x.ai/v1',
                'deepseek': 'https://api.deepseek.com/v1',
                'nvidia': 'https://integrate.api.nvidia.com/v1',
                'together': 'https://api.together.xyz/v1',
                'openrouter': 'https://openrouter.ai/api/v1',
                'kilo-gateway': 'https://api.kilo.ai/api/gateway',
                'synthetic': 'https://api.synthetic.new/anthropic',
                'moonshot': 'https://api.moonshot.ai/v1',
                'vercel-gateway': 'https://gateway.ai.vercel.com/v1',
                'cloudflare-gateway': 'https://gateway.ai.cloudflare.com/v1',
                'vllm': 'http://127.0.0.1:8000/v1',
                'sglang': 'http://127.0.0.1:30000/v1',
                'lm-studio': 'http://127.0.0.1:1234/v1',
                'custom': 'http://127.0.0.1:11434/v1'
            }
            const defaultUrl = hardcodedUrls[providerType] || 'http://127.0.0.1:11434/v1'
            setProviderBaseUrl(defaultUrl)
            setProviderApiKey('')
            fetchAvailableModels(providerType, defaultUrl, '', '', newAuthMethod)
        }
    }

    if (!currentUser || currentUser.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4">
                <div className="max-w-md w-full text-center">
                    <Shield className="h-16 w-16 mx-auto mb-4 text-red-500" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('admin.accessDenied')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('admin.accessDeniedMessage')}
                    </p>
                </div>
            </div>
        )
    }

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` },
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || t('admin.error.fetchUsers'))
            }
            const data = await response.json()
            setUsers(data.users)
        } catch (error) {
            setError(error instanceof Error ? error.message : t('admin.error.unknown'))
        } finally {
            setLoading(false)
        }
    }

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || t('admin.error.updateRole'))
            }
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : t('admin.error.updateRole'))
        }
    }

    const deleteUser = async (userId: string) => {
        if (!window.confirm(t('admin.deleteUserConfirm'))) return
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || t('admin.error.deleteUser'))
            }
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : t('admin.error.deleteUser'))
        }
    }

    const createUser = async () => {
        if (!modalEmail || !modalPassword) { setModalError(t('admin.error.emailPasswordRequired', 'Email 和密碼為必填')); return }
        setModalLoading(true); setModalError(null)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: modalEmail, password: modalPassword, role: modalRole })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || t('admin.error.addFailed', '新增失敗'))
            setShowCreateModal(false)
            setModalEmail(''); setModalPassword(''); setModalRole('user')
            await fetchUsers()
        } catch (e: any) {
            setModalError(e.message)
        } finally {
            setModalLoading(false)
        }
    }

    const openEditModal = (user: User) => {
        setEditingUser(user)
        setModalEmail(user.email)
        setModalPassword('')
        setModalRole(user.role as 'user' | 'admin')
        setModalError(null)
        setShowEditModal(true)
    }

    const saveEditUser = async () => {
        if (!editingUser || !modalEmail) { setModalError(t('admin.error.emailRequired', 'Email 為必填')); return }
        setModalLoading(true); setModalError(null)
        try {
            const body: any = { email: modalEmail, role: modalRole }
            if (modalPassword) body.password = modalPassword
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || t('admin.error.saveFailed', '儲存失敗'))
            setShowEditModal(false)
            await fetchUsers()
        } catch (e: any) {
            setModalError(e.message)
        } finally {
            setModalLoading(false)
        }
    }

    const toggleUserEnable = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/toggle-enable`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || t('admin.error.toggleUser'))
            }
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : t('admin.error.toggleUser'))
        }
    }

    const fetchProviders = async () => {
        try {
            const response = await fetch('/api/providers', { headers: { 'Authorization': `Bearer ${token}` } })
            if (response.ok) {
                const data = await response.json()
                setProviders(data.providers)
            }
        } catch (error) {
            console.error('Error fetching providers:', error)
        }
    }

    const fetchCurrentProvider = async () => {
        try {
            const response = await fetch('/api/providers/current', { headers: { 'Authorization': `Bearer ${token}` } })
            if (response.ok) {
                const data = await response.json()
                setCurrentProvider(data.current)
                setSelectedProvider(data.current.type)
                setProviderBaseUrl(data.current.baseUrl)
                setProviderModel(data.current.model)
                if (data.current.temperature !== undefined) setProviderTemperature(data.current.temperature)
                if (data.current.topP !== undefined) setProviderTopP(data.current.topP)
                if (data.current.topK !== undefined) setProviderTopK(data.current.topK)
                if (data.current.maxTokens !== undefined) setProviderMaxTokens(data.current.maxTokens)

                let currentApiKey = ''
                let currentAuthMethod = (data.current.authMethod === 'github-copilot-oauth' ? 'api-key' : data.current.authMethod) || 'api-key'
                let currentOauthConfig = data.current.oauthConfig || {
                    googleJson: '', azureTenantId: '', azureClientId: '', azureClientSecret: '',
                    awsAccessKey: '', awsSecretKey: '', awsRegion: 'us-east-1', awsSessionToken: '',
                    githubToken: '', googleUserRefreshToken: '', chatgptAccessToken: '',
                    chatgptProxyUrl: '', googleUserClientId: '', googleUserClientSecret: ''
                }

                setProviderAuthMethod(currentAuthMethod)
                setProviderOauthConfig(currentOauthConfig)

                const adminSettings = localStorage.getItem('adminProviderSettings')
                if (adminSettings) {
                    try {
                        const parsed = JSON.parse(adminSettings)
                        if (parsed.apiKey) { currentApiKey = parsed.apiKey; setProviderApiKey(parsed.apiKey) }
                        if (parsed.authMethod) { currentAuthMethod = parsed.authMethod === 'github-copilot-oauth' ? 'api-key' : parsed.authMethod; setProviderAuthMethod(currentAuthMethod) }
                        if (parsed.oauthConfig) {
                            currentOauthConfig = { ...currentOauthConfig, ...parsed.oauthConfig }
                            setProviderOauthConfig(currentOauthConfig)
                        }
                        if (parsed.temperature !== undefined) setProviderTemperature(parsed.temperature)
                        if (parsed.topP !== undefined) setProviderTopP(parsed.topP)
                        if (parsed.topK !== undefined) setProviderTopK(parsed.topK)
                        if (parsed.maxTokens !== undefined) setProviderMaxTokens(parsed.maxTokens)
                    } catch (e) { console.error('解析 adminSettings 失敗:', e) }
                }

                fetchAvailableModels(data.current.type, data.current.baseUrl, currentApiKey, data.current.model, currentAuthMethod, currentOauthConfig)
            }
        } catch (error) {
            console.error('Error fetching current provider:', error)
        }
    }

    const handleImportGoogleAdc = async () => {
        setImportAdcStatus('loading'); setImportAdcError('')
        try {
            const response = await fetch('/api/auth/google/import-adc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (response.ok && data.success) {
                setImportAdcStatus('success')
                fetchCurrentProvider()
            } else {
                setImportAdcStatus('error')
                setImportAdcError(data.error || t('admin.error.adcFailed', '匯入本機憑證失敗。'))
            }
        } catch (error: any) {
            setImportAdcStatus('error')
            setImportAdcError(error.message || t('admin.error.connectBackendFailed', '連線後端失敗。'))
        }
    }

    const handleGoogleConnect = async () => {
        try {
            const res = await fetch('/api/oauth/google/start', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                const err = await res.json()
                alert(t('admin.error.googleUrlFailed', '無法取得 Google 授權 URL：') + (err.error || res.statusText))
                return
            }
            const { url } = await res.json()

            const width = 600, height = 660
            const left = window.screen.width / 2 - width / 2
            const top = window.screen.height / 2 - height / 2
            window.open(
                url,
                'google-oauth-popup',
                `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
            )

            const onMessage = (event: MessageEvent) => {
                let data: any
                try {
                    data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
                } catch {
                    return
                }
                if (data?.oauth !== 'google') return
                window.removeEventListener('message', onMessage)
                if (data.status === 'success') {
                    fetchCurrentProvider()
                } else {
                    alert(t('admin.error.googleAuthFailed', 'Google 授權失敗：') + (data.reason || 'unknown'))
                }
            }
            window.addEventListener('message', onMessage)
        } catch (error: any) {
            alert(t('admin.error.connectBackendFailedAlert', '連線後端失敗：') + error.message)
        }
    }

    const checkConnection = async () => {
        setCheckingConnection(true); setConnectionStatus('idle'); setConnectionMessage('')
        try {
            const response = await fetch('/api/providers/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    type: selectedProvider, baseUrl: providerBaseUrl, apiKey: providerApiKey,
                    model: providerModel, authMethod: providerAuthMethod, oauthConfig: providerOauthConfig
                })
            })
            const data = await response.json()
            if (data.isConnected) {
                setConnectionStatus('success')
                setConnectionMessage(t('admin.llm.testSuccess', '✅ 連接成功'))
            } else {
                setConnectionStatus('error')
                setConnectionMessage(t('admin.llm.testFailed', '❌ 連接失敗'))
            }
        } catch (error: any) {
            setConnectionStatus('error')
            setConnectionMessage(t('admin.llm.testError', '❌ 連接錯誤：') + error.message)
        } finally {
            setCheckingConnection(false)
        }
    }

    const saveProviderSettings = async () => {
        try {
            const response = await fetch('/api/providers/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    type: selectedProvider, baseUrl: providerBaseUrl, apiKey: providerApiKey,
                    model: providerModel, temperature: providerTemperature, topP: providerTopP,
                    topK: providerTopK, maxTokens: providerMaxTokens, visionModel: providerVisionModel,
                    authMethod: providerAuthMethod, oauthConfig: providerOauthConfig
                })
            })
            if (response.ok) {
                const data = await response.json()
                if (data.isConnected) {
                    localStorage.setItem('adminProviderSettings', JSON.stringify({
                        type: selectedProvider, baseUrl: providerBaseUrl, apiKey: providerApiKey,
                        model: providerModel, temperature: providerTemperature, topP: providerTopP,
                        topK: providerTopK, maxTokens: providerMaxTokens,
                        authMethod: providerAuthMethod, oauthConfig: providerOauthConfig
                    }))
                    await fetchCurrentProvider()
                    setConnectionStatus('success')
                    setConnectionMessage(t('admin.llm.saveSuccess', '✅ 設定已保存'))
                    try {
                        const oauthConfigQuery = encodeURIComponent(JSON.stringify(providerOauthConfig))
                        const modelsResponse = await fetch(
                            `/api/models?type=${encodeURIComponent(selectedProvider)}&baseUrl=${encodeURIComponent(providerBaseUrl)}&apiKey=${encodeURIComponent(providerApiKey)}&authMethod=${encodeURIComponent(providerAuthMethod)}&oauthConfig=${oauthConfigQuery}`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        )
                        if (modelsResponse.ok) {
                            const modelsData = await modelsResponse.json()
                            const models = (modelsData.models || []).map((model: any) => ({ id: model.name, name: model.name }))
                            localStorage.setItem('adminModelList', JSON.stringify(models))
                            window.dispatchEvent(new CustomEvent('modelListUpdated', { detail: { models } }))
                        }
                    } catch (error) { console.error('載入模型列表失敗:', error) }
                } else {
                    setConnectionStatus('error')
                    setConnectionMessage(t('admin.llm.saveWarning', '⚠️ 設定已保存，但連接失敗'))
                }
            }
        } catch (error) {
            console.error('Failed to save provider configuration:', error)
            setConnectionStatus('error')
            setConnectionMessage(t('admin.llm.saveError', '❌ 保存失敗'))
        }
    }

    const fetchAvailableModels = async (typeOverride?: string, baseUrlOverride?: string, apiKeyOverride?: string, modelOverride?: string, authMethodOverride?: string, oauthConfigOverride?: any) => {
        const type = typeOverride !== undefined ? typeOverride : selectedProvider
        const baseUrl = baseUrlOverride !== undefined ? baseUrlOverride : providerBaseUrl
        const apiKey = apiKeyOverride !== undefined ? apiKeyOverride : providerApiKey
        const targetModel = modelOverride !== undefined ? modelOverride : providerModel
        const authMethod = authMethodOverride !== undefined ? authMethodOverride : providerAuthMethod
        const oauthConfig = oauthConfigOverride !== undefined ? oauthConfigOverride : providerOauthConfig
        if (!baseUrl) return
        try {
            setLoadingModels(true)
            const oauthConfigQuery = encodeURIComponent(JSON.stringify(oauthConfig))
            const response = await fetch(
                `/api/models?type=${encodeURIComponent(type)}&baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey)}&authMethod=${encodeURIComponent(authMethod)}&oauthConfig=${oauthConfigQuery}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            if (response.ok) {
                const data = await response.json()
                const models = data.models || []
                setAvailableModels(models)
                const currentStillValid = models.some((m: any) => m.name === targetModel)
                if (models.length > 0) {
                    if (!targetModel || !currentStillValid) {
                        setProviderModel(models[0].name)
                    } else {
                        setProviderModel(targetModel)
                    }
                } else if (!targetModel) {
                    setProviderModel('')
                }
            }
        } catch (error) {
            console.error('獲取模型列表失敗:', error)
            setAvailableModels([])
        } finally {
            setLoadingModels(false)
        }
    }

    useEffect(() => {
        fetchUsers()
        fetchProviders().then(() => { fetchCurrentProvider() })
    }, [])

    const totalPages = Math.ceil(users.length / usersPerPage)
    const startIndex = (currentPage - 1) * usersPerPage
    const endIndex = startIndex + usersPerPage
    const currentUsers = users.slice(startIndex, endIndex)

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    const ModelSelector = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
            <div className="flex space-x-2">
                {availableModels.length > 0 ? (
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="flex-1 min-w-0 flex-shrink truncate px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        {availableModels.map((model: any) => (
                            <option key={model.name} value={model.name}>{model.name}</option>
                        ))}
                        {!availableModels.find((m: any) => m.name === value) && value && (
                            <option value={value}>{value} ({t('admin.llm.current', '當前')})</option>
                        )}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="flex-1 min-w-0 flex-shrink px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('admin.llm.modelPlaceholder', '例如：gpt-4, claude-3, llama3')}
                    />
                )}
                <button
                    onClick={() => fetchAvailableModels()}
                    disabled={loadingModels}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                >
                    {loadingModels ? '...' : t('admin.llm.fetchModels', '獲取模型')}
                </button>
            </div>
        </div>
    )

    const VisionModelSelector = () => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.llm.visionModel', 'Vision 模型（可選）')}
            </label>
            <div className="flex space-x-2">
                {availableModels.length > 0 ? (
                    <select
                        value={providerVisionModel}
                        onChange={(e) => setProviderVisionModel(e.target.value)}
                        className="flex-1 min-w-0 flex-shrink truncate px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">{t('admin.llm.visionPlaceholder', '用於多模態內容，留空則自動選擇')}</option>
                        {availableModels
                            .filter((model: any) => isVisionModel(model.name))
                            .map((model: any) => (
                                <option key={model.name} value={model.name}>{model.name}</option>
                            ))}
                        {!availableModels.filter((m: any) => isVisionModel(m.name)).find((m: any) => m.name === providerVisionModel) && providerVisionModel && (
                            <option value={providerVisionModel}>{providerVisionModel} ({t('admin.llm.current', '當前')})</option>
                        )}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={providerVisionModel}
                        onChange={(e) => setProviderVisionModel(e.target.value)}
                        className="flex-1 min-w-0 flex-shrink px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('admin.llm.visionPlaceholder', '用於多模態內容，留空則自動選擇')}
                    />
                )}
                <button
                    onClick={() => fetchAvailableModels()}
                    disabled={loadingModels}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                >
                    {loadingModels ? '...' : t('admin.llm.fetchModels', '獲取模型')}
                </button>
            </div>
        </div>
    )

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600 dark:text-gray-400">{t('app.loading')}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center space-x-4 mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>{t('admin.backToChat')}</span>
                        </button>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{t('admin.subtitle')}</p>
                </div>

                <div className="mb-6">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                    activeTab === 'users'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                <Users className="h-4 w-4" />
                                <span>{t('admin.usersTab')}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('llm')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                    activeTab === 'llm'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                <Cpu className="h-4 w-4" />
                                <span>{t('admin.llmTab')}</span>
                            </button>
                        </nav>
                    </div>
                </div>

                {activeTab === 'llm' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                            <Cpu className="h-6 w-6 text-blue-600" />
                            <span>{t('admin.llm.config', 'LLM Provider 配置')}</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('admin.llm.selectProvider', '選擇 Provider')}
                                </label>
                                <select
                                    value={selectedProvider}
                                    onChange={handleProviderChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {providers.map((provider) => (
                                        <option key={provider.type} value={provider.type}>{provider.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('admin.llm.baseUrl', 'Base URL')}
                                </label>
                                <input
                                    type="text"
                                    value={providerBaseUrl}
                                    onChange={(e) => setProviderBaseUrl(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="https://api.example.com/v1"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('admin.llm.baseUrlHint', '選擇 Provider 後自動帶出，可手動修改')}
                                </p>
                            </div>
                        </div>

                        {(() => {
                            const selectedProviderObj = providers.find(p => p.type === selectedProvider)
                            const isLocalProvider = selectedProviderObj && !selectedProviderObj.requiresApiKey




                            if (isLocalProvider) {
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <ModelSelector label={t('admin.llm.modelName', '模型名稱')} value={providerModel} onChange={setProviderModel} />
                                        <VisionModelSelector />
                                    </div>
                                )
                            }

                            return (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t('admin.llm.authMethod', '認證方法')}
                                            </label>
                                            <select value={providerAuthMethod}
                                                onChange={(e) => {
                                                    const method = e.target.value as any
                                                    setProviderAuthMethod(method)
                                                    fetchAvailableModels(selectedProvider, providerBaseUrl, providerApiKey, providerModel, method)
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >

                                                {(selectedProvider === 'google-gemini' || selectedProvider === 'custom') && (
                                                    <option value="google-service-account">{t('admin.llm.authGoogleSA', '🌐 Google 服務帳號金鑰 (Service Account JSON)')}</option>
                                                )}
                                                

                                                {selectedProvider === 'custom' && (
                                                    <option value="azure-entra-id">{t('admin.llm.authAzure', '🌐 Microsoft Entra ID 客戶端憑證 (OAuth 2.0)')}</option>
                                                )}
                                                {selectedProvider === 'custom' && (
                                                    <option value="aws-iam">{t('admin.llm.authAws', '☁️ AWS IAM 簽章憑證 (SigV4)')}</option>
                                                )}
                                                <option value="api-key">{t('admin.llm.authApiKey', '🔑 靜態 API 金鑰 (Static API Key)')}</option>
                                            </select>
                                        </div>

                                        {providerAuthMethod === 'api-key' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {t('admin.llm.apiKey', 'API Key')}
                                                </label>
                                                <input type="password" value={providerApiKey}
                                                    onChange={(e) => setProviderApiKey(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    placeholder={t('admin.llm.apiKeyPlaceholder', 'API Key (可選，部分 Provider 不需要)')} />
                                            </div>
                                        ) : (
                                            <div className="hidden md:block"></div>
                                        )}

                                        <ModelSelector label={t('admin.llm.modelName', '模型名稱')} value={providerModel} onChange={setProviderModel} />
                                        <VisionModelSelector />
                                    </div>

                                    {providerAuthMethod !== 'api-key' && (
                                        <div className="p-5 border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg mb-6">
                                            {providerAuthMethod === 'google-service-account' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.llm.gcpServiceAccount', 'GCP 服務帳號金鑰 (Service Account JSON)')}</label>
                                                    <textarea rows={6} value={providerOauthConfig.googleJson}
                                                        onChange={(e) => handleOauthConfigChange('googleJson', e.target.value)}
                                                        className="w-full px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder={`{\n  "type": "service_account",\n  "project_id": "your-project-id"\n}`} />
                                                </div>
                                            )}
                                            {providerAuthMethod === 'azure-entra-id' && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tenant ID</label>
                                                        <input type="text" value={providerOauthConfig.azureTenantId}
                                                            onChange={(e) => handleOauthConfigChange('azureTenantId', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="12345678-1234-..." />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client ID</label>
                                                        <input type="text" value={providerOauthConfig.azureClientId}
                                                            onChange={(e) => handleOauthConfigChange('azureClientId', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="87654321-4321-..." />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Secret</label>
                                                        <input type="password" value={providerOauthConfig.azureClientSecret}
                                                            onChange={(e) => handleOauthConfigChange('azureClientSecret', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                    </div>
                                                </div>
                                            )}
                                            {providerAuthMethod === 'aws-iam' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AWS Access Key ID</label>
                                                        <input type="text" value={providerOauthConfig.awsAccessKey}
                                                            onChange={(e) => handleOauthConfigChange('awsAccessKey', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="AKIAIOSFODNN7EXAMPLE" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AWS Secret Access Key</label>
                                                        <input type="password" value={providerOauthConfig.awsSecretKey}
                                                            onChange={(e) => handleOauthConfigChange('awsSecretKey', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AWS Region</label>
                                                        <input type="text" value={providerOauthConfig.awsRegion}
                                                            onChange={(e) => handleOauthConfigChange('awsRegion', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="us-east-1" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.llm.sessionToken', 'Session Token（選填）')}</label>
                                                        <input type="password" value={providerOauthConfig.awsSessionToken}
                                                            onChange={(e) => handleOauthConfigChange('awsSessionToken', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                    </div>
                                                </div>
                                            )}
                                            

                                        </div>
                                    )}
                                </>
                            )
                        })()}

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                {t('admin.llm.advancedParams', '進階參數')}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Temperature ({providerTemperature})</label>
                                    <input type="range" min="0" max="2" step="0.1" value={providerTemperature}
                                        onChange={(e) => setProviderTemperature(parseFloat(e.target.value))} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Top P ({providerTopP})</label>
                                    <input type="range" min="0" max="1" step="0.05" value={providerTopP}
                                        onChange={(e) => setProviderTopP(parseFloat(e.target.value))} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Top K ({providerTopK})</label>
                                    <input type="range" min="1" max="100" step="1" value={providerTopK}
                                        onChange={(e) => setProviderTopK(parseInt(e.target.value))} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Context Size</label>
                                    <input type="number" min="256" max="128000" step="256" value={providerMaxTokens}
                                        onChange={(e) => setProviderMaxTokens(parseInt(e.target.value))}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button onClick={checkConnection} disabled={checkingConnection}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2">
                                {checkingConnection ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (<Check className="h-4 w-4" />)}
                                <span>{t('admin.llm.testConnection', '測試連接')}</span>
                            </button>
                            <button onClick={saveProviderSettings}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
                                <Settings className="h-4 w-4" />
                                <span>{t('admin.llm.saveSettings', '保存設定')}</span>
                            </button>
                            {connectionMessage && (
                                <span className={`text-sm ${connectionStatus === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {connectionMessage}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <>
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <span className="text-red-700 dark:text-red-400">{error}</span>
                            </div>
                        )}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.userManagement')}</h2>
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                                        {users.length} {t('admin.users')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => { setModalEmail(''); setModalPassword(''); setModalRole('user'); setModalError(null); setShowCreateModal(true) }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                    <UserPlus className="h-4 w-4" />
                                    <span>{t('admin.addUser', '新增用戶')}</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.email')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.role')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.status')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.createdAt')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.lastLogin')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {currentUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</div>
                                                        {user.id === currentUser?.id && (
                                                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                                                                {t('admin.you', '你')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                                                        disabled={user.id === currentUser?.id}
                                                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                                    >
                                                        <option value="user">{t('admin.role.user')}</option>
                                                        <option value="admin">{t('admin.role.admin')}</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => toggleUserEnable(user.id)}
                                                        disabled={user.id === currentUser?.id}
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium disabled:opacity-50 ${
                                                            user.enable
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200'
                                                        }`}
                                                    >
                                                        {user.enable ? t('admin.status.enabled') : t('admin.status.disabled')}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : t('admin.never')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteUser(user.id)}
                                                            disabled={user.id === currentUser?.id}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('admin.pagination.showing', '顯示')} {startIndex + 1}-{Math.min(endIndex, users.length)} / {users.length}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                            {t('admin.pagination.prev', '上一頁')}
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button key={page} onClick={() => goToPage(page)}
                                                className={`px-3 py-1 text-sm border rounded ${
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                {page}
                                            </button>
                                        ))}
                                        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                            {t('admin.pagination.next', '下一頁')}
                                        </button>
                                    </div>
                                </div>
            )}
                        </div>
                    </>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.addUser', '新增用戶')}</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-5 w-5" /></button>
                        </div>
                        {modalError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">{modalError}</div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input type="email" value={modalEmail} onChange={(e) => setModalEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="user@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.password', '密碼')}</label>
                                <input type="password" value={modalPassword} onChange={(e) => setModalPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.table.role', '角色')}</label>
                                <select value={modalRole} onChange={(e) => setModalRole(e.target.value as 'user' | 'admin')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="user">{t('admin.role.user', '用戶')}</option>
                                    <option value="admin">{t('admin.role.admin', '管理員')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {t('common.cancel', '取消')}
                            </button>
                            <button onClick={createUser} disabled={modalLoading}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {modalLoading ? t('common.saving', '處理中...') : t('admin.addUser', '新增')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.editUser', '編輯用戶')}</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-5 w-5" /></button>
                        </div>
                        {modalError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">{modalError}</div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input type="email" value={modalEmail} onChange={(e) => setModalEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.newPassword', '新密碼（留空不更改）')}</label>
                                <input type="password" value={modalPassword} onChange={(e) => setModalPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.table.role', '角色')}</label>
                                <select value={modalRole} onChange={(e) => setModalRole(e.target.value as 'user' | 'admin')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="user">{t('admin.role.user', '用戶')}</option>
                                    <option value="admin">{t('admin.role.admin', '管理員')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {t('common.cancel', '取消')}
                            </button>
                            <button onClick={saveEditUser} disabled={modalLoading}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {modalLoading ? t('common.saving', '處理中...') : t('common.save', '儲存')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
