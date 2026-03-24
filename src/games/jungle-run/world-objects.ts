import type { TrackSample } from './track'
import type { ThemeDef, TrackDef } from './courses/types'
import { MODE7_CONFIG, WORLD_OBJECT_CONFIG } from './constants'

// === 世界物件類型 ===
export const WorldObjectType = {
  TREE_DARK: 0,
  TREE_LIGHT: 1,
  BUSH: 2,
  ROCK: 3,
  BUILDING: 4,
} as const

// === 世界物件 ===
export interface WorldObject {
  worldX: number
  worldZ: number
  type: number
  spriteWidth: number
  spriteHeight: number
}

// === 螢幕投影結果 ===
export interface ProjectedObject {
  screenX: number
  screenY: number
  scale: number
  depth: number
  type: number
}

// 預渲染精靈
let sprites: OffscreenCanvas[] = []

// === 預渲染精靈 ===
type SC = { primary: string; secondary: string; tertiary?: string }
type BC = { body: string; roof: string; roofDark: string; door: string; window: string }

// === 輔助：繪製像素風輪廓 ===
function drawOutline(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, 2)         // 上
  ctx.fillRect(x, y + h - 2, w, 2) // 下
  ctx.fillRect(x, y, 2, h)         // 左
  ctx.fillRect(x + w - 2, y, 2, h) // 右
}

// === 輔助：調亮/調暗顏色 ===
function lighten(hex: string, amount: number): string {
  const r = Math.min(255, Number.parseInt(hex.slice(1, 3), 16) + amount)
  const g = Math.min(255, Number.parseInt(hex.slice(3, 5), 16) + amount)
  const b = Math.min(255, Number.parseInt(hex.slice(5, 7), 16) + amount)
  return `rgb(${r},${g},${b})`
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, Number.parseInt(hex.slice(1, 3), 16) - amount)
  const g = Math.max(0, Number.parseInt(hex.slice(3, 5), 16) - amount)
  const b = Math.max(0, Number.parseInt(hex.slice(5, 7), 16) - amount)
  return `rgb(${r},${g},${b})`
}

function prerenderTree(colors: SC, isLight: boolean): OffscreenCanvas {
  const w = 80, h = 140
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const outline = darken(colors.primary, 30)
  const highlight = lighten(colors.secondary, isLight ? 40 : 20)
  const shadow = darken(colors.secondary, 25)
  const canopy3 = colors.tertiary ?? colors.secondary

  // 地面陰影
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(10, h - 8, 60, 8)

  // 樹幹（有紋理）
  ctx.fillStyle = colors.primary
  ctx.fillRect(32, 80, 16, 52)
  // 樹幹高光（左側）
  ctx.fillStyle = lighten(colors.primary, 20)
  ctx.fillRect(32, 80, 4, 52)
  // 樹幹暗面（右側）
  ctx.fillStyle = darken(colors.primary, 15)
  ctx.fillRect(44, 80, 4, 52)
  // 樹幹紋理線
  ctx.fillStyle = darken(colors.primary, 10)
  ctx.fillRect(34, 90, 10, 2)
  ctx.fillRect(34, 100, 10, 2)
  ctx.fillRect(34, 110, 10, 2)

  // 樹冠 — 三層堆疊，從大到小
  // 底層（最大，陰影面）
  ctx.fillStyle = shadow
  ctx.fillRect(6, 50, 68, 35)
  ctx.fillStyle = colors.secondary
  ctx.fillRect(8, 48, 64, 33)
  // 中層
  ctx.fillStyle = canopy3
  ctx.fillRect(12, 28, 56, 30)
  ctx.fillStyle = colors.secondary
  ctx.fillRect(14, 26, 52, 28)
  // 頂層（最小，高光）
  ctx.fillStyle = highlight
  ctx.fillRect(20, 10, 40, 24)
  ctx.fillStyle = colors.secondary
  ctx.fillRect(22, 12, 36, 20)

  // 高光斑點（左上亮面）
  ctx.fillStyle = highlight
  ctx.fillRect(16, 30, 8, 6)
  ctx.fillRect(24, 14, 6, 6)
  ctx.fillRect(12, 52, 10, 4)

  // 輪廓線
  ctx.fillStyle = outline
  // 樹冠外框（簡化版）
  ctx.fillRect(6, 48, 68, 2)
  ctx.fillRect(6, 83, 68, 2)
  ctx.fillRect(4, 50, 2, 33)
  ctx.fillRect(74, 50, 2, 33)
  // 頂部
  ctx.fillRect(18, 8, 44, 2)
  ctx.fillRect(18, 8, 2, 28)
  ctx.fillRect(60, 8, 2, 28)

  return c
}

