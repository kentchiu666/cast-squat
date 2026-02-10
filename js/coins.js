import { COIN_CONFIG, SPRITES, SCENE_CONFIG } from './constants.js';
import { randomRange, circleCollision } from './utils.js';
import { createCoinCollectParticles } from './particles.js';

// === 金幣系統狀態 ===
let coins = [];
let coinScore = 0;
let coinSpawnTimer = 0;
let coinAnimFrame = 0;  // 用幀計數器取代 Date.now()

// === 取得狀態 ===
export function getCoinScore() {
    return coinScore;
}

export function resetCoins() {
    coins = [];
    coinScore = 0;
    coinSpawnTimer = 0;
    coinAnimFrame = 0;
}

// === 生成金幣 ===
function spawnCoin(canvasWidth, canvasHeight) {
    const height = randomRange(COIN_CONFIG.MIN_HEIGHT, COIN_CONFIG.MAX_HEIGHT);
    coins.push({
        x: canvasWidth + COIN_CONFIG.SIZE,
        y: canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - height,
        collected: false
    });
}

// === 碰撞檢測 ===
function checkCoinCollision(coin, canvasWidth, canvasHeight, characterY, squashStretch) {
    const charCenterX = canvasWidth / 2;
    const charCenterY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - characterY;
    const charSize = SCENE_CONFIG.BASE_SIZE * Math.max(squashStretch.scaleX, squashStretch.scaleY);

    const coinCenterX = coin.x + COIN_CONFIG.SIZE / 2;
    const coinCenterY = coin.y + COIN_CONFIG.SIZE / 2;

    return circleCollision(
        charCenterX, charCenterY, charSize / 2,
        coinCenterX, coinCenterY, COIN_CONFIG.SIZE / 2
    );
}

// === 更新金幣 ===
export function updateCoins(canvasWidth, canvasHeight, characterY, squashStretch) {
    coinAnimFrame++;
    coinSpawnTimer++;
    if (coinSpawnTimer >= COIN_CONFIG.SPAWN_INTERVAL) {
        spawnCoin(canvasWidth, canvasHeight);
        coinSpawnTimer = 0;
    }

    coins = coins.filter(coin => {
        coin.x -= COIN_CONFIG.SPEED;

        if (!coin.collected && checkCoinCollision(coin, canvasWidth, canvasHeight, characterY, squashStretch)) {
            coin.collected = true;
            coinScore += COIN_CONFIG.SCORE;
            createCoinCollectParticles(coin.x, coin.y, COIN_CONFIG.SIZE);
            return false;
        }

        return coin.x > -COIN_CONFIG.SIZE;
    });
}

// === 繪製金幣 ===
export function drawCoins(ctx, spritesheet) {
    const coinSprite = SPRITES.COIN;
    const halfSize = COIN_CONFIG.SIZE / 2;

    coins.forEach(coin => {
        ctx.save();
        ctx.translate(coin.x + halfSize, coin.y + halfSize);

        // 用幀計數器取代 Date.now()（避免每幀系統呼叫）
        const scale = Math.abs(Math.sin(coinAnimFrame * 0.15 + coin.x * 0.1));
        ctx.scale(0.3 + scale * 0.7, 1);

        ctx.drawImage(spritesheet,
            coinSprite.x, coinSprite.y, coinSprite.w, coinSprite.h,
            -halfSize, -halfSize,
            COIN_CONFIG.SIZE, COIN_CONFIG.SIZE);
        ctx.restore();
    });
}

// === 多玩家碰撞檢測 ===
function checkCoinCollisionWithPlayer(coin, playerX, characterY, squashStretch, canvasHeight) {
    const charCenterX = playerX;
    const charCenterY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET - characterY;
    const charSize = SCENE_CONFIG.BASE_SIZE * Math.max(squashStretch.scaleX, squashStretch.scaleY);

    const coinCenterX = coin.x + COIN_CONFIG.SIZE / 2;
    const coinCenterY = coin.y + COIN_CONFIG.SIZE / 2;

    return circleCollision(
        charCenterX, charCenterY, charSize / 2,
        coinCenterX, coinCenterY, COIN_CONFIG.SIZE / 2
    );
}

// === 更新金幣（多玩家版本）===
export function updateCoinsMultiplayer(canvasWidth, canvasHeight, players, playerPositions) {
    coinAnimFrame++;
    coinSpawnTimer++;
    if (coinSpawnTimer >= COIN_CONFIG.SPAWN_INTERVAL) {
        spawnCoin(canvasWidth, canvasHeight);
        coinSpawnTimer = 0;
    }

    coins = coins.filter(coin => {
        coin.x -= COIN_CONFIG.SPEED;

        if (!coin.collected) {
            // 檢測與每個玩家的碰撞
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                const playerX = playerPositions[i];
                const state = player.jumpState;

                if (checkCoinCollisionWithPlayer(coin, playerX, state.characterY, state.squashStretch, canvasHeight)) {
                    coin.collected = true;
                    player.coinScore += COIN_CONFIG.SCORE;
                    createCoinCollectParticles(coin.x, coin.y, COIN_CONFIG.SIZE);
                    return false;
                }
            }
        }

        return coin.x > -COIN_CONFIG.SIZE;
    });
}
