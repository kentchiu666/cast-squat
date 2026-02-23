<template>
  <div id="game-app">
    <!-- Canvas 遊戲繪圖層 -->
    <canvas ref="canvasRef" id="gameCanvas"></canvas>

    <!-- DOM UI 層（Vue 元件）-->
    <div id="textLayer" ref="textLayerRef">
      <LobbyScreen
        v-if="platformState === 'LOBBY'"
        @select-game="handleGameSelect"
      />
    </div>

    <!-- FPS 計數器 -->
    <div id="fps">{{ fps }} FPS</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LobbyScreen from './components/LobbyScreen.vue'
import type { GameModule, PlatformState } from './types/game'
import { getGameById } from './game-registry'

// === 平台狀態 ===
const platformState = ref<PlatformState>('LOBBY')
const fps = ref(0)

// === Canvas 參考 ===
const canvasRef = ref<HTMLCanvasElement | null>(null)
const textLayerRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let spritesheet: HTMLImageElement | null = null

// === 當前遊戲 ===
let activeGame: GameModule | null = null

// === Canvas 尺寸 ===
const CANVAS_SCALE = 0.5
let logicalWidth = 0
let logicalHeight = 0

// === 星空背景 ===
interface Star {
  x: number
  y: number
  size: number
  speed: number
  color: string
}
let starfield: Star[] = []

// === Fixed Timestep ===
const TICK_MS = 1000 / 60
let lastFrameTime = 0
let tickAccumulator = 0
let animFrameId = 0

// === FPS 計數器 ===
let fpsFrameCount = 0
let fpsLastTime = 0

// === Canvas 初始化 ===
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  logicalWidth = window.innerWidth
  logicalHeight = window.innerHeight
  canvas.width = Math.floor(logicalWidth * CANVAS_SCALE)
  canvas.height = Math.floor(logicalHeight * CANVAS_SCALE)
  canvas.style.width = logicalWidth + 'px'
  canvas.style.height = logicalHeight + 'px'

  if (ctx) {
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
  }
}

// === 星空 ===
function setupStarfield() {
  starfield = []
  const alphaLevels = ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.7)']
  for (let i = 0; i < 40; i++) {
    const size = Math.random() * 2 + 1
    starfield.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size,
      speed: Math.random() * 0.5 + 0.1,
      color: alphaLevels[Math.min(Math.floor(size), 2)]!
    })
  }
}

function tickStarfield() {
  if (starfield.length === 0) setupStarfield()
  for (const star of starfield) {
    star.x -= star.speed
    if (star.x < 0) {
      star.x = logicalWidth
      star.y = Math.random() * logicalHeight
    }
  }
}

function renderStarfield() {
  if (!ctx) return
  for (const star of starfield) {
    ctx.fillStyle = star.color
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size)
  }
}

// === 主迴圈 ===
function gameLoop(timestamp: number) {
  if (lastFrameTime === 0) lastFrameTime = timestamp
  const dt = Math.min(timestamp - lastFrameTime, 100)
  lastFrameTime = timestamp

  tickAccumulator += dt
  while (tickAccumulator >= TICK_MS) {
    tick()
    tickAccumulator -= TICK_MS
  }

  render()
  updateFPS()
  animFrameId = requestAnimationFrame(gameLoop)
}

function tick() {
  tickStarfield()
  activeGame?.tick()
}

function render() {
  if (!ctx) return
  ctx.clearRect(0, 0, logicalWidth, logicalHeight)
  renderStarfield()
  activeGame?.render(ctx)
}

function updateFPS() {
  fpsFrameCount++
  const now = performance.now()
  if (now - fpsLastTime >= 1000) {
    fps.value = fpsFrameCount
    fpsFrameCount = 0
    fpsLastTime = now
  }
}

// === 遊戲選擇 ===
async function handleGameSelect(gameId: string) {
  const gameInfo = getGameById(gameId)
  if (!gameInfo?.module || !canvasRef.value || !ctx || !spritesheet || !textLayerRef.value) return

  const mod = await gameInfo.module()
  activeGame = mod.default

  activeGame.init(canvasRef.value, ctx, spritesheet, textLayerRef.value)
  activeGame.setBroadcastCallbacks(
    (data) => console.log('[Broadcast]', JSON.stringify(data)),
    (senderId, data) => console.log(`[Reply to ${senderId}]`, JSON.stringify(data)),
  )
  activeGame.setReturnToLobbyCallback?.(() => handleReturnToLobby())
  activeGame.start()
  platformState.value = 'GAME_ACTIVE'
}

// === 返回 LOBBY ===
function handleReturnToLobby() {
  if (activeGame) {
    activeGame.stop()
    activeGame.destroy()
    activeGame = null
  }
  platformState.value = 'LOBBY'
}

// === 生命週期 ===
onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = false
  }

  // 載入精靈圖
  spritesheet = new Image()
  spritesheet.src = 'kenney_shape-characters/Spritesheet/spritesheet_default.png'
  spritesheet.onload = () => {
    console.log('精靈圖已載入')
  }

  // Canvas resize
  window.addEventListener('resize', resizeCanvas)
  resizeCanvas()

  // 啟動遊戲迴圈
  fpsLastTime = performance.now()
  lastFrameTime = 0
  tickAccumulator = 0
  animFrameId = requestAnimationFrame(gameLoop)

  // 暴露 gameAPI 供 Console 測試
  ;(globalThis as Record<string, unknown>).gameAPI = {
    handleCastMessage: (data: unknown) => activeGame?.handleMessage(data as never),
    getState: () => activeGame?.getState() ?? platformState.value,
    returnToLobby: () => handleReturnToLobby(),
  }

  console.log('平台已初始化 - LOBBY 模式')
})

onUnmounted(() => {
  if (activeGame) {
    activeGame.stop()
    activeGame.destroy()
    activeGame = null
  }
  window.removeEventListener('resize', resizeCanvas)
  cancelAnimationFrame(animFrameId)
})
</script>

<style>
/* === 全域樣式 === */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #1a1a2e;
  overflow: hidden;
  font-family: 'Press Start 2P', cursive;
}

#gameCanvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

#textLayer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: 'Press Start 2P', cursive;
}

#fps {
  position: absolute;
  bottom: 5px;
  right: 5px;
  color: #0f0;
  font-size: 12px;
  font-family: monospace;
  z-index: 100;
}
</style>
