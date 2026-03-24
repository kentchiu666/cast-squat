import { CADENCE_CONFIG } from './constants'

// === 步頻 → 速度映射 ===
// cadence 0~WALK_THRESHOLD    → speed 0~WALK_MAX_SPEED
// cadence WALK~RUN_THRESHOLD  → speed WALK_MAX_SPEED~RUN_START_SPEED
// cadence RUN~MAX_CADENCE     → speed RUN_START_SPEED~MAX_SPEED
export function cadenceToSpeed(cadence: number): number {
  if (cadence <= 0) return 0
  const { WALK_THRESHOLD, RUN_THRESHOLD, MAX_CADENCE, WALK_MAX_SPEED, RUN_START_SPEED, MAX_SPEED } = CADENCE_CONFIG
  const clamped = Math.min(cadence, MAX_CADENCE)

  if (clamped <= WALK_THRESHOLD) {
    return (clamped / WALK_THRESHOLD) * WALK_MAX_SPEED
  }
  if (clamped <= RUN_THRESHOLD) {
    const t = (clamped - WALK_THRESHOLD) / (RUN_THRESHOLD - WALK_THRESHOLD)
    return WALK_MAX_SPEED + t * (RUN_START_SPEED - WALK_MAX_SPEED)
  }
  const t = (clamped - RUN_THRESHOLD) / (MAX_CADENCE - RUN_THRESHOLD)
  return RUN_START_SPEED + t * (MAX_SPEED - RUN_START_SPEED)
}

// === 線性內插 ===
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// === 走/跑判定 ===
export function isRunningCadence(cadence: number): boolean {
  return cadence >= CADENCE_CONFIG.RUN_THRESHOLD
}
