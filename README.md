# LLMChat

Get up and chatting with large language models featuring glass-morphism effect.

一個具有玻璃擬態設計的現代化本地大語言模型聊天應用程式，基於 React + Node.js + Ollama，提供美觀且功能完整的聊天體驗。適合各企業建構在地AI聊天應用，數據不怕外流給雲端廠商。

## 🌟 功能特色

- **玻璃擬態設計**: 現代化的玻璃擬態視覺效果，搭配主題適應的漸層背景（亮色模式藍色，暗色模式紫色），提供沉浸式聊天體驗
- **現代化聊天介面**: 類似 ChatGPT 的設計，上方顯示對話內容，下方有輸入框和設定區域
- **多語言支援**: 支援繁體中文、簡體中文、英文、日文、韓文五種語言，自動檢測瀏覽器語言並提供下拉式語言切換器
- **全螢幕模式**: 支援一鍵切換全螢幕聊天體驗，移除邊框和間距，最大化利用螢幕空間
- **模型狀態顯示**: 標題欄顯示當前使用的 AI 模型，點擊可快速開啟設定
- **靈活設定**: 可調整模型、溫度、Token 數量等參數
- **多對話管理**: 支援創建、切換和刪除多個獨立對話
- **導出對話記錄**: 支援導出為JSON和Markdown格式，點擊外部可自動收合導出菜單
- **即時對話**: 支援與本地 Ollama 模型進行即時對話
- **對話歷史持久化**: 自動保存對話記錄到本地儲存
- **個人化體驗**: 每個用戶擁有獨立的對話歷史和個人設定，登入後自動恢復之前的聊天記錄和偏好設定
- **檔案上傳功能**: 支援上傳文件並以小字顯示檔名，可收合展開，提供對話上下文
  - **支援格式**: 圖片檔案 (image/*)、文字檔案 (text/*)、PDF 檔案、JSON 檔案
  - **檔案大小限制**: 最大 50MB
  - **PDF檔案說明**: PDF檔案會顯示檔案名稱，但內容無法在瀏覽器中直接解析。如需分析PDF內容，建議先將PDF轉換為文字檔案
  - **無訊息長度限制**: 現代LLM模型能處理長輸入，無需人工限制訊息長度
- **語音輸入/輸出**: 支援語音輸入和文字轉語音功能，根據當前語言自動切換語音識別和合成語言
- **語音隊列系統**: 實現智能語音隊列管理，多個語音請求會按順序播放，避免互相中斷，支援跳過和清除隊列功能
- **實時串流回應**: 以實時串流顯示AI回應，提供類似打字機的效果，自動滾動跟隨最新內容
- **串流中斷控制**: 在實時生成過程中，用戶可以安全中斷回應，避免意外長回應，支持兩次點擊確認機制，前後端同時停止確保完全中斷
- **思考過程顯示**: 支援顯示AI的思考過程，可收合展開，支援實時流式顯示
- **Markdown 支援**: 完整的 Markdown 語法支援，包括程式碼高亮和格式化顯示
- **智能滾動控制**: 訊息串流時自動下捲，用戶在生成過程中往上滾動會禁用自動下捲，生成完成後滾動到距離底部2%範圍內會重新啟用自動下捲。首次開啟app或開啟新對話時都會自動啟用滾動功能
- **程式碼複製功能**: Markdown 中的程式碼區塊提供一鍵複製按鈕，方便使用
- **暗色主題**: 完整的暗色主題支援，主題偏好自動保存
- **鍵盤快捷鍵**: 支援多種快捷鍵操作，提升使用效率
- **響應式設計**: 支援桌面和移動裝置
- **清除功能**: 一鍵清除對話記錄
- **錯誤處理**: 完善的錯誤提示和處理機制
- **用戶認證系統**: 安全的用戶註冊和登入，首位註冊者自動成為管理員，每個用戶的對話記錄完全獨立
- **Email 驗證系統**: 完整的郵件驗證流程，註冊後需驗證Email才能登入，驗證鏈接24小時有效，支援多語言郵件
- **智能SMTP控制**: 實時檢查SMTP配置狀態，動態顯示/隱藏註冊功能，無效配置時顯示友好提示
- **管理員功能**: 管理員可以查看所有用戶、管理用戶帳戶、啟用/禁用用戶帳戶
- **智能主題適應**: 自動跟隨瀏覽器明暗模式設定，用戶也可手動切換主題
- **登入畫面多語言**: 登入/註冊畫面支援多語言切換，自動檢測瀏覽器語言
- **分檔對話儲存**: 每個用戶的對話記錄單獨存檔為 {email}.json，提供更好的數據隔離和備份便利性
- **個人設定系統**: 用戶可保存個人化的語言、主題、AI 模型參數等設定
- **密碼管理**: 用戶可以在設定中安全地更改密碼，包含當前密碼驗證和新密碼確認機制

## ⌨️ 快捷鍵支援

應用程式支援以下鍵盤快捷鍵，提升操作效率：

- **Ctrl/Cmd + I**: 創建新對話
- **Ctrl/Cmd + K**: 清除當前對話內容
- **Ctrl/Cmd + ,**: 開啟/關閉設定面板
- **Ctrl/Cmd + B**: 開啟/關閉對話列表面板
- **Escape**: 關閉所有開啟的面板
- **Enter**: 發送消息（Shift + Enter 換行）

## 🏗️ 技術架構

### 前端
- **React 18** - 使用 Hooks 和現代 React 功能
- **TypeScript** - 提供型別安全
- **Tailwind CSS** - 快速樣式開發
- **Vite** - 快速建構工具
- **Lucide React** - 現代化圖示庫
- **React i18next** - 完整的國際化支援，提供多語言切換功能

### 後端
- **Node.js + Express** - API 伺服器
- **Ollama SDK** - 本地 LLM 整合
- **Nodemailer** - Email 發送服務
- **CORS** - 跨域資源分享
- **Axios** - HTTP 客戶端

## 📋 系統需求

- **Node.js** 18.0.0 或更高版本
- **NPM** 8.0.0 或更高版本
- **Ollama** - 本地大語言模型執行環境

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

> **注意**: 如果遇到依賴安裝問題，請嘗試：
> ```bash
> npm install --legacy-peer-deps
> ```

### 2. 啟動 Ollama

確保您的系統已安裝並啟動 Ollama：

```bash
# 啟動 Ollama 服務（通常自動啟動）
ollama serve

# 檢查 Ollama 狀態
ollama list
```

### 3. 安裝模型（可選）

```bash
# 下載常用模型
ollama pull llama3:8b
ollama pull codellama:7b
ollama pull mistral:7b
ollama pull gemma3:4b
```

### 4. 啟動應用程式

```bash
# 同時啟動前端和後端
npm run dev

# 或者分別啟動
# 終端 1 - 啟動後端
npm run server

# 終端 2 - 啟動前端
npm run client
```

> **後端入口**: 後端目前以 `server/src/start.ts` 作為唯一入口（`npm run server` 即執行該檔案）。

### 5. 開啟瀏覽器

應用程式將自動在瀏覽器中開啟，或手動訪問：
- 前端：http://localhost:3000
- 後端 API：http://localhost:3001

## 📁 專案結構

```
llmchat/
├── src/                   # 前端原始碼
│   ├── App.tsx            # 主應用元件
│   ├── AuthContext.tsx    # 用戶認證上下文
│   ├── MarkdownMsg.tsx    # Markdown 渲染組件
│   ├── constants.ts       # 應用程式常量定義
│   ├── main.jsx           # 應用程式入口
│   ├── index.css          # 全域樣式（包含玻璃擬態設計）
│   ├── components/        # React 組件
│   │   ├── Auth.tsx       # 登入/註冊組件
│   │   ├── Admin.tsx      # 管理員面板組件
│   │   ├── Header.tsx     # 應用標題欄組件
│   │   └── LanguageSelector.tsx # 語言選擇器組件
│   ├── hooks/             # React Hooks（已將複雜邏輯抽離）
│   │   ├── useChatStreaming.ts
│   │   ├── useConversations.ts
│   │   ├── useSpeech.ts
│   │   ├── useAutoScroll.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useOutsideClickClosePanels.ts
│   │   ├── useMobileView.ts
│   │   └── useThemeEffects.ts
│   ├── i18n/              # 國際化配置
│   │   └── index.ts       # i18n 初始化和配置
│   └── locales/           # 語言資源文件
│       ├── zh-TW.json     # 繁體中文翻譯
│       ├── zh-CN.json     # 簡體中文翻譯
│       ├── en.json        # 英文翻譯
│       ├── ja.json        # 日文翻譯
│       └── ko.json        # 韓文翻譯
├── server/                # 後端原始碼
│   ├── data/              # 用戶數據儲存目錄（不會提交到版本控制）
│   │   ├── users.json     # 用戶帳戶和個人資料
│   │   ├── sessions.json  # 用戶登入會話數據
│   │   └── conversations/ # 用戶對話記錄目錄
│   └── src/
│       ├── start.ts       # 後端入口
│       ├── app.ts         # 建立 Express app（routes/middlewares/providers 注入）
│       ├── routes/        # API routes
│       ├── middlewares/   # Express middlewares
│       ├── services/      # user/email 等 service
│       ├── providers/     # Ollama provider / chat provider
│       └── templates/     # Email templates
├── public/                # 靜態資源
│   ├── favicon.svg        # 網站圖標
│   └── github.svg         # GitHub 官方標誌
├── .env.example           # 環境變數配置範例
├── index.html             # HTML 模板（包含暗色載入畫面）
├── package.json           # 專案配置
├── tsconfig.json          # TypeScript 配置
├── vite.config.js         # Vite 配置
├── tailwind.config.js     # Tailwind 配置
└── postcss.config.js      # PostCSS 配置
```

## 🔧 配置說明

### 環境變數設定

應用程式支援通過環境變數配置 Ollama API 設定和 Vite 開發服務器設定。複製 `.env.example` 為 `.env` 並修改：

```bash
cp .env.example .env
```

支援的環境變數：

- **OLLAMA_API_URL**: Ollama 服務的 API URL（預設: http://localhost:11434）
- **OLLAMA_API_KEY**: API 金鑰（如果需要驗證，預設: 空）
- **VITE_ALLOWED_HOSTS**: Vite 開發服務器允許的主機列表（用逗號分隔，預設: localhost,127.0.0.1）
- **FRONTEND_URL**: 前端應用地址（用於生成Email驗證鏈接和成功頁面鏈接，預設: http://localhost:3000）
- **SMTP_HOST**: SMTP 服務器地址（用於發送驗證郵件，如果未設定，用戶將無法註冊新帳號）
- **SMTP_PORT**: SMTP 服務器端口（預設: 587）
- **SMTP_USER**: SMTP 用戶名
- **SMTP_PASS**: SMTP 密碼
- **FROM_EMAIL**: 發件人郵箱地址
- **FROM_NAME**: 發件人顯示名稱

範例 `.env` 檔案（開發環境）：
```env
OLLAMA_API_URL=http://localhost:11434
OLLAMA_API_KEY=your_api_key_here
VITE_ALLOWED_HOSTS=llmchat.example.com,your-domain.com
FRONTEND_URL=http://localhost:3000
```

範例 `.env` 檔案（生產環境）：
```env
OLLAMA_API_URL=http://localhost:11434
OLLAMA_API_KEY=your_api_key_here
VITE_ALLOWED_HOSTS=llmchat.example.com,your-domain.com
FRONTEND_URL=https://llmchat.example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=LLMChat
```

> **注意**: 環境變數會自動載入，前端設定面板會預填這些值，但用戶仍可修改並保存到本地儲存。VITE_ALLOWED_HOSTS 用於配置 Vite 開發服務器允許訪問的主機，解決跨域訪問問題。FRONTEND_URL 用於生成正確的 Email 驗證鏈接，確保在生產環境中用戶能正確點擊驗證鏈接（前端會通過代理將請求轉發到後端）。SMTP 設定決定是否啟用用戶註冊功能，如果 SMTP_USER 和 SMTP_PASS 未正確設定，用戶將無法看到註冊選項。

### 前端設定

在 `src/App.tsx` 中，您可以調整：

- **LLM模型**: `llama3:8b`, `codellama:7b`, `mistral:7b`, `gemma3:4b`
- **預設溫度**: 0.7 (0.0-2.0，低溫=確定、邏輯、一致；高溫=多樣、創造、驚喜)
- **最大 Context 數**: 8192 (範圍: 4096-262144)
- **Top P**: 0.9 (0.0-1.0，高=高機率；低=低機率)
- **Top K**: 40 (1-100，高=取樣多；低=取樣少)
- **UI 佈局**: 左右設定面板各佔50%
- **系統提示**: 自定義 AI 行為
- **串流模式**: 自定啟用，提供實時回應體驗

### 後端設定

在 `server/src/start.ts` 中，您可以調整：

- **服務端埠口**: 預設 3001
- **CORS 設定**: 跨域訪問控制
- **請求超時**: 30秒
- **環境變數**: 支援 OLLAMA_API_URL 和 OLLAMA_API_KEY

在 `server/src/providers/ollamaProvider.ts` 中，您可以調整：

- **Ollama 連接**: 通過環境變數或預設值設定
- **生成參數**: temperature, top_p, repeat_penalty
- **Context 控制**: num_ctx 與 maxTokens 同步設定
- **Token 限制**: num_predict 根據用戶設定動態調整

### 用戶數據管理

#### 數據儲存位置
- **用戶數據**: `server/data/users.json` - 包含用戶帳戶信息和個人設定
- **會話數據**: `server/data/sessions.json` - 包含用戶登入會話信息
- **對話記錄**: `server/data/conversations/{email}.json` - 各用戶的獨立對話記錄文件

#### 管理員備份用戶數據
管理員可以通過以下方式備份所有用戶數據：

1. **手動備份文件**:
    ```bash
    # 備份用戶數據
    cp server/data/users.json backup/users_$(date +%Y%m%d_%H%M%S).json

    # 備份會話數據（可選）
    cp server/data/sessions.json backup/sessions_$(date +%Y%m%d_%H%M%S).json

    # 備份所有用戶對話記錄
    cp -r server/data/conversations backup/conversations_$(date +%Y%m%d_%H%M%S)
    ```

2. **導出特定用戶數據**:
   - 登入管理員帳戶
   - 訪問 `/admin` 管理面板
   - 查看用戶列表和詳細信息
   - 使用應用程式內建的導出功能

3. **批量備份腳本**:
    ```bash
    #!/bin/bash
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="backups/$TIMESTAMP"

    mkdir -p "$BACKUP_DIR"
    cp server/data/users.json "$BACKUP_DIR/"
    cp server/data/sessions.json "$BACKUP_DIR/"
    cp -r server/data/conversations "$BACKUP_DIR/"

    echo "備份完成: $BACKUP_DIR"
    ```

#### 數據恢復
如需恢復用戶數據：
```bash
# 停止服務器
# 複製備份文件
cp backup/users_20241120_143000.json server/data/users.json
cp backup/sessions_20241120_143000.json server/data/sessions.json
cp -r backup/conversations_20241120_143000 server/data/conversations
# 重新啟動服務器
```

**⚠️ 重要提醒**: 用戶數據包含敏感信息，請妥善保管備份文件。

## 🎯 API 端點

### 用戶認證 API

#### POST /api/auth/register
用戶註冊
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /api/auth/login
用戶登入
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /api/auth/logout
用戶登出（需要認證）
```json
{
  "message": "登出成功"
}
```

#### GET /api/auth/verify
驗證會話（需要認證）
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2025-11-20T15:30:00.000Z",
    "lastLoginAt": "2025-11-20T15:30:00.000Z"
  }
}
```

#### GET /api/auth/verify-email/:token
Email 驗證（點擊郵件中的鏈接）
```
返回 HTML 成功頁面或錯誤頁面
```

#### POST /api/auth/resend-verification
重新發送驗證郵件
```json
{
  "email": "user@example.com"
}
```

#### GET /api/conversations
獲取用戶對話列表（需要認證）
```json
{
  "conversations": [...]
}
```

#### POST /api/conversations
保存用戶對話（需要認證）
```json
{
  "conversations": [...]
}
```

#### GET /api/user/settings
獲取用戶個人設定（需要認證）
```json
{
  "settings": {
    "language": "zh-TW",
    "theme": "auto",
    "model": "",
    "temperature": 0.7,
    "maxTokens": 8192,
    "apiUrl": "",
    "apiKey": "",
    "topP": 0.9,
    "topK": 40
  }
}
```

#### POST /api/user/settings
更新用戶個人設定（需要認證）
```json
{
  "settings": {
    "language": "zh-TW",
    "theme": "auto",
    "model": "",
    "temperature": 0.7,
    "maxTokens": 8192,
    "apiUrl": "",
    "apiKey": "",
    "topP": 0.9,
    "topK": 40
  }
}
```

#### POST /api/user/change-password
更改用戶密碼（需要認證）
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```
回應：
```json
{
  "success": true,
  "message": "密碼更改成功"
}
```

### 聊天 API

### GET /api/health
健康檢查端點
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T13:17:12.110Z"
}
```

### GET /api/config
獲取預設配置（從環境變數）
```json
{
  "apiUrl": "http://localhost:11434",
  "apiKey": "",
  "smtpEnabled": true
}
```

### GET /api/models
獲取可用模型列表
```json
{
  "models": [
    {
      "name": "llama2",
      "size": 1234567890,
      "modifiedAt": "2025-11-15T13:17:12.110Z"
    }
  ]
}
```

### POST /api/chat
發送聊天消息
```json
{
  "message": "你好，請自我介紹",
  "settings": {
    "model": "llama2",
    "temperature": 0.7,
    "maxTokens": 2048
  },
  "history": []
}
```

### POST /api/chat/stream
發送串流聊天消息（實時回應）
```json
{
  "message": "請寫一段關於AI的短文",
  "settings": {
    "model": "llama2",
    "temperature": 0.7,
    "maxTokens": 2048
  },
  "history": []
}
```
回應格式：Server-Sent Events (SSE)
```
data: {"message": {"content": "AI"}, "done": false}
data: {"message": {"content": "是"}, "done": false}
data: {"message": {"thinking": "思考中..."}, "done": false}
...
data: {"done": true}
```

### POST /api/chat/stop
停止正在進行的串流請求
```json
{
  "requestId": "1699123456789-abc123def456"
}
```
回應：
```json
{
  "success": true,
  "message": "請求已停止"
}
```

**思考過程支援**: 支援多種思考過程格式：
- **原生 thinking 字段**: 某些模型（如kimi-k2-thinking）在 `message.thinking` 字段中返回思考內容
- **標籤式思考**: deepseek/qwen3 等模型使用 `<think>思考內容</think>最終內容` 格式，系統會自動解析並分離顯示

## 🛠️ 開發命令

```bash
# 安裝依賴
npm install

# 開發模式（同時啟動前後端）
npm run dev

# 僅啟動前端
npm run client

# 僅啟動後端
npm run server

# 建構生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 🐛 故障排除

### 用戶認證問題

#### 登入後按 F5 需要重新登入
這是正常行為。會話在服務器重啟時會丟失，但如果您在 7 天內重新整理頁面，會話會自動恢復。

#### 無法註冊新用戶
- 檢查 Email 格式是否正確
- 確保密碼至少 6 個字符
- 檢查 Email 是否已被註冊

#### 忘記密碼
目前沒有密碼重置功能。如需重置密碼，請聯繫管理員或刪除用戶數據文件重新註冊。

#### 管理員權限問題
- 首位註冊者自動成為管理員
- 如果需要更多管理員，可以通過現有管理員賬戶修改用戶角色

#### 用戶數據丟失
- 檢查 `server/data/users.json` 文件是否存在
- 如果文件損壞，可以從備份恢復
- 如果沒有備份，需要用戶重新註冊

#### 無法登入特定帳戶
- 檢查用戶是否被管理員禁用
- 驗證 Email 和密碼是否正確
- 檢查 `server/data/users.json` 中的用戶狀態

#### Email 驗證鏈接無效
- 檢查 FRONTEND_URL 環境變數是否正確設定為您的前端域名（例如：https://llmchat.example.com）
- 確保驗證鏈接沒有過期（24小時內有效，過期後顯示「驗證鏈接已過期，請重新註冊帳號」）
- 檢查用戶是否已經驗證過該 Email
- 確認前端代理配置正確轉發 /api/* 請求到後端

#### 無法收到驗證郵件
- 檢查 SMTP 設定是否正確
- 驗證 SMTP_USER 和 SMTP_PASS
- 檢查垃圾郵件夾
- 查看後端日誌中的 SMTP 連接狀態

#### 註冊功能未顯示
- 檢查 SMTP_USER 和 SMTP_PASS 環境變數是否已正確設定
- 如果 SMTP 設定不完整，登入畫面不會顯示註冊選項
- 設定完整的 SMTP 變數後重新啟動服務器

### Ollama 連接失敗
- 確保 Ollama 服務正在運行：`ollama serve`
- 檢查端口是否正確：預設為 11434
- 嘗試重新啟動 Ollama：`ollama serve --port 11434`

### 模型未找到
- 確認模型已下載：`ollama list`
- 如果沒有模型，使用：`ollama pull llama2`
- 檢查模型名稱是否正確

### 前端無法連接到後端
- 確保後端在端口 3001 上運行
- 檢查 Vite 代理配置：`vite.config.js`
- 查看瀏覽器控制台的錯誤訊息

### TypeScript 錯誤
- 重新安裝依賴：`rm -rf node_modules package-lock.json && npm install`
- 檢查 TypeScript 版本：`npx tsc --version`

## 🔄 更新日誌

### v251213

- 🔧 **後端入口統一**: 後端以 `server/src/start.ts` 作為唯一入口，避免維護兩套入口邏輯
- 🧩 **前端 Hooks 重構**: 將串流聊天、對話管理、語音、以及 UI utilities（theme / autoscroll / keyboard shortcuts / outside click / mobile view）抽離成 hooks，降低 `App.tsx` 複雜度
- 🏷️ **版本同步**: `package.json` 與前端顯示版本號統一更新

### v251208

- 📎 **檔案內容讀取**: 修復 AI 無法讀取附檔內容的問題。現在 AI 可以正確讀取並理解上傳的文字檔案（如 .txt, .md, .csv 等）內容，提供更有意義的回應
- 🔒 **隱私保護**: 上傳的檔案內容會以隱藏方式傳送給 AI，對話介面僅顯示檔名，保持介面簡潔
- 🧠 **上下文記憶**: AI 在後續對話中也能記住之前上傳檔案的內容，支援多輪問答

### v251130

- 🔊 **語音功能優化**: 改進語音合成功能，過濾掉 Markdown 標記符號，避免在英文發音時讀出 hashtag、asterisk 等標記，同時保留程式碼內容的正確發音
- ⚡ **串流效能提升**: 實現防抖更新機制，減少前端串流顯示的卡頓問題，提升 AI 回應的流暢度
- 🛠️ **JSON 解析修復**: 改進串流數據的 JSON 解析錯誤處理，添加自動恢復機制，減少後端解析失敗的情況
- 🔧 **錯誤處理強化**: 前後端都添加了更詳細的錯誤日誌和恢復邏輯，提升系統穩定性

### v251128

- 🎨 **登入畫面主題適應**: 首次登入/註冊畫面現在會根據瀏覽器 `prefers-color-scheme` 設定自動選擇主題，若無法檢測則預設為暗黑模式
- 🌐 **登入畫面語言適應**: 首次登入/註冊畫面會根據瀏覽器語言自動選擇介面語言，若無法檢測則預設為繁體中文
- 👑 **管理員介面優化**: 管理員用戶現在可以直接點擊Header中的email區域進入用戶管理頁面，移除了右邊的管理按鈕，提供更簡潔的介面
- 📱 **手機選單重新組織**: 重新排列手機選單項目順序並添加分隔線，將相關功能分組，提升手機用戶體驗

### v251126

- 🌍 **完整多語言認證流程**: Email 驗證頁面和登入頁面現已支援 5 種語言（繁體中文、簡體中文、英文、日文、韓文）
- 🔗 **認證鏈接語言同步**: 驗證鏈接自動包含 `?lang=` 參數，確保驗證頁面顯示正確語言
- 📄 **動態驗證頁面**: 後端根據 URL 查詢參數動態生成多語言驗證頁面 HTML
- 🔄 **自動語言切換**: 用戶從驗證郵件返回登入頁面時，登入頁面自動切換到該語言
- 🎯 **無縫用戶體驗**: 整個認證流程（郵件 → 驗證頁面 → 登入頁面）語言完全一致

### v251125

- 📱 **響應式設計**: Header在小螢幕設備上會自動切換為收合式選單，點擊下拉箭頭可展開所有功能按鈕，提供更好的手機體驗。手機佈局下Header固定在頂部，聊天區域自動調整高度，避免滾動問題
- 🔐 **密碼管理功能**: 新增完整的密碼更改功能，用戶可以在設定面板中安全地更改密碼
- 🛡️ **密碼安全驗證**: 包含當前密碼驗證、新密碼確認和長度檢查等安全機制
- 🎨 **UI 佈局優化**: 移除密碼更改中的確認密碼欄位，並添加設定面板滾動條，提升用戶體驗
- 📝 **API文檔更新**: 新增密碼更改API端點的完整文檔說明
- 🎯 **快速模型切換**: 點擊Header中的模型名稱現在會直接下拉顯示可用模型選單，用戶可以快速切換模型而無需打開設定面板
- 🎨 **UI 優化**: 修復用戶對話框右邊有多餘空間的問題，現在只有AI消息框（有語音按鈕的）才會有右邊padding
- 🔧 **代碼重構**: 將應用程式標題和版本號提取為全局常量，方便維護和更新

### v251124

- 🔊 **語音隊列系統**: 實現完整的語音隊列管理系統，解決多個語音請求互相中斷的問題
- 🎵 **智能語音播放**: 多個語音請求會按順序排隊播放，提供更好的用戶體驗
- 🎛️ **語音控制功能**: 新增跳過當前語音和清除整個隊列的功能
- 🎨 **語音按鈕狀態**: 語音按鈕現在顯示不同的狀態（播放中🟢、隊列中🟠、其他標籤頁播放中🔴）
- 🔄 **跨標籤頁同步**: 使用 BroadcastChannel 實現多標籤頁間的語音狀態同步
- ⚡ **狀態同步優化**: 使用 useRef 優化語音狀態管理，避免狀態更新時機問題

### v251123

- 🔐 **管理員API設定保護**: API URL和API Key設定欄位現在只對管理員用戶顯示，並使用紅色框和"管理員"標籤清楚標示
- 🔧 **WebSocket錯誤修復**: 修復Vite開發服務器的WebSocket連接錯誤，提升開發體驗

### v251121

- 🎨 **登入畫面多語言支援**: 登入/註冊畫面加入語言選擇器，自動檢測瀏覽器語言
- 🌙 **登入畫面主題切換**: 登入畫面右上角添加主題切換按鈕，支援亮色/暗色模式切換
- 🌙 **智能主題適應**: 主程式自動跟隨瀏覽器明暗模式設定，用戶仍可手動切換
- 📁 **個人對話分檔儲存**: 每個用戶的對話記錄單獨存成 {email}.json 文件，提供更好的數據隔離
- ⚙️ **個人設定系統**: 新增完整的用戶個人設定欄位，包含語言、主題、AI 模型參數等
- 🔧 **設定 API**: 新增獲取和更新用戶個人設定的 API 端點
- 🗂️ **數據結構優化**: 重構數據儲存架構，提升可維護性和擴展性
- 📧 **多語言郵件支援**: 驗證郵件現在支援 5 種語言，根據用戶設定自動選擇合適語言
- 📧 **驗證郵件優化**: 增強驗證郵件樣式，確保在各郵件客戶端正常顯示按鈕文字
- ⏰ **令牌過期機制**: 實現24小時驗證鏈接過期，過期後需重新註冊帳號
- 🔄 **重發驗證信**: 重新發送驗證郵件時自動更新令牌過期時間
- ⚠️ **過期提醒**: 在驗證郵件中加入重要提醒，告知用戶鏈接24小時內有效

### v251120

- 🔐 **用戶認證系統**: 新增完整的用戶註冊和登入功能，首位註冊者自動成為管理員
- 👤 **個人化對話**: 每個用戶的聊天記錄完全獨立，登入後自動恢復個人對話歷史
- 👑 **管理員功能**: 管理員可以查看所有用戶、管理用戶角色、啟用/禁用用戶帳戶
- 🗂️ **用戶數據管理**: 用戶數據和對話記錄安全儲存在本地文件系統
- 🔑 **會話管理**: 實現安全的會話令牌管理，支援7天登入狀態保持
- 🛡️ **權限控制**: 基於角色的訪問控制，保護敏感功能
- 🎨 **登入介面**: 美觀的登入/註冊介面，支援密碼顯示/隱藏切換
- 📊 **用戶管理介面**: 管理員專用的用戶管理面板，包含用戶統計和操作功能
- 📧 **Email 驗證系統**: 完整的郵件驗證流程，註冊後需驗證Email才能登入，驗證鏈接24小時有效
- ⚙️ **SMTP 配置**: 支持多種郵件服務提供商，實時檢查SMTP連接狀態
- 🎛️ **智能UI控制**: 根據SMTP配置狀態動態顯示/隱藏註冊功能，無效配置時顯示友好提示
- 🌐 **生產環境支援**: FRONTEND_URL 環境變數確保驗證鏈接在生產環境中正確工作

### v251119

- 🖥️ **全螢幕模式**: 新增全螢幕切換功能，用戶可以一鍵切換到全螢幕聊天體驗，移除邊框和間距，最大化利用螢幕空間
- 🎨 **全螢幕UI適配**: 全螢幕模式下自動調整樣式，移除玻璃擬態邊框和背景間距，提供真正的沉浸式體驗
- 🔄 **無縫切換**: 全螢幕模式與普通模式間的平滑切換，保持所有功能正常運作
- 🛑 **後端停止機制**: 實現完整的前後端串流停止機制，確保用戶中斷時後端也會立即停止處理，提升資源利用效率
- 🌐 **多語言支援**: 新增完整的國際化支援，支援繁體中文、簡體中文、英文、日文、韓文五種語言
- 🎯 **語言自動檢測**: 應用程式會自動檢測瀏覽器語言並載入對應語言
- 🔄 **即時語言切換**: 提供下拉式語言選擇器，用戶可以即時切換介面語言
- 🎤 **語音語言同步**: 語音識別和語音合成會根據當前語言自動切換對應的語言設定
- 📅 **日期本地化**: 對話時間戳記會根據當前語言顯示本地化格式
- 🏷️ **HTML語言屬性**: 動態更新HTML lang屬性，提升SEO和無障礙性
- 💬 **系統提示i18n**: 後端系統提示支援多語言，根據用戶語言提供對應的AI指示

### v251118

- ⚡ **效能大幅優化**: 添加 React.memo 和防抖處理，解決長內容滾動和輸入的 laggy 問題
- 🔧 **組件優化**: MarkdownMessage 組件添加記憶化，提升渲染效能
- 🎯 **智能狀態管理**: 使用 useRef 優化串流狀態儲存，避免狀態更新時機問題
- 🔄 **即時串流解析**: 支援思考標籤的實時串流解析，提供流暢的思考過程顯示體驗
- 📝 **智能內容分離**: 自動解析 `<think>思考內容</think>最終內容` 格式，將思考過程顯示在專用框框中
- 🧠 **增強思考過程支援**: 新增對 deepseek/qwen3 等 thinking 類 LLM 模型的 `<think>` 標籤解析支援
- 🧠 **思考過程修復**: 修復原生 thinking 模型（如 kimi-k2-thinking）在串流完成後思考過程消失的問題
- 🎯 **向後相容**: 保持對原生 thinking 字段模型的支援，同時擴展到更多模型
- 📜 **滾動體驗改進**: 將自動滾動重新啟用值調成滾動到98%位置，提供更靈活的控制
- 🎨 **載入畫面改進**: 新增美觀的暗色模式載入畫面，提供更好的用戶體驗
- 🚫 **串流中斷控制**: 新增實時串流過程中可以中斷的功能，用戶可以點擊發送按鈕兩次來安全停止AI回應，避免意外長回應
- 💬 **中斷標記**: 被用戶中斷的回應會顯示"(用戶中斷)"標記，清楚區分正常完成和用戶中斷的情況

### v1.2.0 (2025-11-17)
- 🏷️ **版本號顯示**: 在應用標題中顯示版本號，提供更好的版本識別
- 📝 **Markdown 支援**: 新增完整的 Markdown 語法支援，包括程式碼高亮和格式化顯示
- 🎯 **智能滾動控制**: 實現訊息串流時的智能滾動，用戶可隨時往上回捲禁用自動下捲功能，除非捲到底部才重新啟用
- 📋 **程式碼複製功能**: Markdown 中的程式碼區塊提供一鍵複製按鈕，方便使用
- 📏 **對話框寬度優化**: 將對話框寬度調整為 90%，提供更好的閱讀體驗
- 🌐 **允許主機配置**: 新增 VITE_ALLOWED_HOSTS 環境變數，支持動態配置 Vite 開發服務器允許的主機列表
- 📁 **檔案顯示優化**: 檔案上傳以小字顯示並支援收合展開，類似思考過程樣式
- 🔧 **環境變數支援**: 新增 OLLAMA_API_URL 和 OLLAMA_API_KEY 環境變數配置
- 🎛️ **設定面板重構**: 改為左右50:50佈局，提供更平衡的視覺體驗
- 📝 **參數說明優化**: 整合說明文字到標籤中，提供詳細的參數解釋
- 🎚️ **滑桿統一**: 所有生成參數統一使用滑桿輸入，提升用戶體驗
- 📊 **Context範圍調整**: 最大Context數範圍調整為4096-262144，提供更合理的設定選項
- 🎨 **主題背景優化**: 亮色模式使用藍色漸層，暗色模式使用紫色漸層，提供更好的視覺體驗
- 🔄 **自動配置載入**: 前端自動從後端載入環境變數預設值

### v1.1.0 (2025-11-16)
- ✨ **玻璃擬態設計**: 實現現代化的玻璃擬態視覺效果，搭配漸層背景
- 🎨 **UI 優化**: 全螢幕沉浸式體驗，thinking區域有獨特的樣式區分
- 📐 **容器寬度**: 將玻璃容器寬度調整為 96% 瀏覽器寬度
- 📏 **高度優化**: 動態調整容器高度避免滾動條，最大化聊天空間
- 📁 **檔案顯示優化**: 檔案上傳僅顯示檔名，不顯示內容以保持介面簡潔
- 🎯 **設計完善**: 提升整體視覺一致性和使用者體驗
- 🔗 **GitHub 整合**: 添加官方 GitHub 標誌連結
- 📊 **模型狀態**: 標題欄顯示當前模型，點擊可開啟設定
- 💬 **歡迎介面**: 優化歡迎訊息，完整介紹應用功能
- 🎨 **主題適應**: 完善明暗主題的視覺效果和對比度
- 🧠 **思考過程顯示**: 新增AI思考過程的可收合顯示功能
- 📡 **實時thinking流式**: 支援thinking內容的實時流式顯示
- 🎯 **精確控制**: 只有實際包含thinking的訊息才會顯示思考過程按鈕

### v1.0.0 (2025-11-15)
- 🎉 **全功能實現**: 完成所有規劃中的進階功能
- 💬 **多對話管理**: 支援創建、切換和刪除多個獨立對話
- 💾 **對話持久化**: 自動保存對話記錄到本地儲存
- ⚡ **實時串流**: 支援實時串流回應，提供打字機效果
- 📜 **自動滾動**: 實現流式消息時自動滾動到底部，跟隨最新內容
- 📁 **檔案上傳**: 支援文件上傳並自動讀取內容
- 🎤 **語音功能**: 實現語音輸入和文字轉語音輸出
- ⌨️ **快捷鍵支援**: 添加多種鍵盤快捷鍵操作
- 📤 **導出功能**: 支援JSON和Markdown格式導出
- 🔧 **API擴展**: 新增串流聊天API端點
- 🚀 **Token 限制提升**: 最大 Token 數上限提升到 262144
- ⚙️ **Context 同步**: maxToken 設定與 Ollama context size 同步
- 🛡️ **確認機制**: 添加刪除對話和清除內容的確認視窗


## 🚧 未來功能

- [ ] UI再改良
- [ ] 支援更多Provider的模型
- [ ] 支援更完善的Chat功能，如網路搜尋
- [ ] 支援更進階的功能，如MCP等

## 📝 注意事項

1. **用戶認證**: 應用程式使用本地用戶認證系統，首位註冊者自動成為管理員
2. **Email 驗證**: 新用戶註冊後需要驗證Email地址才能登入，驗證鏈接24小時內有效，過期後需重新註冊帳號
3. **SMTP 配置**: 必須正確設定 SMTP_USER 和 SMTP_PASS 環境變數才能發送驗證郵件，未設定時用戶無法註冊
4. **個人化設定**: 每個用戶的語言偏好、主題設定、AI 模型參數等都會自動保存並在登入時恢復
5. **主題適應**: 應用程式會自動跟隨瀏覽器的明暗模式設定，但用戶也可手動切換
6. **對話記錄隔離**: 每個用戶的對話記錄完全獨立儲存，確保隱私和數據安全
7. **數據安全**: 用戶數據和對話記錄儲存在本地文件系統，不會上傳到雲端
8. **數據備份**: 管理員應定期備份 `server/data/users.json` 文件，包含所有用戶帳戶和對話記錄
9. **會話管理**: 登入狀態在服務器重啟時會重置，但會在 7 天內保持有效
10. **管理員權限**: 管理員可以管理所有用戶帳戶，請妥善保管管理員密碼
11. **數據恢復**: 如需恢復用戶數據，從備份文件複製到 `server/data/` 目錄並重啟服務器
12. **硬體要求**: 大型模型需要足夠的 RAM（建議 8GB 以上）
13. **首次使用**: 首次啟動模型可能需要下載，請耐心等待
14. **性能**: 模型大小會影響響應速度

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License - 詳見 LICENSE 檔案

---

**享受與本地 AI 模型的美觀對話體驗吧！** ✨
