<template>
  <div class="lobby-screen">
    <!-- 像素太陽 -->
    <div class="sun">
      <div class="sun-rays"></div>
    </div>

    <!-- 像素雲朵裝飾 -->
    <div class="cloud cloud-1"></div>
    <div class="cloud cloud-2"></div>
    <div class="cloud cloud-3"></div>
    <div class="cloud cloud-4"></div>

    <!-- 閃爍星星 -->
    <div class="sparkle sparkle-1"></div>
    <div class="sparkle sparkle-2"></div>
    <div class="sparkle sparkle-3"></div>
    <div class="sparkle sparkle-4"></div>
    <div class="sparkle sparkle-5"></div>

    <!-- 三角旗幟 -->
    <div class="bunting">
      <span
        v-for="i in 16"
        :key="i"
        class="flag"
        :class="`flag-${(i % 4) + 1}`"
        :style="{ marginTop: flagDroop(i - 1) + 'px' }"
      ></span>
    </div>

    <!-- 標題區 -->
    <div class="lobby-header">
      <div class="lobby-title">MEGOLUKI</div>
      <div class="lobby-subtitle">PARTY GAME</div>
    </div>

    <!-- 選擇提示 -->
    <div class="lobby-hint">SELECT GAME</div>

    <!-- 中央聚焦卡片列 -->
    <div class="carousel-viewport">
      <!-- 左箭頭 -->
      <div
        class="arrow arrow-left"
        :class="{ hidden: selectedIndex === 0 }"
        @click="selectedIndex--"
      >
        &lt;
      </div>

      <div
        class="carousel-track"
        :style="{ transform: `translateX(${trackOffset}px)` }"
      >
        <GameCard
          v-for="(game, index) in games"
          :key="game.id"
          :game="game"
          :selected="index === selectedIndex"
          @select="() => handleCardClick(index)"
        />
      </div>

      <!-- 右箭頭 -->
      <div
        class="arrow arrow-right"
        :class="{ hidden: selectedIndex === games.length - 1 }"
        @click="selectedIndex++"
      >
        &gt;
      </div>
    </div>

    <!-- 資訊面板 -->
    <div class="info-panel" :key="selectedGame.id">
      <div class="info-name">{{ selectedGame.name }}</div>
      <div class="info-desc">{{ selectedGame.description }}</div>
      <div class="info-type">
        <span class="type-badge">{{ selectedGame.typeLabel }}</span>
      </div>
      <button
        v-if="selectedGame.available"
        class="play-btn"
        @click="selectGameWithReaction(selectedGame.id)"
      >
        PLAY
      </button>
      <div v-else class="coming-soon">COMING SOON</div>
    </div>

    <!-- 角色吉祥物 -->
    <canvas ref="mascotLeftRef" class="mascot mascot-left" width="480" height="520"></canvas>
    <canvas ref="mascotRightRef" class="mascot mascot-right" width="480" height="520"></canvas>

    <!-- 草地 -->
    <div class="ground"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, type ShallowRef } from 'vue'
import { GAMES } from '../game-registry'
import GameCard from './GameCard.vue'

const games = GAMES

// === 角色吉祥物 ===
interface SpriteRect { x: number; y: number; w: number; h: number }
const characterSheets = inject<ShallowRef<HTMLImageElement[]>>('characterSheets')!
const standardSprites = inject<Record<string, SpriteRect>>('standardSprites')!

const mascotLeftRef = ref<HTMLCanvasElement | null>(null)
const mascotRightRef = ref<HTMLCanvasElement | null>(null)
let mascotAnimId = 0

const MASCOT_SIZE = 360
const MASCOT_CANVAS_W = 480
const MASCOT_CANVAS_H = 520

// === 行為類型 ===
type MascotAction = 'idle' | 'jump' | 'look' | 'nod'

interface MascotState {
  timer: number
  faceKey: string
  phaseOffset: number
  // 行為系統
  action: MascotAction
  actionTimer: number
  actionDuration: number
  nextActionAt: number
  // 跳躍
  jumpY: number
  jumpVelocity: number
  // 看對方
  flipX: boolean
  // 打瞌睡
  nodAngle: number
}

