import * as THREE from 'three'
import { SCENE_CONFIG, TRACK_CONFIG, OBJECT_CONFIG } from './constants'
import { initNpc, destroyNpc } from './npc'

// === Module-level Three.js 物件 ===
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let trackCurve: THREE.CatmullRomCurve3 | null = null
let trackLength = 0
let webglCanvas: HTMLCanvasElement | null = null

// 攝影機平滑用
let prevCamRoll = 0
const prevCamPos = new THREE.Vector3()
let camPosInitialized = false

// WebGL 可用性
let webglSupported = true

export function isWebGLSupported(): boolean { return webglSupported }

// === 初始化場景 ===
export function initScene(hostCanvas: HTMLCanvasElement): void {
  // WebGL 偵測
  const testCanvas = document.createElement('canvas')
  const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
  if (!gl) {
    console.error('[HillRun] WebGL not supported on this device')
    webglSupported = false
    return
  }

  webglCanvas = document.createElement('canvas')
  webglCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none'
  hostCanvas.parentElement?.appendChild(webglCanvas)
  hostCanvas.style.display = 'none'

  const w = Math.floor(1920 * SCENE_CONFIG.RENDER_SCALE)
  const h = Math.floor(1080 * SCENE_CONFIG.RENDER_SCALE)

  try {
    renderer = new THREE.WebGLRenderer({ canvas: webglCanvas, antialias: false, powerPreference: 'low-power' })
  } catch (e) {
    console.error('[HillRun] WebGLRenderer creation failed:', e)
    webglSupported = false
    webglCanvas.remove()
    webglCanvas = null
    hostCanvas.style.display = ''
    return
  }
  renderer.setSize(w, h, false)
  renderer.setClearColor(0xb8d4e8)

  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xb8d4e8, SCENE_CONFIG.FOG_NEAR, SCENE_CONFIG.FOG_FAR)

  camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 1, 500)

  // 光源：HemisphereLight（天空藍+地面綠）+ 暖色 DirectionalLight
  scene.add(new THREE.HemisphereLight(0x8ecae6, 0x4a7c3f, 0.5))
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.9)
  sun.position.set(80, 120, 40)
  scene.add(sun)

  // 天空穹頂
  buildSky()
  // 雲層
  buildClouds()

  prevCamRoll = 0
}

// === TrackPoint3D 型別 ===
export interface TrackPoint3D { x: number; y: number; z: number }

// === 建立賽道場景 ===
export function buildTrack(points: TrackPoint3D[]): void {
  if (!scene) return

  const curvePoints = points.map(p => new THREE.Vector3(p.x, p.y, p.z))
  trackCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'catmullrom', 0.5)
  trackLength = trackCurve.getLength()

  buildRoad(trackCurve)
  buildTerrain(trackCurve)
  addRoadSideObjects(trackCurve)

  // NPC 陪跑者
  if (scene) {
    initNpc(scene, trackCurve, trackLength)
  }
}

