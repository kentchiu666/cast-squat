import type { JumpState, Player, SquashStretch } from '../../types/game'
import {
  JUMP_PHASE,
  JUMP_CONFIG,
  SPRITES,
  SCENE_CONFIG,
  PLAYER_COLORS,
  MULTIPLAYER_CONFIG,
  CHARACTER_ANIM_CONFIG,
} from './constants'
import type { SpriteRect } from './constants'
import { easeOutBack } from './utils'
import { createLandingParticles } from './particles'
import { createSpeedLines, createAfterImage, triggerScreenShake } from './effects'

// === 預渲染彩色精靈圖快取 ===
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

// === 單人跳躍狀態（使用 JumpState 物件）===
let singlePlayerState: JumpState = {
  jumpPhase: JUMP_PHASE.IDLE,
  phaseTimer: 0,
  characterY: 0,
  characterVelocityY: 0,
  squashStretch: { scaleX: 1, scaleY: 1 },
}

export function getCharacterState(): JumpState {
  return singlePlayerState
}

export function resetCharacter(): void {
  singlePlayerState = {
    jumpPhase: JUMP_PHASE.IDLE,
    phaseTimer: 0,
    characterY: 0,
    characterVelocityY: 0,
    squashStretch: { scaleX: 1, scaleY: 1 },
  }
}

export function canJump(): boolean {
  return singlePlayerState.jumpPhase === JUMP_PHASE.IDLE
}

export function startJump(): boolean {
  if (!canJump()) return false
  singlePlayerState.jumpPhase = JUMP_PHASE.ANTICIPATION
  singlePlayerState.phaseTimer = 0
  return true
}

// === 跳躍階段更新（各階段獨立函數）===
interface JumpContext {
  canvasWidth: number
  canvasHeight: number
  effectX?: number
  shakeIntensity: number
}

function updateRise(state: JumpState, jc: JumpContext): void {
  state.characterY += state.characterVelocityY
  state.characterVelocityY -= JUMP_CONFIG.GRAVITY

  const riseStretch = Math.min(state.characterVelocityY / JUMP_CONFIG.RISE_POWER, 1)
  state.squashStretch = {
    scaleX: 1 - riseStretch * 0.25,
    scaleY: 1 + riseStretch * 0.35,
  }

  if (state.phaseTimer % 2 === 0) {
    createAfterImage(state.characterY, state.squashStretch, jc.effectX)
  }

  if (state.characterVelocityY <= 0) {
    state.jumpPhase = JUMP_PHASE.HANG
    state.phaseTimer = 0
  }
}

function updateFall(state: JumpState, jc: JumpContext): void {
  state.characterVelocityY -= JUMP_CONFIG.GRAVITY
  state.characterY += state.characterVelocityY

  const fallSpeed = Math.abs(state.characterVelocityY) / CHARACTER_ANIM_CONFIG.FALL_SPEED_NORMALIZER
  state.squashStretch = {
    scaleX: 1 - Math.min(fallSpeed * 0.15, 0.2),
    scaleY: 1 + Math.min(fallSpeed * 0.2, 0.3),
  }

  if (state.phaseTimer % 2 === 0) {
    createAfterImage(state.characterY, state.squashStretch, jc.effectX)
  }

  if (state.characterY <= 0) {
    state.characterY = 0
    state.jumpPhase = JUMP_PHASE.LAND
    state.phaseTimer = 0
    triggerScreenShake(jc.shakeIntensity)
    createLandingParticles(jc.canvasWidth, jc.canvasHeight, jc.effectX)
  }
}