function prerenderTreeDark(colors: SC): OffscreenCanvas {
  return prerenderTree(colors, false)
}

function prerenderTreeLight(colors: SC): OffscreenCanvas {
  return prerenderTree(colors, true)
}

function prerenderBush(colors: SC): OffscreenCanvas {
  const w = 50, h = 36
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const highlight = lighten(colors.secondary, 30)
  const shadow = darken(colors.primary, 20)

  // 地面陰影
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(4, h - 6, 42, 6)

  // 主體（圓形堆疊感）
  ctx.fillStyle = shadow
  ctx.fillRect(4, 14, 42, 18)
  ctx.fillStyle = colors.primary
  ctx.fillRect(6, 12, 38, 16)
  ctx.fillStyle = colors.secondary
  ctx.fillRect(8, 10, 34, 14)
  // 頂部隆起
  ctx.fillStyle = colors.secondary
  ctx.fillRect(12, 6, 26, 8)
  ctx.fillStyle = highlight
  ctx.fillRect(14, 4, 22, 6)

  // 高光斑點
  ctx.fillStyle = highlight
  ctx.fillRect(10, 12, 6, 4)
  ctx.fillRect(22, 6, 4, 4)

  // 輪廓
  drawOutline(ctx, 4, 10, 42, 22, darken(colors.primary, 30))

  return c
}

function prerenderRock(colors: SC): OffscreenCanvas {
  const w = 40, h = 28
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const highlight = lighten(colors.secondary, 25)
  const shadow = darken(colors.primary, 20)

  // 地面陰影
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(6, h - 4, 30, 4)

  // 主體（不規則方塊堆疊）
  ctx.fillStyle = shadow
  ctx.fillRect(4, 10, 32, 16)
  ctx.fillStyle = colors.primary
  ctx.fillRect(6, 8, 28, 14)
  ctx.fillStyle = colors.secondary
  ctx.fillRect(8, 6, 24, 12)
  // 頂部
  ctx.fillStyle = colors.secondary
  ctx.fillRect(12, 4, 16, 6)

  // 高光面（左上）
  ctx.fillStyle = highlight
  ctx.fillRect(8, 6, 8, 4)

  // 裂縫紋理
  ctx.fillStyle = shadow
  ctx.fillRect(16, 8, 2, 8)
  ctx.fillRect(22, 10, 2, 6)

  // 輪廓
  drawOutline(ctx, 4, 4, 32, 22, darken(colors.primary, 35))

  return c
}

