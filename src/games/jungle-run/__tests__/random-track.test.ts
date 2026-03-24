import { describe, it, expect } from 'vitest'
import {
  createSeededRandom,
  generateControlPoints,
  validateNoSelfIntersection,
  findSharpCurves,
  generateRandomTrack,
} from '../courses/tracks/random-track'
import { buildTrackLUT } from '../track'
import { RANDOM_TRACK_CONFIG } from '../constants'
import type { TrackPoint } from '../courses/types'

// === PRNG ===
describe('createSeededRandom', () => {
  it('same seed produces same sequence', () => {
    const rng1 = createSeededRandom(42)
    const rng2 = createSeededRandom(42)
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it('different seeds produce different sequences', () => {
    const rng1 = createSeededRandom(42)
    const rng2 = createSeededRandom(99)
    const seq1 = Array.from({ length: 5 }, () => rng1())
    const seq2 = Array.from({ length: 5 }, () => rng2())
    expect(seq1).not.toEqual(seq2)
  })

  it('output is in [0, 1)', () => {
    const rng = createSeededRandom(123)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

// === 控制點生成 ===
describe('generateControlPoints', () => {
  const rng = createSeededRandom(42)
  const points = generateControlPoints(rng, RANDOM_TRACK_CONFIG)

  it('generates correct number of points', () => {
    expect(points).toHaveLength(RANDOM_TRACK_CONFIG.NUM_POINTS)
  })

  it('all points within world bounds', () => {
    const bound = RANDOM_TRACK_CONFIG.WORLD_BOUND
    for (const p of points) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(bound)
      expect(Math.abs(p.z)).toBeLessThanOrEqual(bound)
    }
  })

  it('adjacent points have sufficient distance', () => {
    const minDist = RANDOM_TRACK_CONFIG.MIN_POINT_DISTANCE
    for (let i = 0; i < points.length; i++) {
      const curr = points[i]!
      const next = points[(i + 1) % points.length]!
      const dx = curr.x - next.x
      const dz = curr.z - next.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      expect(dist).toBeGreaterThanOrEqual(minDist)
    }
  })
})

// === 自交檢測 ===
describe('validateNoSelfIntersection', () => {
  it('convex polygon does not self-intersect', () => {
    const square: TrackPoint[] = [
      { x: 0, z: 0 }, { x: 100, z: 0 },
      { x: 100, z: 100 }, { x: 0, z: 100 },
    ]
    expect(validateNoSelfIntersection(square)).toBe(true)
  })

  it('figure-eight self-intersects', () => {
    const figure8: TrackPoint[] = [
      { x: 0, z: 0 }, { x: 100, z: 100 },
      { x: 100, z: 0 }, { x: 0, z: 100 },
    ]
    expect(validateNoSelfIntersection(figure8)).toBe(false)
  })

  it('regular polygon does not self-intersect', () => {
    const hexagon: TrackPoint[] = []
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      hexagon.push({ x: Math.cos(angle) * 200, z: Math.sin(angle) * 200 })
    }
    expect(validateNoSelfIntersection(hexagon)).toBe(true)
  })
})

// === Sharp curve 偵測 ===
describe('findSharpCurves', () => {
  it('detects sharp right-angle turn', () => {
    // L 形：直走後急轉 90 度
    const points: TrackPoint[] = [
      { x: 0, z: 0 }, { x: 200, z: 0 },
      { x: 200, z: 200 }, { x: 0, z: 200 },
      { x: -200, z: 200 }, { x: -200, z: 0 },
    ]
    const sharp = findSharpCurves(points, 0.3)
    expect(sharp.length).toBeGreaterThan(0)
  })

  it('smooth circle has no sharp curves', () => {
    const circle: TrackPoint[] = []
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      circle.push({ x: Math.cos(angle) * 400, z: Math.sin(angle) * 400 })
    }
    const sharp = findSharpCurves(circle, 0.3)
    expect(sharp).toHaveLength(0)
  })
})

// === 整合測試 ===
describe('generateRandomTrack', () => {
  it('returns a valid TrackDef', () => {
    const track = generateRandomTrack(42)
    expect(track.id).toContain('random')
    expect(track.name).toBeDefined()
    expect(track.controlPoints.length).toBeGreaterThanOrEqual(8)
    expect(track.roadHalfWidthTiles).toBeGreaterThan(0)
    expect(track.objectPlacement).toBeDefined()
    expect(track.objectPlacement.treeSpacing).toBeGreaterThan(0)
    expect(track.objectPlacement.buildingPositions).toBeDefined()
  })

  it('same seed produces same track', () => {
    const t1 = generateRandomTrack(42)
    const t2 = generateRandomTrack(42)
    expect(t1.controlPoints).toEqual(t2.controlPoints)
  })

  it('different seeds produce different tracks', () => {
    const t1 = generateRandomTrack(42)
    const t2 = generateRandomTrack(99)
    expect(t1.controlPoints).not.toEqual(t2.controlPoints)
  })

  it('generated track works with buildTrackLUT', () => {
    const track = generateRandomTrack(42)
    const lut = buildTrackLUT(track.controlPoints, 50)
    expect(lut.length).toBeGreaterThan(0)
    for (const sample of lut) {
      expect(Number.isFinite(sample.x)).toBe(true)
      expect(Number.isFinite(sample.z)).toBe(true)
      expect(Number.isFinite(sample.angle)).toBe(true)
    }
  })

  it('10 different seeds all produce valid tracks', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const track = generateRandomTrack(seed * 1000)
      expect(track.controlPoints.length).toBeGreaterThanOrEqual(8)
      const lut = buildTrackLUT(track.controlPoints, 50)
      expect(lut.length).toBeGreaterThan(0)
    }
  })

  it('no-seed call uses Date.now (produces a track)', () => {
    const track = generateRandomTrack()
    expect(track.controlPoints.length).toBeGreaterThanOrEqual(8)
  })

  it('all control points within tilemap bounds', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const track = generateRandomTrack(seed * 777)
      for (const p of track.controlPoints) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(RANDOM_TRACK_CONFIG.WORLD_BOUND)
        expect(Math.abs(p.z)).toBeLessThanOrEqual(RANDOM_TRACK_CONFIG.WORLD_BOUND)
      }
    }
  })
})