// ============================================================
// 道路（三層：路肩 → 路面 → 中線）
// ============================================================
function buildRoad(curve: THREE.CatmullRomCurve3): void {
  if (!scene) return
  const segments = TRACK_CONFIG.ROAD_SEGMENTS
  const halfRoad = TRACK_CONFIG.ROAD_WIDTH / 2
  const shoulder = TRACK_CONFIG.SHOULDER_WIDTH

  // --- 路肩 mesh（黃色漸變到綠色）---
  const shVerts: number[] = []
  const shColors: number[] = []
  const shIdx: number[] = []

  // --- 路面 mesh（深灰色）---
  const rdVerts: number[] = []
  const rdColors: number[] = []
  const rdIdx: number[] = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()

    const roadY = point.y + 0.15 // 路面稍高於地面

    // 路肩（外側 4 個頂點）
    const shOuterL = point.clone().add(right.clone().multiplyScalar(-(halfRoad + shoulder)))
    const shInnerL = point.clone().add(right.clone().multiplyScalar(-halfRoad))
    const shInnerR = point.clone().add(right.clone().multiplyScalar(halfRoad))
    const shOuterR = point.clone().add(right.clone().multiplyScalar(halfRoad + shoulder))

    // 路肩頂點
    const shBase = i * 4
    shVerts.push(shOuterL.x, roadY - 0.05, shOuterL.z)
    shVerts.push(shInnerL.x, roadY, shInnerL.z)
    shVerts.push(shInnerR.x, roadY, shInnerR.z)
    shVerts.push(shOuterR.x, roadY - 0.05, shOuterR.z)
    // 顏色：外側草綠 → 內側黃色
    shColors.push(0.3, 0.5, 0.2, 0.85, 0.75, 0.15, 0.85, 0.75, 0.15, 0.3, 0.5, 0.2)

    if (i > 0) {
      const prev = (i - 1) * 4
      // 左側路肩
      shIdx.push(prev, prev + 1, shBase, prev + 1, shBase + 1, shBase)
      // 右側路肩
      shIdx.push(prev + 2, prev + 3, shBase + 2, prev + 3, shBase + 3, shBase + 2)
    }

    // 路面（左右 2 個頂點）
    const rdBase = i * 2
    const rdL = point.clone().add(right.clone().multiplyScalar(-halfRoad))
    const rdR = point.clone().add(right.clone().multiplyScalar(halfRoad))
    rdVerts.push(rdL.x, roadY, rdL.z)
    rdVerts.push(rdR.x, roadY, rdR.z)

    // 路面顏色：深灰
    rdColors.push(0.28, 0.28, 0.3, 0.28, 0.28, 0.3)

    if (i > 0) {
      const prev = (i - 1) * 2
      rdIdx.push(prev, prev + 1, rdBase, prev + 1, rdBase + 1, rdBase)
    }
  }

  // 封閉路肩
  const shLast = segments * 4
  shIdx.push(shLast, shLast + 1, 0, shLast + 1, 1, 0)
  shIdx.push(shLast + 2, shLast + 3, 2, shLast + 3, 3, 2)

  // 封閉路面
  const rdLast = segments * 2
  rdIdx.push(rdLast, rdLast + 1, 0, rdLast + 1, 1, 0)

  // 路肩 mesh
  const shGeo = new THREE.BufferGeometry()
  shGeo.setAttribute('position', new THREE.Float32BufferAttribute(shVerts, 3))
  shGeo.setAttribute('color', new THREE.Float32BufferAttribute(shColors, 3))
  shGeo.setIndex(shIdx)
  shGeo.computeVertexNormals()
  scene!.add(new THREE.Mesh(shGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })))

  // 路面 mesh
  const rdGeo = new THREE.BufferGeometry()
  rdGeo.setAttribute('position', new THREE.Float32BufferAttribute(rdVerts, 3))
  rdGeo.setAttribute('color', new THREE.Float32BufferAttribute(rdColors, 3))
  rdGeo.setIndex(rdIdx)
  rdGeo.computeVertexNormals()
  scene!.add(new THREE.Mesh(rdGeo, new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 15 })))

  // 白色中線虛線
  const centerVerts: number[] = []
  for (let i = 0; i < segments; i++) {
    if (i % 5 < 2) continue
    const t1 = i / segments
    const t2 = (i + 1) / segments
    const p1 = curve.getPointAt(t1)
    const p2 = curve.getPointAt(Math.min(t2, 1))
    centerVerts.push(p1.x, p1.y + 0.2, p1.z, p2.x, p2.y + 0.2, p2.z)
  }
  const centerGeo = new THREE.BufferGeometry()
  centerGeo.setAttribute('position', new THREE.Float32BufferAttribute(centerVerts, 3))
  scene!.add(new THREE.LineSegments(centerGeo, new THREE.LineBasicMaterial({ color: 0xffffff })))
}

// ============================================================
// 地形（跟隨道路高度起伏 + vertex color）
// ============================================================
function buildTerrain(curve: THREE.CatmullRomCurve3): void {
  if (!scene) return
  const { GROUND_SIZE, GROUND_SEGMENTS } = SCENE_CONFIG

  const geo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS)
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const vertCount = pos.count
  const colors = new Float32Array(vertCount * 3)

  // 預取賽道取樣點（用於快速最近點查詢）
  const trackSamples: THREE.Vector3[] = []
  const sampleCount = 200
  for (let i = 0; i < sampleCount; i++) {
    trackSamples.push(curve.getPointAt(i / sampleCount))
  }

  for (let i = 0; i < vertCount; i++) {
    const vx = pos.getX(i)
    const vz = pos.getZ(i)

    // 找最近賽道點的高度和距離
    let minDist = Infinity
    let nearestY = 0
    for (const s of trackSamples) {
      const dx = vx - s.x
      const dz = vz - s.z
      const d = dx * dx + dz * dz
      if (d < minDist) {
        minDist = d
        nearestY = s.y
      }
    }
    const dist = Math.sqrt(minDist)

    // 地面高度：近路跟隨賽道，遠處漸變到 0
    const trackInfluence = Math.max(0, 1 - dist / 150)
    const baseY = nearestY * trackInfluence - 0.5
    pos.setY(i, baseY)

    // 顏色：近路深綠 → 遠處淺綠偏褐
    const colorBlend = Math.min(1, dist / 200)
    colors[i * 3] = 0.25 + colorBlend * 0.2     // R
    colors[i * 3 + 1] = 0.5 - colorBlend * 0.1  // G
    colors[i * 3 + 2] = 0.15 + colorBlend * 0.1 // B
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })))
}

