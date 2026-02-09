# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Communication Preferences
- Language: Traditional Chinese (繁體中文)
- Technical terms can remain in English when appropriate

## Project Overview

這是一個 **Google Cast Web Receiver** 應用程式，用於「深蹲跳躍」像素藝術風格遊戲。遊戲在 Chromecast 或智慧電視上執行，使用者透過手機 (Sender App) 發送訊息來控制跳躍。

### 核心功能
- 10 秒計時內計算跳躍次數並收集金幣
- 7 階段跳躍動畫（擠壓伸展、殘影、速度線、螢幕震動）
- 金幣系統（從右側移動，跳躍收集 +3 分）
- 3-2-1 開始倒數動畫
- **多人等候室**：START_SCREEN 顯示已加入玩家（角色預覽 + 名稱）
- **多人遊戲**：最多 4 人同時遊戲，各自獨立角色和計分
- **排行榜**：遊戲結束顯示玩家排名
- 支援本地瀏覽器測試與 Google Cast 部署

## Project Structure

```
cast_squat/
├── index.html                      # 主要 HTML（CSS + 初始化程式碼）
├── js/                             # JavaScript ES6 模組
│   ├── constants.js                # 遊戲常數、跳躍配置、精靈定義、多人配置
│   ├── utils.js                    # 緩動函數、數學工具、碰撞檢測
│   ├── particles.js                # 粒子系統（落地灰塵、金幣特效）
│   ├── character.js                # 角色跳躍邏輯、狀態機、繪製（單人/多人）
│   ├── coins.js                    # 金幣生成、移動、碰撞、繪製（單人/多人）
│   ├── effects.js                  # 殘影、速度線、螢幕震動
│   ├── players.js                  # 多人玩家管理（加入/離開/跳躍觸發）
│   └── game.js                     # 遊戲狀態管理、主迴圈、UI、Cast 訊息
├── kenney_shape-characters/        # Kenney 免費角色素材包
│   └── Spritesheet/
│       ├── spritesheet_default.png # 精靈圖集
│       └── spritesheet_default.xml # 座標定義
├── README.md                       # 專案說明（繁體中文）
├── GEMINI.md                       # 專案說明（英文版）
└── CLAUDE.md                       # Claude Code 指引
```

## Technology Stack

- **HTML5 Canvas** - 所有遊戲圖形渲染
- **Vanilla JavaScript (ES6 模組)** - 遊戲邏輯，無框架依賴
- **Google Cast Web Receiver SDK** - Cast 整合
- **Press Start 2P Font** - 像素藝術字體（Google Fonts）

## Development Commands

```bash
# 本地開發 - 必須使用本地伺服器（ES6 模組需要）
python3 -m http.server 8080
# 或
npx serve .

# 然後訪問 http://localhost:8080
```

**注意**：不能直接開啟 `file://` 路徑，因為 ES6 模組需要 HTTP 伺服器。

## Architecture

### Game State Machine
```
START_SCREEN ──(點擊)──→ COUNTDOWN ──(3-2-1-GO!)──→ PLAYING ──(10秒)──→ GAME_OVER
      ↑                                                                      │
      └─────────────────────────(點擊重新開始)───────────────────────────────┘
```

### Jump Phase State Machine (character.js)
```
IDLE → ANTICIPATION → RISE → HANG → FALL → LAND → RECOVER → IDLE
       (蓄力下蹲)    (上升)  (頂點)  (下落)  (落地)  (恢復)
```

### Module Responsibilities

| 模組 | 職責 |
|------|------|
| `constants.js` | 遊戲常數、跳躍配置、金幣配置、精靈座標、玩家顏色、多人配置 |
| `utils.js` | 緩動函數 (easeOutBack 等)、數學工具、碰撞檢測 |
| `particles.js` | 粒子建立、更新、繪製（灰塵+金幣特效）|
| `character.js` | 跳躍狀態機、擠壓伸展、角色繪製、表情/手部動畫、多人角色繪製 |
| `coins.js` | 金幣生成、移動、碰撞檢測、繪製、多人碰撞檢測 |
| `effects.js` | 殘影系統、速度線、螢幕震動 |
| `players.js` | 玩家列表管理、加入/離開/鎖定、跳躍觸發、排行榜 |
| `game.js` | 遊戲狀態、主迴圈、UI 更新、Cast 訊息處理、多人模式整合 |

### Key Exports

```javascript
// game.js - 主要入口
export { initGame, startGameLoop, handleCastMessage, getGameState, addPlayer, removePlayer, getPlayers }

// players.js - 玩家管理
export { addPlayer, removePlayer, getPlayers, getPlayerCount, lockPlayers, unlockPlayers,
         triggerPlayerJump, resetPlayers, getLeaderboard, getPlayerPositions }

// character.js - 角色控制（單人 + 多人）
export { updateJump, startJump, canJump, resetCharacter, getCharacterState, drawCharacter,
         updatePlayerJump, drawPlayerCharacter, drawPlayerPreview, drawPlayersStatic }

// coins.js - 金幣系統（單人 + 多人）
export { updateCoins, drawCoins, getCoinScore, resetCoins, updateCoinsMultiplayer }

// effects.js - 視覺特效
export { createAfterImage, createSpeedLines, triggerScreenShake, updateAfterImages, ... }

// particles.js - 粒子系統
export { createLandingParticles, createCoinCollectParticles, updateParticles, drawParticles }
```

