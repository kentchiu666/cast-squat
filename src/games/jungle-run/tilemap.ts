import type { TrackSample } from './track'
import { TILEMAP_CONFIG } from './constants'

const { MAP_SIZE, TILE_SIZE } = TILEMAP_CONFIG

// === Tile 類型 ===
export const TileType = {
  GRASS_A: 0,
  GRASS_B: 1,
  ROAD: 2,
  ROAD_EDGE: 3,
  BUILDING: 4,
  ROAD_CENTER: 5,
} as const

export type TileTypeValue = (typeof TileType)[keyof typeof TileType]

// === 程式化生成 tilemap ===
export function generateTilemap(trackLUT: TrackSample[], roadHalfWidthTiles: number): Uint8Array {
  const ROAD_HALF_WIDTH_TILES = roadHalfWidthTiles
  const tilemap = new Uint8Array(MAP_SIZE * MAP_SIZE)

  // 初始化為棋盤格草地
  for (let tz = 0; tz < MAP_SIZE; tz++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      tilemap[tz * MAP_SIZE + tx] = (tx + tz) % 2 === 0 ? TileType.GRASS_A : TileType.GRASS_B
    }
  }

  // 沿賽道路徑標記道路 tile
  for (const sample of trackLUT) {
    const centerTX = worldToTile(sample.x)
    const centerTZ = worldToTile(sample.z)

    for (let dx = -ROAD_HALF_WIDTH_TILES - 1; dx <= ROAD_HALF_WIDTH_TILES + 1; dx++) {
      for (let dz = -ROAD_HALF_WIDTH_TILES - 1; dz <= ROAD_HALF_WIDTH_TILES + 1; dz++) {
        const tx = wrapTile(centerTX + dx)
        const tz = wrapTile(centerTZ + dz)
        const dist = Math.max(Math.abs(dx), Math.abs(dz))

        const idx = tz * MAP_SIZE + tx
        if (dist === 0) {
          // 道路中線（白色虛線效果用 tile 交替實現）
          tilemap[idx] = TileType.ROAD_CENTER
        } else if (dist <= ROAD_HALF_WIDTH_TILES) {
          tilemap[idx] = TileType.ROAD
        } else if (dist === ROAD_HALF_WIDTH_TILES + 1 && tilemap[idx] !== TileType.ROAD) {
          tilemap[idx] = TileType.ROAD_EDGE
        }
      }
    }
  }

  return tilemap
}

// === 世界座標 → tile 座標 ===
function worldToTile(worldCoord: number): number {
  // 偏移到 tilemap 中心，避免負數問題
  return Math.floor(worldCoord / TILE_SIZE + MAP_SIZE / 2) & (MAP_SIZE - 1)
}

// === tile 座標循環 ===
function wrapTile(t: number): number {
  return ((t % MAP_SIZE) + MAP_SIZE) % MAP_SIZE
}

// === 世界座標 → tile type（Mode 7 每像素查詢用）===
export function getTileAt(tilemap: Uint8Array, worldX: number, worldZ: number): number {
  const tx = Math.floor(worldX / TILE_SIZE + MAP_SIZE / 2) & (MAP_SIZE - 1)
  const tz = Math.floor(worldZ / TILE_SIZE + MAP_SIZE / 2) & (MAP_SIZE - 1)
  return tilemap[tz * MAP_SIZE + tx]!
}

// === 建立 tile 顏色查表 ===
export function buildTileColorTable(tileColors: {
  grassA: readonly [number, number, number, number]
  grassB: readonly [number, number, number, number]
  road: readonly [number, number, number, number]
  roadEdge: readonly [number, number, number, number]
  building: readonly [number, number, number, number]
  roadCenter?: readonly [number, number, number, number]
}): Uint32Array {
  const table = new Uint32Array(6)
  table[TileType.GRASS_A] = rgbaToUint32(...tileColors.grassA)
  table[TileType.GRASS_B] = rgbaToUint32(...tileColors.grassB)
  table[TileType.ROAD] = rgbaToUint32(...tileColors.road)
  table[TileType.ROAD_EDGE] = rgbaToUint32(...tileColors.roadEdge)
  table[TileType.BUILDING] = rgbaToUint32(...tileColors.building)
  table[TileType.ROAD_CENTER] = rgbaToUint32(...(tileColors.roadCenter ?? [255, 255, 220, 255]))
  return table
}

// === 預計算 per-row 霧化顏色表 ===
export function buildFoggedColorTable(
  baseColors: Uint32Array,
  numRows: number,
  numTypes: number,
  fogColor: readonly [number, number, number],
): Uint32Array[] {
  const table: Uint32Array[] = []
  for (let row = 0; row < numRows; row++) {
    // 霧效：遠處微霧增加深度感，近處完全清晰
    const rawFog = row / numRows
    const fogFactor = 0.4 + rawFog * 0.6
    const rowColors = new Uint32Array(numTypes)
    for (let t = 0; t < numTypes; t++) {
      rowColors[t] = blendWithFog(baseColors[t]!, fogFactor, fogColor)
    }
    table.push(rowColors)
  }
  return table
}

// === RGBA → Uint32 (little-endian ABGR) ===
function rgbaToUint32(r: number, g: number, b: number, a: number): number {
  return (a << 24) | (b << 16) | (g << 8) | r
}

// === 霧化混合 ===
function blendWithFog(color: number, fogFactor: number, fogColorRGB: readonly [number, number, number]): number {
  const r = color & 0xFF
  const g = (color >> 8) & 0xFF
  const b = (color >> 16) & 0xFF
  const a = (color >> 24) & 0xFF

  const fogR = fogColorRGB[0], fogG = fogColorRGB[1], fogB = fogColorRGB[2]

  // 混合
  const f = Math.min(Math.max(fogFactor, 0), 1)
  const nr = Math.floor(fogR + (r - fogR) * f)
  const ng = Math.floor(fogG + (g - fogG) * f)
  const nb = Math.floor(fogB + (b - fogB) * f)

  return (a << 24) | (nb << 16) | (ng << 8) | nr
}
