import type { Player } from '../../types/game'
import { JUMP_PHASE, MULTIPLAYER_CONFIG } from './constants'

// === 玩家列表 ===
let players: Player[] = []
let isLocked = false
let characterCount = 1

// === 建立初始跳躍狀態 ===
function createInitialJumpState() {
  return {
    jumpPhase: JUMP_PHASE.IDLE as string,
    phaseTimer: 0,
    characterY: 0,
    characterVelocityY: 0,
    squashStretch: { scaleX: 1, scaleY: 1 },
  }
}

// === 設定角色數量 ===
export function setCharacterCount(count: number): void {
  characterCount = Math.max(1, count)
}

// === 新增玩家 ===
export function addPlayer(playerId: string, playerName: string): boolean {
  if (isLocked) return false
  if (players.length >= MULTIPLAYER_CONFIG.MAX_PLAYERS) return false
  if (players.find((p) => p.id === playerId)) return false

  const slot = players.length
  const characterIndex = slot % characterCount
  const colorIndex = Math.floor(slot / characterCount)
  players.push({
    id: playerId,
    name: playerName || `Player ${players.length + 1}`,
    characterIndex,
    colorIndex,
    squatCount: 0,
    coinScore: 0,
    jumpState: createInitialJumpState(),
  })
  return true
}

// === 移除玩家 ===
export function removePlayer(playerId: string): boolean {
  if (isLocked) return false
  const index = players.findIndex((p) => p.id === playerId)
  if (index === -1) return false
  players.splice(index, 1)
  return true
}

// === 鎖定/解鎖 ===
export function lockPlayers(): void {
  isLocked = true
}

export function unlockPlayers(): void {
  isLocked = false
}

// === 取得玩家 ===
export function getPlayers(): Player[] {
  return players
}

export function getPlayerById(playerId: string): Player | undefined {
  return players.find((p) => p.id === playerId)
}

// === 重置 ===
export function resetPlayers(): void {
  players = []
  isLocked = false
  characterCount = 1
}

export function resetPlayersGameState(): void {
  for (const player of players) {
    player.squatCount = 0
    player.coinScore = 0
    player.jumpState = createInitialJumpState()
  }
}

// === 查詢 ===
export function getPlayerCount(): number {
  return players.length
}

export function getPlayerPositions(canvasWidth: number): number[] {
  const count = players.length
  if (count === 0) return []

  const positions: number[] = []
  const spacing = canvasWidth / (count + 1)
  for (let i = 0; i < count; i++) {
    positions.push(spacing * (i + 1))
  }
  return positions
}

// === 觸發跳躍 ===
export function triggerPlayerJump(playerId: string): boolean {
  const player = getPlayerById(playerId)
  if (!player) return false
  if (player.jumpState.jumpPhase !== JUMP_PHASE.IDLE) return false

  player.jumpState.jumpPhase = JUMP_PHASE.ANTICIPATION
  player.jumpState.phaseTimer = 0
  player.squatCount++
  return true
}

// === 排行榜 ===
export function getLeaderboard(): Player[] {
  return [...players].sort((a, b) => {
    const scoreA = a.squatCount + a.coinScore
    const scoreB = b.squatCount + b.coinScore
    return scoreB - scoreA
  })
}
