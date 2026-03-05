<template>
  <div class="shake-overlay">
    <!-- 開始畫面 -->
    <div v-show="state.gameState === 'START_SCREEN'" class="shake-start-screen">
      <div class="shake-title">Shake It!</div>
      <div class="shake-player-count">{{ state.players.length }}/{{ state.maxPlayers }} Players</div>
      <div class="shake-player-list">
        <div v-for="p in state.players" :key="p.id" class="shake-player-entry">
          <div class="shake-player-color-box" :style="{ background: getColor(p.colorIndex) }" />
          <span class="shake-player-name-text" :style="{ color: getColor(p.colorIndex) }">{{ p.name }}</span>
        </div>
      </div>
      <div v-if="state.players.length === 0" class="shake-waiting-msg">
        WAITING FOR PLAYERS...<br>
        <span class="shake-sub">(Or click START for single player)</span>
      </div>
      <div v-if="state.players.length > 0" class="shake-start-hint">CLICK TO START</div>
    </div>

    <!-- 倒數動畫 -->
    <Transition name="shake-countdown-pop" appear>
      <div
        v-if="state.countdownText"
        :key="state.countdownKey"
        class="shake-countdown-num"
        :style="{ color: state.countdownColor, fontSize: state.countdownFontSize }"
      >
        {{ state.countdownText }}
      </div>
    </Transition>

    <!-- 計時器（盲玩大字）-->
    <div v-if="state.gameState === 'PLAYING'" class="shake-timer-ui">
      {{ state.timer }}
    </div>

    <!-- 等待結果畫面 -->
    <div v-show="state.gameState === 'RESULT_PENDING'" class="shake-result-pending">
      <div class="shake-result-pending-title">COLLECTING RESULTS...</div>
      <div class="shake-result-player-list">
        <div v-for="p in state.players" :key="p.id" class="shake-result-entry">
          <span class="shake-result-status" :class="{ 'shake-result-done': p.hasSubmitted }">
            {{ p.hasSubmitted ? '✓' : '...' }}
          </span>
          <span class="shake-result-name" :style="{ color: getColor(p.colorIndex) }">{{ p.name }}</span>
        </div>
      </div>
      <div class="shake-result-countdown">{{ state.resultCountdown }}</div>
    </div>

    <!-- 遊戲結束畫面 -->
    <div v-show="state.gameState === 'GAME_OVER'" class="shake-game-over-screen">
      <div class="shake-title">GAME OVER!</div>
      <div class="shake-game-over-content">
        <!-- 多人排行榜 -->
        <template v-if="state.isMultiplayer">
          <div class="shake-leaderboard-title">LEADERBOARD</div>
          <div v-for="(p, rank) in state.leaderboard" :key="p.id" class="shake-leaderboard-entry">
            <span class="shake-rank-medal" :style="{ color: rankColors[rank] }">{{ medals[rank] }}</span>
            <div class="shake-player-color-box" :style="{ background: getColor(p.colorIndex) }" />
            <span class="shake-lb-name" :style="{ color: getColor(p.colorIndex) }">{{ p.name }}</span>
            <span class="shake-lb-score">{{ p.score }}</span>
          </div>
        </template>
        <!-- 單人結果 -->
        <template v-else>
          <div class="shake-single-result">TOTAL SHAKES: {{ state.finalScore }}</div>
        </template>
      </div>
    </div>

    <!-- 操作按鈕 -->
    <button class="shake-action-btn" @click="state.onAction?.()">{{ state.actionButtonText }}</button>
  </div>
</template>

<script setup lang="ts">
import { uiState as state } from './ui-state'
import { PLAYER_COLORS } from './constants'

const medals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#888', '#888', '#888', '#888']

function getColor(colorIndex: number): string {
  return PLAYER_COLORS[colorIndex]?.hex ?? '#FFF'
}
</script>

<style scoped>
.shake-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: 'Press Start 2P', cursive;
}

