# 專案：Cast 深蹲跳躍遊戲 (Web Receiver)

## 專案概述

這是一個以像素藝術風格為主題的 Google Cast 網頁接收器應用程式，用於「深蹲跳躍」遊戲。它利用 HTML、CSS 和原生 JavaScript (ES6 模組) 在支援 Cast 的顯示器（例如 Chromecast、智慧電視）上呈現遊戲的視覺效果和邏輯。

### 遊戲玩法
- 在 10 秒計時內盡可能多跳躍並收集金幣
- 每次跳躍 +1 分
- 每個金幣 +3 分（金幣只會出現在高處，必須跳躍才能吃到）
- 最終分數 = 跳躍次數 + 金幣分數

### 多人模式
- 支援 1-4 人同時遊戲
- 每個玩家有獨立的角色顏色（紅、青、黃、綠）
- 先加入的玩家獲得第一個顏色（紅色）
- 各自獨立跳躍、獨立計分
- 遊戲結束顯示排行榜

### 主要功能

-   **Google Cast Web Receiver**：整合 Cast SDK 以便與傳送器應用程式通訊
-   **基於 Canvas 的渲染**：所有遊戲圖形都使用 HTML5 Canvas 繪製
-   **像素藝術美學**：透過關閉 Canvas 上的圖像平滑處理和使用像素字體 (`Press Start 2P`) 強制執行
-   **動態角色動畫**：
    - 7 階段跳躍狀態機（蓄力→上升→頂點停頓→下落→落地→恢復）
    - 擠壓與伸展效果
    - 動態表情和手部動畫
-   **視覺特效**：
    - 粒子系統（落地灰塵、金幣收集特效）
    - 殘影系統
    - 速度線
    - 螢幕震動
-   **金幣系統**：金幣從右側移動到左側，跳躍收集可得分
-   **遊戲狀態管理**：`START_SCREEN` → `COUNTDOWN` → `PLAYING` → `GAME_OVER`（支援 Cast 重新開始）
-   **3-2-1 倒數動畫**：遊戲開始前有倒數提示
-   **多人等候室**：START_SCREEN 顯示已加入的玩家，支援最多 4 人
-   **多人獨立計分**：各玩家獨立角色、獨立跳躍、獨立收集金幣
-   **排行榜**：遊戲結束顯示玩家排名
-   **本地測試**：包含「JUMP!」按鈕，方便直接在瀏覽器中測試

## 專案結構

```
cast_squat/
├── index.html                      # 主要 HTML（CSS + 初始化）
├── js/                             # JavaScript 模組
│   ├── constants.js                # 遊戲常數、精靈定義、多人配置
│   ├── utils.js                    # 緩動函數、數學工具
│   ├── particles.js                # 粒子系統
│   ├── character.js                # 角色跳躍與繪製（單人/多人）
│   ├── coins.js                    # 金幣系統（單人/多人碰撞）
│   ├── effects.js                  # 殘影、速度線、螢幕震動
│   ├── players.js                  # 多人玩家管理
│   └── game.js                     # 遊戲狀態與主迴圈
├── kenney_shape-characters/        # Kenney 免費角色素材包
│   └── Spritesheet/
│       ├── spritesheet_default.png
│       └── spritesheet_default.xml
├── README.md                       # 專案說明（繁體中文）
├── GEMINI.md                       # 專案說明（英文版）
└── CLAUDE.md                       # Claude Code 指引
```

## 建置與執行

此專案是一個客戶端網頁應用程式，不需要建置步驟，但**需要本地伺服器**運行（因為使用 ES6 模組）。

### 執行接收器 (本地開發)

```bash
# 方法 1：使用 Python
cd /path/to/cast_squat
python3 -m http.server 8080

# 方法 2：使用 Node.js
npx serve .

# 方法 3：使用 PHP
php -S localhost:8080
```

然後在瀏覽器開啟 `http://localhost:8080`

### 遊戲流程（單人模式）
1. 遊戲載入後顯示 `START_SCREEN`
2. 點擊「START GAME」進入 3-2-1 倒數
3. 倒數結束後開始 10 秒遊戲
4. 點擊「JUMP!」跳躍並收集金幣
5. 時間結束顯示分數明細

