import type { GameContext } from '../shared/types'
import { createGameModule } from '../shared/create-game-module'
import { uiState, resetUIState } from './ui-state'
import { GAME_CONFIG, CADENCE_CONFIG, SCENE_CONFIG } from './constants'
import { cadenceToSpeed, lerp } from './cadence'
import { initScene, buildTrack, updateSceneCamera, resetCameraLerp, renderFrame, destroyScene, getTrackLength, isWebGLSupported } from './scene'
import { updateNpc } from './npc'
import { generateTrack3D } from './track'
import HillRunUI from './HillRunUI.vue'

// 保存 host canvas 供 destroy 時恢復
let hostCanvasRef: HTMLCanvasElement | null = null

// === 遊戲專屬狀態 ===
interface HillRunState {
  distance: number
  steps: number
  cadence: number
  elapsedSeconds: number
  tickCounter: number
  totalTicks: number
  lastRunUpdateTick: number
  isRunning: boolean
  scrollOffset: number
  currentSpeed: number
  targetSpeed: number
}

const createState = (): HillRunState => ({
  distance: 0,
  steps: 0,
  cadence: 0,
  elapsedSeconds: 0,
  tickCounter: 0,
  totalTicks: 0,
  lastRunUpdateTick: 0,
  isRunning: false,
  scrollOffset: 0,
  currentSpeed: 0,
  targetSpeed: 0,
})

// === 開始遊戲 ===
// startGame 不再需要 — 倒數由 createGameModule 的 countdown config 自動管理
// onBeforeCountdown 負責重置狀態，倒數結束自動進入 PLAYING

