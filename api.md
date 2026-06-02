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
- **原生 thinking 欄位**: 某些模型（如 kimi-k2-thinking）在 `message.thinking` 欄位中返回思考內容
- **標籤式思考**: deepseek/qwen3 等模型使用 `<think>思考內容</think>最終內容` 格式，系統會自動解析並分離顯示