### 遊戲流程（多人模式）
1. 遊戲載入後顯示 `START_SCREEN`（等候室）
2. 玩家透過 Sender App 發送 `PLAYER_JOIN` 加入
3. 畫面顯示已加入的玩家（角色預覽 + 名稱）
4. 點擊「START GAME」鎖定玩家列表，進入倒數
5. 遊戲中各玩家發送 `SQUAT_JUMP` 控制自己的角色
6. 時間結束顯示排行榜
7. 透過 Sender 發送 `START_GAME` 可重新開始（自動重置玩家列表）

### 執行接收器 (Google Cast)

1.  **部署 Web Receiver**：將所有檔案託管到 HTTPS 伺服器（GitHub Pages、Netlify、Vercel 等）
2.  **註冊自訂 Web Receiver**：
    *   前往 [Google Cast SDK Developer Console](https://cast.google.com/publish/)
    *   註冊類型為「Custom Receiver」的新應用程式
    *   提供部署的 URL 作為「Application URL」
    *   記下「Application ID」
3.  **透過傳送器應用程式啟動**：配置 Sender App 使用：
    - Application ID
    - 命名空間：`urn:x-cast:com.example.castsquat`
    - 訊息格式：
      - 玩家加入：`{ action: 'PLAYER_JOIN', playerId: 'xxx', playerName: 'Alice' }`
      - 玩家離開：`{ action: 'PLAYER_LEAVE', playerId: 'xxx' }`
      - 跳躍：`{ action: 'SQUAT_JUMP', playerId: 'xxx' }`
      - 開始/重新開始遊戲：`{ action: 'START_GAME' }`（在 START_SCREEN 或 GAME_OVER 狀態均有效）
      - 舊格式（單人）：`{ action: 'SQUAT_JUMP' }`

## 部署

### GitHub Pages 自動部署
- **Receiver URL**：`https://kentchiu666.github.io/cast-squat/`
- **Application ID**：`DD35BB50`
- 推送到 `main` 分支後 GitHub Pages 自動部署

### 搭配 Sender App
- **Flutter Sender App** 位於獨立專案 `cast_squat_sender/`
- 使用 **官方 Google Cast SDK**（透過 Method Channel 橋接）
- 支援 Android（Cast SDK 21.5.0）和 iOS（google-cast-sdk-no-bluetooth 4.8）
- Sender App 負責：裝置探索、Cast 連線、發送遊戲訊息

## 效能優化（Chromecast v3）

此專案已針對 Chromecast v3（第二代）等低階設備進行效能優化：

| 優化項目 | 說明 |
|----------|------|
| Canvas resize | 僅在 `window.resize` 事件時調整，避免每幀重建 Canvas buffer |
| 殘影系統 | 移除 `ctx.filter`（hue-rotate/brightness），改用純 alpha 透明度 |
| 落地粒子 | 從 12 個減少為 6 個 |
| 金幣粒子 | 從 10 個減少為 5 個 |
| 速度線 | 從 8 條減少為 4 條 |
| 星空背景 | 從 100 顆減少為 40 顆，預計算顏色字串 |

> **關鍵發現**：`canvas.width = window.innerWidth` 每幀執行會強制重建整個 Canvas buffer，這是 Chromecast 上最大的效能瓶頸。

## 開發慣例

*   **技術棧**：HTML5、CSS3、原生 JavaScript (ES6 模組)、Canvas API
*   **模組化**：程式碼拆分為 7 個獨立模組，各司其職
*   **遊戲迴圈**：使用 `requestAnimationFrame` 實現 60fps 流暢動畫
*   **資產管理**：使用 Kenney Shape Characters 免費素材包
*   **像素藝術**：`ctx.imageSmoothingEnabled = false` + `image-rendering: pixelated`
*   **字體**：`Press Start 2P`（Google Fonts）
*   **狀態機**：使用字串常數管理遊戲狀態

## 可調整參數

遊戲參數集中在 `js/constants.js`：

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `GAME_DURATION` | 10 | 遊戲時長（秒）|
| `COIN_CONFIG.SPAWN_INTERVAL` | 90 | 金幣生成間隔（幀數，約 1.5 秒）|
| `COIN_CONFIG.SPEED` | 4 | 金幣移動速度 |
| `COIN_CONFIG.SCORE` | 3 | 每個金幣得分 |
| `JUMP_CONFIG.RISE_POWER` | 28 | 跳躍力道 |
| `JUMP_CONFIG.GRAVITY` | 1.8 | 重力加速度 |
| `MULTIPLAYER_CONFIG.MAX_PLAYERS` | 4 | 最大玩家數 |
| `MULTIPLAYER_CONFIG.PLAYER_PREVIEW_SIZE` | 50 | 等候室角色預覽尺寸 |
