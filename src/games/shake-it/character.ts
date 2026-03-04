import { SPRITES, SCENE_CONFIG, PLAYER_COLORS, SHAKE_ANIM, CHARACTER_ANIM_CONFIG } from './constants'
import type { SpriteRect } from './constants'

// === 預渲染彩色精靈圖快取（支援 8 色）===
const coloredSpritesheets = new Map<number, CanvasImageSource>()

export function initColoredSpritesheets(spritesheet: HTMLImageElement): void {
  coloredSpritesheets.clear()
  coloredSpritesheets.set(0, spritesheet)

  for (let index = 0; index < PLAYER_COLORS.length; index++) {
    const color = PLAYER_COLORS[index]!
    if (color.hueRotation === 0) continue
    const offscreen = document.createElement('canvas')
    offscreen.width = spritesheet.width
    offscreen.height = spritesheet.height
    const offCtx = offscreen.getContext('2d')!
    offCtx.filter = `hue-rotate(${color.hueRotation}deg)`
    offCtx.drawImage(spritesheet, 0, 0)
    coloredSpritesheets.set(index, offscreen)
  }
}

function getColoredSpritesheet(colorIndex: number): CanvasImageSource {
  return coloredSpritesheets.get(colorIndex) ?? coloredSpritesheets.get(0)!
}

// === 搖晃變換計算 ===
interface ShakeTransform {
  offsetX: number
  offsetY: number
  rotation: number
  scaleX: number
  scaleY: number
  handAngleLeft: number
  handAngleRight: number
}

export function getShakeTransform(globalTimer: number, playerIndex: number): ShakeTransform {
  const t = globalTimer + playerIndex * SHAKE_ANIM.PLAYER_PHASE_OFFSET

  return {
    offsetX: Math.sin(t * SHAKE_ANIM.OFFSET_X_FREQUENCY) * SHAKE_ANIM.OFFSET_X_AMPLITUDE,
    offsetY: Math.abs(Math.sin(t * SHAKE_ANIM.OFFSET_Y_FREQUENCY)) * SHAKE_ANIM.OFFSET_Y_AMPLITUDE,
    rotation: Math.sin(t * SHAKE_ANIM.ROTATION_FREQUENCY) * SHAKE_ANIM.ROTATION_AMPLITUDE,
    scaleX: 1 + Math.sin(t * SHAKE_ANIM.SQUASH_FREQUENCY) * SHAKE_ANIM.SQUASH_AMPLITUDE,
    scaleY: 1 - Math.sin(t * SHAKE_ANIM.SQUASH_FREQUENCY) * SHAKE_ANIM.SQUASH_AMPLITUDE,
    handAngleLeft: Math.sin(t * SHAKE_ANIM.HAND_SWING_FREQUENCY) * SHAKE_ANIM.HAND_SWING_AMPLITUDE,
    handAngleRight: -Math.sin(t * SHAKE_ANIM.HAND_SWING_FREQUENCY) * SHAKE_ANIM.HAND_SWING_AMPLITUDE,
  }
}

// === 繪製手部 ===
function drawHand(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  handSprite: SpriteRect,
  x: number,
  y: number,
  angle: number,
  isLeft: boolean,
): void {
  const handScale = CHARACTER_ANIM_CONFIG.HAND_SCALE
  const handWidth = handSprite.w * handScale
  const handHeight = handSprite.h * handScale

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  if (isLeft) ctx.scale(-1, 1)
  ctx.drawImage(
    sheet,
    handSprite.x, handSprite.y, handSprite.w, handSprite.h,
    -handWidth / 2, -handHeight / 2, handWidth, handHeight,
  )
  ctx.restore()
}

// === 繪製角色陰影 ===
function drawCharacterShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
): void {
  const shadowWidth = 60
  const shadowHeight = 10

  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.fillStyle = '#000'
  ctx.fillRect(x - shadowWidth, floorY - shadowHeight / 2, shadowWidth * 2, shadowHeight)
  ctx.restore()
}

