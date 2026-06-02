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
- **實時效能監控**: 在 AI 回應中實時顯示生成的 token 數量和 tokens/s 生成速度，幫助用戶了解 AI 生成效能
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
- **多 Provider 支援**: 全面支援 20 組 LLM Provider (包含各大雲端 API、網關以及本地自建方案)，可透過 UI 一鍵切換，無需重啟服務
- **Provider 管理**: 完整的 Provider 配置介面，自動帶入服務商 Base URL，支援連接測試、模型自動檢測與全域同步設定

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
- **Vanilla CSS** - 玻璃擬態與主題樣式
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

### 4. 啟動

```bash
npm start
```

瀏覽器會自動開啟 http://localhost:3001，完成。

> **開發模式**（需要同時改前後端 code 時才用）：`npm run dev`

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

應用程式支援通過環境變數配置 LLM Provider 設定和 Vite 開發服務器設定。複製 `.env.example` 為 `.env` 並修改：

```bash
cp .env.example .env
```

 支援的環境變數：

 ### LLM Provider 設定（新格式，推薦）
 - **LLM_PROVIDER**: Provider 類型（預設: `ollama`），支援：`ollama`, `openai`, `anthropic`, `groq`, `deepseek`, `nvidia`, `mistral`, `together`
 - **LLM_BASE_URL**: Provider API 基礎 URL（各 Provider 預設值不同，例如 Ollama 為 `http://localhost:11434`，OpenAI 為 `https://api.openai.com`）
 - **LLM_API_KEY**: API 金鑰（如適用，預設: 空）
 - **LLM_MODEL**: 預設模型名稱（例如：`llama2`, `gpt-4o`, `claude-3-opus`）
 - **LLM_TEMPERATURE**: 生成溫度 0-2（預設: 0.7，越高越有創造性）
 - **LLM_MAX_TOKENS**: 最大 Token 數（預設: 2048）

 ### 舊版 Ollama 設定（保留以兼容）
 - **OLLAMA_API_URL**: Ollama 服務的 API URL（預設: http://localhost:11434）⚠️ 與 `LLM_BASE_URL` 效果相同，但新系統優先使用 `LLM_` 系列參數
 - **OLLAMA_API_KEY**: API 金鑰（如果需要驗證，預設: 空）⚠️ 與 `LLM_API_KEY` 效果相同

 ### Vite 與前端設定
 - **VITE_ALLOWED_HOSTS**: Vite 開發服務器允許的主機列表（用逗號分隔，預設: localhost,127.0.0.1）
 - **FRONTEND_URL**: 前端應用地址（用於生成 Email 驗證鏈接，預設: http://localhost:3000；生產環境請設為正式域名，例如 `https://llmchat.example.com`）

 ### SMTP 郵件設定
 - **SMTP_HOST**: SMTP 服務器地址（例如：`smtp.gmail.com`）
 - **SMTP_PORT**: SMTP 服務器端口（預設: 587）
 - **SMTP_USER**: SMTP 用戶名（郵箱地址）
 - **SMTP_PASS**: SMTP 密碼/應用程式專用密碼
 - **FROM_EMAIL**: 發件人郵箱地址
 - **FROM_NAME**: 發件人顯示名稱（預設: `LLMChat`）

 範例 `.env` 檔案（開發環境 - 使用 Ollama）：
 ```env
 # LLM Provider 設定
 LLM_PROVIDER=ollama
 LLM_BASE_URL=http://localhost:11434
 LLM_MODEL=llama2
 LLM_TEMPERATURE=0.7
 LLM_MAX_TOKENS=2048

 # Vite 與前端
 VITE_ALLOWED_HOSTS=llmchat.example.com,your-domain.com
 FRONTEND_URL=http://localhost:3000

 # SMTP (可選，不設定則無法註冊)
 # SMTP_HOST=smtp.gmail.com
 # SMTP_PORT=587
 # SMTP_USER=your-email@gmail.com
 # SMTP_PASS=your-app-password
 # FROM_EMAIL=your-email@gmail.com
 # FROM_NAME=LLMChat
 ```

 範例 `.env` 檔案（生產環境 - 使用 OpenAI）：
 ```env
 # LLM Provider 設定
 LLM_PROVIDER=openai
 LLM_BASE_URL=https://api.openai.com
 LLM_API_KEY=sk-your-openai-api-key
 LLM_MODEL=gpt-4o
 LLM_TEMPERATURE=0.7
 LLM_MAX_TOKENS=4096

 # Vite 與前端
 VITE_ALLOWED_HOSTS=llmchat.example.com
 FRONTEND_URL=https://llmchat.example.com

 # SMTP 郵件設定
 SMTP_HOST=smtp.gmail.com
 SMTP_PORT=587
 SMTP_USER=your-email@gmail.com
 SMTP_PASS=your-app-password
 FROM_EMAIL=your-email@gmail.com
 FROM_NAME=LLMChat
 ```

 ### 重要提示
 - **配置繼承**: 用戶在設定面板中選擇的 Provider/API Key/Model 會儲存到個人配置，優先級高於環境變數。環境變數僅作為預設值。
 - **舊版參數**: `OLLAMA_API_URL` 和 `OLLAMA_API_KEY` 仍受支援，但建議改用 `LLM_BASE_URL` 和 `LLM_API_KEY` 以統一管理。
 - **SMTP 必填**: 若 `SMTP_USER` 和 `SMTP_PASS` 未設定，註冊功能將自動停用（登入頁面不顯示註冊選項）。
 - **環境變數自動載入**: 前端設定面板會預填這些值，但用戶仍可修改並儲存。VITE_ALLOWED_HOSTS 用於配置 Vite 開發服務器允許訪問的主機，解決跨域訪問問題。FRONTEND_URL 用於生成正確的 Email 驗證鏈接（前端會透過代理將 /api/* 請求轉發到後端）。

 ### 前端設定

在 `src/App.tsx` 中，您可以調整：

 - **LLM 模型**: 透過環境變數 `LLM_MODEL` 設定預設模型（如 `llama2`、`gpt-4o`、`claude-3-opus`），實際可用模型由當前 Provider 動態決定
 - **預設溫度**: 0.7 (0.0-2.0，低溫=確定、邏輯、一致；高溫=多樣、創造、驚喜)
 - **最大 Token 數**: 8192 (範圍: 1-262144，讀取 `LLM_MAX_TOKENS` 環境變數)
 - **Top P**: 0.9 (0.0-1.0，高=高機率；低=低機率)
 - **Top K**: 40 (1-100，高=取樣多；低=取樣少)
 - **UI 佈局**: 左右設定面板各佔50%
 - **系統提示**: 自定義 AI 行為
 - **串流模式**: 預設啟用，提供實時回應體驗

### 後端設定

在 `server/src/start.ts` 中，您可以調整：

 - **服務端埠口**: 預設 3001
 - **CORS 設定**: 跨域訪問控制
 - **請求超時**: 30秒
 - **環境變數**: 支援 LLM_PROVIDER、LLM_BASE_URL、LLM_API_KEY、LLM_MODEL、LLM_TEMPERATURE、LLM_MAX_TOKENS（同時保留 OLLAMA_API_URL/OLLAMA_API_KEY 以向後兼容）

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

### v260601

- ☁️ **雲端安全認證整合**: 管理員設定頁面新增雲端平台認證方式選擇。支援 Google Vertex AI、AWS Bedrock、Azure OpenAI 三大雲端平台，讓管理員改用雲端平台的身份驗證機制（如服務帳號、IAM 角色）取代直接填寫靜態 API Key，提升金鑰安全性，適合企業部署情境。
- 🔑 **首位管理員免驗證自動啟用**: 當資料庫無用戶時，首位註冊用戶將自動設為已驗證且已啟用的 `admin` 管理員角色，無須經由 Email 驗證，並在前端展示專屬的歡迎與引導登入畫面，完美避開因本地未配置 SMTP 服務而產生的註冊死鎖與驗證報錯。
- ⚙️ **SMTP 動態啟用註冊**: 優化後端 SMTP 配置檢測，避免每次請求都進行慢速的 SMTP 連線測試造成介面延遲，並在系統尚無用戶時，即使無 SMTP 設定也強制顯示註冊按鈕，確保能順利建立管理員。
- 📊 **錯誤訊息與 Token 統計解耦**: 修復了 AI 消息出錯（例如伺服器斷線）時，卡片誤算並在下方顯示 global Token 統計值的 Bug，同時將串流期間的動態 Token 統計功能正確地融合於正在生成的消息框內。
- 🚀 **全新 `npm start` 支援**: 在 `package.json` 中加入了專屬的 `"start"` 腳本（`npm start`），並引入自動開啟瀏覽器至 `http://localhost:3001` 的功能，提供比 `npm run dev` 更簡便的獨立本機運行體驗。
- 👁️ **Vision 模型選單優化**: 為管理員設定頁面的「Vision 模型 (可選)」輸入欄位右側新增「獲取模型」按鈕，且在已獲取模型列表時會自動呈現下拉選單（自動過濾純文字模型，僅保留支援多模態的 Vision 模型，如包含 `vision`, `vl`, `llava`, `gemini`, `claude`, `gpt-4o` 等關鍵字之模型），讓多模態 Vision 模型配置與主模型一樣方便且不易配置出錯。
- 🎚️ **Context Size 支援拉霸控制**: 將管理員面板與 Provider 設置中的「Context Size (最大 Context 數 / maxTokens)」參數輸入框全面調整為直覺的拉霸滑桿（支援 `256` 到 `262144` 範圍，步長 `256`），讓上下文長度的設定與 `Temperature`, `Top P` 等生成參數的操作體驗完全統一。
- 🗂️ **LLM Provider 配置面板 2x2 精確對齊**: 將 LLM 提供商設定欄位重構為符合直覺且精準對齊的 2x2 格線排版。第一排配置「認證方法」與「API Key」（非 API Key 認證模式時右側自動留空以精確對齊），第二排則配置「模型名稱 (文字 Model)」與「Vision 模型 (Vision Model)」，使視覺邏輯極致對稱美觀。
- 🌐 **生成參數標籤全語系國際化**: 針對 `Temperature`、`Top P`、`Top K` 與新更名的 `Context Size` 核心參數，全面移除原本寫死在 TSX 中的英文，並重構為配合 5 國語言配置檔（繁中、簡中、英文、日文、韓文）自動切換翻譯標籤，提供全面且完美的在地化操作體驗。
- 🖼️ **全端 Vision 多模態動態解析與切換**: 徹底重構附加檔案中的圖片處理邏輯。前端將圖片讀取改為標準的 Base64 Data URL 並排除將二進位字串直接內嵌在文字 context 中（解決了文字模型強行解析時思考過程冒出大批亂碼的 Bug）；當偵測到附加圖片時，系統會自動且動態地切換為配置的 `visionModel`。後端針對不同 Provider（Ollama 的 `images` 陣列、OpenAI 規格的 `content` 陣列、Anthropic 規格的 `image` blocks）全面轉化為相應的多模態 Payload 發送，並**同步放寬 Express 的 JSON 請求 limit 限制至 `50mb`**（解決了上傳大於 100kb 的圖片時因 Express 預設 body 限制而爆出 413 Payload Too Large 錯誤），完美支援實時的多模態視覺解析。
- 🏷️ **單一版本源 (Single Source of Truth) 重構**: 統一將 `package.json` 的 `"version"` 作為專案唯一真實版本源。前端 `src/constants.ts` 重構為動態 import 讀取 `package.json`，免除日後更新版本號時需手動更改多個檔案的繁複流程。
- 🌐 **智慧多路並行股價解析引擎 (Parallel Multi-Stock Quotes Engine)**: 將原有的單點爬蟲重構為多協程並行架構。支援同時並行抓取與對比多檔美股（如 `nvidia vs amd`）或台股，智慧排除 pure currency tags（如 `USD`），完美解析目前股價、漲跌幅、漲跌狀況與更新時間。
- 🧹 **5 國語言無感智慧意圖過濾器 (5-Language Query Preprocessor)**: 全面重構關鍵字過濾層，完美支援繁體中文、簡體中文、英文、日文、韓文五國語言。針對天氣預報、新聞速報、匯率走勢、大宗物價、軟體最新版本、店家行程推薦、航班機票比價、訂房飯店比價等多重意圖進行無感識別與 2026 年度實時關鍵字重寫，確保檢索資料取得絕對的高時效性。
- 🌍 **網路搜尋 (地球開關) 預設開啟 & 前端編譯排障**: 將輸入框旁的地球預設狀態調為開啟，並徹底排查與修正了 React 歷史遺留的所有型別與第三方定義檔編譯報錯，使生產打包 `npx vite build` 順利恢復成功，保障了靜態檔案部署順暢。

---

### v260425

- 🔗 **多 Provider 深度串接**: 實施了後端 `ProviderManager` 與 `ProviderFactory` 架構，正式支援 OpenAI, NVIDIA NIM, Anthropic, Google Gemini 等主流 Provider，並解決了 Provider 類型丟失導致的後台誤判問題。
- ⚡ **原子化儲存 (Atomic Saving)**: 導入了部分欄位更新機制，切換語言、主題或模型時不再全量覆蓋資料庫，解決了 API Key 明文/密文衝突導致的存檔失敗問題。
- ⚙️ **Admin 設定持久化**: 修正了原先僅暫存於環境變數的 Bug，現在所有 Provider 設定（URL、Key、Model、參數）均會完整持久化至管理員資料庫配置中。
- 🎯 **模型選擇穩定性**: 修復了 React 閉包導致的模型狀態過期 Bug，解決了模型選取列表刷新後會跳回預設值的問題。
- 🌐 **語言持久化修復**: 移除了 Languagedetector，改由應用程式手動管理 `localStorage['llmchat_language']`，解決了語系在網頁刷新後閃爍跳回中文的問題。
- 🌊 **SSE 串流緩衝優化**: 針對 OpenAI 相容 API 導入了行緩衝 (Line Buffering) 機制，解決了 NVIDIA NIM 等第三方 API 的連線穩定性。
- 🌐 **管理介面全方位 i18n**: 完成管理員面板所有標籤、操作按鈕及連線測試狀態的完整國際化翻譯。
- ⚙️ **配置入口遷徙**: 徹底分離用戶設定與 Provider 底層連線，用戶僅能調整生成參數，避免誤觸系統級 API 配置。
- 🚢 **手動建構發布**: 由於系統權限限制，本版本已手動執行 `npm run build` 以確保 `dist/` 目錄包含最新的 React 邏輯。

## ✅ 已修復的問題 (v260425)

1. **主題設定持久化失效**：用戶切換亮色/暗色主題後，F5 重新整理會變回「跟隨系統」。
    - 統一使用 `"dark"` / `"light"` / `"auto"` 字串格式儲存於 `localStorage`
    - `userSettings` 的 `useState` 初始值改為 lazy initializer，直接從 `localStorage` 讀取，確保下拉選單與畫面主題即時同步
    - `usePrefersColorSchemeSync` 只監聽系統主題變化，不再覆蓋 mount 時的初始值
2. **初次進入模型選擇與連線錯誤**：
    - 用戶切換模型時只儲存 `model` 單一欄位，不再覆蓋 `apiUrl` / `apiKey`，避免連線參數被清空導致錯誤
    - Admin 設定現在會正確同步至 `settings.model`，並在載入用戶設定時優先套用
    - `loadAvailableModels` 失敗時保留已選模型而非強制清空
3. **📌 頁面刷新後聊天失效問題 (FINAL FIX)**：
    - 🔧 修復 React 經典閉包陷阱 (Closure Trap)，發送訊息前永遠直接從 localStorage 讀取最新設定，完全跳過 React State 舊值捕捉問題
    - 🔧 新增三層防禦機制：初始化讀取 -> 伺服器同步後覆蓋 -> 發送前最終確認
    - 🔧 現在切換模型後無論重整幾次、關閉瀏覽器再打開，設定永遠正確保留
    - 🔧 解決「正在生成回應...」卡住、「抱歉發生錯誤」、刷新後必須重進設定頁面等所有相關症狀
4. **npm install peer dependency 衝突**：將 `@vitejs/plugin-react` 升級至 `^6.0.1`，與 `vite@8.0.9` 完全相容，無需 `--legacy-peer-deps`

---

### v251230

- 🔗 **Ollama API 同步優化**: 實施了 `apiUrl` 與 `apiKey` 的「成對綁定」Fallback 邏輯，確保配置的完整邏輯一致性，解決了 URL 來源與 Key 來源不匹配的問題
- 👑 **配置優先級優化**: 完善了 (用戶 -> Admin -> .env) 的層級繼承機制，確保非管理員用戶能正確繼承管理員設定的雲端 API 服務
- 🔐 **安全加密加強**: API Key 採用 AES-256-CBC 加密存儲於 `users.json` 中，並在內部傳輸與用戶配置獲取時實施自動解密，兼顧安全性與易用性
- 🔄 **標題與模型同步**: 修正了 Header 標題在切換 API 配置後未能即時更新模型名稱的問題，並增加模型有效性自動驗證機制
- ⚡ **超時與性能優化**: 將 Ollama API 連結超時延長至 120 秒以適應雲端服務，並加入 URL 自動規範化處理，防止路徑拼接錯誤
- 🧹 **狀態清理機制**: 在用戶登出時自動重置所有聊天設定與 API 緩存，防止跨會話的數據殘留與顯示錯誤

### v251227

- 📊 **實時效能監控**: 新增 token 數量和生成速度（tokens/s）的實時顯示功能，幫助用戶了解 AI 生成效能，類似模板專案實現方式
- ⚙️ **設定開關**: 在設定面板中新增「顯示 Token 統計」開關，用戶可自由開啟或關閉此功能，默認為開啟狀態
- 🌐 **多語言支援**: 設定開關功能支援全部 5 種語言（繁體中文、簡體中文、英文、日文、韓文）
- 💾 **設定持久化**: Token 統計開關設定會保存到服務器，登入後自動恢復用戶偏好
- 🔧 **模型列表修復**: 修復設定畫面初始載入時顯示「沒有可用模型」的問題，現在用戶登入後會自動使用正確的 API URL 重新載入模型列表
- 🗑️ **訊息刪除功能**: 新增單條訊息刪除功能，用戶和 AI 訊息均可刪除，懸浮顯示刪除按鈕，帶確認對話框防止誤刪

### v251222

- 🔧 **註冊訊息修正**: 修正註冊成功訊息顯示，現在會正確顯示"感謝註冊！"後面接"請檢查您的郵箱收取啟用信。"
- 🌐 **多語言更新**: 更新所有5種語言的註冊驗證訊息，提供更清晰的用戶指引
- 🔧 **登入設定載入修復**: 修正用戶登入時Ollama URL未自動載入的問題，現在登入時會正確載入預設配置並保留用戶自定義設定

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

## 🌟 多 Provider 支援功能 (Multi-Provider)

LLMChat 支援多種 LLM Provider，無需重啟服務即可透過介面切換：

### 支援的 20 組 Provider 列表
系統內建支援以下 20 種不同的服務商與開源方案，全面涵蓋主流雲端與本地部署應用場景：
1. **主流雲端大廠 API**: OpenAI, Anthropic Claude, Google Gemini, xAI (Grok)
2. **高CP值與開源社群 API**: Groq, Mistral, Moonshot AI (Kimi), Together AI, NVIDIA NIM
3. **API 網關與路由平台**: OpenRouter, Kilo Gateway, Vercel AI Gateway, Cloudflare AI Gateway, Synthetic (Anthropic-compatible)
4. **本地與自託管開源方案**: Ollama, Ollama Cloud, vLLM, SGLang, LM Studio, Customer Provider (自訂端點)

### 系統架構特點
- **統一介面 (`ProviderFactory`)**: 透過整合各種 API 介面提供單一對話流。
- **後台無縫設定**: 管理員可於 Admin 介面快速選擇 Provider，系統自動帶入 Base URL，並支援實時連線測試和一鍵抓取模型清單。
- **設定全域同步**: 管理員的提供商配置會自動覆蓋並落實至所有一般用戶的設定，確保使用者一登入即可直接選擇相應服務最新的可用模型。
- **環境變數備援**: 亦可透過 `.env` 檔案以 `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY` 等參數配置預設值。

## 🚧 未來功能

- [ ] UI 持續改良
- [ ] 支援更多 Provider 的模型
- [ ] 忘記密碼 / 密碼重置功能
- [ ] MCP (Model Context Protocol) 整合
- [ ] RAG 知識庫功能

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
