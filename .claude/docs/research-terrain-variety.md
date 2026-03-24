# Research: 地形變化與視覺豐富度

> 建立日期: 2026-03-24
> 狀態: 已完成 — 採用方案 C（組合方案），分階段實作

## 目標

讓 jungle-run 不再只是平面跑步。加入坡度感（爬山/下坡/地洞）和更豐富的沿途風景，提升遊戲體驗的層次感和趣味性。

## 現有程式碼分析

### 相關檔案
| 檔案 | 職責 | 與本功能的關係 |
|------|------|----------------|
| `mode7.ts` | Mode 7 地面逐像素渲染 | 核心限制：假設地面是平坦的 2D tilemap |
| `camera.ts` | 攝影機跟隨賽道 | 只有 x, z, angle — 沒有 y（高度）|
| `renderer.ts` | 分層渲染統籌 | 控制渲染順序、HORIZON_Y 是常數 |
| `world-objects.ts` | 沿賽道放置物件 | 5 種物件，機械式間隔排列 |
| `layers/sky.ts` | 天空漸層 + 遠山 | 預渲染靜態，不隨位置變化 |
| `layers/light-rays.ts` | 林間漏光 | 走跑 alpha 變化，無位置感知 |
| `layers/clouds.ts` | 漂浮雲層 | 勻速橫移 |
| `layers/particles.ts` | 螢火蟲光點 | 漂浮 + 呼吸燈 |
| `courses/types.ts` | TrackDef + ThemeDef | TrackPoint 只有 { x, z }，ThemeDef 是全域單一風格 |
| `constants.ts` | MODE7_CONFIG | CAMERA_HEIGHT=100, HORIZON_Y=400 都是固定值 |
| `tilemap.ts` | tilemap 生成 | 只有 6 種 tile 類型 |

### 現有架構的核心限制

1. **Mode 7 是平面投影**
   - `mode7.ts` 的 `renderMode7Ground()` 用 `scale = CAMERA_HEIGHT / (y + 1)` 計算每行透視
   - `CAMERA_HEIGHT` 是常數 100，如果每幀動態改變，地面會產生「呼吸」效果
   - 這不是真 3D，無法渲染真正的斜坡面

2. **攝影機只有 2D**
   - `CameraState` 只有 `{ x, z, angle }`，沒有 y
   - `updateCamera()` 從 trackLUT 取 sample，sample 也只有 `{ x, z, angle, distance }`

3. **ThemeDef 是全域的**
   - 天空顏色、霧效、地面顏色從頭到尾不變
   - 不支援「賽道前半是叢林、後半是洞穴」的區段變化

### 相關模式與慣例

- 所有視覺效果都在 init 時預渲染（offscreen canvas），每幀只做 drawImage + 簡單計算
- 效能第一：Chromecast v3 限制，不能每幀做複雜運算
- 渲染管線是分層的：sky → clouds → mode7 → objects → npc → particles → lightRays → speedLines → minimap

## 技術調研

### 方案 A: 偽坡度（動態 Camera Height + Horizon Y）— 推薦

**核心思路**：在 TrackDef 的控制點加入高度 `y`，讓攝影機跟隨高度變化。不改 Mode 7 的平面本質，而是透過攝影機參數變化營造坡度「感覺」。

**視覺效果**：
- 上坡：CAMERA_HEIGHT 增加 → 地面離攝影機更遠 → 看到更多遠景 → 感覺在爬高
- 下坡：CAMERA_HEIGHT 減少 → 地面更近 → 視野被壓縮 → 感覺在俯衝
- HORIZON_Y 跟著微調 → 天空比例變化 → 上坡天空變多、下坡地面變多
- 配合 FOG 濃度和天空色調變化，可進一步強化感覺

**需要改的**：
1. `TrackPoint` 加 `y?: number`（向下相容）
2. `track.ts` 的 `TrackSample` 加 `y`，Catmull-Rom 插值 y
3. `camera.ts` 輸出 `CameraState` 加 `height`、`horizonOffset`
4. `mode7.ts` 的 `renderMode7Ground` 改為接收動態 `cameraHeight`
5. `renderer.ts` 的 `renderScene` 用動態 `horizonY` 調整天空/地面分割
6. 隨機賽道生成器加入 y 值生成

