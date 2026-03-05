import type { GameModule, GameState, CastMessageData, BroadcastFn, ReplyFn } from '../../types/game'
import { GAME_DURATION, SCENE_CONFIG } from './constants'
import {
  initCharacterSprites,
  destroyCharacterSprites,
  resetCharacter,
  updateJump,
  startJump,
  getCharacterState,
  drawCharacter,
  drawStaticCharacter,
  updatePlayerJump,
  drawPlayerCharacter,
  drawPlayersStatic,
} from './character'
import { updateCoins, drawCoins, getCoinScore, resetCoins, updateCoinsMultiplayer, drawPlayerCoins, resetPlayerCoins } from './coins'
import { updateParticles, drawParticles, clearParticles } from './particles'
import {
  updateAfterImages,
  drawAfterImages,
  updateSpeedLines,
  drawSpeedLines,
  updateScreenShake,
  getScreenShake,
  resetEffects,
} from './effects'
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
  triggerPlayerJump,
  getLeaderboard,
  setCharacterCount,
} from './players'
import { uiState, resetUIState } from './ui-state'
import SquatJumpUI from './SquatJumpUI.vue'

// === 模組級狀態 ===
let gameState: GameState = 'START_SCREEN'
let squatCount = 0
let timer = GAME_DURATION
let countdownInterval: ReturnType<typeof setInterval> | null = null
let finalScore = 0
let _itemSpritesheet: HTMLImageElement | null = null
let _broadcastFn: BroadcastFn | null = null
let _replyFn: ReplyFn | null = null
let _returnToLobbyFn: (() => void) | null = null
let countdownTimeouts: ReturnType<typeof setTimeout>[] = []
let logicalWidth = 0
let logicalHeight = 0

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

function handleResize(): void {
  logicalWidth = globalThis.innerWidth
  logicalHeight = globalThis.innerHeight
}

// === 狀態切換 ===
function changeState(newState: GameState): void {
  gameState = newState
  clearCountdownTimeouts()

  if (_broadcastFn) {
    _broadcastFn({ type: 'STATE_UPDATE', state: newState })
  }

  uiState.gameState = newState

  switch (newState) {
    case 'START_SCREEN':
      uiState.actionButtonText = 'START GAME'
      break
    case 'COUNTDOWN':
      uiState.actionButtonText = 'GET READY!'
      uiState.countdownText = ''
      break
    case 'PLAYING':
      uiState.actionButtonText = 'JUMP!'
      uiState.isMultiplayer = isMultiplayerMode()
      uiState.countdownText = ''
      break
    case 'GAME_OVER':
      uiState.actionButtonText = 'RESTART'
      uiState.leaderboard = getLeaderboard()
      uiState.finalScore = finalScore
      uiState.coinScore = getCoinScore()
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
        triggerJump()
      }
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

  squatCount = 0
  timer = GAME_DURATION
  resetCoins()
  resetPlayerCoins()
  resetCharacter()
  clearParticles()
  resetEffects()

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
      uiState.countdownText = item.text
      uiState.countdownColor = item.color
      uiState.countdownFontSize = item.fontSize
      uiState.countdownKey++
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
      finalScore = squatCount
      changeState('GAME_OVER')
    }
  }, 1000)
}