.shake-start-screen {
  width: 100%;
  text-align: center;
  padding-top: 60px;
}

.shake-title {
  font-size: 48px;
  color: white;
  font-family: 'Press Start 2P', cursive;
}

.shake-player-count {
  font-size: 20px;
  color: #888;
  margin-top: 20px;
  font-family: 'Press Start 2P', cursive;
}

.shake-player-list {
  margin-top: 30px;
}

.shake-player-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
}

.shake-player-color-box {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.shake-player-name-text {
  font-size: 16px;
  font-family: 'Press Start 2P', cursive;
}

.shake-waiting-msg {
  margin-top: 40px;
  font-size: 18px;
  color: #888;
  line-height: 2;
  font-family: 'Press Start 2P', cursive;
}

.shake-sub {
  font-size: 14px;
  display: block;
  margin-top: 10px;
}

.shake-start-hint {
  position: absolute;
  bottom: 120px;
  width: 100%;
  text-align: center;
  font-size: 18px;
  color: #4ECDC4;
  font-family: 'Press Start 2P', cursive;
}

/* 倒數 */
.shake-countdown-num {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 120px;
  font-family: 'Press Start 2P', cursive;
  z-index: 10;
}

.shake-countdown-pop-enter-active {
  animation: shakeCountdownPop 1s ease-out forwards;
}

@keyframes shakeCountdownPop {
  0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
  60% { transform: translate(-50%, -50%) scale(0.97); opacity: 1; }
  75% { transform: translate(-50%, -50%) scale(1.02); opacity: 1; }
  85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}

/* 計時器（盲玩大字置中）*/
.shake-timer-ui {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.3);
  font-size: 160px;
  font-family: 'Press Start 2P', cursive;
  z-index: 1;
}

/* 等待結果畫面 */
.shake-result-pending {
  width: 100%;
  text-align: center;
  padding-top: 80px;
}

.shake-result-pending-title {
  font-size: 24px;
  color: #4ECDC4;
  font-family: 'Press Start 2P', cursive;
  animation: shakePulse 1.5s ease-in-out infinite;
}

@keyframes shakePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.shake-result-player-list {
  margin-top: 40px;
}

.shake-result-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 12px 0;
  font-family: 'Press Start 2P', cursive;
}

.shake-result-status {
  width: 40px;
  font-size: 20px;
  color: #888;
}

.shake-result-status.shake-result-done {
  color: #95E86B;
}

.shake-result-name {
  font-size: 16px;
}

.shake-result-countdown {
  margin-top: 30px;
  font-size: 14px;
  color: #888;
  font-family: 'Press Start 2P', cursive;
}

/* 操作按鈕 */
.shake-action-btn {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 20px 40px;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
  background-color: #4ECDC4;
  color: white;
  border: none;
  cursor: pointer;
  image-rendering: pixelated;
  z-index: 20;
  pointer-events: auto;
}

.shake-action-btn:hover {
  background-color: #6EE7DE;
}

.shake-action-btn:active {
  transform: translateX(-50%) scale(0.95);
}

/* 遊戲結束 */
.shake-game-over-screen {
  width: 100%;
  text-align: center;
  padding-top: 60px;
}

.shake-game-over-content {
  margin-top: 40px;
}

.shake-leaderboard-title {
  font-size: 24px;
  color: white;
  margin-bottom: 30px;
  font-family: 'Press Start 2P', cursive;
}

.shake-leaderboard-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 12px 0;
  font-size: 16px;
  font-family: 'Press Start 2P', cursive;
}

.shake-rank-medal {
  width: 60px;
  text-align: right;
}

.shake-lb-name {
  width: 120px;
  text-align: left;
}

.shake-lb-score {
  width: 60px;
  text-align: right;
  color: white;
}

.shake-single-result {
  font-size: 32px;
  color: white;
  margin-top: 60px;
  font-family: 'Press Start 2P', cursive;
}
</style>
