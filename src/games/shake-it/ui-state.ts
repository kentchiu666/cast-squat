import { reactive } from 'vue'
import type { GameState, ShakePlayer } from '../../types/game'
import { MULTIPLAYER_CONFIG } from './constants'

export interface ShakeItUIState {
  gameState: GameState
  // 開始畫面
  players: ShakePlayer[]
  maxPlayers: number
  // 倒數
  countdownText: string
  countdownColor: string
  countdownFontSize: string
  countdownKey: number
  // 遊戲中
  isMultiplayer: boolean
  timer: number
  // RESULT_PENDING
  resultCountdown: string
  // 遊戲結束
  leaderboard: ShakePlayer[]
  finalScore: number
  // 按鈕
  actionButtonText: string
  // 操作回調
  onAction: (() => void) | null
}

export const uiState = reactive<ShakeItUIState>({
  gameState: 'START_SCREEN',
  players: [],
  maxPlayers: MULTIPLAYER_CONFIG.MAX_PLAYERS,
  countdownText: '',
  countdownColor: '',
  countdownFontSize: '',
  countdownKey: 0,
  isMultiplayer: false,
  timer: 0,
  resultCountdown: '',
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
  uiState.timer = 0
  uiState.resultCountdown = ''
  uiState.leaderboard = []
  uiState.finalScore = 0
  uiState.actionButtonText = 'LOADING...'
  uiState.onAction = null
}
