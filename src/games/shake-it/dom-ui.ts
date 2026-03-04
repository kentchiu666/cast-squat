import type { ShakePlayer } from '../../types/game'
import { PLAYER_COLORS, MULTIPLAYER_CONFIG } from './constants'

// === DOM 元素參考 ===
interface GameDOMElements {
  container: HTMLElement
  styleEl: HTMLStyleElement
  startScreen: HTMLElement
  playerCount: HTMLElement
  playerList: HTMLElement
  waitingMsg: HTMLElement
  startHint: HTMLElement
  countdownNum: HTMLElement
  timerUi: HTMLElement
  resultPendingScreen: HTMLElement
  resultPlayerList: HTMLElement
  resultCountdown: HTMLElement
  gameOverScreen: HTMLElement
  gameOverContent: HTMLElement
  actionButton: HTMLButtonElement
}

let elements: GameDOMElements | null = null

// === DOM 更新快取 ===
let cachedPlayerCount = -1
let cachedTimerValue = -1

function resetCaches(): void {
  cachedPlayerCount = -1
  cachedTimerValue = -1
}

// === 建立元素輔助函數 ===
function createEl(
  tag: string,
  className?: string,
  styles?: Partial<CSSStyleDeclaration>,
  text?: string,
): HTMLElement {
  const el = document.createElement(tag)
  if (className) el.className = className
  if (styles) Object.assign(el.style, styles)
  if (text) el.textContent = text
  return el
}

// === 建立遊戲 DOM ===
export function createGameDOM(container: HTMLElement, onAction: () => void): void {
  const styleEl = document.createElement('style')
  styleEl.textContent = getGameStyles()
  document.head.appendChild(styleEl)

  container.innerHTML = ''

  // 開始畫面
  const startScreen = createEl('div', 'shake-start-screen')
  startScreen.appendChild(createEl('div', 'shake-title', undefined, 'Shake It!'))
  const playerCount = createEl('div', 'shake-player-count')
  const playerList = createEl('div', 'shake-player-list')
  const waitingMsg = createEl('div', 'shake-waiting-msg')
  const startHint = createEl('div', 'shake-start-hint', undefined, 'CLICK TO START')
  startScreen.appendChild(playerCount)
  startScreen.appendChild(playerList)
  startScreen.appendChild(waitingMsg)
  startScreen.appendChild(startHint)
  container.appendChild(startScreen)

  // 倒數數字
  const countdownNum = createEl('div', 'shake-countdown-num')
  container.appendChild(countdownNum)

  // 計時器（盲玩用大字）
  const timerUi = createEl('div', 'shake-timer-ui')
  container.appendChild(timerUi)

  // 等待結果畫面
  const resultPendingScreen = createEl('div', 'shake-result-pending')
  resultPendingScreen.appendChild(createEl('div', 'shake-result-pending-title', undefined, 'COLLECTING RESULTS...'))
  const resultPlayerList = createEl('div', 'shake-result-player-list')
  resultPendingScreen.appendChild(resultPlayerList)
  const resultCountdown = createEl('div', 'shake-result-countdown')
  resultPendingScreen.appendChild(resultCountdown)
  container.appendChild(resultPendingScreen)

  // 遊戲結束畫面
  const gameOverScreen = createEl('div', 'shake-game-over-screen')
  gameOverScreen.appendChild(createEl('div', 'shake-title', undefined, 'GAME OVER!'))
  const gameOverContent = createEl('div', 'shake-game-over-content')
  gameOverScreen.appendChild(gameOverContent)
  container.appendChild(gameOverScreen)

  // 操作按鈕
  const actionButton = document.createElement('button')
  actionButton.className = 'shake-action-btn'
  actionButton.textContent = 'LOADING...'
  actionButton.addEventListener('click', onAction)
  container.appendChild(actionButton)

  elements = {
    container,
    styleEl,
    startScreen,
    playerCount,
    playerList,
    waitingMsg,
    startHint,
    countdownNum,
    timerUi,
    resultPendingScreen,
    resultPlayerList,
    resultCountdown,
    gameOverScreen,
    gameOverContent,
    actionButton,
  }
}

// === 銷毀遊戲 DOM ===
export function destroyGameDOM(): void {
  if (!elements) return
  elements.styleEl.remove()
  elements.container.innerHTML = ''
  elements = null
  resetCaches()
}

// === 狀態切換 DOM ===
export function showStartScreen(): void {
  if (!elements) return
  elements.startScreen.style.display = 'block'
  elements.countdownNum.style.display = 'none'
  elements.countdownNum.classList.remove('shake-pop')
  elements.timerUi.textContent = ''
  elements.resultPendingScreen.style.display = 'none'
  elements.gameOverScreen.style.display = 'none'
  elements.actionButton.textContent = 'START GAME'
  cachedPlayerCount = -1
}

