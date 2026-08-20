# LLMChat 更新日誌 (Changelog)

本文檔記錄了 LLMChat 的版本演進與功能更新歷史。

---

### v260820

- 🔒 **安全加固**:
  - 將 7 個原本未授權的端點納入 `authenticateToken` 保護（`/api/user/settings`、`/api/user/conversations`、`/api/providers/current`、`/api/models` 等）。
  - 移除 `server.ts` 中無條件回傳 API Key 的 `/api/config` 端點（避免未授權洩漏金鑰）。
  - Provider API Key 與 `oauthConfig`（含 token）改由 `X-Provider-ApiKey` / `X-Provider-Oauth-Config` header 傳送，不再放入 URL query（避免洩漏到瀏覽器歷史/代理日誌）；server 端 header 優先、query 保留為舊版相容 fallback。

- 🏗️ **前端重構（App.tsx 2066 → 1507 行）**:
  - 抽出 3 個元件：`ConversationsPanel`、`SettingsPanel`、`MessagesPanel`（訊息列表 + 串流 + 語音按鈕），props 全型別化。
  - 清除死碼：移除孤兒元件 `ProviderSettings.tsx`（211 行）、8 個未使用的 import、`useSpeech` 的 `voiceButtonIcon` 無意義包裝、`showModelOnly` 半成品功能（接線但無按鈕觸發）。
  - `Admin.tsx` 兩份重複的 provider URL 預設表合併為單一 `PROVIDER_URLS`（type-key）；`isVisionModel` 修正 `'vl'` 子串誤傷 vLLM 的問題。

- 🐛 **Bug 修復**:
  - 修復 `Admin.tsx` 的 **Rules-of-Hooks 違規**（資料載入 `useEffect` 原在 `if (!admin) return` 之後，session 過期時會崩潰）；移至 guard 之前。
  - `Admin.tsx` `saveProviderSettings` 補上缺失的 `else` 分支，非 admin(403)/參數錯(400)/500 不再靜默失敗。
  - `useConversations` 的「每次 conversations 改變就 POST」改為**防抖 + 卸載補存**，消除多餘流量且確保不丟失變更。
  - `App.tsx` 訊息 ID 改用 `makeMessageId()`（時間戳 + 遞增計數），避免同一毫秒建立多則訊息時 ID 碰撞。
  - `useChatStreaming` 的 context token 指示器改用真實 `userSettings.maxTokens`（原硬編碼 8192）；`useSpeech` 移除未卸载的 `BroadcastChannel` 監聽器（泄漏）。

- 📝 **文件重構**:
  - `README` 雙語拆為 `readme.md`（繁中）與 `readme_en.md`（英文），頂部互設交叉連結。
  - `CHANGELOG.md` 收斂（352 → 137 行）：近 6 版保留完整、早期 19 版收為一行式摘要。
  - 網路搜尋地球 icon 改為靜態（移除 `animate-pulse` 呼吸燈）。

- 🌐 **國際化（i18n）完整覆蓋**:
  - 補全 `/compact` 對話壓縮、`/compact` 相關提示、`header.contextUsage`（Context 用量指示器 tooltip）與 `system.summarizationPrompt` 的 5 語翻譯（zh-TW/zh-CN/en/ja/ko），此前 en/ja/ko 皆 fallback 成中文。
  - 全面掃描 `code` 所有 `t('key')` 使用點，補齊 `admin.*`（管理面板）、`common.*`、`header.model.*`、`conversation.export.*`、`input.files.pdfNote` 等遺漏 key，五語 0 缺口。
  - Header 的 `app.title`/`app.version` 改用 `APP_CONFIG` 常數（版本號為動態值，不應硬編進語系檔而過時）。
  - 日文/韓文文句重寫為自然表達，移除混入英文的「Context の空き」等不自然句。

- ✅ **型別健康**: 前端 `tsc --noEmit` 由 baseline 7 個 error 降至 0；server 端 0 error；`vite build` 通過。


### v260809

- 📊 **新增 Context 用量指示器 (Context Token Usage Indicator)**:
  - 於左上方模型選單右側新增一個用量指示器，即時顯示當前對話已消耗的 Token 數量以及所佔最大上下文 (Max Context Size) 的百分比比例，格式為：`"xxxK (nnn%)"`。
  - 對話總 Token 包含了系統提示詞 (System Prompt)、歷史對話、以及當前正在串流中的文字，生成時可即時跳動更新。
