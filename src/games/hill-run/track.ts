import type { TrackPoint3D } from './scene'
import { TRACK_CONFIG } from './constants'

// === Seeded PRNG (mulberry32) ===
function createSeededRandom(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// === 生成帶高度的 3D 賽道控制點 ===
export function generateTrack3D(seed?: number): TrackPoint3D[] {
  const rng = createSeededRandom(seed ?? Date.now())
  const { NUM_POINTS, BASE_RADIUS, HILL_AMPLITUDE, HILL_FREQUENCY_1, HILL_FREQUENCY_2, HILL_RANDOM_JITTER } = TRACK_CONFIG
  const points: TrackPoint3D[] = []

  for (let i = 0; i < NUM_POINTS; i++) {
    const baseAngle = (i / NUM_POINTS) * Math.PI * 2
    const angle = baseAngle + (rng() - 0.5) * 0.3
    const radius = BASE_RADIUS + (rng() - 0.5) * 60

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    // 高度起伏：兩個 sin 波疊加 + 隨機擾動
    const y = Math.sin(baseAngle * HILL_FREQUENCY_1) * HILL_AMPLITUDE
      + Math.sin(baseAngle * HILL_FREQUENCY_2) * (HILL_AMPLITUDE * 0.5)
      + (rng() - 0.5) * HILL_RANDOM_JITTER

    points.push({ x, y, z })
  }

  return points
}