export function showCountdown(): void {
  if (!elements) return
  elements.startScreen.style.display = 'none'
  elements.countdownNum.style.display = 'none'
  elements.countdownNum.classList.remove('shake-pop')
  elements.timerUi.textContent = ''
  elements.resultPendingScreen.style.display = 'none'
  elements.gameOverScreen.style.display = 'none'
  elements.actionButton.textContent = 'GET READY!'
}

export function showPlaying(): void {
  if (!elements) return
  elements.startScreen.style.display = 'none'
  elements.countdownNum.style.display = 'none'
  elements.countdownNum.classList.remove('shake-pop')
  elements.resultPendingScreen.style.display = 'none'
  elements.gameOverScreen.style.display = 'none'
  elements.actionButton.textContent = 'SHAKE!'
  cachedTimerValue = -1
}

export function showResultPending(players: ShakePlayer[]): void {
  if (!elements) return
  elements.startScreen.style.display = 'none'
  elements.countdownNum.style.display = 'none'
  elements.timerUi.textContent = ''
  elements.resultPendingScreen.style.display = 'block'
  elements.gameOverScreen.style.display = 'none'
  elements.actionButton.textContent = 'WAITING...'

  // 建立玩家提交狀態列表
  elements.resultPlayerList.textContent = ''
  for (const player of players) {
    const color = PLAYER_COLORS[player.colorIndex]?.hex ?? '#FFF'
    const entry = createEl('div', 'shake-result-entry')
    const statusIcon = createEl('span', 'shake-result-status', undefined, '...')
    statusIcon.dataset.playerId = player.id
    entry.appendChild(statusIcon)
    entry.appendChild(createEl('span', 'shake-result-name', { color }, player.name))
    elements.resultPlayerList.appendChild(entry)
  }
}

export function showGameOver(): void {
  if (!elements) return
  elements.startScreen.style.display = 'none'
  elements.countdownNum.style.display = 'none'
  elements.countdownNum.classList.remove('shake-pop')
  elements.timerUi.textContent = ''
  elements.resultPendingScreen.style.display = 'none'
  elements.gameOverScreen.style.display = 'block'
  elements.actionButton.textContent = 'RESTART'
}

// === 倒數動畫 ===
export function triggerCountdownPop(text: string, color: string, fontSize: string): void {
  if (!elements) return
  const el = elements.countdownNum
  el.textContent = text
  el.style.color = color
  el.style.fontSize = fontSize
  el.style.display = ''
  el.classList.remove('shake-pop')
  void el.offsetWidth
  el.classList.add('shake-pop')
}

// === 更新計時器 ===
export function updateTimer(timer: number): void {
  if (!elements) return
  if (timer !== cachedTimerValue) {
    cachedTimerValue = timer
    elements.timerUi.textContent = `${timer}`
  }
}

// === 更新 RESULT_PENDING 畫面 ===
export function updateResultPendingPlayer(playerId: string): void {
  if (!elements) return
  const statusEl = elements.resultPlayerList.querySelector(`[data-player-id="${playerId}"]`)
  if (statusEl) {
    statusEl.textContent = '✓'
    statusEl.classList.add('shake-result-done')
  }
}

export function updateResultCountdown(seconds: number): void {
  if (!elements) return
  elements.resultCountdown.textContent = `Timeout in ${seconds}s`
}

// === 更新開始畫面玩家列表 ===
export function updatePlayerList(players: ShakePlayer[]): void {
  if (!elements) return
  const count = players.length

  if (count === cachedPlayerCount) return
  cachedPlayerCount = count

  elements.playerCount.textContent = `${count}/${MULTIPLAYER_CONFIG.MAX_PLAYERS} Players`
  elements.playerList.textContent = ''

  if (count > 0) {
    for (const player of players) {
      const color = PLAYER_COLORS[player.colorIndex]?.hex ?? '#FFF'
      const entry = createEl('div', 'shake-player-entry')
      entry.appendChild(createEl('div', 'shake-player-color-box', { background: color }))
      entry.appendChild(createEl('span', 'shake-player-name-text', { color }, player.name))
      elements.playerList.appendChild(entry)
    }
    elements.waitingMsg.style.display = 'none'
    elements.startHint.style.display = 'block'
  } else {
    elements.waitingMsg.style.display = 'block'
    elements.waitingMsg.textContent = ''
    elements.waitingMsg.appendChild(document.createTextNode('WAITING FOR PLAYERS...'))
    const sub = createEl('span', 'shake-sub', undefined, '(Or click START for single player)')
    elements.waitingMsg.appendChild(sub)
    elements.startHint.style.display = 'none'
  }

  elements.actionButton.textContent = 'START GAME'
}

