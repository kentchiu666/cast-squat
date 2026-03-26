<template>
  <div id="game-app">
    <!-- Canvas 遊戲繪圖層 -->
    <canvas ref="canvasRef" id="gameCanvas"></canvas>

    <!-- Vue 管理：LOBBY -->
    <div id="lobbyLayer" v-show="platformState === 'LOBBY'">
      <LobbyScreen
        ref="lobbyRef"
        @select-game="handleGameSelect"
      />
    </div>

    <!-- Vue 管理：遊戲 UI（動態元件）-->
    <component v-if="activeGameUI" :is="activeGameUI" />

    <!-- FPS 計數器（直接 DOM）-->
    <div id="fps" ref="fpsRef">0 FPS</div>

    <!-- Cast 除錯面板（直接 DOM，不走 Vue reactivity）-->
    <div id="cast-debug" ref="debugPanelRef"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, provide, nextTick, onMounted, onUnmounted } from 'vue'
import type { Component } from 'vue'
import LobbyScreen from './components/LobbyScreen.vue'
import type { GameModule, PlatformState, CastMessageData, GameInfoSlim } from './types/game'
import { getGameById, GAMES } from './game-registry'

// === 平台狀態 ===
const platformState = ref<PlatformState>('LOBBY')
const activeGameUI = shallowRef<Component | null>(null)
const fpsRef = ref<HTMLElement | null>(null)
let fpsValue = 0

// === 除錯面板（直接 DOM 操作，繞過 Vue）===
const debugPanelRef = ref<HTMLElement | null>(null)
const activeGameId = ref<string | null>(null)
const MAX_DEBUG_MESSAGES = 15

function addDebug(msg: string): void {
  const panel = debugPanelRef.value
  if (!panel) return
  const ts = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const line = document.createElement('div')
  line.textContent = `[${ts}] ${msg}`
  // 插入到狀態行之後（第一個子元素之後）
  if (panel.children.length > 1) {
    panel.insertBefore(line, panel.children[1] ?? null)
  } else {
    panel.appendChild(line)
  }
  // 限制數量（+1 是狀態行）
  while (panel.children.length > MAX_DEBUG_MESSAGES + 1) {
    panel.lastChild!.remove()
  }
}

function updateDebugStatus(): void {
  const panel = debugPanelRef.value
  if (!panel) return
  let statusLine = panel.firstElementChild as HTMLElement | null
  if (!statusLine || !statusLine.dataset.status) {
    statusLine = document.createElement('div')
    statusLine.dataset.status = '1'
    panel.prepend(statusLine)
  }
  statusLine.textContent = `P:${platformState.value} G:${activeGameId.value ?? 'none'}`
}

// === Canvas 參考 ===
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
const characterSheets = shallowRef<HTMLImageElement[]>([])
let itemSpritesheet: HTMLImageElement | null = null

// === 精靈圖標準佈局座標（= 熊的座標，遊戲程式碼的 CHAR_SPRITES）===
interface SpriteRect { x: number; y: number; w: number; h: number }
const STANDARD_SPRITES: Record<string, SpriteRect> = {
  BODY:           { x: 30,   y: 10,  w: 310, h: 360 },
  SHADOW:         { x: 1220, y: 140, w: 200, h: 90 },
  FACE_IDLE:      { x: 15,   y: 470, w: 220, h: 190 },
  FACE_CALM:      { x: 250,  y: 470, w: 220, h: 190 },
  FACE_SURPRISED: { x: 500,  y: 470, w: 220, h: 190 },
  FACE_FOCUSED:   { x: 740,  y: 470, w: 220, h: 190 },
  FACE_NERVOUS:   { x: 980,  y: 470, w: 220, h: 190 },
  FACE_PAIN:      { x: 1220, y: 470, w: 220, h: 190 },
}
const STANDARD_WIDTH = 1456
const STANDARD_HEIGHT = 720

// === 角色配置（路徑 + 來源座標，null = 已是標準佈局）===
const CHARACTER_CONFIGS: { path: string; sourceSprites: Record<string, SpriteRect> | null }[] = [
  { path: 'characters/bear.png', sourceSprites: null },
  { path: 'characters/sheep.png', sourceSprites: {
    BODY:           { x: 60,   y: 20,  w: 310, h: 360 },
    SHADOW:         { x: 1230, y: 290, w: 220, h: 90 },
    FACE_IDLE:      { x: 85,   y: 450, w: 220, h: 190 },
    FACE_CALM:      { x: 320,  y: 450, w: 220, h: 190 },
    FACE_SURPRISED: { x: 550,  y: 450, w: 220, h: 190 },
    FACE_FOCUSED:   { x: 780,  y: 450, w: 220, h: 190 },
    FACE_NERVOUS:   { x: 1010, y: 450, w: 220, h: 190 },
    FACE_PAIN:      { x: 1240, y: 450, w: 220, h: 190 },
  }},
]