function createMascotState(phaseOffset: number): MascotState {
  return {
    timer: 0,
    faceKey: 'FACE_IDLE',
    phaseOffset,
    action: 'idle',
    actionTimer: 0,
    actionDuration: 0,
    nextActionAt: 180 + Math.floor(Math.random() * 180),
    jumpY: 0,
    jumpVelocity: 0,
    flipX: false,
    nodAngle: 0,
  }
}

function triggerAction(state: MascotState, action: MascotAction): void {
  state.action = action
  state.actionTimer = 0
  switch (action) {
    case 'jump':
      state.actionDuration = 40
      state.jumpVelocity = 12
      state.faceKey = 'FACE_SURPRISED'
      break
    case 'look':
      state.actionDuration = 120
      state.flipX = true
      state.faceKey = 'FACE_CALM'
      break
    case 'nod':
      state.actionDuration = 150
      state.faceKey = 'FACE_IDLE'
      break
  }
}

const RANDOM_ACTIONS: MascotAction[] = ['jump', 'look', 'nod']

function updateMascotState(state: MascotState): void {
  state.timer++
  state.actionTimer++

  switch (state.action) {
    case 'idle':
      // 等待下一個隨機行為
      if (state.timer >= state.nextActionAt) {
        const action = RANDOM_ACTIONS[Math.floor(Math.random() * RANDOM_ACTIONS.length)]!
        triggerAction(state, action)
      }
      break

    case 'jump':
      // 跳躍物理
      state.jumpY += state.jumpVelocity
      state.jumpVelocity -= 0.6
      if (state.jumpY <= 0) {
        state.jumpY = 0
        state.jumpVelocity = 0
      }
      if (state.actionTimer >= state.actionDuration) {
        state.action = 'idle'
        state.faceKey = 'FACE_IDLE'
        state.jumpY = 0
        state.nextActionAt = state.timer + 180 + Math.floor(Math.random() * 240)
      }
      break

    case 'look':
      // 看對方，停留後轉回
      if (state.actionTimer >= state.actionDuration) {
        state.action = 'idle'
        state.flipX = false
        state.faceKey = 'FACE_IDLE'
        state.nextActionAt = state.timer + 180 + Math.floor(Math.random() * 240)
      }
      break

    case 'nod':
      // 打瞌睡：前傾 → 彈回
      if (state.actionTimer < 90) {
        // 慢慢前傾
        state.nodAngle = Math.sin(state.actionTimer * 0.035) * 0.15
        if (state.actionTimer > 60) {
          state.faceKey = 'FACE_PAIN' // 快睡著
        }
      } else if (state.actionTimer === 90) {
        // 嚇醒！
        state.nodAngle = -0.08
        state.faceKey = 'FACE_SURPRISED'
      } else {
        // 恢復
        state.nodAngle *= 0.85
      }
      if (state.actionTimer >= state.actionDuration) {
        state.action = 'idle'
        state.nodAngle = 0
        state.faceKey = 'FACE_IDLE'
        state.nextActionAt = state.timer + 180 + Math.floor(Math.random() * 240)
      }
      break
  }
}

// === 外部觸發：選擇遊戲時兩隻一起跳，延遲後進入遊戲 ===
const REACTION_DELAY = 800 // ms，讓跳躍動畫播完再切換
let reactionTimeout = 0

function selectGameWithReaction(gameId: string): void {
  triggerAction(leftState, 'jump')
  triggerAction(rightState, 'jump')
  clearTimeout(reactionTimeout)
  reactionTimeout = globalThis.setTimeout(() => {
    emit('selectGame', gameId)
  }, REACTION_DELAY)
}

