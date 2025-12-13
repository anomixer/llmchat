import type { SupportedLanguage } from '../prompts.js'

export const verificationErrorMessages: Record<SupportedLanguage, { expired: string; invalid: string }> = {
    'zh-TW': {
        expired: '驗證鏈接已過期，請重新註冊帳號',
        invalid: '無效或過期的驗證鏈接'
    },
    'zh-CN': {
        expired: '验证链接已过期，请重新注册账号',
        invalid: '无效或过期的验证链接'
    },
    'en': {
        expired: 'Verification link has expired, please register again',
        invalid: 'Invalid or expired verification link'
    },
    'ja': {
        expired: '確認リンクが期限切れです。もう一度登録してください',
        invalid: '無効または期限切れの確認リンク'
    },
    'ko': {
        expired: '확인 링크가 만료되었습니다. 다시 등록하세요',
        invalid: '유효하지 않거나 만료된 확인 링크'
    }
}

export function getVerificationPageHTML(isSuccess: boolean, errorMessage: string, language: SupportedLanguage, frontendUrl: string) {
    const pageTexts: Record<SupportedLanguage, any> = {
        'zh-TW': {
            successTitle: 'Email 驗證成功！',
            successMessage: '您的帳號已成功啟用。現在您可以登入使用了。',
            successButton: '返回登入頁面',
            errorTitle: 'Email 驗證失敗',
            errorButton: '返回首頁'
        },
        'zh-CN': {
            successTitle: '邮箱验证成功！',
            successMessage: '您的账号已成功启用。现在您可以登录使用了。',
            successButton: '返回登录页面',
            errorTitle: '邮箱验证失败',
            errorButton: '返回首页'
        },
        'en': {
            successTitle: 'Email Verification Successful!',
            successMessage: 'Your account has been successfully activated. You can now log in.',
            successButton: 'Back to Login',
            errorTitle: 'Email Verification Failed',
            errorButton: 'Back to Home'
        },
        'ja': {
            successTitle: 'メール確認成功！',
            successMessage: 'アカウントが正常にアクティブ化されました。今すぐログインできます。',
            successButton: 'ログインページに戻る',
            errorTitle: 'メール確認失敗',
            errorButton: 'ホームに戻る'
        },
        'ko': {
            successTitle: '이메일 확인 성공！',
            successMessage: '계정이 성공적으로 활성화되었습니다. 이제 로그인할 수 있습니다.',
            successButton: '로그인 페이지로 돌아가기',
            errorTitle: '이메일 확인 실패',
            errorButton: '홈으로 돌아가기'
        }
    }

    const texts = pageTexts[language] || pageTexts['zh-TW']
    const title = isSuccess ? texts.successTitle : texts.errorTitle
    const message = isSuccess ? texts.successMessage : errorMessage
    const buttonText = isSuccess ? texts.successButton : texts.errorButton
    const iconSvg = isSuccess ? '✓' : '✕'
    const iconColor = isSuccess ? '#10b981' : '#ef4444'

    return `
        <!DOCTYPE html>
        <html lang="${language}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    border-radius: 12px;
                    padding: 2rem;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                .icon {
                    color: ${iconColor};
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    color: #1f2937;
                    margin-bottom: 1rem;
                }
                p {
                    color: #6b7280;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }
                .btn {
                    display: inline-block;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 500;
                    transition: background-color 0.2s;
                    cursor: pointer;
                }
                .btn:hover {
                    background: #2563eb;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">${iconSvg}</div>
                <h1>${title}</h1>
                <p>${message}</p>
                <a href="${frontendUrl}?lang=${language}" class="btn">${buttonText}</a>
            </div>
        </body>
        </html>
    `
}
