/**
 * oauthService.js
 * 負責 Google OAuth2 授權流程與 ChatGPT session token 的儲存/驗證。
 * 所有憑證都存在記憶體 Map（userOAuthTokens），重啟後清空——
 * 若需持久化請改寫 get/setUserOAuthData 改為資料庫存取。
 */

import fetch from 'node-fetch'

// userId -> { google?: { accessToken, refreshToken, email, expiresAt }, chatgpt?: { sessionToken, email, connectedAt } }
const userOAuthTokens = new Map()

// ─── Google OAuth2 ──────────────────────────────────────────────────────────────────

/**
 * 產生 Google OAuth 授權 URL，並帶上 state=userId 以便 callback 識別使用者。
 * prompt: 'select_account consent' 強制每次都顯示帳號選擇畫面，避免瀏覽器自動帶入上次的帳號。
 */
export function buildGoogleAuthUrl(userId) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) throw new Error('缺少環境變數 GOOGLE_CLIENT_ID')

    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/oauth/google/callback`

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account consent',
        state: userId,
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/**
 * 用 authorization_code 換取 access_token / refresh_token，
 * 再拿 userinfo 取得 email，最後存入記憶體。
 */
export async function exchangeGoogleCode({ code, userId }) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/oauth/google/callback`

    if (!clientId || !clientSecret) {
        throw new Error('缺少環境變數 GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET')
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    })

    if (!tokenRes.ok) {
        const err = await tokenRes.text()
        throw new Error(`Google token exchange failed: ${err}`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
    })
    const userInfo = await userInfoRes.json()

    const record = {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        email: userInfo.email,
        expiresAt: Date.now() + (expires_in || 3600) * 1000,
        connectedAt: new Date().toISOString(),
    }

    const existing = userOAuthTokens.get(userId) || {}
    userOAuthTokens.set(userId, { ...existing, google: record })

    return { email: record.email }
}

/** 取得使用者的 Google 連線狀態（不回傳 token） */
export function getGoogleStatus(userId) {
    const data = (userOAuthTokens.get(userId) || {}).google
    if (!data) return { connected: false }
    const expired = data.expiresAt && Date.now() > data.expiresAt
    return {
        connected: !expired,
        email: data.email,
        connectedAt: data.connectedAt,
        expired,
    }
}

/** 撤銷 Google 授權（呼叫 Google revoke endpoint + 清除本地資料） */
export async function revokeGoogle(userId) {
    const data = (userOAuthTokens.get(userId) || {}).google
    if (data?.accessToken) {
        try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${data.accessToken}`, {
                method: 'POST',
            })
        } catch (_) { /* 忽略 revoke 失敗，本地仍清除 */ }
    }
    const existing = userOAuthTokens.get(userId) || {}
    delete existing.google
    userOAuthTokens.set(userId, existing)
}

// ─── ChatGPT Session Token ──────────────────────────────────────────────────────────

export async function saveChatGPTSession({ userId, sessionToken }) {
    if (!sessionToken || sessionToken.trim().length < 20) {
        throw new Error('Session token 格式不正確')
    }

    let email = null
    try {
        const res = await fetch('https://chatgpt.com/api/auth/session', {
            headers: {
                'Cookie': `__Secure-next-auth.session-token=${sessionToken.trim()}`,
                'User-Agent': 'Mozilla/5.0',
            },
        })
        if (res.ok) {
            const json = await res.json()
            email = json?.user?.email || null
        }
    } catch (_) { /* 驗證失敗不擋，允許手動輸入 */ }

    const record = {
        sessionToken: sessionToken.trim(),
        email,
        connectedAt: new Date().toISOString(),
    }

    const existing = userOAuthTokens.get(userId) || {}
    userOAuthTokens.set(userId, { ...existing, chatgpt: record })

    return { email }
}

export function getChatGPTStatus(userId) {
    const data = (userOAuthTokens.get(userId) || {}).chatgpt
    if (!data) return { connected: false }
    return {
        connected: true,
        email: data.email,
        connectedAt: data.connectedAt,
    }
}

export function getChatGPTSessionToken(userId) {
    return (userOAuthTokens.get(userId) || {}).chatgpt?.sessionToken || null
}

export function revokeChatGPT(userId) {
    const existing = userOAuthTokens.get(userId) || {}
    delete existing.chatgpt
    userOAuthTokens.set(userId, existing)
}
