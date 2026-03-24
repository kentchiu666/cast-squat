// === 賽道定義（控制路徑形狀和物件分佈）===
export interface TrackDef {
  id: string
  name: string
  controlPoints: TrackPoint[]
  roadHalfWidthTiles: number
  objectPlacement: {
    treeSpacing: number
    laneOffsetMin: number
    laneOffsetMax: number
    buildingPositions: number[]
  }
}

export interface TrackPoint {
  x: number
  z: number
}

// === RGBA 顏色 ===
export type RGBA = readonly [number, number, number, number]

// === 精靈顏色配置 ===
export interface SpriteColorSet {
  primary: string
  secondary: string
  tertiary?: string
}

// === 視覺風格定義（控制所有顏色和視覺效果）===
export interface ThemeDef {
  id: string
  name: string
  sky: {
    top: string
    bottom: string
    mountainDark: string
    mountainLight: string
  }
  tileColors: {
    grassA: RGBA
    grassB: RGBA
    road: RGBA
    roadEdge: RGBA
    building: RGBA
    roadCenter?: RGBA
  }
  fogColor: readonly [number, number, number]
  lightRays: {
    color: string
    rayCount: number
    walkAlpha: number
    runAlphaMin: number
    runAlphaMax: number
    flickerSpeed: number
  }
  sprites: {
    treeDark: SpriteColorSet
    treeLight: SpriteColorSet
    bush: SpriteColorSet
    rock: SpriteColorSet
    building: {
      body: string
      roof: string
      roofDark: string
      door: string
      window: string
    }
  }
  minimap: {
    trackColor: string
    playerColor: string
    directionColor: string
  }
  clouds?: {
    count: number
    minSpeed: number
    maxSpeed: number
    color: string
    shadowColor: string
  }
  particles?: {
    count: number
    color: string
    minAlpha: number
    maxAlpha: number
    pulseSpeed: number
  }
}
