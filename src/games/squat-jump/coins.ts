import type { Player, SquashStretch } from '../../types/game'
import { COIN_CONFIG, MP_COIN_CONFIG, ITEM_SPRITES, SCENE_CONFIG, COIN_ANIM_CONFIG } from './constants'
import { randomRange, circleCollision } from './utils'
import { createCoinCollectParticles } from './particles'

// === 金幣型別（單人）===
interface Coin {
  x: number
  y: number
  collected: boolean
}

// === 多人獨立金幣型別 ===
interface PlayerCoin {
  x: number
  y: number
  playerIndex: number
  age: number
  collected: boolean
}

// === 單人金幣系統狀態 ===
let coins: Coin[] = []
let coinScore = 0
let coinSpawnTimer = 0
let coinAnimFrame = 0

// === 多人金幣系統狀態 ===
let playerCoins: PlayerCoin[] = []
let playerSpawnTimers: number[] = []
let mpCoinAnimFrame = 0

export function getCoinScore(): number {
  return coinScore
}

export function resetCoins(): void {
  coins = []
  coinScore = 0
  coinSpawnTimer = 0
  coinAnimFrame = 0
}

export function resetPlayerCoins(): void {
  playerCoins = []
  playerSpawnTimers = []
  mpCoinAnimFrame = 0
}

// === 生成金幣（單人）===
function spawnCoin(canvasWidth: number, canvasHeight: number): void {
  const height = randomRange(COIN_CONFIG.MIN_HEIGHT, COIN_CONFIG.MAX_HEIGHT)
  coins.push({
    x: canvasWidth + COIN_CONFIG.SIZE,
    y: canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - height,
    collected: false,
  })
}

// === 碰撞檢測（單人/多人共用）===
function checkCoinHit(
  charCenterX: number,
  canvasHeight: number,
  characterY: number,
  squashStretch: SquashStretch,
  coinX: number,
  coinY: number,
  coinSize: number,
): boolean {
  const charCenterY =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - characterY
  const charSize =
    SCENE_CONFIG.BASE_SIZE * Math.max(squashStretch.scaleX, squashStretch.scaleY)

  const coinCenterX = coinX + coinSize / 2
  const coinCenterY = coinY + coinSize / 2

  return circleCollision(charCenterX, charCenterY, charSize / 2, coinCenterX, coinCenterY, coinSize / 2)
}

// === 更新金幣（單人）===
export function updateCoins(
  canvasWidth: number,
  canvasHeight: number,
  characterY: number,
  squashStretch: SquashStretch,
): void {
  coinAnimFrame++
  coinSpawnTimer++
  if (coinSpawnTimer >= COIN_CONFIG.SPAWN_INTERVAL) {
    spawnCoin(canvasWidth, canvasHeight)
    coinSpawnTimer = 0
  }

  coins = coins.filter((coin) => {
    coin.x -= COIN_CONFIG.SPEED

    if (!coin.collected && checkCoinHit(canvasWidth / 2, canvasHeight, characterY, squashStretch, coin.x, coin.y, COIN_CONFIG.SIZE)) {
      coin.collected = true
      coinScore += COIN_CONFIG.SCORE
      createCoinCollectParticles(coin.x, coin.y, COIN_CONFIG.SIZE)
      return false
    }

    return coin.x > -COIN_CONFIG.SIZE
  })
}

// === 繪製金幣（單人）===
export function drawCoins(ctx: CanvasRenderingContext2D, spritesheet: CanvasImageSource): void {
  const coinSprite = ITEM_SPRITES.COIN
  const halfSize = COIN_CONFIG.SIZE / 2

  for (const coin of coins) {
    ctx.save()
    ctx.translate(coin.x + halfSize, coin.y + halfSize)

    const scale = Math.abs(Math.sin(coinAnimFrame * COIN_ANIM_CONFIG.FLIP_FREQUENCY + coin.x * 0.1))
    ctx.scale(COIN_ANIM_CONFIG.MIN_SCALE + scale * COIN_ANIM_CONFIG.SCALE_RANGE, 1)

    ctx.drawImage(
      spritesheet,
      coinSprite.x, coinSprite.y, coinSprite.w, coinSprite.h,
      -halfSize, -halfSize, COIN_CONFIG.SIZE, COIN_CONFIG.SIZE,
    )
    ctx.restore()
  }
}

