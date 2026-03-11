# Plan: Receiver 架構完整重構 — GameModule Factory Pattern

> 建立日期: 2026-03-06
> 狀態: 草案

## Context

目前 3 個遊戲模組（squat-jump、shake-it、virtual-run）有 ~70% 重複程式碼：
- module-level `let` 變數散落，`destroy()` 要逐一歸零，容易遺漏
- `changeState()`、`replyTo()`、`handlePlayerJoin()`、倒數動畫、計時器管理幾乎相同
- `setBroadcastCallbacks`、`setReturnToLobbyCallback` 每個遊戲都重複實作

目標：提取共用邏輯到 factory，遊戲只需定義差異部分。

## 新增檔案

### `src/games/shared/create-game-module.ts` — 核心工廠函數

提供 `createGameModule(config)` 工廠，回傳完整的 `GameModule` 物件。

#### GameConfig 介面

```typescript
interface GameConfig<TState> {
  id: string
  name: string
  uiComponent: Component

  // 遊戲專屬狀態工廠（取代 module-level let）
  createState(): TState

  // 每個 GameState 對應的按鈕文字
  buttonText: Partial<Record<GameState, string>>

  // UI state（reactive 物件 + reset 函數）
  uiState: Record<string, unknown>
  resetUIState(): void

  // === 生命週期 hooks ===
  onInit?(ctx: GameContext<TState>, canvas: HTMLCanvasElement, ctx2d: CanvasRenderingContext2D, characterSheets: HTMLImageElement[], itemSpritesheet: HTMLImageElement | null): void
  onDestroy?(ctx: GameContext<TState>): void
  onStop?(ctx: GameContext<TState>): void

  // === 遊戲迴圈 ===
  onTick?(ctx: GameContext<TState>): void
  onRender?(ctx: GameContext<TState>, canvasCtx: CanvasRenderingContext2D): void

  // === 操作按鈕 ===
  onAction?(ctx: GameContext<TState>): void

  // === 遊戲專屬訊息處理（SQUAT_JUMP、SHAKE、RUN_UPDATE 等）===
  onMessage?(ctx: GameContext<TState>, data: CastMessageData, senderId?: string): void

  // === 倒數 + 計時器（null = 無倒數，如 virtual-run）===
  countdown?: {
    gameDuration: number
    onBeforeCountdown?(ctx: GameContext<TState>): void  // 倒數前的重置
    onGameStart?(ctx: GameContext<TState>): void         // PLAYING 開始
    onTimerEnd?(ctx: GameContext<TState>): void           // 計時結束
  }

  // === 多人模式（null = 單人，如 virtual-run）===
  multiplayer?: {
    getPlayerCount(): number
    getPlayers(): unknown[]
    getPlayerById?(id: string): unknown
    addPlayer(id: string, name: string): boolean
    removePlayer(id: string): boolean
    resetPlayers(): void
    lockPlayers(): void
    unlockPlayers(): void
    resetPlayersGameState(): void
    getLeaderboard(): unknown[]
    syncPlayersToUI(ctx: GameContext<TState>): void
  }
}
```

#### GameContext — 遊戲可存取的工具

```typescript
interface GameContext<TState> {
  state: TState                    // 遊戲專屬狀態
  getGameState(): GameState        // 當前遊戲狀態
  changeState(newState: GameState): void
  broadcast(data: Record<string, unknown>): void
  replyTo(senderId: string | undefined, data: Record<string, unknown>): void
  returnToLobby(): void
  isMultiplayerMode(): boolean
  logicalWidth: number
  logicalHeight: number
}
```

#### 工廠函數產出的 GameModule 內建邏輯

| 功能 | 內建行為 |
|------|---------|
| `changeState()` | 更新 gameState + 清除 countdown timeouts + 廣播 STATE_UPDATE + 更新 uiState.gameState + 更新按鈕文字 |
| `replyTo()` | null-safe 的 reply helper |
| `setBroadcastCallbacks` | 自動儲存到內部變數 |
| `setReturnToLobbyCallback` | 自動儲存到內部變數 |
| `handleMessage` PLAYER_JOIN | 檢查 START_SCREEN → addPlayer → replyTo JOIN_RESULT + STATE_UPDATE（Virtual Run 單人模式: 直接回 success） |
| `handleMessage` PLAYER_LEAVE | 檢查 START_SCREEN → removePlayer → syncPlayersToUI |
| `handleMessage` START_GAME | START_SCREEN → 啟動倒數（或直接 PLAYING）；GAME_OVER → resetPlayers → START_SCREEN |
| `handleMessage` RETURN_LOBBY | 呼叫 returnToLobby callback |
| 倒數動畫 | 3-2-1-GO! DOM 動畫（共用 numbers 配置） |
| 計時器 | `setInterval` 1 秒倒數，到 0 呼叫 `onTimerEnd` |
| `destroy()` | stop() → onDestroy hook → resetUIState → **state = createState()** 一行重置 |
| `getState()` | 回傳 gameState |
| `getUIComponent()` | 回傳 config.uiComponent |

### `src/games/shared/types.ts` — 共用型別

```typescript
export type { GameConfig, GameContext }
```

## 修改檔案

### 1. `src/games/squat-jump/index.ts` — 改用 factory

**Before（~450 行）→ After（~150 行）**

