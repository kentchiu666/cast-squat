// === 主渲染器：Mode 7 賽道系統 ===

import { initSky, drawSky, destroySky } from './layers/sky'
import { initClouds, drawClouds, destroyClouds } from './layers/clouds'
import { initParticles, drawParticles, destroyParticles } from './layers/particles'
import { initLightRays, drawLightRays, destroyLightRays } from './layers/light-rays'
import { buildTrackLUT, getTrackLength } from './track'
import type { TrackSample } from './track'
import { generateTilemap, buildTileColorTable, buildFoggedColorTable } from './tilemap'
import { initMode7, renderMode7Ground, destroyMode7 } from './mode7'
import { initWorldObjects, generateWorldObjects, projectObjects, renderWorldObjects, destroyWorldObjects } from './world-objects'
import type { WorldObject } from './world-objects'
import type { TrackDef, ThemeDef } from './courses/types'
import { CAMERA_CONFIG, SPEED_LINE_CONFIG, TRACK_CONFIG, MODE7_CONFIG, NPC_CONFIG } from './constants'
import { renderNpc } from './npc'

const REFERENCE_WIDTH = 1920
const REFERENCE_HEIGHT = 1080

// Minimap 常數
const MINIMAP_SIZE = 160
const MINIMAP_MARGIN = 30
const MINIMAP_X = MINIMAP_MARGIN
const MINIMAP_Y = REFERENCE_HEIGHT - MINIMAP_SIZE - MINIMAP_MARGIN

// Module-level 資料（init 時建立）
let trackLUT: TrackSample[] = []
let trackLength = 0
let tilemap: Uint8Array = new Uint8Array(0)
let worldObjects: WorldObject[] = []
let minimapCanvas: OffscreenCanvas | null = null
let currentTheme: ThemeDef | null = null

export function getTrackLUT(): TrackSample[] { return trackLUT }
export function getTrackLength_(): number { return trackLength }

export function initRenderer(
  _ctx: CanvasRenderingContext2D,
  track: TrackDef,
  theme: ThemeDef,
): void {
  currentTheme = theme

  // 天空（用 theme 顏色）
  initSky(theme.sky)
  if (theme.clouds) {
    initClouds(theme.clouds)
  }
  if (theme.particles) {
    initParticles(theme.particles)
  }
  initLightRays(theme.lightRays)

  // 賽道（用 track 控制點）
  trackLUT = buildTrackLUT(track.controlPoints, TRACK_CONFIG.SAMPLES_PER_SEGMENT)
  trackLength = getTrackLength(trackLUT)

  // Tilemap（用 track 路寬 + theme 顏色）
  tilemap = generateTilemap(trackLUT, track.roadHalfWidthTiles)
  const baseColors = buildTileColorTable(theme.tileColors)
  const fogTable = buildFoggedColorTable(baseColors, MODE7_CONFIG.PHYS_HEIGHT, 6, theme.fogColor)

  // Mode 7
  initMode7(fogTable)

  // 世界物件（用 track 分佈 + theme 精靈）
  initWorldObjects(theme.sprites)
  worldObjects = generateWorldObjects(trackLUT, track.objectPlacement)

  // Minimap
  prerenderMinimap()
}

export interface RenderParams {
  scrollOffset: number
  speed: number
  runningBlend: number
  totalTicks: number
  cameraX: number
  cameraZ: number
  cameraAngle: number
  npcScrollOffset: number
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  params: RenderParams,
): void {
  const { scrollOffset, speed, runningBlend, totalTicks, cameraX, cameraZ, cameraAngle } = params
  // 鏡頭晃動
  const shakeAmplitude = CAMERA_CONFIG.WALK_SHAKE_AMPLITUDE +
    (CAMERA_CONFIG.RUN_SHAKE_AMPLITUDE - CAMERA_CONFIG.WALK_SHAKE_AMPLITUDE) * runningBlend
  const shakeY = Math.sin(totalTicks * CAMERA_CONFIG.SHAKE_FREQUENCY) * shakeAmplitude * speed

  ctx.save()
  ctx.translate(0, Math.floor(shakeY))

  // Layer 1: 天空 + 視差遠山
  drawSky(ctx, cameraAngle)

  // Layer 2: 漂浮雲層
  drawClouds(ctx, totalTicks)

  // Mode 7 地面
  renderMode7Ground(ctx, cameraX, cameraZ, cameraAngle, tilemap)

  // 世界物件（樹、建築等）
  const projected = projectObjects(worldObjects, cameraX, cameraZ, cameraAngle)
  renderWorldObjects(ctx, projected)

  // NPC 陪跑者
  renderNpc(ctx, cameraX, cameraZ, cameraAngle)

  // 飄浮粒子（螢火蟲/光點）
  drawParticles(ctx, totalTicks, speed)

  // 林間漏光
  drawLightRays(ctx, totalTicks * speed, runningBlend, totalTicks)

  // 速度線
  if (runningBlend > 0.1) {
    drawSpeedLines(ctx, totalTicks, runningBlend, speed)
  }

  ctx.restore()

  // Minimap（不受鏡頭晃動影響）
  drawMinimap(ctx, scrollOffset, params.npcScrollOffset)
}

