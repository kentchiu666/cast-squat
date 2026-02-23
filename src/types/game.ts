// === 遊戲模組統一介面 ===
export interface GameModule {
  id: string
  name: string

  init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, spritesheet: HTMLImageElement, domContainer: HTMLElement): void
  start(): void
  stop(): void
  destroy(): void

  handleMessage(data: CastMessageData, senderId?: string): void
  getState(): string

  setBroadcastCallbacks(broadcastFn: BroadcastFn, replyFn: ReplyFn): void
  setReturnToLobbyCallback?(fn: () => void): void

  tick(): void
  render(ctx: CanvasRenderingContext2D): void
}

// === 遊戲資訊（註冊表用）===
export interface GameInfo {
  id: string
  name: string
  description: string
  icon: string
  iconColor: string
  type: GameType
  typeLabel: string
  available: boolean
  module: (() => Promise<{ default: GameModule }>) | null
}

// === 遊戲類型 ===
export type GameType = 'COUNT' | 'REACT' | 'ENDURE' | 'HIIT' | 'PEAK'

// === 平台狀態 ===
export type PlatformState = 'LOBBY' | 'GAME_ACTIVE'

// === 遊戲內部狀態 ===
export type GameState = 'START_SCREEN' | 'COUNTDOWN' | 'PLAYING' | 'GAME_OVER'

// === Cast 訊息型別 ===
export type CastMessageData =
  | { action: 'QUERY_STATE' }
  | { action: 'LOAD_GAME'; gameId: string }
  | { action: 'RETURN_LOBBY' }
  | { action: 'PLAYER_JOIN'; playerId: string; playerName: string }
  | { action: 'PLAYER_LEAVE'; playerId: string }
  | { action: 'START_GAME' }
  | { action: 'SQUAT_JUMP'; playerId?: string }
  | string  // 舊版相容

// === 通訊函數型別 ===
export type BroadcastFn = (data: Record<string, unknown>) => void
export type ReplyFn = (senderId: string, data: Record<string, unknown>) => void

// === 玩家 ===
export interface Player {
  id: string
  name: string
  colorIndex: number
  squatCount: number
  coinScore: number
  jumpState: JumpState
  _scoreEl?: HTMLElement
  _cachedTotal?: number
}

// === 跳躍狀態 ===
export interface JumpState {
  jumpPhase: string
  phaseTimer: number
  characterY: number
  characterVelocityY: number
  squashStretch: SquashStretch
}

// === 擠壓伸展 ===
export interface SquashStretch {
  scaleX: number
  scaleY: number
}

// === 玩家顏色 ===
export interface PlayerColor {
  name: string
  hex: string
  hueRotation: number
}
