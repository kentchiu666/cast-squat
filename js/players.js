import { PLAYER_COLORS, MULTIPLAYER_CONFIG, JUMP_PHASE } from './constants.js';

// === 玩家列表 ===
let players = [];
let isLocked = false;

// === 建立初始跳躍狀態 ===
function createInitialJumpState() {
    return {
        jumpPhase: JUMP_PHASE.IDLE,
        phaseTimer: 0,
        characterY: 0,
        characterVelocityY: 0,
        squashStretch: { scaleX: 1, scaleY: 1 }
    };
}

// === 新增玩家 ===
export function addPlayer(playerId, playerName) {
    if (isLocked) return false;
    if (players.length >= MULTIPLAYER_CONFIG.MAX_PLAYERS) return false;
    if (players.find(p => p.id === playerId)) return false;

    const colorIndex = players.length;
    players.push({
        id: playerId,
        name: playerName || `Player ${players.length + 1}`,
        colorIndex,
        squatCount: 0,
        coinScore: 0,
        jumpState: createInitialJumpState()
    });
    return true;
}

// === 移除玩家 ===
export function removePlayer(playerId) {
    if (isLocked) return false;
    const index = players.findIndex(p => p.id === playerId);
    if (index === -1) return false;
    players.splice(index, 1);
    return true;
}

// === 鎖定玩家列表（遊戲開始後） ===
export function lockPlayers() {
    isLocked = true;
}

// === 解鎖玩家列表 ===
export function unlockPlayers() {
    isLocked = false;
}

// === 取得所有玩家 ===
export function getPlayers() {
    return players;
}

// === 根據 ID 取得玩家 ===
export function getPlayerById(playerId) {
    return players.find(p => p.id === playerId);
}

// === 重置所有玩家 ===
export function resetPlayers() {
    players = [];
    isLocked = false;
}

// === 重置玩家遊戲狀態（保留玩家列表） ===
export function resetPlayersGameState() {
    players.forEach(player => {
        player.squatCount = 0;
        player.coinScore = 0;
        player.jumpState = createInitialJumpState();
    });
}

// === 檢查是否已鎖定 ===
export function isPlayersLocked() {
    return isLocked;
}

// === 取得玩家數量 ===
export function getPlayerCount() {
    return players.length;
}

// === 計算玩家位置 (X 座標) ===
export function getPlayerPositions(canvasWidth) {
    const count = players.length;
    if (count === 0) return [];

    const positions = [];
    const spacing = canvasWidth / (count + 1);
    for (let i = 0; i < count; i++) {
        positions.push(spacing * (i + 1));
    }
    return positions;
}

// === 觸發玩家跳躍 ===
export function triggerPlayerJump(playerId) {
    const player = getPlayerById(playerId);
    if (!player) return false;
    if (player.jumpState.jumpPhase !== JUMP_PHASE.IDLE) return false;

    player.jumpState.jumpPhase = JUMP_PHASE.ANTICIPATION;
    player.jumpState.phaseTimer = 0;
    player.squatCount++;
    return true;
}

// === 增加玩家金幣分數 ===
export function addPlayerCoinScore(playerId, score) {
    const player = getPlayerById(playerId);
    if (!player) return false;
    player.coinScore += score;
    return true;
}

// === 取得排行榜（按總分排序） ===
export function getLeaderboard() {
    return [...players].sort((a, b) => {
        const scoreA = a.squatCount + a.coinScore;
        const scoreB = b.squatCount + b.coinScore;
        return scoreB - scoreA;
    });
}
