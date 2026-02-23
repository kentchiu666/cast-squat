import type { PlayerColor } from '../../types/game'

// === 遊戲常數 ===
export const GAME_DURATION = 20

// === 跳躍階段 ===
export const JUMP_PHASE = {
  IDLE: 'IDLE',
  ANTICIPATION: 'ANTICIPATION',
  RISE: 'RISE',
  HANG: 'HANG',
  FALL: 'FALL',
  LAND: 'LAND',
  RECOVER: 'RECOVER',
} as const

export type JumpPhaseName = (typeof JUMP_PHASE)[keyof typeof JUMP_PHASE]

// === 跳躍參數 ===
export const JUMP_CONFIG = {
  ANTICIPATION_DURATION: 6,
  RISE_POWER: 28,
  HANG_DURATION: 5,
  GRAVITY: 1.8,
  LAND_DURATION: 4,
  RECOVER_DURATION: 8,
  MAX_HEIGHT: 300,
} as const

// === 金幣配置 ===
export const COIN_CONFIG = {
  SPAWN_INTERVAL: 90,
  SPEED: 4,
  MIN_HEIGHT: 150,
  MAX_HEIGHT: 280,
  SIZE: 40,
  SCORE: 3,
} as const

// === 多人金幣配置（每人獨立軌道）===
export const MP_COIN_CONFIG = {
  SPAWN_INTERVAL: 80,
  HOVER_LIFETIME: 120,
  BLINK_START: 90,
  SCORE: 3,
  SIZE: 40,
} as const

// === 精靈定義 ===
export interface SpriteRect {
  x: number
  y: number
  w: number
  h: number
}

export const SPRITES = {
  BODY: { x: 256, y: 0, w: 80, h: 80 },
  FACE_IDLE: { x: 109, y: 547, w: 50, h: 29 },
  FACE_ANTICIPATION: { x: 400, y: 350, w: 55, h: 40 },
  FACE_RISE: { x: 400, y: 390, w: 55, h: 32 },
  FACE_HANG: { x: 59, y: 547, w: 50, h: 24 },
  FACE_FALL: { x: 400, y: 455, w: 55, h: 36 },
  FACE_LAND: { x: 400, y: 491, w: 55, h: 40 },
  HAND_CLOSED: { x: 472, y: 316, w: 35, h: 34 },
  HAND_OPEN: { x: 508, y: 287, w: 34, h: 38 },
  HAND_PEACE: { x: 542, y: 262, w: 28, h: 40 },
  HAND_ROCK: { x: 466, y: 37, w: 36, h: 38 },
  SHADOW: { x: 96, y: 122, w: 48, h: 20 },
  COIN: { x: 453, y: 531, w: 40, h: 40 },
} as const satisfies Record<string, SpriteRect>

// === 場景配置 ===
export const SCENE_CONFIG = {
  FLOOR_HEIGHT: 100,
  CHAR_FOOT_OFFSET: 20,
  BASE_SIZE: 80,
} as const

// === 多人遊戲配置 ===
export const PLAYER_COLORS: PlayerColor[] = [
  { name: 'Red', hex: '#FF6B6B', hueRotation: 0 },
  { name: 'Cyan', hex: '#4ECDC4', hueRotation: 180 },
  { name: 'Yellow', hex: '#FFE66D', hueRotation: 45 },
  { name: 'Green', hex: '#95E86B', hueRotation: 90 },
]

export const MULTIPLAYER_CONFIG = {
  MAX_PLAYERS: 4,
  PLAYER_PREVIEW_SIZE: 50,
  SHAKE_INTENSITY: 6,
} as const

// === 粒子物理配置 ===
export const PARTICLE_CONFIG = {
  GRAVITY: 0.3,
  LANDING_COUNT: 6,
  LANDING_SPEED_MIN: 3,
  LANDING_SPEED_MAX: 9,
  COIN_COLLECT_COUNT: 5,
  COIN_COLLECT_SPEED_MIN: 3,
  COIN_COLLECT_SPEED_MAX: 8,
  COIN_COLLECT_UPWARD_BIAS: -3,
  COIN_COLLECT_DECAY: 0.04,
} as const

// === 特效配置 ===
export const EFFECTS_CONFIG = {
  AFTER_IMAGE_INITIAL_ALPHA: 0.6,
  AFTER_IMAGE_DECAY: 0.12,
  MAX_AFTER_IMAGES: 5,
  SPEED_LINE_COUNT: 4,
  SPEED_LINE_DECAY: 0.08,
  SPEED_LINE_FALL_SPEED: 8,
  SCREEN_SHAKE_DECAY: 0.8,
  SCREEN_SHAKE_THRESHOLD: 0.5,
} as const

// === 金幣動畫配置 ===
export const COIN_ANIM_CONFIG = {
  FLIP_FREQUENCY: 0.15,
  MIN_SCALE: 0.3,
  SCALE_RANGE: 0.7,
  BLINK_FRAME_RATE: 6,
  ENTER_FRAMES: 10,
} as const

// === 角色動畫配置 ===
export const CHARACTER_ANIM_CONFIG = {
  FACE_HEIGHT: 28,
  FACE_Y_OFFSET: 12,
  HAND_OFFSET_X: 15,
  HAND_SCALE: 0.8,
  SHADOW_FADE_HEIGHT: 400,
  ANTICIPATION_SINK: 10,
  FALL_SPEED_NORMALIZER: 20,
  HANG_INITIAL_VELOCITY: -2,
  SINGLE_PLAYER_SHAKE_INTENSITY: 8,
} as const
