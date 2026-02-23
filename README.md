# Cast Party Game - Web Receiver (V2)

## 專案概述

這是一個以像素藝術風格為主題的 **Google Cast Party Game 平台**，採用 **Vue 3 + TypeScript + Vite** 架構。平台在支援 Cast 的顯示器（Chromecast、智慧電視）上執行，提供 LOBBY 遊戲大廳讓使用者選擇遊戲，使用者透過手機 Sender App 發送訊息來控制遊戲。

### 平台功能
- **LOBBY 遊戲大廳**：像素藝術風格 UI，展示所有遊戲卡片
- **遊戲模組系統**：GameModule 介面統一管理，支援動態載入（code-splitting）
- **多人支援**：最多 4 人同時遊戲，各自獨立角色和計分
- **Cast 整合**：透過 Google Cast SDK 與 Sender App 通訊
- **本地測試**：支援瀏覽器直接測試，Console API 模擬多人

### 已實作遊戲：Squat Jump（深蹲跳躍）
- 在 20 秒計時內盡可能多跳躍並收集金幣
- 每次跳躍 +1 分，每個金幣 +3 分
- 7 階段跳躍動畫（蓄力→上升→頂點→下落→落地→恢復）
- 視覺特效：擠壓伸展、殘影、速度線、螢幕震動、粒子系統
- 多人模式：等候室、獨立角色顏色、獨立計分、排行榜

## 技術棧

| 技術 | 用途 |
|------|------|
| **Vue 3** | 平台 UI 框架（Composition API + `<script setup>`） |
| **TypeScript** | 全專案型別安全 |
| **Vite** | 建置工具 + HMR 開發伺服器 |
| **HTML5 Canvas** | 遊戲圖形渲染（精靈、粒子、背景） |
| **DOM + CSS Animation** | 文字 UI（分數、倒數、排行榜） |
| **Google Cast Web Receiver SDK** | Cast 整合 |
| **Press Start 2P** | 像素藝術字體 |

## 專案結構

```
cast-squat/
├── index.html                          # HTML 入口
├── package.json                        # v2.0.0
├── vite.config.ts                      # Vite 設定
├── tsconfig.json                       # TypeScript 設定
├── src/
│   ├── main.ts                         # Vue 應用入口
│   ├── App.vue                         # 主元件（Canvas + 遊戲迴圈）
│   ├── game-registry.ts                # 遊戲註冊表
│   ├── types/game.ts                   # 型別定義
│   ├── components/
│   │   ├── LobbyScreen.vue             # LOBBY 大廳
│   │   └── GameCard.vue                # 遊戲卡片
│   └── games/
│       └── squat-jump/                 # 深蹲跳躍遊戲
│           ├── index.ts                # GameModule 實作
│           ├── constants.ts            # 遊戲常數
│           ├── utils.ts                # 工具函數
│           ├── character.ts            # 角色系統
│           ├── coins.ts                # 金幣系統
│           ├── particles.ts            # 粒子系統
│           ├── effects.ts              # 視覺特效
│           ├── players.ts              # 多人管理
│           └── dom-ui.ts              # DOM UI 管理
├── kenney_shape-characters/            # 角色素材包
│   └── Spritesheet/
│       ├── spritesheet_default.png
│       └── spritesheet_default.xml
└── CLAUDE.md                           # Claude Code 指引
```

## 建置與執行

### 安裝

```bash
npm install
```

### 本地開發

```bash
npm run dev
```

開啟 `http://localhost:5173`

### 建置

```bash
npm run build     # TypeScript 型別檢查 + Vite 建置
npm run preview   # 預覽建置結果
```

## 遊戲流程

### 單人模式
1. LOBBY 大廳 → 點擊 Squat Jump 的 **PLAY**
2. 遊戲等候室 → 點擊 **START GAME**
3. 3-2-1 倒數 → 20 秒遊戲
4. 點擊 **JUMP!** 跳躍並收集金幣
5. 時間結束顯示分數
6. 點擊 **RESTART** 重新開始 或 **BACK TO LOBBY** 返回大廳

### 多人模式
1. LOBBY 大廳 → 選擇遊戲進入等候室
2. 玩家透過 Sender App 發送 `PLAYER_JOIN` 加入（最多 4 人）
3. 畫面顯示已加入的玩家（角色預覽 + 名稱）
4. 點擊 **START GAME** 鎖定玩家，進入倒數
5. 遊戲中各玩家發送 `SQUAT_JUMP` 控制自己的角色
6. 時間結束顯示排行榜

## 架構設計

### 平台狀態機
```
LOBBY ──(選擇遊戲)──→ GAME_ACTIVE ──(返回大廳)──→ LOBBY
```

