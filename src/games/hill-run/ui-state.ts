import { reactive } from 'vue'
import type { GameState } from '../../types/game'

export const uiState = reactive({
  gameState: 'START_SCREEN' as GameState,
  // 遊戲中
  distance: 0,
  steps: 0,
  cadence: 0,
  elapsedTime: 0,
  isRunning: false,
  // 圈數
  lap: 1,
  lapProgress: 0,
  // 遊戲結束
  finalDistance: 0,
  finalSteps: 0,
  finalTime: 0,
  // 按鈕
  actionButtonText: 'START RUN',
  // 回調
  onAction: null as (() => void) | null,
  // WebGL
  webglFailed: false,
  // 倒數（由 createGameModule 自動寫入）
  countdownText: '',
  countdownColor: '',
  countdownFontSize: '',
  countdownKey: 0,
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
  uiState.webglFailed = false
  uiState.countdownText = ''
  uiState.countdownColor = ''
  uiState.countdownFontSize = ''
  uiState.countdownKey = 0
}
