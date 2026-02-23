// === 緩動函數 ===
export function easeOutQuad(t: number): number {
  return t * (2 - t)
}

export function easeInQuad(t: number): number {
  return t * t
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// === 數學工具 ===
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// === 碰撞檢測 ===
export function circleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean {
  const dx = x1 - x2
  const dy = y1 - y2
  const distance = Math.hypot(dx, dy)
  return distance < r1 + r2
}
