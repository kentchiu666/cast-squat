import { NPC_CONFIG, MODE7_CONFIG } from './constants'
import { sampleTrack } from './track'
import type { TrackSample } from './track'
import { lerp } from './cadence'

// === 純邏輯函數（可測試）===

/**
 * 計算環形距離：正值 = 玩家在前，負值 = NPC 在前
 */
export function circularGap(playerOffset: number, npcOffset: number, trackLength: number): number {
  if (trackLength <= 0) return 0
  let gap = playerOffset - npcOffset
  // 取最短路徑
  while (gap > trackLength / 2) gap -= trackLength
  while (gap < -trackLength / 2) gap += trackLength
  return gap
}

/**
 * 橡皮筋速度計算：根據與玩家的距離差調整 NPC 目標速度
 */
export function rubberBandSpeed(gap: number, config: typeof NPC_CONFIG): number {
  const { BASE_SPEED, RUBBER_BAND_STRENGTH, COMFORT_DISTANCE, MAX_SPEED_MULT, MIN_SPEED_MULT } = config

  // gap > 0 表示玩家在前 → NPC 要加速
  // gap < 0 表示 NPC 在前 → NPC 要減速
  const effectiveGap = gap > 0
    ? Math.max(0, gap - COMFORT_DISTANCE)
    : Math.min(0, gap + COMFORT_DISTANCE)

  const force = effectiveGap * RUBBER_BAND_STRENGTH
  const targetSpeed = BASE_SPEED * (1 + force)

  // Clamp
  const minSpeed = BASE_SPEED * MIN_SPEED_MULT
  const maxSpeed = BASE_SPEED * MAX_SPEED_MULT
  return Math.max(minSpeed, Math.min(maxSpeed, targetSpeed))
}

// === Module-level 狀態 ===

let npcOffset = 0
let npcSpeed = 0
let npcWorldX = 0
let npcWorldZ = 0
let npcAngle = 0
let sprite: OffscreenCanvas | null = null
let runFrame = 0

// 對話氣泡狀態
let bubbleText = ''
let bubbleTimer = 0
let bubbleCountdown = 0
let totalTickCount = 0

// === 精靈預渲染 ===

function prerenderSprite(): OffscreenCanvas {
  const w = NPC_CONFIG.SPRITE_WIDTH
  const h = NPC_CONFIG.SPRITE_HEIGHT
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const color = NPC_CONFIG.COLOR

  // 頭 (4x4 居中)
  ctx.fillStyle = color
  ctx.fillRect(4, 0, 4, 4)

  // 身體 (4x6)
  ctx.fillRect(4, 4, 4, 6)

  // 左腿
  ctx.fillRect(4, 10, 2, 6)

  // 右腿
  ctx.fillRect(8, 10, 2, 6)

  // 左臂
  ctx.fillRect(2, 5, 2, 4)

  // 右臂
  ctx.fillRect(10, 5, 2, 4)

  return c
}

function prerenderSpriteAlt(): OffscreenCanvas {
  const w = NPC_CONFIG.SPRITE_WIDTH
  const h = NPC_CONFIG.SPRITE_HEIGHT
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const color = NPC_CONFIG.COLOR

  // 頭
  ctx.fillStyle = color
  ctx.fillRect(4, 0, 4, 4)

  // 身體
  ctx.fillRect(4, 4, 4, 6)

  // 腿交叉（跑步幀 2）
  ctx.fillRect(2, 10, 2, 6)
  ctx.fillRect(10, 10, 2, 6)

  // 臂交叉
  ctx.fillRect(0, 4, 2, 4)
  ctx.fillRect(10, 6, 2, 4)

  return c
}

let spriteAlt: OffscreenCanvas | null = null

// === 公開 API ===

export function initNpc(): void {
  sprite = prerenderSprite()
  spriteAlt = prerenderSpriteAlt()
  npcOffset = 0
  npcSpeed = NPC_CONFIG.BASE_SPEED
  runFrame = 0
}

function randomBubbleInterval(): number {
  return NPC_CONFIG.BUBBLE_MIN_INTERVAL +
    Math.floor(Math.random() * (NPC_CONFIG.BUBBLE_MAX_INTERVAL - NPC_CONFIG.BUBBLE_MIN_INTERVAL))
}

