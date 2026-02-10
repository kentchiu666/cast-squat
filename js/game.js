import { GAME_DURATION, SCENE_CONFIG, PLAYER_COLORS, MULTIPLAYER_CONFIG } from './constants.js';
import { updateParticles, drawParticles, clearParticles } from './particles.js';
import {
    updateJump,
    startJump,
    resetCharacter,
    getCharacterState,
    drawCharacter,
    drawStaticCharacter,
    updatePlayerJump,
    drawPlayerCharacter,
    drawPlayersStatic,
    initColoredSpritesheets
} from './character.js';
import { updateCoins, drawCoins, getCoinScore, resetCoins, updateCoinsMultiplayer } from './coins.js';
import {
    updateAfterImages,
    drawAfterImages,
    updateSpeedLines,
    drawSpeedLines,
    updateScreenShake,
    getScreenShake,
    resetEffects
} from './effects.js';
import {
    addPlayer,
    removePlayer,
    getPlayers,
    resetPlayers,
    resetPlayersGameState,
    lockPlayers,
    unlockPlayers,
    getPlayerCount,
    getPlayerPositions,
    triggerPlayerJump,
    getLeaderboard
} from './players.js';

// === 遊戲狀態 ===
let gameState = 'START_SCREEN';
let squatCount = 0;
let timer = GAME_DURATION;
let countdownInterval = null;
let finalScore = 0;

// === 星空背景 ===
let starfield = [];

// === Canvas 和素材 ===
let canvas, ctx, spritesheet;
let imageLoaded = false;
const CANVAS_SCALE = 0.5;
let logicalWidth = 0;
let logicalHeight = 0;

// === DOM 元素參考 ===
let uiDisplay, timerUi, actionButton;
let startScreenEl, countdownNumEl, scoreBarEl, gameOverScreenEl, gameOverContentEl;
let playerListEl, playerCountEl, waitingMsgEl, startHintEl, fpsEl;

// === 倒數 setTimeout 追蹤 ===
let countdownTimeouts = [];

// === DOM 更新快取（避免無意義的 DOM 寫入）===
let cachedPlayerCount = -1;
let cachedUiText = '';
let cachedTimerText = '';
let cachedTimerValue = -1;

// === FPS 計數器 ===
let fpsFrameCount = 0;
let fpsLastTime = 0;

// === Fixed Timestep（確保遊戲速度不受幀率影響）===
const TICK_MS = 1000 / 60;  // 邏輯 tick 固定 60fps (16.67ms)
let lastFrameTime = 0;
let tickAccumulator = 0;

// === 初始化遊戲 ===
export function initGame(canvasElement, spritesheetImage) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    spritesheet = spritesheetImage;

    // 取得 DOM 元素參考
    uiDisplay = document.getElementById('ui');
    timerUi = document.getElementById('timerUi');
    actionButton = document.getElementById('actionButton');
    startScreenEl = document.getElementById('startScreen');
    countdownNumEl = document.getElementById('countdownNum');
    scoreBarEl = document.getElementById('scoreBar');
    gameOverScreenEl = document.getElementById('gameOverScreen');
    gameOverContentEl = document.getElementById('gameOverContent');
    playerListEl = document.getElementById('playerList');
    playerCountEl = document.getElementById('playerCount');
    waitingMsgEl = document.getElementById('waitingMsg');
    startHintEl = document.getElementById('startHint');
    fpsEl = document.getElementById('fps');

    // 監聽按鈕
    actionButton.addEventListener('click', handleAction);

    // Canvas 低解析度渲染 + CSS 拉伸
    function resizeCanvas() {
        logicalWidth = window.innerWidth;
        logicalHeight = window.innerHeight;
        canvas.width = Math.floor(logicalWidth * CANVAS_SCALE);
        canvas.height = Math.floor(logicalHeight * CANVAS_SCALE);
        canvas.style.width = logicalWidth + 'px';
        canvas.style.height = logicalHeight + 'px';
        ctx.imageSmoothingEnabled = false;
        ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 預渲染彩色精靈圖
    initColoredSpritesheets(spritesheet);

    // 素材載入
    if (spritesheet.complete) {
        imageLoaded = true;
    } else {
        spritesheet.onload = () => { imageLoaded = true; };
    }

    // 初始化 DOM 狀態
    changeState('START_SCREEN');
}

