import type { GameContext } from '../shared/types'
import { createGameModule } from '../shared/create-game-module'
import { GAME_DURATION, RESULT_TIMEOUT, SCENE_CONFIG, EFFECTS_CONFIG, PARTY_BG } from './constants'
import {
  initColoredSpritesheets,
  destroyCharacterSprites,
  drawShakingCharacter,
  drawShakingCharacters,
  drawStaticCharacter,
  drawPlayersStatic,
} from './character'
import { triggerScreenShake, updateScreenShake, getScreenShake, resetEffects } from './effects'
import {
  addPlayer as addPlayerToList,
  removePlayer as removePlayerFromList,
  getPlayers,
  getPlayerById,
  resetPlayers,
  resetPlayersGameState,
  lockPlayers,
  unlockPlayers,
  getPlayerCount,
  getPlayerPositions,
  submitPlayerResult,
  allPlayersSubmitted,
  getLeaderboard,
  setCharacterCount,
} from './players'
import { uiState, resetUIState } from './ui-state'
import ShakeItUI from './ShakeItUI.vue'

// === 遊戲專屬狀態 ===
interface ShakeItState {
  shakeCount: number
  timer: number
  finalScore: number
  globalShakeTimer: number
  // 派對背景
  partyLights: PartyLight[]
  bgGradient: CanvasGradient | null
  // RESULT_PENDING
  resultPendingStartTime: number
  resultCheckInterval: ReturnType<typeof setInterval> | null
  // resize handler
  handleResize: (() => void) | null
}

interface PartyLight {
  x: number
  y: number
  size: number
  colorIdx: number
  phase: number
  driftX: number
  driftY: number
}

const REFERENCE_WIDTH = 1920
const REFERENCE_HEIGHT = 1080

const createState = (): ShakeItState => ({
  shakeCount: 0,
  timer: GAME_DURATION,
  finalScore: 0,
  globalShakeTimer: 0,
  partyLights: [],
  bgGradient: null,
  resultPendingStartTime: 0,
  resultCheckInterval: null,
  handleResize: null,
})

// === 派對背景 ===
function initPartyLights(state: ShakeItState): void {
  state.partyLights = []
  for (let i = 0; i < PARTY_BG.LIGHT_COUNT; i++) {
    state.partyLights.push({
      x: Math.random() * REFERENCE_WIDTH,
      y: Math.random() * REFERENCE_HEIGHT,
      size: PARTY_BG.LIGHT_MIN_SIZE + Math.random() * (PARTY_BG.LIGHT_MAX_SIZE - PARTY_BG.LIGHT_MIN_SIZE),
      colorIdx: Math.floor(Math.random() * PARTY_BG.LIGHT_COLORS.length),
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * PARTY_BG.DRIFT_SPEED,
      driftY: (Math.random() - 0.5) * PARTY_BG.DRIFT_SPEED,
    })
  }
}

function tickPartyLights(state: ShakeItState): void {
  for (const light of state.partyLights) {
    light.phase += PARTY_BG.PULSE_SPEED
    light.x += light.driftX
    light.y += light.driftY
    if (light.x < 0 || light.x > REFERENCE_WIDTH) light.driftX *= -1
    if (light.y < 0 || light.y > REFERENCE_HEIGHT) light.driftY *= -1
  }
}

function renderPartyBackground(state: ShakeItState, canvasCtx: CanvasRenderingContext2D): void {
  if (!state.bgGradient) {
    state.bgGradient = canvasCtx.createLinearGradient(0, 0, 0, REFERENCE_HEIGHT)
    state.bgGradient.addColorStop(0, PARTY_BG.GRADIENT_TOP)
    state.bgGradient.addColorStop(1, PARTY_BG.GRADIENT_BOTTOM)
  }
  canvasCtx.fillStyle = state.bgGradient
  canvasCtx.fillRect(0, 0, REFERENCE_WIDTH, REFERENCE_HEIGHT)

  for (const light of state.partyLights) {
    const alpha = 0.3 + 0.5 * Math.abs(Math.sin(light.phase))
    const colorTemplate = PARTY_BG.LIGHT_COLORS[light.colorIdx]!
    canvasCtx.fillStyle = colorTemplate.replace('A', String(alpha.toFixed(2)))
    canvasCtx.fillRect(Math.floor(light.x), Math.floor(light.y), light.size, light.size)
  }
}

