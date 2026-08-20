/**
 * OAuth 2.0 Flow Routes
 * - Google OAuth: /api/oauth/google/start  → /api/oauth/google/callback
 * - ChatGPT Web Session: /api/oauth/chatgpt/session
 */
import { Router, type Request, type Response } from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

// In-memory state store（防 CSRF）
const oauthStateStore = new Map<string, { createdAt: number }>()

function cleanupStates() {
    const now = Date.now()
    for (const [key, val] of oauthStateStore.entries()) {
        if (now - val.createdAt > 600_000) oauthStateStore.delete(key)
    }
}

/** 產生一個輕量 HTML，用 postMessage 通知 opener 後自動關閉 popup */
function popupResultHtml(payload: object): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify(JSON.stringify(payload))}, '*');
    }
  } catch(e) {}
  window.close();
<\/script>
<p style="font-family:sans-serif;padding:2rem;">認證完成，此視窗將自動關閉...</p>
</body></html>`
}

export function createOAuthRouter(deps: any) {
    const { userService } = deps
    const router = Router()

    // ── Google OAuth Step 1: 回傳授權 URL（前端自行開 popup）────────────
    // GET /api/oauth/google/start
    router.get('/oauth/google/start', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET

        if (!clientId || !clientSecret) {
            return res.status(400).json({
                error: '尚未設定 GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET，請在 .env 填入後重新啟動伺服器。'
            })
        }

        // 日誌：方便確認用的是哪個 Google OAuth App
        console.log(`[OAuth] /start using GOOGLE_CLIENT_ID: ${clientId.slice(0, 12)}...`)

        cleanupStates()
        const state = crypto.randomBytes(16).toString('hex')
        oauthStateStore.set(state, { createdAt: Date.now() })

        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ||
            `${req.protocol}://${req.get('host')}/api/oauth/google/callback`

        console.log(`[OAuth] redirect_uri: ${redirectUri}`)

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: [
                'https://www.googleapis.com/auth/generative-language.retriever',
                'https://www.googleapis.com/auth/cloud-platform',
                'openid', 'email', 'profile'
            ].join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state
        })

        // 回傳 JSON，讓前端自己開 popup，避免 fetch 跟著 redirect 被 CORS 擋死
        res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
    })

    // ── Google OAuth Step 2: Google 回調，換取 refresh_token ─────────
    // GET /api/oauth/google/callback
    router.get('/oauth/google/callback', async (req: Request, res: Response) => {
        const { code, state, error } = req.query as Record<string, string>

        if (error) {
            return res.send(popupResultHtml({ oauth: 'google', status: 'error', reason: error }))
        }
        if (!state || !oauthStateStore.has(state)) {
            return res.send(popupResultHtml({ oauth: 'google', status: 'error', reason: 'invalid_state' }))
        }

        oauthStateStore.delete(state)

        const clientId = process.env.GOOGLE_CLIENT_ID!
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ||
            `${req.protocol}://${req.get('host')}/api/oauth/google/callback`

        try {
            // Code → Tokens
            const tokenRes = await axios.post('https://oauth2.googleapis.com/token',
                new URLSearchParams({
                    code, client_id: clientId, client_secret: clientSecret,
                    redirect_uri: redirectUri, grant_type: 'authorization_code'
                }).toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            )
            const { access_token, refresh_token } = tokenRes.data

            if (!refresh_token) {
                return res.send(popupResultHtml({ oauth: 'google', status: 'error', reason: 'no_refresh_token' }))
            }

            // 取得 Google 帳號 Email（用於 UI 顯示）
            let userEmail = ''
            try {
                const infoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo',
                    { headers: { Authorization: `Bearer ${access_token}` } })
                userEmail = infoRes.data.email || ''
            } catch (_) {}

            // 存入 admin 的 oauthConfig
            // 注意：type 固定存為 'gemini-oauth'，不能沿用 existing.type，
            // 否則設定畫面重新讀取後會跳到錯誤的 provider 選項
            if (userService) {
                const admin = userService.users.find((u: any) => u.role === 'admin')
                if (admin) {
                    const existing = userService.getUserSettings(admin.id) || {}
                    userService.updateUserSettings(admin.id, {
                        ...existing,
                        type: 'gemini-oauth',
                        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
                        authMethod: 'google-oauth-user',
                        oauthConfig: {
                            ...(existing.oauthConfig || {}),
                            googleUserRefreshToken: refresh_token,
                            googleUserClientId: clientId,
                            googleUserClientSecret: clientSecret,
                            googleUserEmail: userEmail
                        }
                    })
                    console.log(`[OAuth] Google refresh_token saved, authorized as: ${userEmail}, type set to gemini-oauth`)
                }
            }

            // 用 postMessage 通知主視窗，然後自動關閉 popup
            res.send(popupResultHtml({ oauth: 'google', status: 'success', email: userEmail }))
        } catch (err: any) {
            console.error('[OAuth] Google callback error:', err.response?.data || err.message)
            const errMsg = err.response?.data?.error_description || err.message
            res.send(popupResultHtml({ oauth: 'google', status: 'error', reason: errMsg }))
        }
    })

    // ── Google OAuth 狀態查詢 ─────────────────────────────────
    // GET /api/oauth/google/status
    router.get('/oauth/google/status', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const admin = userService?.users?.find((u: any) => u.role === 'admin')
            const settings = admin ? userService.getUserSettings(admin.id) : null
            res.json({
                isConnected: !!(settings?.oauthConfig?.googleUserRefreshToken),
                email: settings?.oauthConfig?.googleUserEmail || ''
            })
        } catch (err: any) {
            res.status(500).json({ error: err.message })
        }
    })

    // ── Google OAuth 撤銷授權 ──────────────────────────────
    // POST /api/oauth/google/revoke
    router.post('/oauth/google/revoke', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            if (userService) {
                const admin = userService.users.find((u: any) => u.role === 'admin')
                if (admin) {
                    const existing = userService.getUserSettings(admin.id) || {}
                    const rt = existing.oauthConfig?.googleUserRefreshToken
                    if (rt) {
                        try { await axios.post(`https://oauth2.googleapis.com/revoke?token=${rt}`) } catch (_) {}
                    }
                    userService.updateUserSettings(admin.id, {
                        ...existing,
                        authMethod: 'api-key',
                        oauthConfig: {
                            ...(existing.oauthConfig || {}),
                            googleUserRefreshToken: undefined,
                            googleUserEmail: undefined
                        }
                    })
                }
            }
            res.json({ success: true, message: 'Google 帳號已解除授權' })
        } catch (err: any) {
            res.status(500).json({ error: err.message })
        }
    })

    // ── ChatGPT Web Session — 儲存 Access Token ────────────────
    // POST /api/oauth/chatgpt/session
    router.post('/oauth/chatgpt/session', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { accessToken, proxyUrl } = req.body
            if (!accessToken) return res.status(400).json({ error: '缺少 accessToken' })

            let userEmail = ''
            try {
                const verifyUrl = proxyUrl
                    ? `${proxyUrl.replace(/\/+$/, '')}/api/auth/session`
                    : 'https://chatgpt.com/api/auth/session'
                const verifyRes = await axios.get(verifyUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 8000
                })
                userEmail = verifyRes.data?.user?.email || ''
            } catch (_) {}

            if (userService) {
                const admin = userService.users.find((u: any) => u.role === 'admin')
                if (admin) {
                    const existing = userService.getUserSettings(admin.id) || {}
                    userService.updateUserSettings(admin.id, {
                        ...existing,
                        authMethod: 'chatgpt-web-session',
                        type: existing.type || 'openai',
                        oauthConfig: {
                            ...(existing.oauthConfig || {}),
                            chatgptAccessToken: accessToken,
                            chatgptProxyUrl: proxyUrl || '',
                            chatgptEmail: userEmail
                        }
                    })
                    console.log(`[OAuth] ChatGPT session token saved, user: ${userEmail}`)
                }
            }
            res.json({ success: true, email: userEmail })
        } catch (err: any) {
            res.status(500).json({ error: err.message })
        }
    })

    // ── ChatGPT Session 狀態查詢 ────────────────────────────
    router.get('/oauth/chatgpt/status', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const admin = userService?.users?.find((u: any) => u.role === 'admin')
            const settings = admin ? userService.getUserSettings(admin.id) : null
            res.json({
                isConnected: !!(settings?.oauthConfig?.chatgptAccessToken),
                email: settings?.oauthConfig?.chatgptEmail || ''
            })
        } catch (err: any) {
            res.status(500).json({ error: err.message })
        }
    })

    // ── ChatGPT Session 清除 ────────────────────────────────
    router.post('/oauth/chatgpt/revoke', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            if (userService) {
                const admin = userService.users.find((u: any) => u.role === 'admin')
                if (admin) {
                    const existing = userService.getUserSettings(admin.id) || {}
                    userService.updateUserSettings(admin.id, {
                        ...existing,
                        authMethod: 'api-key',
                        oauthConfig: {
                            ...(existing.oauthConfig || {}),
                            chatgptAccessToken: undefined,
                            chatgptEmail: undefined,
                            chatgptProxyUrl: undefined
                        }
                    })
                }
            }
            res.json({ success: true, message: 'ChatGPT Session 已清除' })
        } catch (err: any) {
            res.status(500).json({ error: err.message })
        }
    })

    return router
}
