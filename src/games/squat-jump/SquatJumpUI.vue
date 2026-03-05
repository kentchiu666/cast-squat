<template>
  <div class="squat-overlay">
    <!-- 開始畫面 -->
    <div v-show="state.gameState === 'START_SCREEN'" class="squat-start-screen">
      <div class="squat-title">Squat Jump</div>
      <div class="squat-player-count">{{ state.players.length }}/{{ state.maxPlayers }} Players</div>
      <div class="squat-player-list">
        <div v-for="p in state.players" :key="p.id" class="squat-player-entry">
          <div class="squat-player-color-box" :style="{ background: getColor(p.colorIndex) }" />
          <span class="squat-player-name-text" :style="{ color: getColor(p.colorIndex) }">{{ p.name }}</span>
        </div>
      </div>
      <div v-if="state.players.length === 0" class="squat-waiting-msg">
        WAITING FOR PLAYERS...<br>
        <span class="squat-sub">(Or click START for single player)</span>
      </div>
      <div v-if="state.players.length > 0" class="squat-start-hint">CLICK TO START</div>
    </div>

    <!-- 倒數動畫 -->
    <Transition name="squat-countdown-pop" appear>
      <div
        v-if="state.countdownText"
        :key="state.countdownKey"
        class="squat-countdown-num"
        :style="{ color: state.countdownColor, fontSize: state.countdownFontSize }"
      >
        {{ state.countdownText }}
      </div>
    </Transition>

    <!-- 多人分數欄 -->
    <div v-if="state.gameState === 'PLAYING' && state.isMultiplayer" class="squat-score-bar">
      <div v-for="p in state.players" :key="p.id" class="squat-score-entry">
        <div class="squat-sname" :style="{ color: getColor(p.colorIndex) }">{{ p.name }}</div>
        <div class="squat-svalue">{{ p.squatCount + p.coinScore }}</div>
      </div>
    </div>

    <!-- 單人分數 -->
    <div v-if="state.gameState === 'PLAYING' && !state.isMultiplayer" class="squat-ui">
      SQUATS: {{ state.squatCount }} | COINS: {{ state.coinScore }}
    </div>

    <!-- 計時器 -->
    <div v-if="state.gameState === 'PLAYING'" class="squat-timer-ui">
      TIME: {{ state.timer }}
    </div>

    <!-- 遊戲結束畫面 -->
    <div v-show="state.gameState === 'GAME_OVER'" class="squat-game-over-screen">
      <div class="squat-title">GAME OVER!</div>
      <div class="squat-game-over-content">
        <!-- 多人排行榜 -->
        <template v-if="state.isMultiplayer">
          <div class="squat-leaderboard-title">LEADERBOARD</div>
          <div v-for="(p, rank) in state.leaderboard" :key="p.id" class="squat-leaderboard-entry">
            <span class="squat-rank-medal" :style="{ color: rankColors[rank] }">{{ medals[rank] }}</span>
            <div class="squat-player-color-box" :style="{ background: getColor(p.colorIndex) }" />
            <span class="squat-lb-name" :style="{ color: getColor(p.colorIndex) }">{{ p.name }}</span>
            <span class="squat-lb-score">{{ p.squatCount + p.coinScore }}</span>
          </div>
        </template>
        <!-- 單人結果 -->
        <template v-else>
          <div class="squat-single-result">TOTAL: {{ state.finalScore + state.coinScore }}</div>
          <div class="squat-single-detail">Squats: {{ state.finalScore }} + Coins: {{ state.coinScore }}</div>
        </template>
      </div>
    </div>

    <!-- 操作按鈕 -->
    <button class="squat-action-btn" @click="state.onAction?.()">{{ state.actionButtonText }}</button>
  </div>
</template>

<script setup lang="ts">
import { uiState as state } from './ui-state'
import { PLAYER_COLORS } from './constants'

const medals = ['1st', '2nd', '3rd', '4th']
const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888']

function getColor(colorIndex: number): string {
  return PLAYER_COLORS[colorIndex]?.hex ?? '#FFF'
}
</script>

<style scoped>
.squat-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: 'Press Start 2P', cursive;
}

.squat-start-screen {
  width: 100%;
  text-align: center;
  padding-top: 60px;
}

.squat-title {
  font-size: 48px;
  color: white;
  font-family: 'Press Start 2P', cursive;
}

.squat-player-count {
  font-size: 20px;
  color: #888;
  margin-top: 20px;
  font-family: 'Press Start 2P', cursive;
}

.squat-player-list {
  margin-top: 30px;
}

.squat-player-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
}

.squat-player-color-box {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.squat-player-name-text {
  font-size: 16px;
  font-family: 'Press Start 2P', cursive;
}

.squat-waiting-msg {
  margin-top: 40px;
  font-size: 18px;
  color: #888;
  line-height: 2;
  font-family: 'Press Start 2P', cursive;
}

.squat-sub {
  font-size: 14px;
  display: block;
  margin-top: 10px;
}

.squat-start-hint {
  position: absolute;
  bottom: 120px;
  width: 100%;
  text-align: center;
  font-size: 18px;
  color: #95E86B;
  font-family: 'Press Start 2P', cursive;
}

/* 倒數 */
.squat-countdown-num {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 120px;
  font-family: 'Press Start 2P', cursive;
  z-index: 10;
}

.squat-countdown-pop-enter-active {
  animation: squatCountdownPop 1s ease-out forwards;
}

@keyframes squatCountdownPop {
  0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
  60% { transform: translate(-50%, -50%) scale(0.97); opacity: 1; }
  75% { transform: translate(-50%, -50%) scale(1.02); opacity: 1; }
  85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}

/* 多人分數 */
.squat-score-bar {
  position: absolute;
  top: 10px;
  left: 0;
  width: 100%;
  text-align: center;
  font-family: 'Press Start 2P', cursive;
}

.squat-score-entry {
  display: inline-block;
  margin: 0 20px;
  text-align: center;
}

.squat-sname {
  font-size: 14px;
}

.squat-svalue {
  font-size: 14px;
  color: white;
  margin-top: 5px;
}

/* 單人 UI */
.squat-ui {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
}

.squat-timer-ui {
  position: absolute;
  top: 20px;
  right: 20px;
  color: white;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
}

/* 操作按鈕 */
.squat-action-btn {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 20px 40px;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
  background-color: #e94560;
  color: white;
  border: none;
  cursor: pointer;
  image-rendering: pixelated;
  z-index: 20;
  pointer-events: auto;
}

.squat-action-btn:hover {
  background-color: #ff6b6b;
}

.squat-action-btn:active {
  transform: translateX(-50%) scale(0.95);
}

/* 遊戲結束 */
.squat-game-over-screen {
  width: 100%;
  text-align: center;
  padding-top: 60px;
}

.squat-game-over-content {
  margin-top: 40px;
}

.squat-leaderboard-title {
  font-size: 24px;
  color: white;
  margin-bottom: 30px;
  font-family: 'Press Start 2P', cursive;
}

.squat-leaderboard-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
  font-size: 18px;
  font-family: 'Press Start 2P', cursive;
}

.squat-rank-medal {
  width: 70px;
  text-align: right;
}

.squat-lb-name {
  width: 150px;
  text-align: left;
}

.squat-lb-score {
  width: 60px;
  text-align: right;
  color: white;
}

.squat-single-result {
  font-size: 32px;
  color: white;
  margin-top: 60px;
  font-family: 'Press Start 2P', cursive;
}

.squat-single-detail {
  font-size: 18px;
  color: white;
  margin-top: 30px;
  font-family: 'Press Start 2P', cursive;
}
</style>