### Cast Integration
- **Namespace**: `urn:x-cast:com.example.castsquat`
- **訊息格式**（多人）:
  - 玩家加入：`{ action: 'PLAYER_JOIN', playerId: 'xxx', playerName: 'Alice' }`
  - 玩家離開：`{ action: 'PLAYER_LEAVE', playerId: 'xxx' }`
  - 跳躍：`{ action: 'SQUAT_JUMP', playerId: 'xxx' }`
  - 開始遊戲：`{ action: 'START_GAME' }`
- **訊息格式**（舊版單人）：`{ action: 'SQUAT_JUMP' }` 或 `'SQUAT_JUMP'`
- 無 Cast SDK 時自動降級為本地測試模式
- 第一個加入的玩家獲得紅色角色（colorIndex = 0）

## Development Guidelines

### Pixel Art Conventions
1. **Canvas 設定**: 必須設定 `ctx.imageSmoothingEnabled = false`
2. **CSS 設定**: 使用 `image-rendering: pixelated`
3. **字體**: 所有文字使用 `Press Start 2P`
4. **UI 元素**: 避免圓角，保持方正像素風格

### Animation Guidelines
- 跳躍使用 7 階段狀態機，非簡單 sin 曲線
- 角色變形參數在 `updateJump()` 中的各 phase 區塊
- 殘影在上升/下落時每 2 幀建立一個
- 落地時觸發螢幕震動 intensity=8

### Code Style
- 使用 ES6 模組 (`import`/`export`)
- 使用 `const` 和 `let`，避免 `var`
- 狀態使用字串常數
- 每個模組職責單一，避免循環依賴

### Adding New Features
1. 確認功能歸屬哪個模組
2. 在 `constants.js` 新增相關配置
3. 實作功能並 export 必要函數
4. 在 `game.js` 整合到遊戲迴圈

## Configuration (constants.js)

### 遊戲設定
```javascript
GAME_DURATION = 10          // 遊戲時長（秒）
COUNTDOWN_CONFIG.ANIM_DURATION = 60  // 倒數動畫時長（幀）
```

### 跳躍設定
```javascript
JUMP_CONFIG = {
    ANTICIPATION_DURATION: 6,  // 蓄力幀數
    RISE_POWER: 28,            // 起跳力道
    HANG_DURATION: 5,          // 頂點停頓幀數
    GRAVITY: 1.8,              // 重力
    LAND_DURATION: 4,          // 落地幀數
    RECOVER_DURATION: 8,       // 恢復幀數
    MAX_HEIGHT: 300            // 最大高度
}
```

### 金幣設定
```javascript
COIN_CONFIG = {
    SPAWN_INTERVAL: 90,   // 生成間隔（幀）
    SPEED: 4,             // 移動速度
    MIN_HEIGHT: 150,      // 最低高度（必須跳躍）
    MAX_HEIGHT: 280,      // 最高高度
    SIZE: 40,             // 金幣尺寸
    SCORE: 3              // 每個 +3 分
}
```

### 多人遊戲設定
```javascript
PLAYER_COLORS = [
    { name: 'Red', hex: '#FF6B6B', hueRotation: 0 },
    { name: 'Cyan', hex: '#4ECDC4', hueRotation: 180 },
    { name: 'Yellow', hex: '#FFE66D', hueRotation: 45 },
    { name: 'Green', hex: '#95E86B', hueRotation: 90 }
]

MULTIPLAYER_CONFIG = {
    MAX_PLAYERS: 4,           // 最大玩家數
    PLAYER_PREVIEW_SIZE: 50   // 等候室角色預覽尺寸
}
```

## Testing

### 本地測試（單人）
1. 啟動本地伺服器 `python3 -m http.server 8080`
2. 瀏覽器開啟 `http://localhost:8080`
3. 點擊 "START GAME" → 觀察 3-2-1 倒數
4. 點擊 "JUMP!" 測試跳躍、特效、金幣收集
5. 確認分數正確顯示

### 本地測試（多人模擬）
1. 啟動本地伺服器並開啟瀏覽器
2. 開啟 Console，使用 `window.gameAPI` 測試：
```javascript
// 加入玩家
gameAPI.addPlayer('p1', 'Alice')  // 第一個加入 → 紅色
gameAPI.addPlayer('p2', 'Bob')    // 第二個加入 → 青色
gameAPI.addPlayer('p3', 'Carol')  // 第三個加入 → 黃色

// 查看玩家列表
gameAPI.getPlayers()

// 點擊 START GAME 開始遊戲

// 觸發跳躍（遊戲進行中）
gameAPI.handleCastMessage({ action: 'SQUAT_JUMP', playerId: 'p1' })
gameAPI.handleCastMessage({ action: 'SQUAT_JUMP', playerId: 'p2' })
```

### Cast 測試
需要搭配 Sender App（如 Flutter app）並設定正確的 Application ID

## Common Issues

| 問題 | 解決方案 |
|------|----------|
| 模組載入失敗 | 確認使用 HTTP 伺服器，非 file:// |
| 圖片模糊 | 確認 `imageSmoothingEnabled = false` |
| Cast 連接失敗 | 確認 namespace 和 Application ID 正確 |
| 字體未載入 | 檢查網路連線（Google Fonts CDN）|
| 金幣不出現 | 確認 `updateCoins()` 有在 `drawPlayingScreen()` 呼叫 |
| 玩家無法加入 | 確認遊戲狀態為 `START_SCREEN`，且未超過 4 人 |
| 多人跳躍無效 | 確認 `playerId` 正確對應已加入的玩家 |
| 玩家顏色不對 | 玩家顏色依加入順序分配（第一個 = 紅色）|
