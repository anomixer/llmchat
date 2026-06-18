import fs from 'fs'

// 1. Fix Admin.tsx
let adminContent = fs.readFileSync('src/components/Admin.tsx', 'utf8')

// Remove GitHub Copilot OAuth option from select
adminContent = adminContent.replace(/\{\(selectedProvider === 'github-copilot' \|\| selectedProvider === 'custom'\) && \(\s*<option value="github-copilot-oauth">\{t\('admin\.llm\.authGitHub', '🐙 GitHub Copilot 帳號授權 \(GitHub OAuth\)'\)\}<\/option>\s*\)\}/, '')

// Remove GitHub Copilot PAT input field
adminContent = adminContent.replace(/\{providerAuthMethod === 'github-copilot-oauth' && \(\s*<div>\s*<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GitHub Personal Access Token \(ghp_\.\.\.\)<\/label>\s*<input type="password" value=\{providerOauthConfig\.githubToken\}\s*onChange=\{\(e\) => handleOauthConfigChange\('githubToken', e\.target\.value\)\}\s*className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"\s*placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \/>\s*<\/div>\s*\)\}/, '')

fs.writeFileSync('src/components/Admin.tsx', adminContent)

// 2. Add admin.addUser to locales
const locales = ['en', 'zh-TW', 'zh-CN', 'ja', 'ko']
const translations = {
  en: "Add User",
  'zh-TW': "新增用戶",
  'zh-CN': "新增用户",
  ja: "ユーザー追加",
  ko: "사용자 추가"
}

locales.forEach(lang => {
  const filePath = 'src/locales/' + lang + '.json'
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!data.admin) data.admin = {}
    data.admin.addUser = translations[lang]
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  }
})

console.log('Fixed Admin.tsx and locales')