// === 跳躍狀態更新（共用核心）===
function updateJumpState(
  state: JumpState,
  canvasWidth: number,
  canvasHeight: number,
  effectX?: number,
  shakeIntensity: number = 8,
): void {
  state.phaseTimer++
  const jc: JumpContext = { canvasWidth, canvasHeight, effectX, shakeIntensity }

  switch (state.jumpPhase) {
    case JUMP_PHASE.IDLE:
      state.squashStretch = { scaleX: 1, scaleY: 1 }
      break

    case JUMP_PHASE.ANTICIPATION: {
      const progress = state.phaseTimer / JUMP_CONFIG.ANTICIPATION_DURATION
      state.squashStretch = {
        scaleX: 1 + progress * 0.3,
        scaleY: 1 - progress * 0.3,
      }
      state.characterY = -progress * CHARACTER_ANIM_CONFIG.ANTICIPATION_SINK

      if (state.phaseTimer >= JUMP_CONFIG.ANTICIPATION_DURATION) {
        state.jumpPhase = JUMP_PHASE.RISE
        state.phaseTimer = 0
        state.characterVelocityY = JUMP_CONFIG.RISE_POWER
        createSpeedLines(canvasWidth, canvasHeight, effectX)
      }
      break
    }

    case JUMP_PHASE.RISE:
      updateRise(state, jc)
      break

    case JUMP_PHASE.HANG:
      state.squashStretch = { scaleX: 1.05, scaleY: 0.95 }
      if (state.phaseTimer >= JUMP_CONFIG.HANG_DURATION) {
        state.jumpPhase = JUMP_PHASE.FALL
        state.phaseTimer = 0
        state.characterVelocityY = CHARACTER_ANIM_CONFIG.HANG_INITIAL_VELOCITY
      }
      break

    case JUMP_PHASE.FALL:
      updateFall(state, jc)
      break

    case JUMP_PHASE.LAND: {
      const landProgress = state.phaseTimer / JUMP_CONFIG.LAND_DURATION
      state.squashStretch = {
        scaleX: 1 + (1 - landProgress) * 0.4,
        scaleY: 1 - (1 - landProgress) * 0.35,
      }

      if (state.phaseTimer >= JUMP_CONFIG.LAND_DURATION) {
        state.jumpPhase = JUMP_PHASE.RECOVER
        state.phaseTimer = 0
      }
      break
    }

    case JUMP_PHASE.RECOVER: {
      const recoverProgress = easeOutBack(state.phaseTimer / JUMP_CONFIG.RECOVER_DURATION)
      state.squashStretch = {
        scaleX: 1 + (1 - recoverProgress) * 0.15,
        scaleY: 1 - (1 - recoverProgress) * 0.1,
      }

      if (state.phaseTimer >= JUMP_CONFIG.RECOVER_DURATION) {
        state.jumpPhase = JUMP_PHASE.IDLE
        state.phaseTimer = 0
        state.squashStretch = { scaleX: 1, scaleY: 1 }
      }
      break
    }
  }
}

// === 單人/多人跳躍更新（薄包裝）===
export function updateJump(canvasWidth: number, canvasHeight: number): void {
  updateJumpState(singlePlayerState, canvasWidth, canvasHeight, undefined, CHARACTER_ANIM_CONFIG.SINGLE_PLAYER_SHAKE_INTENSITY)
}

export function updatePlayerJump(
  player: Player,
  canvasWidth: number,
  canvasHeight: number,
  playerX: number,
): void {
  updateJumpState(player.jumpState, canvasWidth, canvasHeight, playerX, MULTIPLAYER_CONFIG.SHAKE_INTENSITY)
}

// === 角色部件（表情+手部）===
interface CharacterParts {
  face: SpriteRect
  hand: SpriteRect
  handAngle: { left: number; right: number }
}

