import { reactive } from 'vue'
import type { GameState } from '../../types/game'

export interface VirtualRunUIState {
  gameState: GameState
  // 遊戲中
  distance: number
  steps: number
  elapsedTime: number
  // 影片控制
  videoReady: boolean
  videoCommand: 'play' | 'pause' | 'stop' | null
  // 遊戲結束
  finalDistance: number
  finalSteps: number
  finalTime: number
  // 按鈕
  actionButtonText: string
  // 回調
  onAction: (() => void) | null
  onVideoEnded: (() => void) | null
  onVideoReady: (() => void) | null
  onVideoPlaying: (() => void) | null
}

export const uiState = reactive<VirtualRunUIState>({
  gameState: 'START_SCREEN',
  distance: 0,
  steps: 0,
  elapsedTime: 0,
  videoReady: false,
  videoCommand: null,
  finalDistance: 0,
  finalSteps: 0,
  finalTime: 0,
  actionButtonText: 'START RUN',
  onAction: null,
  onVideoEnded: null,
  onVideoReady: null,
  onVideoPlaying: null,
})

export function resetUIState(): void {
  uiState.gameState = 'START_SCREEN'
  uiState.distance = 0
  uiState.steps = 0
  uiState.elapsedTime = 0
  uiState.videoReady = false
  uiState.videoCommand = null
  uiState.finalDistance = 0
  uiState.finalSteps = 0
  uiState.finalTime = 0
  uiState.actionButtonText = 'START RUN'
  uiState.onAction = null
  uiState.onVideoEnded = null
  uiState.onVideoReady = null
  uiState.onVideoPlaying = null
}