function drawFloor(canvasCtx: CanvasRenderingContext2D): void {
  const floorY = REFERENCE_HEIGHT - SCENE_CONFIG.FLOOR_HEIGHT
  canvasCtx.fillStyle = '#2a2a2a'
  canvasCtx.fillRect(0, floorY, REFERENCE_WIDTH, SCENE_CONFIG.FLOOR_HEIGHT)
  canvasCtx.fillStyle = '#4a4a4a'
  canvasCtx.fillRect(0, floorY, REFERENCE_WIDTH, 4)
}

// === RESULT_PENDING ===
function enterResultPending(ctx: GameContext<ShakeItState>): void {
  ctx.changeState('RESULT_PENDING')
  ctx.state.resultPendingStartTime = Date.now()
  ctx.broadcast({ type: 'REQUEST_RESULTS' })

  ctx.state.resultCheckInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - ctx.state.resultPendingStartTime) / 1000)
    const remaining = RESULT_TIMEOUT - elapsed
    uiState.resultCountdown = `Timeout in ${Math.max(remaining, 0)}s`

    if (allPlayersSubmitted() || elapsed >= RESULT_TIMEOUT) {
      clearResultCheckInterval(ctx.state)
      finalizeResults(ctx)
    }
  }, 500)
}

function clearResultCheckInterval(state: ShakeItState): void {
  if (state.resultCheckInterval) {
    clearInterval(state.resultCheckInterval)
    state.resultCheckInterval = null
  }
}

function finalizeResults(ctx: GameContext<ShakeItState>): void {
  ctx.state.finalScore = 0
  ctx.changeState('GAME_OVER')

  const rankings = getLeaderboard().map((p, i) => ({
    rank: i + 1,
    playerId: p.id,
    playerName: p.name,
    score: p.score,
  }))
  ctx.broadcast({ type: 'GAME_RESULTS', rankings })
}

function handleGameResult(ctx: GameContext<ShakeItState>, playerId: string, score: number): void {
  if (ctx.getGameState() !== 'RESULT_PENDING') return

  if (submitPlayerResult(playerId, score)) {
    uiState.players = [...getPlayers()]
  }

  if (allPlayersSubmitted()) {
    clearResultCheckInterval(ctx.state)
    finalizeResults(ctx)
  }
}

// === 繪製 PLAYING ===
function renderPlayingScreen(ctx: GameContext<ShakeItState>, canvasCtx: CanvasRenderingContext2D): void {
  uiState.timer = ctx.state.timer
  const screenShake = getScreenShake()
  canvasCtx.save()
  canvasCtx.translate(screenShake.x, screenShake.y)
  drawFloor(canvasCtx)

  if (ctx.isMultiplayerMode()) {
    const players = getPlayers()
    const positions = getPlayerPositions(REFERENCE_WIDTH)
    drawShakingCharacters(canvasCtx, positions, players.map(p => p.characterIndex), players.map(p => p.colorIndex), REFERENCE_HEIGHT, ctx.state.globalShakeTimer)
  } else {
    drawShakingCharacter(canvasCtx, REFERENCE_WIDTH, REFERENCE_HEIGHT, ctx.state.globalShakeTimer)
  }

  canvasCtx.restore()
}