// === 精靈圖正規化（將來源座標映射到標準座標）===
function normalizeSheet(
  sourceImg: HTMLImageElement,
  sourceSprites: Record<string, SpriteRect>,
): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas')
  canvas.width = STANDARD_WIDTH
  canvas.height = STANDARD_HEIGHT
  const offCtx = canvas.getContext('2d')!

  for (const [key, stdRect] of Object.entries(STANDARD_SPRITES)) {
    const srcRect = sourceSprites[key]
    if (!srcRect) continue
    offCtx.drawImage(sourceImg,
      srcRect.x, srcRect.y, srcRect.w, srcRect.h,
      stdRect.x, stdRect.y, stdRect.w, stdRect.h,
    )
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.src = canvas.toDataURL('image/png')
  })
}

// === 提供給子元件 ===
provide('characterSheets', characterSheets)
provide('standardSprites', STANDARD_SPRITES)

// === LobbyScreen ref（Cast 遙控用）===
const lobbyRef = ref<InstanceType<typeof LobbyScreen> | null>(null)

// === 當前遊戲 ===
let activeGame: GameModule | null = null

// === Cast Receiver ===
const CAST_NAMESPACE = 'urn:x-cast:com.example.castsquat'
let castContext: cast.framework.CastReceiverContext | null = null

function castBroadcast(data: Record<string, unknown>): void {
  console.log('[Broadcast]', JSON.stringify(data))
  if (castContext) {
    try {
      castContext.sendCustomMessage(CAST_NAMESPACE, undefined, data)
    } catch (e) {
      console.warn('[Cast] Broadcast 失敗:', e)
    }
  }
}

function castReply(senderId: string, data: Record<string, unknown>): void {
  console.log(`[Reply→${senderId}]`, JSON.stringify(data))
  if (castContext) {
    try {
      castContext.sendCustomMessage(CAST_NAMESPACE, senderId, data)
    } catch (e) {
      console.warn('[Cast] Reply 失敗:', e)
    }
  }
}

function broadcastLobbyState(): void {
  const games: GameInfoSlim[] = GAMES.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    icon: g.icon,
    iconColor: g.iconColor,
    typeLabel: g.typeLabel,
    available: g.available,
  }))
  castBroadcast({
    type: 'LOBBY_STATE',
    games,
    selectedIndex: lobbyRef.value?.getSelectedIndex() ?? 0,
  })
}

function broadcastPlatformState(senderId?: string): void {
  const stateData: Record<string, unknown> = {
    type: 'PLATFORM_STATE',
    state: platformState.value,
  }
  if (platformState.value === 'GAME_ACTIVE' && activeGame) {
    stateData.gameId = activeGame.id
    stateData.gameState = activeGame.getState()
  }
  if (senderId) {
    castReply(senderId, stateData)
  } else {
    castBroadcast(stateData)
  }
}

function handleCastMessage(event: { data: unknown; senderId: string }): void {
  let data = event.data as CastMessageData
  const senderId = event.senderId

  console.log('[Cast] 收到訊息:', JSON.stringify(data), 'from:', senderId)
  addDebug(`IN: ${typeof data === 'string' ? data.substring(0, 40) : JSON.stringify(data).substring(0, 40)}`)

  // Cast SDK 可能傳入 JSON 字串，先嘗試解析
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      if (typeof parsed === 'object' && parsed !== null && 'action' in parsed) {
        data = parsed as CastMessageData
      } else {
        // 非結構化字串，轉發給遊戲
        activeGame?.handleMessage(data, senderId)
        return
      }
    } catch {
      // 非 JSON 字串，轉發給遊戲
      activeGame?.handleMessage(data, senderId)
      return
    }
  }

  // 平台級訊息（字串已在上面處理掉）
  if (typeof data === 'string') return
  addDebug(`ACTION: ${data.action}`)
  switch (data.action) {
    case 'LOAD_GAME':
      handleGameSelect(data.gameId)
      return
    case 'RETURN_LOBBY':
      handleReturnToLobby()
      return
    case 'QUERY_STATE':
      broadcastPlatformState(senderId)
      if (platformState.value === 'LOBBY') broadcastLobbyState()
      return
    case 'NAVIGATE_LEFT':
      if (platformState.value === 'LOBBY') {
        lobbyRef.value?.navigateLeft()
        broadcastLobbyState()
      }
      return
    case 'NAVIGATE_RIGHT':
      if (platformState.value === 'LOBBY') {
        lobbyRef.value?.navigateRight()
        broadcastLobbyState()
      }
      return
    case 'SELECT_GAME': {
      if (platformState.value === 'LOBBY') {
        const selectedId = lobbyRef.value?.getSelectedGameId()
        if (selectedId) handleGameSelect(selectedId)
      }
      return
    }
  }

  // 遊戲級訊息，轉發
  activeGame?.handleMessage(data, senderId)
}

