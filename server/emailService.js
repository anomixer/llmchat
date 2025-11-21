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

        // 調試日誌
        console.log('EmailService initialized:')
        console.log('  SMTP_HOST:', this.smtpHost)
        console.log('  SMTP_PORT:', this.smtpPort)
        console.log('  SMTP_USER:', this.smtpUser ? 'configured' : 'not set')
        console.log('  FROM_EMAIL:', this.fromEmail)
        console.log('  FROM_NAME:', this.fromName)

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
    async sendVerificationEmail(email, verificationUrl, userName = '', language = 'zh-TW') {
        if (!this.transporter) {
            throw new Error('SMTP not configured')
        }

        try {
            const mailOptions = {
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to: email,
                subject: this.getLocalizedSubject(language),
                html: this.getVerificationEmailTemplate(verificationUrl, userName, language)
            }

            console.log('Sending verification email with from:', mailOptions.from)
            const info = await this.transporter.sendMail(mailOptions)
            console.log('Verification email sent:', info.messageId)
            return true
        } catch (error) {
            console.error('Error sending verification email:', error)
            throw new Error('發送驗證郵件失敗')
        }
    }

    // 獲取本地化郵件主題
    getLocalizedSubject(language) {
        const subjects = {
            'zh-TW': 'LLMChat - 請驗證您的Email地址',
            'zh-CN': 'LLMChat - 请验证您的邮箱地址',
            'en': 'LLMChat - Please verify your email address',
            'ja': 'LLMChat - メールアドレスを確認してください',
            'ko': 'LLMChat - 이메일 주소 확인'
        }
        return subjects[language] || subjects['zh-TW']
    }

    // 驗證email模板
    getVerificationEmailTemplate(verificationUrl, userName = '', language = 'zh-TW') {
        // 語言映射
        const langMap = {
            'zh-TW': {
                greeting: userName ? `您好 ${userName}，` : '您好，',
                title: '歡迎加入 LLMChat！',
                description: '感謝您註冊 LLMChat 帳號。為了確保帳號安全，請點擊下方按鈕驗證您的 Email 地址：',
                buttonText: '驗證 Email 地址',
                alternativeText: '或者，您可以複製以下鏈接並在瀏覽器中開啟：',
                warningTitle: '重要提醒：',
                warningMessage: '此驗證鏈接將在 24 小時後過期。如果鏈接失效，請重新註冊帳號。',
                successMessage: '驗證完成後，您就可以開始使用 LLMChat 與本地 AI 模型對話了！',
                ignoreMessage: '如果您沒有註冊過 LLMChat 帳號，請忽略此郵件。',
                footer: '此郵件由系統自動發送，請勿回覆。',
                pageTitle: 'LLMChat Email驗證'
            },
            'zh-CN': {
                greeting: userName ? `您好 ${userName}，` : '您好，',
                title: '欢迎加入 LLMChat！',
                description: '感谢您注册 LLMChat 账号。为了确保账号安全，请点击下方按钮验证您的邮箱地址：',
                buttonText: '验证邮箱地址',
                alternativeText: '或者，您可以复制以下链接并在浏览器中打开：',
                warningTitle: '重要提醒：',
                warningMessage: '此验证链接将在 24 小时后过期。如果链接失效，请重新注册账号。',
                successMessage: '验证完成后，您就可以开始使用 LLMChat 与本地 AI 模型对话了！',
                ignoreMessage: '如果您没有注册过 LLMChat 账号，请忽略此邮件。',
                footer: '此邮件由系统自动发送，请勿回复。',
                pageTitle: 'LLMChat 邮箱验证'
            },
            'en': {
                greeting: userName ? `Hello ${userName},` : 'Hello,',
                title: 'Welcome to LLMChat!',
                description: 'Thank you for registering an LLMChat account. To ensure account security, please click the button below to verify your email address:',
                buttonText: 'Verify Email Address',
                alternativeText: 'Alternatively, you can copy the following link and open it in your browser:',
                warningTitle: 'Important reminder:',
                warningMessage: 'This verification link will expire in 24 hours. If the link expires, please register again.',
                successMessage: 'After verification, you can start using LLMChat to chat with local AI models!',
                ignoreMessage: 'If you did not register for an LLMChat account, please ignore this email.',
                footer: 'This email was sent automatically, please do not reply.',
                pageTitle: 'LLMChat Email Verification'
            },
            'ja': {
                greeting: userName ? `${userName} 様、` : 'こんにちは、',
                title: 'LLMChatへようこそ！',
                description: 'LLMChatアカウントにご登録いただきありがとうございます。アカウントのセキュリティを確保するため、下のボタンをクリックしてメールアドレスを確認してください：',
                buttonText: 'メールアドレスを確認',
                alternativeText: 'または、以下のリンクをコピーしてブラウザで開くことができます：',
                warningTitle: '重要なお知らせ：',
                warningMessage: 'この確認リンクは24時間後に期限切れになります。リンクが無効になった場合は、再度登録してください。',
                successMessage: '確認が完了したら、ローカルAIモデルとの会話にLLMChatを使い始めることができます！',
                ignoreMessage: 'LLMChatアカウントを登録したことがない場合は、このメールを無視してください。',
                footer: 'このメールは自動送信されています。返信しないでください。',
                pageTitle: 'LLMChat メール確認'
            },
            'ko': {
                greeting: userName ? `${userName} 님、` : '안녕하세요,',
                title: 'LLMChat에 오신 것을 환영합니다!',
                description: 'LLMChat 계정에 등록해 주셔서 감사합니다. 계정 보안을 위해 아래 버튼을 클릭하여 이메일 주소를 확인하세요:',
                buttonText: '이메일 주소 확인',
                alternativeText: '또는 다음 링크를 복사하여 브라우저에서 열 수 있습니다:',
                warningTitle: '중요 알림:',
                warningMessage: '이 확인 링크는 24시간 후에 만료됩니다. 링크가 만료되면 다시 등록하세요.',
                successMessage: '확인 후 로컬 AI 모델과 대화하기 위해 LLMChat을 사용할 수 있습니다!',
                ignoreMessage: 'LLMChat 계정을 등록한 적이 없으면 이 이메일을 무시하세요.',
                footer: '이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.',
                pageTitle: 'LLMChat 이메일 확인'
            }
        }

        const content = langMap[language] || langMap['zh-TW']

        return `
            <!DOCTYPE html>
            <html lang="${language}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${content.pageTitle}</title>
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
                        color: white !important;
                        text-decoration: none;
                        padding: 16px 32px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        text-align: center;
                        margin: 20px 0;
                        box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.3);
                        transition: transform 0.2s ease;
                        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                        border: 1px solid #5a67d8;
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
                        <div class="title">${content.title}</div>
                    </div>

                    <div class="content">
                        <p>${content.greeting}</p>
                        <p>${content.description}</p>

                        <div style="text-align: center;">
                            <a href="${verificationUrl}" class="button">${content.buttonText}</a>
                        </div>

                        <p>${content.alternativeText}</p>
                        <div class="link-text">${verificationUrl}</div>

                        <div class="warning">
                            <strong>${content.warningTitle}</strong>${content.warningMessage}
                        </div>

                        <p>${content.successMessage}</p>
                        <p>${content.ignoreMessage}</p>
                    </div>

                    <div class="footer">
                        <p>${content.footer}</p>
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