```typescript
import { createGameModule, type GameContext } from '../shared/create-game-module'
import { uiState, resetUIState } from './ui-state'
import SquatJumpUI from './SquatJumpUI.vue'
import { GAME_DURATION } from './constants'
// ... 其他遊戲特定 import

interface SquatJumpState {
  squatCount: number
  timer: number
  finalScore: number
  itemSpritesheet: HTMLImageElement | null
  logicalWidth: number
  logicalHeight: number
}

const createState = (): SquatJumpState => ({
  squatCount: 0,
  timer: GAME_DURATION,
  finalScore: 0,
  itemSpritesheet: null,
  logicalWidth: 1920,
  logicalHeight: 1080,
})

export default createGameModule<SquatJumpState>({
  id: 'squat_jump',
  name: 'Squat Jump',
  uiComponent: SquatJumpUI,
  createState,
  uiState,
  resetUIState,

  buttonText: {
    START_SCREEN: 'START GAME',
    COUNTDOWN: 'GET READY!',
    PLAYING: 'JUMP!',
    GAME_OVER: 'RESTART',
  },

  countdown: {
    gameDuration: GAME_DURATION,
    onBeforeCountdown(ctx) {
      ctx.state.squatCount = 0
      ctx.state.timer = GAME_DURATION
      resetCoins(); resetPlayerCoins(); resetCharacter()
      clearParticles(); resetEffects()
    },
    onTimerEnd(ctx) {
      ctx.state.finalScore = ctx.state.squatCount
      ctx.changeState('GAME_OVER')
    },
  },

  multiplayer: {
    getPlayerCount, getPlayers, getPlayerById,
    addPlayer: addPlayerToList, removePlayer: removePlayerFromList,
    resetPlayers, lockPlayers, unlockPlayers, resetPlayersGameState,
    getLeaderboard,
    syncPlayersToUI(ctx) { uiState.players = [...getPlayers()] },
  },

  onInit(ctx, _canvas, _ctx2d, characterSheets, itemSpritesheet) {
    ctx.state.itemSpritesheet = itemSpritesheet
    initCharacterSprites(characterSheets)
    setCharacterCount(characterSheets.filter(Boolean).length)
  },

  onAction(ctx) {
    if (ctx.getGameState() === 'PLAYING' && !ctx.isMultiplayerMode()) {
      if (startJump()) ctx.state.squatCount++
    }
  },

  onMessage(ctx, data) {
    if (data.action === 'SQUAT_JUMP' && ctx.getGameState() === 'PLAYING') {
      if (ctx.isMultiplayerMode() && data.playerId) {
        triggerPlayerJump(data.playerId)
      } else {
        if (startJump()) ctx.state.squatCount++
      }
    }
  },

  onTick(ctx) {
    if (ctx.getGameState() === 'PLAYING') tickPlaying(ctx)
  },

  onRender(ctx, canvasCtx) {
    // 遊戲特定繪製邏輯（保留現有的 switch）
  },

  onDestroy(ctx) {
    resetPlayers(); resetCharacter(); resetCoins()
    resetPlayerCoins(); clearParticles(); resetEffects()
    destroyCharacterSprites()
  },
})
```

### 2. `src/games/shake-it/index.ts` — 改用 factory

**Before（~535 行）→ After（~200 行）**

同樣模式，差異：
- `countdown.onTimerEnd` → 多人時進入 `RESULT_PENDING`
- 額外的 `GAME_RESULT` message handler
- 派對背景 tick/render
- `resultPendingStartTime`、`resultCheckInterval`、`globalShakeTimer`、`partyLights` 收入 state

### 3. `src/games/virtual-run/index.ts` — 改用 factory

**Before（~250 行）→ After（~100 行）**

差異：
- `countdown: undefined`（無倒數，直接 PLAYING）
- `multiplayer: undefined`（單人模式，但 PLAYER_JOIN 仍回 success）
- Idle detection 邏輯在 `onTick`
- `onMessage` 處理 `RUN_UPDATE`

### 4. `src/types/game.ts` — 無變更

GameModule 介面不變，factory 內部回傳符合此介面的物件。

### 5. 3 個 `ui-state.ts` — 無變更

保持各自的 reactive state 和 resetUIState()。

### 6. 3 個 `*UI.vue` — 無變更

### 7. 測試檔案 — 無變更

現有 103 個測試測的是 players.ts、character.ts、utils.ts，不涉及 index.ts 的 GameModule 層。

## 實作順序

1. [ ] 建立 `src/games/shared/create-game-module.ts` + `types.ts`
2. [ ] 重構 `virtual-run/index.ts`（最簡單，無倒數無多人）
3. [ ] `npm run build` 驗證
4. [ ] 重構 `squat-jump/index.ts`
5. [ ] `npm test && npm run build` 驗證
6. [ ] 重構 `shake-it/index.ts`（最複雜，有 RESULT_PENDING）
7. [ ] `npm test && npm run build` 驗證
8. [ ] Code Review + 更新 CLAUDE.md

## 風險評估

| 風險 | 緩解 |
|------|------|
| 行為不一致 | 每重構一個遊戲就 build 驗證，逐步推進 |
| Factory 太複雜 | Config 介面用 optional hooks，遊戲只實作需要的 |
| 測試失敗 | 現有測試不涉及 index.ts，風險低。手動 dev 測試三個遊戲流程 |
| 倒數邏輯差異 | Squat Jump 和 Shake It 倒數完全一致，可直接共用 |

## 自我審查

- [x] 遵循現有 GameModule 介面（不修改）
- [x] 生命週期完整（init/start/stop/destroy 都有處理）
- [x] Chromecast v3 效能無影響（只是程式碼重組，無新的每幀開銷）
- [x] Cast 訊息格式不變（PLAYER_JOIN、STATE_UPDATE 等回覆格式一致）
- [x] 影響範圍完整列出
- [x] 驗證計畫：build + test + 三個遊戲手動測試

## 開發者註解區

> 格式: `[註解] 你的意見`
