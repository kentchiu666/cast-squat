import type { Player } from '../../types/game'
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
  scoreBar: HTMLElement
  ui: HTMLElement
  timerUi: HTMLElement
  actionButton: HTMLButtonElement
  gameOverScreen: HTMLElement
  gameOverContent: HTMLElement
}

let elements: GameDOMElements | null = null

// === DOM 更新快取 ===
let cachedPlayerCount = -1
let cachedUiText = ''
let cachedTimerText = ''
let cachedTimerValue = -1

function resetCaches(): void {
  cachedPlayerCount = -1
  cachedUiText = ''
  cachedTimerText = ''
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
  // 注入 CSS
  const styleEl = document.createElement('style')
  styleEl.textContent = getGameStyles()
  document.head.appendChild(styleEl)

  // 清空容器
  container.innerHTML = ''

  // 開始畫面
  const startScreen = createEl('div', 'squat-start-screen')
  startScreen.appendChild(createEl('div', 'squat-title', undefined, 'Squat Jump'))
  const playerCount = createEl('div', 'squat-player-count')
  const playerList = createEl('div', 'squat-player-list')
  const waitingMsg = createEl('div', 'squat-waiting-msg')
  const startHint = createEl('div', 'squat-start-hint', undefined, 'CLICK TO START')
  startScreen.appendChild(playerCount)
  startScreen.appendChild(playerList)
  startScreen.appendChild(waitingMsg)
  startScreen.appendChild(startHint)
  container.appendChild(startScreen)

  // 倒數數字
  const countdownNum = createEl('div', 'squat-countdown-num')
  container.appendChild(countdownNum)

  // 多人分數欄
  const scoreBar = createEl('div', 'squat-score-bar')
  container.appendChild(scoreBar)

  // 單人 UI
  const ui = createEl('div', 'squat-ui')
  container.appendChild(ui)

  // 計時器
  const timerUi = createEl('div', 'squat-timer-ui')
  container.appendChild(timerUi)

  // 遊戲結束畫面
  const gameOverScreen = createEl('div', 'squat-game-over-screen')
  gameOverScreen.appendChild(createEl('div', 'squat-title', undefined, 'GAME OVER!'))
  const gameOverContent = createEl('div', 'squat-game-over-content')
  gameOverScreen.appendChild(gameOverContent)
  container.appendChild(gameOverScreen)

  // 操作按鈕
  const actionButton = document.createElement('button')
  actionButton.className = 'squat-action-btn'
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
    scoreBar,
    ui,
    timerUi,
    actionButton,
    gameOverScreen,
    gameOverContent,
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
  elements.countdownNum.classList.remove('squat-pop')
  elements.scoreBar.style.display = 'none'
  elements.gameOverScreen.style.display = 'none'
  elements.ui.textContent = ''
  elements.timerUi.textContent = ''
  elements.actionButton.textContent = 'START GAME'
  cachedPlayerCount = -1
  cachedUiText = ''
  cachedTimerText = ''
}

export function showCountdown(): void {
  if (!elements) return
  elements.startScreen.style.display = 'none'
  elements.countdownNum.style.display = 'none'
  elements.countdownNum.classList.remove('squat-pop')
  elements.scoreBar.style.display = 'none'
  elements.gameOverScreen.style.display = 'none'
  elements.ui.textContent = ''
  elements.timerUi.textContent = ''
  elements.actionButton.textContent = 'GET READY!'
  cachedUiText = ''
  cachedTimerText = ''
}

export function showPlaying(isMultiplayer: boolean, players: Player[]): void {
  if (!elements) return
  elements.startScreen.style.display = 'none'
  elements.countdownNum.style.display = 'none'
  elements.countdownNum.classList.remove('squat-pop')
  elements.gameOverScreen.style.display = 'none'
  elements.actionButton.textContent = 'JUMP!'
  cachedTimerValue = -1
  cachedUiText = ''
  cachedTimerText = ''

  if (isMultiplayer) {
    elements.scoreBar.style.display = 'block'
    elements.ui.textContent = ''
    setupMultiplayerScoreDOM(players)
  } else {
    elements.scoreBar.style.display = 'none'
  }
}

export function showGameOver(): void {
  if (!elements) return
  elements.startScreen.style.display = 'none'
  elements.countdownNum.style.display = 'none'
  elements.countdownNum.classList.remove('squat-pop')
  elements.scoreBar.style.display = 'none'
  elements.gameOverScreen.style.display = 'block'
  elements.ui.textContent = ''
  elements.timerUi.textContent = ''
  elements.actionButton.textContent = 'RESTART'
  cachedUiText = ''
  cachedTimerText = ''
}

