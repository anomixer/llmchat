import fs from 'fs'

let content = fs.readFileSync('src/components/Admin.tsx', 'utf8')

const oldCode = `    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const providerType = e.target.value
        setSelectedProvider(providerType)
        const provider = providers.find(p => p.type === providerType)
        if (provider) {
            const defaultUrl = PROVIDER_DEFAULTS[provider.name] || provider.baseUrl || 'http://127.0.0.1:11434/v1'
            setProviderBaseUrl(defaultUrl)
            let newApiKey = providerApiKey
            if (!provider.requiresApiKey) {
                setProviderApiKey('')
                newApiKey = ''
            }
            fetchAvailableModels(providerType, defaultUrl, newApiKey, '')
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
            
            // 如果是 ollama 等已知不需要 API key 的，清空
            let newApiKey = providerApiKey
            if (['ollama', 'ollama-cloud'].includes(providerType)) {
                setProviderApiKey('')
                newApiKey = ''
            }
            fetchAvailableModels(providerType, defaultUrl, newApiKey, '')
        }
    }`

const newCode = `    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
            
            // 如果是 ollama 等已知不需要 API key 的，清空
            let newApiKey = providerApiKey
            if (['ollama', 'ollama-cloud'].includes(providerType)) {
                setProviderApiKey('')
                newApiKey = ''
            }
            fetchAvailableModels(providerType, defaultUrl, newApiKey, '', newAuthMethod)
        }
    }`

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode)
    fs.writeFileSync('src/components/Admin.tsx', content)
    console.log('Fixed handleProviderChange successfully.')
} else {
    console.log('Error: Could not find oldCode in Admin.tsx')
}
