import type { GameContext } from '../shared/types'
import { createGameModule } from '../shared/create-game-module'
import { uiState, resetUIState } from './ui-state'
import { RUN_CONFIG, DEFAULT_STRIDE_LENGTH } from './constants'
import VirtualRunUI from './VirtualRunUI.vue'

// === 遊戲專屬狀態 ===
interface VirtualRunState {
  distance: number
  steps: number
  elapsedSeconds: number
  tickCounter: number
  totalTicks: number
  lastRunUpdateTick: number
  isRunning: boolean
  waitingForVideo: boolean
}

const createState = (): VirtualRunState => ({
  distance: 0,
  steps: 0,
  elapsedSeconds: 0,
  tickCounter: 0,
  totalTicks: 0,
  lastRunUpdateTick: 0,
  isRunning: false,
  waitingForVideo: false,
})

// === 開始遊戲 ===
function startGame(ctx: GameContext<VirtualRunState>): void {
  ctx.state.distance = 0
  ctx.state.steps = 0
  ctx.state.elapsedSeconds = 0
  ctx.state.tickCounter = 0
  ctx.state.totalTicks = 0
  ctx.state.lastRunUpdateTick = 0
  ctx.state.isRunning = false
  ctx.state.waitingForVideo = false

  uiState.distance = 0
  uiState.steps = 0
  uiState.elapsedTime = 0

  // 通知 Sender 影片正在載入，請顯示 loading 狀態
  ctx.broadcast({ type: 'VIDEO_LOADING' })

  // 等影片實際開始播放（onVideoPlaying）才切到 PLAYING
  // 這樣可以避免 Sender 在影片還在 buffering 時就開始計步
  ctx.state.waitingForVideo = true
  uiState.videoCommand = 'play'
}

// === 結束遊戲 ===
function endGame(ctx: GameContext<VirtualRunState>): void {
  uiState.finalDistance = ctx.state.distance
  uiState.finalSteps = ctx.state.steps
  uiState.finalTime = ctx.state.elapsedSeconds
  uiState.videoCommand = 'pause'

  ctx.changeState('GAME_OVER')

  ctx.broadcast({
    type: 'GAME_RESULTS',
    rankings: [
      {
        rank: 1,
        playerId: 'local',
        playerName: 'Player',
        score: Math.floor(ctx.state.distance),
        distance: Math.floor(ctx.state.distance),
        steps: ctx.state.steps,
        time: ctx.state.elapsedSeconds,
      },
    ],
  })
}

// === 影片結束 callback ===
function handleVideoEnded(ctx: GameContext<VirtualRunState>): void {
  if (ctx.getGameState() === 'PLAYING') {
    endGame(ctx)
  }
}

export default createGameModule<VirtualRunState>({
  id: 'virtual_run',
  name: 'Virtual Run',
  uiComponent: VirtualRunUI,
  createState,
  uiState: uiState as unknown as Record<string, unknown>,
  resetUIState,

  buttonText: {
    START_SCREEN: 'START RUN',
    PLAYING: 'RUN +10m',
    GAME_OVER: 'RUN AGAIN',
  },

  onInit(ctx) {
    uiState.onVideoEnded = () => handleVideoEnded(ctx)
    uiState.onVideoPlaying = () => {
      if (ctx.state.waitingForVideo) {
        ctx.state.waitingForVideo = false
        ctx.changeState('PLAYING')
      }
    }
  },

  onAction(ctx) {
    const gs = ctx.getGameState()
    switch (gs) {
      case 'START_SCREEN':
        startGame(ctx)
        break
      case 'PLAYING': {
        // 本地測試：模擬跑步
        ctx.state.distance += RUN_CONFIG.LOCAL_TEST_DISTANCE_PER_CLICK
        ctx.state.steps += Math.round(RUN_CONFIG.LOCAL_TEST_DISTANCE_PER_CLICK / DEFAULT_STRIDE_LENGTH)
        uiState.distance = ctx.state.distance
        uiState.steps = ctx.state.steps
        // 同步 idle detection
        ctx.state.lastRunUpdateTick = ctx.state.totalTicks
        if (!ctx.state.isRunning) {
          ctx.state.isRunning = true
          uiState.videoCommand = 'play'
        }
        break
      }
      case 'GAME_OVER':
        uiState.videoCommand = 'stop'
        startGame(ctx)
        break
    }
  },

  onMessage(ctx, data, _senderId) {
    console.log('[VirtualRun] message:', data.action, data)

    // START_GAME 由 factory 的 handleStartGame() 處理
    if (data.action === 'RUN_UPDATE' && ctx.getGameState() === 'PLAYING' && 'distance' in data) {
      ctx.state.distance = data.distance
      ctx.state.steps = data.steps
      uiState.distance = ctx.state.distance
      uiState.steps = ctx.state.steps
      // 更新 idle detection，恢復播放
      ctx.state.lastRunUpdateTick = ctx.state.totalTicks
      if (!ctx.state.isRunning) {
        ctx.state.isRunning = true
        uiState.videoCommand = 'play'
      }
    }
  },

  onTick(ctx) {
    if (ctx.getGameState() === 'PLAYING') {
      ctx.state.totalTicks++

      // 只在跑步中才累計時間
      if (ctx.state.isRunning) {
        ctx.state.tickCounter++
        if (ctx.state.tickCounter >= RUN_CONFIG.TICKS_PER_SECOND) {
          ctx.state.tickCounter = 0
          ctx.state.elapsedSeconds++
          uiState.elapsedTime = ctx.state.elapsedSeconds
        }
      }

      // Idle detection：超過 threshold 未收到 RUN_UPDATE → 暫停影片
      if (ctx.state.isRunning && (ctx.state.totalTicks - ctx.state.lastRunUpdateTick) >= RUN_CONFIG.IDLE_TIMEOUT_TICKS) {
        ctx.state.isRunning = false
        uiState.videoCommand = 'pause'
      }
    }
  },

  onRender() {
    // 空操作：影片和 UI 都由 Vue 管理
  },

  onStop() {
    uiState.videoCommand = 'pause'
  },
})
