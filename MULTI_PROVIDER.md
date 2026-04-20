# 🔄 多 Provider 支援說明

## 🎯 功能概述

LLMChat 現在支援多個 LLM Provider，讓您可以在不同的 AI 服務之間自由切換：

### 支援的 Provider

| Provider | 類型 | API URL | API Key | 說明 |
|:---|:---|:---|:---:|:---|
| **Ollama** | 🏠 本地 | `http://localhost:11434` | 🔓 不需要 | 本地運行，免費，可自訂模型 |
| **OpenAI** | ☁️ 雲端 | `https://api.openai.com` | 🔑 需要 | GPT-4, GPT-3.5 等 |
| **Anthropic Claude** | ☁️ 雲端 | `https://api.anthropic.com` | 🔑 需要 | Claude 系列模型 |
| **Groq** | ⚡ 高速 | `https://api.groq.com/openai` | 🔑 需要 | 極速推理引擎 |
| **DeepSeek** | 🤖 智能 | `https://api.deepseek.com` | 🔑 需要 | DeepSeek 系列模型 |
| **NVIDIA NIM** | 🎮 GPU | `https://integrate.api.nvidia.com` | 🔑 需要 | NVIDIA 雲端服務 |
| **Mistral** | 🦙 開源 | `https://api.mistral.ai` | 🔑 需要 | Mistral 系列模型 |
| **Together AI** | 🌐 平台 | `https://api.together.xyz` | 🔑 需要 | Together AI 平台 |

---

## 🚀 快速開始

### 方法 1：透過 UI 設定（推薦）

1. **登入應用程式**
2. **點擊設定圖示** ⚙️
3. **點擊「配置 Provider」按鈕**
4. **選擇您想要的 Provider**
5. **填寫必要資訊**：
   - API URL（如果需要自訂）
   - API Key
   - 預設模型
   - Temperature（0-2）
   - Max Tokens
6. **點擊「檢查連接」** 測試設定
7. **點擊「保存設置」**

### 方法 2：透過環境變數

在 `.env` 檔案中設定：

```env
# LLM Provider 類型
LLM_PROVIDER=ollama

# 或
LLM_PROVIDER=openai
LLM_PROVIDER=anthropic
LLM_PROVIDER=groq
# ... 等等

# API 基礎 URL
LLM_BASE_URL=https://api.openai.com

# API Key
LLM_API_KEY=sk-xxxxxxxxxxxxxxxx

# 預設模型
LLM_MODEL=gpt-4

# 生成參數
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2048
```

---

## 📝 Provider 詳細說明

### 1. Ollama（本地）

**優點**：
- ✅ 免費使用
- ✅ 數據隱私（本地運行）
- ✅ 可自訂模型
- ✅ 離線可用

**缺點**：
- ❌ 需要本地硬體資源
- ❌ 模型大小受限於硬體

**使用方式**：
```bash
# 安裝 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 拉取模型
ollama pull llama2
ollama pull mistral
ollama pull codellama

# 啟動服務
ollama serve
```

**預設設定**：
- URL: `http://localhost:11434`
- API Key: 不需要

---

### 2. OpenAI

**優點**：
- ✅ GPT-4 等強大模型
- ✅ 穩定可靠
- ✅ 完善的文檔

**缺點**：
- ❌ 按量計費
- ❌ 數據上傳至雲端

**使用方式**：
1. 到 https://platform.openai.com 註冊帳號
2. 生成 API Key
3. 在設定中填入 Key

**預設設定**：
- URL: `https://api.openai.com`
- 支援模型：`gpt-4`, `gpt-3.5-turbo`, `gpt-4o` 等

---

### 3. Groq（極速推理）

**優點**：
- ✅ 極速推理（比 OpenAI 快數倍）
- ✅ 免費額度
- ✅ 支援開源模型

**缺點**：
- ❌ 需要 API Key
- ❌ 免費額度有限

**使用方式**：
1. 到 https://console.groq.com 註冊
2. 生成 API Key
3. 在設定中選擇 Groq 並填入 Key

**預設設定**：
- URL: `https://api.groq.com/openai`
- 支援模型：`llama3-70b`, `mixtral-8x7b` 等

---

### 4. Anthropic Claude