- 🗜️ **對話壓縮功能 (`/compact`)**:
  - 當點擊 Context 用量指示器，或是使用者手動輸入 `/compact` 指令時，會自動觸發歷史對話壓縮（對話摘要）。
  - 系統會調用 AI 將目前的對話記錄摘要成一段緊湊的「歷史摘要」，並將其作為 `System Prompt` 注入或作為隱藏的歷史起點，隨後清空過往詳細對話，將上下文佔用比例重置到最低，解決長對話爆 Token 限制的問題。
- ⚡ **預設 Context Size 調整為 8K (8192)**:
  - 將全系統（包含前端 Slider、後端服務回退設定、ProviderManager 的 fallback 等）的預設 Context Size (maxTokens) 全面調整為 `8192` (8K)。
- 🔄 **模型狀態同步大重構 (Model State Synchronization Overhaul)**:
  - **Single Source of Truth**：徹底移除了從 `adminProviderSettings` localStorage 快取強行讀取並覆蓋 `model` 的舊邏輯，改由 Server (`/api/user/settings`) 讀取的 `userSettings` 作為 model 的唯一權威來源。
  - **消除 Race Condition**：重構 `App.tsx` 中的 `loadUserSettings` 觸發條件，採用 `settingsLoadedRef` 防止驗證與對話加載同時完成時條件失效的問題。
  - **Admin Provider 儲存同步**：Admin 頁面儲存 LLM Provider 設定時，透過 `modelListUpdated` 自訂事件帶入 `selectedModel`，頁首 Header 模型標籤即時同步，無需 F5 重整。
- 🐛 **Bug 修正 (發送端重複發送與 Token 估算跳動)**:
  - 修正了發送請求時，最新使用者 Prompt 被重複組裝到 `history` 載荷中發送兩次的 Bug，大幅節省 Token 消耗。
  - 修正了串流生成前後，由於未儲存的 `streamingMessage` 殘留以及助理 `msg.tokenCount` 低估所引起的「Token 用量顯示跳水/跳動」的問題。
- 📝 **文件同步更新**：同步更新 `package.json` 與 `CHANGELOG.md` 並更新版號。

---

### v260723

- 🔑 **地端 LLM 引擎支援選填 API Key (Optional API Key for Local Engines)**:
  - 允許使用者在配置本地 `Ollama`、`vLLM`、`SGLang` 與 `LM Studio` 時輸入選填（Optional）的 API Key。
  - 後端已完成對齊，在發送請求給 `vLLM`、`SGLang`、`LM Studio` 等地端服務時，會自動附加該選填的 `Authorization: Bearer <apiKey>` 標頭，以利支援前端有自建驗證代理（Reverse Proxy）或 API 閘道的部署環境。
- 📝 **文件同步更新**：同步更新 `package.json` 與 `CHANGELOG.md` 並更新版號。

---

### v260702

- 🛠️ **模型設定與參數解析優化 (Fix Ollama Cloud & 400 parameter errors)**:
  - 修正了 `OllamaProvider` 錯誤地將 `maxTokens`（Context Size）同時套用到 `num_predict` 與 `num_ctx` 的問題。現在只會將 Context Size 設定給 `num_ctx`，解決了 Ollama Cloud 上 `:cloud` 模型及部分 OpenAI 相容 API（如 9router/Groq）因 Context 設太大而觸發單次輸出上限（HTTP 400 Bad Request）的 Bug。
- 👁️ **API 錯誤診斷機制大提升**:
  - 重構後端 Axios 串流錯誤攔截器，當 API 串流發送發生錯誤時（如 400, 401 等），會自動完整讀取 upstream 伺服器回傳的錯誤主體（Details），並附加到錯誤資訊中回傳。
  - 前端配合將底層詳細錯誤資訊直接呈現在對話卡片上，取代原本含糊的「抱歉，發生錯誤。請檢查後端服務是否正常運行。」，供使用者即時診斷 API 連線與參數問題。
- 📅 **防止日期幻覺與 Ambiguity 警告 (Prevent Date Hallucination)**:
  - 後端 `chat.ts` 路由在發送對話時，會自動獲取伺服器當前系統時間並以 `YYYY年M月D日` 格式注入 System Prompt，並在月日小於等於 12 且不相等時（如 7 月 2 日）附帶月日防混淆警告，防止 AI 模型將日期誤判（如把 7 月 2 日認成 2 月 7 日）。
