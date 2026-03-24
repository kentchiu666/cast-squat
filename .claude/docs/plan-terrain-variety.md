# Plan: 地形變化與視覺豐富度（Phase 1: 偽坡度）

> 建立日期: 2026-03-24
> 狀態: 已完成（Phase 1）
> Research: `.claude/docs/research-terrain-variety.md`

## 概要

在 jungle-run 加入偽坡度系統。TrackPoint 新增 `y`（高度），攝影機跟隨高度變化動態調整 `cameraHeight` 和 `horizonY`，營造上坡/下坡的視覺體驗。同時 Phase 2 加入高度連動的霧濃度和天空亮度，低處像地洞、高處像山頂。

## 實作步驟

### 1. 常數 — 新增 ELEVATION_CONFIG
- [ ] 在 `constants.ts` 新增高度相關常數
- 檔案: `src/games/jungle-run/constants.ts`

```typescript
export const ELEVATION_CONFIG = {
  BASE_CAMERA_HEIGHT: 100,  // 原本的固定值
  HEIGHT_INFLUENCE: 0.6,     // y 值對 cameraHeight 的影響比例
  MAX_CAMERA_HEIGHT: 160,    // 攝影機最高
  MIN_CAMERA_HEIGHT: 50,     // 攝影機最低
  BASE_HORIZON_Y: 400,       // 原本的固定值
  HORIZON_INFLUENCE: 0.3,    // y 值對 horizonY 的影響比例
  MAX_HORIZON_Y: 480,        // 地平線最低（下坡/地洞：地面佔更多）
  MIN_HORIZON_Y: 320,        // 地平線最高（上坡：天空佔更多）
  HEIGHT_LERP: 0.05,         // 攝影機高度平滑 lerp 因子
  // Phase 2: 高度連動視覺
  FOG_MIN_FACTOR: 0.3,       // 高處霧淡（0=無霧, 1=全霧）
  FOG_MAX_FACTOR: 0.8,       // 低處霧濃
  SKY_DARKEN_LOW: 0.4,       // 低處天空變暗的程度
} as const
```

### 2. 型別 — TrackPoint 加 y
- [ ] `TrackPoint` 加 `y?: number`
- 檔案: `src/games/jungle-run/courses/types.ts`

```typescript
export interface TrackPoint {
  x: number
  z: number
  y?: number  // 高度（0 = 地面，正=上坡，負=下坡/地洞）
}
```

向下相容：現有 `jungleLoopTrack` 不帶 y → 預設 0 → 行為完全不變。

### 3. track.ts — TrackSample 加 y，Catmull-Rom 插值 y
- [ ] `TrackSample` 加 `y: number`
- [ ] `catmullRomPoint` 回傳值加 y
- [ ] `buildTrackLUT` 插值 y
- [ ] `sampleTrack` 插值 y
- 檔案: `src/games/jungle-run/track.ts`

**TrackSample 變更**：
```typescript
export interface TrackSample {
  x: number
  z: number
  y: number      // 新增
  angle: number
  distance: number
}
```

**catmullRomPoint 變更**：
```typescript
// 回傳型別從 TrackPoint 改為 { x, z, y }
// y 使用與 x, z 完全相同的 Catmull-Rom 公式
const y = 0.5 * (
  (2 * (p1.y ?? 0)) +
  (-(p0.y ?? 0) + (p2.y ?? 0)) * t +
  (2 * (p0.y ?? 0) - 5 * (p1.y ?? 0) + 4 * (p2.y ?? 0) - (p3.y ?? 0)) * t2 +
  (-(p0.y ?? 0) + 3 * (p1.y ?? 0) - 3 * (p2.y ?? 0) + (p3.y ?? 0)) * t3
)
return { x, z, y }
```

**sampleTrack 變更**：線性插值時也 lerp y。

### 4. camera.ts — CameraState 加 height
- [ ] `CameraState` 加 `height: number`
- [ ] `updateCamera` 從 trackSample.y 計算目標 cameraHeight，用 lerp 平滑
- 檔案: `src/games/jungle-run/camera.ts`

```typescript
export interface CameraState {
  x: number
  z: number
  angle: number
  height: number  // 新增：攝影機高度
}

export function updateCamera(...): CameraState {
  const sample = sampleTrack(trackLUT, scrollOffset)
  // ...existing code...

  // 計算目標攝影機高度
  const { BASE_CAMERA_HEIGHT, HEIGHT_INFLUENCE, MAX_CAMERA_HEIGHT, MIN_CAMERA_HEIGHT } = ELEVATION_CONFIG
  const targetHeight = Math.max(MIN_CAMERA_HEIGHT,
    Math.min(MAX_CAMERA_HEIGHT, BASE_CAMERA_HEIGHT + sample.y * HEIGHT_INFLUENCE))
  const height = prevCamera.height + (targetHeight - prevCamera.height) * ELEVATION_CONFIG.HEIGHT_LERP

  return { x: camX, z: camZ, angle: ..., height }
}
```

