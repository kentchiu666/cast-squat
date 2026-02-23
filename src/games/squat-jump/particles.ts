import { SCENE_CONFIG, PARTICLE_CONFIG } from './constants'
import { randomRange } from './utils'

// === 粒子型別 ===
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  decay: number
  size: number
  color: string
}

// === 粒子系統狀態 ===
let particles: Particle[] = []

export function clearParticles(): void {
  particles = []
}

// === 建立落地粒子 ===
export function createLandingParticles(
  canvasWidth: number,
  canvasHeight: number,
  playerX?: number | null,
): void {
  const centerX = playerX ?? canvasWidth / 2
  const groundY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET

  for (let i = 0; i < PARTICLE_CONFIG.LANDING_COUNT; i++) {
    const angle = Math.PI / 6 + Math.random() * ((Math.PI * 2) / 3)
    const speed = randomRange(PARTICLE_CONFIG.LANDING_SPEED_MIN, PARTICLE_CONFIG.LANDING_SPEED_MAX)
    particles.push({
      x: centerX + randomRange(-20, 20),
      y: groundY,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: -Math.abs(Math.sin(angle) * speed),
      life: 1,
      decay: randomRange(0.03, 0.05),
      size: randomRange(3, 7),
      color: Math.random() > 0.5 ? '#888' : '#aaa',
    })
  }
}

// === 建立金幣收集粒子 ===
export function createCoinCollectParticles(x: number, y: number, coinSize: number): void {
  for (let i = 0; i < PARTICLE_CONFIG.COIN_COLLECT_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = randomRange(PARTICLE_CONFIG.COIN_COLLECT_SPEED_MIN, PARTICLE_CONFIG.COIN_COLLECT_SPEED_MAX)
    particles.push({
      x: x + coinSize / 2,
      y: y + coinSize / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + PARTICLE_CONFIG.COIN_COLLECT_UPWARD_BIAS,
      life: 1,
      decay: PARTICLE_CONFIG.COIN_COLLECT_DECAY,
      size: randomRange(3, 7),
      color: Math.random() > 0.5 ? '#FFD700' : '#FFA500',
    })
  }
}

// === 更新粒子 ===
export function updateParticles(): void {
  particles = particles.filter((p) => {
    p.x += p.vx
    p.y += p.vy
    p.vy += PARTICLE_CONFIG.GRAVITY
    p.life -= p.decay
    return p.life > 0
  })
}

// === 繪製粒子 ===
export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size)
  }
  ctx.globalAlpha = 1
}
