# 隨機賽道生成 — 研究筆記

> 狀態：**已完成** — 採用方案 A（圓形擾動控制點），已實作於 `courses/tracks/random-track.ts`

## 需求

每次進入遊戲產生不同的跑道，增加重玩性。

## 技術可行性

✅ 完全可行。現有架構已經是「控制點 → Catmull-Rom spline → tilemap」流程，只需把固定控制點換成隨機生成。

## 方案選項

### A. 隨機擾動圓形控制點（推薦，最簡單）

在圓/橢圓上等距放 8~12 個點，每個點加隨機偏移，Catmull-Rom 自動平滑。

```typescript
function generateRandomTrack(seed: number, numPoints: number, radius: number): TrackPoint[] {
  const rng = seededRandom(seed)  // 可重現的隨機
  const points: TrackPoint[] = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    const r = radius + (rng() - 0.5) * radius * 0.6
    const tangent = (rng() - 0.5) * radius * 0.3
    points.push({
      x: Math.cos(angle) * r + Math.sin(angle) * tangent,
      z: Math.sin(angle) * r - Math.cos(angle) * tangent,
    })
  }
  return points
}
```

- 優點：簡單、封閉迴圈保證、形狀自然
- 缺點：賽道形狀相對單調（都是類圓形）

### B. 片段拼接

預定義片段（直道、左彎30°、右彎60°、髮夾彎等），隨機組合後閉合。

- 優點：可控制難度、保證合理的彎道組合
- 缺點：實作較複雜、需要處理閉合問題

### C. Perlin noise 路徑

沿一條基礎路徑加上 Perlin noise 偏移。

- 優點：非常自然的蜿蜒
- 缺點：不保證封閉迴圈、可能自交叉

## 需要討論的問題

1. **是否需要 seed**？用 seed 可以讓同一個 seed 產生同一條賽道（分享、排行榜用）
2. **賽道難度控制**？例如簡單=大彎、困難=急彎+髮夾彎
3. **建築物位置**？固定在最急彎處、或也隨機？
4. **地圖大小**？隨機賽道可能需要更大的 tilemap（256x256）
5. **是否需要「賽道預覽」**？開始前先在 minimap 看到整條賽道形狀
6. **自交叉檢測**？隨機生成的路徑可能會交叉，需不需要檢測並重新生成？

## 效能影響

- 生成隨機控制點：< 1ms
- buildTrackLUT：不變（~5ms）
- generateTilemap：不變（取決於 MAP_SIZE）
- **總計**：幾乎零額外開銷，只是 init 時多一步

## 整合方式

現有 `TrackDef` 介面已支援：

```typescript
// 在 index.ts 的 onInit 中：
const randomTrack = generateRandomTrackDef(Date.now())  // 或用固定 seed
initRenderer(canvasCtx, randomTrack, jungleTheme)
```

不需要改架構，只需新增一個 `generateRandomTrackDef()` 函數。
