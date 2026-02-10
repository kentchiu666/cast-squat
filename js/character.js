import { JUMP_PHASE, JUMP_CONFIG, SPRITES, SCENE_CONFIG, PLAYER_COLORS, MULTIPLAYER_CONFIG } from './constants.js';
import { easeOutBack } from './utils.js';
import { createLandingParticles } from './particles.js';
import { createSpeedLines, createAfterImage, triggerScreenShake } from './effects.js';

// === 預渲染彩色精靈圖快取 ===
const coloredSpritesheets = new Map();

export function initColoredSpritesheets(spritesheet) {
    coloredSpritesheets.clear();
    // 紅色（hueRotation=0）直接用原圖
    coloredSpritesheets.set(0, spritesheet);

    PLAYER_COLORS.forEach((color, index) => {
        if (color.hueRotation === 0) return;  // 紅色跳過
        const offscreen = document.createElement('canvas');
        offscreen.width = spritesheet.width;
        offscreen.height = spritesheet.height;
        const offCtx = offscreen.getContext('2d');
        offCtx.filter = `hue-rotate(${color.hueRotation}deg)`;
        offCtx.drawImage(spritesheet, 0, 0);
        coloredSpritesheets.set(index, offscreen);
    });
}

function getColoredSpritesheet(colorIndex) {
    return coloredSpritesheets.get(colorIndex) || coloredSpritesheets.get(0);
}

// === 角色狀態 ===
let jumpPhase = JUMP_PHASE.IDLE;
let phaseTimer = 0;
let characterY = 0;
let characterVelocityY = 0;
let squashStretch = { scaleX: 1, scaleY: 1 };

// === 取得狀態 ===
export function getCharacterState() {
    return {
        jumpPhase,
        phaseTimer,
        characterY,
        characterVelocityY,
        squashStretch
    };
}

export function resetCharacter() {
    jumpPhase = JUMP_PHASE.IDLE;
    phaseTimer = 0;
    characterY = 0;
    characterVelocityY = 0;
    squashStretch = { scaleX: 1, scaleY: 1 };
}

export function canJump() {
    return jumpPhase === JUMP_PHASE.IDLE;
}

export function startJump() {
    if (!canJump()) return false;
    jumpPhase = JUMP_PHASE.ANTICIPATION;
    phaseTimer = 0;
    return true;
}

// === 跳躍狀態更新 ===
export function updateJump(canvasWidth, canvasHeight) {
    phaseTimer++;

    switch (jumpPhase) {
        case JUMP_PHASE.IDLE:
            squashStretch = { scaleX: 1, scaleY: 1 };
            break;

        case JUMP_PHASE.ANTICIPATION: {
            const anticipationProgress = phaseTimer / JUMP_CONFIG.ANTICIPATION_DURATION;
            squashStretch = {
                scaleX: 1 + anticipationProgress * 0.3,
                scaleY: 1 - anticipationProgress * 0.3
            };
            characterY = -anticipationProgress * 10;

            if (phaseTimer >= JUMP_CONFIG.ANTICIPATION_DURATION) {
                jumpPhase = JUMP_PHASE.RISE;
                phaseTimer = 0;
                characterVelocityY = JUMP_CONFIG.RISE_POWER;
                createSpeedLines(canvasWidth, canvasHeight);
            }
            break;
        }

        case JUMP_PHASE.RISE: {
            characterY += characterVelocityY;
            characterVelocityY -= JUMP_CONFIG.GRAVITY;

            const riseStretch = Math.min(characterVelocityY / JUMP_CONFIG.RISE_POWER, 1);
            squashStretch = {
                scaleX: 1 - riseStretch * 0.25,
                scaleY: 1 + riseStretch * 0.35
            };

            if (phaseTimer % 2 === 0) {
                createAfterImage(characterY, squashStretch);
            }

            if (characterVelocityY <= 0) {
                jumpPhase = JUMP_PHASE.HANG;
                phaseTimer = 0;
            }
            break;
        }

        case JUMP_PHASE.HANG:
            squashStretch = { scaleX: 1.05, scaleY: 0.95 };

            if (phaseTimer >= JUMP_CONFIG.HANG_DURATION) {
                jumpPhase = JUMP_PHASE.FALL;
                phaseTimer = 0;
                characterVelocityY = -2;
            }
            break;

        case JUMP_PHASE.FALL: {
            characterVelocityY -= JUMP_CONFIG.GRAVITY;
            characterY += characterVelocityY;

            const fallSpeed = Math.abs(characterVelocityY) / 20;
            squashStretch = {
                scaleX: 1 - Math.min(fallSpeed * 0.15, 0.2),
                scaleY: 1 + Math.min(fallSpeed * 0.2, 0.3)
            };

            if (phaseTimer % 2 === 0) {
                createAfterImage(characterY, squashStretch);
            }

            if (characterY <= 0) {
                characterY = 0;
                jumpPhase = JUMP_PHASE.LAND;
                phaseTimer = 0;
                triggerScreenShake(8);
                createLandingParticles(canvasWidth, canvasHeight);
            }
            break;
        }

        case JUMP_PHASE.LAND: {
            const landProgress = phaseTimer / JUMP_CONFIG.LAND_DURATION;
            squashStretch = {
                scaleX: 1 + (1 - landProgress) * 0.4,
                scaleY: 1 - (1 - landProgress) * 0.35
            };

            if (phaseTimer >= JUMP_CONFIG.LAND_DURATION) {
                jumpPhase = JUMP_PHASE.RECOVER;
                phaseTimer = 0;
            }
            break;
        }

        case JUMP_PHASE.RECOVER: {
            const recoverProgress = easeOutBack(phaseTimer / JUMP_CONFIG.RECOVER_DURATION);
            squashStretch = {
                scaleX: 1 + (1 - recoverProgress) * 0.15,
                scaleY: 1 - (1 - recoverProgress) * 0.1
            };

            if (phaseTimer >= JUMP_CONFIG.RECOVER_DURATION) {
                jumpPhase = JUMP_PHASE.IDLE;
                phaseTimer = 0;
                squashStretch = { scaleX: 1, scaleY: 1 };
            }
            break;
        }
    }
}

