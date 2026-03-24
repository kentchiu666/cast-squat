// === Hill Run 遊戲常數 ===

// === 步頻配置（複用 jungle-run 的設計）===
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

// === 賽道配置 ===
export const TRACK_CONFIG = {
  NUM_POINTS: 12,
  BASE_RADIUS: 200,
  ROAD_WIDTH: 12,
  ROAD_SEGMENTS: 100,
  // 高度起伏
  HILL_AMPLITUDE: 15,
  HILL_FREQUENCY_1: 2,
  HILL_FREQUENCY_2: 3.7,
  HILL_RANDOM_JITTER: 5,
} as const

// === 3D 場景配置 ===
export const SCENE_CONFIG = {
  CAMERA_HEIGHT: 5,
  CAMERA_BEHIND: 10,
  CAMERA_LOOK_AHEAD: 20,
  FOG_NEAR: 80,
  FOG_FAR: 250,
  RENDER_SCALE: 0.5,   // 半解析度渲染（Chromecast v3 效能）
} as const

// === 遊戲設定 ===
export const GAME_CONFIG = {
  TICKS_PER_SECOND: 60,
  LOCAL_WALK_CADENCE: 80,
  LOCAL_RUN_CADENCE: 150,
  DEFAULT_STRIDE_LENGTH: 0.7,
} as const