function initCastReceiver(): void {
  if (typeof cast === 'undefined' || !cast.framework) {
    addDebug('Cast SDK 不存在，本地模式')
    console.log('[Cast] SDK 不存在，使用本地測試模式')
    return
  }

  try {
    castContext = cast.framework.CastReceiverContext.getInstance()
    castContext.addCustomMessageListener(CAST_NAMESPACE, handleCastMessage)
    castContext.start({
      disableIdleTimeout: true,
      skipPlayersLoad: true,
    })
    addDebug('Cast Receiver 已啟動（idle timeout 已停用）')
    console.log('[Cast] Receiver 已啟動，disableIdleTimeout=true')
  } catch (e) {
    addDebug(`Cast 初始化失敗: ${e}`)
    console.warn('[Cast] 初始化失敗:', e)
    castContext = null
  }
}

// === Canvas 尺寸 ===
const CANVAS_SCALE = 0.5
const REFERENCE_WIDTH = 1920
const REFERENCE_HEIGHT = 1080
let logicalWidth = REFERENCE_WIDTH
let logicalHeight = REFERENCE_HEIGHT

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
let debugFrameCount = 0

// === Canvas 初始化 ===
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const actualWidth = window.innerWidth
  const actualHeight = window.innerHeight
  canvas.width = Math.floor(actualWidth * CANVAS_SCALE)
  canvas.height = Math.floor(actualHeight * CANVAS_SCALE)
  canvas.style.width = actualWidth + 'px'
  canvas.style.height = actualHeight + 'px'

  // 固定參考座標系：所有繪製以 1920×1080 為基準，transform 負責實際縮放
  logicalWidth = REFERENCE_WIDTH
  logicalHeight = REFERENCE_HEIGHT

  if (ctx) {
    ctx.imageSmoothingEnabled = false
    const scaleX = (actualWidth * CANVAS_SCALE) / REFERENCE_WIDTH
    const scaleY = (actualHeight * CANVAS_SCALE) / REFERENCE_HEIGHT
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)
  }
}