### 遊戲狀態機
```
START_SCREEN → COUNTDOWN → PLAYING → GAME_OVER
     ↑                                    │
     └──────────(重新開始)────────────────┘
```

### GameModule 介面

所有遊戲模組實作統一介面，由 App.vue 的 Fixed Timestep 遊戲迴圈（60 tick/s）驅動：

```typescript
interface GameModule {
  init(canvas, ctx, spritesheet, domContainer): void
  start(): void
  stop(): void
  destroy(): void
  tick(): void
  render(ctx): void
  handleMessage(data, senderId?): void
  // ...
}
```

### DOM + Canvas 混合渲染
- **Canvas**：精靈、粒子、背景等圖形（半解析度渲染，CSS 放大）
- **DOM**：所有文字 UI（分數、倒數、排行榜），使用 CSS 動畫
- 遊戲 UI 注入 `#textLayer` 容器，按鈕設定 `pointer-events: auto`

## Google Cast 整合

### 部署
- **Receiver URL**：`https://kentchiu666.github.io/cast-squat/`
- **Application ID**：`DD35BB50`
- **Namespace**：`urn:x-cast:com.example.castsquat`

### Cast 訊息格式

**平台級**：
```json
{ "action": "LOAD_GAME", "gameId": "squat_jump" }
{ "action": "RETURN_LOBBY" }
{ "action": "QUERY_STATE" }
```

**遊戲級**：
```json
{ "action": "PLAYER_JOIN", "playerId": "xxx", "playerName": "Alice" }
{ "action": "PLAYER_LEAVE", "playerId": "xxx" }
{ "action": "SQUAT_JUMP", "playerId": "xxx" }
{ "action": "START_GAME" }
```

### Sender App（Flutter）
- 獨立專案 `cast_squat_sender/`
- 使用官方 Google Cast SDK（Method Channel 橋接）
- 支援 Android 和 iOS

## 本地測試（Console API）

進入遊戲後，開啟瀏覽器 Console：

```javascript
// 模擬玩家加入
gameAPI.handleCastMessage({ action: 'PLAYER_JOIN', playerId: 'p1', playerName: 'Alice' })
gameAPI.handleCastMessage({ action: 'PLAYER_JOIN', playerId: 'p2', playerName: 'Bob' })

// 模擬跳躍
gameAPI.handleCastMessage({ action: 'SQUAT_JUMP', playerId: 'p1' })

// 查看狀態
gameAPI.getState()

// 返回 LOBBY
gameAPI.returnToLobby()
```

## 效能優化（Chromecast v3）

| 優化項目 | 說明 |
|----------|------|
| Canvas 半解析度 | `CANVAS_SCALE = 0.5`，CSS 放大到全螢幕 |
| Canvas resize | 僅在 `window.resize` 時調整 |
| 彩色精靈圖 | init 時用 `hue-rotate` 預渲染，不在每幀使用 `ctx.filter` |
| 粒子數量限制 | 落地 6、金幣 5、速度線 4、星空 40 |
| DOM 更新快取 | 值不變時不寫入 DOM |
| Fixed Timestep | 物理固定 60 tick/s，30fps 裝置每幀跑 2 次 tick |
| DOM 文字渲染 | 文字用 DOM + CSS 動畫，不用 Canvas fillText |

## 可調整參數

參數集中在 `src/games/squat-jump/constants.ts`：

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `GAME_DURATION` | 20 | 遊戲時長（秒） |
| `COIN_CONFIG.SPAWN_INTERVAL` | 90 | 金幣生成間隔（幀） |
| `COIN_CONFIG.SPEED` | 4 | 金幣移動速度 |
| `COIN_CONFIG.SCORE` | 3 | 每個金幣得分 |
| `JUMP_CONFIG.RISE_POWER` | 28 | 跳躍力道 |
| `JUMP_CONFIG.GRAVITY` | 1.8 | 重力加速度 |
| `MULTIPLAYER_CONFIG.MAX_PLAYERS` | 4 | 最大玩家數 |

## 新增遊戲指南

1. 在 `src/games/[game-name]/` 建立模組目錄
2. 實作 `GameModule` 介面（參考 `squat-jump/index.ts`）
3. 在 `src/game-registry.ts` 註冊，設定 `available: true` 和 `module` 動態 import
4. 遊戲 UI 注入 `domContainer`，CSS class 加遊戲名前綴
5. `destroy()` 時清除所有 DOM 元素和動態 `<style>`

## 素材來源

- **角色精靈**：[Kenney Shape Characters](https://kenney.nl/assets/shape-characters) (CC0)
- **字體**：[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (Open Font License)