function prerenderBuilding(colors: BC): OffscreenCanvas {
  const w = 120, h = 180
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const bodyDark = darken(colors.body, 20)
  const bodyHighlight = lighten(colors.body, 15)
  const outline = darken(colors.body, 40)

  // 地面陰影
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(8, h - 8, 104, 8)

  // 主體
  ctx.fillStyle = colors.body
  ctx.fillRect(12, 50, 96, 122)
  // 右側暗面（立體感）
  ctx.fillStyle = bodyDark
  ctx.fillRect(88, 50, 20, 122)
  // 左側亮面
  ctx.fillStyle = bodyHighlight
  ctx.fillRect(12, 50, 10, 122)

  // 磚塊紋理
  ctx.fillStyle = darken(colors.body, 8)
  for (let row = 0; row < 8; row++) {
    const y = 54 + row * 14
    ctx.fillRect(12, y, 96, 1)
    // 交錯的磚縫
    const offset = row % 2 === 0 ? 0 : 16
    for (let bx = offset; bx < 96; bx += 32) {
      ctx.fillRect(12 + bx, y, 1, 14)
    }
  }

  // 斜屋頂
  ctx.fillStyle = colors.roof
  ctx.fillRect(6, 30, 108, 24)
  ctx.fillStyle = colors.roofDark
  ctx.fillRect(10, 20, 100, 14)
  // 屋頂高光
  ctx.fillStyle = lighten(colors.roof, 20)
  ctx.fillRect(6, 30, 108, 4)
  // 屋頂邊緣陰影
  ctx.fillStyle = darken(colors.roof, 20)
  ctx.fillRect(6, 50, 108, 4)

  // 窗戶（凹入感）
  // 窗戶（凹入感）
  const winXs = [24, 64]
  const winYs = [70, 110]
  for (const wx of winXs) {
    for (const wy of winYs) {
      ctx.fillStyle = darken(colors.body, 30)
      ctx.fillRect(wx - 2, wy - 2, 24, 22)
      ctx.fillStyle = colors.window
      ctx.fillRect(wx, wy, 20, 18)
      ctx.fillStyle = lighten(colors.window, 40)
      ctx.fillRect(wx, wy, 8, 8)
      ctx.fillStyle = darken(colors.body, 20)
      ctx.fillRect(wx + 9, wy, 2, 18)
      ctx.fillRect(wx, wy + 8, 20, 2)
    }
  }

  // 門
  ctx.fillStyle = darken(colors.door, 10)
  ctx.fillRect(44, 130, 32, 42)
  ctx.fillStyle = colors.door
  ctx.fillRect(46, 132, 28, 40)
  // 門把
  ctx.fillStyle = colors.window
  ctx.fillRect(68, 150, 4, 4)

  // 整體輪廓線
  drawOutline(ctx, 10, 18, 100, 156, outline)

  return c
}

// === 初始化精靈（接收 theme 精靈顏色）===
export function initWorldObjects(themeSprites: ThemeDef['sprites']): void {
  sprites = [
    prerenderTreeDark(themeSprites.treeDark),
    prerenderTreeLight(themeSprites.treeLight),
    prerenderBush(themeSprites.bush),
    prerenderRock(themeSprites.rock),
    prerenderBuilding(themeSprites.building),
  ]
}

// === 沿賽道放置物件（接收 track 放置配置）===
export function generateWorldObjects(trackLUT: TrackSample[], placement: TrackDef['objectPlacement']): WorldObject[] {
  const objects: WorldObject[] = []
  const { treeSpacing: TREE_SPACING, laneOffsetMin: TREE_LANE_OFFSET_MIN, laneOffsetMax: TREE_LANE_OFFSET_MAX } = placement

  // 沿賽道每隔一段放樹和灌木
  for (let i = 0; i < trackLUT.length; i += Math.floor(TREE_SPACING / 2)) {
    const sample = trackLUT[i]
    if (!sample) continue

    const perpX = Math.cos(sample.angle)
    const perpZ = Math.sin(sample.angle)

    const offset = TREE_LANE_OFFSET_MIN + Math.random() * (TREE_LANE_OFFSET_MAX - TREE_LANE_OFFSET_MIN)

    // 左側
    if (i % 4 === 0) {
      objects.push({
        worldX: sample.x - perpX * offset,
        worldZ: sample.z - perpZ * offset,
        type: i % 8 === 0 ? WorldObjectType.TREE_DARK : WorldObjectType.BUSH,
        spriteWidth: i % 8 === 0 ? 60 : 40,
        spriteHeight: i % 8 === 0 ? 120 : 30,
      })
    }

    // 右側
    if (i % 4 === 2) {
      objects.push({
        worldX: sample.x + perpX * offset,
        worldZ: sample.z + perpZ * offset,
        type: i % 8 === 2 ? WorldObjectType.TREE_LIGHT : WorldObjectType.ROCK,
        spriteWidth: i % 8 === 2 ? 60 : 30,
        spriteHeight: i % 8 === 2 ? 120 : 20,
      })
    }
  }

  // 建築物（由 track 配置決定位置）
  for (const pos of placement.buildingPositions) {
    const buildingIdx = Math.floor(trackLUT.length * pos)
    const bSample = trackLUT[buildingIdx]
    if (bSample) {
      const perpX = Math.cos(bSample.angle)
      const perpZ = Math.sin(bSample.angle)
      objects.push({
        worldX: bSample.x + perpX * 200,
        worldZ: bSample.z + perpZ * 200,
        type: WorldObjectType.BUILDING,
        spriteWidth: 100,
        spriteHeight: 160,
      })
    }
  }

  return objects
}

