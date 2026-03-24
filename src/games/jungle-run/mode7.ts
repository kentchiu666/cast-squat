import { MODE7_CONFIG, TILEMAP_CONFIG } from './constants'

const { PHYS_WIDTH, PHYS_HEIGHT, FOCAL_LENGTH, CAMERA_HEIGHT } = MODE7_CONFIG
const { MAP_SIZE, TILE_SIZE } = TILEMAP_CONFIG

// === Module-level buffer（init 時分配，每幀重用）===
let groundCanvas: OffscreenCanvas | null = null
let groundCtx: OffscreenCanvasRenderingContext2D | null = null
let groundImageData: ImageData | null = null
let groundPixels: Uint32Array | null = null

// 預計算 per-row 霧化顏色表
let foggedColors: Uint32Array[] = []

// === 初始化 ===
export function initMode7(fogTable: Uint32Array[]): void {
  groundCanvas = new OffscreenCanvas(PHYS_WIDTH, PHYS_HEIGHT)
  groundCtx = groundCanvas.getContext('2d')
  if (groundCtx) {
    groundImageData = groundCtx.createImageData(PHYS_WIDTH, PHYS_HEIGHT)
    groundPixels = new Uint32Array(groundImageData.data.buffer)
  }
  foggedColors = fogTable
  console.log('[Mode7] init done, buffer:', !!groundPixels, 'fogRows:', fogTable.length)
}

// === Mode 7 地面渲染（每幀呼叫）===
export function renderMode7Ground(
  mainCtx: CanvasRenderingContext2D,
  camX: number,
  camZ: number,
  camAngle: number,
  tilemap: Uint8Array,
): void {
  if (!groundCanvas || !groundCtx || !groundImageData || !groundPixels) {
    // Fallback: 如果 buffer 未初始化，畫一個明顯的紅色區域作為除錯
    mainCtx.fillStyle = '#ff0000'
    mainCtx.fillRect(0, MODE7_CONFIG.HORIZON_Y, MODE7_CONFIG.GROUND_LOGICAL_WIDTH, MODE7_CONFIG.GROUND_LOGICAL_HEIGHT)
    return
  }

  const centerX = PHYS_WIDTH / 2
  const cosA = Math.cos(camAngle)
  const sinA = Math.sin(camAngle)

  // tilemap 中心偏移（世界座標 0,0 對應 tilemap 中心）
  const halfMap = MAP_SIZE / 2

  for (let y = 0; y < PHYS_HEIGHT; y++) {
    // 標準 Mode 7：scale 由 CAMERA_HEIGHT 控制水平展開
    // forwardDist 由 FOCAL_LENGTH * scale 控制前方可見距離
    const scale = CAMERA_HEIGHT / (y + 1)
    const forwardDist = FOCAL_LENGTH * scale

    // per-row 預計算
    const fwdCos = forwardDist * cosA
    const fwdSin = forwardDist * sinA

    const rowOffset = y * PHYS_WIDTH
    const rowColors = foggedColors[y]
    if (!rowColors) continue

    for (let x = 0; x < PHYS_WIDTH; x++) {
      const horizDist = (x - centerX) * scale

      const worldX = camX + horizDist * cosA + fwdSin
      const worldZ = camZ + horizDist * sinA - fwdCos

      // 世界座標 → tile 座標
      const rawTX = Math.floor(worldX / TILE_SIZE) + halfMap
      const rawTZ = Math.floor(worldZ / TILE_SIZE) + halfMap

      // 超出 tilemap 範圍 → 草地（不循環重複）
      if (rawTX < 0 || rawTX >= MAP_SIZE || rawTZ < 0 || rawTZ >= MAP_SIZE) {
        groundPixels[rowOffset + x] = rowColors[(rawTX + rawTZ) & 1]!
      } else {
        groundPixels[rowOffset + x] = rowColors[tilemap[rawTZ * MAP_SIZE + rawTX]!]!
      }
    }
  }

  groundCtx.putImageData(groundImageData, 0, 0)

  // 貼到主 canvas（邏輯座標空間）
  mainCtx.drawImage(
    groundCanvas,
    0,
    MODE7_CONFIG.HORIZON_Y,
    MODE7_CONFIG.GROUND_LOGICAL_WIDTH,
    MODE7_CONFIG.GROUND_LOGICAL_HEIGHT,
  )
}

// === 清理 ===
export function destroyMode7(): void {
  groundCanvas = null
  groundCtx = null
  groundImageData = null
  groundPixels = null
  foggedColors = []
}
