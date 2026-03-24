import { describe, it, expect } from 'vitest'
import { buildTrackLUT, sampleTrack, getTrackLength, catmullRomPoint } from '../track'
import { jungleLoopTrack } from '../courses/tracks/jungle-loop'
const TRACK_CONTROL_POINTS = jungleLoopTrack.controlPoints

describe('catmullRomPoint', () => {
  it('returns p1 when t=0', () => {
    const p = catmullRomPoint(
      { x: 0, z: 0 }, { x: 10, z: 20 }, { x: 30, z: 40 }, { x: 50, z: 60 }, 0,
    )
    expect(p.x).toBeCloseTo(10, 5)
    expect(p.z).toBeCloseTo(20, 5)
  })

  it('returns p2 when t=1', () => {
    const p = catmullRomPoint(
      { x: 0, z: 0 }, { x: 10, z: 20 }, { x: 30, z: 40 }, { x: 50, z: 60 }, 1,
    )
    expect(p.x).toBeCloseTo(30, 5)
    expect(p.z).toBeCloseTo(40, 5)
  })

  it('returns midpoint-ish when t=0.5', () => {
    const p = catmullRomPoint(
      { x: 0, z: 0 }, { x: 0, z: 0 }, { x: 100, z: 100 }, { x: 100, z: 100 }, 0.5,
    )
    expect(p.x).toBeGreaterThan(20)
    expect(p.x).toBeLessThan(80)
  })
})

describe('buildTrackLUT', () => {
  const lut = buildTrackLUT(TRACK_CONTROL_POINTS, 20)

  it('generates non-empty LUT', () => {
    expect(lut.length).toBeGreaterThan(0)
  })

  it('each sample has position and angle', () => {
    for (const sample of lut) {
      expect(typeof sample.x).toBe('number')
      expect(typeof sample.z).toBe('number')
      expect(typeof sample.angle).toBe('number')
      expect(typeof sample.distance).toBe('number')
    }
  })

  it('distances are monotonically increasing', () => {
    for (let i = 1; i < lut.length; i++) {
      expect(lut[i]!.distance).toBeGreaterThan(lut[i - 1]!.distance)
    }
  })

  it('first sample starts near first control point', () => {
    const first = lut[0]!
    const cp = TRACK_CONTROL_POINTS[0]!
    expect(Math.abs(first.x - cp.x)).toBeLessThan(50)
    expect(Math.abs(first.z - cp.z)).toBeLessThan(50)
  })
})

describe('getTrackLength', () => {
  const lut = buildTrackLUT(TRACK_CONTROL_POINTS, 20)

  it('returns positive length', () => {
    expect(getTrackLength(lut)).toBeGreaterThan(0)
  })
})

describe('sampleTrack', () => {
  const lut = buildTrackLUT(TRACK_CONTROL_POINTS, 20)
  const totalLen = getTrackLength(lut)

  it('returns valid sample at distance 0', () => {
    const s = sampleTrack(lut, 0)
    expect(typeof s.x).toBe('number')
    expect(typeof s.z).toBe('number')
    expect(typeof s.angle).toBe('number')
  })

  it('wraps around when distance exceeds track length', () => {
    const s0 = sampleTrack(lut, 0)
    const sWrap = sampleTrack(lut, totalLen)
    expect(s0.x).toBeCloseTo(sWrap.x, 0)
    expect(s0.z).toBeCloseTo(sWrap.z, 0)
  })

  it('returns different positions for different distances', () => {
    const a = sampleTrack(lut, 0)
    const b = sampleTrack(lut, totalLen / 4)
    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2)
    expect(dist).toBeGreaterThan(10)
  })

  it('handles negative distances by wrapping', () => {
    const s = sampleTrack(lut, -10)
    expect(typeof s.x).toBe('number')
    expect(isNaN(s.x)).toBe(false)
  })
})
