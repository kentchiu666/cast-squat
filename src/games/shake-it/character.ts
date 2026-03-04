import { CHAR_SPRITES, SCENE_CONFIG, PLAYER_COLORS, SHAKE_ANIM, CHARACTER_ANIM_CONFIG } from './constants'
import { initSpriteCache, getColoredSheet, clearSpriteCache } from './sprite-cache'

// === 初始化 ===
export function initColoredSpritesheets(characterSheets: HTMLImageElement[]): void {
  initSpriteCache(characterSheets, PLAYER_COLORS)
}

export function destroyCharacterSprites(): void {
  clearSpriteCache()
}

// === 搖晃變換計算 ===
interface ShakeTransform {
  offsetX: number
  offsetY: number
  rotation: number
  scaleX: number
  scaleY: number
}

export function getShakeTransform(globalTimer: number, playerIndex: number): ShakeTransform {
  const t = globalTimer + playerIndex * SHAKE_ANIM.PLAYER_PHASE_OFFSET

  return {
    offsetX: Math.sin(t * SHAKE_ANIM.OFFSET_X_FREQUENCY) * SHAKE_ANIM.OFFSET_X_AMPLITUDE,
    offsetY: Math.abs(Math.sin(t * SHAKE_ANIM.OFFSET_Y_FREQUENCY)) * SHAKE_ANIM.OFFSET_Y_AMPLITUDE,
    rotation: Math.sin(t * SHAKE_ANIM.ROTATION_FREQUENCY) * SHAKE_ANIM.ROTATION_AMPLITUDE,
    scaleX: 1 + Math.sin(t * SHAKE_ANIM.SQUASH_FREQUENCY) * SHAKE_ANIM.SQUASH_AMPLITUDE,
    scaleY: 1 - Math.sin(t * SHAKE_ANIM.SQUASH_FREQUENCY) * SHAKE_ANIM.SQUASH_AMPLITUDE,
  }
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
  charIndex: number,
  colorIndex: number,
  centerX: number,
  canvasHeight: number,
  transform: ShakeTransform,
): void {
  const bodySheet = getColoredSheet(charIndex, colorIndex)
  const faceSheet = getColoredSheet(charIndex, 0)
  const body = CHAR_SPRITES.BODY
  const face = CHAR_SPRITES.FACE_SURPRISED
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

  ctx.drawImage(
    bodySheet,
    body.x, body.y, body.w, body.h,
    -charRenderWidth / 2, -charRenderHeight / 2, charRenderWidth, charRenderHeight,
  )

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
  charIndex: number,
  colorIndex: number,
  centerX: number,
  canvasHeight: number,
): void {
  const bodySheet = getColoredSheet(charIndex, colorIndex)
  const faceSheet = getColoredSheet(charIndex, 0)
  const body = CHAR_SPRITES.BODY
  const face = CHAR_SPRITES.FACE_IDLE
  const baseSize = SCENE_CONFIG.BASE_SIZE
  const floorY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5
  const charRenderBottom =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET

  drawCharacterShadow(ctx, centerX, floorY)

  ctx.save()
  ctx.translate(centerX, charRenderBottom - baseSize / 2)

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

export function drawShakingCharacter(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  globalTimer: number,
): void {
  const transform = getShakeTransform(globalTimer, 0)
  drawShakingCharacterCore(ctx, 0, 0, canvasWidth / 2, canvasHeight, transform)
}

export function drawShakingCharacters(
  ctx: CanvasRenderingContext2D,
  positions: number[],
  characterIndices: number[],
  colorIndices: number[],
  canvasHeight: number,
  globalTimer: number,
): void {
  for (let i = 0; i < positions.length; i++) {
    const transform = getShakeTransform(globalTimer, i)
    drawShakingCharacterCore(ctx, characterIndices[i] ?? 0, colorIndices[i] ?? 0, positions[i]!, canvasHeight, transform)
  }
}

export function drawStaticCharacter(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
): void {
  drawStaticCore(ctx, 0, 0, canvasWidth / 2, canvasHeight)
}

export function drawPlayersStatic(
  ctx: CanvasRenderingContext2D,
  positions: number[],
  characterIndices: number[],
  colorIndices: number[],
  canvasHeight: number,
): void {
  for (let i = 0; i < positions.length; i++) {
    drawStaticCore(ctx, characterIndices[i] ?? 0, colorIndices[i] ?? 0, positions[i]!, canvasHeight)
  }
}