### 5. mode7.ts — 接收動態 cameraHeight
- [ ] `renderMode7Ground` 新增 `cameraHeight` 參數，取代常數 `CAMERA_HEIGHT`
- 檔案: `src/games/jungle-run/mode7.ts`

```typescript
export function renderMode7Ground(
  mainCtx: CanvasRenderingContext2D,
  camX: number, camZ: number, camAngle: number,
  tilemap: Uint8Array,
  cameraHeight: number,   // 新增
  horizonY: number,        // 新增（控制天空/地面分割位置）
): void {
  // 原本: const scale = CAMERA_HEIGHT / (y + 1)
  // 改為: const scale = cameraHeight / (y + 1)

  // 原本: 地面畫在固定 HORIZON_Y 位置
  // 改為: 地面畫在動態 horizonY 位置
  // groundLogicalHeight = REFERENCE_HEIGHT - horizonY（取代固定值）
}
```

**效能影響**：零。只是把常數換成參數，逐像素迴圈邏輯完全不變。

### 6. world-objects.ts — 投影用動態 horizonY
- [ ] `projectObjects` 接收動態 `cameraHeight` 和 `horizonY`
- 檔案: `src/games/jungle-run/world-objects.ts`

```typescript
export function projectObjects(
  objects: WorldObject[],
  camX: number, camZ: number, camAngle: number,
  cameraHeight: number,  // 新增（取代 MODE7_CONFIG.CAMERA_HEIGHT）
  horizonY: number,      // 新增（取代 MODE7_CONFIG.HORIZON_Y）
): ProjectedObject[] {
  // 替換兩處使用常數的地方
}
```

### 7. renderer.ts — 傳遞動態參數
- [ ] `RenderParams` 加 `cameraHeight` 和 `horizonY`（由 index.ts 計算後傳入）
- [ ] `renderScene` 傳遞給 `renderMode7Ground` 和 `projectObjects`
- [ ] `drawSky` 用動態 horizonY（天空/地面的分割位置）
- 檔案: `src/games/jungle-run/renderer.ts`

```typescript
export interface RenderParams {
  // ...existing...
  cameraHeight: number  // 新增
  horizonY: number      // 新增
}
```

天空繪製需要調整：`drawSky` 目前預渲染固定高度，動態 horizonY 需要用 `ctx.drawImage` 的裁切/拉伸參數適應。

### 8. layers/sky.ts — 適應動態 horizonY
- [ ] `drawSky` 接收動態 `horizonY`，用 drawImage 拉伸預渲染的天空到新的 horizonY 位置
- 檔案: `src/games/jungle-run/layers/sky.ts`

```typescript
export function drawSky(ctx: CanvasRenderingContext2D, cameraAngle: number, horizonY: number): void {
  // 天空漸層：拉伸預渲染畫布到動態 horizonY 高度
  if (skyGradientCanvas) {
    ctx.drawImage(skyGradientCanvas, 0, 0, REFERENCE_WIDTH, skyGradientCanvas.height,
                  0, 0, REFERENCE_WIDTH, horizonY)
  }
  // 遠山/近山也類似拉伸
}
```

### 9. index.ts — 攝影機狀態加 height，計算 horizonY
- [ ] `JungleRunState` 加 `cameraHeight: number`
- [ ] `createState` 初始值 `cameraHeight: ELEVATION_CONFIG.BASE_CAMERA_HEIGHT`
- [ ] `onTick` 存 `cam.height`
- [ ] `onRender` 傳 `cameraHeight` 和計算 `horizonY`
- 檔案: `src/games/jungle-run/index.ts`

```typescript
// onTick 中
ctx.state.cameraHeight = cam.height

// onRender 中
const { BASE_HORIZON_Y, HORIZON_INFLUENCE, MAX_HORIZON_Y, MIN_HORIZON_Y, BASE_CAMERA_HEIGHT } = ELEVATION_CONFIG
const heightDelta = ctx.state.cameraHeight - BASE_CAMERA_HEIGHT
const horizonY = Math.max(MIN_HORIZON_Y, Math.min(MAX_HORIZON_Y,
  BASE_HORIZON_Y - heightDelta * HORIZON_INFLUENCE))

renderScene(canvasCtx, {
  ...existing,
  cameraHeight: ctx.state.cameraHeight,
  horizonY,
})
```

### 10. random-track.ts — 生成 y 值
- [ ] 用 sin 波形為控制點生成 y（高度）
- 檔案: `src/games/jungle-run/courses/tracks/random-track.ts`

