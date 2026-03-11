import type { GameModule, GameState, CastMessageData, BroadcastFn, ReplyFn } from '../../types/game'
import type { GameConfig, GameContext } from './types'

const REFERENCE_WIDTH = 1920
const REFERENCE_HEIGHT = 1080

// === 倒數動畫配置 ===
const COUNTDOWN_NUMBERS = [
  { text: '3', color: '#FF6B6B', fontSize: '6.25vw' },
  { text: '2', color: '#FFE66D', fontSize: '6.25vw' },
  { text: '1', color: '#4ECDC4', fontSize: '6.25vw' },
  { text: 'GO!', color: '#95E86B', fontSize: '4.17vw' },
] as const

/**
 * 建立 GameModule 的工廠函數。
 * 封裝所有遊戲共用的邏輯：狀態管理、通訊、倒數、訊息路由。
 * 遊戲只需透過 config hooks 定義差異部分。
 */
export function createGameModule<TState>(config: GameConfig<TState>): GameModule {
  // === 內部共用狀態 ===
  let gameState: GameState = 'START_SCREEN'
  let state: TState = config.createState()
  let broadcastFn: BroadcastFn | null = null
  let replyFn: ReplyFn | null = null
  let returnToLobbyFn: (() => void) | null = null
  let countdownTimeouts: ReturnType<typeof setTimeout>[] = []
  let countdownInterval: ReturnType<typeof setInterval> | null = null

  // === GameContext 建構 ===
  const ctx: GameContext<TState> = {
    state,
    logicalWidth: REFERENCE_WIDTH,
    logicalHeight: REFERENCE_HEIGHT,

    getGameState() {
      return gameState
    },

    changeState(newState: GameState) {
      gameState = newState
      clearCountdownTimeouts()

      broadcastFn?.({ type: 'STATE_UPDATE', state: newState })

      config.uiState.gameState = newState
      const btnText = config.buttonText[newState]
      if (btnText) {
        config.uiState.actionButtonText = btnText
      }

      // 多人模式下自動更新 isMultiplayer
      if (config.multiplayer && 'isMultiplayer' in config.uiState) {
        config.uiState.isMultiplayer = config.multiplayer.getPlayerCount() > 0
      }

      // 倒數狀態清空 countdownText
      if (newState === 'COUNTDOWN' && 'countdownText' in config.uiState) {
        config.uiState.countdownText = ''
      }
      if (newState === 'PLAYING' && 'countdownText' in config.uiState) {
        config.uiState.countdownText = ''
      }

      config.onStateChange?.(ctx, newState)
    },

    broadcast(data: Record<string, unknown>) {
      broadcastFn?.(data)
    },

    replyTo(senderId: string | undefined, data: Record<string, unknown>) {
      if (replyFn && senderId) {
        replyFn(senderId, data)
      }
    },

    returnToLobby() {
      returnToLobbyFn?.()
    },

    isMultiplayerMode() {
      return config.multiplayer ? config.multiplayer.getPlayerCount() > 0 : false
    },

    stopGameTimer() {
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    },
  }

  // === 倒數工具 ===
  function clearCountdownTimeouts(): void {
    for (const id of countdownTimeouts) {
      clearTimeout(id)
    }
    countdownTimeouts = []
  }

  function startCountdownSequence(): void {
    const cd = config.countdown
    if (!cd) return

    ctx.changeState('COUNTDOWN')

    if (config.multiplayer && ctx.isMultiplayerMode()) {
      config.multiplayer.lockPlayers()
      config.multiplayer.resetPlayersGameState()
    }

    cd.onBeforeCountdown?.(ctx)
    startDOMCountdown()
  }

  function startDOMCountdown(): void {
    for (const [i, item] of COUNTDOWN_NUMBERS.entries()) {
      const tid = setTimeout(() => {
        config.uiState.countdownText = item.text
        config.uiState.countdownColor = item.color
        config.uiState.countdownFontSize = item.fontSize
        if ('countdownKey' in config.uiState && typeof config.uiState.countdownKey === 'number') {
          config.uiState.countdownKey++
        }
      }, i * 1000)
      countdownTimeouts.push(tid)
    }

    const startTid = setTimeout(() => {
      startGame()
    }, 3500)
    countdownTimeouts.push(startTid)
  }

  function startGame(): void {
    ctx.changeState('PLAYING')

    const cd = config.countdown
    if (!cd) return

    cd.onGameStart?.(ctx)

    if (countdownInterval) clearInterval(countdownInterval)
    countdownInterval = setInterval(() => {
      cd.onTimerTick?.(ctx)
    }, 1000)
  }

  // === 玩家加入處理 ===
  function handlePlayerJoin(playerId: string, playerName: string, senderId?: string): void {
    const mp = config.multiplayer
    if (!mp) {
      // 單人模式（如 Virtual Run）：直接接受加入
      ctx.replyTo(senderId, { type: 'JOIN_RESULT', success: true })
      ctx.replyTo(senderId, { type: 'STATE_UPDATE', state: gameState })
      return
    }

    if (gameState !== 'START_SCREEN') {
      ctx.replyTo(senderId, { type: 'JOIN_RESULT', success: false, reason: 'GAME_IN_PROGRESS' })
      return
    }

    if (mp.getPlayerById) {
      const existing = mp.getPlayerById(playerId)
      if (existing && typeof existing === 'object' && 'colorIndex' in existing) {
        ctx.replyTo(senderId, { type: 'JOIN_RESULT', success: true, colorIndex: (existing as { colorIndex: number }).colorIndex })
        return
      }
    }

    if (mp.addPlayer(playerId, playerName)) {
      let colorIndex = 0
      if (mp.getPlayerById) {
        const player = mp.getPlayerById(playerId)
        if (player && typeof player === 'object' && 'colorIndex' in player) {
          colorIndex = (player as { colorIndex: number }).colorIndex
        }
      }
      mp.syncPlayersToUI(ctx)
      ctx.replyTo(senderId, { type: 'JOIN_RESULT', success: true, colorIndex })
      ctx.replyTo(senderId, { type: 'STATE_UPDATE', state: gameState })
    } else {
      ctx.replyTo(senderId, { type: 'JOIN_RESULT', success: false, reason: 'ROOM_FULL' })
    }
  }

  // === START_GAME 訊息處理 ===
  function handleStartGame(): void {
    if (gameState === 'START_SCREEN') {
      if (config.countdown) {
        startCountdownSequence()
      } else {
        config.onAction?.(ctx)
      }
    } else if (gameState === 'GAME_OVER') {
      if (config.multiplayer) {
        config.multiplayer.resetPlayers()
        config.multiplayer.unlockPlayers()
      }
      // 有倒數的遊戲切回 START_SCREEN；無倒數的遊戲呼叫 onAction 讓其自行處理
      if (config.countdown) {
        ctx.changeState('START_SCREEN')
      } else {
        config.onAction?.(ctx)
      }
    }
  }

  // === 共用訊息路由 ===
  function handleStructuredMessage(data: Exclude<CastMessageData, string>, senderId?: string): void {
    switch (data.action) {
      case 'PLAYER_JOIN':
        handlePlayerJoin(data.playerId, data.playerName, senderId)
        break

      case 'PLAYER_LEAVE':
        if (config.multiplayer && gameState === 'START_SCREEN') {
          config.multiplayer.removePlayer(data.playerId)
          config.multiplayer.syncPlayersToUI(ctx)
        }
        break

      case 'START_GAME':
        handleStartGame()
        break

      case 'RETURN_LOBBY':
        ctx.returnToLobby()
        break

      default:
        // 遊戲專屬訊息（SQUAT_JUMP、SHAKE、RUN_UPDATE、GAME_RESULT 等）
        config.onMessage?.(ctx, data, senderId)
        break
    }
  }

  // === 操作按鈕處理（本地點擊） ===
  function handleAction(): void {
    switch (gameState) {
      case 'START_SCREEN':
        if (config.countdown) {
          startCountdownSequence()
        } else {
          config.onAction?.(ctx)
        }
        break
      case 'COUNTDOWN':
        break
      case 'PLAYING':
        config.onAction?.(ctx)
        break
      case 'GAME_OVER':
        if (config.multiplayer) {
          config.multiplayer.resetPlayers()
          config.multiplayer.unlockPlayers()
        }
        ctx.changeState('START_SCREEN')
        break
      default:
        config.onAction?.(ctx)
        break
    }
  }

  // === 組裝 GameModule ===
  return {
    id: config.id,
    name: config.name,

    init(canvas, ctx2d, characterSheets, itemSpritesheet) {
      config.uiState.onAction = handleAction
      config.onInit?.(ctx, canvas, ctx2d, characterSheets, itemSpritesheet)
      ctx.changeState('START_SCREEN')
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
      config.onStop?.(ctx)
    },

    destroy() {
      this.stop()
      config.onDestroy?.(ctx)
      config.resetUIState()

      // 一行重置所有遊戲狀態
      gameState = 'START_SCREEN'
      state = config.createState()
      ctx.state = state
      broadcastFn = null
      replyFn = null
      returnToLobbyFn = null
    },

    handleMessage(data: CastMessageData, senderId?: string) {
      if (typeof data === 'string') {
        config.onLegacyStringMessage?.(ctx, data)
        return
      }
      handleStructuredMessage(data, senderId)
    },

    getState() {
      return gameState
    },

    getUIComponent() {
      return config.uiComponent
    },

    setBroadcastCallbacks(bf, rf) {
      broadcastFn = bf
      replyFn = rf
    },

    setReturnToLobbyCallback(fn: () => void) {
      returnToLobbyFn = fn
    },

    tick() {
      config.onTick?.(ctx)
    },

    render(canvasCtx: CanvasRenderingContext2D) {
      config.onRender?.(ctx, canvasCtx)
    },
  }
}

export type { GameConfig, GameContext } from './types'
