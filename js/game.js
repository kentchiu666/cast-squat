import { GAME_DURATION, COUNTDOWN_CONFIG, SCENE_CONFIG, PLAYER_COLORS, MULTIPLAYER_CONFIG, SPRITES } from './constants.js';
import { easeOutBack } from './utils.js';
import { updateParticles, drawParticles, clearParticles } from './particles.js';
import {
    updateJump,
    startJump,
    canJump,
    resetCharacter,
    getCharacterState,
    drawCharacter,
    drawStaticCharacter,
    updatePlayerJump,
    drawPlayerCharacter,
    drawPlayerPreview,
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
    getPlayerById,
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

// === 開始倒數 ===
let startCountdown = 3;
let countdownAnimTimer = 0;

// === 渲染控制 ===
let frameCount = 0;
const RENDER_EVERY = 2;  // 每 2 幀繪製 1 次（邏輯 60fps，渲染 30fps）

// === 星空背景 ===
let starfield = [];

// === Canvas 和素材 ===
let canvas, ctx, spritesheet;
let imageLoaded = false;

// === UI 元素 ===
let uiDisplay, timerUi, actionButton;

// === 初始化遊戲 ===
export function initGame(canvasElement, spritesheetImage) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    spritesheet = spritesheetImage;

    uiDisplay = document.getElementById('ui');
    timerUi = document.getElementById('timerUi');
    actionButton = document.getElementById('actionButton');

    // 監聽按鈕
    actionButton.addEventListener('click', handleAction);

    // Canvas 只在視窗大小改變時調整（避免每幀重建）
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.imageSmoothingEnabled = false;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 預渲染彩色精靈圖（消除每幀 ctx.filter）
    initColoredSpritesheets(spritesheet);

    // 等待素材載入
    if (spritesheet.complete) {
        imageLoaded = true;
    } else {
        spritesheet.onload = () => {
            imageLoaded = true;
        };
    }
}

// === 開始遊戲迴圈 ===
export function startGameLoop() {
    requestAnimationFrame(draw);
}

// === 判斷是否為多人模式 ===
function isMultiplayerMode() {
    return getPlayerCount() > 0;
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
            // 單人模式：直接跳躍
            // 多人模式：需要指定玩家 ID（由 Cast 訊息處理）
            if (!isMultiplayerMode()) {
                triggerJump();
            }
            break;
        case 'GAME_OVER':
            // 重置並回到開始畫面
            resetPlayers();
            unlockPlayers();
            gameState = 'START_SCREEN';
            break;
    }
}

// === 開始倒數 ===
function startCountdownSequence() {
    gameState = 'COUNTDOWN';
    startCountdown = 3;
    countdownAnimTimer = 0;

    // 鎖定玩家列表（多人模式）
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
}

// === 開始遊戲 ===
function startGame() {
    gameState = 'PLAYING';

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (timer > 0) timer--;
        if (timer <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            finalScore = squatCount;
            gameState = 'GAME_OVER';
        }
    }, 1000);
}

// === 觸發跳躍 ===
function triggerJump() {
    if (startJump()) {
        squatCount++;
    }
}

// === 主迴圈（邏輯 60fps，渲染 30fps）===
function draw() {
    requestAnimationFrame(draw);

    // PLAYING 時每幀更新邏輯（保持跳躍手感）
    if (gameState === 'PLAYING') {
        updateGameLogic();
    }

    // 渲染每 2 幀執行一次（30fps）
    frameCount++;
    if (frameCount % RENDER_EVERY !== 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStarfield();

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
            drawGameOverScreen();
            break;
    }
}

// === 繪製開始畫面（等候室）===
function drawStartScreen() {
    const players = getPlayers();
    const playerCount = getPlayerCount();

    actionButton.innerText = imageLoaded ? "START GAME" : "LOADING...";
    uiDisplay.innerText = "";
    timerUi.innerText = "";

    ctx.fillStyle = 'white';
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = 'center';

    // 標題
    ctx.fillText("Squat Jump", canvas.width / 2, 100);

    // 玩家計數
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillStyle = '#888';
    ctx.fillText(`${playerCount}/${MULTIPLAYER_CONFIG.MAX_PLAYERS} Players`, canvas.width / 2, 160);

    if (imageLoaded) {
        // 繪製玩家列表
        if (playerCount > 0) {
            const startY = 220;
            const spacing = 80;

            players.forEach((player, index) => {
                const y = startY + index * spacing;

                // 繪製角色預覽
                drawPlayerPreview(ctx, spritesheet, player, canvas.width / 2 - 120, y);

                // 繪製玩家名稱（使用玩家顏色）
                ctx.fillStyle = PLAYER_COLORS[player.colorIndex].hex;
                ctx.font = "16px 'Press Start 2P'";
                ctx.textAlign = 'left';
                ctx.fillText(player.name, canvas.width / 2 - 60, y + 8);
                ctx.textAlign = 'center';
            });

            // 提示開始
            ctx.fillStyle = '#95E86B';
            ctx.font = "18px 'Press Start 2P'";
            ctx.fillText("CLICK TO START", canvas.width / 2, canvas.height - 150);
        } else {
            // 等待玩家加入
            ctx.fillStyle = '#888';
            ctx.font = "18px 'Press Start 2P'";
            ctx.fillText("WAITING FOR PLAYERS...", canvas.width / 2, canvas.height / 2);
            ctx.font = "14px 'Press Start 2P'";
            ctx.fillText("(Or click START for single player)", canvas.width / 2, canvas.height / 2 + 40);
        }
    }
}