export function resetNpc(playerOffset: number): void {
  npcOffset = playerOffset + NPC_CONFIG.INITIAL_LEAD
  npcSpeed = NPC_CONFIG.BASE_SPEED
  runFrame = 0
  bubbleText = ''
  bubbleTimer = 0
  bubbleCountdown = randomBubbleInterval()
  totalTickCount = 0
}

export interface NpcTickResult {
  worldX: number
  worldZ: number
  angle: number
  scrollOffset: number
}

export function tickNpc(
  playerOffset: number,
  playerSpeed: number,
  trackLength: number,
  trackLUT: TrackSample[],
): NpcTickResult {
  // 玩家靜止 → NPC 也減速
  const playerMoving = playerSpeed > 0.01
  const effectiveBaseSpeed = playerMoving ? NPC_CONFIG.BASE_SPEED : 0

  if (playerMoving) {
    const gap = circularGap(playerOffset, npcOffset, trackLength)
    const targetSpeed = rubberBandSpeed(gap, NPC_CONFIG)
    npcSpeed = lerp(npcSpeed, targetSpeed, NPC_CONFIG.SPEED_LERP)
  } else {
    npcSpeed = lerp(npcSpeed, effectiveBaseSpeed, NPC_CONFIG.SPEED_LERP)
  }

  // 更新位置
  npcOffset += npcSpeed * CADENCE_BASE_SCROLL
  if (trackLength > 0) {
    npcOffset = ((npcOffset % trackLength) + trackLength) % trackLength
  }

  // 查賽道位置
  const sample = sampleTrack(trackLUT, npcOffset)

  // 車道偏移（偏右）
  const perpX = Math.cos(sample.angle)
  const perpZ = Math.sin(sample.angle)
  npcWorldX = sample.x + perpX * NPC_CONFIG.LANE_OFFSET
  npcWorldZ = sample.z + perpZ * NPC_CONFIG.LANE_OFFSET
  npcAngle = sample.angle

  // 跑步動畫幀切換
  if (npcSpeed > 0.5) {
    runFrame++
  }

  // 對話氣泡計時
  totalTickCount++
  if (bubbleTimer > 0) {
    bubbleTimer--
    if (bubbleTimer <= 0) {
      bubbleText = ''
      bubbleCountdown = randomBubbleInterval()
    }
  } else {
    bubbleCountdown--
    if (bubbleCountdown <= 0) {
      const msgs = NPC_CONFIG.BUBBLE_MESSAGES
      bubbleText = msgs[Math.floor(Math.random() * msgs.length)]!
      bubbleTimer = NPC_CONFIG.BUBBLE_DURATION
    }
  }

  return {
    worldX: npcWorldX,
    worldZ: npcWorldZ,
    angle: npcAngle,
    scrollOffset: npcOffset,
  }
}

// 從 CADENCE_CONFIG.BASE_SCROLL_SPEED 取值，但避免循環 import
// 這個值代表 speed=1 時每 tick 移動的 scroll 距離
const CADENCE_BASE_SCROLL = 8

