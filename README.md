# 〇〇日報 注音與漢字工具箱 (BoPoMo Typography IDE)

一個基於美學與設計的漢字注音排版工具與 Unicode IVS (Ideographic Variation Sequence) 探索系統。本專案將兩大核心功能整合於單一的 Single Page Application (SPA) 工作區中，共享字典與字型記憶體狀態，達成無縫切換、即時轉換與極致性能。

---

## 核心功能

### 1. 旁註編輯器 (HTML Ruby Mode)
- **多音字智慧校正**：基於教育部字典數據庫，自動進行上下文多音字判定（準確率達 99%）。
- **視覺化微調**：點擊預覽區的漢字即可於底端控制台快速點擊候選讀音，即時變更拼讀。
- **CSS 旁註渲染**：採用自訂 `<bpmf>` 屬性結構與純 CSS 絕對定位，達成極致細膩的注音/拼音字形位置校正。
- **原始碼匯出**：一鍵產生標準 HTML ruby 旁註標記代碼及 CSS 樣式表，便於貼入外部網站。

### 2. 變體瀏覽器 (IVS Mode)
- **語意與字形分離**：利用 Unicode 變體選擇子（IVS，如 `E01E0` 等）將漢字語音直接編碼於字元流中，字元剪貼與搜尋功能完全正常不受損。
- **本機動態字型切換**：支援ButTaiwan注音粉圓（`BpmfHuninn`）、芫荽（`BpmfIansui`）、字嗨標楷（`BpmfZihiKaiStd`）等專屬字型。
- **字元流檢視器**：視覺化呈現 Unicode 字元、IVS 選擇子及 PUA 代碼的記憶體位元組結構。
- **無縫複製**：直接複製包含看不見的 IVS 標記的字串。

---

## 架構與狀態同步 (Auto-Sync)

本專案將兩大工具融合為單一 SPA：
- **HTML 模式** 使用 Plain Text 搭配 JS 記憶體手動微調 Map。
- **IVS 模式** 使用包含 variation selectors 的 Unicode 字元流。

當您切換標頭的 `[ 旁註 HTML ]` 及 `[ 變體 IVS ]` 按鈕時，系統會在背景自動進行資料雙向轉換與對齊，確保您在其中一個模式中調整的讀音，在切換到另一個模式時能夠完美保留並呈現！

---

## 目錄結構

```
BoPoMoEditor/
├── public/                 # 靜態資源 (由 Vite 於編譯時直接複製)
│   ├── assets/             # 7MB 教育部字典 XLSX、IVS 讀音映射表、匯出 CSS
│   └── fonts/              # 四大注音/Ruby 專屬字型 (共約 30MB)
├── src/                    # 原始碼
│   ├── configs/            # 全域路徑設定 (path.js)
│   ├── services/           # 核心解析引擎 (dict.js, tokenizer.js, bpmf.js, ivs.js, tts.js)
│   ├── features/           # UI 特色控制器 (bpmf.js, ivs.js)
│   ├── style.css           # 統一設計系統樣式表 (含亮/暗色主題、響應式 RWD 佈局)
│   └── main.js             # SPA 路由管理、狀態同步與載入器入口
├── index.html              # 主 HTML 入口點
├── package.json            # 專案套件配置
└── vite.config.js          # Vite 建置配置 (含 GitHub Pages 動態 base 路由)
```

---

## 開發指南

### 1. 安裝依賴
本專案開發環境需要 Node.js，採用 Vite 作為開發伺服器與編譯工具。
```bash
npm install
```

### 2. 本地開發
啟動極速本地 Vite 開發伺服器：
```bash
npm run dev
```

### 3. 編譯打包
將專案打包為靜態網頁（輸出至 `dist/` 資料夾），已預先設定好 GitHub Pages 的子目錄路徑 `/BoPoMoEditor/`：
```bash
npm run build
```

### 4. 本地預覽編譯結果
```bash
npm run preview
```

---

## 部署說明 (GitHub Pages)

本專案已在 `vite.config.js` 中設定動態 base 路徑。在 production 編譯時會自動將基礎路徑設為 `/BoPoMoEditor/`，可直接上傳至 GitHub Pages：
1. 確保 repository 名稱為 `BoPoMoEditor`。
2. 執行 `npm run build`。
3. 將產生的 `dist/` 目錄內容推送至 `gh-pages` 分支即可完成部署。
