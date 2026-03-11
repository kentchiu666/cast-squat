import type { GameContext } from '../shared/types'
import { createGameModule } from '../shared/create-game-module'
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

// === 遊戲專屬狀態 ===
interface SquatJumpState {
  squatCount: number
  timer: number
  finalScore: number
  itemSpritesheet: HTMLImageElement | null
}

const createState = (): SquatJumpState => ({
  squatCount: 0,
  timer: GAME_DURATION,
  finalScore: 0,
  itemSpritesheet: null,
})

// === 遊戲繪製邏輯 ===
const REFERENCE_WIDTH = 1920
const REFERENCE_HEIGHT = 1080

function drawFloor(canvasCtx: CanvasRenderingContext2D): void {
  const floorY = REFERENCE_HEIGHT - SCENE_CONFIG.FLOOR_HEIGHT
  canvasCtx.fillStyle = '#2a2a2a'
  canvasCtx.fillRect(0, floorY, REFERENCE_WIDTH, SCENE_CONFIG.FLOOR_HEIGHT)
  canvasCtx.fillStyle = '#4a4a4a'
  canvasCtx.fillRect(0, floorY, REFERENCE_WIDTH, 4)
}

function tickPlaying(): void {
  if (getPlayerCount() > 0) {
    const players = getPlayers()
    const positions = getPlayerPositions(REFERENCE_WIDTH)
    for (let i = 0; i < players.length; i++) {
      updatePlayerJump(players[i]!, REFERENCE_WIDTH, REFERENCE_HEIGHT, positions[i]!)
    }
    updateCoinsMultiplayer(REFERENCE_WIDTH, REFERENCE_HEIGHT, players, positions)
  } else {
    updateJump(REFERENCE_WIDTH, REFERENCE_HEIGHT)
    const { characterY, squashStretch } = getCharacterState()
    updateCoins(REFERENCE_WIDTH, REFERENCE_HEIGHT, characterY, squashStretch)
  }
  updateParticles()
  updateAfterImages()
  updateSpeedLines()
  updateScreenShake()
}

function triggerJump(ctx: GameContext<SquatJumpState>): void {
  if (startJump()) {
    ctx.state.squatCount++
  }
}

function renderPlayingScreen(ctx: GameContext<SquatJumpState>, canvasCtx: CanvasRenderingContext2D): void {
  uiState.squatCount = ctx.state.squatCount
  uiState.coinScore = getCoinScore()
  uiState.timer = ctx.state.timer
  uiState.players = [...getPlayers()]

  const screenShake = getScreenShake()
  canvasCtx.save()
  canvasCtx.translate(screenShake.x, screenShake.y)

  drawFloor(canvasCtx)
  drawSpeedLines(canvasCtx)

  if (ctx.state.itemSpritesheet) {
    if (ctx.isMultiplayerMode()) {
      drawPlayerCoins(canvasCtx, ctx.state.itemSpritesheet)
    } else {
      drawCoins(canvasCtx, ctx.state.itemSpritesheet)
    }
  }
  drawAfterImages(canvasCtx, REFERENCE_WIDTH, REFERENCE_HEIGHT)

  if (ctx.isMultiplayerMode()) {
    const players = getPlayers()
    const positions = getPlayerPositions(REFERENCE_WIDTH)
    for (let i = 0; i < players.length; i++) {
      drawPlayerCharacter(canvasCtx, players[i]!, positions[i]!, REFERENCE_HEIGHT)
    }
  } else {
    drawCharacter(canvasCtx, REFERENCE_WIDTH, REFERENCE_HEIGHT)
  }

  drawParticles(canvasCtx)
  canvasCtx.restore()
}

// === GameModule ===
export default createGameModule<SquatJumpState>({
  id: 'squat_jump',
  name: 'Squat Jump',
  uiComponent: SquatJumpUI,
  createState,
  uiState: uiState as unknown as Record<string, unknown>,
  resetUIState,

  buttonText: {
    START_SCREEN: 'START GAME',
    COUNTDOWN: 'GET READY!',
    PLAYING: 'JUMP!',
    GAME_OVER: 'RESTART',
  },

  countdown: {
    gameDuration: GAME_DURATION,
    onBeforeCountdown(ctx) {
      ctx.state.squatCount = 0
      ctx.state.timer = GAME_DURATION
      resetCoins()
      resetPlayerCoins()
      resetCharacter()
      clearParticles()
      resetEffects()
    },
    onTimerTick(ctx) {
      if (ctx.state.timer > 0) ctx.state.timer--
      if (ctx.state.timer <= 0) {
        ctx.stopGameTimer()
        ctx.state.finalScore = ctx.state.squatCount
        ctx.changeState('GAME_OVER')
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

  onInit(ctx, _canvas, _ctx2d, characterSheets, itemSpritesheet) {
    ctx.state.itemSpritesheet = itemSpritesheet
    initCharacterSprites(characterSheets)
    setCharacterCount(characterSheets.filter(Boolean).length)
  },

  onStateChange(ctx, newState) {
    if (newState === 'GAME_OVER') {
      uiState.leaderboard = getLeaderboard()
      uiState.finalScore = ctx.state.finalScore
      uiState.coinScore = getCoinScore()
    }
  },

  onAction(ctx) {
    if (ctx.getGameState() === 'PLAYING' && !ctx.isMultiplayerMode()) {
      triggerJump(ctx)
    }
  },

  onLegacyStringMessage(ctx, data) {
    if (data === 'SQUAT_JUMP') {
      if (ctx.getGameState() === 'PLAYING') {
        if (!ctx.isMultiplayerMode()) {
          triggerJump(ctx)
        }
      }
    }
  },

  onMessage(ctx, data) {
    if (data.action === 'SQUAT_JUMP' && ctx.getGameState() === 'PLAYING') {
      if (ctx.isMultiplayerMode() && 'playerId' in data && data.playerId) {
        triggerPlayerJump(data.playerId)
      } else {
        triggerJump(ctx)
      }
    }
  },

  onTick(ctx) {
    if (ctx.getGameState() === 'PLAYING') {
      tickPlaying()
    }
  },

  onRender(ctx, canvasCtx) {
    const gs = ctx.getGameState()
    switch (gs) {
      case 'START_SCREEN':
        uiState.players = [...getPlayers()]
        break
      case 'COUNTDOWN':
        drawFloor(canvasCtx)
        if (ctx.isMultiplayerMode()) {
          drawPlayersStatic(canvasCtx, getPlayers(), REFERENCE_WIDTH, REFERENCE_HEIGHT)
        } else {
          drawStaticCharacter(canvasCtx, REFERENCE_WIDTH, REFERENCE_HEIGHT)
        }
        break
      case 'PLAYING':
        renderPlayingScreen(ctx, canvasCtx)
        break
      case 'GAME_OVER':
        break
    }
  },

  onDestroy() {
    resetPlayers()
    resetCharacter()
    resetCoins()
    resetPlayerCoins()
    clearParticles()
    resetEffects()
    destroyCharacterSprites()
  },
})
