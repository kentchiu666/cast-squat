import type { JumpState, Player, SquashStretch, SpriteRect } from '../../types/game'
import {
  JUMP_PHASE,
  JUMP_CONFIG,
  CHAR_SPRITES,
  SCENE_CONFIG,
  PLAYER_COLORS,
  MULTIPLAYER_CONFIG,
  CHARACTER_ANIM_CONFIG,
} from './constants'
import { easeOutBack } from './utils'
import { createLandingParticles } from './particles'
import { createSpeedLines, createAfterImage, triggerScreenShake } from './effects'
import { initSpriteCache, getColoredSheet, clearSpriteCache } from './sprite-cache'

// === 初始化 ===
export function initCharacterSprites(characterSheets: HTMLImageElement[]): void {
  initSpriteCache(characterSheets, PLAYER_COLORS)
}

export function destroyCharacterSprites(): void {
  clearSpriteCache()
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

// === 跳躍階段對應表情 ===
function getFaceForPhase(phase: string): SpriteRect {
  switch (phase) {
    case JUMP_PHASE.ANTICIPATION:
      return CHAR_SPRITES.FACE_FOCUSED
    case JUMP_PHASE.RISE:
      return CHAR_SPRITES.FACE_SURPRISED
    case JUMP_PHASE.HANG:
      return CHAR_SPRITES.FACE_CALM
    case JUMP_PHASE.FALL:
      return CHAR_SPRITES.FACE_NERVOUS
    case JUMP_PHASE.LAND:
      return CHAR_SPRITES.FACE_PAIN
    case JUMP_PHASE.RECOVER:
      return CHAR_SPRITES.FACE_IDLE
    default:
      return CHAR_SPRITES.FACE_IDLE
  }
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
  charIndex: number
  colorIndex: number
  phase: string
  ss: SquashStretch
  charY: number
  centerX: number
  canvasHeight: number
}

function drawCharacterCore(ctx: CanvasRenderingContext2D, p: DrawCharacterParams): void {
  const { charIndex, colorIndex, phase, ss, charY, centerX, canvasHeight } = p
  const currentFace = getFaceForPhase(phase)
  const body = CHAR_SPRITES.BODY
  const baseSize = SCENE_CONFIG.BASE_SIZE

  const bodySheet = getColoredSheet(charIndex, colorIndex)
  const faceSheet = getColoredSheet(charIndex, 0) // 臉部用原色

  const charRenderWidth = baseSize * ss.scaleX
  const charRenderHeight = baseSize * ss.scaleY
  const charRenderBottom =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - charY

  drawCharacterShadow(ctx, centerX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, charY)

  ctx.save()
  ctx.translate(centerX, charRenderBottom - charRenderHeight / 2)

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
  const charRenderBottom =
    canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET

  drawCharacterShadow(ctx, centerX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, 0)

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

// === 單人/多人繪製（薄包裝）===
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const { jumpPhase, squashStretch, characterY } = singlePlayerState
  drawCharacterCore(ctx, { charIndex: 0, colorIndex: 0, phase: jumpPhase, ss: squashStretch, charY: characterY, centerX: canvasWidth / 2, canvasHeight })
}

export function drawPlayerCharacter(
  ctx: CanvasRenderingContext2D,
  player: Player,
  playerX: number,
  canvasHeight: number,
): void {
  const state = player.jumpState
  drawCharacterCore(ctx, { charIndex: player.characterIndex, colorIndex: player.colorIndex, phase: state.jumpPhase, ss: state.squashStretch, charY: state.characterY, centerX: playerX, canvasHeight })
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
    drawStaticCore(ctx, player.characterIndex, player.colorIndex, playerX, canvasHeight)
  }
}

// === 繪製玩家預覽（等候室）===
export function drawPlayerPreview(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
): void {
  const bodySheet = getColoredSheet(player.characterIndex, player.colorIndex)
  const faceSheet = getColoredSheet(player.characterIndex, 0)
  const body = CHAR_SPRITES.BODY
  const face = CHAR_SPRITES.FACE_IDLE
  const previewSize = MULTIPLAYER_CONFIG.PLAYER_PREVIEW_SIZE

  ctx.save()
  ctx.translate(x, y)

  ctx.drawImage(
    bodySheet,
    body.x, body.y, body.w, body.h,
    -previewSize / 2, -previewSize / 2, previewSize, previewSize,
  )

  const faceSizeRatio = face.w / face.h
  const faceHeight = previewSize * 0.35
  const faceWidth = faceHeight * faceSizeRatio
  ctx.drawImage(
    faceSheet,
    face.x, face.y, face.w, face.h,
    -faceWidth / 2, -previewSize / 2 + previewSize * 0.15, faceWidth, faceHeight,
  )

  ctx.restore()
}
