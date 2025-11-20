import nodemailer from 'nodemailer'

class EmailService {
    constructor() {
        // 從環境變數獲取SMTP設定
        this.smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
        this.smtpPort = parseInt(process.env.SMTP_PORT) || 587
        this.smtpUser = process.env.SMTP_USER
        this.smtpPass = process.env.SMTP_PASS
        this.fromEmail = process.env.FROM_EMAIL || this.smtpUser
        this.fromName = process.env.FROM_NAME || 'LLMChat'

        // 只有當SMTP設定完整時才創建transporter
        if (this.smtpUser && this.smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: this.smtpHost,
                port: this.smtpPort,
                secure: this.smtpPort === 465, // true for 465, false for other ports
                auth: {
                    user: this.smtpUser,
                    pass: this.smtpPass
                }
            })
        } else {
            this.transporter = null
        }
    }

    // 發送驗證email
    async sendVerificationEmail(email, verificationUrl, userName = '') {
        if (!this.transporter) {
            throw new Error('SMTP not configured')
        }

        try {
            const mailOptions = {
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to: email,
                subject: 'LLMChat - 請驗證您的Email地址',
                html: this.getVerificationEmailTemplate(verificationUrl, userName)
            }

            const info = await this.transporter.sendMail(mailOptions)
            console.log('Verification email sent:', info.messageId)
            return true
        } catch (error) {
            console.error('Error sending verification email:', error)
            throw new Error('發送驗證郵件失敗')
        }
    }

    // 驗證email模板
    getVerificationEmailTemplate(verificationUrl, userName = '') {
        const greeting = userName ? `您好 ${userName}，` : '您好，'

        return `
            <!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>LLMChat Email驗證</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    }
                    .container {
                        background-color: white;
                        border-radius: 12px;
                        padding: 40px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo {
                        font-size: 28px;
                        font-weight: bold;
                        color: #6366f1;
                        margin-bottom: 10px;
                    }
                    .title {
                        font-size: 24px;
                        font-weight: bold;
                        color: #1f2937;
                        margin-bottom: 20px;
                    }
                    .content {
                        margin-bottom: 30px;
                        color: #4b5563;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        padding: 16px 32px;
                        border-radius: 8px;
                        font-weight: 600;
                        text-align: center;
                        margin: 20px 0;
                        box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.3);
                        transition: transform 0.2s ease;
                    }
                    .button:hover {
                        transform: translateY(-2px);
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                        font-size: 14px;
                        color: #6b7280;
                        text-align: center;
                    }
                    .warning {
                        background-color: #fef3c7;
                        border: 1px solid #f59e0b;
                        border-radius: 6px;
                        padding: 16px;
                        margin: 20px 0;
                        color: #92400e;
                    }
                    .link-text {
                        word-break: break-all;
                        background-color: #f3f4f6;
                        padding: 12px;
                        border-radius: 6px;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        margin: 10px 0;
                        border: 1px solid #d1d5db;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">LLMChat</div>
                        <div class="title">歡迎加入 LLMChat！</div>
                    </div>

                    <div class="content">
                        <p>${greeting}</p>
                        <p>感謝您註冊 LLMChat 帳號。為了確保帳號安全，請點擊下方按鈕驗證您的 Email 地址：</p>

                        <div style="text-align: center;">
                            <a href="${verificationUrl}" class="button">驗證 Email 地址</a>
                        </div>

                        <p>或者，您可以複製以下鏈接並在瀏覽器中開啟：</p>
                        <div class="link-text">${verificationUrl}</div>

                        <div class="warning">
                            <strong>重要提醒：</strong>此驗證鏈接將在 24 小時後過期。如果鏈接失效，請重新註冊帳號。
                        </div>

                        <p>驗證完成後，您就可以開始使用 LLMChat 與本地 AI 模型對話了！</p>

                        <p>如果您沒有註冊過 LLMChat 帳號，請忽略此郵件。</p>
                    </div>

                    <div class="footer">
                        <p>此郵件由系統自動發送，請勿回覆。</p>
                        <p>&copy; 2025 LLMChat. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }

    // 測試SMTP連接
    async testConnection() {
        if (!this.transporter) {
            return false
        }

        try {
            await this.transporter.verify()
            console.log('SMTP connection successful')
            return true
        } catch (error) {
            console.error('SMTP connection failed:', error)
            return false
        }
    }
}

export default EmailService