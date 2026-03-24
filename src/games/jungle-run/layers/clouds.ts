import { SCENE_CONFIG } from '../constants'

const REFERENCE_WIDTH = 1920

// === 雲朵資料 ===
interface Cloud {
  canvas: OffscreenCanvas
  x: number
  y: number
  speed: number
  width: number
  height: number
}

let clouds: Cloud[] = []

// === 像素風雲朵預渲染 ===
// 每朵雲用方塊堆疊出不同的形狀
const CLOUD_SHAPES = [
  // 寬扁型
  { w: 80, h: 28, blocks: [[10,12,60,16],[0,16,80,12],[20,4,40,8]] },
  // 小圓型
  { w: 48, h: 24, blocks: [[8,8,32,16],[0,12,48,12],[16,0,16,8]] },
  // 長條型
  { w: 100, h: 20, blocks: [[0,8,100,12],[20,0,60,8],[10,4,80,8]] },
  // 蓬鬆型
  { w: 64, h: 32, blocks: [[8,16,48,16],[0,20,64,12],[16,8,32,8],[24,0,16,8]] },
]

function prerenderCloud(
  shape: typeof CLOUD_SHAPES[0],
  color: string,
  shadowColor: string,
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(shape.w, shape.h)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // 陰影層（向下偏移 2px）
  ctx.fillStyle = shadowColor
  for (const block of shape.blocks) {
    ctx.fillRect(block[0]!, block[1]! + 2, block[2]!, block[3]!)
  }

  // 主色層
  ctx.fillStyle = color
  for (const block of shape.blocks) {
    ctx.fillRect(block[0]!, block[1]!, block[2]!, block[3]!)
  }

  return canvas
}

// === 初始化 ===
export function initClouds(config: {
  count: number
  minSpeed: number
  maxSpeed: number
  color: string
  shadowColor: string
}): void {
  clouds = []
  const horizonY = SCENE_CONFIG.HORIZON_Y
  const speedRange = config.maxSpeed - config.minSpeed

  for (let i = 0; i < config.count; i++) {
    const shapeIdx = i % CLOUD_SHAPES.length
    const shape = CLOUD_SHAPES[shapeIdx]!
    const canvas = prerenderCloud(shape, config.color, config.shadowColor)

    // 均勻分布 + 一點隨機偏移
    const baseX = (REFERENCE_WIDTH / config.count) * i
    const seed = (i * 137.5) % 1

    clouds.push({
      canvas,
      x: baseX + seed * 200 - 100,
      y: 40 + (i % 3) * (horizonY * 0.2) + seed * 30,
      speed: config.minSpeed + seed * speedRange,
      width: shape.w,
      height: shape.h,
    })
  }
}

// === 繪製雲層（每幀呼叫）===
export function drawClouds(ctx: CanvasRenderingContext2D, totalTicks: number): void {
  for (const cloud of clouds) {
    // 計算當前 x 位置（循環滾動）
    const rawX = cloud.x + totalTicks * cloud.speed
    const drawX = ((rawX % (REFERENCE_WIDTH + cloud.width)) + REFERENCE_WIDTH + cloud.width) % (REFERENCE_WIDTH + cloud.width) - cloud.width

    ctx.drawImage(cloud.canvas, Math.floor(drawX), Math.floor(cloud.y))
  }
}

// === 清理 ===
export function destroyClouds(): void {
  clouds = []
}
