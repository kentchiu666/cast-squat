import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JUMP_PHASE, JUMP_CONFIG } from '../constants'

// Mock side-effect modules
vi.mock('../particles', () => ({
  createLandingParticles: vi.fn(),
}))
vi.mock('../effects', () => ({
  createSpeedLines: vi.fn(),
  createAfterImage: vi.fn(),
  triggerScreenShake: vi.fn(),
}))

import {
  resetCharacter,
  getCharacterState,
  canJump,
  startJump,
  updateJump,
} from '../character'

const CANVAS_W = 800
const CANVAS_H = 600

beforeEach(() => {
  resetCharacter()
  vi.clearAllMocks()
})

describe('initial state', () => {
  it('starts in IDLE phase', () => {
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.IDLE)
  })

  it('starts at ground level', () => {
    expect(getCharacterState().characterY).toBe(0)
  })

  it('starts with no velocity', () => {
    expect(getCharacterState().characterVelocityY).toBe(0)
  })

  it('starts with default squash/stretch', () => {
    const ss = getCharacterState().squashStretch
    expect(ss.scaleX).toBe(1)
    expect(ss.scaleY).toBe(1)
  })
})

describe('canJump / startJump', () => {
  it('can jump when IDLE', () => {
    expect(canJump()).toBe(true)
  })

  it('cannot jump when not IDLE', () => {
    startJump()
    expect(canJump()).toBe(false)
  })

  it('startJump returns true when IDLE', () => {
    expect(startJump()).toBe(true)
  })

  it('startJump returns false when not IDLE', () => {
    startJump()
    expect(startJump()).toBe(false)
  })

  it('startJump transitions to ANTICIPATION', () => {
    startJump()
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.ANTICIPATION)
  })
})

describe('jump phase transitions', () => {
  function tickN(n: number) {
    for (let i = 0; i < n; i++) {
      updateJump(CANVAS_W, CANVAS_H)
    }
  }

  it('ANTICIPATION → RISE after ANTICIPATION_DURATION ticks', () => {
    startJump()
    tickN(JUMP_CONFIG.ANTICIPATION_DURATION)
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.RISE)
  })

  it('RISE sets characterVelocityY to RISE_POWER', () => {
    startJump()
    tickN(JUMP_CONFIG.ANTICIPATION_DURATION)
    expect(getCharacterState().characterVelocityY).toBe(JUMP_CONFIG.RISE_POWER)
  })

  it('RISE → HANG when velocity reaches 0', () => {
    startJump()
    tickN(JUMP_CONFIG.ANTICIPATION_DURATION)

    // Tick through RISE until velocity drops
    let maxTicks = 200
    while (getCharacterState().jumpPhase === JUMP_PHASE.RISE && maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
    }
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.HANG)
  })

  it('HANG → FALL after HANG_DURATION ticks', () => {
    startJump()
    tickN(JUMP_CONFIG.ANTICIPATION_DURATION)

    // Get through RISE
    let maxTicks = 200
    while (getCharacterState().jumpPhase === JUMP_PHASE.RISE && maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
    }

    // Tick through HANG
    tickN(JUMP_CONFIG.HANG_DURATION)
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.FALL)
  })

  it('FALL → LAND when characterY reaches 0', () => {
    startJump()
    tickN(JUMP_CONFIG.ANTICIPATION_DURATION)

    // Run through RISE → HANG → FALL → LAND
    let maxTicks = 300
    while (getCharacterState().jumpPhase !== JUMP_PHASE.LAND && maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
    }
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.LAND)
    expect(getCharacterState().characterY).toBe(0)
  })

  it('LAND → RECOVER after LAND_DURATION ticks', () => {
    startJump()

    // Fast-forward to LAND
    let maxTicks = 300
    while (getCharacterState().jumpPhase !== JUMP_PHASE.LAND && maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
    }

    tickN(JUMP_CONFIG.LAND_DURATION)
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.RECOVER)
  })

  it('RECOVER → IDLE after RECOVER_DURATION ticks', () => {
    startJump()

    // Fast-forward to RECOVER
    let maxTicks = 300
    while (getCharacterState().jumpPhase !== JUMP_PHASE.RECOVER && maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
    }

    tickN(JUMP_CONFIG.RECOVER_DURATION)
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.IDLE)
  })

  it('completes full jump cycle back to IDLE', () => {
    startJump()

    let maxTicks = 500
    while (maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
      if (getCharacterState().jumpPhase === JUMP_PHASE.IDLE) break
    }
    expect(getCharacterState().jumpPhase).toBe(JUMP_PHASE.IDLE)
    expect(getCharacterState().squashStretch.scaleX).toBe(1)
    expect(getCharacterState().squashStretch.scaleY).toBe(1)
  })
})

describe('squash and stretch', () => {
  function tickN(n: number) {
    for (let i = 0; i < n; i++) {
      updateJump(CANVAS_W, CANVAS_H)
    }
  }

  it('ANTICIPATION: squashes (wider + shorter)', () => {
    startJump()
    tickN(3) // mid-anticipation
    const ss = getCharacterState().squashStretch
    expect(ss.scaleX).toBeGreaterThan(1) // wider
    expect(ss.scaleY).toBeLessThan(1) // shorter
  })

  it('RISE: stretches vertically', () => {
    startJump()
    tickN(JUMP_CONFIG.ANTICIPATION_DURATION + 1) // in RISE
    const ss = getCharacterState().squashStretch
    expect(ss.scaleY).toBeGreaterThan(1) // taller
  })

  it('resets to 1,1 after full cycle', () => {
    startJump()
    let maxTicks = 500
    while (maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
      if (getCharacterState().jumpPhase === JUMP_PHASE.IDLE) break
    }
    const ss = getCharacterState().squashStretch
    expect(ss.scaleX).toBe(1)
    expect(ss.scaleY).toBe(1)
  })
})

describe('height constraints', () => {
  function tickN(n: number) {
    for (let i = 0; i < n; i++) {
      updateJump(CANVAS_W, CANVAS_H)
    }
  }

  it('character reaches positive height during jump', () => {
    startJump()
    tickN(JUMP_CONFIG.ANTICIPATION_DURATION + 5)
    expect(getCharacterState().characterY).toBeGreaterThan(0)
  })

  it('character returns to ground (y=0) after landing', () => {
    startJump()
    let maxTicks = 500
    while (maxTicks-- > 0) {
      updateJump(CANVAS_W, CANVAS_H)
      if (getCharacterState().jumpPhase === JUMP_PHASE.IDLE) break
    }
    expect(getCharacterState().characterY).toBe(0)
  })
})