// === 更新金幣（多人 — 每人獨立軌道）===
export function updateCoinsMultiplayer(
  _canvasWidth: number,
  canvasHeight: number,
  players: Player[],
  playerPositions: number[],
): void {
  mpCoinAnimFrame++

  // 初始化每個玩家的 spawn timer（隨機偏移避免同時生成）
  while (playerSpawnTimers.length < players.length) {
    playerSpawnTimers.push(Math.floor(randomRange(0, MP_COIN_CONFIG.SPAWN_INTERVAL)))
  }

  // 每個玩家各自生成金幣
  for (let i = 0; i < players.length; i++) {
    playerSpawnTimers[i]!++
    if (playerSpawnTimers[i]! >= MP_COIN_CONFIG.SPAWN_INTERVAL) {
      const height = randomRange(COIN_CONFIG.MIN_HEIGHT, COIN_CONFIG.MAX_HEIGHT)
      const playerX = playerPositions[i]!
      playerCoins.push({
        x: playerX - MP_COIN_CONFIG.SIZE / 2,
        y: canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - height,
        playerIndex: i,
        age: 0,
        collected: false,
      })
      playerSpawnTimers[i] = 0
    }
  }

  // 更新金幣：碰撞 + 超時移除
  playerCoins = playerCoins.filter((coin) => {
    coin.age++

    // 超時消失
    if (coin.age >= MP_COIN_CONFIG.HOVER_LIFETIME) {
      return false
    }

    // 碰撞檢測（只檢測歸屬的玩家）
    if (!coin.collected) {
      const player = players[coin.playerIndex]
      const playerX = playerPositions[coin.playerIndex]
      if (player && playerX !== undefined) {
        const state = player.jumpState
        if (checkCoinHit(
          playerX, canvasHeight, state.characterY, state.squashStretch,
          coin.x, coin.y, MP_COIN_CONFIG.SIZE,
        )) {
          coin.collected = true
          player.coinScore += MP_COIN_CONFIG.SCORE
          createCoinCollectParticles(coin.x, coin.y, MP_COIN_CONFIG.SIZE)
          return false
        }
      }
    }

    return true
  })
}

// === 繪製金幣（多人）===
export function drawPlayerCoins(ctx: CanvasRenderingContext2D, spritesheet: CanvasImageSource): void {
  const coinSprite = ITEM_SPRITES.COIN
  const halfSize = MP_COIN_CONFIG.SIZE / 2

  for (const coin of playerCoins) {
    // 閃爍效果：即將消失時每 6 幀隱藏一次
    if (coin.age >= MP_COIN_CONFIG.BLINK_START && Math.floor(coin.age / COIN_ANIM_CONFIG.BLINK_FRAME_RATE) % 2 === 1) {
      continue
    }

    ctx.save()
    ctx.translate(coin.x + halfSize, coin.y + halfSize)

    // 進場效果：前 N 幀從小變大
    const enterScale = coin.age < COIN_ANIM_CONFIG.ENTER_FRAMES ? coin.age / COIN_ANIM_CONFIG.ENTER_FRAMES : 1

    // 旋轉動畫（與單人一致）
    const flipScale = Math.abs(Math.sin(mpCoinAnimFrame * COIN_ANIM_CONFIG.FLIP_FREQUENCY + coin.playerIndex * 2))
    ctx.scale((COIN_ANIM_CONFIG.MIN_SCALE + flipScale * COIN_ANIM_CONFIG.SCALE_RANGE) * enterScale, enterScale)

    ctx.drawImage(
      spritesheet,
      coinSprite.x, coinSprite.y, coinSprite.w, coinSprite.h,
      -halfSize, -halfSize, MP_COIN_CONFIG.SIZE, MP_COIN_CONFIG.SIZE,
    )
    ctx.restore()
  }
}
