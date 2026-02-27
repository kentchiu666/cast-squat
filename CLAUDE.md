# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Communication Preferences
- Language: Traditional Chinese (繁體中文)
- Technical terms can remain in English when appropriate

## Project Overview

這是一個 **Google Cast Party Game 平台**，採用 **Vue 3 + TypeScript + Vite** 架構。平台在 Chromecast 或智慧電視上執行，提供 LOBBY（遊戲大廳）讓使用者選擇遊戲，目前已實作「深蹲跳躍」(Squat Jump) 遊戲模組。

使用者透過手機 Sender App（Flutter）發送 Cast 訊息來控制遊戲。

### 核心功能
- **LOBBY 遊戲大廳**：像素藝術風格，顯示可用遊戲清單，支援 Cast 或點擊選擇遊戲
- **遊戲模組系統**：GameModule 介面統一管理，支援動態載入（code-splitting）
- **深蹲跳躍遊戲**：20 秒計時 / 7 階段跳躍動畫 / 金幣收集 / 多人模式（最多 4 人）
- **多人等候室**：START_SCREEN 顯示已加入玩家（角色預覽 + 名稱）
- **排行榜**：遊戲結束顯示玩家排名
- 支援本地瀏覽器測試與 Google Cast 部署
- **已針對 Chromecast v3 低階設備優化效能**

## Project Structure

```
cast-squat/
├── index.html                          # HTML 入口（Cast SDK + Vite 入口）
├── package.json                        # v2.0.0 - Vue 3 + Vite
├── vite.config.ts                      # Vite 設定
├── tsconfig.json                       # TypeScript 設定
├── src/
│   ├── main.ts                         # Vue 應用入口
│   ├── App.vue                         # 主元件（Canvas + 星空 + 遊戲迴圈）
│   ├── game-registry.ts                # 遊戲註冊表（動態 import）
│   ├── types/
│   │   └── game.ts                     # 所有型別定義
│   ├── components/
│   │   ├── LobbyScreen.vue             # LOBBY 大廳畫面
│   │   └── GameCard.vue                # 遊戲卡片元件
│   └── games/
│       └── squat-jump/                 # 深蹲跳躍遊戲模組
│           ├── index.ts                # GameModule 實作（狀態機 + 訊息處理）
│           ├── constants.ts            # 遊戲常數、跳躍配置、精靈座標
│           ├── utils.ts                # 緩動函數、數學工具、碰撞檢測
│           ├── character.ts            # 角色跳躍狀態機、繪製、彩色精靈圖
│           ├── coins.ts                # 金幣生成、碰撞、繪製
│           ├── particles.ts            # 粒子系統
│           ├── effects.ts              # 殘影、速度線、螢幕震動
│           ├── players.ts              # 多人玩家管理
│           └── dom-ui.ts              # DOM UI 建立/更新/銷毀
├── kenney_shape-characters/            # Kenney 免費角色素材包
│   └── Spritesheet/
│       ├── spritesheet_default.png
│       └── spritesheet_default.xml
└── CLAUDE.md                           # Claude Code 指引
```

## Technology Stack

- **Vue 3** (Composition API + `<script setup>`) - 平台 UI 框架
- **TypeScript** - 全專案型別安全
- **Vite** - 建置工具 + HMR 開發伺服器
- **HTML5 Canvas** - 遊戲圖形渲染（精靈、粒子、背景）
- **DOM + CSS Animation** - 所有文字 UI（分數、倒數、排行榜）
- **Google Cast Web Receiver SDK** - Cast 整合
- **Press Start 2P Font** - 像素藝術字體（Google Fonts）

## Development Commands

```bash
# 安裝依賴
npm install

# 開發（Vite HMR，預設 http://localhost:5173）
npm run dev

# 單元測試
npm test              # vitest run
npm run test:watch    # vitest watch 模式

# 型別檢查 + 建置
npm run build

# 預覽建置結果
npm run preview
```

## Architecture

### 平台狀態機 (App.vue)
```
LOBBY ──(選擇遊戲 / Cast LOAD_GAME)──→ GAME_ACTIVE
  ↑                                         │
  └──────(返回大廳 / Cast RETURN_LOBBY)─────┘
```

### 遊戲狀態機 (GameModule 內部)
```
START_SCREEN ──(點擊/START_GAME)──→ COUNTDOWN ──(3-2-1-GO!)──→ PLAYING ──(20秒)──→ GAME_OVER
      ↑                                                                                │
      └────────────────────────────(點擊重新開始 / Cast START_GAME)────────────────────┘
```

