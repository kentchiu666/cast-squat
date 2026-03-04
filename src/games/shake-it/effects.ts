import { EFFECTS_CONFIG } from './constants'

// === 螢幕震動 ===
let shakeX = 0
let shakeY = 0
let shakeIntensity = 0

export function triggerScreenShake(intensity: number): void {
  shakeIntensity = intensity
}

export function updateScreenShake(): void {
  if (shakeIntensity > EFFECTS_CONFIG.SCREEN_SHAKE_THRESHOLD) {
    shakeX = (Math.random() - 0.5) * shakeIntensity * 2
    shakeY = (Math.random() - 0.5) * shakeIntensity * 2
    shakeIntensity *= EFFECTS_CONFIG.SCREEN_SHAKE_DECAY
  } else {
    shakeX = 0
    shakeY = 0
    shakeIntensity = 0
  }
}

export function getScreenShake(): { x: number; y: number } {
  return { x: shakeX, y: shakeY }
}

export function resetEffects(): void {
  shakeX = 0
  shakeY = 0
  shakeIntensity = 0
}
