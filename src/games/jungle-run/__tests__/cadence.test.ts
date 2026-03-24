import { describe, it, expect } from 'vitest'
import { cadenceToSpeed, lerp, isRunningCadence } from '../cadence'

describe('cadenceToSpeed', () => {
  it('returns 0 for cadence 0', () => {
    expect(cadenceToSpeed(0)).toBe(0)
  })

  it('returns 0 for negative cadence', () => {
    expect(cadenceToSpeed(-10)).toBe(0)
  })

  it('returns 0.2 at walk threshold (60 BPM)', () => {
    expect(cadenceToSpeed(60)).toBeCloseTo(0.2, 5)
  })

  it('returns 0.5 at run threshold (120 BPM)', () => {
    expect(cadenceToSpeed(120)).toBeCloseTo(0.5, 5)
  })

  it('returns 1.0 at max cadence (180 BPM)', () => {
    expect(cadenceToSpeed(180)).toBeCloseTo(1.0, 5)
  })

  it('clamps above max cadence', () => {
    expect(cadenceToSpeed(200)).toBeCloseTo(1.0, 5)
    expect(cadenceToSpeed(999)).toBeCloseTo(1.0, 5)
  })

  it('interpolates linearly in slow walk range (0-60)', () => {
    const mid = cadenceToSpeed(30)
    expect(mid).toBeCloseTo(0.1, 5)
  })

  it('interpolates linearly in walk range (60-120)', () => {
    const mid = cadenceToSpeed(90)
    expect(mid).toBeCloseTo(0.35, 5)
  })

  it('interpolates linearly in run range (120-180)', () => {
    const mid = cadenceToSpeed(150)
    expect(mid).toBeCloseTo(0.75, 5)
  })

  it('speed increases monotonically', () => {
    let prev = 0
    for (let bpm = 1; bpm <= 180; bpm++) {
      const speed = cadenceToSpeed(bpm)
      expect(speed).toBeGreaterThanOrEqual(prev)
      prev = speed
    }
  })
})

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
  })

  it('handles negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0)
  })
})

describe('isRunningCadence', () => {
  it('returns false below threshold', () => {
    expect(isRunningCadence(0)).toBe(false)
    expect(isRunningCadence(60)).toBe(false)
    expect(isRunningCadence(119)).toBe(false)
  })

  it('returns true at and above threshold', () => {
    expect(isRunningCadence(120)).toBe(true)
    expect(isRunningCadence(150)).toBe(true)
    expect(isRunningCadence(180)).toBe(true)
  })
})
