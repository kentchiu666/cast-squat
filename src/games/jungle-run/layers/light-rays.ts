import { SCENE_CONFIG, PARALLAX_SPEEDS } from '../constants'

const REFERENCE_WIDTH = 1920

// === 光束資料 ===
interface LightRay {
  x: number
  width: number
  angle: number
}

let rays: LightRay[] = []

// === 初始化 ===
// Module-level config（init 時設定）
let lightConfig = {
  color: '#ffffc8',
  rayCount: 4,
  walkAlpha: 0.08,
  runAlphaMin: 0.03,
  runAlphaMax: 0.15,
  flickerSpeed: 0.02,
}

export function initLightRays(config: {
  color: string
  rayCount: number
  walkAlpha: number
  runAlphaMin: number
  runAlphaMax: number
  flickerSpeed: number
}): void {
  lightConfig = config
  rays = []
  const spacing = REFERENCE_WIDTH / (config.rayCount + 1)

  for (let i = 0; i < config.rayCount; i++) {
    rays.push({
      x: spacing * (i + 1) + (Math.random() - 0.5) * spacing * 0.5,
      width: 60 + Math.random() * 80,
      angle: (Math.random() - 0.5) * 0.15,
    })
  }
}

// === 繪製漏光效果（每幀呼叫）===
export function drawLightRays(
  ctx: CanvasRenderingContext2D,
  scrollOffset: number,
  runningBlend: number,
  totalTicks: number,
): void {
  const horizonY = SCENE_CONFIG.HORIZON_Y
  const parallaxOffset = scrollOffset * PARALLAX_SPEEDS.LIGHT_RAYS

  ctx.fillStyle = lightConfig.color

  for (const ray of rays) {
    const totalWidth = REFERENCE_WIDTH * 1.5
    const drawX = ((ray.x - parallaxOffset) % totalWidth + totalWidth) % totalWidth - REFERENCE_WIDTH * 0.25

    const walkAlpha = lightConfig.walkAlpha
    const runFlicker = lightConfig.runAlphaMin +
      (lightConfig.runAlphaMax - lightConfig.runAlphaMin) *
      (0.5 + 0.5 * Math.sin(totalTicks * lightConfig.flickerSpeed + ray.x * 0.01))
    const alpha = walkAlpha + (runFlicker - walkAlpha) * runningBlend

    // 繪製光束（用 globalAlpha 取代 rgba 字串，避免每幀字串解析）
    ctx.globalAlpha = alpha

    // 梯形光束：上窄下寬
    const topWidth = ray.width * 0.3
    const bottomWidth = ray.width
    const topX = drawX + ray.angle * horizonY
    const height = horizonY * 0.9

    ctx.beginPath()
    ctx.moveTo(Math.floor(topX - topWidth / 2), 0)
    ctx.lineTo(Math.floor(topX + topWidth / 2), 0)
    ctx.lineTo(Math.floor(drawX + bottomWidth / 2), Math.floor(height))
    ctx.lineTo(Math.floor(drawX - bottomWidth / 2), Math.floor(height))
    ctx.closePath()
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

// === 清理 ===
export function destroyLightRays(): void {
  rays = []
}
