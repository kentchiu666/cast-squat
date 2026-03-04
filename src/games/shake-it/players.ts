import type { ShakePlayer } from '../../types/game'
import { MULTIPLAYER_CONFIG } from './constants'

// === 玩家列表 ===
let players: ShakePlayer[] = []
let isLocked = false
let characterCount = 1

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
    score: 0,
    hasSubmitted: false,
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
export function getPlayers(): ShakePlayer[] {
  return players
}

export function getPlayerById(playerId: string): ShakePlayer | undefined {
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
    player.score = 0
    player.hasSubmitted = false
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

// === 提交結果 ===
export function submitPlayerResult(playerId: string, score: number): boolean {
  const player = getPlayerById(playerId)
  if (!player || player.hasSubmitted) return false

  player.score = score
  player.hasSubmitted = true
  return true
}

export function allPlayersSubmitted(): boolean {
  return players.length > 0 && players.every((p) => p.hasSubmitted)
}

// === 排行榜 ===
export function getLeaderboard(): ShakePlayer[] {
  return [...players].sort((a, b) => b.score - a.score)
}
