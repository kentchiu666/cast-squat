import { describe, it, expect } from 'vitest'
import {
  easeOutQuad,
  easeInQuad,
  easeOutBack,
  clamp,
  lerp,
  randomRange,
  circleCollision,
} from '../utils'

describe('easeOutQuad', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutQuad(0)).toBe(0)
  })

  it('returns 1 at t=1', () => {
    expect(easeOutQuad(1)).toBe(1)
  })

  it('returns value > t for 0 < t < 1 (easing out)', () => {
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5)
  })
})

describe('easeInQuad', () => {
  it('returns 0 at t=0', () => {
    expect(easeInQuad(0)).toBe(0)
  })

  it('returns 1 at t=1', () => {
    expect(easeInQuad(1)).toBe(1)
  })

  it('returns value < t for 0 < t < 1 (easing in)', () => {
    expect(easeInQuad(0.5)).toBeLessThan(0.5)
  })
})

describe('easeOutBack', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 5)
  })

  it('returns 1 at t=1', () => {
    expect(easeOutBack(1)).toBeCloseTo(1, 5)
  })

  it('overshoots past 1 before settling (back easing characteristic)', () => {
    // easeOutBack should exceed 1 at some point in 0 < t < 1
    let hasOvershoot = false
    for (let t = 0.5; t < 1; t += 0.01) {
      if (easeOutBack(t) > 1) {
        hasOvershoot = true
        break
      }
    }
    expect(hasOvershoot).toBe(true)
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps to max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('lerp', () => {
  it('returns start at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })

  it('returns end at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
  })

  it('handles negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0)
  })
})

describe('randomRange', () => {
  it('returns values within range', () => {
    for (let i = 0; i < 100; i++) {
      const value = randomRange(5, 10)
      expect(value).toBeGreaterThanOrEqual(5)
      expect(value).toBeLessThan(10)
    }
  })

  it('returns min when range is zero', () => {
    expect(randomRange(5, 5)).toBe(5)
  })
})

describe('circleCollision', () => {
  it('detects overlapping circles', () => {
    // Two circles at same position
    expect(circleCollision(0, 0, 10, 0, 0, 10)).toBe(true)
  })

  it('detects touching circles as NOT colliding (strict less-than)', () => {
    // Distance = 20, r1 + r2 = 20 → not colliding (< not <=)
    expect(circleCollision(0, 0, 10, 20, 0, 10)).toBe(false)
  })

  it('detects separated circles as not colliding', () => {
    expect(circleCollision(0, 0, 5, 100, 100, 5)).toBe(false)
  })

  it('detects partially overlapping circles', () => {
    // Distance = 10, r1 + r2 = 15
    expect(circleCollision(0, 0, 10, 10, 0, 5)).toBe(true)
  })

  it('works with negative coordinates', () => {
    expect(circleCollision(-5, -5, 10, 0, 0, 10)).toBe(true)
  })

  it('handles zero-radius circles', () => {
    // Two points at same location
    expect(circleCollision(5, 5, 0, 5, 5, 0)).toBe(false)
  })
})