function getPartsForPhase(phase: string): CharacterParts {
  switch (phase) {
    case JUMP_PHASE.ANTICIPATION:
      return { face: SPRITES.FACE_ANTICIPATION, hand: SPRITES.HAND_CLOSED, handAngle: { left: 0.8, right: -0.8 } }
    case JUMP_PHASE.RISE:
      return { face: SPRITES.FACE_RISE, hand: SPRITES.HAND_OPEN, handAngle: { left: -1.2, right: 1.2 } }
    case JUMP_PHASE.HANG:
      return { face: SPRITES.FACE_HANG, hand: SPRITES.HAND_PEACE, handAngle: { left: -1.5, right: 1.5 } }
    case JUMP_PHASE.FALL:
      return { face: SPRITES.FACE_FALL, hand: SPRITES.HAND_OPEN, handAngle: { left: -0.5, right: 0.5 } }
    case JUMP_PHASE.LAND:
      return { face: SPRITES.FACE_LAND, hand: SPRITES.HAND_CLOSED, handAngle: { left: 0.5, right: -0.5 } }
    case JUMP_PHASE.RECOVER:
      return { face: SPRITES.FACE_IDLE, hand: SPRITES.HAND_ROCK, handAngle: { left: -0.8, right: 0.8 } }
    default:
      return { face: SPRITES.FACE_IDLE, hand: SPRITES.HAND_CLOSED, handAngle: { left: 0.3, right: -0.3 } }
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
  y: number,
  height: number,
): void {
  const shadowScale = Math.max(0.3, 1 - height / CHARACTER_ANIM_CONFIG.SHADOW_FADE_HEIGHT)
  const shadowWidth = 60 * shadowScale
  const shadowHeight = 10 * shadowScale

  ctx.save()
  ctx.globalAlpha = 0.3 * shadowScale
  ctx.fillStyle = '#000'
  ctx.fillRect(x - shadowWidth, y - shadowHeight / 2, shadowWidth * 2, shadowHeight)
  ctx.restore()
}

// === 繪製角色（共用核心）===
interface DrawCharacterParams {
  bodySheet: CanvasImageSource
  faceSheet: CanvasImageSource
  phase: string
  ss: SquashStretch
  charY: number
  centerX: number
  canvasHeight: number
}

function drawCharacterCore(ctx: CanvasRenderingContext2D, p: DrawCharacterParams): void {
  const { bodySheet, faceSheet, phase, ss, charY, centerX, canvasHeight } = p
  const { face: currentFace, hand: currentHand, handAngle } = getPartsForPhase(phase)
  const body = SPRITES.BODY
  const baseSize = SCENE_CONFIG.BASE_SIZE

  const charRenderWidth = baseSize * ss.scaleX
  const charRenderHeight = baseSize * ss.scaleY
  const charRenderBottom =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - charY

  drawCharacterShadow(ctx, centerX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, charY)

  ctx.save()
  ctx.translate(centerX, charRenderBottom - charRenderHeight / 2)

  drawHand(ctx, bodySheet, currentHand, -charRenderWidth / 2 - CHARACTER_ANIM_CONFIG.HAND_OFFSET_X, 0, handAngle.left, true)
  drawHand(ctx, bodySheet, currentHand, charRenderWidth / 2 + CHARACTER_ANIM_CONFIG.HAND_OFFSET_X, 0, handAngle.right, false)

  ctx.drawImage(
    bodySheet,
    body.x, body.y, body.w, body.h,
    -charRenderWidth / 2, -charRenderHeight / 2, charRenderWidth, charRenderHeight,
  )

  const faceSizeRatio = currentFace.w / currentFace.h
  const faceHeight = CHARACTER_ANIM_CONFIG.FACE_HEIGHT
  const faceWidth = faceHeight * faceSizeRatio
  ctx.drawImage(
    faceSheet,
    currentFace.x, currentFace.y, currentFace.w, currentFace.h,
    -faceWidth / 2, -charRenderHeight / 2 + CHARACTER_ANIM_CONFIG.FACE_Y_OFFSET, faceWidth, faceHeight,
  )

  ctx.restore()
}

// === 繪製靜止角色（共用核心）===
function drawStaticCore(
  ctx: CanvasRenderingContext2D,
  bodySheet: CanvasImageSource,
  faceSheet: CanvasImageSource,
  centerX: number,
  canvasHeight: number,
): void {
  const body = SPRITES.BODY
  const face = SPRITES.FACE_IDLE
  const hand = SPRITES.HAND_CLOSED
  const baseSize = SCENE_CONFIG.BASE_SIZE
  const charRenderBottom =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET

  drawCharacterShadow(ctx, centerX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, 0)

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

// === 單人/多人繪製（薄包裝）===
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const { jumpPhase, squashStretch, characterY } = singlePlayerState
  drawCharacterCore(ctx, { bodySheet: spritesheet, faceSheet: spritesheet, phase: jumpPhase, ss: squashStretch, charY: characterY, centerX: canvasWidth / 2, canvasHeight })
}

export function drawPlayerCharacter(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  player: Player,
  playerX: number,
  canvasHeight: number,
): void {
  const state = player.jumpState
  const coloredSheet = getColoredSpritesheet(player.colorIndex)
  drawCharacterCore(ctx, { bodySheet: coloredSheet, faceSheet: spritesheet, phase: state.jumpPhase, ss: state.squashStretch, charY: state.characterY, centerX: playerX, canvasHeight })
}

export function drawStaticCharacter(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
): void {
  drawStaticCore(ctx, spritesheet, spritesheet, canvasWidth / 2, canvasHeight)
}

export function drawPlayersStatic(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  players: Player[],
  canvasWidth: number,
  canvasHeight: number,
): void {
  const count = players.length
  if (count === 0) return

  const spacing = canvasWidth / (count + 1)

  for (let index = 0; index < players.length; index++) {
    const player = players[index]!
    const playerX = spacing * (index + 1)
    const coloredSheet = getColoredSpritesheet(player.colorIndex)
    drawStaticCore(ctx, coloredSheet, spritesheet, playerX, canvasHeight)
  }
}

// === 繪製玩家預覽（等候室）===
export function drawPlayerPreview(
  ctx: CanvasRenderingContext2D,
  spritesheet: HTMLImageElement,
  player: Player,
  x: number,
  y: number,
): void {
  const coloredSheet = getColoredSpritesheet(player.colorIndex)
  const body = SPRITES.BODY
  const face = SPRITES.FACE_IDLE
  const previewSize = MULTIPLAYER_CONFIG.PLAYER_PREVIEW_SIZE

  ctx.save()
  ctx.translate(x, y)

  ctx.drawImage(
    coloredSheet,
    body.x, body.y, body.w, body.h,
    -previewSize / 2, -previewSize / 2, previewSize, previewSize,
  )

  const faceSizeRatio = face.w / face.h
  const faceHeight = previewSize * 0.35
  const faceWidth = faceHeight * faceSizeRatio
  ctx.drawImage(
    spritesheet,
    face.x, face.y, face.w, face.h,
    -faceWidth / 2, -previewSize / 2 + previewSize * 0.15, faceWidth, faceHeight,
  )

  ctx.restore()
}
