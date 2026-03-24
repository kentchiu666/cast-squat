import type { GameContext } from '../shared/types'
import { createGameModule } from '../shared/create-game-module'
import { uiState, resetUIState } from './ui-state'
import { GAME_CONFIG, CADENCE_CONFIG, TRACK_CONFIG } from './constants'
import { initRenderer, renderScene, destroyRenderer, getTrackLUT, getTrackLength_ } from './renderer'
import { cadenceToSpeed, lerp } from './cadence'
import { updateCamera } from './camera'
import type { CameraState } from './camera'
import { generateRandomTrack } from './courses/tracks/random-track'
import { jungleTheme } from './courses/themes/jungle'
import { initNpc, resetNpc, tickNpc, getNpcScrollOffset, destroyNpc } from './npc'
import JungleRunUI from './JungleRunUI.vue'

// 保存 canvas context 供 startGame 重新初始化 renderer 使用
let canvasCtxRef: CanvasRenderingContext2D | null = null

// === 遊戲專屬狀態 ===
interface JungleRunState {
  distance: number
  steps: number
  cadence: number
  elapsedSeconds: number
  tickCounter: number
  totalTicks: number
  lastRunUpdateTick: number
  isRunning: boolean
  // 視覺狀態
  scrollOffset: number
  currentSpeed: number
  targetSpeed: number
  runningBlend: number
  // 攝影機
  cameraX: number
  cameraZ: number
  cameraAngle: number
}

const createState = (): JungleRunState => ({
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
  runningBlend: 0,
  cameraX: 0,
  cameraZ: 0,
  cameraAngle: 0,
})

// === 開始遊戲 ===
function startGame(ctx: GameContext<JungleRunState>): void {
  Object.assign(ctx.state, createState())

  uiState.distance = 0
  uiState.steps = 0
  uiState.cadence = 0
  uiState.elapsedTime = 0
  uiState.isRunning = false

  // 每次開始都生成新的隨機賽道
  destroyNpc()
  destroyRenderer()
  initRenderer(canvasCtxRef!, generateRandomTrack(), jungleTheme)
  initNpc()
  resetNpc(ctx.state.scrollOffset)
  ctx.changeState('PLAYING')
}

// === 結束遊戲 ===
function endGame(ctx: GameContext<JungleRunState>): void {
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

export default createGameModule<JungleRunState>({
  id: 'jungle_run',
  name: 'Jungle Run',
  uiComponent: JungleRunUI,
  createState,
  uiState: uiState as unknown as Record<string, unknown>,
  resetUIState,
  maxPlayers: 1,

  buttonText: {
    START_SCREEN: 'START RUN',
    PLAYING: 'WALK / RUN',
    GAME_OVER: 'RUN AGAIN',
  },

  onInit(_ctx, _canvas, canvasCtx) {
    canvasCtxRef = canvasCtx
    initRenderer(canvasCtx, generateRandomTrack(), jungleTheme)
    initNpc()
    console.log('[JungleRun] Mode 7 initialized')
  },

  onAction(ctx) {
    const gs = ctx.getGameState()
    switch (gs) {
      case 'START_SCREEN':
        startGame(ctx)
        break
      case 'PLAYING': {
        // 本地測試：切換走路/跑步模擬
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
        startGame(ctx)
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
        ctx.state.distance = data.distance
        ctx.state.steps = data.steps
        uiState.distance = ctx.state.distance
        uiState.steps = ctx.state.steps
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

      // 走跑混合因子
      const targetBlend = ctx.state.cadence >= CADENCE_CONFIG.RUN_THRESHOLD ? 1 : 0
      ctx.state.runningBlend = lerp(ctx.state.runningBlend, targetBlend, CADENCE_CONFIG.BLEND_LERP_FACTOR)

      // 滾動偏移
      ctx.state.scrollOffset += ctx.state.currentSpeed * CADENCE_CONFIG.BASE_SCROLL_SPEED

      // 攝影機更新
      const prevCam: CameraState = {
        x: ctx.state.cameraX,
        z: ctx.state.cameraZ,
        angle: ctx.state.cameraAngle,
      }
      const cam = updateCamera(
        ctx.state.scrollOffset,
        getTrackLUT(),
        prevCam,
        TRACK_CONFIG.CAMERA_ANGLE_LERP,
      )
      ctx.state.cameraX = cam.x
      ctx.state.cameraZ = cam.z
      ctx.state.cameraAngle = cam.angle

      // NPC 更新
      tickNpc(
        ctx.state.scrollOffset,
        ctx.state.currentSpeed,
        getTrackLength_(),
        getTrackLUT(),
      )

      // 圈數計算
      const tLen = getTrackLength_()
      if (tLen > 0) {
        uiState.lap = Math.floor(ctx.state.scrollOffset / tLen) + 1
        uiState.lapProgress = (ctx.state.scrollOffset % tLen) / tLen
      }
    }
  },

  onRender(ctx, canvasCtx) {
    renderScene(canvasCtx, {
      scrollOffset: ctx.state.scrollOffset,
      speed: ctx.state.currentSpeed,
      runningBlend: ctx.state.runningBlend,
      totalTicks: ctx.state.totalTicks,
      cameraX: ctx.state.cameraX,
      cameraZ: ctx.state.cameraZ,
      cameraAngle: ctx.state.cameraAngle,
      npcScrollOffset: getNpcScrollOffset(),
    })
  },

  onDestroy() {
    destroyNpc()
    destroyRenderer()
    canvasCtxRef = null
  },
})
