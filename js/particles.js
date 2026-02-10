import { SCENE_CONFIG } from './constants.js';
import { randomRange } from './utils.js';

// === 粒子系統狀態 ===
let particles = [];

// === 粒子操作 ===
export function getParticles() {
    return particles;
}

export function clearParticles() {
    particles = [];
}

export function addParticle(particle) {
    particles.push(particle);
}

// === 建立落地粒子 ===
export function createLandingParticles(canvasWidth, canvasHeight, playerX = null) {
    const centerX = playerX ?? canvasWidth / 2;
    const groundY = canvasHeight - SCENE_CONFIG.FLOOR_HEIGHT - SCENE_CONFIG.CHAR_FOOT_OFFSET;

    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 6) + Math.random() * (Math.PI * 2 / 3);
        const speed = randomRange(3, 9);
        particles.push({
            x: centerX + randomRange(-20, 20),
            y: groundY,
            vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
            vy: -Math.abs(Math.sin(angle) * speed),
            life: 1,
            decay: randomRange(0.03, 0.05),
            size: randomRange(3, 7),
            color: Math.random() > 0.5 ? '#888' : '#aaa'
        });
    }
}

// === 建立金幣收集粒子 ===
export function createCoinCollectParticles(x, y, coinSize) {
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(3, 8);
        particles.push({
            x: x + coinSize / 2,
            y: y + coinSize / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            life: 1,
            decay: 0.04,
            size: randomRange(3, 7),
            color: Math.random() > 0.5 ? '#FFD700' : '#FFA500'
        });
    }
}

// === 更新粒子 ===
export function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;  // 重力
        p.life -= p.decay;
        return p.life > 0;
    });
}

// === 繪製粒子 ===
export function drawParticles(ctx) {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    });
    ctx.globalAlpha = 1;
}
