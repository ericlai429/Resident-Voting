# 社區區權會手機線上投票系統 (Resident Voting System)

> 專為台灣社區「區分所有權人會議（區權會）」打造的高可靠度、高併發手機電子表決與法定決議紀錄系統。  
> 預載示範案場：**新北市淡水區淡金路21號「淡水清淞社區」（總戶數 493 戶，地上 29 層、地下 5 層）**。

---

## 🌟 核心特色與法規遵循

### 1. 台灣《公寓大廈管理條例》雙門檻法定衝量
- **人數門檻（專有部分戶數）**：以戶為單位計算法定出席率與得票率。
- **權利門檻（建物權狀持分坪數）**：精準依據權狀專有加上公設持分坪數換算各戶權重（例如 13.4 坪 ~ 42.0 坪各異）。
- **雙門檻自動判定**：大螢幕與 A3 報表同時呈顯「出席戶數比例」與「權利持分比例」，符合法規第 31 / 32 條規定。

### 2. 住戶端通用設計 (Universal Design UI/UX)
- **大按鈕規格**：主要觸控熱區不小於 56px ~ 64px，防長輩手抖誤觸。
- **視覺清晰與高對比**：提供「正常 / 大字 / 特大字」三段字級切換，並內建「黑金高對比模式」。
- **防誤投二度確認**：點選任一選項後，強制彈出大字二度確認彈窗，送出後即刻上鎖並蓋上法定電子時間戳章。

### 3. 三重防作弊與身分驗證體系
- **當日 4 碼現場防灌票 PIN 碼**：由現場大螢幕公布或主席口頭宣布，當日 23:59:59 CST 自動失效，遠端未到場者無法隨意灌票。
- **手機特徵碼內碼綁定 (Device Fingerprint)**：初次登入自動綁定設備特徵 UUID，同戶號若遭第二隻裝置嘗試登入，系統跳出防代投警示並鎖定。
- **個人專屬登入 QR 憑證**：登入後可產生並截圖保存專屬 QR 碼；誤關瀏覽器或換機時，直接掃碼即可免打字秒速還原登入身分。
- **服務台一鍵解綁**：現場總幹事或主委（Admin / Admin1）可在後台一鍵替長輩更換手機或解綁重置。

### 4. Excel 智慧名冊匯入與自動欄位對照 (SheetJS)
- 支援上傳 `.xlsx` / `.xls` / `.csv`。
- 自動以正規表達式識別常規欄位：「戶號/棟別」、「樓層」、「所有權人姓名」、「手機電話（擷取末四碼）」、「權狀持分坪數」、「登記地址」。
- 自動核算權重比例，並支援一鍵匯出含報到狀態與重置 Token 之 Excel 清冊。

### 5. 多社區租戶架構 (Multi-Tenant)
- 支援主委與總幹事在後台切換多社區（如：淡水清淞社區、花園新城等），或一鍵新增第二、第三社區。

### 6. 開會現場投影大螢幕即時戰情報告 (Realtime Screen)
- 專為大會投影布幕設計之黑底高對比儀表板。
- 即時跳動得票長條圖、出席統計、法定開會成立燈號指示。

### 7. A3 橫式法定會議紀錄報表 (297mm × 420mm)
- 嚴格依照主管機關報備審查格式排版。
- 具備大會召集人（主席）、總幹事（記錄）、監察委員（監票）三方簽章備查欄。
- 支援瀏覽器原生列印直接匯出向量 A3 橫向高解析 PDF。

### 8. 離線防偽：高密度結算 QR Code (LZ-String) 與手機相機 OCR 還原
- **高密度 QR 碼**：結算後將整場會議的時間、地點、出席率、所有議案票數與權重壓縮至單一 QR 碼（前綴 `MTG:`）。即使現場斷網，住戶或稽查人員以手機相機掃描即可秒速還原會議紀錄。
- **手機拍照 OCR 還原**：整合 `tesseract.js`，住戶拍攝紙本簡報或投影幕，系統自動擷取案名、贊成票、反對票與最終決議。

---

## ⚡ Supabase 資料庫 · 雲端後端串接

系統採用 **Local-First（離線優先） + Supabase 雲端動態同步** 雙層架構。未填寫金鑰前已預載清淞社區完整資料可供離線體驗；填入 Supabase 連線後自動無縫切換雲端同步！

### 步驟 1：建立 Supabase 專案並執行 SQL
1. 前往 [Supabase 官網](https://supabase.com/) 登入並建立專案。
2. 進入專案左側選單的 **SQL Editor**。
3. 將本專案中的 [`supabase/schema.sql`](./supabase/schema.sql) 完整內容貼上並點擊 **Run**。
4. 腳本將自動建立：
   - 6 張主表：`communities`, `meetings`, `members`, `topics`, `topic_options`, `votes`。
   - 完備的 Row Level Security (RLS) 權限防護政策。
   - 樂觀鎖與 Transaction 原子性防並發防重複投票預存程序 `submit_vote_secure`。
   - 啟用 Realtime WebSocket 監聽。

### 步驟 2：串接 API Key
- **方式一（免重新編譯）**：在前端頁面右上角點擊「Supabase 資料庫」圖標，直接貼入您的 `Project URL` 與 `Publishable/Anon Key`，點擊「測試連線」成功後即可保存套用。
- **方式二（環境變數）**：複製 `.env.example` 為 `.env`：
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

---

## 🚀 本地開發與構建

```bash
# 1. 安裝所有依賴套件
npm install

# 2. 啟動本機開發伺服器
npm run dev

# 3. 編譯生產環境產物
npm run build
```

---

## 📦 推上 GitHub 倉庫

本專案倉庫位址：[`https://github.com/ericlai429/Resident-Voting`](https://github.com/ericlai429/Resident-Voting)

```bash
git init
git add .
git commit -m "feat: complete community mobile voting system with universal design, multi-tenant & supabase"
git branch -M main
git remote add origin https://github.com/ericlai429/Resident-Voting.git
git push -u origin main
```