// === 倒數動畫 ===
export function triggerCountdownPop(text: string, color: string, fontSize: string): void {
  if (!elements) return
  const el = elements.countdownNum
  el.textContent = text
  el.style.color = color
  el.style.fontSize = fontSize
  el.style.display = ''
  el.classList.remove('squat-pop')
  void el.offsetWidth // 強制 reflow 以重啟動畫
  el.classList.add('squat-pop')
}

// === 多人分數 DOM ===
function setupMultiplayerScoreDOM(players: Player[]): void {
  if (!elements) return
  elements.scoreBar.textContent = ''

  for (const player of players) {
    const color = PLAYER_COLORS[player.colorIndex]?.hex ?? '#FFF'
    const entry = createEl('div', 'squat-score-entry')
    entry.appendChild(createEl('div', 'squat-sname', { color }, player.name))
    const valueEl = createEl('div', 'squat-svalue', undefined, '0')
    entry.appendChild(valueEl)
    elements.scoreBar.appendChild(entry)

    player._scoreEl = valueEl
    player._cachedTotal = 0
  }
}

// === 更新遊戲中分數 ===
export function updatePlayingScores(
  isMultiplayer: boolean,
  players: Player[],
  squatCount: number,
  coinScore: number,
  timer: number,
): void {
  if (!elements) return

  if (isMultiplayer) {
    for (const player of players) {
      const total = player.squatCount + player.coinScore
      if (player._cachedTotal !== total && player._scoreEl) {
        player._cachedTotal = total
        player._scoreEl.textContent = total.toString()
      }
    }
    if (timer !== cachedTimerValue) {
      cachedTimerValue = timer
      elements.timerUi.textContent = `TIME: ${timer}`
    }
  } else {
    const uiText = `SQUATS: ${squatCount} | COINS: ${coinScore}`
    if (uiText !== cachedUiText) {
      cachedUiText = uiText
      elements.ui.textContent = uiText
    }
    const timerText = `TIME: ${timer}`
    if (timerText !== cachedTimerText) {
      cachedTimerText = timerText
      elements.timerUi.textContent = timerText
    }
  }
}

// === 更新開始畫面玩家列表 ===
export function updatePlayerList(players: Player[]): void {
  if (!elements) return
  const count = players.length

  if (count === cachedPlayerCount) return
  cachedPlayerCount = count

  elements.playerCount.textContent = `${count}/${MULTIPLAYER_CONFIG.MAX_PLAYERS} Players`
  elements.playerList.textContent = ''

  if (count > 0) {
    for (const player of players) {
      const color = PLAYER_COLORS[player.colorIndex]?.hex ?? '#FFF'
      const entry = createEl('div', 'squat-player-entry')
      entry.appendChild(createEl('div', 'squat-player-color-box', { background: color }))
      entry.appendChild(createEl('span', 'squat-player-name-text', { color }, player.name))
      elements.playerList.appendChild(entry)
    }
    elements.waitingMsg.style.display = 'none'
    elements.startHint.style.display = 'block'
  } else {
    elements.waitingMsg.style.display = 'block'
    elements.waitingMsg.textContent = ''
    elements.waitingMsg.appendChild(document.createTextNode('WAITING FOR PLAYERS...'))
    const sub = createEl('span', 'squat-sub', undefined, '(Or click START for single player)')
    elements.waitingMsg.appendChild(sub)
    elements.startHint.style.display = 'none'
  }

  elements.actionButton.textContent = 'START GAME'
}

// === 更新遊戲結束內容 ===
export function updateGameOverContent(
  isMultiplayer: boolean,
  leaderboard: Player[],
  finalScore: number,
  coinScore: number,
): void {
  if (!elements) return
  elements.gameOverContent.textContent = ''

  if (isMultiplayer) {
    const medals = ['1st', '2nd', '3rd', '4th']
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888']

    elements.gameOverContent.appendChild(
      createEl('div', 'squat-leaderboard-title', undefined, 'LEADERBOARD'),
    )

    for (let rank = 0; rank < leaderboard.length; rank++) {
      const player = leaderboard[rank]!
      const total = player.squatCount + player.coinScore
      const color = PLAYER_COLORS[player.colorIndex]?.hex ?? '#FFF'

      const entry = createEl('div', 'squat-leaderboard-entry')
      entry.appendChild(
        createEl('span', 'squat-rank-medal', { color: rankColors[rank] ?? '#888' }, medals[rank] ?? ''),
      )
      entry.appendChild(createEl('div', 'squat-player-color-box', { background: color }))
      entry.appendChild(createEl('span', 'squat-lb-name', { color }, player.name))
      entry.appendChild(createEl('span', 'squat-lb-score', undefined, total.toString()))
      elements.gameOverContent.appendChild(entry)
    }
  } else {
    const totalScore = finalScore + coinScore
    elements.gameOverContent.appendChild(
      createEl('div', 'squat-single-result', undefined, `TOTAL: ${totalScore}`),
    )
    elements.gameOverContent.appendChild(
      createEl('div', 'squat-single-detail', undefined, `Squats: ${finalScore} + Coins: ${coinScore}`),
    )
  }
}

