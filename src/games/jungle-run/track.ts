import type { TrackPoint } from './constants'

// === 賽道取樣結構 ===
export interface TrackSample {
  x: number
  z: number
  angle: number
  distance: number
}

// === Catmull-Rom spline 插值 ===
export function catmullRomPoint(
  p0: TrackPoint, p1: TrackPoint, p2: TrackPoint, p3: TrackPoint, t: number,
): TrackPoint {
  const t2 = t * t
  const t3 = t2 * t

  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  )

  const z = 0.5 * (
    (2 * p1.z) +
    (-p0.z + p2.z) * t +
    (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
    (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
  )

  return { x, z }
}

// === 從控制點建立等距取樣 LUT ===
export function buildTrackLUT(
  controlPoints: TrackPoint[],
  samplesPerSegment: number,
): TrackSample[] {
  const n = controlPoints.length
  const samples: TrackSample[] = []
  let accDist = 0
  let prevX = 0
  let prevZ = 0
  let isFirst = true

  for (let seg = 0; seg < n; seg++) {
    const p0 = controlPoints[((seg - 1) % n + n) % n]!
    const p1 = controlPoints[seg]!
    const p2 = controlPoints[(seg + 1) % n]!
    const p3 = controlPoints[(seg + 2) % n]!

    for (let i = 0; i < samplesPerSegment; i++) {
      const t = i / samplesPerSegment
      const pt = catmullRomPoint(p0, p1, p2, p3, t)

      if (!isFirst) {
        const dx = pt.x - prevX
        const dz = pt.z - prevZ
        accDist += Math.sqrt(dx * dx + dz * dz)
      }

      // 計算前進方向（用微小偏移取切線）
      const tNext = Math.min(t + 0.01, 0.99)
      const ptNext = catmullRomPoint(p0, p1, p2, p3, tNext)
      const angle = Math.atan2(ptNext.x - pt.x, -(ptNext.z - pt.z))

      samples.push({
        x: pt.x,
        z: pt.z,
        angle,
        distance: accDist,
      })

      prevX = pt.x
      prevZ = pt.z
      isFirst = false
    }
  }

  return samples
}

// === 取得賽道總長度 ===
export function getTrackLength(lut: TrackSample[]): number {
  if (lut.length === 0) return 0
  return lut[lut.length - 1]!.distance
}

// === 查詢：距離 → 世界座標 + 方向 ===
export function sampleTrack(lut: TrackSample[], distance: number): TrackSample {
  if (lut.length === 0) return { x: 0, z: 0, angle: 0, distance: 0 }

  const totalLen = getTrackLength(lut)
  if (totalLen <= 0) return lut[0]!

  // 循環
  const d = ((distance % totalLen) + totalLen) % totalLen

  // 二分搜找到最接近的取樣
  let lo = 0
  let hi = lut.length - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (lut[mid]!.distance < d) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }

  // 線性插值
  const idx = Math.max(0, lo - 1)
  const a = lut[idx]!
  const b = lut[Math.min(idx + 1, lut.length - 1)]!

  if (a.distance === b.distance) return a

  const t = (d - a.distance) / (b.distance - a.distance)

  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    angle: lerpAngle(a.angle, b.angle, t),
    distance: d,
  }
}

// === 角度線性插值（處理 -PI/PI 邊界）===
function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}
