import { describe, it, expect } from 'vitest'
import { getShakeTransform } from '../character'

describe('getShakeTransform', () => {
  it('應回傳搖晃變換物件', () => {
    const transform = getShakeTransform(0, 0)
    expect(transform).toHaveProperty('offsetX')
    expect(transform).toHaveProperty('offsetY')
    expect(transform).toHaveProperty('rotation')
    expect(transform).toHaveProperty('scaleX')
    expect(transform).toHaveProperty('scaleY')
  })

  it('timer=0 時 offsetX 應為 0（sin(0)=0）', () => {
    const transform = getShakeTransform(0, 0)
    expect(transform.offsetX).toBeCloseTo(0)
  })

  it('不同 playerIndex 應產生不同相位', () => {
    const t1 = getShakeTransform(10, 0)
    const t2 = getShakeTransform(10, 1)
    expect(t1.offsetX).not.toBeCloseTo(t2.offsetX)
  })

  it('scaleX 和 scaleY 應互為反向', () => {
    const transform = getShakeTransform(50, 0)
    // scaleX = 1 + sin * amp, scaleY = 1 - sin * amp
    // 所以 scaleX + scaleY 應接近 2
    expect(transform.scaleX + transform.scaleY).toBeCloseTo(2)
  })

  it('offsetY 應始終 >= 0（用 abs）', () => {
    for (let t = 0; t < 100; t++) {
      const transform = getShakeTransform(t, 0)
      expect(transform.offsetY).toBeGreaterThanOrEqual(0)
    }
  })

  it('rotation 應在合理範圍內', () => {
    for (let t = 0; t < 100; t++) {
      const transform = getShakeTransform(t, 0)
      expect(Math.abs(transform.rotation)).toBeLessThanOrEqual(0.2)
    }
  })
})
