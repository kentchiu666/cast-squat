import { CHAR_SPRITES, SCENE_CONFIG, EFFECTS_CONFIG } from './constants'
import type { SquashStretch } from '../../types/game'
import { randomRange } from './utils'
import { getColoredSheet } from './sprite-cache'

// === 殘影型別 ===
interface AfterImage {
  y: number
  scaleX: number
  scaleY: number
  alpha: number
  playerX: number | null
  charIndex: number
  colorIndex: number
}

// === 速度線型別 ===
interface SpeedLine {
  x: number
  y: number
  length: number
  life: number
  decay: number
}

// === 螢幕震動型別 ===
interface ScreenShake {
  x: number
  y: number
  intensity: number
}

// === 系統狀態 ===
let afterImages: AfterImage[] = []
let speedLines: SpeedLine[] = []
let screenShake: ScreenShake = { x: 0, y: 0, intensity: 0 }

// === 重置 ===
export function resetEffects(): void {
  afterImages = []
  speedLines = []
  screenShake = { x: 0, y: 0, intensity: 0 }
}

export function getScreenShake(): ScreenShake {
  return screenShake
}

// === 殘影 ===
export function createAfterImage(
  characterY: number,
  squashStretch: SquashStretch,
  playerX?: number | null,
  charIndex: number = 0,
  colorIndex: number = 0,
): void {
  if (afterImages.length >= EFFECTS_CONFIG.MAX_AFTER_IMAGES) {
    afterImages.shift()
  }
  afterImages.push({
    y: characterY,
    scaleX: squashStretch.scaleX,
    scaleY: squashStretch.scaleY,
    alpha: EFFECTS_CONFIG.AFTER_IMAGE_INITIAL_ALPHA,
    playerX: playerX ?? null,
    charIndex,
    colorIndex,
  })
}

export function updateAfterImages(): void {
  afterImages = afterImages.filter((img) => {
    img.alpha -= EFFECTS_CONFIG.AFTER_IMAGE_DECAY
    return img.alpha > 0
  })
}

export function drawAfterImages(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const body = CHAR_SPRITES.BODY
  const baseSize = SCENE_CONFIG.BASE_SIZE

  for (const img of afterImages) {
    const sheet = getColoredSheet(img.charIndex, img.colorIndex)
    const charRenderWidth = baseSize * img.scaleX
    const charRenderHeight = baseSize * img.scaleY
    const charRenderBottom =
      canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - img.y
    const charCenterX = img.playerX ?? canvasWidth / 2

    ctx.save()
    ctx.globalAlpha = img.alpha * 0.4
    ctx.translate(charCenterX, charRenderBottom - charRenderHeight / 2)
    ctx.drawImage(
      sheet,
      body.x,
      body.y,
      body.w,
      body.h,
      -charRenderWidth / 2,
      -charRenderHeight / 2,
      charRenderWidth,
      charRenderHeight,
    )
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

// === 速度線 ===
export function createSpeedLines(
  canvasWidth: number,
  canvasHeight: number,
  playerX?: number | null,
): void {
  const centerX = playerX ?? canvasWidth / 2
  const groundY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET

  for (let i = 0; i < EFFECTS_CONFIG.SPEED_LINE_COUNT; i++) {
    speedLines.push({
      x: centerX + randomRange(-30, 30),
      y: groundY - randomRange(0, 30),
      length: randomRange(20, 60),
      life: 1,
      decay: EFFECTS_CONFIG.SPEED_LINE_DECAY,
    })
  }
}

export function updateSpeedLines(): void {
  speedLines = speedLines.filter((line) => {
    line.y += EFFECTS_CONFIG.SPEED_LINE_FALL_SPEED
    line.life -= line.decay
    return line.life > 0
  })
}

export function drawSpeedLines(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  for (const line of speedLines) {
    ctx.globalAlpha = line.life * 0.7
    ctx.beginPath()
    ctx.moveTo(line.x, line.y)
    ctx.lineTo(line.x, line.y + line.length)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// === 螢幕震動 ===
export function triggerScreenShake(intensity: number): void {
  screenShake.intensity = intensity
}

export function updateScreenShake(): void {
  if (screenShake.intensity > 0) {
    screenShake.x = randomRange(-1, 1) * screenShake.intensity
    screenShake.y = randomRange(-1, 1) * screenShake.intensity
    screenShake.intensity *= EFFECTS_CONFIG.SCREEN_SHAKE_DECAY
    if (screenShake.intensity < EFFECTS_CONFIG.SCREEN_SHAKE_THRESHOLD) {
      screenShake.intensity = 0
      screenShake.x = 0
      screenShake.y = 0
    }
  }
}