// === 繪製倒數畫面 ===
function drawCountdownScreen() {
    actionButton.innerText = "GET READY!";
    uiDisplay.innerText = "";
    timerUi.innerText = "";

    // 繪製場景
    drawFloor();

    // 繪製靜止角色
    if (imageLoaded) {
        if (isMultiplayerMode()) {
            // 多人模式：繪製所有玩家角色
            drawPlayersStatic(ctx, spritesheet, getPlayers(), canvas.width, canvas.height);
        } else {
            // 單人模式：繪製單一角色
            drawStaticCharacter(ctx, spritesheet, canvas.width, canvas.height);
        }
    }

    // 更新倒數動畫計時器
    countdownAnimTimer++;
    const animProgress = countdownAnimTimer / COUNTDOWN_CONFIG.ANIM_DURATION;

    // 繪製倒數數字
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const scaleProgress = easeOutBack(Math.min(animProgress * 2, 1));
    const baseScale = 1.5 - scaleProgress * 0.5;

    const alpha = animProgress > 0.7 ? 1 - (animProgress - 0.7) / 0.3 : 1;
    ctx.globalAlpha = alpha;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(baseScale, baseScale);

    const displayText = startCountdown > 0 ? startCountdown.toString() : "GO!";
    const fontSize = startCountdown > 0 ? 120 : 80;
    ctx.font = `${fontSize}px 'Press Start 2P'`;

    if (startCountdown === 3) ctx.fillStyle = '#FF6B6B';
    else if (startCountdown === 2) ctx.fillStyle = '#FFE66D';
    else if (startCountdown === 1) ctx.fillStyle = '#4ECDC4';
    else ctx.fillStyle = '#95E86B';

    ctx.fillText(displayText, 0, 0);
    ctx.restore();

    // 檢查是否進入下一個數字
    if (countdownAnimTimer >= COUNTDOWN_CONFIG.ANIM_DURATION) {
        countdownAnimTimer = 0;
        startCountdown--;

        if (startCountdown < 0) {
            startGame();
        }
    }
}

// === 遊戲邏輯更新（每幀 60fps）===
function updateGameLogic() {
    if (isMultiplayerMode()) {
        const players = getPlayers();
        const positions = getPlayerPositions(canvas.width);

        players.forEach((player, index) => {
            updatePlayerJump(player, canvas.width, canvas.height, positions[index]);
        });

        updateCoinsMultiplayer(canvas.width, canvas.height, players, positions);
    } else {
        updateJump(canvas.width, canvas.height);
        const { characterY, squashStretch } = getCharacterState();
        updateCoins(canvas.width, canvas.height, characterY, squashStretch);
    }

    updateParticles();
    updateAfterImages();
    updateSpeedLines();
    updateScreenShake();
}

// === 遊戲畫面渲染（30fps）===
function renderPlayingScreen() {
    actionButton.innerText = "JUMP!";

    if (isMultiplayerMode()) {
        uiDisplay.innerText = "";
        timerUi.innerText = `TIME: ${timer}`;

        const players = getPlayers();
        const positions = getPlayerPositions(canvas.width);

        const screenShake = getScreenShake();
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);

        drawFloor();

        if (!imageLoaded) {
            ctx.restore();
            return;
        }

        drawSpeedLines(ctx);
        drawCoins(ctx, spritesheet);
        drawAfterImages(ctx, spritesheet, canvas.width, canvas.height);

        players.forEach((player, index) => {
            drawPlayerCharacter(ctx, spritesheet, player, positions[index], canvas.height);
        });

        drawParticles(ctx);
        ctx.restore();

        drawPlayerScores(players);
    } else {
        uiDisplay.innerText = `SQUATS: ${squatCount} | COINS: ${getCoinScore()}`;
        timerUi.innerText = `TIME: ${timer}`;

        const screenShake = getScreenShake();
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);

        drawFloor();

        if (!imageLoaded) {
            ctx.restore();
            return;
        }

        drawSpeedLines(ctx);
        drawCoins(ctx, spritesheet);
        drawAfterImages(ctx, spritesheet, canvas.width, canvas.height);
        drawCharacter(ctx, spritesheet, canvas.width, canvas.height);
        drawParticles(ctx);

        ctx.restore();
    }
}

