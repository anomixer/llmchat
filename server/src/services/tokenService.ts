import crypto from 'crypto'
import axios from 'axios'

interface CachedToken {
    token: string
    expiresAt: number
}

export class TokenService {
    private tokenCache = new Map<string, CachedToken>()

    /**
     * 獲取 Google Cloud Service Account OAuth Access Token
     * 使用 RS256 算法原生簽署 JWT，無需任何第三方 Google SDK
     */
    async getGoogleAccessToken(serviceAccountJsonStr: string): Promise<string> {
        try {
            const key = JSON.parse(serviceAccountJsonStr)
            if (key.type !== 'service_account' || !key.private_key || !key.client_email) {
                throw new Error('無效的 Google 服務帳號 JSON 憑證')
            }

            const cacheKey = `google:${key.client_email}`
            const cached = this.tokenCache.get(cacheKey)
            const now = Date.now()

            // 如果快取未過期，直接返回（保留 5 分鐘緩衝時間）
            if (cached && cached.expiresAt > now + 300 * 1000) {
                return cached.token
            }

            // 1. 建立 JWT Header
            const header = {
                alg: 'RS256',
                typ: 'JWT'
            }

            // 2. 建立 JWT Claims (有效期 1 小時)
            const iat = Math.floor(now / 1000)
            const exp = iat + 3600
            const payload = {
                iss: key.client_email,
                scope: 'https://www.googleapis.com/auth/cloud-platform',
                aud: key.token_uri || 'https://oauth2.googleapis.com/token',
                exp,
                iat
            }

            // 3. Base64URL 編碼 Header 與 Payload
            const base64UrlEncode = (obj: object) => {
                return Buffer.from(JSON.stringify(obj))
                    .toString('base64')
                    .replace(/=/g, '')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
            }

            const encodedHeader = base64UrlEncode(header)
            const encodedPayload = base64UrlEncode(payload)
            const signatureInput = `${encodedHeader}.${encodedPayload}`

            // 4. 使用私鑰進行 RSA-SHA256 簽名
            const signer = crypto.createSign('RSA-SHA256')
            signer.update(signatureInput)
            const signature = signer.sign(key.private_key, 'base64')
            const encodedSignature = signature
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')

            const jwt = `${signatureInput}.${encodedSignature}`

            // 5. POST 交換 Access Token
            const tokenUrl = key.token_uri || 'https://oauth2.googleapis.com/token'
            const params = new URLSearchParams()
            params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
            params.append('assertion', jwt)

            const response = await axios.post(tokenUrl, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })

            const accessToken = response.data.access_token
            if (!accessToken) {
                throw new Error('Google 未傳回 access_token')
            }

            // 快取 Token
            this.tokenCache.set(cacheKey, {
                token: accessToken,
                expiresAt: now + (response.data.expires_in || 3600) * 1000
            })

            return accessToken
        } catch (error: any) {
            console.error('獲取 Google OAuth Access Token 失敗:', error.response?.data || error.message)
            throw new Error(`Google OAuth 授權失敗: ${error.message}`)
        }
    }

    /**
     * 獲取 Microsoft Entra ID (Azure AD) OAuth Access Token
     * 使用 Client Credentials Flow Client 客戶端憑證流
     */
    async getAzureAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
        try {
            if (!tenantId || !clientId || !clientSecret) {
                throw new Error('缺少 Tenant ID、Client ID 或 Client Secret 參數')
            }

            const cacheKey = `azure:${tenantId}:${clientId}`
            const cached = this.tokenCache.get(cacheKey)
            const now = Date.now()

            // 如果快取未過期，直接返回（保留 5 分鐘緩衝時間）
            if (cached && cached.expiresAt > now + 300 * 1000) {
                return cached.token
            }

            // 呼叫 Microsoft Entra ID Token 端點
            const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
            const params = new URLSearchParams()
            params.append('grant_type', 'client_credentials')
            params.append('client_id', clientId)
            params.append('client_secret', clientSecret)
            params.append('scope', 'https://cognitiveservices.azure.com/.default')

            const response = await axios.post(tokenUrl, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })

            const accessToken = response.data.access_token
            if (!accessToken) {
                throw new Error('Microsoft 未傳回 access_token')
            }

            // 快取 Token
            this.tokenCache.set(cacheKey, {
                token: accessToken,
                expiresAt: now + (response.data.expires_in || 3600) * 1000
            })

            return accessToken
        } catch (error: any) {
            console.error('獲取 Azure AD Token 失敗:', error.response?.data || error.message)
            throw new Error(`Azure Entra ID 授權失敗: ${error.message}`)
        }
    }

    /**
     * 獲取 GitHub Copilot Session Token
     * 使用 GitHub Personal Access Token (PAT) 或 OAuth Token 向 GitHub 交換 Copilot Session Token
     */
    async getGitHubCopilotToken(githubToken: string): Promise<string> {
        try {
            if (!githubToken) {
                throw new Error('缺少 GitHub Token')
            }

            // 用 SHA-256 雜湊來做快取 key
            const hash = crypto.createHash('sha256').update(githubToken).digest('hex')
            const cacheKey = `github-copilot:${hash}`
            const cached = this.tokenCache.get(cacheKey)
            const now = Date.now()

            // 如果快取未過期，直接返回（保留 5 分鐘緩衝時間）
            if (cached && cached.expiresAt > now + 300 * 1000) {
                return cached.token
            }

            // 呼叫 GitHub Copilot Token 交換端點
            const tokenUrl = 'https://api.github.com/copilot_internal/v2/token'
            const response = await axios.get(tokenUrl, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'User-Agent': 'GithubCopilot/1.234.0'
                }
            })

            const sessionToken = response.data.token
            if (!sessionToken) {
                throw new Error('GitHub 未傳回 Copilot token')
            }

            // 快取 Token (通常有效期為 25-30 分鐘，快取 20 分鐘)
            const expiresAt = response.data.expires_at ? response.data.expires_at * 1000 : now + 1200 * 1000
            
            this.tokenCache.set(cacheKey, {
                token: sessionToken,
                expiresAt: expiresAt
            })

            return sessionToken
        } catch (error: any) {
            console.error('獲取 GitHub Copilot Token 失敗:', error.response?.data || error.message)
            throw new Error(`GitHub Copilot 授權失敗: ${error.message}`)
        }
    }

    /**
     * 獲取 Google User OAuth Access Token (透過 refresh_token 交換)
     */
    async getGoogleUserAccessToken(refreshToken: string, userClientId?: string, userClientSecret?: string): Promise<string> {
        try {
            if (!refreshToken) {
                throw new Error('缺少 Google Refresh Token')
            }

            const clientId = userClientId || process.env.GOOGLE_CLIENT_ID
            const clientSecret = userClientSecret || process.env.GOOGLE_CLIENT_SECRET
            if (!clientId || !clientSecret) {
                throw new Error('系統未配置 GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET 環境變數，且未提供 gcloud 用戶端憑證。')
            }

            // 用 SHA-256 雜湊來做快取 key
            const hash = crypto.createHash('sha256').update(refreshToken).digest('hex')
            const cacheKey = `google-user:${hash}`
            const cached = this.tokenCache.get(cacheKey)
            const now = Date.now()

            // 如果快取未過期，直接返回（保留 5 分鐘緩衝時間）
            if (cached && cached.expiresAt > now + 300 * 1000) {
                return cached.token
            }

            // 呼叫 Google Token 端點交換 Access Token
            const tokenUrl = 'https://oauth2.googleapis.com/token'
            const params = new URLSearchParams()
            params.append('client_id', clientId)
            params.append('client_secret', clientSecret)
            params.append('refresh_token', refreshToken)
            params.append('grant_type', 'refresh_token')

            const response = await axios.post(tokenUrl, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })

            const accessToken = response.data.access_token
            if (!accessToken) {
                throw new Error('Google 未傳回 access_token')
            }

            // 快取 Token (通常有效期為 3600 秒，即 1 小時)
            const expiresAt = now + (response.data.expires_in || 3600) * 1000
            
            this.tokenCache.set(cacheKey, {
                token: accessToken,
                expiresAt: expiresAt
            })

            return accessToken
        } catch (error: any) {
            console.error('交換 Google User Access Token 失敗:', error.response?.data || error.message)
            throw new Error(`Google 帳號 Token 交換失敗: ${error.message}`)
        }
    }

    /**
     * 清除特定或所有快取 Token
     */
    clearCache(key?: string) {
        if (key) {
            this.tokenCache.delete(key)
        } else {
            this.tokenCache.clear()
        }
    }
}

// 導出單例
export const tokenService = new TokenService()
