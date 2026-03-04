import type { GameModule, GameState, CastMessageData, BroadcastFn, ReplyFn } from '../../types/game'
import { GAME_DURATION, RESULT_TIMEOUT, SCENE_CONFIG, EFFECTS_CONFIG, PARTY_BG } from './constants'
import {
  initColoredSpritesheets,
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
} from './players'
import {
  createGameDOM,
  destroyGameDOM,
  showStartScreen,
  showCountdown,
  showPlaying,
  showResultPending,
  showGameOver,
  triggerCountdownPop,
  updateTimer,
  updateResultPendingPlayer,
  updateResultCountdown,
  updatePlayerList,
  updateGameOverContent,
} from './dom-ui'

// === 模組級狀態 ===
let gameState: GameState = 'START_SCREEN'
let shakeCount = 0
let timer = GAME_DURATION
let countdownInterval: ReturnType<typeof setInterval> | null = null
let finalScore = 0
let _spritesheet: HTMLImageElement | null = null
let _broadcastFn: BroadcastFn | null = null
let _replyFn: ReplyFn | null = null
let _returnToLobbyFn: (() => void) | null = null
let countdownTimeouts: ReturnType<typeof setTimeout>[] = []
let logicalWidth = 0
let logicalHeight = 0

// RESULT_PENDING 狀態
let resultPendingStartTime = 0
let resultCheckInterval: ReturnType<typeof setInterval> | null = null

// 搖晃動畫計時器
let globalShakeTimer = 0

// === 派對背景光點 ===
interface PartyLight {
  x: number
  y: number
  size: number
  colorIdx: number
  phase: number       // 閃爍相位
  driftX: number      // 漂移方向
  driftY: number
}
let partyLights: PartyLight[] = []
let bgGradient: CanvasGradient | null = null

// === 工具函數 ===
function isMultiplayerMode(): boolean {
  return getPlayerCount() > 0
}

function clearCountdownTimeouts(): void {
  for (const id of countdownTimeouts) {
    clearTimeout(id)
  }
  countdownTimeouts = []
}

function clearResultCheckInterval(): void {
  if (resultCheckInterval) {
    clearInterval(resultCheckInterval)
    resultCheckInterval = null
  }
}

function handleResize(): void {
  logicalWidth = globalThis.innerWidth
  logicalHeight = globalThis.innerHeight
  bgGradient = null // 重建漸層
}

// === 派對背景 ===
function initPartyLights(): void {
  partyLights = []
  for (let i = 0; i < PARTY_BG.LIGHT_COUNT; i++) {
    partyLights.push({
      x: Math.random() * logicalWidth,
      y: Math.random() * logicalHeight,
      size: PARTY_BG.LIGHT_MIN_SIZE + Math.random() * (PARTY_BG.LIGHT_MAX_SIZE - PARTY_BG.LIGHT_MIN_SIZE),
      colorIdx: Math.floor(Math.random() * PARTY_BG.LIGHT_COLORS.length),
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * PARTY_BG.DRIFT_SPEED,
      driftY: (Math.random() - 0.5) * PARTY_BG.DRIFT_SPEED,
    })
  }
}

function tickPartyLights(): void {
  for (const light of partyLights) {
    light.phase += PARTY_BG.PULSE_SPEED
    light.x += light.driftX
    light.y += light.driftY
    // 超出邊界則反彈
    if (light.x < 0 || light.x > logicalWidth) light.driftX *= -1
    if (light.y < 0 || light.y > logicalHeight) light.driftY *= -1
  }
}

function renderPartyBackground(ctx: CanvasRenderingContext2D): void {
  // 漸層底色（快取）
  if (!bgGradient) {
    bgGradient = ctx.createLinearGradient(0, 0, 0, logicalHeight)
    bgGradient.addColorStop(0, PARTY_BG.GRADIENT_TOP)
    bgGradient.addColorStop(1, PARTY_BG.GRADIENT_BOTTOM)
  }
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, logicalWidth, logicalHeight)

  // 閃爍光點
  for (const light of partyLights) {
    const alpha = 0.3 + 0.5 * Math.abs(Math.sin(light.phase))
    const colorTemplate = PARTY_BG.LIGHT_COLORS[light.colorIdx]!
    ctx.fillStyle = colorTemplate.replace('A', String(alpha.toFixed(2)))
    ctx.fillRect(
      Math.floor(light.x),
      Math.floor(light.y),
      light.size,
      light.size,
    )
  }
}

// === 狀態切換 ===
function changeState(newState: GameState): void {
  gameState = newState
  clearCountdownTimeouts()

  if (_broadcastFn) {
    _broadcastFn({ type: 'STATE_UPDATE', state: newState })
  }

  switch (newState) {
    case 'START_SCREEN':
      showStartScreen()
      break
    case 'COUNTDOWN':
      showCountdown()
      break
    case 'PLAYING':
      showPlaying()
      break
    case 'RESULT_PENDING':
      showResultPending(getPlayers())
      break
    case 'GAME_OVER':
      showGameOver()
      updateGameOverContent(isMultiplayerMode(), getLeaderboard(), finalScore)
      break
  }
}

