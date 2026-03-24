// ======================================================
// Engine 常數 — 渲染引擎和遊戲機制，不因賽道/風格改變
// Track 和 Theme 資料在 courses/ 目錄下定義
// ======================================================

// Re-export 型別供其他模組使用
export type { TrackPoint, TrackDef, ThemeDef, RGBA } from './courses/types'

// === 場景配置 ===
export const SCENE_CONFIG = {
  HORIZON_Y: 400,
  ROAD_MIN_HALF_WIDTH: 60,
  ROAD_MAX_HALF_WIDTH: 500,
  SCANLINE_STEP: 3,
  ROAD_CENTER_X: 960,
} as const

// === 視差速度 ===
export const PARALLAX_SPEEDS = {
  SKY: 0.05,
  MIDGROUND: 0.3,
  LIGHT_RAYS: 0.15,
  ROAD: 1.0,
} as const

// === 步頻配置 ===
export const CADENCE_CONFIG = {
  WALK_THRESHOLD: 60,
  RUN_THRESHOLD: 120,
  MAX_CADENCE: 180,
  WALK_MAX_SPEED: 0.2,
  RUN_START_SPEED: 0.5,
  MAX_SPEED: 1,
  SPEED_LERP_FACTOR: 0.05,
  BLEND_LERP_FACTOR: 0.03,
  IDLE_TIMEOUT_TICKS: 120,
  BASE_SCROLL_SPEED: 8,
} as const

// === 鏡頭效果 ===
export const CAMERA_CONFIG = {
  WALK_SHAKE_AMPLITUDE: 2,
  RUN_SHAKE_AMPLITUDE: 8,
  SHAKE_FREQUENCY: 0.12,
} as const

// === 速度線 ===
export const SPEED_LINE_CONFIG = {
  COUNT: 14,
  MIN_LENGTH: 60,
  MAX_LENGTH: 200,
  ALPHA: 0.5,
  LINE_HEIGHT: 2,
  SEED_STEP: 137.5,
  SEED_TICK_MULT: 3,
  Y_SCATTER: 7.3,
  LENGTH_SCATTER: 3.7,
} as const

// === Mode 7 渲染 ===
export const MODE7_CONFIG = {
  PHYS_WIDTH: 960,
  PHYS_HEIGHT: 340,
  FOCAL_LENGTH: 480,
  CAMERA_HEIGHT: 100,
  HORIZON_Y: 400,
  GROUND_LOGICAL_WIDTH: 1920,
  GROUND_LOGICAL_HEIGHT: 680,
} as const

// === Tilemap ===
export const TILEMAP_CONFIG = {
  MAP_SIZE: 128,
  TILE_SIZE: 16,
} as const

// === 賽道引擎 ===
export const TRACK_CONFIG = {
  SAMPLES_PER_SEGMENT: 50,
  CAMERA_ANGLE_LERP: 0.08,
  CAMERA_BEHIND_DISTANCE: 40,
} as const

// === 世界物件引擎 ===
export const WORLD_OBJECT_CONFIG = {
  MAX_VIEW_DISTANCE: 800,
  MAX_RENDERED_OBJECTS: 20,
} as const

// === 遊戲設定 ===
export const GAME_CONFIG = {
  TICKS_PER_SECOND: 60,
  LOCAL_WALK_CADENCE: 80,
  LOCAL_RUN_CADENCE: 150,
  DEFAULT_STRIDE_LENGTH: 0.7,
} as const