function drawMascot(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  state: MascotState,
  needFaceBackground: boolean,
  facingRight: boolean,
): void {
  const t = state.timer + state.phaseOffset
  const body = standardSprites['BODY']!
  const face = standardSprites[state.faceKey]!

  const bobOffset = Math.sin(t * 0.03) * 4 - state.jumpY
  const swayOffset = Math.sin(t * 0.02) * 2
  const scaleX = 1 + Math.sin(t * 0.04) * 0.03
  const scaleY = 1 - Math.sin(t * 0.04) * 0.03

  // 看對方時翻轉方向
  const dirFlip = state.flipX ? -1 : 1
  // 左邊角色預設朝右(1)，右邊角色預設朝左(-1)
  const baseDir = facingRight ? 1 : -1

  ctx.clearRect(0, 0, MASCOT_CANVAS_W, MASCOT_CANVAS_H)
  ctx.save()
  ctx.translate(MASCOT_CANVAS_W / 2 + swayOffset, MASCOT_CANVAS_H - 10 + bobOffset)
  ctx.rotate(state.nodAngle)
  ctx.scale(scaleX * baseDir * dirFlip, scaleY)

  // Face background（黑色底層，在 body 後面）
  const faceH = 135
  const faceW = faceH * (face.w / face.h)
  const faceX = -faceW / 2
  const faceY = -MASCOT_SIZE + 45
  if (needFaceBackground) {
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(0, faceY + faceH / 2, faceW * 0.48, faceH * 0.48, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Body
  ctx.drawImage(
    sheet,
    body.x, body.y, body.w, body.h,
    -MASCOT_SIZE / 2, -MASCOT_SIZE, MASCOT_SIZE, MASCOT_SIZE,
  )
  ctx.drawImage(
    sheet,
    face.x, face.y, face.w, face.h,
    faceX, faceY, faceW, faceH,
  )

  ctx.restore()
}

const leftState = createMascotState(0)
const rightState = createMascotState(100)

// 每 3 幀更新一次（約 20fps），降低 Chromecast v3 負擔
const MASCOT_FRAME_SKIP = 3
let mascotFrameCount = 0

function mascotLoop(): void {
  mascotAnimId = requestAnimationFrame(mascotLoop)
  mascotFrameCount++
  if (mascotFrameCount % MASCOT_FRAME_SKIP !== 0) return

  const sheets = characterSheets.value
  if (sheets.length < 2) return

  const leftCtx = mascotLeftRef.value?.getContext('2d')
  const rightCtx = mascotRightRef.value?.getContext('2d')

  if (leftCtx && sheets[0]) {
    updateMascotState(leftState)
    drawMascot(leftCtx, sheets[0], leftState, false, true)
  }
  if (rightCtx && sheets[1]) {
    updateMascotState(rightState)
    drawMascot(rightCtx, sheets[1], rightState, true, false)
  }
}

const emit = defineEmits<{
  selectGame: [gameId: string]
}>()

// === 選中狀態 ===
const selectedIndex = ref(0)

const selectedGame = computed(() => games[selectedIndex.value]!)

// === 卡片列偏移計算 ===
const CARD_WIDTH = 280
const CARD_GAP = 30
const CARD_STEP = CARD_WIDTH + CARD_GAP
const viewportWidth = ref(window.innerWidth)

const trackOffset = computed(() => {
  const center = viewportWidth.value / 2
  const cardCenter = CARD_WIDTH / 2
  return -(selectedIndex.value * CARD_STEP) + center - cardCenter
})

function onResize() {
  viewportWidth.value = window.innerWidth
}

// === 鍵盤控制 ===
function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowLeft':
      if (selectedIndex.value > 0) selectedIndex.value--
      break
    case 'ArrowRight':
      if (selectedIndex.value < games.length - 1) selectedIndex.value++
      break
    case 'Enter':
    case ' ': {
      const game = games[selectedIndex.value]!
      if (game.available) selectGameWithReaction(game.id)
      break
    }
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  globalThis.addEventListener('keydown', onKeydown)
  mascotAnimId = requestAnimationFrame(mascotLoop)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  globalThis.removeEventListener('keydown', onKeydown)
  cancelAnimationFrame(mascotAnimId)
  clearTimeout(reactionTimeout)
})

// === 旗幟垂墜曲線（兩段弧線，每段 8 面旗）===
function flagDroop(index: number): number {
  const half = 8
  const pos = index % half
  const mid = (half - 1) / 2
  const t = Math.abs(pos - mid) / mid
  return Math.round((1 - t * t) * 44)
}