// === 操作處理 ===
function handleAction(): void {
  switch (gameState) {
    case 'START_SCREEN':
      startCountdownSequence()
      break
    case 'COUNTDOWN':
      break
    case 'PLAYING':
      if (!isMultiplayerMode()) {
        triggerShake()
      }
      break
    case 'RESULT_PENDING':
      break
    case 'GAME_OVER':
      resetPlayers()
      unlockPlayers()
      changeState('START_SCREEN')
      break
  }
}

// === 開始倒數 ===
function startCountdownSequence(): void {
  changeState('COUNTDOWN')

  if (isMultiplayerMode()) {
    lockPlayers()
    resetPlayersGameState()
  }

  shakeCount = 0
  timer = GAME_DURATION
  globalShakeTimer = 0

  startDOMCountdown()
}

// === DOM 倒數動畫 ===
function startDOMCountdown(): void {
  const numbers = [
    { text: '3', color: '#FF6B6B', fontSize: '120px' },
    { text: '2', color: '#FFE66D', fontSize: '120px' },
    { text: '1', color: '#4ECDC4', fontSize: '120px' },
    { text: 'GO!', color: '#95E86B', fontSize: '80px' },
  ]

  for (let i = 0; i < numbers.length; i++) {
    const item = numbers[i]!
    const tid = setTimeout(() => {
      triggerCountdownPop(item.text, item.color, item.fontSize)
    }, i * 1000)
    countdownTimeouts.push(tid)
  }

  const startTid = setTimeout(() => {
    startGame()
  }, 3500)
  countdownTimeouts.push(startTid)
}

// === 開始遊戲 ===
function startGame(): void {
  changeState('PLAYING')

  if (countdownInterval) clearInterval(countdownInterval)
  countdownInterval = setInterval(() => {
    if (timer > 0) timer--
    if (timer <= 0) {
      clearInterval(countdownInterval!)
      countdownInterval = null
      onPlayingEnd()
    }
  }, 1000)
}

// === PLAYING 結束 ===
function onPlayingEnd(): void {
  if (isMultiplayerMode()) {
    enterResultPending()
  } else {
    finalScore = shakeCount
    changeState('GAME_OVER')
  }
}

// === 觸發搖晃（單人模式）===
function triggerShake(): void {
  shakeCount++
  triggerScreenShake(EFFECTS_CONFIG.SCREEN_SHAKE_INTENSITY)
}

// === RESULT_PENDING ===
function enterResultPending(): void {
  changeState('RESULT_PENDING')
  resultPendingStartTime = Date.now()

  if (_broadcastFn) {
    _broadcastFn({ type: 'REQUEST_RESULTS' })
  }

  resultCheckInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - resultPendingStartTime) / 1000)
    const remaining = RESULT_TIMEOUT - elapsed
    updateResultCountdown(Math.max(remaining, 0))

    if (allPlayersSubmitted() || elapsed >= RESULT_TIMEOUT) {
      clearResultCheckInterval()
      finalizeResults()
    }
  }, 500)
}

function finalizeResults(): void {
  finalScore = 0
  changeState('GAME_OVER')

  if (_broadcastFn) {
    const rankings = getLeaderboard().map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      playerName: p.name,
      score: p.score,
    }))
    _broadcastFn({ type: 'GAME_RESULTS', rankings })
  }
}

// === 處理 GAME_RESULT 訊息 ===
function handleGameResult(playerId: string, score: number): void {
  if (gameState !== 'RESULT_PENDING') return

  if (submitPlayerResult(playerId, score)) {
    updateResultPendingPlayer(playerId)
  }

  if (allPlayersSubmitted()) {
    clearResultCheckInterval()
    finalizeResults()
  }
}

// === 玩家加入處理 ===
function handlePlayerJoin(playerId: string, playerName: string, senderId?: string): void {
  if (gameState !== 'START_SCREEN') {
    replyTo(senderId, { type: 'JOIN_RESULT', success: false, reason: 'GAME_IN_PROGRESS' })
    return
  }

  const existing = getPlayerById(playerId)
  if (existing) {
    replyTo(senderId, { type: 'JOIN_RESULT', success: true, colorIndex: existing.colorIndex })
    return
  }

  if (addPlayerToList(playerId, playerName)) {
    const player = getPlayerById(playerId)
    replyTo(senderId, { type: 'JOIN_RESULT', success: true, colorIndex: player?.colorIndex ?? 0 })
    replyTo(senderId, { type: 'STATE_UPDATE', state: gameState })
  } else {
    replyTo(senderId, { type: 'JOIN_RESULT', success: false, reason: 'ROOM_FULL' })
  }
}

function replyTo(senderId: string | undefined, data: Record<string, unknown>): void {
  if (_replyFn && senderId) {
    _replyFn(senderId, data)
  }
}

