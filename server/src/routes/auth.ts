import { Router, type Request, type Response } from 'express'
import type UserService from '../services/userService.js'
import type EmailService from '../services/emailService.js'
import { normalizeLanguage } from '../prompts.js'
import { getVerificationPageHTML, verificationErrorMessages } from '../templates/verificationPage.js'
import { authenticateToken, type AuthedRequest } from '../middlewares/authenticateToken.js'

export function createAuthRouter(deps: { userService: UserService; emailService: EmailService }) {
    const { userService, emailService } = deps
    const router = Router()

    // 用戶註冊
    router.post('/auth/register', async (req: Request, res: Response) => {
        try {
            const { email, password, language } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email 和密碼不能為空' })
            }

            // 簡單的 email 格式驗證
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: '請輸入有效的 Email 地址' })
            }

            if (password.length < 6) {
                return res.status(400).json({ error: '密碼至少6個字符' })
            }

            const userLanguage = normalizeLanguage(language)
            const user = await userService.register(email, password, userLanguage)

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const verificationUrl = `${frontendUrl}/api/auth/verify-email/${user.emailVerificationToken}?lang=${userLanguage}`

            let emailSent = false
            if (user.emailVerificationToken && (emailService as any).transporter) {
                try {
                    await emailService.sendVerificationEmail(email, verificationUrl, user.email.split('@')[0], userLanguage)
                    emailSent = true
                    console.log('Verification email sent to:', email)
                } catch (emailError) {
                    console.error('Failed to send verification email:', emailError)
                }
            } else {
                console.log('Skipped verification email (user automatically verified or SMTP not configured).')
            }

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt
                },
                verificationUrl,
                emailSent
            })
        } catch (error: any) {
            console.error('Registration error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    // 用戶登入
    router.post('/auth/login', async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email 和密碼不能為空' })
            }

            const result = await userService.login(email, password)
            res.json(result)
        } catch (error: any) {
            console.error('Login error:', error)
            res.status(401).json({ error: error.message })
        }
    })

    // 用戶登出
    router.post('/auth/logout', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            userService.logout(token)
            res.json({ message: '登出成功' })
        } catch (error) {
            console.error('Logout error:', error)
            res.status(500).json({ error: '登出失敗' })
        }
    })

    // 驗證會話
    router.get('/auth/verify', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        res.json({ user: req.user })
    })

    // Email 驗證
    router.get('/auth/verify-email/:token', (req: Request, res: Response) => {
        try {
            const { token } = req.params
            const language = normalizeLanguage(req.query.lang)

            userService.verifyEmail(token)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const html = getVerificationPageHTML(true, '', language, frontendUrl)

            res.set('Content-Type', 'text/html; charset=utf-8')
            res.send(html)

        } catch (error: any) {
            console.error('Email verification error:', error)

            const language = normalizeLanguage(req.query.lang)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

            let errorMessage = verificationErrorMessages[language].invalid
            if (typeof error.message === 'string' && (error.message.includes('過期') || error.message.includes('过期'))) {
                errorMessage = verificationErrorMessages[language].expired
            }

            const html = getVerificationPageHTML(false, errorMessage, language, frontendUrl)

            res.status(400)
            res.set('Content-Type', 'text/html; charset=utf-8')
            res.send(html)
        }
    })

    // 重新發送驗證 Email
    router.post('/auth/resend-verification', async (req: Request, res: Response) => {
        try {
            const { email, language } = req.body

            if (!email) {
                return res.status(400).json({ error: '請提供 Email 地址' })
            }

            const user = userService.users.find((u) => u.email === email)
            const userLanguage = normalizeLanguage(language || user?.settings?.language)

            const token = userService.resendVerificationEmail(email)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const verificationUrl = `${frontendUrl}/api/auth/verify-email/${token}?lang=${userLanguage}`

            let emailSent = false
            try {
                await emailService.sendVerificationEmail(email, verificationUrl, email.split('@')[0], userLanguage)
                emailSent = true
                console.log('Resend verification email sent to:', email)
            } catch (emailError) {
                console.error('Failed to resend verification email:', emailError)
            }

            res.json({
                message: emailSent ? '驗證郵件已重新發送' : '驗證鏈接已重新生成',
                verificationUrl,
                emailSent
            })
        } catch (error: any) {
            console.error('Resend verification error:', error)
            res.status(400).json({ error: error.message })
        }
    })

    // Google OAuth 授權重定向
    router.get('/auth/google', authenticateToken(userService), (req: AuthedRequest, res: Response) => {
        try {
            const clientId = process.env.GOOGLE_CLIENT_ID
            if (!clientId) {
                return res.status(400).send('<h1>系統未配置 GOOGLE_CLIENT_ID 環境變數</h1>')
            }

            const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`
            const userId = req.user?.id || ''
            
            const scopes = [
                'https://www.googleapis.com/auth/generative-language',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
            ]
            
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
                `client_id=${encodeURIComponent(clientId)}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&response_type=code` +
                `&scope=${encodeURIComponent(scopes.join(' '))}` +
                `&state=${encodeURIComponent(userId)}` +
                `&access_type=offline` +
                `&prompt=consent`

            res.redirect(googleAuthUrl)
        } catch (error: any) {
            console.error('Google Auth Redirect Error:', error)
            res.status(500).send(`授權重定向失敗: ${error.message}`)
        }
    })

    // Google OAuth 回調
    router.get('/auth/google/callback', async (req: Request, res: Response) => {
        try {
            const { code, state: userId } = req.query as { code?: string; state?: string }
            if (!code) {
                return res.status(400).send('<h1>授權失敗：未傳回授權碼</h1>')
            }
            if (!userId) {
                return res.status(400).send('<h1>授權失敗：遺失 state (使用者 ID) 參數</h1>')
            }

            const clientId = process.env.GOOGLE_CLIENT_ID
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET
            if (!clientId || !clientSecret) {
                return res.status(400).send('<h1>系統未配置 GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET</h1>')
            }

            const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`

            const axios = (await import('axios')).default
            const params = new URLSearchParams()
            params.append('code', code)
            params.append('client_id', clientId)
            params.append('client_secret', clientSecret)
            params.append('redirect_uri', redirectUri)
            params.append('grant_type', 'authorization_code')

            const response = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })

            const refreshToken = response.data.refresh_token
            if (!refreshToken) {
                console.error('Google OAuth 回調：未傳回 refresh_token。')
                return res.status(400).send('<h1>授權失敗：未取得 refresh_token。請在 Google 同意畫面中重新授權。</h1>')
            }

            const userSettings = userService.getUserSettings(userId)
            if (userSettings) {
                const oauthConfig = userSettings.oauthConfig || {}
                oauthConfig.googleUserRefreshToken = refreshToken
                userService.updateUserSettings(userId, {
                    oauthConfig
                })
            }

            res.send(`
                <html>
                    <body>
                        <script>
                            window.opener && window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                            window.close();
                        </script>
                        <h1>Google 帳號授權成功！本視窗將自動關閉。</h1>
                    </body>
                </html>
            `)
        } catch (error: any) {
            console.error('Google OAuth Callback Error:', error.response?.data || error.message)
            res.status(500).send(`<h1>授權處理失敗: ${error.message}</h1>`)
        }
    })

    // 匯入本機 gcloud 憑證
    router.post('/auth/google/import-adc', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const fs = await import('fs')
            const path = await import('path')
            const os = await import('os')

            let adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || ''
            
            if (!adcPath || !fs.existsSync(adcPath)) {
                const homeDir = os.homedir()
                if (process.platform === 'win32') {
                    adcPath = path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json')
                } else {
                    adcPath = path.join(homeDir, '.config', 'gcloud', 'application_default_credentials.json')
                }
            }

            if (!fs.existsSync(adcPath)) {
                return res.status(404).json({
                    error: `未找到本機 gcloud 憑證檔案 (預期路徑: ${adcPath})。請確保您已安裝 Google Cloud SDK 並在終端機執行過 'gcloud auth application-default login'。`
                })
            }

            const fileContent = fs.readFileSync(adcPath, 'utf8')
            const creds = JSON.parse(fileContent)

            if (!creds.client_id || !creds.client_secret || !creds.refresh_token) {
                return res.status(400).json({
                    error: '本機 gcloud 憑證格式不符合（缺少 client_id、client_secret 或 refresh_token）。'
                })
            }

            const userId = req.user?.id || ''
            const userSettings = userService.getUserSettings(userId)
            if (userSettings) {
                const oauthConfig = userSettings.oauthConfig || {}
                oauthConfig.googleUserClientId = creds.client_id
                oauthConfig.googleUserClientSecret = creds.client_secret
                oauthConfig.googleUserRefreshToken = creds.refresh_token
                
                userService.updateUserSettings(userId, {
                    oauthConfig
                })
            }

            res.json({
                success: true,
                message: '成功從本機匯入 gcloud 憑證！'
            })
        } catch (error: any) {
            console.error('匯入 gcloud ADC 失敗:', error)
            res.status(500).json({ error: `匯入憑證失敗: ${error.message}` })
        }
    })

    // ChatGPT 網頁版登入彈窗頁面（無需 API Key，自動從帳密取得 Access Token）
    router.get('/auth/chatgpt/popup', (req: Request, res: Response) => {
        const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>連結 ChatGPT 帳號</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #e2e8f0; }
  .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2.5rem; width: 420px; max-width: 95vw; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
  .logo { text-align: center; margin-bottom: 1.5rem; }
  .logo-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #10a37f, #1a7f64); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.8rem; margin-bottom: 0.75rem; box-shadow: 0 8px 24px rgba(16,163,127,0.3); }
  h1 { font-size: 1.3rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.25rem; }
  .subtitle { font-size: 0.8rem; color: #94a3b8; }
  .tabs { display: flex; gap: 0.5rem; margin: 1.5rem 0 1rem; background: rgba(0,0,0,0.2); border-radius: 10px; padding: 4px; }
  .tab { flex: 1; padding: 0.5rem; text-align: center; border-radius: 8px; cursor: pointer; font-size: 0.82rem; color: #94a3b8; transition: all 0.2s; border: none; background: none; }
  .tab.active { background: rgba(16,163,127,0.2); color: #10a37f; font-weight: 600; border: 1px solid rgba(16,163,127,0.3); }
  .panel { display: none; }
  .panel.active { display: block; }
  label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.4rem; font-weight: 500; }
  input { width: 100%; padding: 0.65rem 0.85rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #f1f5f9; font-size: 0.9rem; outline: none; transition: border-color 0.2s; margin-bottom: 1rem; }
  input:focus { border-color: #10a37f; box-shadow: 0 0 0 3px rgba(16,163,127,0.15); }
  .btn { width: 100%; padding: 0.75rem; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-primary { background: linear-gradient(135deg, #10a37f, #1a7f64); color: white; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(16,163,127,0.3); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-secondary { background: rgba(255,255,255,0.07); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); margin-top: 0.75rem; }
  .btn-secondary:hover { background: rgba(255,255,255,0.12); }
  .alert { padding: 0.85rem; border-radius: 10px; font-size: 0.82rem; margin-bottom: 1rem; line-height: 1.5; }
  .alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; }
  .alert-success { background: rgba(16,163,127,0.1); border: 1px solid rgba(16,163,127,0.3); color: #6ee7b7; }
  .alert-info { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #a5b4fc; }
  .step { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.85rem; }
  .step-num { width: 24px; height: 24px; min-width: 24px; background: rgba(16,163,127,0.2); border: 1px solid rgba(16,163,127,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #10a37f; }
  .step-text { font-size: 0.82rem; color: #cbd5e1; line-height: 1.5; }
  code { background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.78rem; color: #86efac; word-break: break-all; }
  .divider { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; color: #475569; font-size: 0.78rem; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .note { font-size: 0.75rem; color: #64748b; margin-top: 0.5rem; line-height: 1.5; }
  textarea { width: 100%; padding: 0.65rem 0.85rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #f1f5f9; font-size: 0.82rem; font-family: monospace; outline: none; transition: border-color 0.2s; margin-bottom: 1rem; resize: vertical; }
  textarea:focus { border-color: #10a37f; box-shadow: 0 0 0 3px rgba(16,163,127,0.15); }
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-icon">💬</div>
    <h1>連結 ChatGPT 帳號</h1>
    <p class="subtitle">無需 API Key，使用 ChatGPT 網頁版 Session</p>
  </div>

  <div class="tabs">
    <button class="tab active" onclick="switchTab('auto')">🤖 自動登入</button>
    <button class="tab" onclick="switchTab('manual')">📋 手動貼上 Token</button>
  </div>

  <!-- 自動登入面板 -->
  <div id="panel-auto" class="panel active">
    <div id="alert-auto"></div>
    <div>
      <label>ChatGPT 帳號 (Email)</label>
      <input type="email" id="email" placeholder="your@email.com" autocomplete="email" />
      <label>密碼</label>
      <input type="password" id="password" placeholder="••••••••" autocomplete="current-password" />
      <button class="btn btn-primary" id="btn-login" onclick="doLogin()">
        🔑 登入並取得 Token
      </button>
      <p class="note" style="margin-top:0.75rem;">⚠️ 注意：此功能需要您的帳號未開啟兩步驟驗證（2FA），且 OpenAI 伺服器未啟用 Cloudflare 防護時才可使用。若登入失敗，請改用「手動貼上 Token」頁籤。</p>
    </div>
  </div>

  <!-- 手動面板 -->
  <div id="panel-manual" class="panel">
    <div class="alert alert-info" style="margin-bottom:1rem;">
      📖 請依照以下步驟手動取得您的 ChatGPT Access Token：
    </div>
    <div class="step">
      <span class="step-num">1</span>
      <span class="step-text">在瀏覽器中登入 <a href="https://chat.openai.com" target="_blank" style="color:#10a37f;">chat.openai.com</a></span>
    </div>
    <div class="step">
      <span class="step-num">2</span>
      <span class="step-text">登入後，在同一瀏覽器新開分頁，前往：<br><code>https://chat.openai.com/api/auth/session</code></span>
    </div>
    <div class="step">
      <span class="step-num">3</span>
      <span class="step-text">複製頁面中 <code>"accessToken"</code> 的值（一段很長的字串）</span>
    </div>
    <div class="step">
      <span class="step-num">4</span>
      <span class="step-text">貼到下方文字框，然後點擊「確認連結」</span>
    </div>

    <div id="alert-manual"></div>

    <textarea id="manual-token" rows="4" placeholder="貼上 accessToken 值（通常以 eyJ 開頭）..."></textarea>
    <button class="btn btn-primary" onclick="submitManualToken()">✅ 確認連結</button>
    <button class="btn btn-secondary" onclick="openSessionPage()">🔗 開啟 Session 頁面</button>
  </div>
</div>

<script>
  const params = new URLSearchParams(window.location.search);
  const adminToken = params.get('token') || '';
  const proxyUrl = params.get('proxyUrl') || 'https://ai.fakeopen.com/api';

  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'auto') || (i === 1 && tab === 'manual')));
    document.getElementById('panel-auto').classList.toggle('active', tab === 'auto');
    document.getElementById('panel-manual').classList.toggle('active', tab === 'manual');
  }

  function showAlert(containerId, type, msg) {
    const el = document.getElementById(containerId);
    el.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
  }

  function clearAlert(containerId) {
    document.getElementById(containerId).innerHTML = '';
  }

  async function doLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) { showAlert('alert-auto', 'error', '請填寫 Email 和密碼'); return; }

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>登入中，請稍候...';
    clearAlert('alert-auto');

    try {
      const res = await fetch('/api/auth/chatgpt/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.accessToken) {
        showAlert('alert-auto', 'success', '✅ 登入成功！正在儲存 Token...');
        await saveToken(data.accessToken, data.proxyUrl || proxyUrl);
      } else {
        showAlert('alert-auto', 'error', '❌ ' + (data.error || '登入失敗，請嘗試「手動貼上 Token」頁籤'));
      }
    } catch(e) {
      showAlert('alert-auto', 'error', '❌ 連線錯誤：' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔑 登入並取得 Token';
    }
  }

  async function submitManualToken() {
    const token = document.getElementById('manual-token').value.trim();
    if (!token || !token.startsWith('eyJ')) {
      showAlert('alert-manual', 'error', '請貼上有效的 Access Token（應以 eyJ 開頭）');
      return;
    }
    clearAlert('alert-manual');
    await saveToken(token, proxyUrl);
  }

  async function saveToken(accessToken, pUrl) {
    try {
      const res = await fetch('/api/auth/chatgpt/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ accessToken, proxyUrl: pUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (window.opener) {
          window.opener.postMessage({ type: 'CHATGPT_AUTH_SUCCESS', accessToken, proxyUrl: pUrl }, '*');
          setTimeout(() => window.close(), 1200);
        }
      } else {
        showAlert('alert-auto', 'error', '❌ 儲存失敗：' + (data.error || '未知錯誤'));
        showAlert('alert-manual', 'error', '❌ 儲存失敗：' + (data.error || '未知錯誤'));
      }
    } catch(e) {
      showAlert('alert-auto', 'error', '❌ ' + e.message);
    }
  }

  function openSessionPage() {
    window.open('https://chat.openai.com/api/auth/session', '_blank');
  }
</script>
</body>
</html>`
        res.set('Content-Type', 'text/html; charset=utf-8')
        res.send(html)
    })

    // ChatGPT 自動登入（嘗試透過 auth0 取得 access token）
    router.post('/auth/chatgpt/login', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { email, password } = req.body
            if (!email || !password) {
                return res.status(400).json({ error: '請提供 Email 和密碼' })
            }

            const axios = (await import('axios')).default

            // Step 1: Get CSRF token from auth0
            const csrfRes = await axios.get('https://auth0.openai.com/auth/login', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://chat.openai.com/',
                },
                withCredentials: true,
                maxRedirects: 10,
                validateStatus: () => true,
                timeout: 20000,
            })

            const cookies = (csrfRes.headers['set-cookie'] || []).join('; ')

            // Step 2: Initiate auth0 authorize flow
            const authorizeRes = await axios.get('https://auth0.openai.com/authorize', {
                params: {
                    client_id: 'pdlLIX2Y72MIl2rhLhTE9VV9bN905kBh',
                    audience: 'https://api.openai.com/v1',
                    redirect_uri: 'https://chat.openai.com/auth/callback',
                    scope: 'openid email profile offline_access model.request model.read organization.read organization.write',
                    response_type: 'code',
                    code_challenge_method: 'S256',
                    code_challenge: 'Y8m6NJu5R1UWCTa4LxMbnMBW4P4YBdBsFbfyJMt9OXI',
                    state: 'YWxpZ25tZW50',
                    nonce: 'YWxpZ25tZW50'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Cookie': cookies,
                    'Referer': 'https://chat.openai.com/',
                },
                withCredentials: true,
                maxRedirects: 10,
                validateStatus: () => true,
                timeout: 20000,
            })

            // Extract state from redirect URL
            const locationUrl = authorizeRes.headers['location'] || ''
            const stateMatch = locationUrl.match(/state=([^&]+)/)
            const state = stateMatch ? stateMatch[1] : 'YWxpZ25tZW50'
            const allCookies = [cookies, (authorizeRes.headers['set-cookie'] || []).join('; ')].join('; ')

            // Step 3: POST credentials to auth0 username/password
            const loginRes = await axios.post('https://auth0.openai.com/u/login/identifier', 
                new URLSearchParams({ 
                    state,
                    username: email,
                    'js-available': 'false',
                    'webauthn-available': 'false',
                    'is-brave': 'false',
                    'webauthn-platform-available': 'false',
                    action: 'default'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Cookie': allCookies,
                        'Referer': `https://auth0.openai.com/u/login/identifier?state=${state}`,
                        'Origin': 'https://auth0.openai.com'
                    },
                    withCredentials: true,
                    maxRedirects: 5,
                    validateStatus: () => true,
                    timeout: 20000,
                }
            )

            const loginCookies = [allCookies, (loginRes.headers['set-cookie'] || []).join('; ')].join('; ')
            const loginState2 = (() => { const m = (loginRes.headers['location'] || '').match(/state=([^&]+)/); return m ? m[1] : state; })()

            // Step 4: POST password
            const passRes = await axios.post('https://auth0.openai.com/u/login/password',
                new URLSearchParams({
                    state: loginState2,
                    username: email,
                    password,
                    action: 'default'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Cookie': loginCookies,
                        'Referer': `https://auth0.openai.com/u/login/password?state=${loginState2}`,
                        'Origin': 'https://auth0.openai.com'
                    },
                    withCredentials: true,
                    maxRedirects: 0,
                    validateStatus: () => true,
                    timeout: 20000,
                }
            )

            const passLocation = passRes.headers['location'] || ''
            if (!passLocation.includes('callback') && !passLocation.includes('code=')) {
                return res.status(401).json({ 
                    error: '帳號或密碼錯誤，或帳號已開啟 2FA/SSO 驗證（此方式不支援）。請改用「手動貼上 Token」方式。' 
                })
            }

            const passCookies = [loginCookies, (passRes.headers['set-cookie'] || []).join('; ')].join('; ')

            // Step 5: Follow callback redirect to get auth code
            const callbackRes = await axios.get(passLocation.startsWith('http') ? passLocation : `https://auth0.openai.com${passLocation}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Cookie': passCookies,
                    },
                    withCredentials: true,
                    maxRedirects: 10,
                    validateStatus: () => true,
                    timeout: 20000,
                }
            )

            // Step 6: Get the session token from chat.openai.com
            const callbackCookies = [passCookies, (callbackRes.headers['set-cookie'] || []).join('; ')].join('; ')
            const sessionRes = await axios.get('https://chat.openai.com/api/auth/session',
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Cookie': callbackCookies,
                        'Referer': 'https://chat.openai.com/',
                    },
                    validateStatus: () => true,
                    timeout: 20000,
                }
            )

            const sessionData = sessionRes.data
            if (!sessionData || !sessionData.accessToken) {
                return res.status(401).json({ 
                    error: '無法取得 ChatGPT Access Token。可能是帳號需要人機驗證，或 OpenAI 伺服器已封鎖此登入方式。請改用「手動貼上 Token」。' 
                })
            }

            res.json({ 
                success: true, 
                accessToken: sessionData.accessToken,
                email: sessionData.user?.email,
                proxyUrl: 'https://ai.fakeopen.com/api'
            })

        } catch (error: any) {
            console.error('ChatGPT auto-login error:', error.message)
            res.status(500).json({ 
                error: '自動登入失敗：' + (error.response?.data?.message || error.message) + '。請改用「手動貼上 Token」方式。' 
            })
        }
    })

    // ChatGPT 儲存 Access Token
    router.post('/auth/chatgpt/save-token', authenticateToken(userService), async (req: AuthedRequest, res: Response) => {
        try {
            const { accessToken, proxyUrl } = req.body
            if (!accessToken) {
                return res.status(400).json({ error: '請提供 Access Token' })
            }

            const userId = req.user?.id || ''
            const userSettings = userService.getUserSettings(userId)
            if (userSettings) {
                const oauthConfig = userSettings.oauthConfig || {}
                oauthConfig.chatgptAccessToken = accessToken
                if (proxyUrl) oauthConfig.chatgptProxyUrl = proxyUrl
                userService.updateUserSettings(userId, { oauthConfig })
            }

            res.json({ success: true, message: 'ChatGPT Access Token 已儲存' })
        } catch (error: any) {
            console.error('Save ChatGPT token error:', error)
            res.status(500).json({ error: '儲存失敗：' + error.message })
        }
    })

    return router
}