// === 世界物件投影到螢幕 ===
export function projectObjects(
  objects: WorldObject[],
  camX: number,
  camZ: number,
  camAngle: number,
): ProjectedObject[] {
  const { MAX_VIEW_DISTANCE, MAX_RENDERED_OBJECTS } = WORLD_OBJECT_CONFIG
  const focalLength = MODE7_CONFIG.FOCAL_LENGTH
  const horizonY = MODE7_CONFIG.HORIZON_Y
  const screenCenterX = MODE7_CONFIG.GROUND_LOGICAL_WIDTH / 2

  const cosA = Math.cos(camAngle)
  const sinA = Math.sin(camAngle)

  const projected: ProjectedObject[] = []

  for (const obj of objects) {
    const dx = obj.worldX - camX
    const dz = obj.worldZ - camZ

    // 旋轉到攝影機空間
    const localX = dx * cosA + dz * sinA
    const localZ = dx * sinA - dz * cosA

    if (localZ <= 10) continue
    if (localZ > MAX_VIEW_DISTANCE) continue

    // 透視投影（對齊 Mode 7 地面座標）
    // Mode 7 地面: groundBufferY = CAMERA_HEIGHT * FOCAL_LENGTH / localZ - 1
    // 螢幕Y = HORIZON_Y + groundBufferY * (LOGICAL_HEIGHT / PHYS_HEIGHT)
    const cameraHeight = MODE7_CONFIG.CAMERA_HEIGHT
    const logicalScale = MODE7_CONFIG.GROUND_LOGICAL_HEIGHT / MODE7_CONFIG.PHYS_HEIGHT
    const groundBufferY = cameraHeight * focalLength / localZ - 1
    const screenY = horizonY + groundBufferY * logicalScale
    const scale = focalLength / localZ
    const screenX = screenCenterX + localX * scale * 2

    // 螢幕外裁剪
    if (screenX < -200 || screenX > 2120) continue

    projected.push({
      screenX,
      screenY,
      scale: scale * 2,
      depth: localZ,
      type: obj.type,
    })
  }

  // 按距離排序（遠的先畫）
  projected.sort((a, b) => b.depth - a.depth)

  // 限制數量
  if (projected.length > MAX_RENDERED_OBJECTS) {
    projected.length = MAX_RENDERED_OBJECTS
  }

  return projected
}

// === 繪製世界物件 ===
export function renderWorldObjects(
  ctx: CanvasRenderingContext2D,
  projected: ProjectedObject[],
): void {
  for (const obj of projected) {
    const sprite = sprites[obj.type]
    if (!sprite) continue

    const drawW = Math.floor(sprite.width * obj.scale)
    const drawH = Math.floor(sprite.height * obj.scale)
    const drawX = Math.floor(obj.screenX - drawW / 2)
    const drawY = Math.floor(obj.screenY - drawH)

    ctx.drawImage(sprite, drawX, drawY, drawW, drawH)
  }
}

// === 清理 ===
export function destroyWorldObjects(): void {
  sprites = []
}