- 🎨 **UI 介面微調 (Max Context Size 與選單寬度優化)**:
  - 將 UI 及多國語系 locale 檔中的「Max Tokens (Context Size)」全面更名為更精確的 **「Max Context Size」**。
  - 修正了 Admin 設定頁面在按下儲存時，因快取更新順序不對而導致畫面狀態短暫回復成舊值的 UI 狀態顯示 Bug。
  - 將頂部 Title 旁的模型選單下拉寬度由 `w-48`（192px）加寬至 **`w-80`（320px）**，並加上 `overflow-x-hidden`，徹底解決長模型名稱（如 `nvidia/minimaxai/minimax-m2.7`）在選單內折行或下方冒出左右滾動條的視覺問題。
- 📝 **文件同步更新**：同步更新 `README.md`、`api.md` 與 `CHANGELOG.md` 並更新版號。

---

### v260618

- ✨ **Refine Auth Provider UX & i18n**: 
  - Removed deprecated Google Gemini OAuth and ChatGPT Web Session frontend logics completely to simplify the UI.
  - Consolidated GitHub Copilot authentication into the standard `api-key` method. Users can now simply provide their GitHub PAT with `ghp_` prefix without using a dedicated OAuth field.
  - Implemented smart UI fallback for Auth Methods: automatically resets incompatible authentication methods to `api-key` when switching providers to prevent UI state mismatches, and seamlessly migrates legacy `github-copilot-oauth` states.
  - Eliminated hardcoded strings and completed full i18n support across 5 locales (en, zh-TW, zh-CN, ja, ko) for all UI components, ensuring language persistence across page reloads and backend synchronization.

- 👤 **OAuth 帳號綁定基礎設施**：新增 `server/oauthService.js`，目前用於處理 GitHub Copilot 驗證流程與後端記憶體儲存。
- 📝 **文件同步更新**：同步更新 `README.md`、`api.md` 與 `CHANGELOG.md`。
- 🛑 **前後端智慧串流中斷與連線關閉機制優化**：修復了當關閉「地球」（聯網搜尋）時，連線會被 prematurely 判定為中斷而拋出 canceled 錯誤的 Bug。此問題源自於原先監聽 `req.on('close')` 在 Body 解析完畢後即會觸發；我們已將監聽對象修正為回應對象 `res.on('close')`，確保 any Provider 在未開啟聯網搜尋的情況下均能穩定串流輸出。
- ☁️ **Ollama Cloud 設定與 API Key 認證調整**：將 Ollama Cloud 的預設端點由原先 `http://your-ollama-server:11434` 變更回官方端點 `https://ollama.com`，並將其自本地免密鑰清單（`LOCAL_NOAUTH_PROVIDERS`）中移除，使前端與後端管理介面均強制要求輸入 API Key，以符合官方雲端認證的要求。
- 🐙 **新增 GitHub Copilot 服務與 OAuth 驗證支援**：
  - 引進 `github-copilot` 獨立 Provider，提供專屬的連線探針與預設常用模型列表（`gpt-4o`, `claude-3.5-sonnet`, `o1-mini`, `o1-preview`），避開其不支援標準 `/models` 端點導致的連線測試失敗。
  - 新增 `github-copilot-oauth` 認證方法，串接後端 `TokenService` 自動利用 GitHub OAuth/PAT Token 向 GitHub API 交換臨時的 Copilot 階段金鑰，並於 Axios Interceptor 中自動帶入對應的 Authorization Bearer Token 以及 VSCode 編輯器特定的 HTTP Header（如 `Editor-Version`、`Editor-Plugin-Version`、`User-Agent`）。
  - 對於以 `gho_` / `ghp_` 等前綴之 GitHub 金鑰，實施自動辨識與攔截換證機制，並配合 AES-256-CBC 進行去敏感與安全資料庫存儲。
