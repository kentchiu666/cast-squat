// Hill Run 3D NPC 陪跑者
// 使用 Three.js 官方 RobotExpressive.glb（含 Walking/Running/Dance 等 13 種動畫）

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { NPC_CONFIG } from './constants'

// Module-level 狀態
let npcModel: THREE.Group | null = null
let mixer: THREE.AnimationMixer | null = null
let actions: Record<string, THREE.AnimationAction> = {}
let currentAction = ''
let npcScrollOffset = 0
let trackCurveRef: THREE.CatmullRomCurve3 | null = null
let trackLengthRef = 0

// 加油文字氣泡
let speechSprite: THREE.Sprite | null = null
let speechTimer = 0
let speechVisible = false
const SPEECH_INTERVAL = 300  // 每 300 tick 顯示一次（約 5 秒）
const SPEECH_DURATION = 120  // 顯示 120 tick（約 2 秒）
const _lookTarget = new THREE.Vector3()  // 可復用，避免每幀 GC
const SPEECH_MESSAGES = ['加油！', 'Go! Go!', '繼續跑！', 'Keep it up!', '你可以的！', 'Nice pace!']

// === 初始化 NPC（載入模型 + 動畫）===
export function initNpc(
  scene: THREE.Scene,
  trackCurve: THREE.CatmullRomCurve3,
  trackLength: number,
): void {
  trackCurveRef = trackCurve
  trackLengthRef = trackLength

  // NPC 起始位置：玩家前方
  npcScrollOffset = NPC_CONFIG.AHEAD_DISTANCE

  const loader = new GLTFLoader()
  const modelPath = `${import.meta.env.BASE_URL}models/RobotExpressive.glb`
  loader.load(modelPath, (gltf) => {
    npcModel = gltf.scene
    npcModel.scale.setScalar(NPC_CONFIG.SCALE)

    // 初始位置
    const startT = (npcScrollOffset / trackLength) % 1
    const startPos = trackCurve.getPointAt(startT)
    npcModel.position.set(startPos.x, startPos.y + NPC_CONFIG.Y_OFFSET, startPos.z)

    scene.add(npcModel)

    // 設定動畫
    mixer = new THREE.AnimationMixer(npcModel)
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip)
      actions[clip.name] = action
      // Emote 類動畫設定為只播一次
      if (['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'].includes(clip.name)) {
        action.clampWhenFinished = true
        action.loop = THREE.LoopOnce
      }
    }

    // 預設播放 Running
    playAction('Running')

    // 建立加油文字氣泡（頭頂上方）
    speechSprite = createSpeechSprite()
    speechSprite.visible = false
    scene.add(speechSprite)

    console.log('[HillRun NPC] RobotExpressive loaded, animations:', Object.keys(actions))
  }, undefined, (err) => {
    console.error('[HillRun NPC] Failed to load model:', modelPath, err)
  })
}

// === 建立文字氣泡 Sprite ===
function createSpeechSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(6, 1.5, 1)
  return sprite
}

// === 更新文字氣泡內容 ===
function updateSpeechText(text: string): void {
  if (!speechSprite) return
  const mat = speechSprite.material as THREE.SpriteMaterial
  const texture = mat.map as THREE.CanvasTexture
  const canvas = texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 背景氣泡
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  const radius = 12
  ctx.beginPath()
  ctx.moveTo(radius, 4)
  ctx.lineTo(canvas.width - radius, 4)
  ctx.arcTo(canvas.width - 4, 4, canvas.width - 4, radius + 4, radius)
  ctx.lineTo(canvas.width - 4, canvas.height - radius - 4)
  ctx.arcTo(canvas.width - 4, canvas.height - 4, canvas.width - radius, canvas.height - 4, radius)
  ctx.lineTo(radius, canvas.height - 4)
  ctx.arcTo(4, canvas.height - 4, 4, canvas.height - radius - 4, radius)
  ctx.lineTo(4, radius + 4)
  ctx.arcTo(4, 4, radius, 4, radius)
  ctx.closePath()
  ctx.fill()

  // 文字
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  texture.needsUpdate = true
}

// === 切換動畫 ===
function playAction(name: string): void {
  if (!mixer || currentAction === name || !actions[name]) return

  const prevAction = actions[currentAction]
  const nextAction = actions[name]!

  if (prevAction) {
    prevAction.fadeOut(0.3)
  }
  nextAction.reset().fadeIn(0.3).play()
  currentAction = name
}

// === 每幀更新（橡皮筋行為 + 動畫混合）===
export function updateNpc(playerScrollOffset: number, playerSpeed: number, delta: number): void {
  if (!npcModel || !trackCurveRef || trackLengthRef <= 0) return

  // NPC 跟隨玩家：維持在玩家前方固定距離，只在玩家動時才動
  const targetOffset = playerScrollOffset + NPC_CONFIG.AHEAD_DISTANCE
  npcScrollOffset += (targetOffset - npcScrollOffset) * NPC_CONFIG.RUBBER_BAND_SPEED

  // 沿賽道移動
  const t = ((npcScrollOffset % trackLengthRef) + trackLengthRef) % trackLengthRef / trackLengthRef
  const pos = trackCurveRef.getPointAt(t)
  const tangent = trackCurveRef.getTangentAt(t)

  npcModel.position.set(pos.x, pos.y + NPC_CONFIG.Y_OFFSET, pos.z)

  // 面向前進方向（RobotExpressive 面朝 +Z，沿切線方向看）
  _lookTarget.set(
    pos.x + tangent.x * 10,
    pos.y + NPC_CONFIG.Y_OFFSET,
    pos.z + tangent.z * 10,
  )
  npcModel.lookAt(_lookTarget)

  // 動畫切換：
  //   玩家停下來 → Dance
  //   玩家走路 → Walking
  //   玩家跑步 → Running
  //   加油文字顯示中 → 維持 Running（不切換到 Dance）
  if (playerSpeed < 0.05 && !speechVisible) {
    playAction('Dance')
  } else if (playerSpeed < 0.4) {
    playAction('Walking')
  } else {
    playAction('Running')
  }

  // 更新動畫混合器
  mixer?.update(delta)

  // 加油文字氣泡
  if (speechSprite) {
    // 位置：NPC 頭頂上方
    speechSprite.position.set(pos.x, pos.y + 5, pos.z)

    speechTimer++
    if (!speechVisible && speechTimer >= SPEECH_INTERVAL && playerSpeed > 0.05) {
      // 顯示新訊息
      const msg = SPEECH_MESSAGES[Math.floor(Math.random() * SPEECH_MESSAGES.length)]!
      updateSpeechText(msg)
      speechSprite.visible = true
      speechVisible = true
      speechTimer = 0
    } else if (speechVisible && speechTimer >= SPEECH_DURATION) {
      // 隱藏
      speechSprite.visible = false
      speechVisible = false
      speechTimer = 0
    }
  }
}

// === 取得 NPC 位置（供 minimap 用）===
export function getNpcScrollOffset(): number {
  return npcScrollOffset
}

// === 清理 ===
export function destroyNpc(): void {
  if (npcModel?.parent) {
    npcModel.parent.remove(npcModel)
  }
  if (mixer) {
    mixer.stopAllAction()
    mixer = null
  }
  if (speechSprite?.parent) {
    speechSprite.parent.remove(speechSprite)
  }
  speechSprite = null
  speechTimer = 0
  speechVisible = false
  npcModel = null
  actions = {}
  currentAction = ''
  npcScrollOffset = 0
  trackCurveRef = null
  trackLengthRef = 0
}