// === 觸發跳躍 ===
function triggerJump(): void {
  if (startJump()) {
    squatCount++
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
    syncPlayersToUI()
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

// === PLAYING tick ===
function tickPlaying(): void {
  if (isMultiplayerMode()) {
    const players = getPlayers()
    const positions = getPlayerPositions(logicalWidth)
    for (let i = 0; i < players.length; i++) {
      updatePlayerJump(players[i]!, logicalWidth, logicalHeight, positions[i]!)
    }
    updateCoinsMultiplayer(logicalWidth, logicalHeight, players, positions)
  } else {
    updateJump(logicalWidth, logicalHeight)
    const { characterY, squashStretch } = getCharacterState()
    updateCoins(logicalWidth, logicalHeight, characterY, squashStretch)
  }
  updateParticles()
  updateAfterImages()
  updateSpeedLines()
  updateScreenShake()
}

// === 繪製畫面 ===
function syncPlayersToUI(): void {
  uiState.players = [...getPlayers()]
}

function drawCountdownScreen(ctx: CanvasRenderingContext2D): void {
  drawFloor(ctx)

  if (isMultiplayerMode()) {
    drawPlayersStatic(ctx, getPlayers(), logicalWidth, logicalHeight)
  } else {
    drawStaticCharacter(ctx, logicalWidth, logicalHeight)
  }
}

function renderPlayingScreen(ctx: CanvasRenderingContext2D): void {
  uiState.squatCount = squatCount
  uiState.coinScore = getCoinScore()
  uiState.timer = timer
  uiState.players = [...getPlayers()]

  const screenShake = getScreenShake()
  ctx.save()
  ctx.translate(screenShake.x, screenShake.y)

  drawFloor(ctx)

  drawSpeedLines(ctx)
  if (_itemSpritesheet) {
    if (isMultiplayerMode()) {
      drawPlayerCoins(ctx, _itemSpritesheet)
    } else {
      drawCoins(ctx, _itemSpritesheet)
    }
  }
  drawAfterImages(ctx, logicalWidth, logicalHeight)

  if (isMultiplayerMode()) {
    const players = getPlayers()
    const positions = getPlayerPositions(logicalWidth)
    for (let i = 0; i < players.length; i++) {
      drawPlayerCharacter(ctx, players[i]!, positions[i]!, logicalHeight)
    }
  } else {
    drawCharacter(ctx, logicalWidth, logicalHeight)
  }

  drawParticles(ctx)
  ctx.restore()
}

// === 結構化訊息處理（從 handleMessage 抽離以降低複雜度）===
function handleStructuredMessage(data: Exclude<CastMessageData, string>, senderId?: string): void {
  switch (data.action) {
    case 'PLAYER_JOIN':
      handlePlayerJoin(data.playerId, data.playerName, senderId)
      break

    case 'PLAYER_LEAVE':
      if (gameState === 'START_SCREEN') {
        removePlayerFromList(data.playerId)
        syncPlayersToUI()
      }
      break

    case 'SQUAT_JUMP':
      if (gameState === 'PLAYING') {
        if (isMultiplayerMode() && data.playerId) {
          triggerPlayerJump(data.playerId)
        } else {
          handleAction()
        }
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
const SquatJumpGame: GameModule = {
  id: 'squat_jump',
  name: 'Squat Jump',

  init(_canvas, _ctx, characterSheets, itemSpritesheet) {
    _itemSpritesheet = itemSpritesheet
    logicalWidth = globalThis.innerWidth
    logicalHeight = globalThis.innerHeight

    initCharacterSprites(characterSheets)
    setCharacterCount(characterSheets.filter(Boolean).length)
    uiState.onAction = handleAction

    globalThis.addEventListener('resize', handleResize)

    changeState('START_SCREEN')
  },

  start() {
    // 遊戲模組已啟動，tick/render 由 App.vue 驅動
  },

  stop() {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    clearCountdownTimeouts()
  },

  destroy() {
    this.stop()
    resetPlayers()
    resetCharacter()
    resetCoins()
    resetPlayerCoins()
    clearParticles()
    resetEffects()
    resetUIState()
    globalThis.removeEventListener('resize', handleResize)

    destroyCharacterSprites()

    gameState = 'START_SCREEN'
    squatCount = 0
    timer = GAME_DURATION
    finalScore = 0
    _itemSpritesheet = null
    _broadcastFn = null
    _replyFn = null
    _returnToLobbyFn = null
  },

  handleMessage(data: CastMessageData, senderId?: string) {
    // 舊版相容
    if (data === 'SQUAT_JUMP') {
      handleAction()
      return
    }

    if (typeof data === 'string') return

    handleStructuredMessage(data, senderId)
  },

  getState() {
    return gameState
  },

  getUIComponent() {
    return SquatJumpUI
  },

  setBroadcastCallbacks(broadcastFn, replyFn) {
    _broadcastFn = broadcastFn
    _replyFn = replyFn
  },

  setReturnToLobbyCallback(fn: () => void) {
    _returnToLobbyFn = fn
  },

  tick() {
    if (gameState === 'PLAYING') {
      tickPlaying()
    }
  },

  render(ctx: CanvasRenderingContext2D) {
    switch (gameState) {
      case 'START_SCREEN':
        syncPlayersToUI()
        break
      case 'COUNTDOWN':
        drawCountdownScreen(ctx)
        break
      case 'PLAYING':
        renderPlayingScreen(ctx)
        break
      case 'GAME_OVER':
        // Canvas 只有星空（由 App.vue 繪製）
        break
    }
  },
}

export default SquatJumpGame