// === 事件處理 ===
function handleCardClick(index: number) {
  if (index === selectedIndex.value) {
    const game = games[index]!
    if (game.available) selectGameWithReaction(game.id)
  } else {
    selectedIndex.value = index
  }
}

// === 暴露導航方法（供 App.vue 透過 ref 呼叫，用於 Cast 遙控）===
defineExpose({
  navigateLeft: () => {
    if (selectedIndex.value > 0) selectedIndex.value--
  },
  navigateRight: () => {
    if (selectedIndex.value < games.length - 1) selectedIndex.value++
  },
  getSelectedIndex: () => selectedIndex.value,
  getSelectedGameId: () => games[selectedIndex.value]?.id ?? null,
})
</script>

<style scoped>
.lobby-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  background-color: #4fb8e6;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent 0px, transparent 3px,
      rgba(0, 0, 0, 0.04) 3px, rgba(0, 0, 0, 0.04) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px, transparent 3px,
      rgba(0, 0, 0, 0.04) 3px, rgba(0, 0, 0, 0.04) 4px
    );
  position: relative;
  overflow: hidden;
}

/* === 像素雲 (用 box-shadow 拼像素) === */
.cloud {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  opacity: 0.8;
  /* 用 box-shadow 畫出雲朵形狀（每個 8x8 方塊） */
  box-shadow:
    8px 0 0 white,
    16px 0 0 white,
    24px 0 0 white,
    32px 0 0 white,
    -8px 8px 0 white,
    0px 8px 0 white,
    8px 8px 0 white,
    16px 8px 0 white,
    24px 8px 0 white,
    32px 8px 0 white,
    40px 8px 0 white,
    -8px 16px 0 white,
    0px 16px 0 white,
    8px 16px 0 white,
    16px 16px 0 white,
    24px 16px 0 white,
    32px 16px 0 white,
    40px 16px 0 white;
  animation: cloudDrift linear infinite;
}

.cloud-1 {
  top: 8%;
  left: -60px;
  animation-duration: 30s;
}

.cloud-2 {
  top: 18%;
  left: -60px;
  animation-duration: 45s;
  animation-delay: -15s;
  transform: scale(0.7);
  opacity: 0.5;
}

.cloud-3 {
  top: 12%;
  left: -60px;
  animation-duration: 35s;
  animation-delay: -25s;
  transform: scale(0.85);
  opacity: 0.6;
}

.cloud-4 {
  top: 22%;
  left: -60px;
  animation-duration: 50s;
  animation-delay: -35s;
  transform: scale(0.6);
  opacity: 0.45;
}

@keyframes cloudDrift {
  from { left: -80px; }
  to { left: 110%; }
}

/* === 像素太陽 === */
.sun {
  position: absolute;
  top: 20px;
  right: 50px;
  width: 16px;
  height: 16px;
  background: #FFE66D;
  z-index: 0;
  /* 5x5 核心（每塊 16px）*/
  box-shadow:
    16px 0 0 #FFE66D,
    32px 0 0 #FFE66D,
    48px 0 0 #FFE66D,
    64px 0 0 #FFE66D,
    -16px 16px 0 #FFE66D,
    0 16px 0 #FFE66D,
    16px 16px 0 #FFF176,
    32px 16px 0 #FFF176,
    48px 16px 0 #FFE66D,
    64px 16px 0 #FFE66D,
    80px 16px 0 #FFE66D,
    -16px 32px 0 #FFE66D,
    0 32px 0 #FFF176,
    16px 32px 0 #FFF9C4,
    32px 32px 0 #FFF9C4,
    48px 32px 0 #FFF176,
    64px 32px 0 #FFE66D,
    80px 32px 0 #FFE66D,
    -16px 48px 0 #FFE66D,
    0 48px 0 #FFE66D,
    16px 48px 0 #FFF176,
    32px 48px 0 #FFF176,
    48px 48px 0 #FFE66D,
    64px 48px 0 #FFE66D,
    80px 48px 0 #FFE66D,
    0 64px 0 #FFE66D,
    16px 64px 0 #FFE66D,
    32px 64px 0 #FFE66D,
    48px 64px 0 #FFE66D,
    64px 64px 0 #FFE66D;
  animation: sunPulse 3s ease-in-out infinite;
}