// === 根據跳躍階段獲取對應的表情和手部 ===
export function getCharacterParts() {
    switch (jumpPhase) {
        case JUMP_PHASE.IDLE:
            return {
                face: SPRITES.FACE_IDLE,
                hand: SPRITES.HAND_CLOSED,
                handAngle: { left: 0.3, right: -0.3 }
            };
        case JUMP_PHASE.ANTICIPATION:
            return {
                face: SPRITES.FACE_ANTICIPATION,
                hand: SPRITES.HAND_CLOSED,
                handAngle: { left: 0.8, right: -0.8 }
            };
        case JUMP_PHASE.RISE:
            return {
                face: SPRITES.FACE_RISE,
                hand: SPRITES.HAND_OPEN,
                handAngle: { left: -1.2, right: 1.2 }
            };
        case JUMP_PHASE.HANG:
            return {
                face: SPRITES.FACE_HANG,
                hand: SPRITES.HAND_PEACE,
                handAngle: { left: -1.5, right: 1.5 }
            };
        case JUMP_PHASE.FALL:
            return {
                face: SPRITES.FACE_FALL,
                hand: SPRITES.HAND_OPEN,
                handAngle: { left: -0.5, right: 0.5 }
            };
        case JUMP_PHASE.LAND:
            return {
                face: SPRITES.FACE_LAND,
                hand: SPRITES.HAND_CLOSED,
                handAngle: { left: 0.5, right: -0.5 }
            };
        case JUMP_PHASE.RECOVER:
            return {
                face: SPRITES.FACE_IDLE,
                hand: SPRITES.HAND_ROCK,
                handAngle: { left: -0.8, right: 0.8 }
            };
        default:
            return {
                face: SPRITES.FACE_IDLE,
                hand: SPRITES.HAND_CLOSED,
                handAngle: { left: 0.3, right: -0.3 }
            };
    }
}

// === 繪製手部 ===
export function drawHand(ctx, spritesheet, handSprite, x, y, angle, isLeft) {
    const handScale = 0.8;
    const handWidth = handSprite.w * handScale;
    const handHeight = handSprite.h * handScale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (isLeft) {
        ctx.scale(-1, 1);
    }

    ctx.drawImage(
        spritesheet,
        handSprite.x, handSprite.y, handSprite.w, handSprite.h,
        -handWidth / 2, -handHeight / 2, handWidth, handHeight
    );

    ctx.restore();
}

// === 繪製角色陰影（用 fillRect 取代 ellipse，節省效能）===
export function drawCharacterShadow(ctx, x, y, height) {
    const shadowScale = Math.max(0.3, 1 - height / 400);
    const shadowWidth = 60 * shadowScale;
    const shadowHeight = 10 * shadowScale;

    ctx.save();
    ctx.globalAlpha = 0.3 * shadowScale;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - shadowWidth, y - shadowHeight / 2, shadowWidth * 2, shadowHeight);
    ctx.restore();
}

