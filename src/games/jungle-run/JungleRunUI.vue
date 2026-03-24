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
  <div class="jungle-overlay">
    <!-- START_SCREEN -->
    <div v-show="state.gameState === 'START_SCREEN'" class="jungle-start-screen">
      <div class="jungle-title">JUNGLE RUN</div>
      <div class="jungle-subtitle">Pixel Forest Trail</div>
      <div class="jungle-hint">
        HOLD YOUR PHONE<br />AND START RUNNING!
      </div>
      <div class="jungle-hint-sub">(Or click buttons to simulate)</div>
    </div>

    <!-- HUD（遊戲中）-->
    <div v-show="state.gameState === 'PLAYING'" class="jungle-hud">
      <div class="jungle-hud-left">
        <span class="jungle-distance">{{ formattedDistance }}m</span>
        <span class="jungle-lap">LAP {{ state.lap }} - {{ formattedLapProgress }}%</span>
      </div>
      <div class="jungle-hud-right">
        <span class="jungle-time">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- GAME_OVER -->
    <div v-show="state.gameState === 'GAME_OVER'" class="jungle-game-over">
      <div class="jungle-game-over-title">FINISHED!</div>
      <div class="jungle-final-distance">{{ state.finalDistance.toFixed(0) }}m</div>
      <div class="jungle-final-stats">
        {{ state.finalSteps }} STEPS &middot; {{ formattedFinalTime }}
      </div>
    </div>

    <!-- 操作按鈕 -->
    <button class="jungle-action-btn" @click="state.onAction?.()">
      {{ state.actionButtonText }}
    </button>
  </div>
</template>

<style scoped>
.jungle-overlay {
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
.jungle-start-screen {
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
  background: linear-gradient(180deg, #1a0a2e 0%, #0d3320 50%, #0a1628 100%);
}

.jungle-title {
  font-size: 2.5vw;
  color: #95e86b;
  text-shadow: 0.21vw 0.21vw 0 #1a4a2e;
}

.jungle-subtitle {
  font-size: 0.83vw;
  color: #4ecdc4;
}

.jungle-hint {
  font-size: 0.73vw;
  color: #ffe66d;
  text-align: center;
  line-height: 1.8;
  margin-top: 1.04vw;
}

.jungle-hint-sub {
  font-size: 0.52vw;
  color: #888;
}

/* === HUD === */
.jungle-hud {
  position: absolute;
  top: 1.04vw;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 1.25vw;
  box-sizing: border-box;
  z-index: 2;
}

.jungle-hud-left {
  display: flex;
  flex-direction: column;
  gap: 0.42vw;
}

.jungle-distance {
  font-size: 1.46vw;
  color: #95e86b;
  text-shadow: 0.1vw 0.1vw 0 #000;
}

.jungle-lap {
  font-size: 0.73vw;
  color: #ffe66d;
  text-shadow: 0.1vw 0.1vw 0 #000;
}

.jungle-time {
  font-size: 1.04vw;
  color: #fff;
  text-shadow: 0.1vw 0.1vw 0 #000;
}

/* === GAME_OVER === */
.jungle-game-over {
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

.jungle-game-over-title {
  font-size: 2.5vw;
  color: #ffe66d;
  text-shadow: 0.21vw 0.21vw 0 #000;
}

.jungle-final-distance {
  font-size: 3.33vw;
  color: #95e86b;
  text-shadow: 0.21vw 0.21vw 0 #000;
}

.jungle-final-stats {
  font-size: 0.73vw;
  color: #ccc;
}

/* === 操作按鈕 === */
.jungle-action-btn {
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

.jungle-action-btn:hover {
  background: #b0ff80;
}

.jungle-action-btn:active {
  transform: translateX(-50%) scale(0.95);
}
</style>
