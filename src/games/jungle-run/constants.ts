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

// === 隨機賽道生成 ===
export const RANDOM_TRACK_CONFIG = {
  NUM_POINTS: 10,
  BASE_RADIUS: 400,
  RADIUS_JITTER: 150,
  ANGLE_JITTER: 0.15,
  MIN_POINT_DISTANCE: 120,
  ROAD_HALF_WIDTH_TILES: 5,
  TREE_SPACING: 80,
  LANE_OFFSET_MIN: 60,
  LANE_OFFSET_MAX: 150,
  MAX_BUILDINGS: 2,
  CURVATURE_THRESHOLD: 0.3,
  WORLD_BOUND: 800,
  MAX_RETRIES: 5,
} as const

// === 世界物件引擎 ===
export const WORLD_OBJECT_CONFIG = {
  MAX_VIEW_DISTANCE: 800,
  MAX_RENDERED_OBJECTS: 20,
} as const

// === NPC 陪跑 ===
export const NPC_CONFIG = {
  // 橡皮筋行為
  BASE_SPEED: 3.5,
  RUBBER_BAND_STRENGTH: 0.02,
  COMFORT_DISTANCE: 80,
  MAX_SPEED_MULT: 2.0,
  MIN_SPEED_MULT: 0.1,
  SPEED_LERP: 0.03,
  INITIAL_LEAD: 50,
  // 車道
  LANE_OFFSET: 25,
  // 精靈
  SPRITE_WIDTH: 12,
  SPRITE_HEIGHT: 20,
  COLOR: '#FF8C42',
  ALPHA: 0.85,
  // 名稱標籤
  NAME: 'PACER',
  NAME_FONT_SCALE: 1.8,
  NAME_OFFSET_Y: 8,
  // 對話氣泡
  BUBBLE_MESSAGES: ['GO GO!', 'NICE!', 'KEEP UP!', 'FASTER!', 'YEAH!'] as readonly string[],
  BUBBLE_MIN_INTERVAL: 300,
  BUBBLE_MAX_INTERVAL: 600,
  BUBBLE_DURATION: 120,
  BUBBLE_FONT_SCALE: 1.5,
  BUBBLE_PADDING: 6,
  BUBBLE_OFFSET_Y: 24,
  BUBBLE_BG: '#ffffff',
  BUBBLE_TEXT_COLOR: '#333333',
  BUBBLE_TAIL_SIZE: 4,
  // Minimap
  MINIMAP_COLOR: '#FF8C42',
  MINIMAP_DOT_SIZE: 6,
} as const

// === 遊戲設定 ===
export const GAME_CONFIG = {
  TICKS_PER_SECOND: 60,
  LOCAL_WALK_CADENCE: 80,
  LOCAL_RUN_CADENCE: 150,
  DEFAULT_STRIDE_LENGTH: 0.7,
} as const
