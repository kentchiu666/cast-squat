import { SPRITES, SCENE_CONFIG } from './constants.js';
import { randomRange } from './utils.js';

// === 殘影系統 ===
let afterImages = [];
const MAX_AFTER_IMAGES = 5;

// === 速度線系統 ===
let speedLines = [];

// === 螢幕震動 ===
let screenShake = { x: 0, y: 0, intensity: 0 };

// === 重置特效 ===
export function resetEffects() {
    afterImages = [];
    speedLines = [];
    screenShake = { x: 0, y: 0, intensity: 0 };
}

// === 取得螢幕震動偏移 ===
export function getScreenShake() {
    return screenShake;
}

// === 殘影系統函數 ===
export function createAfterImage(characterY, squashStretch, playerX = null) {
    if (afterImages.length >= MAX_AFTER_IMAGES) {
        afterImages.shift();
    }
    afterImages.push({
        y: characterY,
        scaleX: squashStretch.scaleX,
        scaleY: squashStretch.scaleY,
        alpha: 0.6,
        playerX: playerX  // 多人遊戲時記錄玩家 X 位置
    });
}

export function updateAfterImages() {
    afterImages = afterImages.filter(img => {
        img.alpha -= 0.12;
        return img.alpha > 0;
    });
}

export function drawAfterImages(ctx, spritesheet, canvasWidth, canvasHeight) {
    const body = SPRITES.BODY;
    const baseSize = SCENE_CONFIG.BASE_SIZE;

    afterImages.forEach(img => {
        const charRenderWidth = baseSize * img.scaleX;
        const charRenderHeight = baseSize * img.scaleY;
        const charRenderBottom = (canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET) - img.y;
        const charCenterX = img.playerX ?? canvasWidth / 2;

        ctx.save();
        ctx.globalAlpha = img.alpha * 0.5;
        ctx.translate(charCenterX, charRenderBottom - charRenderHeight / 2);

        // 殘影用青色調
        ctx.filter = 'hue-rotate(180deg) brightness(1.5)';
        ctx.drawImage(spritesheet, body.x, body.y, body.w, body.h,
            -charRenderWidth / 2, -charRenderHeight / 2, charRenderWidth, charRenderHeight);
        ctx.filter = 'none';

        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

// === 速度線系統函數 ===
export function createSpeedLines(canvasWidth, canvasHeight, playerX = null) {
    const centerX = playerX ?? canvasWidth / 2;
    const groundY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET;

    for (let i = 0; i < 8; i++) {
        speedLines.push({
            x: centerX + randomRange(-30, 30),
            y: groundY - randomRange(0, 30),
            length: randomRange(20, 60),
            life: 1,
            decay: 0.08
        });
    }
}

export function updateSpeedLines() {
    speedLines = speedLines.filter(line => {
        line.y += 8;
        line.life -= line.decay;
        return line.life > 0;
    });
}

export function drawSpeedLines(ctx) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    speedLines.forEach(line => {
        ctx.globalAlpha = line.life * 0.7;
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + line.length);
        ctx.stroke();
    });
    ctx.globalAlpha = 1;
}

// === 螢幕震動函數 ===
export function triggerScreenShake(intensity) {
    screenShake.intensity = intensity;
}

export function updateScreenShake() {
    if (screenShake.intensity > 0) {
        screenShake.x = randomRange(-1, 1) * screenShake.intensity;
        screenShake.y = randomRange(-1, 1) * screenShake.intensity;
        screenShake.intensity *= 0.8;
        if (screenShake.intensity < 0.5) {
            screenShake.intensity = 0;
            screenShake.x = 0;
            screenShake.y = 0;
        }
    }
}
