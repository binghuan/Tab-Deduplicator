# Tab Deduplicator

🔄 一個 Firefox 擴充功能，用於自動偵測並關閉重複的標籤頁。

## 功能特色

- **自動偵測重複標籤頁**：當你開啟一個已存在的網址時，自動關閉舊的標籤頁，保留新的
- **手動掃描**：可以手動掃描當前所有標籤頁，找出重複的標籤頁
- **一鍵清理**：一鍵關閉所有重複的標籤頁
- **彈性設定**：
  - 可選擇忽略 URL 中的 hash (#) 部分
  - 可選擇忽略 URL 中的查詢參數 (?)
  - 可排除特定網域不處理
- **桌面通知**：關閉重複標籤頁時會顯示通知

## 安裝方式

### 臨時安裝（開發測試用）

1. 在 Firefox 網址列輸入 `about:debugging`
2. 點選「此 Firefox」
3. 點選「載入臨時附加元件」
4. 選擇此專案中的 `manifest.json` 檔案

### 從 Firefox Add-ons 安裝

（尚未發布）

## 使用方式

1. 安裝擴充功能後，點選工具列上的擴充功能圖示
2. 可以看到目前的標籤頁統計資訊
3. 點選「掃描重複頁面」查看重複的標籤頁
4. 點選「關閉所有重複」一次清理所有重複標籤頁
5. 可在設定頁面自訂各種選項

## 檔案結構

```
Tab-Deduplicator/
├── manifest.json        # 擴充功能設定檔
├── background.js        # 背景腳本（核心邏輯）
├── popup/
│   ├── popup.html      # 彈出視窗 HTML
│   ├── popup.css       # 彈出視窗樣式
│   └── popup.js        # 彈出視窗邏輯
├── options/
│   ├── options.html    # 設定頁面 HTML
│   ├── options.css     # 設定頁面樣式
│   └── options.js      # 設定頁面邏輯
├── icons/
│   ├── icon-48.svg     # 48x48 圖示
│   └── icon-96.svg     # 96x96 圖示
└── README.md           # 說明文件
```

## 權限說明

- `tabs`：用於讀取和管理標籤頁
- `storage`：用於儲存使用者設定

## 開發

### 需求

- Firefox 57+（支援 WebExtension API）

### 轉換 SVG 圖示為 PNG

如果需要使用 PNG 圖示，可以使用以下指令轉換：

```bash
# 使用 Inkscape
inkscape -w 48 -h 48 icons/icon-48.svg -o icons/icon-48.png
inkscape -w 96 -h 96 icons/icon-96.svg -o icons/icon-96.png

# 或使用 ImageMagick
convert -background none icons/icon-48.svg icons/icon-48.png
convert -background none icons/icon-96.svg icons/icon-96.png
```

## 授權

MIT License