### Jump Phase State Machine (character.ts)
```
IDLE → ANTICIPATION → RISE → HANG → FALL → LAND → RECOVER → IDLE
       (蓄力下蹲)    (上升)  (頂點)  (下落)  (落地)  (恢復)
```

### 關鍵架構概念

#### GameModule 介面
所有遊戲模組必須實作 `GameModule` 介面（定義於 `src/types/game.ts`）：
- `init(canvas, ctx, spritesheet, domContainer)` — 初始化，接收 DOM 容器
- `start()` / `stop()` / `destroy()` — 生命週期
- `tick()` / `render(ctx)` — 由 App.vue 的 Fixed Timestep 迴圈驅動
- `handleMessage(data, senderId?)` — Cast 訊息處理
- `setBroadcastCallbacks(broadcastFn, replyFn)` — 設定通訊回調
- `setReturnToLobbyCallback?(fn)` — 返回 LOBBY 回調

#### 動態載入 (Code-Splitting)
遊戲模組透過 `game-registry.ts` 的 `module: () => import(...)` 實現按需載入。Vite 自動將遊戲模組打包為獨立 chunk。

#### DOM 容器注入
遊戲 UI 元素注入 App.vue 的 `#textLayer`（`pointer-events: none`）。遊戲內按鈕需設定 `pointer-events: auto`。遊戲模組的 CSS 使用 `squat-` 前綴避免衝突，透過動態 `<style>` 注入/移除。

#### Fixed Timestep 遊戲迴圈（App.vue 擁有）
```
gameLoop(timestamp)
├── 累積 delta time → tickAccumulator
├── while (tickAccumulator >= TICK_MS)   ← 固定 60 tick/s
│   └── tick()
│       ├── tickStarfield()              ← 星空位移（所有狀態）
│       └── activeGame?.tick()           ← 委派給遊戲模組
└── render()                             ← 每幀一次
    ├── renderStarfield()
    └── activeGame?.render(ctx)
```

### Module Responsibilities

| 模組 | 職責 |
|------|------|
| `App.vue` | Canvas 管理、星空背景、Fixed Timestep 迴圈、遊戲載入/卸載、平台狀態 |
| `LobbyScreen.vue` | LOBBY 大廳 UI（像素藝術裝飾、遊戲卡片列表） |
| `GameCard.vue` | 單個遊戲卡片元件 |
| `game-registry.ts` | 遊戲註冊表（ID、名稱、圖示、動態 import） |
| `types/game.ts` | 所有 TypeScript 型別定義 |

#### Squat Jump 遊戲模組

| 模組 | 職責 |
|------|------|
| `index.ts` | GameModule 實作、狀態機、Cast 訊息處理 |
| `constants.ts` | 遊戲常數、跳躍配置、金幣配置、精靈座標、玩家顏色 |
| `utils.ts` | 緩動函數、數學工具、碰撞檢測 |
| `character.ts` | 跳躍狀態機、擠壓伸展、角色繪製、彩色精靈圖預渲染 |
| `coins.ts` | 金幣生成、移動、碰撞檢測、繪製（單人/多人） |
| `particles.ts` | 粒子建立、更新、繪製（灰塵+金幣特效） |
| `effects.ts` | 殘影系統、速度線、螢幕震動 |
| `players.ts` | 玩家列表管理、加入/離開/鎖定、排行榜 |
| `dom-ui.ts` | DOM UI 建立/更新/銷毀（等候室、倒數、分數、結束畫面、按鈕） |

### Cast Integration
- **Application ID**: `DD35BB50`
- **Namespace**: `urn:x-cast:com.example.castsquat`
- **Receiver URL**: `https://kentchiu666.github.io/cast-squat/`
- **平台級訊息**（App.vue 處理）：
  - 載入遊戲：`{ action: 'LOAD_GAME', gameId: 'squat_jump' }`
  - 返回大廳：`{ action: 'RETURN_LOBBY' }`
  - 查詢狀態：`{ action: 'QUERY_STATE' }`
- **遊戲級訊息**（轉發給 activeGame.handleMessage）：
  - 玩家加入：`{ action: 'PLAYER_JOIN', playerId: 'xxx', playerName: 'Alice' }`
  - 玩家離開：`{ action: 'PLAYER_LEAVE', playerId: 'xxx' }`
  - 跳躍：`{ action: 'SQUAT_JUMP', playerId: 'xxx' }`
  - 開始/重新開始：`{ action: 'START_GAME' }`