```typescript
// generateControlPoints 中，每個點加上 y
const elevationWave = Math.sin(baseAngle * 2) * 80 + Math.sin(baseAngle * 3.7) * 40
points.push({
  x: ..., z: ...,
  y: elevationWave + (rng() - 0.5) * 30,  // 基礎波形 + 隨機擾動
})
```

兩個 sin 波疊加產生自然的丘陵起伏，一圈內大約 2~3 個山頂和谷底。

### 11. Phase 2: 高度連動霧濃度（可選，視 Phase 1 效果決定）
- [ ] renderer.ts 根據 cameraHeight 動態調整渲染時的霧濃度
- [ ] 低處天空加暗色 overlay
- 說明: 這部分可以在 Phase 1 完成後視效果決定是否實作

### 12. 測試 + 建置 + 文件更新
- [ ] 執行現有測試確認不破壞（特別是 track.test.ts、camera.test.ts）
- [ ] 新增 track.test.ts 測試：帶 y 的控制點能正確插值
- [ ] 新增 camera.test.ts 測試：height 跟隨 sample.y 變化
- [ ] 新增 random-track.test.ts 測試：生成的 TrackDef 帶 y 值
- [ ] `npm run build` 型別檢查通過
- [ ] `npm run dev` 手動測試視覺效果
- [ ] 更新 CLAUDE.md

## 影響範圍

### 新增檔案
無

### 修改檔案
| 檔案 | 修改內容 |
|------|----------|
| `constants.ts` | 新增 `ELEVATION_CONFIG` |
| `courses/types.ts` | `TrackPoint` 加 `y?: number` |
| `track.ts` | `TrackSample` 加 y，`catmullRomPoint` 插值 y，`sampleTrack` lerp y |
| `camera.ts` | `CameraState` 加 height，`updateCamera` 計算動態高度 |
| `mode7.ts` | `renderMode7Ground` 接收動態 cameraHeight + horizonY |
| `world-objects.ts` | `projectObjects` 接收動態 cameraHeight + horizonY |
| `renderer.ts` | `RenderParams` 加新欄位，傳遞給各渲染函數 |
| `layers/sky.ts` | `drawSky` 接收動態 horizonY |
| `index.ts` | 狀態加 cameraHeight，onRender 計算 horizonY |
| `random-track.ts` | 控制點生成 y 值 |

## 架構決策

- **偽坡度而非真 3D**：Mode 7 是平面投影，不可能做真斜坡面。動態攝影機參數是 SNES 時代的經典手法（Mario Kart、F-Zero），效果可信且效能零開銷。
- **y 為 optional**：向下相容，現有 `jungleLoopTrack` 不帶 y 就是純平面。
- **lerp 平滑所有動態參數**：避免突兀的跳變，攝影機高度和地平線位置都用 lerp 過渡。
- **Phase 2 延後決定**：先看 Phase 1 效果是否足夠，再決定是否加霧濃度/天空變暗。

## 測試計畫

### 單元測試（必要）
- [ ] `track.test.ts` — 帶 y 的控制點：catmullRomPoint 回傳正確 y、buildTrackLUT 的 sample 含 y、sampleTrack 插值 y
- [ ] `camera.test.ts` — height 追隨 sample.y：高處 → height 增加、低處 → height 減少、lerp 平滑不會突變
- [ ] `random-track.test.ts` — 生成的控制點帶 y 值、y 在合理範圍

### 手動驗證
- [ ] `npm run dev` 開瀏覽器，觀察跑步時天空/地面比例是否隨位置變化
- [ ] Minimap 上跑一圈，應能感受到上坡（天空增多）和下坡（地面增多）
- [ ] 確認現有 jungleLoopTrack（如果切回去）仍然是純平面效果
- [ ] 重新開始遊戲後效果正常（新隨機賽道也有高度變化）

## CLAUDE.md 更新項目
- TrackPoint 介面新增 y 說明
- CameraState 加 height
- ELEVATION_CONFIG 常數說明
- renderer 分層渲染加入動態 horizonY 說明
- 測試數量更新

---

## Review Notes（自我審查）

- [x] 是否遵循現有 GameModule 介面和 pattern？→ 是，不改 GameModule 介面
- [x] 是否有遺漏的生命週期（init/start/stop/destroy）？→ 無新增生命週期
- [x] 是否考慮 Chromecast v3 效能限制？→ 是，零額外逐像素運算
- [x] 是否有 Cast 訊息格式不一致？→ 不涉及 Cast 訊息
- [x] 影響範圍是否完整列出？→ 是，10 個檔案
- [x] 測試計畫是否覆蓋關鍵路徑？→ 是，track/camera/random-track

---

## 開發者註解區

> 以下區域供開發者在審核時加入註解，Claude 會根據註解修正計畫。
> 格式: `[註解] 你的意見`


