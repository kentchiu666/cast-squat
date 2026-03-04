import type { PlayerColor } from '../../types/game'

// === 遊戲常數 ===
export const GAME_DURATION = 20
export const RESULT_TIMEOUT = 5 // 等待結果超時（秒）

// === 搖晃動畫配置 ===
export const SHAKE_ANIM = {
  OFFSET_X_AMPLITUDE: 12,
  OFFSET_X_FREQUENCY: 0.3,
  ROTATION_AMPLITUDE: 0.15,
  ROTATION_FREQUENCY: 0.25,
  OFFSET_Y_AMPLITUDE: 4,
  OFFSET_Y_FREQUENCY: 0.6,
  SQUASH_AMPLITUDE: 0.08,
  SQUASH_FREQUENCY: 0.6,
  HAND_SWING_AMPLITUDE: 0.5,
  HAND_SWING_FREQUENCY: 0.3,
  PLAYER_PHASE_OFFSET: 15,
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
  FACE_SHAKING: { x: 400, y: 390, w: 55, h: 32 },
  HAND_OPEN: { x: 508, y: 287, w: 34, h: 38 },
  HAND_ROCK: { x: 466, y: 37, w: 36, h: 38 },
  SHADOW: { x: 96, y: 122, w: 48, h: 20 },
} as const satisfies Record<string, SpriteRect>

// === 場景配置 ===
export const SCENE_CONFIG = {
  FLOOR_HEIGHT: 100,
  CHAR_FOOT_OFFSET: 20,
  BASE_SIZE: 80,
} as const

// === 8 人玩家顏色 ===
export const PLAYER_COLORS: PlayerColor[] = [
  { name: 'Red', hex: '#FF6B6B', hueRotation: 0 },
  { name: 'Cyan', hex: '#4ECDC4', hueRotation: 180 },
  { name: 'Yellow', hex: '#FFE66D', hueRotation: 45 },
  { name: 'Green', hex: '#95E86B', hueRotation: 90 },
  { name: 'Purple', hex: '#B388FF', hueRotation: 270 },
  { name: 'Orange', hex: '#FF8A5C', hueRotation: 20 },
  { name: 'Pink', hex: '#FF69B4', hueRotation: 330 },
  { name: 'Blue', hex: '#64B5F6', hueRotation: 210 },
]

// === 多人遊戲配置 ===
export const MULTIPLAYER_CONFIG = {
  MAX_PLAYERS: 8,
  PLAYER_PREVIEW_SIZE: 50,
} as const

// === 特效配置 ===
export const EFFECTS_CONFIG = {
  SCREEN_SHAKE_INTENSITY: 4,
  SCREEN_SHAKE_DECAY: 0.85,
  SCREEN_SHAKE_THRESHOLD: 0.3,
} as const

// === 角色繪製配置 ===
export const CHARACTER_ANIM_CONFIG = {
  FACE_HEIGHT: 28,
  FACE_Y_OFFSET: 12,
  HAND_OFFSET_X: 15,
  HAND_SCALE: 0.8,
} as const

// === 派對背景配置 ===
export const PARTY_BG = {
  // 漸層底色
  GRADIENT_TOP: '#1a0a2e',    // 深紫
  GRADIENT_BOTTOM: '#0a1628', // 深藍
  // 光點
  LIGHT_COUNT: 25,
  LIGHT_COLORS: [
    'rgba(78,205,196,A)',  // 青
    'rgba(255,107,107,A)', // 紅
    'rgba(255,230,109,A)', // 黃
    'rgba(149,232,107,A)', // 綠
    'rgba(179,136,255,A)', // 紫
    'rgba(255,105,180,A)', // 粉
  ],
  LIGHT_MIN_SIZE: 3,
  LIGHT_MAX_SIZE: 8,
  PULSE_SPEED: 0.02,       // 閃爍速度
  DRIFT_SPEED: 0.3,        // 漂移速度
} as const