- 無 Cast SDK 時自動降級為本地測試模式

### Sender App（Flutter）
- 獨立專案 `cast_squat_sender/`，使用 **官方 Google Cast SDK**
- 透過 **Method Channel** (`com.example.castsquat/cast`) 橋接 Flutter ↔ Native
- 透過 **Event Channel** (`com.example.castsquat/cast_events`) 接收裝置和連線事件
- Android：Cast SDK 21.5.0 + `CastContext.getSharedInstance()` 非同步初始化
- iOS：google-cast-sdk-no-bluetooth 4.8 + `GCKDiscoveryManager`

## Performance Notes（Chromecast v3 優化）

1. **禁止每幀設定 `canvas.width`/`canvas.height`** — Canvas resize 僅在 `window.resize` 事件中執行
2. **避免 `ctx.filter`** — 彩色精靈圖用 `hue-rotate` 在 init 時預渲染一次，不在每幀使用
3. **控制粒子數量** — 落地粒子 6 個、金幣粒子 5 個、速度線 4 條、星空 40 顆
4. **預計算常數值** — 星空顏色等不變的值在初始化時計算
5. **DOM 更新快取比對** — 值不變時不寫入 DOM
6. **Canvas 半解析度** — `CANVAS_SCALE = 0.5`，用 CSS 放大到全螢幕

## Development Guidelines

### Pixel Art Conventions
1. **Canvas 設定**: `ctx.imageSmoothingEnabled = false`
2. **CSS 設定**: `image-rendering: pixelated`
3. **字體**: 所有文字使用 `Press Start 2P`
4. **UI 元素**: 避免圓角，保持方正像素風格

### Animation Guidelines
- 跳躍使用 7 階段狀態機，非簡單 sin 曲線
- 殘影在上升/下落時每 2 幀建立一個
- 落地時觸發螢幕震動 intensity=8

### Code Style
- TypeScript strict mode
- Vue 3 Composition API + `<script setup>`
- 遊戲模組使用 module-level 狀態（`let` 變數），不用 class
- 每個模組職責單一，避免循環依賴
- 遊戲 DOM 元素的 CSS class 使用遊戲前綴（如 `squat-`）

### 魔術數字規則（AI 必讀）
撰寫或修改程式碼時，**必須**遵守以下規則：
1. **有語義的數值** → 提取到 `constants.ts` 對應的 config 物件（如 `PARTICLE_CONFIG`、`EFFECTS_CONFIG`、`COIN_ANIM_CONFIG`、`CHARACTER_ANIM_CONFIG`）
2. **判斷標準**：如果數字代表可調參數（速度、數量、間隔、閾值），就必須提取
3. **不需提取的**：陣列索引（0, 1, 2）、數學常數（Math.PI）、簡單倍率（/ 2）、CSS 像素微調值
4. **現有 config 分組**：
   - `JUMP_CONFIG` — 跳躍力學參數
   - `COIN_CONFIG` / `MP_COIN_CONFIG` — 金幣遊戲參數
   - `SCENE_CONFIG` — 場景佈局
   - `PARTICLE_CONFIG` — 粒子物理參數
   - `EFFECTS_CONFIG` — 殘影、速度線、螢幕震動
   - `COIN_ANIM_CONFIG` — 金幣旋轉/閃爍/進場動畫
   - `CHARACTER_ANIM_CONFIG` — 角色臉部、手部、陰影、動畫參數

### 單元測試規則（AI 必讀）
新增或修改**純邏輯函數**時，**必須**同步撰寫或更新單元測試：
1. **測試框架**：Vitest（`npm test` 執行）
2. **測試位置**：與被測模組同目錄的 `__tests__/` 資料夾
3. **必須測試的**：狀態機轉換、碰撞檢測、數學工具、資料管理（CRUD/排序/篩選）
4. **不需測試的**：Canvas 繪製函數、DOM 操作、純視覺效果
5. **Mock 策略**：有副作用的模組（particles、effects）使用 `vi.mock()` 隔離
6. **現有測試**（74 個，全數通過）：
   - `utils.test.ts` — 緩動函數、clamp、lerp、randomRange、circleCollision
   - `players.test.ts` — 玩家加入/離開/鎖定、位置分配、跳躍觸發、排行榜
   - `character.test.ts` — 7 階段跳躍狀態機轉換、squash/stretch、高度約束

