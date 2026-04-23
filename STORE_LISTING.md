# Willie QR 產生器 — Chrome Web Store 上架指南

## 1. 先在本機測試

1. Chrome 開啟 `chrome://extensions/`
2. 右上角開啟「**開發人員模式**」
3. 點「**載入未封裝項目**」→ 選擇這個 `chrome_extension/` 資料夾
4. 釘選擴充功能到工具列，點圖示測試：
   - 輸入文字 / 網址是否即時產生
   - 中文 / emoji 是否能正常掃描（用手機相機掃）
   - LOGO 上傳是否自動切換到 H 容錯率
   - PNG / SVG 下載是否正常
   - 深淺色切換是否記住選擇
   - 「抓網址」按鈕是否能抓目前分頁網址

## 2. 打包 .zip

Chrome Web Store 要求上傳 .zip（不是 .crx）：

```bash
# 在 QR_Tool 目錄執行
cd chrome_extension
# Windows PowerShell
Compress-Archive -Path * -DestinationPath ../willie-qr-v1.0.0.zip -Force
# 或用檔案總管：全選資料夾內所有東西 → 右鍵 → 壓縮成 ZIP
```

**注意**：是壓縮資料夾「裡面的內容」，不是整個資料夾本身。解壓後第一層應該直接看到 `manifest.json`。

## 3. 申請開發者帳號

- 網址：https://chrome.google.com/webstore/devconsole
- 一次性註冊費：**USD $5**（可刷信用卡）
- 帳號需要「**開發者身份驗證**」：需要一組手機號碼 + 地址

## 4. 建立新項目

在 Developer Dashboard 點「**新增項目**」→ 上傳剛剛的 zip。

### 商店資訊必填欄位

| 欄位 | 建議內容 |
|---|---|
| **名稱** | Willie QR 產生器 |
| **摘要（132 字內）** | 一鍵把網址或文字變成漂亮的 QR Code，支援圓點、圓角、正圓樣式，可加入中心 LOGO，輸出 PNG 或 SVG 向量圖。 |
| **類別** | 生產力 (Productivity) |
| **語言** | 繁體中文 (zh-TW) |

### 詳細說明（可直接複製）

```
✨ Willie QR 產生器 — 做出好看的 QR Code，一鍵完成

厭倦了千篇一律、黑漆漆的正方形 QR Code？
Willie QR 產生器讓你為品牌、名片、活動海報、菜單，設計出專屬的漂亮 QR Code。

🎨 主要功能
• 即時預覽：輸入文字或網址，QR Code 立刻產生
• 多種資料點樣式：標準方塊、圓點、圓角方塊、間隔方塊
• 定位點設計：外框與內芯可獨立選擇直角、圓角、正圓
• 中心 LOGO：上傳品牌 Logo，自動調整容錯率保證可掃描
• 一鍵抓取：自動填入目前分頁的網址
• 向量輸出：PNG 點陣圖或 SVG 向量圖，想放多大都清晰
• 複製到剪貼簿：直接貼到 PPT、設計軟體
• 深色模式：長時間使用不刺眼
• 支援中文、emoji，完整 UTF-8 編碼

🔒 隱私至上
• 所有運算 100% 在你的瀏覽器本機完成
• 不會上傳你的內容到任何伺服器
• 不追蹤、不蒐集任何個人資料

適合行銷、設計師、小店家、活動策劃、工程師。

Design by Willie
```

## 5. 隱私權宣告

Chrome Web Store 要求明確勾選「資料用途」。本擴充功能的答案：

- **是否蒐集使用者資料？** 否（No user data is collected）
- **使用哪些權限：**
  - `activeTab`：僅在使用者點擊「抓網址」按鈕時讀取目前分頁網址，不會傳送到任何地方
- **資料是否會傳送到第三方？** 否
- **資料是否用於無關的用途？** 否

### 隱私權政策網址

Chrome 要求提供一個可公開訪問的網址。最簡單的做法：

1. 在 GitHub 建立一個 public repo（例如 `willie-qr-extension`）
2. 新增 `PRIVACY.md`，貼上以下內容（已幫你準備在下方）
3. 啟用 GitHub Pages（Settings → Pages → Source: main → root）
4. 把 `https://你的帳號.github.io/willie-qr-extension/PRIVACY.md` 貼進 Store 送審表單

### 隱私權政策內文（貼到 PRIVACY.md）

```markdown
# Privacy Policy — Willie QR Extension

Effective date: 2026-04-23

Willie QR 產生器 (the "Extension") is developed by Willie.

## What we collect
**Nothing.** The Extension does not collect, store, transmit, or share any personal
information, usage analytics, browsing history, or content you enter into it.

## How your data is processed
All QR Code generation happens locally in your browser. Text, URLs, and uploaded
logo images never leave your device. The Extension does not make any network
requests to external servers.

## Permissions
- `activeTab`: Used only when you click the "Fetch URL" button, to read the URL
  of the currently active tab. That URL is written directly into the input field
  and is not sent anywhere.

## Third parties
The Extension does not integrate with any third-party services, analytics, ads,
or tracking.

## Changes
If this policy ever changes, an updated version will be published here with a new
effective date.

## Contact
Questions? Open an issue at https://github.com/<your-github-username>/willie-qr-extension
```

## 6. 圖像素材（必備）

Chrome Web Store 要求：

| 項目 | 尺寸 | 數量 | 備註 |
|---|---|---|---|
| 商店圖示 | 128×128 PNG | 1 | 已在 `icons/icon128.png` |
| 商品宣傳小圖（可選） | 440×280 PNG | 1 | 出現在分類頁 |
| 商品宣傳大圖（可選） | 920×680 PNG | 1 | 精選頁 |
| 商品宣傳超大圖（可選） | 1400×560 PNG | 1 | 首頁精選 |
| **螢幕截圖（必備）** | **1280×800 或 640×400 PNG** | **至少 1 張、最多 5 張** | 建議做 3–5 張展示不同功能 |

截圖建議拍法：
1. 開啟擴充功能 → 用 Chrome 開發者工具的「裝置模式」把 popup 調大、截 1280×800
2. 或用設計軟體（Figma/PPT）把 popup 嵌進一張 mockup

## 7. 送審注意事項

- 第一次送審通常 **1–3 個工作天**
- 以下狀況會被退件：
  - manifest 裡放沒用到的權限 → 我們只放了 `activeTab`，OK
  - 描述跟實際功能不符
  - 隱私權政策連結 404
  - 截圖品質太差或有浮水印
  - 名稱包含「Google / Chrome」等保留字

## 8. 檔案清單（送審前 checklist）

- [x] `manifest.json` — 正確宣告 v3, 描述, 權限
- [x] `popup.html` / `popup.css` / `popup.js` — 介面與邏輯
- [x] `lib/qrcode.js` — QR 編碼函式庫（MIT）
- [x] `icons/icon16.png` / `icon48.png` / `icon128.png`
- [ ] 截圖 5 張（1280×800）
- [ ] 隱私權政策網址
- [ ] Chrome 開發者帳號 + $5 已付

## 9. 本地開發小抄

改完檔案後：chrome://extensions → 找到這個擴充功能 → 點「**重新載入**」（圓形箭頭） → 再點擴充功能圖示測試。

---
如需協助截圖或準備隱私權頁面，再告訴我要產生什麼。