// === 開始遊戲迴圈 ===
export function startGameLoop() {
    fpsLastTime = performance.now();
    lastFrameTime = 0;
    tickAccumulator = 0;
    requestAnimationFrame(gameLoop);
}

// === 判斷是否為多人模式 ===
function isMultiplayerMode() {
    return getPlayerCount() > 0;
}

// === 統一狀態切換（管理所有 DOM 顯示/隱藏）===
function changeState(newState) {
    gameState = newState;
    clearCountdownTimeouts();

    // 隱藏所有 DOM 覆蓋層
    startScreenEl.style.display = 'none';
    countdownNumEl.style.display = 'none';
    countdownNumEl.classList.remove('pop');
    scoreBarEl.style.display = 'none';
    gameOverScreenEl.style.display = 'none';

    switch (newState) {
        case 'START_SCREEN':
            startScreenEl.style.display = 'block';
            actionButton.textContent = imageLoaded ? 'START GAME' : 'LOADING...';
            uiDisplay.textContent = '';
            timerUi.textContent = '';
            cachedPlayerCount = -1;
            cachedUiText = '';
            cachedTimerText = '';
            break;

        case 'COUNTDOWN':
            actionButton.textContent = 'GET READY!';
            uiDisplay.textContent = '';
            timerUi.textContent = '';
            cachedUiText = '';
            cachedTimerText = '';
            break;

        case 'PLAYING':
            actionButton.textContent = 'JUMP!';
            cachedTimerValue = -1;
            cachedUiText = '';
            cachedTimerText = '';
            if (isMultiplayerMode()) {
                scoreBarEl.style.display = 'block';
                uiDisplay.textContent = '';
                setupMultiplayerScoreDOM();
            }
            break;

        case 'GAME_OVER':
            gameOverScreenEl.style.display = 'block';
            actionButton.textContent = 'RESTART';
            uiDisplay.textContent = '';
            timerUi.textContent = '';
            cachedUiText = '';
            cachedTimerText = '';
            updateGameOverDOM();
            break;
    }
}

// === 清除倒數計時 setTimeout ===
function clearCountdownTimeouts() {
    countdownTimeouts.forEach(id => clearTimeout(id));
    countdownTimeouts = [];
}

// === 處理使用者操作 ===
function handleAction() {
    if (!imageLoaded && gameState === 'START_SCREEN') return;

    switch (gameState) {
        case 'START_SCREEN':
            startCountdownSequence();
            break;
        case 'COUNTDOWN':
            break;
        case 'PLAYING':
            if (!isMultiplayerMode()) {
                triggerJump();
            }
            break;
        case 'GAME_OVER':
            resetPlayers();
            unlockPlayers();
            changeState('START_SCREEN');
            break;
    }
}

// === 開始倒數 ===
function startCountdownSequence() {
    changeState('COUNTDOWN');

    // 鎖定玩家列表
    if (isMultiplayerMode()) {
        lockPlayers();
        resetPlayersGameState();
    }

    // 重置所有系統
    squatCount = 0;
    timer = GAME_DURATION;
    resetCoins();
    resetCharacter();
    clearParticles();
    resetEffects();

    // 用 DOM + CSS 動畫 + setTimeout 顯示倒數
    startDOMCountdown();
}

