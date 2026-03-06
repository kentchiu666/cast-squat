import type { GameModule, GameState, CastMessageData, BroadcastFn } from '../../types/game'
import { uiState, resetUIState } from './ui-state'
import { RUN_CONFIG, DEFAULT_STRIDE_LENGTH } from './constants'
import VirtualRunUI from './VirtualRunUI.vue'

// === Module-level 狀態 ===
let gameState: GameState = 'START_SCREEN'
let distance = 0
let steps = 0
let elapsedSeconds = 0
let tickCounter = 0
let _broadcastFn: BroadcastFn | null = null
let _returnToLobbyFn: (() => void) | null = null

// === 狀態切換 ===
function changeState(newState: GameState): void {
  gameState = newState
  uiState.gameState = newState

  // 更新按鈕文字
  switch (newState) {
    case 'START_SCREEN':
      uiState.actionButtonText = 'START RUN'
      break
    case 'PLAYING':
      uiState.actionButtonText = 'RUN +10m'
      break
    case 'GAME_OVER':
      uiState.actionButtonText = 'RUN AGAIN'
      break
  }

  // 廣播狀態
  _broadcastFn?.({ type: 'STATE_UPDATE', state: newState })
}

// === 開始遊戲 ===
function startGame(): void {
  distance = 0
  steps = 0
  elapsedSeconds = 0
  tickCounter = 0

  uiState.distance = 0
  uiState.steps = 0
  uiState.elapsedTime = 0

  changeState('PLAYING')
  uiState.videoCommand = 'play'
}

// === 結束遊戲 ===
function endGame(): void {
  uiState.finalDistance = distance
  uiState.finalSteps = steps
  uiState.finalTime = elapsedSeconds
  uiState.videoCommand = 'pause'

  changeState('GAME_OVER')

  // 廣播結果
  _broadcastFn?.({
    type: 'GAME_RESULTS',
    rankings: [
      {
        rank: 1,
        playerId: 'local',
        playerName: 'Player',
        score: Math.floor(distance),
        distance: Math.floor(distance),
        steps,
        time: elapsedSeconds,
      },
    ],
  })
}

// === 影片結束 callback ===
function handleVideoEnded(): void {
  if (gameState === 'PLAYING') {
    endGame()
  }
}

// === 操作按鈕 ===
function handleAction(): void {
  switch (gameState) {
    case 'START_SCREEN':
      startGame()
      break
    case 'PLAYING':
      // 本地測試：模擬跑步
      distance += RUN_CONFIG.LOCAL_TEST_DISTANCE_PER_CLICK
      steps += Math.round(RUN_CONFIG.LOCAL_TEST_DISTANCE_PER_CLICK / DEFAULT_STRIDE_LENGTH)
      uiState.distance = distance
      uiState.steps = steps
      break
    case 'GAME_OVER':
      uiState.videoCommand = 'stop'
      startGame()
      break
  }
}

// === Cast 訊息處理 ===
function handleStructuredMessage(data: CastMessageData, _senderId?: string): void {
  if (typeof data === 'string') return

  switch (data.action) {
    case 'RUN_UPDATE':
      if (gameState === 'PLAYING' && 'distance' in data) {
        distance = data.distance
        steps = data.steps
        uiState.distance = distance
        uiState.steps = steps
      }
      break
    case 'START_GAME':
      if (gameState === 'START_SCREEN') {
        startGame()
      } else if (gameState === 'GAME_OVER') {
        uiState.videoCommand = 'stop'
        startGame()
      }
      break
    case 'RETURN_LOBBY':
      _returnToLobbyFn?.()
      break
  }
}

// === GameModule 實作 ===
const VirtualRunGame: GameModule = {
  id: 'virtual_run',
  name: 'Virtual Run',

  init(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D, _characterSheets: HTMLImageElement[], _itemSpritesheet: HTMLImageElement | null) {
    uiState.onAction = handleAction
    uiState.onVideoEnded = handleVideoEnded
    changeState('START_SCREEN')
  },

  start() {
    // App.vue 驅動 tick/render，不需額外啟動
  },

  stop() {
    uiState.videoCommand = 'pause'
  },

  destroy() {
    this.stop()
    resetUIState()

    // 重置所有 module-level 變數
    gameState = 'START_SCREEN'
    distance = 0
    steps = 0
    elapsedSeconds = 0
    tickCounter = 0
    _broadcastFn = null
    _returnToLobbyFn = null
  },

  handleMessage(data: CastMessageData, senderId?: string) {
    handleStructuredMessage(data, senderId)
  },

  getState() {
    return gameState
  },

  getUIComponent() {
    return VirtualRunUI
  },

  setBroadcastCallbacks(broadcastFn, _replyFn) {
    _broadcastFn = broadcastFn
  },

  setReturnToLobbyCallback(fn: () => void) {
    _returnToLobbyFn = fn
  },

  tick() {
    if (gameState === 'PLAYING') {
      tickCounter++
      if (tickCounter >= RUN_CONFIG.TICKS_PER_SECOND) {
        tickCounter = 0
        elapsedSeconds++
        uiState.elapsedTime = elapsedSeconds
      }
    }
  },

  render() {
    // 空操作：影片和 UI 都由 Vue 管理，不需要 Canvas 繪製
  },
}

export default VirtualRunGame
