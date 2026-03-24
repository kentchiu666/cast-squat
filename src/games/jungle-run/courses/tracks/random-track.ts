import type { TrackDef, TrackPoint } from '../types'
import { RANDOM_TRACK_CONFIG } from '../../constants'
import { jungleLoopTrack } from './jungle-loop'

// === Seeded PRNG (mulberry32) ===

export function createSeededRandom(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// === 控制點生成（圓形擾動）===

export function generateControlPoints(
  rng: () => number,
  config: typeof RANDOM_TRACK_CONFIG,
): TrackPoint[] {
  const points: TrackPoint[] = []
  const { NUM_POINTS, BASE_RADIUS, RADIUS_JITTER, ANGLE_JITTER, WORLD_BOUND } = config

  for (let i = 0; i < NUM_POINTS; i++) {
    const baseAngle = (i / NUM_POINTS) * Math.PI * 2
    const angle = baseAngle + (rng() - 0.5) * 2 * ANGLE_JITTER
    const radius = BASE_RADIUS + (rng() - 0.5) * 2 * RADIUS_JITTER

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    points.push({
      x: Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, x)),
      z: Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, z)),
    })
  }

  return points
}

// === 自交檢測（叉積法）===

function cross(ox: number, oz: number, ax: number, az: number, bx: number, bz: number): number {
  return (ax - ox) * (bz - oz) - (az - oz) * (bx - ox)
}

function segmentsIntersect(
  a1: TrackPoint, a2: TrackPoint,
  b1: TrackPoint, b2: TrackPoint,
): boolean {
  const d1 = cross(b1.x, b1.z, b2.x, b2.z, a1.x, a1.z)
  const d2 = cross(b1.x, b1.z, b2.x, b2.z, a2.x, a2.z)
  const d3 = cross(a1.x, a1.z, a2.x, a2.z, b1.x, b1.z)
  const d4 = cross(a1.x, a1.z, a2.x, a2.z, b2.x, b2.z)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  return false
}

export function validateNoSelfIntersection(points: TrackPoint[]): boolean {
  const n = points.length
  for (let i = 0; i < n; i++) {
    const a1 = points[i]!
    const a2 = points[(i + 1) % n]!
    for (let j = i + 2; j < n; j++) {
      // Skip adjacent edges (they share a vertex)
      if (i === 0 && j === n - 1) continue
      const b1 = points[j]!
      const b2 = points[(j + 1) % n]!
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return false
      }
    }
  }
  return true
}

// === Sharp curve 偵測 ===

export function findSharpCurves(points: TrackPoint[], threshold: number): number[] {
  const n = points.length
  const sharp: number[] = []

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]!
    const curr = points[i]!
    const next = points[(i + 1) % n]!

    // Vectors from curr to prev and curr to next
    const ax = prev.x - curr.x
    const az = prev.z - curr.z
    const bx = next.x - curr.x
    const bz = next.z - curr.z

    const lenA = Math.sqrt(ax * ax + az * az)
    const lenB = Math.sqrt(bx * bx + bz * bz)
    if (lenA === 0 || lenB === 0) continue

    // cos(angle) between vectors from curr→prev and curr→next
    // Straight path: vectors nearly opposite → cosAngle ≈ -1
    // Sharp turn: vectors nearly same direction → cosAngle ≈ +1
    const dot = ax * bx + az * bz
    const cosAngle = dot / (lenA * lenB)

    // normalized: 0 = straight (cosAngle=-1), 1 = U-turn (cosAngle=+1)
    const normalized = (1 + cosAngle) / 2

    if (normalized >= threshold) {
      sharp.push(i)
    }
  }

  return sharp
}

// === 主函數 ===

export function generateRandomTrack(seed?: number): TrackDef {
  const actualSeed = seed ?? Date.now()
  const config = RANDOM_TRACK_CONFIG

  for (let attempt = 0; attempt < config.MAX_RETRIES; attempt++) {
    const rng = createSeededRandom(actualSeed + attempt)
    const points = generateControlPoints(rng, config)

    if (!validateNoSelfIntersection(points)) continue

    // Check minimum distance between adjacent points
    let tooClose = false
    for (let i = 0; i < points.length; i++) {
      const curr = points[i]!
      const next = points[(i + 1) % points.length]!
      const dx = curr.x - next.x
      const dz = curr.z - next.z
      if (Math.sqrt(dx * dx + dz * dz) < config.MIN_POINT_DISTANCE) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    // Find sharp curves for building placement
    const sharpIndices = findSharpCurves(points, config.CURVATURE_THRESHOLD)
    const buildingPositions: number[] = []
    // Pick up to MAX_BUILDINGS sharp curves as building positions (as percentages)
    const sortedSharp = [...sharpIndices].slice(0, config.MAX_BUILDINGS)
    for (const idx of sortedSharp) {
      buildingPositions.push(idx / points.length)
    }
    // Fallback: if no sharp curves, place one building at 30%
    if (buildingPositions.length === 0) {
      buildingPositions.push(0.3)
    }

    return {
      id: `random_${actualSeed + attempt}`,
      name: 'Random Track',
      controlPoints: points,
      roadHalfWidthTiles: config.ROAD_HALF_WIDTH_TILES,
      objectPlacement: {
        treeSpacing: config.TREE_SPACING,
        laneOffsetMin: config.LANE_OFFSET_MIN,
        laneOffsetMax: config.LANE_OFFSET_MAX,
        buildingPositions,
      },
    }
  }

  // Fallback: return the fixed track
  return jungleLoopTrack
}
