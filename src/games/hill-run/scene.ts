import * as THREE from 'three'
import { SCENE_CONFIG, TRACK_CONFIG } from './constants'

// === Module-level Three.js 物件 ===
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null

// 賽道 3D 路徑（CatmullRomCurve3）
let trackCurve: THREE.CatmullRomCurve3 | null = null
let trackLength = 0

// 場景容器（用於掛載到 DOM）
let webglCanvas: HTMLCanvasElement | null = null

// === 初始化場景 ===
export function initScene(hostCanvas: HTMLCanvasElement): void {
  // 建立獨立的 WebGL canvas（不搶 2D canvas）
  webglCanvas = document.createElement('canvas')
  webglCanvas.style.position = 'absolute'
  webglCanvas.style.top = '0'
  webglCanvas.style.left = '0'
  webglCanvas.style.width = '100%'
  webglCanvas.style.height = '100%'
  webglCanvas.style.imageRendering = 'pixelated'
  webglCanvas.style.pointerEvents = 'none'
  hostCanvas.parentElement?.appendChild(webglCanvas)

  // 隱藏原本的 2D canvas
  hostCanvas.style.display = 'none'

  const w = Math.floor(1920 * SCENE_CONFIG.RENDER_SCALE)
  const h = Math.floor(1080 * SCENE_CONFIG.RENDER_SCALE)

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: false,
    powerPreference: 'low-power',
  })
  renderer.setSize(w, h, false)
  renderer.setClearColor(0x87CEEB) // 天空藍

  // Scene
  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x87CEEB, SCENE_CONFIG.FOG_NEAR, SCENE_CONFIG.FOG_FAR)

  // Camera
  camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 1, 500)
  camera.position.set(0, SCENE_CONFIG.CAMERA_HEIGHT, 0)

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const directional = new THREE.DirectionalLight(0xffffff, 0.8)
  directional.position.set(50, 100, 30)
  scene.add(directional)
}

// === 從控制點建立 3D 賽道 ===
export interface TrackPoint3D {
  x: number
  y: number
  z: number
}

export function buildTrack(points: TrackPoint3D[]): void {
  if (!scene) return

  // Catmull-Rom 3D 曲線（closed = 封閉迴圈）
  const curvePoints = points.map(p => new THREE.Vector3(p.x, p.y, p.z))
  trackCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'catmullrom', 0.5)

  // 取樣點建立道路 mesh
  const segments = TRACK_CONFIG.ROAD_SEGMENTS
  const halfWidth = TRACK_CONFIG.ROAD_WIDTH / 2

  const vertices: number[] = []
  const indices: number[] = []
  const colors: number[] = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const point = trackCurve.getPointAt(t)
    const tangent = trackCurve.getTangentAt(t).normalize()

    // 道路法線（水平垂直於前進方向）
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize()

    // 左右邊頂點
    const left = point.clone().add(right.clone().multiplyScalar(-halfWidth))
    const rightPt = point.clone().add(right.clone().multiplyScalar(halfWidth))

    vertices.push(left.x, left.y, left.z)
    vertices.push(rightPt.x, rightPt.y, rightPt.z)

    // 道路顏色：深灰主體 + 邊線
    const roadGray = 0.35
    const edgeYellow = i % 4 < 2 ? 0.8 : roadGray // 虛線邊線效果
    colors.push(edgeYellow, edgeYellow * 0.8, 0.1) // 左邊線
    colors.push(edgeYellow, edgeYellow * 0.8, 0.1) // 右邊線

    // 三角形索引（兩個頂點為一組，和前一組形成四邊形）
    if (i > 0) {
      const base = (i - 1) * 2
      indices.push(base, base + 1, base + 2)
      indices.push(base + 1, base + 3, base + 2)
    }
  }

  // 封閉最後一段到起點
  const last = segments * 2
  indices.push(last, last + 1, 0)
  indices.push(last + 1, 1, 0)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })
  const roadMesh = new THREE.Mesh(geometry, material)
  scene.add(roadMesh)

  // 道路中線（白色虛線）
  const centerVertices: number[] = []
  for (let i = 0; i < segments; i++) {
    if (i % 4 < 2) continue // 虛線：畫 2 段、跳 2 段
    const t1 = i / segments
    const t2 = (i + 1) / segments
    const p1 = trackCurve.getPointAt(t1)
    const p2 = trackCurve.getPointAt(Math.min(t2, 1))
    centerVertices.push(p1.x, p1.y + 0.05, p1.z)
    centerVertices.push(p2.x, p2.y + 0.05, p2.z)
  }
  const centerGeo = new THREE.BufferGeometry()
  centerGeo.setAttribute('position', new THREE.Float32BufferAttribute(centerVertices, 3))
  const centerMat = new THREE.LineBasicMaterial({ color: 0xffffff })
  const centerLine = new THREE.LineSegments(centerGeo, centerMat)
  scene.add(centerLine)

  // 地面（大片草地）
  const groundGeo = new THREE.PlaneGeometry(1000, 1000)
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a8c3f })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.1
  scene.add(ground)

  // 路邊物件（簡單的低多邊形樹）
  addRoadSideObjects(trackCurve, segments)

  // 計算賽道總長度
  trackLength = trackCurve.getLength()
}