// === 繪製各玩家分數（多人模式）===
function drawPlayerScores(players) {
    const spacing = canvas.width / (players.length + 1);

    ctx.font = "14px 'Press Start 2P'";
    ctx.textAlign = 'center';

    players.forEach((player, index) => {
        const x = spacing * (index + 1);
        const total = player.squatCount + player.coinScore;
        const colorInfo = PLAYER_COLORS[player.colorIndex];

        // 玩家名稱
        ctx.fillStyle = colorInfo.hex;
        ctx.fillText(player.name, x, 30);

        // 分數
        ctx.fillStyle = 'white';
        ctx.fillText(`${total}`, x, 55);
    });
}

// === 繪製結束畫面 ===
function drawGameOverScreen() {
    actionButton.innerText = "RESTART";
    uiDisplay.innerText = "";
    timerUi.innerText = "";

    ctx.fillStyle = 'white';
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = 'center';
    ctx.fillText("GAME OVER!", canvas.width / 2, 100);

    if (isMultiplayerMode()) {
        // 多人模式：顯示排行榜
        const leaderboard = getLeaderboard();
        const medals = ['1st', '2nd', '3rd', '4th'];

        ctx.font = "24px 'Press Start 2P'";
        ctx.fillText("LEADERBOARD", canvas.width / 2, 180);

        leaderboard.forEach((player, rank) => {
            const y = 250 + rank * 70;
            const total = player.squatCount + player.coinScore;
            const colorInfo = PLAYER_COLORS[player.colorIndex];

            // 名次顏色
            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888'];
            ctx.fillStyle = rankColors[rank] || '#888';
            ctx.font = "18px 'Press Start 2P'";
            ctx.textAlign = 'right';
            ctx.fillText(medals[rank], canvas.width / 2 - 120, y);

            // 角色預覽
            if (imageLoaded) {
                drawPlayerPreview(ctx, spritesheet, player, canvas.width / 2 - 80, y - 15);
            }

            // 玩家名稱
            ctx.fillStyle = colorInfo.hex;
            ctx.textAlign = 'left';
            ctx.fillText(player.name, canvas.width / 2 - 40, y);

            // 分數
            ctx.fillStyle = 'white';
            ctx.textAlign = 'right';
            ctx.fillText(`${total}`, canvas.width / 2 + 150, y);

            ctx.textAlign = 'center';
        });
    } else {
        // 單人模式：顯示分數
        const totalScore = finalScore + getCoinScore();
        ctx.font = "32px 'Press Start 2P'";
        ctx.fillText(`TOTAL: ${totalScore}`, canvas.width / 2, canvas.height / 2);

        ctx.font = "18px 'Press Start 2P'";
        ctx.fillText(`Squats: ${finalScore} + Coins: ${getCoinScore()}`, canvas.width / 2, canvas.height / 2 + 50);
    }
}

// === 繪製地板 ===
function drawFloor() {
    const floorY = canvas.height - SCENE_CONFIG.FLOOR_HEIGHT;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, floorY, canvas.width, SCENE_CONFIG.FLOOR_HEIGHT);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, floorY, canvas.width, 4);
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

function drawStarfield() {
    if (starfield.length === 0) setupStarfield();

    starfield.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
        ctx.fillStyle = star.color;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    });
}

// === 匯出給 Google Cast 使用 ===
export function handleCastMessage(data) {
    // 相容舊格式
    if (data === 'SQUAT_JUMP') {
        handleAction();
        return;
    }

    // 新格式：{ action, playerId, playerName }
    const { action, playerId, playerName } = data;

    switch (action) {
        case 'PLAYER_JOIN':
            if (gameState === 'START_SCREEN') {
                addPlayer(playerId, playerName);
            }
            break;

        case 'PLAYER_LEAVE':
            if (gameState === 'START_SCREEN') {
                removePlayer(playerId);
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
                gameState = 'START_SCREEN';
                startCountdownSequence();
            }
            break;
    }
}

export function getGameState() {
    return gameState;
}

// === 匯出玩家管理函數給外部使用（用於本地測試）===
export { addPlayer, removePlayer, getPlayers } from './players.js';
