import type { TrackSample } from './track'
import { sampleTrack } from './track'
import { TRACK_CONFIG } from './constants'

// === 攝影機狀態 ===
export interface CameraState {
  x: number
  z: number
  angle: number
}

// === 角度線性插值（處理 -PI/PI 邊界）===
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

// === 更新攝影機（每 tick 呼叫）===
export function updateCamera(
  scrollOffset: number,
  trackLUT: TrackSample[],
  prevCamera: CameraState,
  lerpFactor: number,
): CameraState {
  const sample = sampleTrack(trackLUT, scrollOffset)

  // 攝影機在角色後方一小段距離
  const behindDist = TRACK_CONFIG.CAMERA_BEHIND_DISTANCE
  const camX = sample.x - Math.sin(sample.angle) * behindDist
  const camZ = sample.z + Math.cos(sample.angle) * behindDist

  return {
    x: camX,
    z: camZ,
    angle: lerpAngle(prevCamera.angle, sample.angle, lerpFactor),
  }
}