### Adding New Games
1. 在 `src/games/[game-name]/` 建立模組目錄
2. 實作 `GameModule` 介面（參考 `squat-jump/index.ts`）
3. 在 `game-registry.ts` 註冊（設定 `available: true` 和 `module` 動態 import）
4. 遊戲 UI 元素注入到 `domContainer`，`destroy()` 時清除
5. CSS class 加遊戲名前綴，透過動態 `<style>` 注入/移除

## Configuration (constants.ts)

### 遊戲設定
```typescript
GAME_DURATION = 20          // 遊戲時長（秒）
```

### 跳躍設定
```typescript
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
```typescript
COIN_CONFIG = {
    SPAWN_INTERVAL: 90,   // 生成間隔（幀）
    SPEED: 4,             // 移動速度
    MIN_HEIGHT: 150,      // 最低高度
    MAX_HEIGHT: 280,      // 最高高度
    SIZE: 40,             // 金幣尺寸
    SCORE: 3              // 每個 +3 分
}
```

### 多人遊戲設定
```typescript
PLAYER_COLORS = [
    { name: 'Red', hex: '#FF6B6B', hueRotation: 0 },
    { name: 'Cyan', hex: '#4ECDC4', hueRotation: 180 },
    { name: 'Yellow', hex: '#FFE66D', hueRotation: 45 },
    { name: 'Green', hex: '#95E86B', hueRotation: 90 }
]

MULTIPLAYER_CONFIG = {
    MAX_PLAYERS: 4,
    PLAYER_PREVIEW_SIZE: 50
}
```

## Testing

### 本地測試
1. `npm run dev` 啟動 Vite 開發伺服器
2. 瀏覽器開啟 `http://localhost:5173`
3. LOBBY 畫面 → 點擊 Squat Jump 的 PLAY
4. START_SCREEN → 點擊 START GAME → 3-2-1 倒數
5. 點擊 JUMP! 測試跳躍、特效、金幣收集

### Console 多人模擬
```javascript
// 進入遊戲後，開啟 Console
gameAPI.handleCastMessage({ action: 'PLAYER_JOIN', playerId: 'p1', playerName: 'Alice' })
gameAPI.handleCastMessage({ action: 'PLAYER_JOIN', playerId: 'p2', playerName: 'Bob' })

// 開始遊戲後觸發跳躍
gameAPI.handleCastMessage({ action: 'SQUAT_JUMP', playerId: 'p1' })

// 查看狀態
gameAPI.getState()

// 返回 LOBBY
gameAPI.returnToLobby()
```

### 單元測試
```bash
npm test         # vitest run（74 個測試）
npm run test:watch  # vitest watch 模式
```

### 建置驗證
```bash
npm run build    # vue-tsc 型別檢查 + Vite 建置
```

## Common Issues

| 問題 | 解決方案 |
|------|----------|
| 圖片模糊 | 確認 `imageSmoothingEnabled = false` |
| Cast 連接失敗 | 確認 namespace 和 Application ID 正確 |
| 字體未載入 | 檢查網路連線（Google Fonts CDN）|
| 遊戲模組載入失敗 | 確認 `game-registry.ts` 的 `module` 路徑正確 |
| 遊戲 UI 無法點擊 | 確認按鈕有 `pointer-events: auto`（#textLayer 預設 none） |
| 玩家無法加入 | 確認遊戲狀態為 `START_SCREEN`，且未超過 4 人 |
| 多人跳躍無效 | 確認 `playerId` 正確對應已加入的玩家 |
| 遊戲 CSS 衝突 | 確認 class 使用遊戲名前綴（如 `squat-`） |

## Claude Code Hooks 整合

本專案已設定 Claude Code Hooks，透過 Telegram Bot 自動通知開發狀態。

### 檔案結構
```
.claude/
├── hooks/
│   ├── notify.sh              # Telegram 通知共用腳本
│   ├── on-stop.sh             # Claude 完成回應 → 發送完成通知
│   ├── on-need-input.sh       # 等待人工介入 → 提醒回來操作
│   └── on-failure.sh          # 工具執行失敗 → 發送錯誤通知
└── settings.local.json        # Hook 設定 + Token（已 gitignore）
```

### Hook 事件對應

| 事件 | 腳本 | 觸發時機 |
|------|------|----------|
| `Stop` | `on-stop.sh` | Claude 完成一輪回應時 |
| `Notification` | `on-need-input.sh` | Claude 等待使用者輸入或權限核准時 |
| `PostToolUseFailure` | `on-failure.sh` | 任何工具執行失敗時 |

