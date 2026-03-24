import { describe, it, expect } from 'vitest'
import { circularGap, rubberBandSpeed } from '../npc'
import { NPC_CONFIG } from '../constants'

describe('circularGap', () => {
  const trackLength = 1000

  it('正常 gap — 玩家在前', () => {
    expect(circularGap(300, 200, trackLength)).toBe(100)
  })

  it('正常 gap — NPC 在前', () => {
    expect(circularGap(200, 300, trackLength)).toBe(-100)
  })

  it('gap 為零', () => {
    expect(circularGap(500, 500, trackLength)).toBe(0)
  })

  it('環形邊界 — 玩家剛過起點，NPC 在終點附近', () => {
    // player=50, npc=950 → 玩家其實領先 100（50 + (1000-950)）
    expect(circularGap(50, 950, trackLength)).toBe(100)
  })

  it('環形邊界 — NPC 剛過起點，玩家在終點附近', () => {
    // player=950, npc=50 → NPC 其實領先 100
    expect(circularGap(950, 50, trackLength)).toBe(-100)
  })

  it('剛好半圈 — 回傳正值（定義為玩家在前）', () => {
    expect(circularGap(500, 0, trackLength)).toBe(500)
  })

  it('trackLength 為 0 — 回傳 0', () => {
    expect(circularGap(100, 50, 0)).toBe(0)
  })
})

describe('rubberBandSpeed', () => {
  it('gap 在 comfort zone 內 — 速度接近 BASE_SPEED', () => {
    const speed = rubberBandSpeed(0, NPC_CONFIG)
    expect(speed).toBeCloseTo(NPC_CONFIG.BASE_SPEED, 1)
  })

  it('玩家在前（正 gap）— 速度高於 BASE_SPEED', () => {
    const speed = rubberBandSpeed(200, NPC_CONFIG)
    expect(speed).toBeGreaterThan(NPC_CONFIG.BASE_SPEED)
  })

  it('NPC 在前（負 gap）— 速度低於 BASE_SPEED', () => {
    const speed = rubberBandSpeed(-200, NPC_CONFIG)
    expect(speed).toBeLessThan(NPC_CONFIG.BASE_SPEED)
  })

  it('極大正 gap — 速度不超過 MAX_SPEED_MULT * BASE_SPEED', () => {
    const speed = rubberBandSpeed(10000, NPC_CONFIG)
    expect(speed).toBeLessThanOrEqual(NPC_CONFIG.BASE_SPEED * NPC_CONFIG.MAX_SPEED_MULT)
  })

  it('極大負 gap — 速度不低於 MIN_SPEED_MULT * BASE_SPEED', () => {
    const speed = rubberBandSpeed(-10000, NPC_CONFIG)
    expect(speed).toBeGreaterThanOrEqual(NPC_CONFIG.BASE_SPEED * NPC_CONFIG.MIN_SPEED_MULT)
  })

  it('comfort distance 內的小 gap — 仍有微小調整', () => {
    const speed = rubberBandSpeed(30, NPC_CONFIG)
    // 在 comfort zone 內仍應略快於 base（gap 為正）
    expect(speed).toBeGreaterThanOrEqual(NPC_CONFIG.BASE_SPEED)
  })

  it('gap 越大，加速越多', () => {
    const speed1 = rubberBandSpeed(100, NPC_CONFIG)
    const speed2 = rubberBandSpeed(300, NPC_CONFIG)
    expect(speed2).toBeGreaterThan(speed1)
  })
})
