import { CADENCE_CONFIG } from './constants'

// === 步頻 → 速度映射（複用 jungle-run 的邏輯）===

export function cadenceToSpeed(cadence: number): number {
  if (cadence < CADENCE_CONFIG.WALK_THRESHOLD) return 0
  if (cadence < CADENCE_CONFIG.RUN_THRESHOLD) {
    const t = (cadence - CADENCE_CONFIG.WALK_THRESHOLD) / (CADENCE_CONFIG.RUN_THRESHOLD - CADENCE_CONFIG.WALK_THRESHOLD)
    return t * CADENCE_CONFIG.WALK_MAX_SPEED
  }
  const t = (cadence - CADENCE_CONFIG.RUN_THRESHOLD) / (CADENCE_CONFIG.MAX_CADENCE - CADENCE_CONFIG.RUN_THRESHOLD)
  return CADENCE_CONFIG.RUN_START_SPEED + t * (CADENCE_CONFIG.MAX_SPEED - CADENCE_CONFIG.RUN_START_SPEED)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