// === 路邊物件（InstancedMesh — 只需 2 個 draw call）===
function addRoadSideObjects(curve: THREE.CatmullRomCurve3, segments: number): void {
  if (!scene) return

  const treeCount = 20  // 左右各 10 棵
  const spacing = Math.floor(segments / (treeCount / 2))
  const halfWidth = TRACK_CONFIG.ROAD_WIDTH / 2

  // 先收集所有位置
  const positions: { x: number; y: number; z: number; scaleX: number; scaleY: number }[] = []
  for (let i = 0; i < segments; i += spacing) {
    const t = i / segments
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize()

    for (const side of [-1, 1]) {
      const offset = (halfWidth + 8 + Math.random() * 10) * side
      const pos = point.clone().add(right.clone().multiplyScalar(offset))
      positions.push({
        x: pos.x, y: pos.y, z: pos.z,
        scaleX: 0.8 + Math.random() * 0.5,
        scaleY: 0.8 + Math.random() * 0.4,
      })
    }
  }

  const count = positions.length
  const dummy = new THREE.Object3D()

  // 樹冠 InstancedMesh（1 個 draw call）
  const canopyGeo = new THREE.ConeGeometry(2, 8, 5)
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1e })
  const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, count)
  for (let i = 0; i < count; i++) {
    const p = positions[i]!
    dummy.position.set(p.x, p.y + 5.5, p.z)
    dummy.scale.set(p.scaleX, p.scaleY, p.scaleX)
    dummy.updateMatrix()
    canopyMesh.setMatrixAt(i, dummy.matrix)
  }
  scene.add(canopyMesh)

  // 樹幹 InstancedMesh（1 個 draw call）
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 5)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 })
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count)
  for (let i = 0; i < count; i++) {
    const p = positions[i]!
    dummy.position.set(p.x, p.y + 1.5, p.z)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    trunkMesh.setMatrixAt(i, dummy.matrix)
  }
  scene.add(trunkMesh)
}

// === 取得賽道長度 ===
export function getTrackLength(): number {
  return trackLength
}

// === 更新攝影機（每幀呼叫）===
export function updateSceneCamera(scrollOffset: number): void {
  if (!camera || !trackCurve || trackLength <= 0) return

  const t = ((scrollOffset % trackLength) + trackLength) % trackLength / trackLength
  const lookAheadT = ((scrollOffset + SCENE_CONFIG.CAMERA_LOOK_AHEAD) % trackLength + trackLength) % trackLength / trackLength

  const pos = trackCurve.getPointAt(t)
  const lookAt = trackCurve.getPointAt(lookAheadT)

  camera.position.set(pos.x, pos.y + SCENE_CONFIG.CAMERA_HEIGHT, pos.z)
  camera.lookAt(lookAt.x, lookAt.y + SCENE_CONFIG.CAMERA_HEIGHT * 0.5, lookAt.z)
}

// === 渲染一幀 ===
export function renderFrame(): void {
  if (!renderer || !scene || !camera) return
  renderer.render(scene, camera)
}

// === 清理 ===
export function destroyScene(hostCanvas: HTMLCanvasElement): void {
  if (webglCanvas) {
    webglCanvas.remove()
    webglCanvas = null
  }
  hostCanvas.style.display = ''

  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  if (scene) {
    scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) {
          mat.forEach((m: THREE.Material) => m.dispose())
        } else {
          mat.dispose()
        }
      }
    })
    scene = null
  }
  camera = null
  trackCurve = null
  trackLength = 0
}