// === DOM 倒數動畫（CSS animation，不佔 Canvas 渲染時間）===
function startDOMCountdown() {
    const numbers = [
        { text: '3', color: '#FF6B6B' },
        { text: '2', color: '#FFE66D' },
        { text: '1', color: '#4ECDC4' },
        { text: 'GO!', color: '#95E86B' }
    ];

    numbers.forEach((item, i) => {
        const tid = setTimeout(() => {
            countdownNumEl.textContent = item.text;
            countdownNumEl.style.color = item.color;
            countdownNumEl.style.fontSize = item.text === 'GO!' ? '80px' : '120px';
            countdownNumEl.classList.remove('pop');
            void countdownNumEl.offsetWidth; // 強制 reflow 以重啟動畫
            countdownNumEl.classList.add('pop');
        }, i * 1000);
        countdownTimeouts.push(tid);
    });

    const startTid = setTimeout(() => {
        startGame();
    }, 3500);
    countdownTimeouts.push(startTid);
}

// === 開始遊戲 ===
function startGame() {
    changeState('PLAYING');

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (timer > 0) timer--;
        if (timer <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            finalScore = squatCount;
            changeState('GAME_OVER');
        }
    }, 1000);
}

// === 觸發跳躍 ===
function triggerJump() {
    if (startJump()) {
        squatCount++;
    }
}

// === 主迴圈（Fixed Timestep：物理固定 60tick/s，渲染隨裝置幀率）===
function gameLoop(timestamp) {
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const dt = Math.min(timestamp - lastFrameTime, 100); // 上限 100ms 防止螺旋
    lastFrameTime = timestamp;

    // 累積時間，跑足夠次數的物理 tick（30fps 裝置每幀跑 2 次 tick）
    tickAccumulator += dt;
    while (tickAccumulator >= TICK_MS) {
        tick();
        tickAccumulator -= TICK_MS;
    }

    // 渲染一次
    render();

    updateFPS();
    requestAnimationFrame(gameLoop);
}

// === 物理 tick（固定 60 次/秒，不受實際幀率影響）===
function tick() {
    // 星空移動（所有狀態共用）
    tickStarfield();

    // PLAYING 狀態的遊戲邏輯
    if (gameState === 'PLAYING') {
        tickPlaying();
    }
}

// === 渲染（每幀一次，頻率隨裝置）===
function render() {
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    renderStarfield();

    switch (gameState) {
        case 'START_SCREEN':
            drawStartScreen();
            break;
        case 'COUNTDOWN':
            drawCountdownScreen();
            break;
        case 'PLAYING':
            renderPlayingScreen();
            break;
        case 'GAME_OVER':
            // Canvas: 只有星空（文字全由 DOM 處理）
            break;
    }
}

// === PLAYING 狀態的物理 tick ===
function tickPlaying() {
    if (isMultiplayerMode()) {
        const players = getPlayers();
        const positions = getPlayerPositions(logicalWidth);
        players.forEach((player, index) => {
            updatePlayerJump(player, logicalWidth, logicalHeight, positions[index]);
        });
        updateCoinsMultiplayer(logicalWidth, logicalHeight, players, positions);
    } else {
        updateJump(logicalWidth, logicalHeight);
        const { characterY, squashStretch } = getCharacterState();
        updateCoins(logicalWidth, logicalHeight, characterY, squashStretch);
    }
    updateParticles();
    updateAfterImages();
    updateSpeedLines();
    updateScreenShake();
}

// === 繪製開始畫面 ===
function drawStartScreen() {
    // 只在玩家數量改變時更新 DOM
    const count = getPlayerCount();
    if (count !== cachedPlayerCount) {
        cachedPlayerCount = count;
        updateStartScreenDOM();
    }
    // Canvas: 只有星空背景（已在主迴圈繪製）
}

// === 安全建立 DOM 元素的輔助函數 ===
function createEl(tag, className, styles, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (styles) Object.assign(el.style, styles);
    if (text) el.textContent = text;
    return el;
}