export function renderNpc(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camZ: number,
  camAngle: number,
): void {
  if (!sprite || !spriteAlt) return

  const dx = npcWorldX - camX
  const dz = npcWorldZ - camZ

  const cosA = Math.cos(camAngle)
  const sinA = Math.sin(camAngle)

  // 旋轉到攝影機空間
  const localX = dx * cosA + dz * sinA
  const localZ = dx * sinA - dz * cosA

  // 在攝影機後方或太遠 → 不畫
  if (localZ <= 10 || localZ > 800) return

  // 透視投影（同 world-objects.ts 公式）
  const focalLength = MODE7_CONFIG.FOCAL_LENGTH
  const horizonY = MODE7_CONFIG.HORIZON_Y
  const screenCenterX = MODE7_CONFIG.GROUND_LOGICAL_WIDTH / 2
  const cameraHeight = MODE7_CONFIG.CAMERA_HEIGHT
  const logicalScale = MODE7_CONFIG.GROUND_LOGICAL_HEIGHT / MODE7_CONFIG.PHYS_HEIGHT

  const groundBufferY = cameraHeight * focalLength / localZ - 1
  const screenY = horizonY + groundBufferY * logicalScale
  const scale = focalLength / localZ

  const screenX = screenCenterX + localX * scale * 2

  // 螢幕外裁剪
  if (screenX < -100 || screenX > 2020) return

  // 選擇跑步幀
  const currentSprite = (Math.floor(runFrame / 8) % 2 === 0) ? sprite : spriteAlt

  const drawW = Math.floor(currentSprite.width * scale * 3)
  const drawH = Math.floor(currentSprite.height * scale * 3)
  const drawX = Math.floor(screenX - drawW / 2)
  const drawY = Math.floor(screenY - drawH)

  ctx.globalAlpha = NPC_CONFIG.ALPHA
  ctx.drawImage(currentSprite, drawX, drawY, drawW, drawH)
  ctx.globalAlpha = 1

  // 太遠時不畫文字（避免雜亂）
  if (localZ > 400) return

  const fontSize = Math.max(8, Math.floor(scale * NPC_CONFIG.NAME_FONT_SCALE * 40))
  const nameY = drawY - NPC_CONFIG.NAME_OFFSET_Y * scale

  // 名稱標籤
  ctx.font = `${fontSize}px "Press Start 2P", cursive`
  ctx.textAlign = 'center'
  ctx.fillStyle = '#000000'
  ctx.fillText(NPC_CONFIG.NAME, screenX + 1, nameY + 1)
  ctx.fillStyle = NPC_CONFIG.COLOR
  ctx.fillText(NPC_CONFIG.NAME, screenX, nameY)

  // 對話氣泡
  if (bubbleText) {
    const bubbleFontSize = Math.max(10, Math.floor(scale * NPC_CONFIG.BUBBLE_FONT_SCALE * 40))
    ctx.font = `${bubbleFontSize}px "Press Start 2P", cursive`
    const textWidth = ctx.measureText(bubbleText).width
    const pad = NPC_CONFIG.BUBBLE_PADDING * scale * 3
    const bubbleW = textWidth + pad * 2
    const bubbleH = bubbleFontSize + pad * 2
    const bubbleX = screenX - bubbleW / 2
    const bubbleY = nameY - NPC_CONFIG.BUBBLE_OFFSET_Y * scale - bubbleH

    // 氣泡淡入淡出
    const fadeInTicks = 10
    const fadeOutTicks = 15
    const elapsed = NPC_CONFIG.BUBBLE_DURATION - bubbleTimer
    let alpha = 1
    if (elapsed < fadeInTicks) alpha = elapsed / fadeInTicks
    if (bubbleTimer < fadeOutTicks) alpha = bubbleTimer / fadeOutTicks
    ctx.globalAlpha = alpha

    // 氣泡背景
    ctx.fillStyle = NPC_CONFIG.BUBBLE_BG
    ctx.fillRect(Math.floor(bubbleX), Math.floor(bubbleY), Math.floor(bubbleW), Math.floor(bubbleH))

    // 氣泡尾巴（小三角）
    const tailSize = NPC_CONFIG.BUBBLE_TAIL_SIZE * scale * 3
    ctx.fillRect(Math.floor(screenX - tailSize / 2), Math.floor(bubbleY + bubbleH), Math.floor(tailSize), Math.floor(tailSize))

    // 邊框（像素風）
    ctx.fillStyle = NPC_CONFIG.BUBBLE_TEXT_COLOR
    const borderW = Math.max(1, Math.floor(scale * 2))
    ctx.fillRect(Math.floor(bubbleX), Math.floor(bubbleY), Math.floor(bubbleW), borderW)
    ctx.fillRect(Math.floor(bubbleX), Math.floor(bubbleY + bubbleH - borderW), Math.floor(bubbleW), borderW)
    ctx.fillRect(Math.floor(bubbleX), Math.floor(bubbleY), borderW, Math.floor(bubbleH))
    ctx.fillRect(Math.floor(bubbleX + bubbleW - borderW), Math.floor(bubbleY), borderW, Math.floor(bubbleH))

    // 氣泡文字
    ctx.textAlign = 'center'
    ctx.fillStyle = NPC_CONFIG.BUBBLE_TEXT_COLOR
    ctx.fillText(bubbleText, screenX, Math.floor(bubbleY + pad + bubbleFontSize * 0.85))

    ctx.globalAlpha = 1
  }
}

export function getNpcScrollOffset(): number {
  return npcOffset
}

export function destroyNpc(): void {
  sprite = null
  spriteAlt = null
  npcOffset = 0
  npcSpeed = 0
  npcWorldX = 0
  npcWorldZ = 0
  npcAngle = 0
  runFrame = 0
  bubbleText = ''
  bubbleTimer = 0
  bubbleCountdown = 0
  totalTickCount = 0
}
