import { SCENE_CONFIG } from '../constants'

const REFERENCE_WIDTH = 1920
const SKY_WRAP_WIDTH = REFERENCE_WIDTH * 2

// 視差速度（遠山慢、近山快）
const FAR_MOUNTAIN_PARALLAX = 80
const NEAR_MOUNTAIN_PARALLAX = 200

// Offscreen canvases（init 時預渲染）
let skyGradientCanvas: OffscreenCanvas | null = null
let mountainFarCanvas: OffscreenCanvas | null = null
let mountainNearCanvas: OffscreenCanvas | null = null

// === 像素風山形生成 ===
function generateMountainProfile(
  baseY: number,
  peakHeight: number,
  segments: number,
): number[] {
  const profile: number[] = []
  for (let i = 0; i <= segments; i++) {
    const x = i / segments
    const height =
      Math.sin(x * Math.PI * 2.3) * peakHeight * 0.4 +
      Math.sin(x * Math.PI * 5.1) * peakHeight * 0.25 +
      Math.sin(x * Math.PI * 8.7) * peakHeight * 0.15
    profile.push(baseY - Math.abs(height))
  }
  return profile
}

// === 初始化：預渲染天空各層 ===
export function initSky(skyColors: { top: string; bottom: string; mountainDark: string; mountainLight: string }): void {
  const horizonY = SCENE_CONFIG.HORIZON_Y

  // Layer 1: 天空漸層（靜態，不做視差）
  skyGradientCanvas = new OffscreenCanvas(REFERENCE_WIDTH, horizonY)
  const gradCtx = skyGradientCanvas.getContext('2d')
  if (gradCtx) {
    const gradient = gradCtx.createLinearGradient(0, 0, 0, horizonY)
    gradient.addColorStop(0, skyColors.top)
    gradient.addColorStop(1, skyColors.bottom)
    gradCtx.fillStyle = gradient
    gradCtx.fillRect(0, 0, REFERENCE_WIDTH, horizonY)
  }

  // Layer 2: 遠山（慢視差）— 2 倍寬，繪製兩次以無縫循環
  mountainFarCanvas = new OffscreenCanvas(SKY_WRAP_WIDTH, horizonY)
  const farCtx = mountainFarCanvas.getContext('2d')
  if (farCtx) {
    drawMountainRange(farCtx, horizonY, REFERENCE_WIDTH, {
      baseY: horizonY, peakHeight: 120, color: skyColors.mountainDark, segments: 24,
    })
    // 第二份（偏移 REFERENCE_WIDTH）
    drawMountainRange(farCtx, horizonY, REFERENCE_WIDTH, {
      baseY: horizonY, peakHeight: 120, color: skyColors.mountainDark, segments: 24,
      offsetX: REFERENCE_WIDTH,
    })
  }

  // Layer 3: 近山（快視差）— 2 倍寬
  mountainNearCanvas = new OffscreenCanvas(SKY_WRAP_WIDTH, horizonY)
  const nearCtx = mountainNearCanvas.getContext('2d')
  if (nearCtx) {
    drawMountainRange(nearCtx, horizonY, REFERENCE_WIDTH, {
      baseY: horizonY, peakHeight: 80, color: skyColors.mountainLight, segments: 16, offsetY: 20,
    })
    drawMountainRange(nearCtx, horizonY, REFERENCE_WIDTH, {
      baseY: horizonY, peakHeight: 80, color: skyColors.mountainLight, segments: 16, offsetY: 20,
      offsetX: REFERENCE_WIDTH,
    })
  }
}

function drawMountainRange(
  ctx: OffscreenCanvasRenderingContext2D,
  horizonY: number,
  sectionWidth: number,
  config: {
    baseY: number
    peakHeight: number
    color: string
    segments: number
    offsetY?: number
    offsetX?: number
  },
): void {
  const { baseY, peakHeight, color, segments, offsetY = 0, offsetX = 0 } = config
  const segmentWidth = Math.ceil(sectionWidth / segments)
  const profile = generateMountainProfile(baseY - offsetY, peakHeight, segments)

  ctx.fillStyle = color

  for (let i = 0; i < segments; i++) {
    const x = offsetX + i * segmentWidth
    const topY = Math.floor(Math.min(profile[i] ?? baseY, profile[i + 1] ?? baseY))
    const height = horizonY - topY
    if (height > 0) {
      ctx.fillRect(x, topY, segmentWidth, height)
    }
  }

  // 山頂鋸齒細節
  for (let i = 0; i < segments; i++) {
    const x = offsetX + i * segmentWidth
    const topY = Math.floor(profile[i] ?? baseY)
    if (i % 3 === 0) {
      ctx.fillRect(x + segmentWidth / 4, topY - 8, segmentWidth / 2, 8)
    }
  }
}

// === 繪製天空（每幀呼叫）===
export function drawSky(ctx: CanvasRenderingContext2D, cameraAngle: number): void {
  // 天空漸層（靜態）
  if (skyGradientCanvas) {
    ctx.drawImage(skyGradientCanvas, 0, 0)
  }

  const horizonY = SCENE_CONFIG.HORIZON_Y

  // 遠山（慢視差）
  if (mountainFarCanvas) {
    const offset = ((cameraAngle * FAR_MOUNTAIN_PARALLAX) % REFERENCE_WIDTH + REFERENCE_WIDTH) % REFERENCE_WIDTH
    ctx.drawImage(mountainFarCanvas, offset, 0, REFERENCE_WIDTH, horizonY, 0, 0, REFERENCE_WIDTH, horizonY)
  }

  // 近山（快視差）
  if (mountainNearCanvas) {
    const offset = ((cameraAngle * NEAR_MOUNTAIN_PARALLAX) % REFERENCE_WIDTH + REFERENCE_WIDTH) % REFERENCE_WIDTH
    ctx.drawImage(mountainNearCanvas, offset, 0, REFERENCE_WIDTH, horizonY, 0, 0, REFERENCE_WIDTH, horizonY)
  }
}

// === 清理 ===
export function destroySky(): void {
  skyGradientCanvas = null
  mountainFarCanvas = null
  mountainNearCanvas = null
}
