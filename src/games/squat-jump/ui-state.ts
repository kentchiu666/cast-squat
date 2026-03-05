import { reactive } from 'vue'
import type { GameState, Player } from '../../types/game'
import { MULTIPLAYER_CONFIG } from './constants'

export interface SquatJumpUIState {
  gameState: GameState
  // 開始畫面
  players: Player[]
  maxPlayers: number
  // 倒數
  countdownText: string
  countdownColor: string
  countdownFontSize: string
  countdownKey: number
  // 遊戲中
  isMultiplayer: boolean
  squatCount: number
  coinScore: number
  timer: number
  // 遊戲結束
  leaderboard: Player[]
  finalScore: number
  // 按鈕
  actionButtonText: string
  // 操作回調
  onAction: (() => void) | null
}

export const uiState = reactive<SquatJumpUIState>({
  gameState: 'START_SCREEN',
  players: [],
  maxPlayers: MULTIPLAYER_CONFIG.MAX_PLAYERS,
  countdownText: '',
  countdownColor: '',
  countdownFontSize: '',
  countdownKey: 0,
  isMultiplayer: false,
  squatCount: 0,
  coinScore: 0,
  timer: 0,
  leaderboard: [],
  finalScore: 0,
  actionButtonText: 'LOADING...',
  onAction: null,
})

export function resetUIState(): void {
  uiState.gameState = 'START_SCREEN'
  uiState.players = []
  uiState.countdownText = ''
  uiState.countdownColor = ''
  uiState.countdownFontSize = ''
  uiState.countdownKey = 0
  uiState.isMultiplayer = false
  uiState.squatCount = 0
  uiState.coinScore = 0
  uiState.timer = 0
  uiState.leaderboard = []
  uiState.finalScore = 0
  uiState.actionButtonText = 'LOADING...'
  uiState.onAction = null
}
