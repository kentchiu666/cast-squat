import { SCENE_CONFIG } from '../constants'

const REFERENCE_WIDTH = 1920
const REFERENCE_HEIGHT = 1080

// === 粒子資料 ===
interface Particle {
  baseX: number
  baseY: number
  phase: number       // sin/cos 相位偏移
  floatRadius: number  // 漂浮半徑
  floatSpeedX: number
  floatSpeedY: number
  size: number
}

let particles: Particle[] = []
let particleColor = '#ccff88'
let minAlpha = 0.15
let maxAlpha = 0.6
let pulseSpeed = 0.03

// === 初始化 ===
export function initParticles(config: {
  count: number
  color: string
  minAlpha: number
  maxAlpha: number
  pulseSpeed: number
}): void {
  particleColor = config.color
  minAlpha = config.minAlpha
  maxAlpha = config.maxAlpha
  pulseSpeed = config.pulseSpeed

  particles = []
  const horizonY = SCENE_CONFIG.HORIZON_Y

  for (let i = 0; i < config.count; i++) {
    // 用 golden ratio 散佈，避免規律感
    const seed = (i * 137.508) % 360
    const seedRad = seed * Math.PI / 180

    particles.push({
      baseX: (Math.abs(Math.sin(seedRad * 2.3)) * REFERENCE_WIDTH * 0.9) + REFERENCE_WIDTH * 0.05,
      baseY: horizonY * 0.3 + Math.abs(Math.cos(seedRad * 1.7)) * (REFERENCE_HEIGHT - horizonY * 0.3) * 0.7,
      phase: seed,
      floatRadius: 15 + Math.abs(Math.sin(seedRad * 3.1)) * 25,
      floatSpeedX: 0.008 + Math.abs(Math.cos(seedRad * 2.7)) * 0.015,
      floatSpeedY: 0.012 + Math.abs(Math.sin(seedRad * 1.3)) * 0.02,
      size: 2 + Math.floor(Math.abs(Math.cos(seedRad * 4.1)) * 3),
    })
  }
}

// === 繪製粒子（每幀呼叫）===
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  totalTicks: number,
  speed: number,
): void {
  if (particles.length === 0) return

  ctx.fillStyle = particleColor

  for (const p of particles) {
    // sin/cos 漂浮路徑
    const floatX = Math.sin(totalTicks * p.floatSpeedX + p.phase) * p.floatRadius
    const floatY = Math.cos(totalTicks * p.floatSpeedY + p.phase * 0.7) * p.floatRadius * 0.6

    // 跑步時粒子向後偏移
    const driftX = -speed * totalTicks * 0.3

    const x = ((p.baseX + floatX + driftX) % REFERENCE_WIDTH + REFERENCE_WIDTH) % REFERENCE_WIDTH
    const y = p.baseY + floatY

    // 呼吸燈 alpha（每個粒子相位不同）
    const pulse = 0.5 + 0.5 * Math.sin(totalTicks * pulseSpeed + p.phase * 0.5)
    const alpha = minAlpha + (maxAlpha - minAlpha) * pulse

    ctx.globalAlpha = alpha
    ctx.fillRect(Math.floor(x), Math.floor(y), p.size, p.size)
  }

  ctx.globalAlpha = 1
}

// === 清理 ===
export function destroyParticles(): void {
  particles = []
}