// ============================================================
// 天空穹頂（漸層 shader）
// ============================================================
function buildSky(): void {
  if (!scene) return
  const geo = new THREE.SphereGeometry(SCENE_CONFIG.SKY_RADIUS, 12, 8)
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x3a7ecf) },
      bottomColor: { value: new THREE.Color(0xb8d4e8) },
    },
    vertexShader: `
      varying float vY;
      void main() {
        vY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying float vY;
      void main() {
        float t = max(0.0, vY);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  })
  scene.add(new THREE.Mesh(geo, mat))
}

// ============================================================
// 雲層（InstancedMesh 扁平 box）
// ============================================================
function buildClouds(): void {
  if (!scene) return
  const count = SCENE_CONFIG.CLOUD_COUNT
  const geo = new THREE.BoxGeometry(30, 2, 15)
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const radius = 100 + Math.random() * 200
    dummy.position.set(
      Math.cos(angle) * radius,
      SCENE_CONFIG.CLOUD_HEIGHT + Math.random() * 30,
      Math.sin(angle) * radius,
    )
    dummy.scale.set(0.6 + Math.random() * 0.8, 0.5 + Math.random() * 0.5, 0.6 + Math.random() * 0.6)
    dummy.rotation.y = Math.random() * Math.PI
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  scene.add(mesh)
}

// ============================================================
// 路邊物件（多種類 InstancedMesh）
// ============================================================
function addRoadSideObjects(curve: THREE.CatmullRomCurve3): void {
  if (!scene) return
  const segments = TRACK_CONFIG.ROAD_SEGMENTS
  const halfRoad = TRACK_CONFIG.ROAD_WIDTH / 2
  const cfg = OBJECT_CONFIG

  // 收集沿賽道的位置
  type ObjPos = { x: number; y: number; z: number; sx: number; sy: number }

  function collectPositions(count: number, offsetMin: number, offsetMax: number): ObjPos[] {
    const positions: ObjPos[] = []
    const spacing = Math.floor(segments / (count / 2))
    for (let i = 0; i < segments && positions.length < count; i += spacing) {
      const t = i / segments
      const point = curve.getPointAt(t)
      const tangent = curve.getTangentAt(t).normalize()
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()

      for (const side of [-1, 1]) {
        if (positions.length >= count) break
        const offset = (halfRoad + offsetMin + Math.random() * (offsetMax - offsetMin)) * side
        const pos = point.clone().add(right.clone().multiplyScalar(offset))
        positions.push({
          x: pos.x, y: pos.y, z: pos.z,
          sx: 0.7 + Math.random() * 0.6,
          sy: 0.7 + Math.random() * 0.5,
        })
      }
    }
    return positions
  }

  const dummy = new THREE.Object3D()

  function createInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, positions: ObjPos[], yOffset: number): void {
    const mesh = new THREE.InstancedMesh(geo, mat, positions.length)
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]!
      dummy.position.set(p.x, p.y + yOffset, p.z)
      dummy.scale.set(p.sx, p.sy, p.sx)
      dummy.rotation.y = Math.random() * Math.PI * 2
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    scene!.add(mesh)
  }

  // --- 松樹（中距離）---
  const pinePos = collectPositions(cfg.PINE_TREE_COUNT, cfg.MID_OFFSET_MIN, cfg.MID_OFFSET_MAX)
  createInstanced(new THREE.ConeGeometry(2.5, 10, 5), new THREE.MeshLambertMaterial({ color: 0x1a5c1a }), pinePos, 6)
  createInstanced(new THREE.CylinderGeometry(0.5, 0.7, 3, 5), new THREE.MeshLambertMaterial({ color: 0x8B4513 }), pinePos, 1.5)

  // --- 闊葉樹（中距離）---
  const broadPos = collectPositions(cfg.BROAD_TREE_COUNT, cfg.MID_OFFSET_MIN, cfg.MID_OFFSET_MAX)
  createInstanced(new THREE.SphereGeometry(3, 5, 4), new THREE.MeshLambertMaterial({ color: 0x2d7a2d }), broadPos, 7)
  createInstanced(new THREE.CylinderGeometry(0.6, 0.8, 4, 5), new THREE.MeshLambertMaterial({ color: 0x6b3a1f }), broadPos, 2)

  // --- 灌木（近距離）---
  const bushPos = collectPositions(cfg.BUSH_COUNT, cfg.NEAR_OFFSET_MIN, cfg.NEAR_OFFSET_MAX)
  createInstanced(new THREE.SphereGeometry(1.5, 4, 3), new THREE.MeshLambertMaterial({ color: 0x3a8c3a }), bushPos, 1)

  // --- 石頭（遠距離）---
  const rockPos = collectPositions(cfg.ROCK_COUNT, cfg.FAR_OFFSET_MIN, cfg.FAR_OFFSET_MAX)
  createInstanced(new THREE.DodecahedronGeometry(1.2, 0), new THREE.MeshLambertMaterial({ color: 0x8a8a7a }), rockPos, 0.6)

  // --- 花叢（近距離）---
  const flowerPos = collectPositions(cfg.FLOWER_COUNT, cfg.NEAR_OFFSET_MIN, cfg.NEAR_OFFSET_MAX)
  const flowerColors = [0xff6b8a, 0xffb347, 0xdda0dd, 0xffff66]
  for (let c = 0; c < flowerColors.length; c++) {
    const subset = flowerPos.filter((_, i) => i % flowerColors.length === c)
    if (subset.length > 0) {
      createInstanced(
        new THREE.BoxGeometry(0.4, 0.8, 0.4),
        new THREE.MeshLambertMaterial({ color: flowerColors[c] }),
        subset, 0.4,
      )
    }
  }
}

// ============================================================
// 公開 API
// ============================================================
export function getTrackLength(): number { return trackLength }

export function updateSceneCamera(scrollOffset: number): void {
  if (!camera || !trackCurve || trackLength <= 0) return

  const t = ((scrollOffset % trackLength) + trackLength) % trackLength / trackLength
  const lookAheadT = ((scrollOffset + SCENE_CONFIG.CAMERA_LOOK_AHEAD) % trackLength + trackLength) % trackLength / trackLength

  const pos = trackCurve.getPointAt(t)
  const lookAt = trackCurve.getPointAt(lookAheadT)
  const tangent = trackCurve.getTangentAt(t)

  // 攝影機位置（lerp 平滑，避免每秒收到資料時抽動）
  const targetPos = new THREE.Vector3(pos.x, pos.y + SCENE_CONFIG.CAMERA_HEIGHT, pos.z)
  if (!camPosInitialized) {
    prevCamPos.copy(targetPos)
    camPosInitialized = true
  }
  prevCamPos.lerp(targetPos, 0.1)
  camera.position.copy(prevCamPos)

  // 上坡/下坡：lookAt y 偏移
  const slope = (lookAt.y - pos.y) / SCENE_CONFIG.CAMERA_LOOK_AHEAD
  const lookY = lookAt.y + SCENE_CONFIG.CAMERA_HEIGHT * 0.5 + slope * 3

  camera.lookAt(lookAt.x, lookY, lookAt.z)

  // 彎道傾斜：從切線方向的水平變化算曲率
  const lookAheadT2 = ((scrollOffset + SCENE_CONFIG.CAMERA_LOOK_AHEAD * 2) % trackLength + trackLength) % trackLength / trackLength
  const tangent2 = trackCurve.getTangentAt(lookAheadT2)
  const cross = tangent.x * tangent2.z - tangent.z * tangent2.x
  const targetRoll = -cross * 0.15
  prevCamRoll += (targetRoll - prevCamRoll) * 0.05
  camera.up.set(Math.sin(prevCamRoll), Math.cos(prevCamRoll), 0)
}

export function renderFrame(): void {
  if (!renderer || !scene || !camera) return
  renderer.render(scene, camera)
}

export function destroyScene(hostCanvas: HTMLCanvasElement): void {
  destroyNpc()
  if (webglCanvas) { webglCanvas.remove(); webglCanvas = null }
  hostCanvas.style.display = ''
  if (renderer) { renderer.dispose(); renderer = null }
  if (scene) {
    scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose())
        else mat.dispose()
      }
    })
    scene = null
  }
  camera = null
  trackCurve = null
  trackLength = 0
  prevCamRoll = 0
  prevCamPos.set(0, 0, 0)
  camPosInitialized = false
}