/* 旋轉光芒（獨立元素，可以旋轉而不影響核心）*/
.sun-rays {
  position: absolute;
  top: 40px;
  left: 40px;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  /* 八方向光芒（從核心邊緣 64px 開始，避免吃到中心）*/
  box-shadow:
    /* 上 */
    0 -64px 0 #FFD93D,
    0 -80px 0 #FFD93D,
    0 -96px 0 #FFECB3,
    /* 下 */
    0 64px 0 #FFD93D,
    0 80px 0 #FFD93D,
    0 96px 0 #FFECB3,
    /* 左 */
    -64px 0 0 #FFD93D,
    -80px 0 0 #FFD93D,
    -96px 0 0 #FFECB3,
    /* 右 */
    64px 0 0 #FFD93D,
    80px 0 0 #FFD93D,
    96px 0 0 #FFECB3,
    /* 左上 */
    -48px -48px 0 #FFD93D,
    -64px -64px 0 #FFD93D,
    -80px -80px 0 #FFECB3,
    /* 右上 */
    48px -48px 0 #FFD93D,
    64px -64px 0 #FFD93D,
    80px -80px 0 #FFECB3,
    /* 左下 */
    -48px 48px 0 #FFD93D,
    -64px 64px 0 #FFD93D,
    -80px 80px 0 #FFECB3,
    /* 右下 */
    48px 48px 0 #FFD93D,
    64px 64px 0 #FFD93D,
    80px 80px 0 #FFECB3;
  animation: sunRaysRotate 12s linear infinite;
}

@keyframes sunPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

@keyframes sunRaysRotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* === 閃爍星星 === */
.sparkle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  z-index: 1;
  box-shadow:
    -4px 0 0 white,
    4px 0 0 white,
    0 -4px 0 white,
    0 4px 0 white;
  animation: sparkleBlink ease-in-out infinite;
}

.sparkle-1 { top: 15%; left: 10%; animation-duration: 1.5s; }
.sparkle-2 { top: 8%; left: 35%; animation-duration: 2s; animation-delay: 0.3s; }
.sparkle-3 { top: 20%; right: 15%; animation-duration: 1.8s; animation-delay: 0.7s; }
.sparkle-4 { top: 5%; right: 30%; animation-duration: 2.2s; animation-delay: 1s; }
.sparkle-5 { top: 25%; left: 55%; animation-duration: 1.6s; animation-delay: 0.5s; }

@keyframes sparkleBlink {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1); }
}

/* === 三角旗幟（像素風） === */
.bunting {
  display: flex;
  gap: 4px;
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  justify-content: center;
  align-items: flex-start;
  z-index: 1;
  padding-top: 6px;
}

.flag {
  display: inline-block;
  width: 60px;
  height: 60px;
  position: relative;
  transform-origin: top center;
}

/* 繩結（旗幟頂端的棕色小方塊）*/
.flag::before {
  content: '';
  position: absolute;
  top: -12px;
  left: 24px;
  width: 12px;
  height: 12px;
  background: #6D4C41;
}

.flag:nth-child(odd) {
  animation: flagSwingA 3s ease-in-out infinite;
}

.flag:nth-child(even) {
  animation: flagSwingB 3s ease-in-out infinite;
}

/* 用 box-shadow 拼出像素三角形（12px 方塊）*/
.flag::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  background: currentColor;
  box-shadow:
    /* Row 0: 5 blocks */
    12px 0 0 currentColor,
    24px 0 0 currentColor,
    36px 0 0 currentColor,
    48px 0 0 currentColor,
    /* Row 1: 5 blocks */
    0 12px 0 currentColor,
    12px 12px 0 currentColor,
    24px 12px 0 currentColor,
    36px 12px 0 currentColor,
    48px 12px 0 currentColor,
    /* Row 2: 3 blocks */
    12px 24px 0 currentColor,
    24px 24px 0 currentColor,
    36px 24px 0 currentColor,
    /* Row 3: 3 blocks */
    12px 36px 0 currentColor,
    24px 36px 0 currentColor,
    36px 36px 0 currentColor,
    /* Row 4: 1 block (tip) */
    24px 48px 0 currentColor;
}

