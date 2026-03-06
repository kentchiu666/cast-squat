<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { uiState as state } from './ui-state'
import { YOUTUBE_VIDEO_ID } from './constants'

// === YouTube Player ===
let player: YTPlayer | null = null
let apiLoaded = false

function loadYouTubeAPI(): void {
  if (apiLoaded || document.getElementById('yt-iframe-api')) return

  const tag = document.createElement('script')
  tag.id = 'yt-iframe-api'
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
  apiLoaded = true
}

function createPlayer(): void {
  if (player) return

  const YT = (globalThis as Record<string, unknown>).YT as YTNamespace | undefined
  if (!YT?.Player) return

  player = new YT.Player('run-youtube-player', {
    height: '100%',
    width: '100%',
    videoId: YOUTUBE_VIDEO_ID,
    playerVars: {
      controls: 0,
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      fs: 0,
      playsinline: 1,
    },
    events: {
      onReady: () => {
        state.videoReady = true
      },
      onStateChange: (event: { data: number }) => {
        // YT.PlayerState.ENDED = 0
        if (event.data === 0) {
          state.onVideoEnded?.()
        }
      },
      onError: (event: { data: number }) => {
        console.warn('[VirtualRun] YouTube error:', event.data)
      },
    },
  })
}

// 監聽 videoCommand 控制播放
watch(
  () => state.videoCommand,
  (cmd) => {
    if (!player || !cmd) return
    switch (cmd) {
      case 'play':
        player.playVideo()
        break
      case 'pause':
        player.pauseVideo()
        break
      case 'stop':
        player.stopVideo()
        break
    }
    state.videoCommand = null
  },
)

// === Computed ===
const formattedDistance = computed(() => {
  return Math.floor(state.distance)
})

const formattedTime = computed(() => {
  const mins = Math.floor(state.elapsedTime / 60)
  const secs = Math.floor(state.elapsedTime % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const formattedFinalTime = computed(() => {
  const mins = Math.floor(state.finalTime / 60)
  const secs = Math.floor(state.finalTime % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

// === Lifecycle ===
onMounted(() => {
  loadYouTubeAPI()

  // YouTube API ready callback
  const existingCallback = (globalThis as Record<string, unknown>).onYouTubeIframeAPIReady as (() => void) | undefined
  ;(globalThis as Record<string, unknown>).onYouTubeIframeAPIReady = () => {
    existingCallback?.()
    createPlayer()
  }

  // 如果 API 已經載入過（re-enter game），直接建立 player
  const YT = (globalThis as Record<string, unknown>).YT as YTNamespace | undefined
  if (YT?.Player) {
    createPlayer()
  }
})

onUnmounted(() => {
  if (player) {
    player.destroy()
    player = null
  }
  ;(globalThis as Record<string, unknown>).onYouTubeIframeAPIReady = undefined
})

// === YouTube API 型別（元件內部使用）===
interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  destroy(): void
  getCurrentTime(): number
  getDuration(): number
}

interface YTNamespace {
  Player: new (elementId: string, options: Record<string, unknown>) => YTPlayer
}
</script>

<template>
  <div class="run-overlay">
    <!-- START_SCREEN -->
    <div v-show="state.gameState === 'START_SCREEN'" class="run-start-screen">
      <div class="run-title">VIRTUAL RUN</div>
      <div class="run-subtitle">Dolomites, Italy</div>
      <div class="run-hint">
        HOLD YOUR PHONE<br />AND SWING YOUR ARMS!
      </div>
      <div class="run-hint-sub">(Or click RUN to simulate)</div>
    </div>

    <!-- YouTube Player -->
    <div
      v-show="state.gameState === 'PLAYING' || state.gameState === 'GAME_OVER'"
      class="run-youtube-container"
    >
      <div id="run-youtube-player"></div>
    </div>

    <!-- 底部距離 bar -->
    <div v-show="state.gameState === 'PLAYING'" class="run-bottom-bar">
      <span class="run-distance">{{ formattedDistance }}m</span>
      <span class="run-time">{{ formattedTime }}</span>
    </div>

    <!-- GAME_OVER overlay -->
    <div v-show="state.gameState === 'GAME_OVER'" class="run-game-over">
      <div class="run-game-over-title">FINISHED!</div>
      <div class="run-final-distance">{{ state.finalDistance.toFixed(0) }}m</div>
      <div class="run-final-stats">
        {{ state.finalSteps }} STEPS &middot; {{ formattedFinalTime }}
      </div>
    </div>

    <!-- 操作按鈕 -->
    <button class="run-action-btn" @click="state.onAction?.()">
      {{ state.actionButtonText }}
    </button>
  </div>
</template>

<style scoped>
.run-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: 'Press Start 2P', cursive;
  color: #fff;
}

/* === START_SCREEN === */
.run-start-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.04vw;
  background: linear-gradient(180deg, #0a2e1a 0%, #1a4a2e 50%, #0a1628 100%);
}

.run-title {
  font-size: 2.5vw;
  color: #95e86b;
  text-shadow: 0.21vw 0.21vw 0 #1a4a2e;
}

.run-subtitle {
  font-size: 0.83vw;
  color: #4ecdc4;
}

.run-hint {
  font-size: 0.73vw;
  color: #ffe66d;
  text-align: center;
  line-height: 1.8;
  margin-top: 1.04vw;
}

.run-hint-sub {
  font-size: 0.52vw;
  color: #888;
}

/* === YouTube === */
.run-youtube-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.run-youtube-container :deep(iframe) {
  width: 100%;
  height: 100%;
  border: none;
}

/* === 底部距離 bar === */
.run-bottom-bar {
  position: absolute;
  bottom: 4.17vw;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.63vw 1.25vw;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2;
  box-sizing: border-box;
}

.run-distance {
  font-size: 1.46vw;
  color: #95e86b;
  text-shadow: 0.1vw 0.1vw 0 #000;
}

.run-time {
  font-size: 1.04vw;
  color: #fff;
  text-shadow: 0.1vw 0.1vw 0 #000;
}

/* === GAME_OVER === */
.run-game-over {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.83vw;
  background: rgba(0, 0, 0, 0.7);
  z-index: 3;
}

.run-game-over-title {
  font-size: 2.5vw;
  color: #ffe66d;
  text-shadow: 0.21vw 0.21vw 0 #000;
}

.run-final-distance {
  font-size: 3.33vw;
  color: #95e86b;
  text-shadow: 0.21vw 0.21vw 0 #000;
}

.run-final-stats {
  font-size: 0.73vw;
  color: #ccc;
}

/* === 操作按鈕 === */
.run-action-btn {
  position: absolute;
  bottom: 1.04vw;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Press Start 2P', cursive;
  font-size: 0.83vw;
  padding: 0.63vw 1.67vw;
  background: #95e86b;
  color: #000;
  border: 0.21vw solid #6ab848;
  cursor: pointer;
  pointer-events: auto;
  z-index: 10;
  text-transform: uppercase;
}

.run-action-btn:hover {
  background: #b0ff80;
}

.run-action-btn:active {
  transform: translateX(-50%) scale(0.95);
}
</style>