// === 繪製搖晃中的角色 ===
function drawShakingCharacterCore(
  ctx: CanvasRenderingContext2D,
  bodySheet: CanvasImageSource,
  faceSheet: CanvasImageSource,
  centerX: number,
  canvasHeight: number,
  transform: ShakeTransform,
): void {
  const body = SPRITES.BODY
  const face = SPRITES.FACE_SHAKING
  const hand = SPRITES.HAND_ROCK
  const baseSize = SCENE_CONFIG.BASE_SIZE

  const charRenderWidth = baseSize * transform.scaleX
  const charRenderHeight = baseSize * transform.scaleY
  const floorY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5
  const charRenderBottom =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - transform.offsetY

  drawCharacterShadow(ctx, centerX, floorY)

  ctx.save()
  ctx.translate(centerX + transform.offsetX, charRenderBottom - charRenderHeight / 2)
  ctx.rotate(transform.rotation)

  // 手部
  drawHand(ctx, bodySheet, hand, -charRenderWidth / 2 - CHARACTER_ANIM_CONFIG.HAND_OFFSET_X, 0, transform.handAngleLeft, true)
  drawHand(ctx, bodySheet, hand, charRenderWidth / 2 + CHARACTER_ANIM_CONFIG.HAND_OFFSET_X, 0, transform.handAngleRight, false)

  // 身體
  ctx.drawImage(
    bodySheet,
    body.x, body.y, body.w, body.h,
    -charRenderWidth / 2, -charRenderHeight / 2, charRenderWidth, charRenderHeight,
  )

  // 臉部
  const faceSizeRatio = face.w / face.h
  const faceHeight = CHARACTER_ANIM_CONFIG.FACE_HEIGHT
  const faceWidth = faceHeight * faceSizeRatio
  ctx.drawImage(
    faceSheet,
    face.x, face.y, face.w, face.h,
    -faceWidth / 2, -charRenderHeight / 2 + CHARACTER_ANIM_CONFIG.FACE_Y_OFFSET, faceWidth, faceHeight,
  )

  ctx.restore()
}

// === 繪製靜止角色 ===
function drawStaticCore(
  ctx: CanvasRenderingContext2D,
  bodySheet: CanvasImageSource,
  faceSheet: CanvasImageSource,
  centerX: number,
  canvasHeight: number,
): void {
  const body = SPRITES.BODY
  const face = SPRITES.FACE_IDLE
  const hand = SPRITES.HAND_OPEN
  const baseSize = SCENE_CONFIG.BASE_SIZE
  const floorY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5
  const charRenderBottom =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET

  drawCharacterShadow(ctx, centerX, floorY)

  ctx.save()
  ctx.translate(centerX, charRenderBottom - baseSize / 2)

  drawHand(ctx, bodySheet, hand, -baseSize / 2 - CHARACTER_ANIM_CONFIG.HAND_OFFSET_X, 0, 0.3, true)
  drawHand(ctx, bodySheet, hand, baseSize / 2 + CHARACTER_ANIM_CONFIG.HAND_OFFSET_X, 0, -0.3, false)

  ctx.drawImage(
    bodySheet,
    body.x, body.y, body.w, body.h,
    -baseSize / 2, -baseSize / 2, baseSize, baseSize,
  )

  const faceSizeRatio = face.w / face.h
  const faceHeight = CHARACTER_ANIM_CONFIG.FACE_HEIGHT
  const faceWidth = faceHeight * faceSizeRatio
  ctx.drawImage(
    faceSheet,
    face.x, face.y, face.w, face.h,
    -faceWidth / 2, -baseSize / 2 + CHARACTER_ANIM_CONFIG.FACE_Y_OFFSET, faceWidth, faceHeight,
  )

  ctx.restore()
}

// === 公開 API ===

/** 繪製單人搖晃中的角色 */
export function drawShakingCharacter(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  globalTimer: number,
): void {
  const transform = getShakeTransform(globalTimer, 0)
  drawShakingCharacterCore(ctx, spritesheet, spritesheet, canvasWidth / 2, canvasHeight, transform)
}

/** 繪製多人搖晃中的角色 */
export function drawShakingCharacters(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  positions: number[],
  colorIndices: number[],
  canvasHeight: number,
  globalTimer: number,
): void {
  for (let i = 0; i < positions.length; i++) {
    const transform = getShakeTransform(globalTimer, i)
    const coloredSheet = getColoredSpritesheet(colorIndices[i] ?? 0)
    drawShakingCharacterCore(ctx, coloredSheet, spritesheet, positions[i]!, canvasHeight, transform)
  }
}

/** 繪製單人靜止角色（倒數畫面）*/
export function drawStaticCharacter(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
): void {
  drawStaticCore(ctx, spritesheet, spritesheet, canvasWidth / 2, canvasHeight)
}

/** 繪製多人靜止角色（倒數畫面）*/
export function drawPlayersStatic(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  positions: number[],
  colorIndices: number[],
  canvasHeight: number,
): void {
  for (let i = 0; i < positions.length; i++) {
    const coloredSheet = getColoredSpritesheet(colorIndices[i] ?? 0)
    drawStaticCore(ctx, coloredSheet, spritesheet, positions[i]!, canvasHeight)
  }
}
