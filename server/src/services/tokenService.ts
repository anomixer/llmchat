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