**優點**：
- ✅ 強大的推理能力
- ✅ 長上下文支援
- ✅ 優秀的程式碼生成

**缺點**：
- ❌ 按量計費
- ❌ 需要 API Key

**使用方式**：
1. 到 https://console.anthropic.com 註冊
2. 生成 API Key
3. 在設定中選擇 Claude 並填入 Key

**預設設定**：
- URL: `https://api.anthropic.com`
- 支援模型：`claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku` 等

---

## 🔄 切換 Provider

### 方法 1：在設定中切換

1. 點擊設定圖示 ⚙️
2. 點擊「配置 Provider」
3. 選擇新的 Provider
4. 填寫必要資訊
5. 點擊「保存設置」

### 方法 2：透過 API

```bash
# 獲取可用的 Provider 列表
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/providers

# 更新 Provider 設定
curl -X POST http://localhost:3001/api/providers/update \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "type": "openai",
       "baseUrl": "https://api.openai.com",
       "apiKey": "sk-xxx",
       "model": "gpt-4",
       "temperature": 0.7,
       "maxTokens": 2048
     }'

# 檢查連接
curl -X POST http://localhost:3001/api/providers/check \
     -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚙️ 進階設定

### 環境變數詳解

```env
# Provider 類型
LLM_PROVIDER=ollama

# API 基礎 URL（根據 Provider 自動設定，可自訂）
LLM_BASE_URL=http://localhost:11434

# API Key（如果需要的話）
LLM_API_KEY=your_api_key_here

# 預設模型
LLM_MODEL=llama2

# 生成溫度（0-2，越高越有創造性）
LLM_TEMPERATURE=0.7

# 最大 Token 數
LLM_MAX_TOKENS=2048
```

### Provider 特定的設定

#### Ollama
```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama2
```

#### OpenAI
```env
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4
```

#### Groq
```env
LLM_PROVIDER=groq
LLM_BASE_URL=https://api.groq.com/openai
LLM_API_KEY=gsk_xxx
LLM_MODEL=llama3-70b
```

---

## 🛠️ 故障排除

### 問題 1：連接失敗

**症狀**：點擊「檢查連接」顯示失敗

**解決方法**：
1. 檢查 API URL 是否正確
2. 檢查網路連接
3. 檢查 API Key 是否有效
4. 查看伺服器日誌

### 問題 2：模型列表為空

**症狀**：模型下拉選單為空

**解決方法**：
1. 檢查 Provider 連接是否正常
2. 對於 Ollama，確保已拉取模型：`ollama pull llama2`
3. 查看 API 回應格式是否正確

### 問題 3：生成錯誤

**症狀**：發送消息後出現錯誤

**解決方法**：
1. 檢查 API Key 是否有效
2. 檢查模型名稱是否正確
3. 查看伺服器日誌獲取詳細錯誤
4. 檢查 Token 餘額（雲端 Provider）

---

## 📊 性能比較

| Provider | 速度 | 成本 | 隱私 | 推薦場景 |
|:---|:---:|:---:|:---:|:---|
| Ollama | ⭐⭐⭐⭐⭐ | 💰免費 | ⭐⭐⭐⭐⭐ | 本地開發、隱私敏感 |
| Groq | ⭐⭐⭐⭐⭐ | 💰💰免費額度 | ⭐⭐⭐ | 快速測試、高併發 |
| OpenAI | ⭐⭐⭐ | 💰💰💰 | ⭐⭐ | 通用、穩定 |
| Claude | ⭐⭐⭐ | 💰💰💰 | ⭐⭐ | 長文本、程式碼 |
| DeepSeek | ⭐⭐⭐⭐ | 💰💰 | ⭐⭐ | 中文場景、性價比 |

---

## 🔄 更新日誌

### v1.0.0 (2026-04-20)
- ✅ 新增多 Provider 支援
- ✅ 新增 Provider 設置 UI
- ✅ 新增連接測試功能
- ✅ 支援 8 個主要 Provider

---

## 📚 相關資源

- [Ollama 官方文檔](https://ollama.ai/docs)
- [OpenAI API 文檔](https://platform.openai.com/docs)
- [Groq 官方文檔](https://console.groq.com/docs)
- [Anthropic API 文檔](https://docs.anthropic.com)

---

**祝使用愉快！如有問題請隨時反饋。** 🚀
