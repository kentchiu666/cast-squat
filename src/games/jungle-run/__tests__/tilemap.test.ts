import { describe, it, expect } from 'vitest'
import { generateTilemap, buildTileColorTable, TileType } from '../tilemap'
import { buildTrackLUT } from '../track'
import { jungleLoopTrack } from '../courses/tracks/jungle-loop'
import { jungleTheme } from '../courses/themes/jungle'
import { TILEMAP_CONFIG } from '../constants'

const lut = buildTrackLUT(jungleLoopTrack.controlPoints, 20)
const { MAP_SIZE } = TILEMAP_CONFIG

describe('generateTilemap', () => {
  const tilemap = generateTilemap(lut, jungleLoopTrack.roadHalfWidthTiles)

  it('generates correct size', () => {
    expect(tilemap.length).toBe(MAP_SIZE * MAP_SIZE)
  })

  it('contains ROAD tiles along track path', () => {
    let roadCount = 0
    for (let i = 0; i < tilemap.length; i++) {
      if (tilemap[i] === TileType.ROAD || tilemap[i] === TileType.ROAD_EDGE) {
        roadCount++
      }
    }
    expect(roadCount).toBeGreaterThan(0)
  })

  it('majority of tiles are grass', () => {
    let grassCount = 0
    for (let i = 0; i < tilemap.length; i++) {
      if (tilemap[i] === TileType.GRASS_A || tilemap[i] === TileType.GRASS_B) {
        grassCount++
      }
    }
    expect(grassCount).toBeGreaterThan(tilemap.length * 0.5)
  })

  it('all tile values are valid TileType', () => {
    const validTypes = [TileType.GRASS_A, TileType.GRASS_B, TileType.ROAD, TileType.ROAD_EDGE, TileType.BUILDING, TileType.ROAD_CENTER]
    for (let i = 0; i < tilemap.length; i++) {
      expect(validTypes).toContain(tilemap[i])
    }
  })
})

describe('buildTileColorTable', () => {
  const table = buildTileColorTable(jungleTheme.tileColors)

  it('has entry for each tile type', () => {
    expect(table.length).toBeGreaterThanOrEqual(5)
  })

  it('all entries are non-zero RGBA', () => {
    for (let i = 0; i < 5; i++) {
      expect(table[i]).not.toBe(0)
    }
  })
})