// === 星空 ===
function setupStarfield() {
  starfield = []
  const alphaLevels = ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.7)']
  for (let i = 0; i < 40; i++) {
    const size = Math.random() * 2 + 1
    starfield.push({
      x: Math.random() * REFERENCE_WIDTH,
      y: Math.random() * REFERENCE_HEIGHT,
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
let loopErrorLogged = false

function gameLoop(timestamp: number) {
  animFrameId = requestAnimationFrame(gameLoop)

  if (lastFrameTime === 0) lastFrameTime = timestamp
  const dt = Math.min(timestamp - lastFrameTime, 100)
  lastFrameTime = timestamp

  tickAccumulator += dt
  let tickCount = 0
  const MAX_TICKS_PER_FRAME = 6
  while (tickAccumulator >= TICK_MS && tickCount < MAX_TICKS_PER_FRAME) {
    try {
      tick()
    } catch (e) {
      if (!loopErrorLogged) {
        addDebug(`TICK ERR: ${e instanceof Error ? e.message : String(e)}`)
        loopErrorLogged = true
      }
    }
    tickAccumulator -= TICK_MS
    tickCount++
  }
  if (tickAccumulator > TICK_MS) tickAccumulator = 0

  try {
    render()
  } catch (e) {
    if (!loopErrorLogged) {
      addDebug(`RENDER ERR: ${e instanceof Error ? e.message : String(e)}`)
      loopErrorLogged = true
    }
  }
  updateFPS()

  // 每 120 幀記錄一次狀態
  debugFrameCount++
  if (debugFrameCount % 300 === 0) {
    const gs = activeGame?.getState() ?? 'N/A'
    addDebug(`F${debugFrameCount} gs=${gs} fps=${fpsValue} ${logicalWidth}x${logicalHeight}`)
  }
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
    fpsValue = fpsFrameCount
    if (fpsRef.value) fpsRef.value.textContent = `${fpsValue} FPS`
    fpsFrameCount = 0
    fpsLastTime = now
  }
}

// === 遊戲選擇 ===
async function handleGameSelect(gameId: string) {
  const gameInfo = getGameById(gameId)
  addDebug(`SELECT: ${gameId} found=${!!gameInfo?.module}`)
  if (!gameInfo?.module || !canvasRef.value || !ctx) {
    addDebug(`ABORT: canvas=${!!canvasRef.value} ctx=${!!ctx}`)
    return
  }
  if (characterSheets.value.filter(Boolean).length === 0) {
    addDebug('ABORT: no character sheets')
    return
  }

  try {
    addDebug(`LOADING module...`)
    const mod = await gameInfo.module()
    addDebug(`MODULE loaded, default=${!!mod.default}`)
    activeGame = mod.default
    activeGameId.value = gameId

    addDebug(`INIT: ${activeGame.id} sheets=${characterSheets.value.filter(Boolean).length} item=${!!itemSpritesheet}`)
    activeGame.init(canvasRef.value, ctx, characterSheets.value, itemSpritesheet)
    addDebug(`INIT done`)
    activeGame.setBroadcastCallbacks(castBroadcast, castReply)
    activeGame.setReturnToLobbyCallback?.(() => handleReturnToLobby())
    activeGameUI.value = activeGame.getUIComponent()
    activeGame.start()
    platformState.value = 'GAME_ACTIVE'
    addDebug(`STARTED: ${gameId}`)
    updateDebugStatus()
    broadcastPlatformState()
  } catch (e) {
    addDebug(`ERROR: ${e instanceof Error ? e.message : String(e)}`)
    console.error('[GameSelect] 載入失敗:', e)
  }
}

// === 返回 LOBBY ===
function handleReturnToLobby() {
  addDebug(`RETURN_LOBBY from=${activeGameId.value}`)
  if (activeGame) {
    try {
      activeGame.stop()
      activeGame.destroy()
    } catch (e) {
      addDebug(`DESTROY ERR: ${e instanceof Error ? e.message : String(e)}`)
    }
    activeGame = null
  }
  activeGameId.value = null
  activeGameUI.value = null
  platformState.value = 'LOBBY'
  addDebug('platformState → LOBBY')
  updateDebugStatus()
  broadcastPlatformState()
  nextTick(() => broadcastLobbyState())
}

// === 生命週期 ===
onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = false
  }

  // 載入角色精靈圖（並行載入 → 正規化座標）
  const sheets: HTMLImageElement[] = []
  const charLoadPromises = CHARACTER_CONFIGS.map((config, index) => {
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.src = config.path
      img.onload = async () => {
        addDebug(`IMG OK: ${config.path} ${img.width}x${img.height}`)
        if (config.sourceSprites) {
          sheets[index] = await normalizeSheet(img, config.sourceSprites)
        } else {
          sheets[index] = img
        }
        resolve()
      }
      img.onerror = () => {
        addDebug(`IMG FAIL: ${config.path}`)
        console.warn(`角色精靈圖載入失敗: ${config.path}`)
        resolve()
      }
    })
  })

  // 載入物品精靈圖（金幣等）
  itemSpritesheet = new Image()
  itemSpritesheet.onload = () => addDebug(`ITEM OK: ${itemSpritesheet!.width}x${itemSpritesheet!.height}`)
  itemSpritesheet.onerror = () => addDebug('ITEM FAIL')
  itemSpritesheet.src = 'kenney_shape-characters/Spritesheet/spritesheet_default.png'

  Promise.all(charLoadPromises).then(() => {
    characterSheets.value = sheets
    console.log(`${sheets.filter(Boolean).length} 張角色精靈圖已載入`)
  })

  // Canvas resize
  window.addEventListener('resize', resizeCanvas)
  resizeCanvas()

  // 啟動遊戲迴圈
  fpsLastTime = performance.now()
  lastFrameTime = 0
  tickAccumulator = 0
  animFrameId = requestAnimationFrame(gameLoop)

  // 初始化 Cast Receiver
  initCastReceiver()

  // 暴露 gameAPI 供 Console 測試
  ;(globalThis as Record<string, unknown>).gameAPI = {
    handleCastMessage: (data: unknown, senderId?: string) => {
      handleCastMessage({ data, senderId: senderId ?? 'console' })
    },
    getState: () => activeGame?.getState() ?? platformState.value,
    returnToLobby: () => handleReturnToLobby(),
    getLobbyState: () => ({
      selectedIndex: lobbyRef.value?.getSelectedIndex(),
      selectedGame: lobbyRef.value?.getSelectedGameId(),
    }),
  }

  addDebug('平台已初始化 - LOBBY')
  console.log('平台已初始化 - LOBBY 模式')
})

onUnmounted(() => {
  if (activeGame) {
    activeGame.stop()
    activeGame.destroy()
    activeGame = null
  }
  if (castContext) {
    castContext.stop()
    castContext = null
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
}

#lobbyLayer {
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
  bottom: 5vw;
  right: 3vw;
  color: #0f0;
  font-size: 1.25vw;
  font-family: monospace;
  z-index: 100;
}

#cast-debug {
  position: absolute;
  top: 0.26vw;
  left: 0.26vw;
  color: #0f0;
  font-size: 0.52vw;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.21vw 0.42vw;
  z-index: 200;
  max-width: 50%;
  word-break: break-all;
  line-height: 1.4;
}
</style>
