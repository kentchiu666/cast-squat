<template>
  <div
    class="game-card"
    :class="{
      available: game.available,
      locked: !game.available,
      selected: selected,
    }"
    :style="cardStyle"
    @click="handleClick"
  >
    <!-- 像素風圖示 -->
    <div class="game-card-icon">
      {{ game.icon }}
    </div>
    <div class="game-card-name">{{ game.name }}</div>
    <div class="game-card-type">{{ game.typeLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GameInfo } from '../types/game'

const props = defineProps<{
  game: GameInfo
  selected: boolean
}>()

const emit = defineEmits<{
  select: [gameId: string]
}>()

const cardStyle = computed(() => {
  const color = props.game.iconColor
  if (props.game.available) {
    return {
      backgroundColor: color,
      borderColor: darkenColor(color),
      boxShadow: props.selected
        ? `0 8px 0 ${darkenColor(color)}, 0 12px 24px rgba(0,0,0,0.3)`
        : `0 6px 0 ${darkenColor(color)}`,
    }
  }
  return {
    backgroundColor: '#aaa',
    borderColor: '#888',
    boxShadow: props.selected
      ? '0 8px 0 #888, 0 12px 24px rgba(0,0,0,0.2)'
      : '0 6px 0 #888',
  }
})

/** 簡易變暗顏色 — 取 hex，各通道減 40 */
function darkenColor(hex: string): string {
  const r = Math.max(0, Number.parseInt(hex.slice(1, 3), 16) - 40)
  const g = Math.max(0, Number.parseInt(hex.slice(3, 5), 16) - 40)
  const b = Math.max(0, Number.parseInt(hex.slice(5, 7), 16) - 40)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function handleClick() {
  emit('select', props.game.id)
}
</script>

<style scoped>
.game-card {
  width: 280px;
  padding: 30px 20px 24px;
  text-align: center;
  flex-shrink: 0;
  cursor: pointer;
  border: 4px solid;
  position: relative;

  /* 像素風：無圓角 */
  border-radius: 0;

  /* 平滑過渡（用彈跳緩動） */
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.3s ease-out,
    filter 0.3s ease-out;

  /* 未選中預設 */
  transform: scale(0.82) translateY(0);
  opacity: 0.55;
}

/* === 選中 === */
.game-card.selected {
  transform: scale(1.12) translateY(-8px);
  opacity: 1;
  z-index: 2;
  animation: selectedBounce 2s ease-in-out infinite;
}

/* === 未選中 + 可用 === */
.game-card:not(.selected).available {
  opacity: 0.55;
  filter: brightness(0.85);
}

/* === 未選中 + 鎖定 === */
.game-card:not(.selected).locked {
  opacity: 0.35;
  filter: grayscale(0.8) brightness(0.7);
}

/* === 選中 + 鎖定 === */
.game-card.selected.locked {
  opacity: 0.65;
  filter: grayscale(0.5);
}

/* === 選中彈跳動畫 === */
@keyframes selectedBounce {
  0%, 100% {
    transform: scale(1.12) translateY(-8px);
  }
  50% {
    transform: scale(1.12) translateY(-14px);
  }
}

/* === 圖示 === */
.game-card-icon {
  width: 90px;
  height: 90px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
  color: white;
  background: rgba(0, 0, 0, 0.2);
  border: 4px solid rgba(0, 0, 0, 0.15);
}

.game-card-name {
  font-size: 18px;
  color: white;
  margin-bottom: 10px;
  line-height: 1.4;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
}

.game-card-type {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 3px;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.2);
}
</style>