// === 繪製完整角色 ===
export function drawCharacter(ctx, spritesheet, canvasWidth, canvasHeight) {
    const { face: currentFace, hand: currentHand, handAngle } = getCharacterParts();
    const body = SPRITES.BODY;
    const baseSize = SCENE_CONFIG.BASE_SIZE;

    const charRenderWidth = baseSize * squashStretch.scaleX;
    const charRenderHeight = baseSize * squashStretch.scaleY;

    const charRenderBottom = (canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET) - characterY;
    const charCenterX = canvasWidth / 2;

    // 繪製陰影
    drawCharacterShadow(ctx, charCenterX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, characterY);

    ctx.save();
    ctx.translate(charCenterX, charRenderBottom - charRenderHeight / 2);

    // 繪製手部
    drawHand(ctx, spritesheet, currentHand, -charRenderWidth / 2 - 15, 0, handAngle.left, true);
    drawHand(ctx, spritesheet, currentHand, charRenderWidth / 2 + 15, 0, handAngle.right, false);

    // 繪製身體
    ctx.drawImage(spritesheet, body.x, body.y, body.w, body.h,
        -charRenderWidth / 2, -charRenderHeight / 2, charRenderWidth, charRenderHeight);

    // 繪製臉部
    const faceSizeRatio = currentFace.w / currentFace.h;
    const faceHeight = 28;
    const faceWidth = faceHeight * faceSizeRatio;
    ctx.drawImage(spritesheet, currentFace.x, currentFace.y, currentFace.w, currentFace.h,
        -faceWidth / 2, -charRenderHeight / 2 + 12, faceWidth, faceHeight);

    ctx.restore();
}

// === 繪製靜止角色（用於倒數畫面）===
export function drawStaticCharacter(ctx, spritesheet, canvasWidth, canvasHeight) {
    const body = SPRITES.BODY;
    const face = SPRITES.FACE_IDLE;
    const hand = SPRITES.HAND_CLOSED;
    const baseSize = SCENE_CONFIG.BASE_SIZE;
    const charCenterX = canvasWidth / 2;
    const charRenderBottom = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET;

    // 繪製陰影
    drawCharacterShadow(ctx, charCenterX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, 0);

    ctx.save();
    ctx.translate(charCenterX, charRenderBottom - baseSize / 2);

    // 繪製手部
    drawHand(ctx, spritesheet, hand, -baseSize / 2 - 15, 0, 0.3, true);
    drawHand(ctx, spritesheet, hand, baseSize / 2 + 15, 0, -0.3, false);

    // 繪製身體
    ctx.drawImage(spritesheet, body.x, body.y, body.w, body.h,
        -baseSize / 2, -baseSize / 2, baseSize, baseSize);

    // 繪製臉部
    const faceSizeRatio = face.w / face.h;
    const faceHeight = 28;
    const faceWidth = faceHeight * faceSizeRatio;
    ctx.drawImage(spritesheet, face.x, face.y, face.w, face.h,
        -faceWidth / 2, -baseSize / 2 + 12, faceWidth, faceHeight);

    ctx.restore();
}

// ============================================
// === 多人遊戲支援函數 ===
// ============================================

// === 根據跳躍狀態獲取對應的表情和手部（接受 jumpState 參數）===
function getCharacterPartsForState(jumpState) {
    const phase = jumpState.jumpPhase;
    switch (phase) {
        case JUMP_PHASE.IDLE:
            return { face: SPRITES.FACE_IDLE, hand: SPRITES.HAND_CLOSED, handAngle: { left: 0.3, right: -0.3 } };
        case JUMP_PHASE.ANTICIPATION:
            return { face: SPRITES.FACE_ANTICIPATION, hand: SPRITES.HAND_CLOSED, handAngle: { left: 0.8, right: -0.8 } };
        case JUMP_PHASE.RISE:
            return { face: SPRITES.FACE_RISE, hand: SPRITES.HAND_OPEN, handAngle: { left: -1.2, right: 1.2 } };
        case JUMP_PHASE.HANG:
            return { face: SPRITES.FACE_HANG, hand: SPRITES.HAND_PEACE, handAngle: { left: -1.5, right: 1.5 } };
        case JUMP_PHASE.FALL:
            return { face: SPRITES.FACE_FALL, hand: SPRITES.HAND_OPEN, handAngle: { left: -0.5, right: 0.5 } };
        case JUMP_PHASE.LAND:
            return { face: SPRITES.FACE_LAND, hand: SPRITES.HAND_CLOSED, handAngle: { left: 0.5, right: -0.5 } };
        case JUMP_PHASE.RECOVER:
            return { face: SPRITES.FACE_IDLE, hand: SPRITES.HAND_ROCK, handAngle: { left: -0.8, right: 0.8 } };
        default:
            return { face: SPRITES.FACE_IDLE, hand: SPRITES.HAND_CLOSED, handAngle: { left: 0.3, right: -0.3 } };
    }
}