// === 更新遊戲結束內容 ===
export function updateGameOverContent(
  isMultiplayer: boolean,
  leaderboard: ShakePlayer[],
  finalScore: number,
): void {
  if (!elements) return
  elements.gameOverContent.textContent = ''

  if (isMultiplayer) {
    const medals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#888', '#888', '#888', '#888']

    elements.gameOverContent.appendChild(
      createEl('div', 'shake-leaderboard-title', undefined, 'LEADERBOARD'),
    )

    for (let rank = 0; rank < leaderboard.length; rank++) {
      const player = leaderboard[rank]!
      const color = PLAYER_COLORS[player.colorIndex]?.hex ?? '#FFF'

      const entry = createEl('div', 'shake-leaderboard-entry')
      entry.appendChild(
        createEl('span', 'shake-rank-medal', { color: rankColors[rank] ?? '#888' }, medals[rank] ?? ''),
      )
      entry.appendChild(createEl('div', 'shake-player-color-box', { background: color }))
      entry.appendChild(createEl('span', 'shake-lb-name', { color }, player.name))
      entry.appendChild(createEl('span', 'shake-lb-score', undefined, player.score.toString()))
      elements.gameOverContent.appendChild(entry)
    }
  } else {
    elements.gameOverContent.appendChild(
      createEl('div', 'shake-single-result', undefined, `TOTAL SHAKES: ${finalScore}`),
    )
  }
}

// === CSS 樣式 ===
function getGameStyles(): string {
  return `
/* === Shake It! Game UI === */
.shake-start-screen {
  display: none;
  width: 100%;
  text-align: center;
  padding-top: 60px;
}
.shake-title {
  font-size: 48px;
  color: white;
  font-family: 'Press Start 2P', cursive;
}
.shake-player-count {
  font-size: 20px;
  color: #888;
  margin-top: 20px;
  font-family: 'Press Start 2P', cursive;
}
.shake-player-list {
  margin-top: 30px;
}
.shake-player-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
}
.shake-player-color-box {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}
.shake-player-name-text {
  font-size: 16px;
  font-family: 'Press Start 2P', cursive;
}
.shake-waiting-msg {
  margin-top: 40px;
  font-size: 18px;
  color: #888;
  line-height: 2;
  font-family: 'Press Start 2P', cursive;
}
.shake-sub {
  font-size: 14px;
  display: block;
  margin-top: 10px;
}
.shake-start-hint {
  display: none;
  position: absolute;
  bottom: 120px;
  width: 100%;
  text-align: center;
  font-size: 18px;
  color: #4ECDC4;
  font-family: 'Press Start 2P', cursive;
}

/* 倒數 */
.shake-countdown-num {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 120px;
  font-family: 'Press Start 2P', cursive;
  z-index: 10;
}
.shake-countdown-num.shake-pop {
  display: block;
  animation: shakeCountdownPop 1s ease-out forwards;
}
@keyframes shakeCountdownPop {
  0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
  60% { transform: translate(-50%, -50%) scale(0.97); opacity: 1; }
  75% { transform: translate(-50%, -50%) scale(1.02); opacity: 1; }
  85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}

/* 計時器（盲玩時大字置中）*/
.shake-timer-ui {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.3);
  font-size: 160px;
  font-family: 'Press Start 2P', cursive;
  z-index: 1;
}

/* 等待結果畫面 */
.shake-result-pending {
  display: none;
  width: 100%;
  text-align: center;
  padding-top: 80px;
}
.shake-result-pending-title {
  font-size: 24px;
  color: #4ECDC4;
  font-family: 'Press Start 2P', cursive;
  animation: shakePulse 1.5s ease-in-out infinite;
}
@keyframes shakePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.shake-result-player-list {
  margin-top: 40px;
}
.shake-result-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 12px 0;
  font-family: 'Press Start 2P', cursive;
}
.shake-result-status {
  width: 40px;
  font-size: 20px;
  color: #888;
}
.shake-result-status.shake-result-done {
  color: #95E86B;
}
.shake-result-name {
  font-size: 16px;
}
.shake-result-countdown {
  margin-top: 30px;
  font-size: 14px;
  color: #888;
  font-family: 'Press Start 2P', cursive;
}

/* 操作按鈕 */
.shake-action-btn {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 20px 40px;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
  background-color: #4ECDC4;
  color: white;
  border: none;
  cursor: pointer;
  image-rendering: pixelated;
  z-index: 20;
  pointer-events: auto;
}
.shake-action-btn:hover {
  background-color: #6EE7DE;
}
.shake-action-btn:active {
  transform: translateX(-50%) scale(0.95);
}

/* 遊戲結束 */
.shake-game-over-screen {
  display: none;
  width: 100%;
  text-align: center;
  padding-top: 60px;
}
.shake-game-over-content {
  margin-top: 40px;
}
.shake-leaderboard-title {
  font-size: 24px;
  color: white;
  margin-bottom: 30px;
  font-family: 'Press Start 2P', cursive;
}
.shake-leaderboard-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 12px 0;
  font-size: 16px;
  font-family: 'Press Start 2P', cursive;
}
.shake-rank-medal {
  width: 60px;
  text-align: right;
}
.shake-lb-name {
  width: 120px;
  text-align: left;
}
.shake-lb-score {
  width: 60px;
  text-align: right;
  color: white;
}
.shake-single-result {
  font-size: 32px;
  color: white;
  margin-top: 60px;
  font-family: 'Press Start 2P', cursive;
}
`
}
