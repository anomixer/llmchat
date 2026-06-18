# LLMChat API 文件

本文檔詳細記錄了 LLMChat 的後端 API 端點規格，供開發人員參考。

---

## 🎯 API 端點

### 使用者認證 API

#### POST /api/auth/register
使用者註冊
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /api/auth/login
使用者登入
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /api/auth/logout
使用者登出（需要認證）
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
```json
{
  "success": true,
  "message": "驗證成功",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### POST /api/auth/resend-verification
重新發送驗證郵件
```json
{
  "email": "user@example.com"
}
```

#### GET /api/conversations
獲取使用者對話列表（需要認證）
```json
{
  "conversations": [...]
}
```

#### POST /api/conversations
保存使用者對話（需要認證）
```json
{
  "conversations": [...]
}
```

#### GET /api/user/settings
獲取使用者個人設定（需要認證）
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
更新使用者個人設定（需要認證）
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
更改使用者密碼（需要認證）
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
  "message": "密碼已更新"
}
```

### OAuth API



### 聊天 API

### GET /api/health
健康檢查端點
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T13:17:12.110Z"
}
```

### GET /api/models
獲取可用模型列表（需要認證）

**回應格式**：
```json
{
  "models": [
    {
      "name": "gpt-4o-mini",
      "size": 0
    }
  ]
}
```

### GET /v1/models
OpenAI 相容模型列表端點（需要認證）

**回應格式**：
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o-mini",
      "object": "model",
      "created": 1710000000,
      "owned_by": "openai"
    }
  ]
}
```

### POST /api/chat
發送聊天消息（需要認證）
```json
{
  "message": "你好，請自我介紹",
  "settings": {
    "model": "llama2",
    "temperature": 0.7,
    "maxTokens": 2048
  },
  "history": [],
  "conversationId": "optional-conversation-id"
}
```

### POST /api/chat/stream
發送串流聊天消息（需要認證）
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
回應格式：純文字串流輸出，並會在 Header 附帶 `X-Request-ID` 供停止請求使用。

> **💡 連線中斷機制**：後端會監聽 HTTP 回應的 `close` 事件（`res.on('close')`）。當使用者在瀏覽器中斷連線（例如關閉對話分頁、重新整理頁面或連線中斷）時，後端將自動終止模型的串流推理發送，以釋放伺服器運算資源。

### POST /api/chat/stop
停止正在進行的串流請求
```json
{
  "requestId": "1699123456789abc123def"
}
```
回應：
```json
{
  "success": true,
  "message": "請求已停止"
}
```

---

## ⚙️ Multi-Provider 整合與管理 API (需要認證)

### GET /api/providers
獲取系統內建與支援的所有 Provider 預設連線配置與支援列表。

### GET /api/providers/current
獲取當前管理員已配置並儲存的 LLM 運作設定。

### POST /api/providers/update
更新全系統的 Provider 配置。
**請求格式**：
```json
{
  "type": "google-gemini",
  "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
  "apiKey": "YOUR_GEMINI_KEY",
  "model": "gemini-2.5-flash",
  "temperature": 0.7,
  "maxTokens": 4096
}
```
**回應**：
```json
{
  "success": true,
  "isConnected": true,
  "message": "Provider 設定已更新"
}
```

### POST /api/providers/check
測試當前 Provider 配置的連線狀況。

---

## 🔒 認證與憑證補充說明

- 目前 OAuth 綁定資料由 `server/oauthService.js` 以記憶體 `Map` 保存；伺服器重啟後資料會清空，若需正式上線建議改成資料庫持久化。
