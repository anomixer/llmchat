# API Key 和 URL 配置修復

## 問題描述
1. Ollama API Key 沒有從 .env 正確載入到 admin 的 settings 表格中
2. 雖然可以取得 model 列表，但在對話時會出現錯誤
3. 需要實現正確的配置優先順序：Admin 設定 > .env 設定 > 預設值

## 修復內容

### 1. 後端修改

#### `server/src/routes/misc.ts`
- **修改**: 將 `/api/config` 端點返回真實的 apiKey 而不是 'configured' 字串
- **原因**: 前端需要真實的 apiKey 值才能正確使用
- **變更**: `apiKey: defaultApiKey ? 'configured' : ''` → `apiKey: defaultApiKey || ''`

#### `server/src/routes/chat.ts`
- **新增**: `buildChatSettings` 函數現在接受額外參數：
  - `userService`: 用於獲取用戶和 admin 設定
  - `userId`: 當前用戶 ID
  - `defaultApiUrl`: 從 .env 載入的預設 API URL
  - `defaultApiKey`: 從 .env 載入的預設 API Key

- **實現優先順序邏輯**:
  1. Payload 中的值（前端發送的）
  2. 用戶自己的設定
  3. Admin 的設定（如果用戶不是 admin）
  4. .env 環境變數
  5. 硬編碼的預設值

- **修改**: 更新 `createChatRouter` 函數簽名以接受 `defaultApiUrl` 和 `defaultApiKey`
- **修改**: 更新兩處 `buildChatSettings` 調用以傳遞所需參數

#### `server/src/app.ts`
- **修改**: 更新 `createChatRouter` 調用，傳遞 `defaultApiUrl` 和 `defaultApiKey` 參數

### 2. 前端修改

#### `src/App.tsx`
- **修改**: `loadUserSettings` 函數現在會：
  1. 先從 `/api/config` 載入 .env 的預設配置
  2. 再從 `/api/user/settings` 載入用戶設定
  3. 實現正確的優先順序合併：
     - 如果用戶有設定值（非空），使用用戶設定
     - 否則，如果 .env 有設定值，使用 .env 設定
     - 特別處理 `apiUrl` 和 `apiKey`：確保它們總是有值

- **型別修復**: 添加 `any` 型別標註以處理動態鍵值存取

### 3. Header 修復

#### `src/components/Header.tsx`
- **修改**: 將 model list 下拉選單的 z-index 從 `z-10` 提高到 `z-50`
- **原因**: 避免被 AI 訊息框的語音按鈕遮擋

## 配置優先順序

### 對於 Admin 用戶
1. Admin 在 settings 中設定的 apiUrl/apiKey
2. .env 中的 OLLAMA_API_URL/OLLAMA_API_KEY
3. 預設值 (http://localhost:11434 / 空)

### 對於一般用戶
1. 用戶自己在 settings 中設定的 apiUrl/apiKey
2. Admin 在 settings 中設定的 apiUrl/apiKey
3. .env 中的 OLLAMA_API_URL/OLLAMA_API_KEY
4. 預設值 (http://localhost:11434 / 空)

## 測試建議

1. **測試 .env 配置載入**:
   - 在 .env 中設定 OLLAMA_API_URL 和 OLLAMA_API_KEY
   - 重啟服務器
   - 登入 admin 帳戶，檢查 settings 中是否顯示正確的值

2. **測試 Admin 設定**:
   - 以 admin 身份登入
   - 在 settings 中修改 apiUrl 和 apiKey
   - 保存後重新載入頁面，確認設定被保存
   - 嘗試發送對話，確認使用正確的 API

3. **測試一般用戶**:
   - 以一般用戶身份登入
   - 確認可以看到 admin 設定的 apiUrl/apiKey（如果 admin 有設定）
   - 或者看到 .env 的預設值
   - 嘗試發送對話，確認可以正常使用

4. **測試 Model List**:
   - 點擊 Header 中的 model 名稱
   - 確認下拉選單正確顯示，不會被語音按鈕遮擋

## 注意事項

- Admin 的 apiUrl/apiKey 設定會儲存在 `server/data/users.json` 中的 admin 用戶的 settings 欄位
- 一般用戶無法在前端看到 apiUrl/apiKey 的設定欄位（這些欄位只對 admin 顯示）
- 但一般用戶在發送對話時，後端會自動使用 admin 的設定或 .env 的設定
