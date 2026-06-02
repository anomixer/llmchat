import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, UserCheck, AlertTriangle, Shield, ArrowLeft, Trash2, UserPlus, Cpu, Settings, Check, X, Pencil } from 'lucide-react'
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

    // 新增/編輯用戶 Modal 狀態
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [modalEmail, setModalEmail] = useState('')
    const [modalPassword, setModalPassword] = useState('')
    const [modalRole, setModalRole] = useState<'user' | 'admin'>('user')
    const [modalError, setModalError] = useState<string | null>(null)
    const [modalLoading, setModalLoading] = useState(false)
    
    // LLM Provider 設定狀態
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

    // LLM Provider 認證與 OAuth/IAM 狀態
    const [providerAuthMethod, setProviderAuthMethod] = useState<'api-key' | 'google-service-account' | 'azure-entra-id' | 'aws-iam'>('api-key')
    const [providerOauthConfig, setProviderOauthConfig] = useState({
        googleJson: '',
        azureTenantId: '',
        azureClientId: '',
        azureClientSecret: '',
        awsAccessKey: '',
        awsSecretKey: '',
        awsRegion: 'us-east-1',
        awsSessionToken: ''
    })

    const handleOauthConfigChange = (key: string, value: string) => {
        setProviderOauthConfig(prev => ({
            ...prev,
            [key]: value
        }))
    }

    // Provider 預設 URL（與 aipc-agent 完全一致）
    const PROVIDER_DEFAULTS: Record<string, string> = {
        'OpenAI': 'https://api.openai.com/v1',
        'Anthropic Claude': 'https://api.anthropic.com/v1',
        'Google Gemini': 'https://generativelanguage.googleapis.com/v1beta/openai',
        'Mistral': 'https://api.mistral.ai/v1',
        'Groq': 'https://api.groq.com/openai/v1',
        'xAI (Grok)': 'https://api.x.ai/v1',
        'NVIDIA NIM': 'https://integrate.api.nvidia.com/v1',
        'Together AI': 'https://api.together.xyz/v1',
        'OpenRouter': 'https://openrouter.ai/api/v1',
        'Kilo Gateway': 'https://api.kilo.ai/api/gateway/',
        'Synthetic (Anthropic-compatible)': 'https://api.synthetic.new/anthropic',
        'Moonshot AI (Kimi)': 'https://api.moonshot.ai/v1',
        'Vercel AI Gateway': 'https://gateway.ai.vercel.com/v1/',
        'Cloudflare AI Gateway': 'https://gateway.ai.cloudflare.com/v1/',
        'Ollama Cloud': 'https://ollama.com',
        'Ollama': 'http://127.0.0.1:11434/v1',
        'vLLM': 'http://127.0.0.1:8000/v1',
        'SGLang': 'http://127.0.0.1:30000/v1',
        'LM Studio': 'http://127.0.0.1:1234/v1',
        'Customer Provider (自訂)': 'http://127.0.0.1:11434/v1'
    }

    // 本地 Provider 列表（不需要 API Key）
    const LOCAL_NOAUTH_PROVIDERS = ['Ollama', 'Ollama Cloud', 'vLLM', 'SGLang', 'LM Studio']

    // 選擇 Provider 時自動帶出 Base URL
    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const providerType = e.target.value
        setSelectedProvider(providerType)
        
        // 根據 type 查找對應的 provider
        const provider = providers.find(p => p.type === providerType)
        
        if (provider) {
            const providerName = provider.name
            
            // 優先使用 PROVIDER_DEFAULTS 做為預設，這與 aipc-agent 機制一致
            const defaultUrl = PROVIDER_DEFAULTS[providerName] || provider.baseUrl || 'http://127.0.0.1:11434/v1'
            setProviderBaseUrl(defaultUrl)
            
            let newApiKey = providerApiKey;
            // 如果是本地 Provider，清空 API Key
            if (LOCAL_NOAUTH_PROVIDERS.includes(providerName) || providerName === 'Customer Provider (自訂)') {
                setProviderApiKey('')
                newApiKey = ''
            }
            
            // 切換 Provider 時自動獲取最新模型列表，並清空目前選中的模型（以便自動選第一個）
            fetchAvailableModels(providerType, defaultUrl, newApiKey, '');
        } else {
            // 如果 providers 還沒載入，使用硬編碼的 Base URL
            const hardcodedUrls: Record<string, string> = {
                'ollama': 'http://127.0.0.1:11434/v1',
                'ollama-cloud': 'https://ollama.com',
                'openai': 'https://api.openai.com/v1',
                'anthropic': 'https://api.anthropic.com/v1',
                'google-gemini': 'https://generativelanguage.googleapis.com/v1beta/openai',
                'mistral': 'https://api.mistral.ai/v1',
                'groq': 'https://api.groq.com/openai/v1',
                'xai-grok': 'https://api.x.ai/v1',
                'nvidia': 'https://integrate.api.nvidia.com/v1',
                'together': 'https://api.together.xyz/v1',
                'openrouter': 'https://openrouter.ai/api/v1',
                'kilo-gateway': 'https://api.kilo.ai/api/gateway/',
                'synthetic': 'https://api.synthetic.new/anthropic',
                'moonshot': 'https://api.moonshot.ai/v1',
                'vercel-gateway': 'https://gateway.ai.vercel.com/v1/',
                'cloudflare-gateway': 'https://gateway.ai.cloudflare.com/v1/',
                'vllm': 'http://127.0.0.1:8000/v1',
                'sglang': 'http://127.0.0.1:30000/v1',
                'lm-studio': 'http://127.0.0.1:1234/v1',
                'custom': 'http://127.0.0.1:11434/v1'
            }
            const defaultUrl = hardcodedUrls[providerType] || 'http://127.0.0.1:11434/v1'
            setProviderBaseUrl(defaultUrl)
            setProviderApiKey('')
            fetchAvailableModels(providerType, defaultUrl, '', '');
        }
    }

    // 檢查用戶是否為管理員
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

    // 獲取用戶列表
    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
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

    // 更新用戶角色
    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || t('admin.error.updateRole'))
            }

            // 重新獲取用戶列表
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : t('admin.error.updateRole'))
        }
    }

    // 刪除用戶
    const deleteUser = async (userId: string) => {
        if (!window.confirm(t('admin.deleteUserConfirm'))) {
            return
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || t('admin.error.deleteUser'))
            }

            // 重新獲取用戶列表
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : t('admin.error.deleteUser'))
        }
    }

    // 新增用戶
    const createUser = async () => {
        if (!modalEmail || !modalPassword) {
            setModalError('Email 和密碼為必填')
            return
        }
        setModalLoading(true)
        setModalError(null)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: modalEmail, password: modalPassword, role: modalRole })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '新增失敗')
            setShowCreateModal(false)
            setModalEmail(''); setModalPassword(''); setModalRole('user')
            await fetchUsers()
        } catch (e: any) {
            setModalError(e.message)
        } finally {
            setModalLoading(false)
        }
    }

    // 開啟編輯 Modal
    const openEditModal = (user: User) => {
        setEditingUser(user)
        setModalEmail(user.email)
        setModalPassword('')
        setModalRole(user.role as 'user' | 'admin')
        setModalError(null)
        setShowEditModal(true)
    }

    // 儲存編輯
    const saveEditUser = async () => {
        if (!editingUser || !modalEmail) {
            setModalError('Email 為必填')
            return
        }
        setModalLoading(true)
        setModalError(null)
        try {
            const body: any = { email: modalEmail, role: modalRole }
            if (modalPassword) body.password = modalPassword
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '儲存失敗')
            setShowEditModal(false)
            await fetchUsers()
        } catch (e: any) {
            setModalError(e.message)
        } finally {
            setModalLoading(false)
        }
    }

    // 切換用戶啟用狀態
    const toggleUserEnable = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/toggle-enable`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || t('admin.error.toggleUser'))
            }

            // 重新獲取用戶列表
            await fetchUsers()
        } catch (error) {
            setError(error instanceof Error ? error.message : t('admin.error.toggleUser'))
        }
    }

    // 獲取可用的 Provider 列表
    const fetchProviders = async () => {
        try {
            const response = await fetch('/api/providers', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setProviders(data.providers)
            }
        } catch (error) {
            console.error('Error fetching providers:', error)
        }
    }

    // 獲取當前 Provider 配置
    const fetchCurrentProvider = async () => {
        try {
            const response = await fetch('/api/providers/current', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setCurrentProvider(data.current)
                setSelectedProvider(data.current.type)
                setProviderBaseUrl(data.current.baseUrl)
                setProviderModel(data.current.model)
                
                let currentApiKey = ''
                let currentAuthMethod = data.current.authMethod || 'api-key'
                let currentOauthConfig = data.current.oauthConfig || {
                    googleJson: '',
                    azureTenantId: '',
                    azureClientId: '',
                    azureClientSecret: '',
                    awsAccessKey: '',
                    awsSecretKey: '',
                    awsRegion: 'us-east-1',
                    awsSessionToken: ''
                }
                
                setProviderAuthMethod(currentAuthMethod)
                setProviderOauthConfig(currentOauthConfig)

                // ✅ 同時從 localStorage 讀取 API Key 與 OAuth 設定
                const adminSettings = localStorage.getItem('adminProviderSettings')
                if (adminSettings) {
                    try {
                        const parsed = JSON.parse(adminSettings)
                        if (parsed.apiKey) {
                            currentApiKey = parsed.apiKey
                            setProviderApiKey(parsed.apiKey)
                        }
                        if (parsed.authMethod) {
                            currentAuthMethod = parsed.authMethod
                            setProviderAuthMethod(parsed.authMethod)
                        }
                        if (parsed.oauthConfig) {
                            currentOauthConfig = {
                                ...currentOauthConfig,
                                ...parsed.oauthConfig
                            }
                            setProviderOauthConfig(currentOauthConfig)
                        }
                    } catch (e) {
                        console.error('解析 adminSettings 失敗:', e)
                    }
                }
                
                // ✅ 獲取當前 Provider 設定後，自動從該 Provider 拉取模型列表
                // 並傳入 data.current.model 以避免 React state 延遲導致判斷錯誤
                fetchAvailableModels(data.current.type, data.current.baseUrl, currentApiKey, data.current.model, currentAuthMethod, currentOauthConfig)
            }
        } catch (error) {
            console.error('Error fetching current provider:', error)
        }
    }

    // 檢查 Provider 連接
    const checkConnection = async () => {
        setCheckingConnection(true)
        setConnectionStatus('idle')
        setConnectionMessage('')

        try {
            const response = await fetch('/api/providers/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: selectedProvider,
                    baseUrl: providerBaseUrl,
                    apiKey: providerApiKey,
                    model: providerModel,
                    authMethod: providerAuthMethod,
                    oauthConfig: providerOauthConfig
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

    // 保存 Provider 設定
    const saveProviderSettings = async () => {
        try {
            const response = await fetch('/api/providers/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: selectedProvider,
                    baseUrl: providerBaseUrl,
                    apiKey: providerApiKey,
                    model: providerModel,
                    temperature: providerTemperature,
                    topP: providerTopP,
                    topK: providerTopK,
                    maxTokens: providerMaxTokens,
                    visionModel: providerVisionModel,
                    authMethod: providerAuthMethod,
                    oauthConfig: providerOauthConfig
                })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.isConnected) {
                    // 重新獲取當前 Provider
                    await fetchCurrentProvider()
                    setConnectionStatus('success')
                    setConnectionMessage(t('admin.llm.saveSuccess', '✅ 設定已保存'))
                    
                    // ✅ 同步到 localStorage，讓主畫面也能讀取
                    localStorage.setItem('adminProviderSettings', JSON.stringify({
                        type: selectedProvider,
                        baseUrl: providerBaseUrl,
                        apiKey: providerApiKey,
                        model: providerModel,
                        temperature: providerTemperature,
                        topP: providerTopP,
                        topK: providerTopK,
                        maxTokens: providerMaxTokens,
                        authMethod: providerAuthMethod,
                        oauthConfig: providerOauthConfig
                    }))
                    
                    // ✅ 手動載入模型列表並同步到 localStorage
                    // 因為同一頁面的 localStorage.setItem 不會觸發 storage event
                    try {
                        const oauthConfigQuery = encodeURIComponent(JSON.stringify(providerOauthConfig))
                        const modelsResponse = await fetch(`/api/models?type=${encodeURIComponent(selectedProvider)}&baseUrl=${encodeURIComponent(providerBaseUrl)}&apiKey=${encodeURIComponent(providerApiKey)}&authMethod=${encodeURIComponent(providerAuthMethod)}&oauthConfig=${oauthConfigQuery}`,
                            {
                                headers: { 'Authorization': `Bearer ${token}` }
                            }
                        )
                        if (modelsResponse.ok) {
                            const modelsData = await modelsResponse.json()
                            const models = (modelsData.models || []).map((model: any) => ({
                                id: model.name,
                                name: model.name
                            }))
                            
                            // 同步模型列表到 localStorage
                            localStorage.setItem('adminModelList', JSON.stringify(models))
                            console.log('Model list synced to localStorage:', models.length, 'models')
                            
                            // 觸發自定義事件通知主頁面
                            window.dispatchEvent(new CustomEvent('modelListUpdated', { detail: { models } }))
                        }
                    } catch (error) {
                        console.error('載入模型列表失敗:', error)
                    }
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

    // 獲取可用模型列表
    const fetchAvailableModels = async (typeOverride?: string, baseUrlOverride?: string, apiKeyOverride?: string, modelOverride?: string, authMethodOverride?: string, oauthConfigOverride?: any) => {
        const type = typeOverride !== undefined ? typeOverride : selectedProvider;
        const baseUrl = baseUrlOverride !== undefined ? baseUrlOverride : providerBaseUrl;
        const apiKey = apiKeyOverride !== undefined ? apiKeyOverride : providerApiKey;
        const targetModel = modelOverride !== undefined ? modelOverride : providerModel;
        const authMethod = authMethodOverride !== undefined ? authMethodOverride : providerAuthMethod;
        const oauthConfig = oauthConfigOverride !== undefined ? oauthConfigOverride : providerOauthConfig;

        if (!baseUrl) return;
        
        try {
            setLoadingModels(true)
            const oauthConfigQuery = encodeURIComponent(JSON.stringify(oauthConfig))
            const response = await fetch(`/api/models?type=${encodeURIComponent(type)}&baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey)}&authMethod=${encodeURIComponent(authMethod)}&oauthConfig=${oauthConfigQuery}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            )
            if (response.ok) {
                const data = await response.json()
                const models = data.models || []
                setAvailableModels(models)
                
                // ✅ 改良邏輯：如果當前已經有選中的模型，且它還在清單中，就保留它
                const currentStillValid = models.some((m: any) => m.name === targetModel)
                
                if (models.length > 0) {
                    if (!targetModel || !currentStillValid) {
                        // 只有在目前沒選，或是原本選的已經失效時，才自動選第一個
                        setProviderModel(models[0].name)
                        console.log('Auto-selected first model due to invalidity:', models[0].name)
                    } else {
                        console.log('Preserving current model selection:', targetModel)
                        setProviderModel(targetModel)
                    }
                } else if (!targetModel) {
                    // 若抓不到且目前也是空的，就乾脆清空讓用戶手打
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
        // 先載入 providers，再載入當前設定
        fetchProviders().then(() => {
            fetchCurrentProvider()
        })
    }, [])

    // 計算分頁數據
    const totalPages = Math.ceil(users.length / usersPerPage)
    const startIndex = (currentPage - 1) * usersPerPage
    const endIndex = startIndex + usersPerPage
    const currentUsers = users.slice(startIndex, endIndex)

    // 分頁控制函數
    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

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
                {/* 標題 */}
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
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {t('admin.title')}
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {t('admin.subtitle')}
                    </p>
                </div>

                {/* 標籤頁 */}
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

                {/* LLM Provider 設定標籤頁 */}
                {activeTab === 'llm' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                            <Cpu className="h-6 w-6 text-blue-600" />
                            <span>{t('admin.llm.config', 'LLM Provider 配置')}</span>
                        </h2>

                        {/* Provider 選擇 */}
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
                                        <option key={provider.type} value={provider.type}>
                                            {provider.name}
                                        </option>
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

                        {/* API 認證方法與模型/多模態配置 */}
                        {(() => {
                            const selectedProviderObj = providers.find(p => p.type === selectedProvider);
                            const isLocalProvider = selectedProviderObj && LOCAL_NOAUTH_PROVIDERS.includes(selectedProviderObj.name);

                            // 1. 本地免認證 Provider 版面配置
                            if (isLocalProvider) {
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t('admin.llm.modelName', '模型名稱')}
                                            </label>
                                            <div className="flex space-x-2">
                                                {availableModels.length > 0 ? (
                                                    <select
                                                        value={providerModel}
                                                        onChange={(e) => setProviderModel(e.target.value)}
                                                        className="flex-1 min-w-0 flex-shrink truncate px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    >
                                                        {availableModels.map((model: any) => (
                                                            <option key={model.name} value={model.name}>
                                                                {model.name}
                                                            </option>
                                                        ))}
                                                        {!availableModels.find(m => m.name === providerModel) && providerModel && (
                                                            <option value={providerModel}>{providerModel} ({t('admin.llm.current', '當前')})</option>
                                                        )}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={providerModel}
                                                        onChange={(e) => setProviderModel(e.target.value)}
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
                                                                <option key={model.name} value={model.name}>
                                                                    {model.name}
                                                                </option>
                                                            ))}
                                                        {!availableModels.filter((m: any) => isVisionModel(m.name)).find(m => m.name === providerVisionModel) && providerVisionModel && (
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
                                    </div>
                                );
                            }

                            // 2. 需要認證之雲端 Provider 版面配置
                            return (
                                <>
                                    {/* 2x2 或 2x1 核心配置格線區 */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        {/* 第一排左：認證方法 */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t('admin.llm.authMethod', '認證方法')}
                                            </label>
                                            <select
                                                value={providerAuthMethod}
                                                onChange={(e) => {
                                                    const method = e.target.value as any
                                                    setProviderAuthMethod(method)
                                                    // 切換認證方法時自動重拉模型列表
                                                    fetchAvailableModels(selectedProvider, providerBaseUrl, providerApiKey, providerModel, method)
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="api-key">🔑 靜態 API 金鑰 (Static API Key)</option>
                                                <option value="google-service-account">🌐 Google 服務帳號金鑰 (Service Account JSON)</option>
                                                <option value="azure-entra-id">🌐 Microsoft Entra ID 客戶端憑證 (OAuth 2.0)</option>
                                                <option value="aws-iam">☁️ AWS IAM 簽章憑證 (SigV4)</option>
                                            </select>
                                        </div>

                                        {/* 第一排右：API Key (如果是 api-key 認證法) */}
                                        {providerAuthMethod === 'api-key' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {t('admin.llm.apiKey', 'API Key')}
                                                </label>
                                                <input
                                                    type="password"
                                                    value={providerApiKey}
                                                    onChange={(e) => setProviderApiKey(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    placeholder={t('admin.llm.apiKeyPlaceholder', 'API Key (可選，部分 Provider 不需要)')}
                                                />
                                            </div>
                                        ) : (
                                            // 非 API Key 模式時，右側留空以維持第一排的簡潔與對齊
                                            <div className="hidden md:block"></div>
                                        )}

                                        {/* 第二排左：模型名稱 */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t('admin.llm.modelName', '模型名稱')}
                                            </label>
                                            <div className="flex space-x-2">
                                                {availableModels.length > 0 ? (
                                                    <select
                                                        value={providerModel}
                                                        onChange={(e) => setProviderModel(e.target.value)}
                                                        className="flex-1 min-w-0 flex-shrink truncate px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    >
                                                        {availableModels.map((model: any) => (
                                                            <option key={model.name} value={model.name}>
                                                                {model.name}
                                                            </option>
                                                        ))}
                                                        {!availableModels.find(m => m.name === providerModel) && providerModel && (
                                                            <option value={providerModel}>{providerModel} ({t('admin.llm.current', '當前')})</option>
                                                        )}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={providerModel}
                                                        onChange={(e) => setProviderModel(e.target.value)}
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

                                        {/* 第二排右：Vision 模型 */}
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
                                                                <option key={model.name} value={model.name}>
                                                                    {model.name}
                                                                </option>
                                                            ))}
                                                        {!availableModels.filter((m: any) => isVisionModel(m.name)).find(m => m.name === providerVisionModel) && providerVisionModel && (
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
                                    </div>

                                    {/* 3. 企業雲端動態憑證輸入區 (僅在非 API Key 認證時顯示) */}
                                    {providerAuthMethod !== 'api-key' && (
                                        <div className="p-5 border border-gray-150 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg mb-6 transition-all duration-300">
                                            {providerAuthMethod === 'google-service-account' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        GCP 服務帳號金鑰 (Service Account JSON)
                                                    </label>
                                                    <textarea
                                                        rows={6}
                                                        value={providerOauthConfig.googleJson}
                                                        onChange={(e) => handleOauthConfigChange('googleJson', e.target.value)}
                                                        className="w-full px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder={`{\n  "type": "service_account",\n  "project_id": "your-project-id",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...",\n  "client_email": "..."\n}`}
                                                    />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        請上傳或貼上完整的 Google Cloud Service Account 金鑰 JSON。後端將進行安全加密儲存。
                                                    </p>
                                                </div>
                                            )}

                                            {providerAuthMethod === 'azure-entra-id' && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Microsoft Entra Tenant ID (目錄識別碼)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={providerOauthConfig.azureTenantId}
                                                            onChange={(e) => handleOauthConfigChange('azureTenantId', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="例如: 12345678-1234-..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Client ID (應用程式識別碼)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={providerOauthConfig.azureClientId}
                                                            onChange={(e) => handleOauthConfigChange('azureClientId', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="例如: 87654321-4321-..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Client Secret (用戶端密碼)
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={providerOauthConfig.azureClientSecret}
                                                            onChange={(e) => handleOauthConfigChange('azureClientSecret', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="輸入 Azure AD 應用程式客戶端密碼"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {providerAuthMethod === 'aws-iam' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            AWS Access Key ID
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={providerOauthConfig.awsAccessKey}
                                                            onChange={(e) => handleOauthConfigChange('awsAccessKey', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="例如: AKIA..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            AWS Secret Access Key
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={providerOauthConfig.awsSecretKey}
                                                            onChange={(e) => handleOauthConfigChange('awsSecretKey', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="輸入 AWS Secret Key"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            AWS Region (區域)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={providerOauthConfig.awsRegion}
                                                            onChange={(e) => handleOauthConfigChange('awsRegion', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="例如: us-east-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            AWS Session Token (選填，使用臨時憑證時填寫)
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={providerOauthConfig.awsSessionToken}
                                                            onChange={(e) => handleOauthConfigChange('awsSessionToken', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="臨時 IAM Session Token"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* 生成參數 */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('admin.llm.generation', '生成參數')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('admin.llm.temperature', 'Temperature')}: {providerTemperature}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        value={providerTemperature}
                                        onChange={(e) => setProviderTemperature(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('admin.llm.temperatureHint', '控制輸出隨機性：低溫=確定、邏輯；高溫=多樣、創造')}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('admin.llm.topP', 'Top P')}: {providerTopP}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={providerTopP}
                                        onChange={(e) => setProviderTopP(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('admin.llm.topPHint', '核心採樣機率：高=高機率；低=低機率')}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('admin.llm.topK', 'Top K')}: {providerTopK}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        step="1"
                                        value={providerTopK}
                                        onChange={(e) => setProviderTopK(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('admin.llm.topKHint', '限制候選 Token 數量：高=取樣多；低=取樣少')}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('admin.llm.contextSize', 'Context Size')}: {providerMaxTokens}
                                    </label>
                                    <input
                                        type="range"
                                        min="256"
                                        max="262144"
                                        step="256"
                                        value={providerMaxTokens}
                                        onChange={(e) => setProviderMaxTokens(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('admin.llm.maxTokensHint', '最大上下文長度')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 連接測試 */}
                        <div className="mb-6">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={checkConnection}
                                    disabled={checkingConnection}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {checkingConnection ? t('admin.llm.testing', '測試中...') : t('admin.llm.testConnection', '測試連接')}
                                </button>
                                <button
                                    onClick={saveProviderSettings}
                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    {t('admin.llm.saveSettings', '保存設定')}
                                </button>
                            </div>
                            {connectionMessage && (
                                <div className={`mt-4 p-3 rounded-md ${
                                    connectionStatus === 'success'
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                        : connectionStatus === 'error'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                    {connectionMessage}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 用戶管理標籤頁 */}
                {activeTab === 'users' && (
                    <>
                {/* 錯誤訊息 */}
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-300"
                        >
                            {t('admin.close')}
                        </button>
                    </div>
                )}

                {/* 用戶統計 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <Users className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('admin.stats.totalUsers')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <UserCheck className="h-8 w-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.filter(u => u.enable).length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('admin.stats.enabledUsers')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.filter(u => !u.enable).length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('admin.stats.disabledUsers')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3">
                            <Shield className="h-8 w-8 text-purple-500" />
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {users.filter(u => u.role === 'admin').length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('admin.stats.admins')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 用戶列表 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('admin.table.list')}
                        </h2>
                        <button
                            onClick={() => { setModalEmail(''); setModalPassword(''); setModalRole('user'); setModalError(null); setShowCreateModal(true) }}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>新增用戶</span>
                        </button>
                    </div>

                    {/* 桌面版：表格 */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full min-w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('admin.table.email')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('admin.table.status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('admin.table.role')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('admin.table.registrationDate')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('admin.table.lastLogin')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('admin.table.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {currentUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.enable
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {user.enable ? t('admin.status.enabled') : t('admin.status.disabled')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                }`}>
                                                {user.role === 'admin' ? t('admin.role.admin') : t('admin.role.user')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(user.createdAt).toLocaleDateString(i18n.language)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.lastLoginAt
                                                ? new Date(user.lastLoginAt).toLocaleString(i18n.language)
                                                : t('admin.neverLoggedIn')
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                title="編輯用戶"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleUserEnable(user.id)}
                                                className={`${user.enable
                                                    ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                                                    : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                    }`}
                                                title={user.enable ? t('admin.disableUser') : t('admin.enableUser')}
                                                disabled={user.id === currentUser?.id}
                                            >
                                                {user.enable ? <AlertTriangle className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                            </button>
                                            {user.role === 'user' ? (
                                                <button
                                                    onClick={() => updateUserRole(user.id, 'admin')}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title={t('admin.setAsAdmin')}
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updateUserRole(user.id, 'user')}
                                                    className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                                    title={t('admin.setAsUser')}
                                                    disabled={users.filter(u => u.role === 'admin').length <= 1 && user.role === 'admin'}
                                                >
                                                    <UserCheck className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                                                title={t('admin.deleteUser')}
                                                disabled={user.id === currentUser?.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 手機版：卡片 */}
                    <div className="md:hidden space-y-4 p-4">
                        {currentUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>{t('admin.noUsers')}</p>
                            </div>
                        ) : (
                            currentUsers.map((user) => (
                                <div key={user.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {user.email}
                                            </div>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.enable
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {user.enable ? t('admin.status.enabled') : t('admin.status.disabled')}
                                            </span>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                }`}>
                                                {user.role === 'admin' ? t('admin.role.admin') : t('admin.role.user')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <div>{t('admin.table.registrationDate')}: {new Date(user.createdAt).toLocaleDateString(i18n.language)}</div>
                                        <div>{t('admin.table.lastLogin')}: {user.lastLoginAt
                                            ? new Date(user.lastLoginAt).toLocaleString(i18n.language)
                                            : t('admin.neverLoggedIn')
                                        }</div>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-3">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="p-2 rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900"
                                            title="編輯用戶"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleUserEnable(user.id)}
                                            className={`p-2 rounded-md ${user.enable
                                                ? 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900'
                                                : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900'
                                                }`}
                                            title={user.enable ? t('admin.disableUser') : t('admin.enableUser')}
                                            disabled={user.id === currentUser?.id}
                                        >
                                            {user.enable ? <AlertTriangle className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                        </button>
                                        {user.role === 'user' ? (
                                            <button
                                                onClick={() => updateUserRole(user.id, 'admin')}
                                                className="p-2 rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900"
                                                title={t('admin.setAsAdmin')}
                                            >
                                                <UserPlus className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateUserRole(user.id, 'user')}
                                                className="p-2 rounded-md text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900"
                                                title={t('admin.setAsUser')}
                                                disabled={users.filter(u => u.role === 'admin').length <= 1 && user.role === 'admin'}
                                            >
                                                <UserCheck className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="p-2 rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900"
                                            title={t('admin.deleteUser')}
                                            disabled={user.id === currentUser?.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 分頁控制 */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    {t('admin.pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, users.length), total: users.length })}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {t('admin.pagination.previous')}
                                    </button>

                                    {/* 頁碼按鈕 */}
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                                        if (pageNum > totalPages) return null
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => goToPage(pageNum)}
                                                className={`px-3 py-1 text-sm border rounded-md ${pageNum === currentPage
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    })}

                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {t('admin.pagination.next')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                    </>
                )}

                {/* 新增用戶 Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">新增用戶</h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input type="email" value={modalEmail} onChange={e => setModalEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="user@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密碼</label>
                                    <input type="password" value={modalPassword} onChange={e => setModalPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="至少 6 個字符" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色</label>
                                    <select value={modalRole} onChange={e => setModalRole(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="user">一般用戶</option>
                                        <option value="admin">管理員</option>
                                    </select>
                                </div>
                                {modalError && <p className="text-sm text-red-500">{modalError}</p>}
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">取消</button>
                                <button onClick={createUser} disabled={modalLoading}
                                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50">
                                    {modalLoading ? '處理中...' : '新增'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 編輯用戶 Modal */}
                {showEditModal && editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEditModal(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">編輯用戶</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input type="email" value={modalEmail} onChange={e => setModalEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密碼（留空不更改）</label>
                                    <input type="password" value={modalPassword} onChange={e => setModalPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="留空則不更改密碼" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色</label>
                                    <select value={modalRole} onChange={e => setModalRole(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="user">一般用戶</option>
                                        <option value="admin">管理員</option>
                                    </select>
                                </div>
                                {modalError && <p className="text-sm text-red-500">{modalError}</p>}
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">取消</button>
                                <button onClick={saveEditUser} disabled={modalLoading}
                                    className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50">
                                    {modalLoading ? '儲存中...' : '儲存'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}