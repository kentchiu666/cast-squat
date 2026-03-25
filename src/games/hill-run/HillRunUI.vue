<script setup lang="ts">
import { computed } from 'vue'
import { uiState as state } from './ui-state'

const formattedDistance = computed(() => Math.floor(state.distance))
const formattedLapProgress = computed(() => Math.floor(state.lapProgress * 100))

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
</script>

<template>
  <div class="hill-overlay">
    <!-- WebGL 不支援 -->
    <div v-if="state.webglFailed" class="hill-webgl-error">
      <div class="hill-title" style="color: #ff6b6b">WEBGL ERROR</div>
      <div class="hill-subtitle">This device does not support WebGL.</div>
      <div class="hill-hint">Hill Run requires a WebGL-capable device.<br/>Please try a different game.</div>
    </div>

    <!-- START_SCREEN -->
    <div v-show="!state.webglFailed && state.gameState === 'START_SCREEN'" class="hill-start-screen">
      <div class="hill-title">HILL RUN</div>
      <div class="hill-subtitle">3D Trail Adventure</div>
      <div class="hill-hint">
        HOLD YOUR PHONE<br />AND START RUNNING!
      </div>
    </div>

    <!-- HUD（遊戲中）-->
    <div v-show="state.gameState === 'PLAYING'" class="hill-hud">
      <div class="hill-hud-left">
        <span class="hill-distance">{{ formattedDistance }}m</span>
        <span class="hill-lap">LAP {{ state.lap }} - {{ formattedLapProgress }}%</span>
      </div>
      <div class="hill-hud-right">
        <span class="hill-time">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- GAME_OVER -->
    <div v-show="state.gameState === 'GAME_OVER'" class="hill-game-over">
      <div class="hill-game-over-title">FINISHED!</div>
      <div class="hill-final-distance">{{ state.finalDistance.toFixed(0) }}m</div>
      <div class="hill-final-stats">
        {{ state.finalSteps }} STEPS &middot; {{ formattedFinalTime }}
      </div>
    </div>

    <!-- 操作按鈕 -->
    <button class="hill-action-btn" @click="state.onAction?.()">
      {{ state.actionButtonText }}
    </button>
  </div>
</template>

<style scoped>
.hill-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: 'Press Start 2P', cursive;
  color: #fff;
  z-index: 10;
}

/* WebGL Error */
.hill-webgl-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  padding: 3vw 5vw;
  border: max(1px, 0.15vw) solid #ff6b6b;
}

/* START_SCREEN */
.hill-start-screen {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.hill-title {
  font-size: 3vw;
  color: #6BCB77;
  text-shadow: 0.2vw 0.2vw 0 #000;
  margin-bottom: 1vw;
}
.hill-subtitle {
  font-size: 1vw;
  color: #aaa;
  margin-bottom: 2vw;
}
.hill-hint {
  font-size: 0.8vw;
  color: #ccc;
  line-height: 1.8;
}

/* HUD */
.hill-hud {
  position: absolute;
  top: 1.5vw;
  left: 1.5vw;
  right: 1.5vw;
  display: flex;
  justify-content: space-between;
}
.hill-hud-left, .hill-hud-right {
  display: flex;
  flex-direction: column;
  gap: 0.3vw;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5vw 1vw;
  border: max(1px, 0.1vw) solid rgba(255, 255, 255, 0.3);
}
.hill-distance {
  font-size: 1.2vw;
  color: #6BCB77;
}
.hill-lap {
  font-size: 0.5vw;
  color: #aaa;
}
.hill-time {
  font-size: 1vw;
}

/* GAME_OVER */
.hill-game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 3vw 5vw;
  border: max(1px, 0.15vw) solid #6BCB77;
}
.hill-game-over-title {
  font-size: 2.5vw;
  color: #6BCB77;
  margin-bottom: 1vw;
}
.hill-final-distance {
  font-size: 2vw;
  margin-bottom: 0.8vw;
}
.hill-final-stats {
  font-size: 0.7vw;
  color: #aaa;
}

/* 操作按鈕 */
.hill-action-btn {
  position: absolute;
  bottom: 3vw;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Press Start 2P', cursive;
  font-size: 1vw;
  color: #fff;
  background: #6BCB77;
  border: max(1px, 0.15vw) solid #fff;
  padding: 1vw 3vw;
  cursor: pointer;
  pointer-events: auto;
  text-shadow: 0.1vw 0.1vw 0 rgba(0,0,0,0.3);
}
.hill-action-btn:hover {
  background: #5ab866;
}
.hill-action-btn:active {
  transform: translateX(-50%) scale(0.95);
}
</style>