// === 結束遊戲 ===
function endGame(ctx: GameContext<HillRunState>): void {
  uiState.finalDistance = ctx.state.distance
  uiState.finalSteps = ctx.state.steps
  uiState.finalTime = ctx.state.elapsedSeconds

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

export default createGameModule<HillRunState>({
  id: 'hill_run',
  name: 'Hill Run',
  uiComponent: HillRunUI,
  createState,
  uiState: uiState as unknown as Record<string, unknown>,
  resetUIState,
  maxPlayers: 1,

  buttonText: {
    START_SCREEN: 'START RUN',
    PLAYING: 'WALK / RUN',
    GAME_OVER: 'RUN AGAIN',
  },

  countdown: {
    gameDuration: 0,  // 無時間限制
    onBeforeCountdown(ctx) {
      Object.assign(ctx.state, createState())
      resetCameraLerp()
      // 只重置遊戲數據，不呼叫 resetUIState()（會清掉 onAction 回調）
      uiState.distance = 0
      uiState.steps = 0
      uiState.cadence = 0
      uiState.elapsedTime = 0
      uiState.isRunning = false
      uiState.lap = 1
      uiState.lapProgress = 0
    },
  },

  onInit(_ctx, canvas) {
    hostCanvasRef = canvas
    initScene(canvas)
    if (!isWebGLSupported()) {
      uiState.webglFailed = true
      console.error('[HillRun] WebGL not available, game cannot run')
      return
    }
    const trackPoints = generateTrack3D()
    buildTrack(trackPoints)
    console.log('[HillRun] 3D scene initialized')
  },

  onAction(ctx) {
    const gs = ctx.getGameState()
    switch (gs) {
      case 'PLAYING': {
        // 本地測試：切換走路/跑步
        const isCurrentlyRunning = ctx.state.cadence >= CADENCE_CONFIG.RUN_THRESHOLD
        const newCadence = isCurrentlyRunning ? GAME_CONFIG.LOCAL_WALK_CADENCE : GAME_CONFIG.LOCAL_RUN_CADENCE
        ctx.state.cadence = newCadence
        ctx.state.targetSpeed = cadenceToSpeed(newCadence)
        uiState.cadence = newCadence
        ctx.state.distance += 10
        ctx.state.steps += Math.round(10 / GAME_CONFIG.DEFAULT_STRIDE_LENGTH)
        uiState.distance = ctx.state.distance
        uiState.steps = ctx.state.steps
        ctx.state.lastRunUpdateTick = ctx.state.totalTicks
        if (!ctx.state.isRunning) {
          ctx.state.isRunning = true
          uiState.isRunning = true
        }
        break
      }
      case 'GAME_OVER':
        // 重新開始：重建場景（新賽道）→ 回到 START_SCREEN 讓倒數流程再跑一次
        if (hostCanvasRef) {
          destroyScene(hostCanvasRef)
          initScene(hostCanvasRef)
          buildTrack(generateTrack3D())
        }
        Object.assign(ctx.state, createState())
        resetCameraLerp()
        resetUIState()
        ctx.changeState('START_SCREEN')
        break
    }
  },

  onMessage(ctx, data) {
    if (data.action === 'END_RUN' && ctx.getGameState() === 'PLAYING') {
      endGame(ctx)
      return
    }
    if (data.action === 'RUN_UPDATE' && ctx.getGameState() === 'PLAYING') {
      if ('distance' in data) {
        const prevDistance = ctx.state.distance
        ctx.state.distance = data.distance as number
        ctx.state.steps = data.steps as number
        uiState.distance = ctx.state.distance
        uiState.steps = ctx.state.steps

        // 沒有 cadence 時，從 distance 變化量推算速度
        // 注意：只更新 targetSpeed，scrollOffset 由 onTick 的 lerp 驅動，避免跳變抽動
        if (!('cadence' in data)) {
          const delta = ctx.state.distance - prevDistance
          if (delta > 0) {
            ctx.state.targetSpeed = Math.min(1, delta / 3)
          }
        }
      }
      if ('cadence' in data && typeof data.cadence === 'number') {
        ctx.state.cadence = data.cadence
        ctx.state.targetSpeed = cadenceToSpeed(data.cadence)
        uiState.cadence = data.cadence
      }
      ctx.state.lastRunUpdateTick = ctx.state.totalTicks
      if (!ctx.state.isRunning) {
        ctx.state.isRunning = true
        uiState.isRunning = true
      }
    }
  },

  onTick(ctx) {
    // START_SCREEN：攝影機沿賽道慢慢環繞，預覽地圖
    if (ctx.getGameState() === 'START_SCREEN') {
      ctx.state.scrollOffset += SCENE_CONFIG.PREVIEW_SCROLL_SPEED
      updateSceneCamera(ctx.state.scrollOffset)
    }

    if (ctx.getGameState() === 'PLAYING') {
      ctx.state.totalTicks++

      // 時間累計
      if (ctx.state.isRunning) {
        ctx.state.tickCounter++
        if (ctx.state.tickCounter >= GAME_CONFIG.TICKS_PER_SECOND) {
          ctx.state.tickCounter = 0
          ctx.state.elapsedSeconds++
          uiState.elapsedTime = ctx.state.elapsedSeconds
        }
      }

      // Idle detection
      if (ctx.state.isRunning && (ctx.state.totalTicks - ctx.state.lastRunUpdateTick) >= CADENCE_CONFIG.IDLE_TIMEOUT_TICKS) {
        ctx.state.isRunning = false
        ctx.state.targetSpeed = 0
        uiState.isRunning = false
      }

      // 速度平滑
      ctx.state.currentSpeed = lerp(ctx.state.currentSpeed, ctx.state.targetSpeed, CADENCE_CONFIG.SPEED_LERP_FACTOR)

      // 滾動偏移
      ctx.state.scrollOffset += ctx.state.currentSpeed * CADENCE_CONFIG.BASE_SCROLL_SPEED

      // 攝影機跟隨
      updateSceneCamera(ctx.state.scrollOffset)

      // NPC 陪跑更新
      updateNpc(ctx.state.scrollOffset, ctx.state.currentSpeed, 1 / GAME_CONFIG.TICKS_PER_SECOND)

      // 圈數
      const tLen = getTrackLength()
      if (tLen > 0) {
        uiState.lap = Math.floor(ctx.state.scrollOffset / tLen) + 1
        uiState.lapProgress = (ctx.state.scrollOffset % tLen) / tLen
      }
    }
  },

  onRender() {
    // Three.js 自己渲染，不用 Canvas 2D ctx
    renderFrame()
  },

  onDestroy() {
    if (hostCanvasRef) {
      destroyScene(hostCanvasRef)
      hostCanvasRef = null
    }
  },
})