// === 更新開始畫面 DOM（使用安全的 DOM 方法）===
function updateStartScreenDOM() {
    const players = getPlayers();
    const count = players.length;

    playerCountEl.textContent = `${count}/${MULTIPLAYER_CONFIG.MAX_PLAYERS} Players`;

    // 清空並重建玩家列表
    playerListEl.textContent = '';

    if (count > 0) {
        players.forEach(player => {
            const color = PLAYER_COLORS[player.colorIndex].hex;
            const entry = createEl('div', 'player-entry');
            entry.appendChild(createEl('div', 'player-color-box', { background: color }));
            entry.appendChild(createEl('span', 'player-name-text', { color: color }, player.name));
            playerListEl.appendChild(entry);
        });
        waitingMsgEl.style.display = 'none';
        startHintEl.style.display = 'block';
    } else {
        waitingMsgEl.style.display = 'block';
        waitingMsgEl.textContent = '';
        waitingMsgEl.appendChild(document.createTextNode('WAITING FOR PLAYERS...'));
        const sub = createEl('span', 'sub', {}, '(Or click START for single player)');
        waitingMsgEl.appendChild(sub);
        startHintEl.style.display = 'none';
    }

    actionButton.textContent = imageLoaded ? 'START GAME' : 'LOADING...';
}

// === 繪製倒數畫面（Canvas 只畫場景，數字由 DOM 處理）===
function drawCountdownScreen() {
    drawFloor();

    if (imageLoaded) {
        if (isMultiplayerMode()) {
            drawPlayersStatic(ctx, spritesheet, getPlayers(), logicalWidth, logicalHeight);
        } else {
            drawStaticCharacter(ctx, spritesheet, logicalWidth, logicalHeight);
        }
    }
}

// === 建立多人分數 DOM 元素（進入 PLAYING 時呼叫一次）===
function setupMultiplayerScoreDOM() {
    const players = getPlayers();
    scoreBarEl.textContent = '';

    players.forEach((player) => {
        const entry = createEl('div', 'score-entry');
        entry.appendChild(createEl('div', 'sname', { color: PLAYER_COLORS[player.colorIndex].hex }, player.name));
        const valueEl = createEl('div', 'svalue', {}, '0');
        entry.appendChild(valueEl);
        scoreBarEl.appendChild(entry);

        // 儲存 DOM 參考，方便快速更新
        player._scoreEl = valueEl;
        player._cachedTotal = 0;
    });
}

// === 渲染遊戲畫面（純繪製，物理已在 tickPlaying 處理）===
function renderPlayingScreen() {
    updatePlayingScoresDOM();

    const screenShake = getScreenShake();
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);

    drawFloor();
    if (!imageLoaded) { ctx.restore(); return; }

    drawSpeedLines(ctx);
    drawCoins(ctx, spritesheet);
    drawAfterImages(ctx, spritesheet, logicalWidth, logicalHeight);

    if (isMultiplayerMode()) {
        const players = getPlayers();
        const positions = getPlayerPositions(logicalWidth);
        players.forEach((player, index) => {
            drawPlayerCharacter(ctx, spritesheet, player, positions[index], logicalHeight);
        });
    } else {
        drawCharacter(ctx, spritesheet, logicalWidth, logicalHeight);
    }

    drawParticles(ctx);
    ctx.restore();
}

// === 更新遊戲中分數 DOM（只在值改變時寫入）===
function updatePlayingScoresDOM() {
    if (isMultiplayerMode()) {
        const players = getPlayers();
        players.forEach(player => {
            const total = player.squatCount + player.coinScore;
            if (player._cachedTotal !== total && player._scoreEl) {
                player._cachedTotal = total;
                player._scoreEl.textContent = total.toString();
            }
        });
        if (timer !== cachedTimerValue) {
            cachedTimerValue = timer;
            timerUi.textContent = `TIME: ${timer}`;
        }
    } else {
        const uiText = `SQUATS: ${squatCount} | COINS: ${getCoinScore()}`;
        if (uiText !== cachedUiText) {
            cachedUiText = uiText;
            uiDisplay.textContent = uiText;
        }
        const timerText = `TIME: ${timer}`;
        if (timerText !== cachedTimerText) {
            cachedTimerText = timerText;
            timerUi.textContent = timerText;
        }
    }
}

