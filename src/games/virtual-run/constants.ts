export const YOUTUBE_VIDEO_ID = 'OuSh_h-wzTE'
export const YOUTUBE_START_SECONDS = 30

export const DEFAULT_STRIDE_LENGTH = 0.7 // 公尺

export const RUN_CONFIG = {
  /** 本地測試模式每次點擊增加的距離（公尺） */
  LOCAL_TEST_DISTANCE_PER_CLICK: 10,
  /** tick 頻率（每秒） */
  TICKS_PER_SECOND: 60,
  /** 無收到 RUN_UPDATE 超過此 tick 數視為停止跑步，暫停影片（1.5 秒 = 90 ticks at 60fps） */
  IDLE_TIMEOUT_TICKS: 90,
} as const