// === CSS 樣式 ===
function getGameStyles(): string {
  return `
/* === Squat Jump Game UI === */
.squat-start-screen {
  display: none;
  width: 100%;
  text-align: center;
  padding-top: 60px;
}
.squat-title {
  font-size: 48px;
  color: white;
  font-family: 'Press Start 2P', cursive;
}
.squat-player-count {
  font-size: 20px;
  color: #888;
  margin-top: 20px;
  font-family: 'Press Start 2P', cursive;
}
.squat-player-list {
  margin-top: 30px;
}
.squat-player-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
}
.squat-player-color-box {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}
.squat-player-name-text {
  font-size: 16px;
  font-family: 'Press Start 2P', cursive;
}
.squat-waiting-msg {
  margin-top: 40px;
  font-size: 18px;
  color: #888;
  line-height: 2;
  font-family: 'Press Start 2P', cursive;
}
.squat-sub {
  font-size: 14px;
  display: block;
  margin-top: 10px;
}
.squat-start-hint {
  display: none;
  position: absolute;
  bottom: 120px;
  width: 100%;
  text-align: center;
  font-size: 18px;
  color: #95E86B;
  font-family: 'Press Start 2P', cursive;
}

/* 倒數 */
.squat-countdown-num {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 120px;
  font-family: 'Press Start 2P', cursive;
  z-index: 10;
}
.squat-countdown-num.squat-pop {
  display: block;
  animation: squatCountdownPop 1s ease-out forwards;
}
@keyframes squatCountdownPop {
  0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
  60% { transform: translate(-50%, -50%) scale(0.97); opacity: 1; }
  75% { transform: translate(-50%, -50%) scale(1.02); opacity: 1; }
  85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}

/* 多人分數 */
.squat-score-bar {
  display: none;
  position: absolute;
  top: 10px;
  left: 0;
  width: 100%;
  text-align: center;
  font-family: 'Press Start 2P', cursive;
}
.squat-score-entry {
  display: inline-block;
  margin: 0 20px;
  text-align: center;
}
.squat-sname {
  font-size: 14px;
}
.squat-svalue {
  font-size: 14px;
  color: white;
  margin-top: 5px;
}

/* 單人 UI */
.squat-ui {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
}
.squat-timer-ui {
  position: absolute;
  top: 20px;
  right: 20px;
  color: white;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
}

/* 操作按鈕 */
.squat-action-btn {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 20px 40px;
  font-size: 24px;
  font-family: 'Press Start 2P', cursive;
  background-color: #e94560;
  color: white;
  border: none;
  cursor: pointer;
  image-rendering: pixelated;
  z-index: 20;
  pointer-events: auto;
}
.squat-action-btn:hover {
  background-color: #ff6b6b;
}
.squat-action-btn:active {
  transform: translateX(-50%) scale(0.95);
}

/* 遊戲結束 */
.squat-game-over-screen {
  display: none;
  width: 100%;
  text-align: center;
  padding-top: 60px;
}
.squat-game-over-content {
  margin-top: 40px;
}
.squat-leaderboard-title {
  font-size: 24px;
  color: white;
  margin-bottom: 30px;
  font-family: 'Press Start 2P', cursive;
}
.squat-leaderboard-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
  font-size: 18px;
  font-family: 'Press Start 2P', cursive;
}
.squat-rank-medal {
  width: 70px;
  text-align: right;
}
.squat-lb-name {
  width: 150px;
  text-align: left;
}
.squat-lb-score {
  width: 60px;
  text-align: right;
  color: white;
}
.squat-single-result {
  font-size: 32px;
  color: white;
  margin-top: 60px;
  font-family: 'Press Start 2P', cursive;
}
.squat-single-detail {
  font-size: 18px;
  color: white;
  margin-top: 30px;
  font-family: 'Press Start 2P', cursive;
}
`
}