**優點**：
- 改動最小，完全向下相容（y 為 optional）
- 不破壞 Mode 7 的平面渲染邏輯（仍然是平面 tilemap 投影）
- 視覺效果明顯：Mario Kart SNES 就是用類似手法
- 效能零額外開銷（只是幾個數字跟著變）

**缺點**：
- 不是真正的 3D 坡面（地面紋理不會傾斜）
- 極端高度差會露餡（天空/地面比例突變）
- 需要小心 lerp 過渡，避免突兀

### 方案 B: 區段主題（Zone System）

**核心思路**：把賽道分成若干區段（Zone），每個區段有不同的視覺主題。

```
Zone 1: 叢林（綠色、密樹、漏光）
Zone 2: 洞穴（暗色天空、藍色光點、鐘乳石）
Zone 3: 山頂（明亮天空、少樹、風大）
Zone 4: 河岸（藍色調、水面反光）
```

**需要改的**：
1. 新增 `ZoneDef` 型別（tileColors override、sky override、fog override、物件種類）
2. TrackDef 加 `zones: ZoneDef[]`（每個 zone 有 startPercent、endPercent）
3. `tilemap.ts` 根據 zone 使用不同 tile 顏色
4. `sky.ts` 支援漸變過渡
5. `world-objects.ts` 根據 zone 放置不同物件
6. 新增精靈類型（鐘乳石、水晶、路燈等）

**優點**：
- 視覺衝擊最大 — 每個區段完全不同的風格
- 「進入洞穴」和「爬出山頂」的體驗非常明確

**缺點**：
- 改動範圍大（tilemap、sky、objects、fog 都要支援 per-zone）
- 精靈預渲染數量增加（每個 zone 不同的物件）
- 區段過渡需要平滑處理，否則會突然跳變
- Chromecast v3 效能風險：多套顏色表、多套精靈

### 方案 C: 組合方案（A + B 精簡版）

**核心思路**：先實作偽坡度（方案 A），再加入精簡版區段主題（只改霧色和天空色調，不改整個 ThemeDef）。

**分階段**：
- Phase 1：偽坡度（CAMERA_HEIGHT/HORIZON_Y 動態化）
- Phase 2：沿賽道的色調漸變（用現有 fogColor 做漸變 → 高處清透、低處濃霧/暗色）
- Phase 3：（可選）不同區段的物件密度和種類權重

**優點**：
- 可分階段交付，每階段都有可見效果
- Phase 1 改動最小且效果最明顯
- Phase 2 利用現有 fog 系統，改動可控
- 效能可控

**缺點**：
- 不如完整 Zone System 視覺衝擊大
- 漸進交付需要好的架構設計避免反覆重構

## 限制與風險

### Chromecast v3 效能
- Mode 7 是**每像素運算**（960×340 = 326,400 像素/幀），新增計算要極度謹慎
- 方案 A 只改攝影機參數（per-frame 幾個乘法），零效能風險
- 方案 B 若做 per-zone 顏色表切換，需要在 zone 邊界重建 foggedColorTable（一次性 ~5ms）

### 向下相容
- TrackPoint 加 `y?: number`，現有 jungleLoopTrack 不帶 y → 預設 0 → 完全平坦 → 行為不變
- 現有測試應不受影響

### 隨機賽道整合
- 隨機生成器需要額外生成合理的 y 值（sin 波形最簡單）
- 需要避免高度變化太劇烈（lerp 過渡）

## 結論

**推薦方案 C（組合方案），分階段實作：**

1. **Phase 1: 偽坡度** — 效果/投入比最高，改動集中在 camera + mode7 + renderer
2. **Phase 2: 高度連動視覺** — 高處天空亮 + 霧淡、低處天空暗 + 霧濃，用現有系統做漸變
3. **Phase 3: 物件多樣性** — 更多精靈種類、沿途密度變化

Phase 1 預估影響範圍：
- `courses/types.ts` — TrackPoint 加 y
- `track.ts` — TrackSample 加 y，插值 y
- `camera.ts` — CameraState 加 height
- `mode7.ts` — renderMode7Ground 接收動態 cameraHeight
- `renderer.ts` — renderScene 用動態 horizonY
- `random-track.ts` — 生成 y 值
- `constants.ts` — 新增 ELEVATION_CONFIG

等待使用者確認方向後進入 Plan 階段。
