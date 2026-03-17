import type { Component } from 'vue'
import type { GameState, CastMessageData } from '../../types/game'

// === GameContext — 遊戲 hooks 可存取的工具 ===
export interface GameContext<TState> {
  /** 遊戲專屬狀態物件（由 createState 工廠產生） */
  state: TState
  /** 取得當前遊戲狀態 */
  getGameState(): GameState
  /** 切換遊戲狀態（自動廣播 STATE_UPDATE + 更新 UI） */
  changeState(newState: GameState): void
  /** 廣播訊息給所有 Sender */
  broadcast(data: Record<string, unknown>): void
  /** 回覆特定 Sender */
  replyTo(senderId: string | undefined, data: Record<string, unknown>): void
  /** 返回 LOBBY */
  returnToLobby(): void
  /** 是否為多人模式 */
  isMultiplayerMode(): boolean
  /** 參考座標寬度（1920） */
  logicalWidth: number
  /** 參考座標高度（1080） */
  logicalHeight: number
  /** 停止遊戲計時器（countdown interval） */
  stopGameTimer(): void
}

// === 多人模式介面 ===
export interface MultiplayerConfig {
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
  /** 將 players 資料同步到 uiState */
  syncPlayersToUI(ctx: GameContext<unknown>): void
}

// === 倒數 + 計時器配置 ===
export interface CountdownConfig<TState> {
  /** 遊戲時長（秒） */
  gameDuration: number
  /** 倒數開始前的重置（清除遊戲資料） */
  onBeforeCountdown?(ctx: GameContext<TState>): void
  /** PLAYING 開始時（倒數結束後） */
  onGameStart?(ctx: GameContext<TState>): void
  /** 每秒呼叫一次（遊戲自行管理 timer 遞減和結束邏輯） */
  onTimerTick?(ctx: GameContext<TState>): void
}

// === GameConfig — createGameModule 的設定 ===
export interface GameConfig<TState> {
  id: string
  name: string
  uiComponent: Component

  /** 遊戲專屬狀態工廠（取代 module-level let） */
  createState(): TState

  /** 每個 GameState 對應的按鈕文字 */
  buttonText: Partial<Record<GameState, string>>

  /** 遊戲的 reactive UI state 物件 */
  uiState: Record<string, unknown>
  /** 重置 UI state 函數 */
  resetUIState(): void

  // === 生命週期 hooks ===
  onInit?(ctx: GameContext<TState>, canvas: HTMLCanvasElement, ctx2d: CanvasRenderingContext2D, characterSheets: HTMLImageElement[], itemSpritesheet: HTMLImageElement | null): void
  onDestroy?(ctx: GameContext<TState>): void
  onStop?(ctx: GameContext<TState>): void

  // === 遊戲迴圈 ===
  onTick?(ctx: GameContext<TState>): void
  onRender?(ctx: GameContext<TState>, canvasCtx: CanvasRenderingContext2D): void

  // === 操作按鈕（本地點擊 / 舊版 Cast 訊息） ===
  onAction?(ctx: GameContext<TState>): void

  // === 狀態切換時的額外邏輯（changeState 呼叫後觸發） ===
  onStateChange?(ctx: GameContext<TState>, newState: GameState): void

  // === 遊戲專屬訊息處理（SQUAT_JUMP、SHAKE、RUN_UPDATE、GAME_RESULT 等） ===
  onMessage?(ctx: GameContext<TState>, data: Exclude<CastMessageData, string>, senderId?: string): void

  /** 舊版字串訊息處理（如 squat-jump 的 'SQUAT_JUMP' 字串相容） */
  onLegacyStringMessage?(ctx: GameContext<TState>, data: string): void

  /** 倒數 + 計時器配置（null = 無倒數，直接操作 gameState） */
  countdown?: CountdownConfig<TState>

  /** 無 multiplayer 時的最大玩家數（預設無限制） */
  maxPlayers?: number

  /** 多人模式配置（null = 單人模式） */
  multiplayer?: MultiplayerConfig
}