// === GameModule ===
export default createGameModule<ShakeItState>({
  id: 'shake_it',
  name: 'Shake It!',
  uiComponent: ShakeItUI,
  createState,
  uiState: uiState as unknown as Record<string, unknown>,
  resetUIState,

  buttonText: {
    START_SCREEN: 'START GAME',
    COUNTDOWN: 'GET READY!',
    PLAYING: 'SHAKE!',
    RESULT_PENDING: 'WAITING...',
    GAME_OVER: 'RESTART',
  },

  countdown: {
    gameDuration: GAME_DURATION,
    onBeforeCountdown(ctx) {
      ctx.state.shakeCount = 0
      ctx.state.timer = GAME_DURATION
      ctx.state.globalShakeTimer = 0
    },
    onTimerTick(ctx) {
      if (ctx.state.timer > 0) ctx.state.timer--
      if (ctx.state.timer <= 0) {
        ctx.stopGameTimer()
        if (ctx.isMultiplayerMode()) {
          enterResultPending(ctx)
        } else {
          ctx.state.finalScore = ctx.state.shakeCount
          ctx.changeState('GAME_OVER')
        }
      }
    },
  },

  multiplayer: {
    getPlayerCount,
    getPlayers: getPlayers as () => unknown[],
    getPlayerById: getPlayerById as (id: string) => unknown,
    addPlayer: addPlayerToList,
    removePlayer: removePlayerFromList,
    resetPlayers,
    lockPlayers,
    unlockPlayers,
    resetPlayersGameState,
    getLeaderboard: getLeaderboard as () => unknown[],
    syncPlayersToUI() { uiState.players = [...getPlayers()] },
  },

  onInit(ctx, _canvas, _ctx2d, characterSheets) {
    initColoredSpritesheets(characterSheets)
    setCharacterCount(characterSheets.filter(Boolean).length)
    initPartyLights(ctx.state)

    ctx.state.handleResize = () => { ctx.state.bgGradient = null }
    globalThis.addEventListener('resize', ctx.state.handleResize)
  },

  onStateChange(ctx, newState) {
    if (newState === 'RESULT_PENDING') {
      uiState.players = [...getPlayers()]
    }
    if (newState === 'GAME_OVER') {
      uiState.leaderboard = getLeaderboard()
      uiState.finalScore = ctx.state.finalScore
    }
  },

  onAction(ctx) {
    if (ctx.getGameState() === 'PLAYING' && !ctx.isMultiplayerMode()) {
      ctx.state.shakeCount++
      triggerScreenShake(EFFECTS_CONFIG.SCREEN_SHAKE_INTENSITY)
    }
  },

  onMessage(ctx, data) {
    switch (data.action) {
      case 'SHAKE':
        if (ctx.getGameState() === 'PLAYING' && !ctx.isMultiplayerMode()) {
          ctx.state.shakeCount++
          triggerScreenShake(EFFECTS_CONFIG.SCREEN_SHAKE_INTENSITY)
        }
        break
      case 'GAME_RESULT':
        if ('playerId' in data && 'score' in data) {
          handleGameResult(ctx, data.playerId, data.score)
        }
        break
    }
  },

  onTick(ctx) {
    tickPartyLights(ctx.state)
    if (ctx.getGameState() === 'PLAYING') {
      ctx.state.globalShakeTimer++
      updateScreenShake()
    }
  },

  onRender(ctx, canvasCtx) {
    renderPartyBackground(ctx.state, canvasCtx)

    const gs = ctx.getGameState()
    switch (gs) {
      case 'START_SCREEN':
        uiState.players = [...getPlayers()]
        break
      case 'COUNTDOWN':
        drawFloor(canvasCtx)
        if (ctx.isMultiplayerMode()) {
          const players = getPlayers()
          const positions = getPlayerPositions(REFERENCE_WIDTH)
          drawPlayersStatic(canvasCtx, positions, players.map(p => p.characterIndex), players.map(p => p.colorIndex), REFERENCE_HEIGHT)
        } else {
          drawStaticCharacter(canvasCtx, REFERENCE_WIDTH, REFERENCE_HEIGHT)
        }
        break
      case 'PLAYING':
        renderPlayingScreen(ctx, canvasCtx)
        break
    }
  },

  onStop(ctx) {
    clearResultCheckInterval(ctx.state)
  },

  onDestroy(ctx) {
    resetPlayers()
    resetEffects()
    clearResultCheckInterval(ctx.state)
    destroyCharacterSprites()
    if (ctx.state.handleResize) {
      globalThis.removeEventListener('resize', ctx.state.handleResize)
    }
  },
})
