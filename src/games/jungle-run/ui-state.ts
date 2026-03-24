import { reactive } from 'vue'
import type { GameState } from '../../types/game'

export interface JungleRunUIState {
  gameState: GameState
  // 遊戲中
  distance: number
  steps: number
  cadence: number
  elapsedTime: number
  isRunning: boolean
  // 圈數
  lap: number
  lapProgress: number
  // 遊戲結束
  finalDistance: number
  finalSteps: number
  finalTime: number
  // 按鈕
  actionButtonText: string
  // 回調
  onAction: (() => void) | null
}

export const uiState = reactive<JungleRunUIState>({
  gameState: 'START_SCREEN',
  distance: 0,
  steps: 0,
  cadence: 0,
  elapsedTime: 0,
  isRunning: false,
  lap: 1,
  lapProgress: 0,
  finalDistance: 0,
  finalSteps: 0,
  finalTime: 0,
  actionButtonText: 'START RUN',
  onAction: null,
})

export function resetUIState(): void {
  uiState.gameState = 'START_SCREEN'
  uiState.distance = 0
  uiState.steps = 0
  uiState.cadence = 0
  uiState.elapsedTime = 0
  uiState.isRunning = false
  uiState.lap = 1
  uiState.lapProgress = 0
  uiState.finalDistance = 0
  uiState.finalSteps = 0
  uiState.finalTime = 0
  uiState.actionButtonText = 'START RUN'
  uiState.onAction = null
}