// === 更新玩家跳躍狀態（多人版本）===
export function updatePlayerJump(player, canvasWidth, canvasHeight, playerX) {
    const state = player.jumpState;
    state.phaseTimer++;

    switch (state.jumpPhase) {
        case JUMP_PHASE.IDLE:
            state.squashStretch = { scaleX: 1, scaleY: 1 };
            break;

        case JUMP_PHASE.ANTICIPATION: {
            const progress = state.phaseTimer / JUMP_CONFIG.ANTICIPATION_DURATION;
            state.squashStretch = {
                scaleX: 1 + progress * 0.3,
                scaleY: 1 - progress * 0.3
            };
            state.characterY = -progress * 10;

            if (state.phaseTimer >= JUMP_CONFIG.ANTICIPATION_DURATION) {
                state.jumpPhase = JUMP_PHASE.RISE;
                state.phaseTimer = 0;
                state.characterVelocityY = JUMP_CONFIG.RISE_POWER;
                createSpeedLines(canvasWidth, canvasHeight, playerX);
            }
            break;
        }

        case JUMP_PHASE.RISE: {
            state.characterY += state.characterVelocityY;
            state.characterVelocityY -= JUMP_CONFIG.GRAVITY;

            const riseStretch = Math.min(state.characterVelocityY / JUMP_CONFIG.RISE_POWER, 1);
            state.squashStretch = {
                scaleX: 1 - riseStretch * 0.25,
                scaleY: 1 + riseStretch * 0.35
            };

            if (state.phaseTimer % 2 === 0) {
                createAfterImage(state.characterY, state.squashStretch, playerX);
            }

            if (state.characterVelocityY <= 0) {
                state.jumpPhase = JUMP_PHASE.HANG;
                state.phaseTimer = 0;
            }
            break;
        }

        case JUMP_PHASE.HANG:
            state.squashStretch = { scaleX: 1.05, scaleY: 0.95 };

            if (state.phaseTimer >= JUMP_CONFIG.HANG_DURATION) {
                state.jumpPhase = JUMP_PHASE.FALL;
                state.phaseTimer = 0;
                state.characterVelocityY = -2;
            }
            break;

        case JUMP_PHASE.FALL: {
            state.characterVelocityY -= JUMP_CONFIG.GRAVITY;
            state.characterY += state.characterVelocityY;

            const fallSpeed = Math.abs(state.characterVelocityY) / 20;
            state.squashStretch = {
                scaleX: 1 - Math.min(fallSpeed * 0.15, 0.2),
                scaleY: 1 + Math.min(fallSpeed * 0.2, 0.3)
            };

            if (state.phaseTimer % 2 === 0) {
                createAfterImage(state.characterY, state.squashStretch, playerX);
            }

            if (state.characterY <= 0) {
                state.characterY = 0;
                state.jumpPhase = JUMP_PHASE.LAND;
                state.phaseTimer = 0;
                triggerScreenShake(6);  // 多人時震動稍弱
                createLandingParticles(canvasWidth, canvasHeight, playerX);
            }
            break;
        }

        case JUMP_PHASE.LAND: {
            const landProgress = state.phaseTimer / JUMP_CONFIG.LAND_DURATION;
            state.squashStretch = {
                scaleX: 1 + (1 - landProgress) * 0.4,
                scaleY: 1 - (1 - landProgress) * 0.35
            };

            if (state.phaseTimer >= JUMP_CONFIG.LAND_DURATION) {
                state.jumpPhase = JUMP_PHASE.RECOVER;
                state.phaseTimer = 0;
            }
            break;
        }

        case JUMP_PHASE.RECOVER: {
            const recoverProgress = easeOutBack(state.phaseTimer / JUMP_CONFIG.RECOVER_DURATION);
            state.squashStretch = {
                scaleX: 1 + (1 - recoverProgress) * 0.15,
                scaleY: 1 - (1 - recoverProgress) * 0.1
            };

            if (state.phaseTimer >= JUMP_CONFIG.RECOVER_DURATION) {
                state.jumpPhase = JUMP_PHASE.IDLE;
                state.phaseTimer = 0;
                state.squashStretch = { scaleX: 1, scaleY: 1 };
            }
            break;
        }
    }
}