### 注意事項
- 所有 hook 設為 `async: true`，不阻塞 Claude 執行
- Telegram Bot Token 和 Chat ID 存放於 `.claude/settings.local.json`（已 gitignore，不進版控）
- `.claude/hooks/` 目錄也已 gitignore
- Hook 設定變更後需**重新啟動 Claude Code session** 才生效

## 新功能開發流程（Research → Plan → Implement）

新增遊戲模組或大功能時，**必須**依照以下三階段流程進行，不可跳過直接寫程式碼。小修改（typo、單行修正、簡單 bug fix）不需走此流程。

### Phase 1: Research（調研）
1. 複製 `.claude/templates/research.md` 到 `.claude/docs/research-[功能名].md`
2. **深入閱讀**相關程式碼，不是表面瀏覽。必須理解：
   - 現有架構如何運作
   - 相關模組的資料流和狀態管理
   - 專案中已有的 pattern 和慣例
3. 將所有發現寫入 research 文件
4. **等待使用者確認** research 結果正確後才進入 Plan 階段

### Phase 2: Plan（規劃）
1. 複製 `.claude/templates/plan.md` 到 `.claude/docs/plan-[功能名].md`
2. 基於 research 結果撰寫詳細計畫，包含：
   - 具體實作步驟（含檔案路徑和程式碼片段）
   - 影響範圍（新增/修改哪些檔案）
   - 架構決策的理由
   - 測試計畫
   - 完成後需更新到 CLAUDE.md 的項目
3. **自我審查（提交前必做）**：用以下 checklist 檢查計畫，結果附在 plan.md 末尾「Review Notes」區段
   - [ ] 是否遵循現有 GameModule 介面和 pattern？
   - [ ] 是否有遺漏的生命週期（init/start/stop/destroy）？
   - [ ] 是否考慮 Chromecast v3 效能限制？
   - [ ] 是否有 Cast 訊息格式不一致？
   - [ ] 影響範圍是否完整列出？
   - [ ] 測試計畫是否覆蓋關鍵路徑？
4. **提交計畫給使用者審核**（含 Review Notes）
5. 使用者會在「開發者註解區」加入修正意見
6. **根據註解修正計畫，重複直到使用者核准**（附上「don't implement yet」時不可開始實作）

### Phase 3: Implement（實作）
1. 計畫狀態標為「已核准」後才開始實作
2. 嚴格按照計畫步驟執行，每完成一步在 plan.md 中打勾 `[x]`
3. 持續執行型別檢查（`npm run build`）
4. **Code Review（build 通過後必做）**：自動做一輪 code review，檢查以下項目並告知使用者結果
   - **效能**：是否違反 Chromecast v3 優化原則（每幀 canvas resize、ctx.filter、粒子過多等）
   - **Pattern 一致性**：是否遵循現有 code style（module-level 狀態、CSS 前綴、DOM 容器注入）
   - **安全性**：是否有 XSS 風險（DOM 操作）、未處理的 edge case
   - **Clean up**：destroy() 是否清除所有 DOM 元素和事件監聽
   - 有問題就修正，全部通過後才進入收尾
5. **收尾步驟（不可跳過）**：
   - 將新的架構資訊更新到 CLAUDE.md（新模組職責、新的 Cast 訊息、新的設定常數等）
   - Plan 狀態標為「已完成」
   - **主動提醒使用者**：「實作已完成，CLAUDE.md 已更新以下項目：...」

### 模板位置
- Research 模板: `.claude/templates/research.md`
- Plan 模板: `.claude/templates/plan.md`
- 工作文件存放: `.claude/docs/`（按功能命名）

## API 整合規則（AI 必讀）

### Swagger Spec 來源
- **遠端**：`https://gwp-backend-dev.gomore.net/api-json`
- 每次使用 `/api` 時直接 WebFetch 遠端，確保最新

### /api Skill
使用 `/api` 指令查詢 API spec：
- `/api list` — 列出所有 endpoints
- `/api GET /path` — 查看特定 endpoint 細節
- `/api types` — 產出 TypeScript 型別
- `/api fetch GET /path` — 產出 fetch 呼叫程式碼
- `/api search 關鍵字` — 搜尋 endpoints

### API 整合開發規範
1. **型別優先**：先從 Swagger schema 產出 TypeScript interface，再寫呼叫程式碼
2. **API 呼叫集中管理**：放在 `src/api/` 目錄
3. **錯誤處理**：統一的 error response 型別
4. **認證**：Bearer token 透過統一的 header 注入