// === 速度線 ===
function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  totalTicks: number,
  runningBlend: number,
  speed: number,
): void {
  const alpha = SPEED_LINE_CONFIG.ALPHA * runningBlend * speed
  if (alpha < 0.01) return

  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = alpha

  const { COUNT, MIN_LENGTH, MAX_LENGTH, LINE_HEIGHT, SEED_STEP, SEED_TICK_MULT, Y_SCATTER, LENGTH_SCATTER } = SPEED_LINE_CONFIG
  const lengthRange = MAX_LENGTH - MIN_LENGTH

  for (let i = 0; i < COUNT; i++) {
    const seed = i * SEED_STEP + totalTicks * SEED_TICK_MULT
    const y = ((seed * Y_SCATTER) % REFERENCE_HEIGHT)
    const length = MIN_LENGTH + ((seed * LENGTH_SCATTER) % lengthRange)

    if (i % 2 === 0) {
      ctx.fillRect(0, Math.floor(y), Math.floor(length), LINE_HEIGHT)
    } else {
      ctx.fillRect(Math.floor(REFERENCE_WIDTH - length), Math.floor(y), Math.floor(length), LINE_HEIGHT)
    }
  }

  ctx.globalAlpha = 1
}

// === Minimap 座標轉換（init 時快取）===
interface MinimapTransform {
  minX: number
  minZ: number
  scale: number
  offsetX: number
  offsetZ: number
}

let minimapTransform: MinimapTransform = { minX: 0, minZ: 0, scale: 1, offsetX: 0, offsetZ: 0 }

function computeMinimapTransform(): MinimapTransform {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const s of trackLUT) {
    if (s.x < minX) minX = s.x
    if (s.x > maxX) maxX = s.x
    if (s.z < minZ) minZ = s.z
    if (s.z > maxZ) maxZ = s.z
  }
  const rangeX = maxX - minX || 1
  const rangeZ = maxZ - minZ || 1
  const scale = (MINIMAP_SIZE - 20) / Math.max(rangeX, rangeZ)
  return {
    minX, minZ, scale,
    offsetX: (MINIMAP_SIZE - rangeX * scale) / 2,
    offsetZ: (MINIMAP_SIZE - rangeZ * scale) / 2,
  }
}

function strokeTrackPath(
  ctx: OffscreenCanvasRenderingContext2D,
  t: MinimapTransform,
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  for (let i = 0; i < trackLUT.length; i++) {
    const s = trackLUT[i]!
    const px = (s.x - t.minX) * t.scale + t.offsetX
    const py = (s.z - t.minZ) * t.scale + t.offsetZ
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.stroke()
}

function prerenderMinimap(): void {
  if (trackLUT.length === 0) return

  minimapTransform = computeMinimapTransform()

  minimapCanvas = new OffscreenCanvas(MINIMAP_SIZE, MINIMAP_SIZE)
  const ctx = minimapCanvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)
  ctx.strokeStyle = '#4a4a4a'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, MINIMAP_SIZE - 2, MINIMAP_SIZE - 2)

  const trackColor = currentTheme?.minimap.trackColor ?? '#5a4a3a'
  strokeTrackPath(ctx, minimapTransform, trackColor, 4)
  strokeTrackPath(ctx, minimapTransform, 'rgba(255, 255, 255, 0.3)', 1)
}

function drawMinimap(ctx: CanvasRenderingContext2D, scrollOffset: number, npcScrollOffset: number): void {
  if (!minimapCanvas || trackLUT.length === 0 || trackLength <= 0) return

  ctx.drawImage(minimapCanvas, MINIMAP_X, MINIMAP_Y, MINIMAP_SIZE, MINIMAP_SIZE)

  const { minX, minZ, scale, offsetX, offsetZ } = minimapTransform

  // NPC 橙色點（先畫，在玩家下面）
  const npcD = ((npcScrollOffset % trackLength) + trackLength) % trackLength
  const npcSample = findNearestSample(npcD)
  if (npcSample) {
    const npcPx = MINIMAP_X + (npcSample.x - minX) * scale + offsetX
    const npcPy = MINIMAP_Y + (npcSample.z - minZ) * scale + offsetZ
    const dotSize = NPC_CONFIG.MINIMAP_DOT_SIZE
    ctx.fillStyle = NPC_CONFIG.MINIMAP_COLOR
    ctx.fillRect(Math.floor(npcPx - dotSize / 2), Math.floor(npcPy - dotSize / 2), dotSize, dotSize)
  }

  // 玩家綠色點
  const d = ((scrollOffset % trackLength) + trackLength) % trackLength
  const sample = findNearestSample(d)
  if (!sample) return

  const px = MINIMAP_X + (sample.x - minX) * scale + offsetX
  const py = MINIMAP_Y + (sample.z - minZ) * scale + offsetZ

  ctx.fillStyle = currentTheme?.minimap.playerColor ?? '#95e86b'
  ctx.fillRect(Math.floor(px - 4), Math.floor(py - 4), 8, 8)

  const dirX = Math.sin(sample.angle) * 6
  const dirZ = -Math.cos(sample.angle) * 6
  ctx.fillStyle = currentTheme?.minimap.directionColor ?? '#ffffff'
  ctx.fillRect(Math.floor(px + dirX - 2), Math.floor(py + dirZ - 2), 4, 4)
}

function findNearestSample(distance: number): TrackSample | null {
  let bestIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < trackLUT.length; i++) {
    const diff = Math.abs(trackLUT[i]!.distance - distance)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  }
  return trackLUT[bestIdx] ?? null
}

export function destroyRenderer(): void {
  destroySky()
  destroyClouds()
  destroyParticles()
  destroyLightRays()
  destroyMode7()
  destroyWorldObjects()
  trackLUT = []
  tilemap = new Uint8Array(0)
  worldObjects = []
  minimapCanvas = null
  currentTheme = null
}