// === 繪製地板 ===
function drawFloor(ctx: CanvasRenderingContext2D): void {
  const floorY = logicalHeight - SCENE_CONFIG.FLOOR_HEIGHT
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(0, floorY, logicalWidth, SCENE_CONFIG.FLOOR_HEIGHT)
  ctx.fillStyle = '#4a4a4a'
  ctx.fillRect(0, floorY, logicalWidth, 4)
}

// === 結構化訊息處理 ===
function handleStructuredMessage(data: Exclude<CastMessageData, string>, senderId?: string): void {
  switch (data.action) {
    case 'PLAYER_JOIN':
      handlePlayerJoin(data.playerId, data.playerName, senderId)
      break

    case 'PLAYER_LEAVE':
      if (gameState === 'START_SCREEN') {
        removePlayerFromList(data.playerId)
        updatePlayerList(getPlayers())
      }
      break

    case 'SHAKE':
      if (gameState === 'PLAYING') {
        if (!isMultiplayerMode()) {
          handleAction()
        }
        // 多人模式下忽略 SHAKE（盲玩）
      }
      break

    case 'GAME_RESULT':
      if ('playerId' in data && 'score' in data) {
        handleGameResult(data.playerId, data.score as number)
      }
      break

    case 'START_GAME':
      if (gameState === 'START_SCREEN') {
        startCountdownSequence()
      } else if (gameState === 'GAME_OVER') {
        resetPlayers()
        unlockPlayers()
        changeState('START_SCREEN')
      }
      break

    case 'RETURN_LOBBY':
      if (_returnToLobbyFn) {
        _returnToLobbyFn()
      }
      break
  }
}

// === GameModule 實作 ===
const ShakeItGame: GameModule = {
  id: 'shake_it',
  name: 'Shake It!',

  init(_canvas, _ctx, spritesheet, domContainer) {
    _spritesheet = spritesheet
    logicalWidth = globalThis.innerWidth
    logicalHeight = globalThis.innerHeight

    initColoredSpritesheets(spritesheet)
    createGameDOM(domContainer, handleAction)
    initPartyLights()

    globalThis.addEventListener('resize', handleResize)

    changeState('START_SCREEN')
  },

  start() {
    // tick/render 由 App.vue 驅動
  },

  stop() {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    clearCountdownTimeouts()
    clearResultCheckInterval()
  },

  destroy() {
    this.stop()
    resetPlayers()
    resetEffects()
    destroyGameDOM()
    globalThis.removeEventListener('resize', handleResize)

    gameState = 'START_SCREEN'
    shakeCount = 0
    timer = GAME_DURATION
    finalScore = 0
    globalShakeTimer = 0
    partyLights = []
    bgGradient = null
    _spritesheet = null
    _broadcastFn = null
    _replyFn = null
    _returnToLobbyFn = null
  },

  handleMessage(data: CastMessageData, senderId?: string) {
    if (typeof data === 'string') return
    handleStructuredMessage(data, senderId)
  },

  getState() {
    return gameState
  },

  setBroadcastCallbacks(broadcastFn, replyFn) {
    _broadcastFn = broadcastFn
    _replyFn = replyFn
  },

  setReturnToLobbyCallback(fn: () => void) {
    _returnToLobbyFn = fn
  },

  tick() {
    tickPartyLights()
    if (gameState === 'PLAYING') {
      globalShakeTimer++
      updateScreenShake()
    }
  },

  render(ctx: CanvasRenderingContext2D) {
    renderPartyBackground(ctx)

    switch (gameState) {
      case 'START_SCREEN':
        updatePlayerList(getPlayers())
        break
      case 'COUNTDOWN':
        drawFloor(ctx)
        if (_spritesheet) {
          if (isMultiplayerMode()) {
            const players = getPlayers()
            const positions = getPlayerPositions(logicalWidth)
            drawPlayersStatic(ctx, _spritesheet, positions, players.map(p => p.colorIndex), logicalHeight)
          } else {
            drawStaticCharacter(ctx, _spritesheet, logicalWidth, logicalHeight)
          }
        }
        break
      case 'PLAYING': {
        updateTimer(timer)
        const screenShake = getScreenShake()
        ctx.save()
        ctx.translate(screenShake.x, screenShake.y)
        drawFloor(ctx)
        if (_spritesheet) {
          if (isMultiplayerMode()) {
            const players = getPlayers()
            const positions = getPlayerPositions(logicalWidth)
            drawShakingCharacters(ctx, _spritesheet, positions, players.map(p => p.colorIndex), logicalHeight, globalShakeTimer)
          } else {
            drawShakingCharacter(ctx, _spritesheet, logicalWidth, logicalHeight, globalShakeTimer)
          }
        }
        ctx.restore()
        break
      }
      case 'RESULT_PENDING':
        break
      case 'GAME_OVER':
        break
    }
  },
}

export default ShakeItGame