- 🔒 **補全多 Provider 雲端與 OAuth 驗證說明**：於 API 文件中明確釐清與補全 OpenAI (`azure-entra-id`)、Gemini (`google-service-account`) 與 GitHub Copilot (`github-copilot-oauth`) 等 OAuth 與雲端 IAM 驗證的架構規格。
- 🗑️ **移除實驗性個人帳號登入支援**：因第三方防護限制（如 Cloudflare 盾）及高維護成本，正式移除 Google 個人帳號 OAuth 與 ChatGPT 網頁版 Session 登入功能，確保連線穩定性與系統安全。

---

### v260602

- 🛑 **前後端智能串流中斷機制優化**：修復了 AI 在進行串流生成（Inference）時，前端按 Stop 按鈕或點擊垃圾桶清除歷史紀錄，後端卻仍在持續推理的問題。在後端 `/api/chat/stream` 監聽客戶端斷開 `req.on('close')` 並調用 `abort()`；且在前端清除/刪除對話函數中主動發送終止請求，確保前後端同時中斷。
- 🔌 **AI Provider 架構重構與路徑拼接優化**：重構 `BaseProvider` 的 `baseURL` 處理邏輯，由原先強制截除 `/v1` 改為僅去除尾部斜線，並將各 Provider 的 API 相對路徑（如 `/models`、`/chat/completions`、`/api/tags`）解耦至 `PROVIDER_ENDPOINTS` 中。解決了非 `/v1` 結尾的 API（如 Google Gemini 的 `.../v1beta/openai`）在獲取模型列表時會拼接出錯誤路徑導致 404 報錯的問題。
- 🔑 **全新新增 DeepSeek 支援**：正式引入 `deepseek` 服務商，預設 API 端點為 `https://api.deepseek.com/v1`，支援模型列表獲取與對話生成。
- ⚙️ **Ollama Cloud 與多 Provider 預設值修正**：將 Ollama Cloud 的預設端點修正為 `http://your-ollama-server:11434`；同時同步更新管理後台與多 Provider 路由的預設端點（包含 Gemini、Vercel/Cloudflare AI Gateway 等），確保路徑格式與本地/雲端部署環境一致。
- 👥 **管理員使用者 CRUD 控制面板**：在管理面板中增加「新增」、「編輯」（重設密碼與修改角色）以及「刪除」使用者的功能，補全了先前僅能檢視使用者清單的缺失。
- 🎨 **暗黑模式 UI 視覺修正**：修正了暗黑模式下，使用者新增與編輯 Modal 中「取消」按鈕文字顏色隱形看不見的 Bug。
- 📁 **專案文件架構重構與瘦身**：
  * 將原本長達 900 多行、過於臃腫的 `README.md` 進行重構，將原先 40 多點的繁瑣「功能特色」縮減為 7 大精煉板塊。
  * 將 200 多行的後端 API 規格移出至根目錄 [api.md](file:///c:/dev/llmchat/api.md)。
  * 將歷史版本更新日誌移出至獨立的 [CHANGELOG.md](file:///c:/dev/llmchat/CHANGELOG.md)。
  * 將文檔中的「用戶」、「數據」等字詞統一修正為符合台灣語境的「使用者」、「資料」。
- 🌐 **國際化雙語 README**：將 `README.md` 重構為 **英文在前、中文在後** 的雙語結構，頂端附帶 `[English](#llmchat-english) | [繁體中文](#llmchat-繁體中文)` 頁面內跳轉連結。且配合排版精簡，英文版保留單張 `screenshot-2.png` 截圖，中文版保留單張 `screenshot-1.png` 截圖。
- 🔧 **環境變數配置補全**：在 `.env.example` 與 `README.md` 中補上了遺漏的 `PORT`、`SERVE_STATIC` 與 `DEBUG_STREAM` 環境變數說明，並在配置說明中新增了「生產環境部署建議」引導。
- 🐳 **Docker 執行部署指引**：在 README 中新增了簡單的 Docker 映像檔建置與掛載本地資料夾啟動容器的命令指引。

---

### v260601

- 🔌 **前後端連接埠架構重構**: 統一前端運作埠口，無論是開發模式還是 `npm start` 生產模式，前端均固定在 `http://localhost:3000` 運行；後端 API 則固定在 `http://localhost:3001` 運行，避免埠口衝突與混淆。
- 🐳 **Docker 部署支援優化**: 在 `Dockerfile` 中加入 `SERVE_STATIC=true` 開關。當在 Docker 容器內運行時，Express 伺服器會自動靜態託管編譯後的前端檔案，使得容器對外只需暴露單一的服務埠口 (如 8080)；同時優化依賴安裝以縮小映像檔體積。
- ☁️ **雲端安全認證整合**: 管理員設定頁面新增雲端平台認證方式選擇。支援 Google Vertex AI、AWS Bedrock、Azure OpenAI 三大雲端平台，讓管理員改用雲端平台的身份驗證機制（如服務帳號、IAM 角色）取代直接填寫靜態 API Key，提升金鑰安全性，適合企業部署情境。
- 🔑 **首位管理員免驗證自動啟用**: 當資料庫無用戶時，首位註冊用戶將自動設為已驗證且已啟用的 `admin` 管理員角色，無須經由 Email 驗證，並在前端展示專屬的歡迎與引導登入畫面，完美避開因本地未配置 SMTP 服務而產生的註冊死鎖與驗證報錯。
- ⚙️ **SMTP 動態啟用註冊**: 優化後端 SMTP 配置檢測，避免每次請求都進行慢速的 SMTP 連線測試造成介面延遲，並在系統尚無用戶時，即使無 SMTP 設定也強制顯示註冊按鈕，確保能順利建立管理員。
- 📊 **錯誤訊息與 Token 統計解耦**: 修復了 AI 消息出錯（例如伺服器斷線）時，卡片誤算並在下方顯示 global Token 統計值的 Bug，同時將串流期間的動態 Token 統計功能正確地融合於正在生成的消息框內。
- 🚀 **全新 `npm start` 支援**: 在 `package.json` 中加入了專屬的 `"start"` 腳本（`npm start`），並引入自動開啟瀏覽器至 `http://localhost:3000` 的功能，提供比 `npm run dev` 更簡便的獨立本機運行體驗。
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

## 🗂️ 早期版本（v260425 ~ v1.0.0，精簡摘要）

以下為 2025 年初期開發版本，各以一行摘要重點：

- **v260425** — 多 Provider 深度串接（OpenAI / NVIDIA NIM / Anthropic / Google Gemini）、原子化儲存、Admin 設定持久化、管理介面完整 i18n。
- **v251230** — Ollama `apiUrl`/`apiKey` 成對綁定、API Key AES-256-CBC 加密、(用戶 → Admin → .env) 層級繼承。
- **v251227** — Token 數/生成速度實時顯示、Token 統計開關、單則訊息刪除。
- **v251222** — 註冊成功訊息修正、登入時預設設定載入修復。
- **v251213** — 後端統一為 `server/src/start.ts` 入口、前端 Hooks 重構（串流/對話/語音/UI）。
- **v251208** — 修復 AI 無法讀取附檔內容、隱藏檔案內容保護隱私、多輪上下文記憶。
- **v251130** — 語音合成過濾 Markdown 符號、串流防抖、JSON 解析自動恢復。
- **v251128** — 登入畫面主題/語言自動適應、管理員介面精簡、手機選單分組。
- **v251126** — 完整多語言認證流程（5 語系）、動態驗證頁面、驗證鏈接語言同步。
- **v251125** — 響應式收合 Header、完整密碼管理、點擊模型名快速切換。
- **v251124** — 語音隊列系統（依序播放）、跳過/清除隊列、跨標籤頁 BroadcastChannel 同步。
- **v251123** — API 設定欄位限管理員可見（紅框標示）、Vite WebSocket 修復。
- **v251121** — 個人對話分檔（`{email}.json`）、個人設定系統、多語言驗證郵件、24h 令牌過期。
- **v251120** — 使用者認證系統（註冊/登入/Email 驗證/SMTP）、個人化對話、管理員角色與 CRUD。
- **v251119** — 全螢幕沉浸模式、完整 5 語系國際化、語音語言同步、日期本地化。
- **v251118** — 效能優化（React.memo / 防抖）、`<think>` 思考過程實時解析。
- **v1.2.0 (2025-11-17)** — Markdown 完整支援、串流智能滾動、程式碼一鍵複製、玻璃擬態設定面板。
- **v1.1.0 (2025-11-16)** — 玻璃擬態視覺、全螢幕沉浸、thinking 可收合顯示、GitHub 標誌連結。
- **v1.0.0 (2025-11-15)** — 初版全功能：多對話管理、實時串流、檔案上傳、語音、快捷鍵、JSON/MD 導出。