.flag-1 { color: #FF6B6B; }
.flag-2 { color: #FFE66D; }
.flag-3 { color: #4ECDC4; }
.flag-4 { color: #95E86B; }

@keyframes flagSwingA {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes flagSwingB {
  0%, 100% { transform: rotate(3deg); }
  50% { transform: rotate(-3deg); }
}

/* === 角色吉祥物 === */
.mascot {
  position: absolute;
  bottom: 40px;
  z-index: 2;
  pointer-events: none;
}

.mascot-left {
  left: 5%;
}

.mascot-right {
  right: 5%;
}

/* === 草地 === */
.ground {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: #5cb85c;
  border-top: 4px solid #4a9e4a;
  box-shadow: inset 0 4px 0 0 #6ec96e;
  z-index: 1;
}

/* === 標題 === */
.lobby-header {
  margin-bottom: 16px;
  text-align: center;
  z-index: 2;
}

.lobby-title {
  font-size: 40px;
  color: white;
  text-shadow:
    3px 3px 0 #e94560,
    -1px -1px 0 #e94560,
    1px -1px 0 #e94560,
    -1px 1px 0 #e94560;
  animation: titleBounce 3s ease-in-out infinite;
}

.lobby-subtitle {
  font-size: 20px;
  color: #ff6b6b;
  margin-top: 8px;
  letter-spacing: 6px;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.15);
}

@keyframes titleBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* === 選擇提示 === */
.lobby-hint {
  font-size: 18px;
  color: #1a5276;
  margin-bottom: 28px;
  letter-spacing: 4px;
  animation: hintBlink 2s ease-in-out infinite;
  z-index: 2;
}

@keyframes hintBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* === 卡片列區域 === */
.carousel-viewport {
  width: 100%;
  overflow: hidden;
  padding: 24px 0;
  position: relative;
  z-index: 2;
}

.carousel-track {
  display: flex;
  gap: 30px;
  align-items: center;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}

/* === 左右箭頭 === */
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 42px;
  color: white;
  cursor: pointer;
  z-index: 10;
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
  transition: opacity 0.2s, transform 0.15s;
  user-select: none;
}

.arrow:hover {
  transform: translateY(-50%) scale(1.2);
}

.arrow:active {
  transform: translateY(-50%) scale(0.9);
}

.arrow-left { left: 24px; }
.arrow-right { right: 24px; }

.arrow.hidden {
  opacity: 0;
  pointer-events: none;
}

/* === 資訊面板 === */
.info-panel {
  text-align: center;
  margin-top: 20px;
  animation: infoFadeIn 0.3s ease-out;
  z-index: 2;
}

@keyframes infoFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.info-name {
  font-size: 28px;
  color: white;
  margin-bottom: 16px;
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.15);
}

.info-desc {
  font-size: 16px;
  color: #1a5276;
  margin-bottom: 18px;
  letter-spacing: 1px;
}

.info-type {
  margin-bottom: 24px;
}

.type-badge {
  font-size: 14px;
  color: white;
  background: #1a5276;
  border: 3px solid #0d3b5e;
  padding: 6px 20px;
  letter-spacing: 3px;
  box-shadow: 0 3px 0 #0d3b5e;
}

/* === PLAY 按鈕 === */
.play-btn {
  font-family: 'Press Start 2P', cursive;
  font-size: 22px;
  color: white;
  background: #4caf50;
  border: 5px solid #388e3c;
  padding: 16px 48px;
  cursor: pointer;
  letter-spacing: 3px;
  box-shadow: 0 6px 0 #2e7d32;
  transition: transform 0.1s;
  animation: playBounce 1.5s ease-in-out infinite;
}

.play-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 0 #2e7d32;
}

.play-btn:active {
  transform: translateY(3px);
  box-shadow: 0 3px 0 #2e7d32;
}

@keyframes playBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* === COMING SOON === */
.coming-soon {
  font-size: 18px;
  color: #0e1a24;
  letter-spacing: 3px;
  padding: 12px 0;
}
</style>