// === 更新遊戲結束 DOM（使用安全的 DOM 方法）===
function updateGameOverDOM() {
    gameOverContentEl.textContent = '';

    if (isMultiplayerMode()) {
        const leaderboard = getLeaderboard();
        const medals = ['1st', '2nd', '3rd', '4th'];
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888'];

        gameOverContentEl.appendChild(createEl('div', 'leaderboard-title', {}, 'LEADERBOARD'));

        leaderboard.forEach((player, rank) => {
            const total = player.squatCount + player.coinScore;
            const color = PLAYER_COLORS[player.colorIndex].hex;

            const entry = createEl('div', 'leaderboard-entry');
            entry.appendChild(createEl('span', 'rank-medal', { color: rankColors[rank] }, medals[rank]));
            entry.appendChild(createEl('div', 'player-color-box', { background: color }));
            entry.appendChild(createEl('span', 'lb-name', { color: color }, player.name));
            entry.appendChild(createEl('span', 'lb-score', {}, total.toString()));
            gameOverContentEl.appendChild(entry);
        });
    } else {
        const totalScore = finalScore + getCoinScore();
        gameOverContentEl.appendChild(createEl('div', 'single-result', {}, `TOTAL: ${totalScore}`));
        gameOverContentEl.appendChild(createEl('div', 'single-detail', {}, `Squats: ${finalScore} + Coins: ${getCoinScore()}`));
    }
}

// === 繪製地板 ===
function drawFloor() {
    const floorY = logicalHeight - SCENE_CONFIG.FLOOR_HEIGHT;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, floorY, logicalWidth, SCENE_CONFIG.FLOOR_HEIGHT);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, floorY, logicalWidth, 4);
}

// === 星空背景 ===
function setupStarfield() {
    starfield = [];
    const alphaLevels = ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.7)'];
    for (let i = 0; i < 40; i++) {
        const size = Math.random() * 2 + 1;
        starfield.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: size,
            speed: Math.random() * 0.5 + 0.1,
            color: alphaLevels[Math.min(Math.floor(size), 2)]
        });
    }
}

function tickStarfield() {
    if (starfield.length === 0) setupStarfield();
    starfield.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = logicalWidth;
            star.y = Math.random() * logicalHeight;
        }
    });
}

function renderStarfield() {
    starfield.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    });
}

// === FPS 計數器 ===
function updateFPS() {
    fpsFrameCount++;
    const now = performance.now();
    if (now - fpsLastTime >= 1000) {
        fpsEl.textContent = fpsFrameCount + ' FPS';
        fpsFrameCount = 0;
        fpsLastTime = now;
    }
}

// === 匯出給 Google Cast 使用 ===
export function handleCastMessage(data) {
    if (data === 'SQUAT_JUMP') {
        handleAction();
        return;
    }

    const { action, playerId, playerName } = data;

    switch (action) {
        case 'PLAYER_JOIN':
            if (gameState === 'START_SCREEN') {
                addPlayer(playerId, playerName);
                cachedPlayerCount = -1;
            }
            break;

        case 'PLAYER_LEAVE':
            if (gameState === 'START_SCREEN') {
                removePlayer(playerId);
                cachedPlayerCount = -1;
            }
            break;

        case 'SQUAT_JUMP':
            if (gameState === 'PLAYING') {
                if (isMultiplayerMode() && playerId) {
                    triggerPlayerJump(playerId);
                } else {
                    handleAction();
                }
            }
            break;

        case 'START_GAME':
            if (gameState === 'START_SCREEN') {
                startCountdownSequence();
            } else if (gameState === 'GAME_OVER') {
                resetPlayers();
                unlockPlayers();
                startCountdownSequence();
            }
            break;
    }
}

export function getGameState() {
    return gameState;
}

// === 匯出玩家管理函數 ===
export { addPlayer, removePlayer, getPlayers } from './players.js';
