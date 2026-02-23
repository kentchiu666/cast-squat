# Web 技術說明文件

這份文件以 web 新手角度解釋本專案用到的所有技術。

---

## 目錄

1. [JavaScript 與 ES Module](#1-javascript-與-es-module)
2. [TypeScript — 有型別的 JavaScript](#2-typescript--有型別的-javascript)
3. [Vite — 現代建置工具](#3-vite--現代建置工具)
4. [Vue — UI 框架](#4-vue--ui-框架)
5. [HTML5 Canvas — 遊戲繪圖](#5-html5-canvas--遊戲繪圖)
6. [Vue 與 Canvas 怎麼分工](#6-vue-與-canvas-怎麼分工)
7. [npm — 套件管理器](#7-npm--套件管理器)
8. [Vitest — 單元測試框架](#8-vitest--單元測試框架)
9. [Vue 生態系：Vue vs Nuxt](#9-vue-生態系vue-vs-nuxt)
10. [本專案的技術全貌](#10-本專案的技術全貌)

---

## 1. JavaScript 與 ES Module

### JavaScript 是什麼？

瀏覽器唯一原生支援的程式語言。所有的網頁互動、動畫、邏輯都是用 JavaScript 寫的。

### ES Module 是什麼？

JavaScript 原本沒有模組系統（所有程式碼共用一個全域空間，容易衝突）。ES Module 是 2015 年後的官方模組標準，用 `import` / `export` 來組織程式碼：

```typescript
// constants.ts — 匯出
export const GAME_DURATION = 20

// index.ts — 匯入
import { GAME_DURATION } from './constants'
```

**本專案的做法**：用 TypeScript 撰寫 ES Module，透過 Vite 編譯打包後交給瀏覽器。

---

## 2. TypeScript — 有型別的 JavaScript

### 是什麼？

TypeScript 是 JavaScript 的**超集合**（superset）。也就是說，所有合法的 JavaScript 都是合法的 TypeScript，但 TypeScript 額外加了**型別系統**。

### 為什麼需要？

JavaScript 是動態型別語言，變數可以是任何東西：

```javascript
// JavaScript — 不會報錯，但會出問題
let score = 10;
score = "hello";  // 完全合法，但後面 score + 1 = "hello1"
```

TypeScript 在**寫程式碼的時候**就告訴你哪裡有錯：

```typescript
// TypeScript — 寫的時候就會報錯
let score: number = 10
score = "hello"  // 編輯器立刻標紅：Type 'string' is not assignable to type 'number'
```

### 本專案的實際用法

```typescript
// src/types/game.ts — 定義遊戲中所有型別

// 定義介面：一個玩家長什麼樣子
interface Player {
  id: string
  name: string
  colorIndex: number
  squatCount: number
  coinScore: number
  jumpState: JumpState
}

// 定義聯合型別：Cast 訊息只能是這幾種格式
type CastMessageData =
  | { action: 'PLAYER_JOIN'; playerId: string; playerName: string }
  | { action: 'SQUAT_JUMP'; playerId?: string }
  | { action: 'START_GAME' }
  | string  // 舊版相容

// 寫程式時，編輯器會自動提示 player 有哪些屬性
function getTotal(player: Player): number {
  return player.squatCount + player.coinScore  // 自動補完
  return player.scroe     // 立刻報錯（拼錯字）
}
```

### TypeScript 怎麼變成 JavaScript？

瀏覽器**不認識** TypeScript，所以需要一個**編譯步驟**把 `.ts` 轉成 `.js`：

```
你寫的程式碼          編譯          瀏覽器看到的
game.ts         →   Vite       →   game.js
(有型別)                           (純 JavaScript)
```

本專案用 `vue-tsc`（Vue 專用的 TypeScript 編譯器）做型別檢查，Vite 負責轉譯：

```bash
npm run build    # 先跑 vue-tsc 型別檢查，再跑 Vite 打包
```

---

## 3. Vite — 現代建置工具

### 是什麼？

Vite（法語「快」的意思，讀作 /vit/）是一個**前端建置工具**，由 Vue 的作者尤雨溪開發。

### 為什麼需要建置工具？

```
沒有建置工具：
  你寫 .js 檔案 → 瀏覽器直接載入
  問題：不能用 TypeScript、不能用 Vue、載入慢、無法壓縮

有建置工具（Vite）：
  你寫 .ts / .vue 檔案
          ↓
      Vite 處理：
      - TypeScript → JavaScript
      - .vue → JavaScript + CSS
      - 合併檔案、壓縮程式碼
      - Code-Splitting（按需載入）
          ↓
  瀏覽器載入處理好的檔案
```

### Vite 的兩個模式

**1. 開發模式 (`npm run dev`)**
- 啟動本地伺服器（http://localhost:5173）
- 修改程式碼後**自動刷新**瀏覽器（Hot Module Replacement, HMR）
- TypeScript 和 Vue 即時編譯
- 超快，因為只編譯你改的那個檔案

**2. 建置模式 (`npm run build`)**
- 先跑 `vue-tsc` 做 TypeScript 型別檢查
- 把所有程式碼打包、壓縮成少數幾個檔案
- 自動 Code-Splitting：遊戲模組打包為獨立 chunk，用到時才下載
- 產出的檔案放在 `dist/` 資料夾

```
開發時：
src/main.ts  →  Vite dev server  →  瀏覽器即時預覽（localhost:5173）

部署時：
src/**  →  npm run build  →  dist/index.html + dist/assets/xxx.js
                               ↑ 這些檔案上傳到 Cast Receiver URL
```

### Code-Splitting（按需載入）

本專案的遊戲模組使用動態 `import()`，Vite 會自動將每個遊戲打包成獨立的 chunk：

```typescript
// src/game-registry.ts
{
  id: 'squat_jump',
  module: () => import('./games/squat-jump/index'),  // 動態 import
}
```

結果：使用者在 LOBBY 時不會下載遊戲程式碼，點選遊戲時才載入對應的 chunk。

---

## 4. Vue — UI 框架

### 是什麼？

Vue 是一個 **UI 框架**，幫你用「元件」（Component）的方式來組織畫面。

### 為什麼需要框架？

不用框架時，你要手動操作 DOM（文件物件模型）：

```javascript
// Vanilla JS — 手動建立 DOM（痛苦）
const card = document.createElement('div')
card.className = 'game-card'
const name = document.createElement('div')
name.textContent = 'Squat Jump'
card.appendChild(name)
document.body.appendChild(card)
```

用 Vue，你直接寫**模板**（像 HTML 一樣直覺）：

```vue
<!-- GameCard.vue — 一個遊戲卡片元件 -->
<template>
  <div class="game-card" @click="selectGame">
    <div class="icon">{{ game.icon }}</div>
    <div class="name">{{ game.name }}</div>
    <div class="status">{{ game.available ? 'PLAY' : 'COMING SOON' }}</div>
  </div>
</template>

<script setup lang="ts">
// TypeScript 邏輯
const props = defineProps<{
  game: GameInfo   // 自動型別檢查
}>()

const emit = defineEmits<{
  select: [gameId: string]
}>()

function selectGame() {
  if (props.game.available) {
    emit('select', props.game.id)
  }
}
</script>

<style scoped>
/* CSS 只影響這個元件，不會洩漏到其他地方 */
.game-card { border: 3px solid #0f3460; }
</style>
```

### Vue 的核心概念

**元件 (Component)**
把畫面拆成可重複使用的小塊。本專案的元件樹：

```
App.vue（根元件 — Canvas + 遊戲迴圈 + 平台狀態管理）
├── LobbyScreen.vue（LOBBY 大廳 — 像素藝術裝飾 + 遊戲列表）
│   └── GameCard.vue × 9（遊戲卡片）
└── #textLayer（遊戲 DOM UI 注入點）
    └── 遊戲模組的 DOM 元素（由 dom-ui.ts 動態建立）
```

**響應式資料 (Reactivity)**
資料改變時，畫面自動更新：

```typescript
import { ref } from 'vue'

const platformState = ref<PlatformState>('LOBBY')

// 改值 → 畫面自動更新，不需要手動操作 DOM
platformState.value = 'GAME_ACTIVE'
```

**單檔元件 (Single File Component, .vue)**
一個 `.vue` 檔案包含 HTML模板 + TypeScript邏輯 + CSS樣式，三合一。

### Vue 只管 LOBBY，不管遊戲內部

重要的架構決策：**遊戲模組內部的 DOM 元素不用 Vue，而是用原生 DOM 操作**。

原因：
- 遊戲 UI（分數、倒數、按鈕）需要極低延遲更新
- 遊戲模組是獨立的 TypeScript 模組，不依賴 Vue
- DOM 更新使用快取比對，值不變時不寫入（效能優化）

```typescript
// src/games/squat-jump/dom-ui.ts — 遊戲內部 DOM（不用 Vue）
export function createGameDOM(container: HTMLElement, onAction: () => void): void {
  const startScreen = document.createElement('div')
  startScreen.className = 'squat-start-screen'
  // ...
  container.appendChild(startScreen)
}

export function destroyGameDOM(): void {
  // 清除所有遊戲 DOM 元素和動態 <style>
}
```

---

## 5. HTML5 Canvas — 遊戲繪圖

### 是什麼？

Canvas 是 HTML 提供的一個**像素繪圖區域**。你用 JavaScript 在上面畫東西：

```typescript
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

// 畫一個紅色方塊
ctx.fillStyle = '#FF6B6B'
ctx.fillRect(100, 100, 80, 80)

// 畫精靈圖（從圖集取一小塊畫上去）
ctx.drawImage(spritesheet, sx, sy, sw, sh, dx, dy, dw, dh)
```

### 跟 DOM 的差別

| | DOM (HTML 元素) | Canvas |
|--|--|--|
| 原理 | 瀏覽器管理每個元素 | 你自己逐像素畫 |
| 適合 | 文字、按鈕、表單、版面 | 遊戲圖形、精靈、粒子效果 |
| 互動 | 內建點擊/hover 事件 | 要自己算座標判定 |
| 效能 | 元素多了會慢 | 適合大量快速繪製 |

### 本專案的 Canvas 優化

```typescript
// 半解析度渲染 — Canvas 實際像素是螢幕的一半，用 CSS 放大
const CANVAS_SCALE = 0.5
canvas.width = Math.floor(window.innerWidth * CANVAS_SCALE)
canvas.height = Math.floor(window.innerHeight * CANVAS_SCALE)
canvas.style.width = window.innerWidth + 'px'
canvas.style.height = window.innerHeight + 'px'
ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)

// 像素藝術必備 — 關閉圖片平滑
ctx.imageSmoothingEnabled = false
```

---

## 6. Vue 與 Canvas 怎麼分工

這是本專案最關鍵的架構決策：

```
┌─────────────────────────────────────────┐
│              瀏覽器畫面                   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  Canvas 層（底層 — 遊戲繪圖）      │   │
│   │  - 星空背景（App.vue 擁有）        │   │
│   │  - 角色精靈、跳躍動畫              │   │
│   │  - 金幣、粒子效果                  │   │
│   │  - 殘影、速度線                    │   │
│   │  - 地板                            │   │
│   │  TypeScript 模組，不依賴 Vue       │   │
│   └──────────────────────────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  DOM 層（上層 — #textLayer）       │   │
│   │                                    │   │
│   │  Vue 元件：                        │   │
│   │  - LobbyScreen（大廳 + 遊戲卡片）  │   │
│   │                                    │   │
│   │  遊戲 DOM（原生 DOM，非 Vue）：      │   │
│   │  - 分數/計時器 UI                  │   │
│   │  - 倒數動畫 (3-2-1-GO!)           │   │
│   │  - 排行榜/結算畫面                 │   │
│   │  - JUMP!/START/RESTART 按鈕       │   │
│   └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

**簡單說：**
- **Canvas** 管遊戲圖形（精靈、粒子、物理運算）
- **Vue** 管 LOBBY 大廳 UI
- **原生 DOM** 管遊戲內文字 UI（效能考量）
- 三者疊在一起，透過 `pointer-events` 控制互動

### 資料流向

```
App.vue（平台主控）
├── 擁有 Canvas + 遊戲迴圈（Fixed Timestep 60 tick/s）
├── 擁有星空背景
├── LOBBY 狀態 → 顯示 LobbyScreen.vue
│   └── 使用者點擊 PLAY → handleGameSelect()
│       ├── 動態 import 遊戲模組
│       ├── activeGame.init(canvas, ctx, spritesheet, domContainer)
│       └── platformState = 'GAME_ACTIVE'
├── GAME_ACTIVE 狀態 → 每幀呼叫：
│   ├── activeGame.tick()    ← 物理更新（60 次/秒）
│   └── activeGame.render()  ← 畫面繪製（每幀一次）
└── 返回 LOBBY → activeGame.destroy() → platformState = 'LOBBY'
```

---

## 7. npm — 套件管理器

### 是什麼？

npm (Node Package Manager) 是 JavaScript 生態系的**套件管理器**。類似 Python 的 pip、Flutter 的 pub。

### 核心檔案

**package.json** — 專案的身分證：

```json
{
  "name": "cast-squat",
  "version": "2.0.0",
  "scripts": {
    "dev": "vite",                    // npm run dev → 啟動開發伺服器
    "build": "vue-tsc -b && vite build",  // npm run build → 型別檢查 + 打包
    "preview": "vite preview",        // npm run preview → 預覽建置結果
    "test": "vitest run",             // npm test → 跑單元測試
    "test:watch": "vitest"            // npm run test:watch → 持續監看模式
  },
  "dependencies": {
    "vue": "^3.5.13"                  // 正式依賴
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",   // Vite 的 Vue 插件
    "typescript": "~5.7.2",           // TypeScript 編譯器
    "vite": "^6.0.5",                // 建置工具
    "vitest": "^4.0.18",             // 單元測試框架
    "vue-tsc": "^2.2.0"              // Vue TypeScript 型別檢查
  }
}
```

### 常用指令

```bash
npm install          # 安裝 package.json 裡列的所有套件 → node_modules/
npm run dev          # 啟動 Vite 開發伺服器（localhost:5173）
npm test             # 跑 Vitest 單元測試（74 個測試，< 0.2 秒）
npm run build        # TypeScript 型別檢查 + Vite 打包 → dist/
npm run preview      # 預覽 dist/ 的建置結果
```

**node_modules/** — 安裝的套件都放在這裡（通常有幾百 MB，不要放進 git）。

---

## 8. Vitest — 單元測試框架

### 是什麼？

Vitest 是一個**單元測試框架**，專為 Vite 生態系設計。它的 API 跟 Jest（最流行的 JavaScript 測試框架）幾乎一樣，但跑起來更快，因為直接使用 Vite 的模組系統。

### 為什麼需要單元測試？

```
沒有測試：
  改了碰撞檢測 → 手動打開遊戲 → 跳幾下看有沒有撞到金幣 → 好像可以（但其實 edge case 壞了）

有測試：
  改了碰撞檢測 → npm test → 0.1 秒跑完 74 個測試 → 第 42 個失敗
  → 立刻知道「兩個圓剛好碰到邊界」的情況壞了
```

### 基本語法

```typescript
import { describe, it, expect } from 'vitest'
import { circleCollision } from '../utils'

describe('circleCollision', () => {
  it('detects overlapping circles', () => {
    // 兩個圓心在同一點，一定碰撞
    expect(circleCollision(0, 0, 10, 0, 0, 10)).toBe(true)
  })

  it('detects separated circles as not colliding', () => {
    // 兩個圓距離 100，半徑加起來才 10
    expect(circleCollision(0, 0, 5, 100, 100, 5)).toBe(false)
  })
})
```

**核心概念**：
- `describe('名稱', fn)` — 一組相關測試
- `it('描述', fn)` — 一個測試案例
- `expect(值).toBe(預期)` — 斷言（assertion）：實際值要等於預期值

### Mock（模擬）

遊戲邏輯測試時，不想真的建立粒子或震動螢幕，用 `vi.mock()` 假裝這些模組：

```typescript
import { vi } from 'vitest'

// 把 particles 模組換成空殼，不會真的建立粒子
vi.mock('../particles', () => ({
  createLandingParticles: vi.fn(),   // 假函數，呼叫了但不做事
}))

// 現在測試 character.ts 的跳躍邏輯時，
// 落地不會真的呼叫 createLandingParticles，
// 測試只專注在「狀態是否正確轉換」
```

### 本專案的測試結構

```
src/games/squat-jump/
├── utils.ts              ← 被測程式碼
├── players.ts            ← 被測程式碼
├── character.ts          ← 被測程式碼
└── __tests__/            ← 測試放這裡
    ├── utils.test.ts     ← 26 個測試（緩動函數、碰撞檢測）
    ├── players.test.ts   ← 26 個測試（玩家管理、排行榜）
    └── character.test.ts ← 22 個測試（跳躍狀態機）
```

### 什麼要測，什麼不測？

| 要測 | 不測 |
|------|------|
| 碰撞檢測（純數學） | Canvas 繪製（視覺效果） |
| 狀態機轉換（IDLE→RISE→LAND） | DOM 操作（UI 建立/銷毀） |
| 玩家管理（加入/排行榜排序） | 粒子效果（純裝飾） |
| 數學工具（clamp、lerp） | CSS 動畫 |

**原則**：測試**邏輯**，不測**畫面**。

### 執行測試

```bash
npm test              # 跑一次全部測試
npm run test:watch    # 持續監看，改檔案自動重跑
```

---

## 9. Vue 生態系：Vue vs Nuxt

### Vue 生態系的層級

```
JavaScript
  └── Vue（UI 框架 — 元件化、響應式資料）
       └── Nuxt（全端框架 — 在 Vue 之上加 SSR、路由、伺服器）
```

Vue 和 Nuxt 的關係，就像 React 和 Next.js 的關係。

### Nuxt 是什麼？

Nuxt 是基於 Vue 的**全端框架**，自動幫你處理很多 Vue 需要手動設定的事情：

| 功能 | 純 Vue | Nuxt |
|------|--------|------|
| 路由 | 手動設定 vue-router | 放在 `pages/` 就自動產生路由 |
| 元件匯入 | 手動 `import` | 自動 import，放在 `components/` 就能用 |
| SSR/SSG | 要自己搞（很痛苦） | 內建支援，一個設定開關 |
| 後端 API | 需要獨立的 Node.js 伺服器 | `server/api/` 目錄直接寫 |
| SEO | SPA 天生不利 SEO | SSR 讓搜尋引擎看到完整 HTML |

### SSR 和 SSG 是什麼？

**SPA（Single Page Application）** — 純 Vue 的預設模式：
```
使用者瀏覽器
  → 下載空白 HTML + JavaScript
  → JavaScript 在瀏覽器執行
  → 動態產生畫面

問題：搜尋引擎看到的是空白 HTML，SEO 差
```

**SSR（Server-Side Rendering）** — Nuxt 的預設模式：
```
使用者瀏覽器
  → 請求頁面
  → Nuxt 伺服器用 Vue 產生完整 HTML
  → 瀏覽器收到已經有內容的 HTML
  → JavaScript 接手，變成互動式 SPA

優點：SEO 友善，首屏載入快
```

**SSG（Static Site Generation）** — Nuxt 的另一個模式：
```
部署前
  → Nuxt 把所有頁面預先渲染成 HTML 檔案

部署後
  → 純靜態 HTML，不需要伺服器（跟 GitHub Pages 一樣）

適合：部落格、文件網站、行銷頁面
```

### 本專案為什麼不用 Nuxt？

本專案是 **Cast Receiver**（Chromecast 上跑的 Canvas 遊戲），有幾個特性：

1. **不需要 SEO** — Chromecast 上的遊戲不會被 Google 搜尋到
2. **不需要伺服器** — 部署為純靜態檔案到 GitHub Pages
3. **不需要路由** — 整個應用只有一個頁面（Canvas 全螢幕）
4. **需要極致效能** — Chromecast v3 是低階設備，Nuxt 的 SSR 層是額外開銷

所以用純 Vue + Vite 是最輕量、最適合的選擇。

### 什麼時候該用 Nuxt？

| 場景 | 建議 |
|------|------|
| 行銷網站、官網 | Nuxt（SEO + SSG） |
| 部落格、文件站 | Nuxt（SSG + Nuxt Content） |
| 電商網站 | Nuxt（SEO + SSR） |
| 全端 Web App | Nuxt（前後端統一） |
| 遊戲、Canvas 應用 | 純 Vue + Vite |
| 管理後台（內部工具） | 純 Vue（不需 SEO） |
| Chromecast Receiver | 純 Vue + Vite（本專案） |

---

## 10. 本專案的技術全貌

### 從 V1 到 V2 的演進

**V1（原始版本）**：
```
cast-squat/
├── index.html          ← HTML + CSS + 初始化邏輯
├── js/
│   ├── game.js         ← 純 JavaScript，所有邏輯
│   ├── character.js
│   ├── coins.js
│   └── ...
└── (無 package.json、無建置步驟)
```
- 開發流程：改 .js → 手動刷新瀏覽器
- 部署流程：整個資料夾上傳
- 限制：無型別安全、無元件化、無 code-splitting

**V2（目前版本）**：
```
cast-squat/
├── package.json         ← npm 專案定義
├── vite.config.ts       ← Vite 設定
├── tsconfig.json        ← TypeScript 設定
├── index.html           ← Vite 入口
├── src/
│   ├── main.ts          ← Vue 應用入口
│   ├── App.vue          ← 根元件（Canvas + 遊戲迴圈 + 平台狀態）
│   ├── game-registry.ts ← 遊戲註冊表（動態 import）
│   ├── types/
│   │   └── game.ts      ← 所有 TypeScript 型別
│   ├── components/
│   │   ├── LobbyScreen.vue  ← LOBBY 大廳
│   │   └── GameCard.vue     ← 遊戲卡片
│   └── games/
│       └── squat-jump/      ← 遊戲模組（純 TypeScript）
│           ├── index.ts     ← GameModule 介面實作
│           ├── constants.ts ← 所有常數（跳躍、金幣、粒子、特效、動畫）
│           ├── character.ts
│           ├── coins.ts
│           ├── particles.ts
│           ├── effects.ts
│           ├── players.ts
│           ├── dom-ui.ts
│           ├── utils.ts
│           └── __tests__/   ← Vitest 單元測試
│               ├── utils.test.ts
│               ├── players.test.ts
│               └── character.test.ts
├── dist/                ← npm run build 產出（部署用）
└── node_modules/        ← 套件（不進 git）
```
- 開發流程：改 .ts/.vue → Vite 自動熱更新
- 部署流程：`npm run build` → 上傳 `dist/` 資料夾
- 優勢：型別安全、元件化、code-splitting、LOBBY 遊戲大廳

### 技術對照表

| V1 | V2 | 為什麼改 |
|--------|--------|--------|
| JavaScript (.js) | TypeScript (.ts) | 型別安全，編輯器自動補完，減少 bug |
| 手寫 DOM | Vue 元件 (.vue) | LOBBY UI 開發更直覺、可維護 |
| 瀏覽器直接載入 | Vite 建置 | 支援 TS/Vue 編譯、打包壓縮、code-splitting |
| `python3 -m http.server` | `npm run dev` | HMR 自動熱更新，不用手動刷新 |
| 整個資料夾上傳 | `npm run build` → dist/ | 壓縮優化、Tree-shaking、按需載入 |
| 單一遊戲 | 遊戲平台 + 模組系統 | 支援多個遊戲，LOBBY 選擇 |
| 無測試 | Vitest 單元測試（74 個） | 改邏輯後秒知道有沒有壞掉 |
| 魔術數字散落各處 | 統一 constants.ts 常數管理 | 調參集中、語義清楚 |
| Canvas 遊戲繪圖 | Canvas 遊戲繪圖（不變） | 精靈/粒子繪製，框架幫不上忙 |

### GameModule 模組系統

V2 的核心設計是 **GameModule 介面**，讓每個遊戲都是獨立的模組：

```typescript
// src/types/game.ts
interface GameModule {
  id: string
  name: string
  init(canvas, ctx, spritesheet, domContainer): void  // 初始化
  start(): void    // 開始
  stop(): void     // 暫停
  destroy(): void  // 銷毀（清除所有狀態和 DOM）
  tick(): void     // 物理更新（60 次/秒）
  render(ctx): void // 畫面繪製（每幀一次）
  handleMessage(data, senderId?): void  // Cast 訊息
  // ...
}
```

新增遊戲只需要：
1. 在 `src/games/` 建立新目錄
2. 實作 `GameModule` 介面
3. 在 `game-registry.ts` 註冊

平台（App.vue）會自動處理載入、遊戲迴圈驅動、卸載。
