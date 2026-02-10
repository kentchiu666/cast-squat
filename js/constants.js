// === 遊戲常數 ===
export const GAME_DURATION = 20;

// === 跳躍階段 ===
export const JUMP_PHASE = {
    IDLE: 'IDLE',
    ANTICIPATION: 'ANTICIPATION',
    RISE: 'RISE',
    HANG: 'HANG',
    FALL: 'FALL',
    LAND: 'LAND',
    RECOVER: 'RECOVER'
};

// === 跳躍參數 ===
export const JUMP_CONFIG = {
    ANTICIPATION_DURATION: 6,
    RISE_POWER: 28,
    HANG_DURATION: 5,
    GRAVITY: 1.8,
    LAND_DURATION: 4,
    RECOVER_DURATION: 8,
    MAX_HEIGHT: 300
};

// === 金幣配置 ===
export const COIN_CONFIG = {
    SPAWN_INTERVAL: 90,
    SPEED: 4,
    MIN_HEIGHT: 150,
    MAX_HEIGHT: 280,
    SIZE: 40,
    SCORE: 3
};

// === 倒數配置 ===
export const COUNTDOWN_CONFIG = {
    ANIM_DURATION: 60
};

// === 精靈定義 (來自 Kenney Shape Characters) ===
export const SPRITES = {
    // 身體 - 紅色方形
    BODY: { x: 256, y: 0, w: 80, h: 80 },

    // 表情 - 根據不同階段使用
    FACE_IDLE: { x: 109, y: 547, w: 50, h: 29 },
    FACE_ANTICIPATION: { x: 400, y: 350, w: 55, h: 40 },
    FACE_RISE: { x: 400, y: 390, w: 55, h: 32 },
    FACE_HANG: { x: 59, y: 547, w: 50, h: 24 },
    FACE_FALL: { x: 400, y: 455, w: 55, h: 36 },
    FACE_LAND: { x: 400, y: 491, w: 55, h: 40 },

    // 手部 - 紅色
    HAND_CLOSED: { x: 472, y: 316, w: 35, h: 34 },
    HAND_OPEN: { x: 508, y: 287, w: 34, h: 38 },
    HAND_PEACE: { x: 542, y: 262, w: 28, h: 40 },
    HAND_ROCK: { x: 466, y: 37, w: 36, h: 38 },

    // 陰影
    SHADOW: { x: 96, y: 122, w: 48, h: 20 },

    // 金幣
    COIN: { x: 453, y: 531, w: 40, h: 40 },
};

// === 場景配置 ===
export const SCENE_CONFIG = {
    FLOOR_HEIGHT: 100,
    CHAR_FOOT_OFFSET: 20,
    BASE_SIZE: 80
};

// === 多人遊戲配置 ===
export const PLAYER_COLORS = [
    { name: 'Red', hex: '#FF6B6B', hueRotation: 0 },
    { name: 'Cyan', hex: '#4ECDC4', hueRotation: 180 },
    { name: 'Yellow', hex: '#FFE66D', hueRotation: 45 },
    { name: 'Green', hex: '#95E86B', hueRotation: 90 }
];

export const MULTIPLAYER_CONFIG = {
    MAX_PLAYERS: 4,
    PLAYER_PREVIEW_SIZE: 50  // 等候室角色預覽尺寸
};
