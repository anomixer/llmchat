# LLMChat

一個具有玻璃擬態設計的現代化本地大語言模型聊天應用程式，基於 React + Node.js + Ollama，提供美觀且功能完整的聊天體驗。

## 🌟 功能特色

- **現代化聊天介面**: 類似 ChatGPT 的設計，上方顯示對話內容，下方有輸入框和設定區域
- **玻璃擬態設計**: 現代化的玻璃擬態視覺效果，搭配主題適應的漸層背景（亮色模式藍色，暗色模式紫色），提供沉浸式聊天體驗
- **全螢幕優化**: 最大化利用螢幕空間，實現真正的全螢幕聊天體驗
- **模型狀態顯示**: 標題欄顯示當前使用的 AI 模型，點擊可快速開啟設定
- **多對話管理**: 支援創建、切換和刪除多個獨立對話
- **對話歷史持久化**: 自動保存對話記錄到本地儲存
- **檔案上傳功能**: 支援上傳文件並以小字顯示檔名，可收合展開，提供對話上下文
  - **支援格式**: 圖片檔案 (image/*)、文字檔案 (text/*)、PDF 檔案、JSON 檔案
  - **檔案大小限制**: 最大 50MB
  - **訊息長度限制**: 包含檔案內容後的完整訊息不能超過 4000 字符
  - **PDF檔案說明**: PDF檔案會顯示檔案名稱，但內容無法在瀏覽器中直接解析。如需分析PDF內容，建議先將PDF轉換為文字檔案
- **語音輸入/輸出**: 支援語音輸入和文字轉語音功能
- **實時串流回應**: 以實時串流顯示AI回應，提供類似打字機的效果，自動滾動跟隨最新內容
- **思考過程顯示**: 支援顯示AI的思考過程，可收合展開，支援實時流式顯示
- **Markdown 支援**: 完整的 Markdown 語法支援，包括程式碼高亮和格式化顯示
- **智能滾動控制**: 訊息串流時自動下捲，用戶在生成過程中往上滾動會禁用自動下捲，生成完成後滾動到距離底部2%範圍內會重新啟用自動下捲。首次開啟app或開啟新對話時都會自動啟用滾動功能
- **程式碼複製功能**: Markdown 中的程式碼區塊提供一鍵複製按鈕，方便使用
- **暗色主題**: 完整的暗色主題支援，主題偏好自動保存
- **鍵盤快捷鍵**: 支援多種快捷鍵操作，提升使用效率
- **導出對話記錄**: 支援導出為JSON和Markdown格式
- **即時對話**: 支援與本地 Ollama 模型進行即時對話
- **靈活設定**: 可調整模型、溫度、Token 數量等參數
- **響應式設計**: 支援桌面和移動裝置
- **清除功能**: 一鍵清除對話記錄
- **錯誤處理**: 完善的錯誤提示和處理機制

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

### 後端
- **Node.js + Express** - API 伺服器
- **Ollama SDK** - 本地 LLM 整合
- **CORS** - 跨域資源分享
- **Axios** - HTTP 客戶端

## 📋 系統需求

- **Node.js** 16.0.0 或更高版本
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

### 5. 開啟瀏覽器

應用程式將自動在瀏覽器中開啟，或手動訪問：
- 前端：http://localhost:3000
- 後端 API：http://localhost:3001

## 📁 專案結構

```
llmchat/
├── src/                   # 前端原始碼
│   ├── App.tsx            # 主應用元件
│   ├── MarkdownMsg.tsx    # Markdown 渲染組件
│   ├── main.jsx           # 應用程式入口
│   └── index.css          # 全域樣式（包含玻璃擬態設計）
├── server/                # 後端原始碼
│   ├── index.js           # Express 伺服器
│   ├── chatProvider.js    # 聊天邏輯
│   └── ollamaProvider.js  # Ollama 整合
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

範例 `.env` 檔案：
```env
OLLAMA_API_URL=http://localhost:11434
OLLAMA_API_KEY=your_api_key_here
VITE_ALLOWED_HOSTS=llmchat.example.com,your-domain.com
```

> **注意**: 環境變數會自動載入，前端設定面板會預填這些值，但用戶仍可修改並保存到本地儲存。VITE_ALLOWED_HOSTS 用於配置 Vite 開發服務器允許訪問的主機，解決跨域訪問問題。

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

在 `server/index.js` 中，您可以調整：

- **服務端埠口**: 預設 3001
- **CORS 設定**: 跨域訪問控制
- **請求超時**: 30秒
- **環境變數**: 支援 OLLAMA_API_URL 和 OLLAMA_API_KEY

在 `server/ollamaProvider.js` 中，您可以調整：

- **Ollama 連接**: 通過環境變數或預設值設定
- **生成參數**: temperature, top_p, repeat_penalty
- **Context 控制**: num_ctx 與 maxTokens 同步設定
- **Token 限制**: num_predict 根據用戶設定動態調整

## 🎯 API 端點

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
  "apiKey": ""
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

### v251118

- ⚡ **效能大幅優化**: 添加 React.memo 和防抖處理，解決長內容滾動和輸入的 laggy 問題
- 🔧 **組件優化**: MarkdownMessage 組件添加記憶化，提升渲染效能
- 🎯 **智能狀態管理**: 使用 useRef 優化串流狀態存儲，避免狀態更新時機問題
- 🔄 **即時串流解析**: 支援思考標籤的實時串流解析，提供流暢的思考過程顯示體驗
- 📝 **智能內容分離**: 自動解析 `<think>思考內容</think>最終內容` 格式，將思考過程顯示在專用框框中
- 🧠 **增強思考過程支援**: 新增對 deepseek/qwen3 等 thinking 類 LLM 模型的 `<think>` 標籤解析支援
- 🧠 **思考過程修復**: 修復原生 thinking 模型（如 kimi-k2-thinking）在串流完成後思考過程消失的問題
- 🎯 **向後相容**: 保持對原生 thinking 字段模型的支援，同時擴展到更多模型
- 📜 **滾動體驗改進**: 將自動滾動重新啟用值調成滾動到98%位置，提供更靈活的控制
- 🎨 **載入畫面改進**: 新增美觀的暗色模式載入畫面，提供更好的用戶體驗

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


## � 未來功能

- [ ] UI再改良
- [ ] 支援更多Provider的模型
- [ ] 支援更完善的Chat功能，如網路搜尋
- [ ] 支援更進階的功能，如MCP等

## 📝 注意事項

1. **硬體要求**: 大型模型需要足夠的 RAM（建議 8GB 以上）
2. **首次使用**: 首次啟動模型可能需要下載，請耐心等待
3. **安全**: 這是本地應用，數據不會上傳到雲端
4. **性能**: 模型大小會影響響應速度

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License - 詳見 LICENSE 檔案

---

**享受與本地 AI 模型的美觀對話體驗吧！** ✨
