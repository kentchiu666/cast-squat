# Research: NPC 陪跑（Pacer）

> 建立日期: 2026-03-24
> 狀態: 已完成

## 目標

在 jungle-run 中加入一個 NPC 陪跑者，使用橡皮筋行為模式，讓單人跑步體驗更有互動感。

## 現有程式碼分析

### 相關檔案
| 檔案 | 職責 | 與本功能的關係 |
|------|------|----------------|
| `index.ts` | 遊戲主邏輯、tick/render 迴圈 | NPC 的 tick 更新和 render 呼叫點 |
| `renderer.ts` | 主渲染器（sky → mode7 → objects → effects → minimap） | NPC 繪製需插入渲染管線 |
| `world-objects.ts` | 世界物件投影（世界座標 → 攝影機空間 → 螢幕） | **可直接複用投影數學** |
| `track.ts` | `sampleTrack(lut, distance)` — 距離 → 世界座標+方向 | NPC 位置計算的核心依賴 |
| `camera.ts` | 攝影機跟隨賽道 | NPC 投影需要 camera 參數 |
| `cadence.ts` | `lerp()` — 線性內插 | NPC 速度平滑可複用 |
| `constants.ts` | 所有引擎常數 | 新增 NPC_CONFIG |
| `ui-state.ts` | Vue reactive 狀態 | 可加 NPC 距離差顯示（可選） |
| `JungleRunUI.vue` | HUD 元件 | 可加 NPC 距離差 UI（可選） |

### 現有架構理解

#### 渲染管線順序（renderer.ts renderScene）
```
sky → clouds → mode7Ground → worldObjects → particles → lightRays → speedLines → minimap
```
NPC 應插入在 `worldObjects` 之後、`particles` 之前，確保 NPC 在地面上但被特效覆蓋。

#### 世界物件投影公式（world-objects.ts projectObjects）
```typescript
// 世界座標 → 攝影機空間
const localX = dx * cosA + dz * sinA
const localZ = dx * sinA - dz * cosA

// 攝影機空間 → 螢幕座標
const groundBufferY = cameraHeight * focalLength / localZ - 1
const screenY = horizonY + groundBufferY * logicalScale
const scale = focalLength / localZ
const screenX = screenCenterX + localX * scale * 2
```
NPC 可以直接用這套公式，不需要加入 worldObjects 陣列（因為 NPC 是動態的）。

#### 賽道位置查詢
`sampleTrack(trackLUT, distance)` 回傳 `{ x, z, angle, distance }`，支援自動循環。NPC 只需維護自己的 `scrollOffset`，每 tick 呼叫 `sampleTrack` 就能取得世界座標。

#### 車道偏移計算
從 `world-objects.ts` 的 `generateWorldObjects` 可看到偏移公式：
```typescript
const perpX = Math.cos(sample.angle)  // 垂直於賽道方向
const perpZ = Math.sin(sample.angle)
// worldX = sample.x + perpX * offset（右側正、左側負）
```

### 相關模式與慣例

1. **module-level let 變數** — 不用 class，NPC 狀態用 `let npcOffset`, `let npcSpeed` 等
2. **預渲染精靈** — 用 `OffscreenCanvas` 在 init 時畫好，render 時 `ctx.drawImage`
3. **常數集中到 constants.ts** — 用 config object（如 `NPC_CONFIG`）
4. **純邏輯函數可測試** — 橡皮筋速度計算是純函數，應寫單元測試

## 技術調研

### NPC 模組設計

建議新增 `npc.ts` 模組，職責：
- NPC 精靈預渲染
- tick 更新（橡皮筋速度邏輯）
- 世界座標 → 螢幕投影 + 繪製
- minimap 點繪製

### 橡皮筋速度演算法

```
每 tick：
  gap = playerOffset - npcOffset   （正值 = 玩家在前）
  normalizedGap = gap / trackLength （歸一化到 0~1，處理迴圈賽道）

  if 玩家在前太多 → NPC 加速追趕
  if NPC 在前太多 → NPC 減速等待
  if 差距在安全範圍 → NPC 維持基礎速度

  npcTargetSpeed = baseSpeed + rubberBandForce(normalizedGap)
  npcSpeed = lerp(npcSpeed, npcTargetSpeed, LERP_FACTOR)
  npcOffset += npcSpeed
```

**關鍵參數：**
- `BASE_SPEED` — NPC 基礎速度（對應玩家中等配速）
- `RUBBER_BAND_STRENGTH` — 橡皮筋拉力強度
- `COMFORT_DISTANCE` — 理想領先/落後距離
- `MAX_SPEED_MULT` — NPC 最大加速倍率（防止瞬移）
- `LANE_OFFSET` — 車道偏移距離（道路中心偏右）
- `SPEED_LERP` — 速度平滑因子

### 像素小人精靈

簡單 8x16 或 12x20 像素的跑步小人，用 `OffscreenCanvas` 手繪：
- 頭（2x2 或 3x3 方塊）
- 身體（長方形）
- 腿部（簡單兩條線，可用 tick 切換走路幀）
- 顏色用橙色或藍色，與玩家的綠色區分
- 透明度稍低（0.8）表示是虛擬 NPC

### Minimap 顯示

在 `renderer.ts` 的 `drawMinimap` 中，玩家是綠色方塊。NPC 加一個不同顏色的方塊（橙色）。

### 投影與深度排序

NPC 需要與 worldObjects 一起做深度排序，否則會出現 NPC 穿過樹的問題。

**兩個方案：**

**A. NPC 加入 projected 陣列一起排序（推薦）**
- renderer 在 `projectObjects` 後，計算 NPC 投影，插入 projected 陣列，重新按 depth 排序
- 優點：深度正確
- 缺點：需要在 renderWorldObjects 中辨識 NPC 用不同繪製方式

**B. NPC 獨立繪製**
- worldObjects 畫完後單獨畫 NPC
- 優點：簡單
- 缺點：NPC 永遠在所有樹前面（不自然，但 NPC 在道路上通常不會被樹擋住）

→ 考慮到 NPC 跑在道路上（樹在路邊），**方案 B 在實務上幾乎不會穿幫**，而且簡單很多。推薦 B。

## 限制與風險

### Chromecast v3 效能
- NPC 精靈預渲染 → **零額外開銷**（init 時一次）
- 每 tick 多一次 `sampleTrack` 查詢 → **< 0.01ms**（二分搜）
- 每幀多一次投影計算 + drawImage → **可忽略**（單一精靈）
- Minimap 多畫一個方塊 → **可忽略**
- **結論：效能影響幾乎為零**

### Edge Cases
- **玩家靜止不動**：NPC 應該也慢下來，不要一直繞圈
- **玩家剛開始**：NPC 從玩家附近出發（如領先 50m）
- **迴圈邊界**：`scrollOffset` 取模後，gap 計算要處理環形距離

## 結論

建議新增 `src/games/jungle-run/npc.ts` 模組，使用橡皮筋演算法維持 NPC 在玩家附近。複用現有的 `sampleTrack` 做位置查詢、`projectObjects` 的投影公式做螢幕繪製。NPC 獨立繪製（方案 B），精靈用 OffscreenCanvas 預渲染簡單像素小人。效能影響可忽略。