// === 繪製玩家角色（多人版本，支援位置和顏色）===
export function drawPlayerCharacter(ctx, spritesheet, player, playerX, canvasHeight) {
    const state = player.jumpState;
    const { face: currentFace, hand: currentHand, handAngle } = getCharacterPartsForState(state);
    const coloredSheet = getColoredSpritesheet(player.colorIndex);
    const body = SPRITES.BODY;
    const baseSize = SCENE_CONFIG.BASE_SIZE;

    const charRenderWidth = baseSize * state.squashStretch.scaleX;
    const charRenderHeight = baseSize * state.squashStretch.scaleY;
    const charRenderBottom = (canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET) - state.characterY;

    // 繪製陰影
    drawCharacterShadow(ctx, playerX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, state.characterY);

    ctx.save();
    ctx.translate(playerX, charRenderBottom - charRenderHeight / 2);

    // 使用預渲染彩色精靈圖繪製手部和身體（無需 ctx.filter）
    drawHand(ctx, coloredSheet, currentHand, -charRenderWidth / 2 - 15, 0, handAngle.left, true);
    drawHand(ctx, coloredSheet, currentHand, charRenderWidth / 2 + 15, 0, handAngle.right, false);

    ctx.drawImage(coloredSheet, body.x, body.y, body.w, body.h,
        -charRenderWidth / 2, -charRenderHeight / 2, charRenderWidth, charRenderHeight);

    // 臉部用原圖（保持原色）
    const faceSizeRatio = currentFace.w / currentFace.h;
    const faceHeight = 28;
    const faceWidth = faceHeight * faceSizeRatio;
    ctx.drawImage(spritesheet, currentFace.x, currentFace.y, currentFace.w, currentFace.h,
        -faceWidth / 2, -charRenderHeight / 2 + 12, faceWidth, faceHeight);

    ctx.restore();
}

// === 繪製玩家預覽（等候室用）===
export function drawPlayerPreview(ctx, spritesheet, player, x, y) {
    const coloredSheet = getColoredSpritesheet(player.colorIndex);
    const body = SPRITES.BODY;
    const face = SPRITES.FACE_IDLE;
    const previewSize = MULTIPLAYER_CONFIG.PLAYER_PREVIEW_SIZE;

    ctx.save();
    ctx.translate(x, y);

    // 使用預渲染彩色精靈圖
    ctx.drawImage(coloredSheet, body.x, body.y, body.w, body.h,
        -previewSize / 2, -previewSize / 2, previewSize, previewSize);

    // 臉部用原圖
    const faceSizeRatio = face.w / face.h;
    const faceHeight = previewSize * 0.35;
    const faceWidth = faceHeight * faceSizeRatio;
    ctx.drawImage(spritesheet, face.x, face.y, face.w, face.h,
        -faceWidth / 2, -previewSize / 2 + previewSize * 0.15, faceWidth, faceHeight);

    ctx.restore();
}

// === 繪製多個玩家的靜止角色（倒數畫面用）===
export function drawPlayersStatic(ctx, spritesheet, players, canvasWidth, canvasHeight) {
    const count = players.length;
    if (count === 0) return;

    const spacing = canvasWidth / (count + 1);

    players.forEach((player, index) => {
        const playerX = spacing * (index + 1);
        const coloredSheet = getColoredSpritesheet(player.colorIndex);
        const body = SPRITES.BODY;
        const face = SPRITES.FACE_IDLE;
        const hand = SPRITES.HAND_CLOSED;
        const baseSize = SCENE_CONFIG.BASE_SIZE;
        const charRenderBottom = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET;

        // 繪製陰影
        drawCharacterShadow(ctx, playerX, canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - 5, 0);

        ctx.save();
        ctx.translate(playerX, charRenderBottom - baseSize / 2);

        // 使用預渲染彩色精靈圖
        drawHand(ctx, coloredSheet, hand, -baseSize / 2 - 15, 0, 0.3, true);
        drawHand(ctx, coloredSheet, hand, baseSize / 2 + 15, 0, -0.3, false);

        ctx.drawImage(coloredSheet, body.x, body.y, body.w, body.h,
            -baseSize / 2, -baseSize / 2, baseSize, baseSize);

        // 臉部用原圖
        const faceSizeRatio = face.w / face.h;
        const faceHeight = 28;
        const faceWidth = faceHeight * faceSizeRatio;
        ctx.drawImage(spritesheet, face.x, face.y, face.w, face.h,
            -faceWidth / 2, -baseSize / 2 + 12, faceWidth, faceHeight);

        ctx.restore();
    });
}
