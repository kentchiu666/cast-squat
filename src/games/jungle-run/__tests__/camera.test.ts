import { describe, it, expect } from 'vitest'
import { lerpAngle, updateCamera } from '../camera'
import { buildTrackLUT } from '../track'
import { jungleLoopTrack } from '../courses/tracks/jungle-loop'
const TRACK_CONTROL_POINTS = jungleLoopTrack.controlPoints

describe('lerpAngle', () => {
  it('returns a when t=0', () => {
    expect(lerpAngle(1, 2, 0)).toBeCloseTo(1, 5)
  })

  it('returns b when t=1', () => {
    expect(lerpAngle(1, 2, 1)).toBeCloseTo(2, 5)
  })

  it('handles PI/-PI boundary (short way)', () => {
    const result = lerpAngle(Math.PI * 0.9, -Math.PI * 0.9, 0.5)
    // Should go through PI, not through 0
    expect(Math.abs(result)).toBeGreaterThan(Math.PI * 0.8)
  })

  it('returns midpoint at t=0.5', () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5, 5)
  })
})

describe('updateCamera', () => {
  const lut = buildTrackLUT(TRACK_CONTROL_POINTS, 20)

  it('returns valid camera state', () => {
    const prev = { x: 0, z: 0, angle: 0 }
    const cam = updateCamera(0, lut, prev, 1)
    expect(typeof cam.x).toBe('number')
    expect(typeof cam.z).toBe('number')
    expect(typeof cam.angle).toBe('number')
    expect(isNaN(cam.x)).toBe(false)
  })

  it('camera moves when scrollOffset changes', () => {
    const prev = { x: 0, z: 0, angle: 0 }
    const cam1 = updateCamera(0, lut, prev, 1)
    const cam2 = updateCamera(200, lut, prev, 1)
    const dist = Math.sqrt((cam1.x - cam2.x) ** 2 + (cam1.z - cam2.z) ** 2)
    expect(dist).toBeGreaterThan(1)
  })

  it('angle lerps when lerpFactor < 1', () => {
    const prev = { x: 0, z: 0, angle: 0 }
    const target = updateCamera(100, lut, prev, 1)
    const smooth = updateCamera(100, lut, prev, 0.5)
    // smooth angle should be between prev and target
    if (Math.abs(target.angle) > 0.01) {
      expect(Math.abs(smooth.angle)).toBeLessThanOrEqual(Math.abs(target.angle) + 0.01)
    }
  })
})
