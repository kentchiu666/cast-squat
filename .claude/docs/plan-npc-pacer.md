# Plan: NPC 陪跑（Pacer）

> 建立日期: 2026-03-24
> 狀態: 已完成
> Research: `.claude/docs/research-npc-pacer.md`

## 概要

在 jungle-run 遊戲中加入一個 NPC 陪跑者。NPC 以橡皮筋行為模式跟隨玩家（拉開就追、落後就等），視覺上是簡單像素小人，跑在道路中心偏右側。包含 Minimap 上的橙色標記。

## 實作步驟

### 1. 新增 NPC 常數
- [ ] 在 `constants.ts` 新增 `NPC_CONFIG`
- 檔案: `src/games/jungle-run/constants.ts`

```typescript
export const NPC_CONFIG = {
  // 橡皮筋行為
  BASE_SPEED: 3.5,              // 基礎速度（對應玩家中等配速）
  RUBBER_BAND_STRENGTH: 0.02,   // 橡皮筋拉力係數
  COMFORT_DISTANCE: 80,         // 理想距離（track 距離單位）
  MAX_SPEED_MULT: 2.0,          // 最大加速倍率
  MIN_SPEED_MULT: 0.1,          // 最低速度倍率（不完全停下）
  SPEED_LERP: 0.03,             // 速度平滑因子
  INITIAL_LEAD: 50,             // 起始領先距離
  // 車道
  LANE_OFFSET: 25,              // 道路中心偏右距離
  // 精靈
  SPRITE_WIDTH: 12,             // 精靈寬度（像素）
  SPRITE_HEIGHT: 20,            // 精靈高度（像素）
  COLOR: '#FF8C42',             // 橙色
  ALPHA: 0.85,                  // 稍微透明
  // Minimap
  MINIMAP_COLOR: '#FF8C42',     // Minimap 點顏色
  MINIMAP_DOT_SIZE: 6,          // Minimap 點大小
} as const
```

### 2. 新增 `npc.ts` — NPC 核心模組（TDD）
- [ ] 先寫測試，再寫實作
- 檔案: `src/games/jungle-run/npc.ts`

**模組職責：**
- `initNpc()` — 預渲染像素小人精靈
- `resetNpc(playerOffset)` — 重置 NPC 狀態（起始位置 = playerOffset + INITIAL_LEAD）
- `tickNpc(playerOffset, playerSpeed, trackLength)` — 橡皮筋速度更新，回傳 NPC 世界座標
- `renderNpc(ctx, camX, camZ, camAngle)` — 投影 + 繪製
- `getNpcMinimapInfo()` — 回傳 NPC 的 scrollOffset 供 minimap 使用
- `destroyNpc()` — 清理

**純邏輯函數（需要測試）：**

```typescript
// 計算環形距離（處理迴圈邊界）
export function circularGap(playerOffset: number, npcOffset: number, trackLength: number): number

// 橡皮筋速度計算
export function rubberBandSpeed(gap: number, baseSpeed: number, config: typeof NPC_CONFIG): number
```

**精靈預渲染（不需測試）：**
```typescript
// 12x20 像素小人，OffscreenCanvas 手繪
// 頭: 4x4 方塊
// 身體: 4x6 長方形
// 腿: 兩條 2px 線（兩幀切換模擬跑步）
```

### 3. 新增單元測試
- [ ] `circularGap` 測試（正常 gap、環形邊界、反向）
- [ ] `rubberBandSpeed` 測試（玩家在前→加速、玩家在後→減速、comfort zone、極端值）
- 檔案: `src/games/jungle-run/__tests__/npc.test.ts`

### 4. 整合到 `index.ts`
- [ ] import npc 模組
- [ ] `onInit` 中呼叫 `initNpc()`
- [ ] `startGame` 中呼叫 `resetNpc(0)`
- [ ] `onTick` PLAYING 區塊中呼叫 `tickNpc()`
- [ ] `onDestroy` 中呼叫 `destroyNpc()`
- 檔案: `src/games/jungle-run/index.ts`

### 5. 整合到 `renderer.ts`
- [ ] 在 `renderScene` 中，worldObjects 繪製後呼叫 `renderNpc()`
- [ ] 在 `drawMinimap` 中繪製 NPC 橙色方塊
- [ ] `RenderParams` 新增 `npcScrollOffset` 欄位
- 檔案: `src/games/jungle-run/renderer.ts`

### 6. 型別檢查 + 測試
- [ ] `npm test` 全數通過
- [ ] `npm run build` 型別檢查通過

## 影響範圍

### 新增檔案
| 檔案 | 用途 |
|------|------|
| `src/games/jungle-run/npc.ts` | NPC 核心模組（狀態、精靈、投影、繪製） |
| `src/games/jungle-run/__tests__/npc.test.ts` | NPC 純邏輯函數單元測試 |

### 修改檔案
| 檔案 | 修改內容 |
|------|----------|
| `src/games/jungle-run/constants.ts` | 新增 `NPC_CONFIG` |
| `src/games/jungle-run/index.ts` | init/tick/destroy 整合 NPC |
| `src/games/jungle-run/renderer.ts` | renderScene 加 NPC 繪製、minimap 加 NPC 點、RenderParams 新增欄位 |

## 架構決策

- **獨立模組 `npc.ts`**：職責單一，不汙染現有模組。renderer 只負責呼叫，不管 NPC 邏輯。
- **NPC 獨立繪製（不混入 worldObjects 陣列）**：NPC 跑在道路上，被路邊樹擋住的機率極低，獨立繪製大幅簡化實作。
- **橡皮筋用純函數**：`circularGap` 和 `rubberBandSpeed` 是無副作用的純函數，方便測試和調參。
- **精靈預渲染**：符合 Chromecast v3 效能規範，init 時一次性繪製，不在每幀使用 ctx.filter。
- **不修改 UI 元件**：第一版不顯示 NPC 距離差數字，保持 HUD 簡潔。後續可選加。

## 測試計畫

### 單元測試（必要）
- [ ] `circularGap(100, 50, 1000)` → 50（正常 gap）
- [ ] `circularGap(50, 950, 1000)` → 100（環形邊界，玩家剛過起點，NPC 在終點附近）
- [ ] `circularGap(950, 50, 1000)` → -100（NPC 剛過起點在前）
- [ ] `rubberBandSpeed` — gap > COMFORT_DISTANCE → 速度 > BASE_SPEED
- [ ] `rubberBandSpeed` — gap < -COMFORT_DISTANCE → 速度 < BASE_SPEED
- [ ] `rubberBandSpeed` — gap ≈ 0 → 速度 ≈ BASE_SPEED
- [ ] `rubberBandSpeed` — 速度不超過 MAX_SPEED_MULT * BASE_SPEED
- [ ] `rubberBandSpeed` — 速度不低於 MIN_SPEED_MULT * BASE_SPEED

> 不需要測試的：精靈預渲染、Canvas 繪製、投影計算（與 world-objects 相同公式）。

### 手動驗證
- [ ] `npm run dev` → 開始遊戲 → NPC 像素小人出現在道路偏右
- [ ] 點擊 WALK/RUN 切換 → NPC 橡皮筋跟隨（拉開追趕、靠近減速）
- [ ] Minimap 有橙色 NPC 點
- [ ] 玩家靜止 → NPC 也慢下來
- [ ] 多圈跑步 → NPC 環形距離計算正確

## CLAUDE.md 更新項目
- jungle-run 模組表新增 `npc.ts` 職責說明
- jungle-run 測試清單新增 `npc.test.ts`

---

## Review Notes（自我審查）

- [x] 是否遵循現有 GameModule 介面和 pattern？→ 是，NPC 是獨立模組，透過 index.ts hooks 整合
- [x] 是否有遺漏的生命週期（init/start/stop/destroy）？→ init、reset（start 時）、tick、destroy 都有
- [x] 是否考慮 Chromecast v3 效能限制？→ 精靈預渲染、每幀只多一次投影+drawImage
- [x] 是否有 Cast 訊息格式不一致？→ 不涉及新 Cast 訊息
- [x] 影響範圍是否完整列出？→ 3 個修改 + 2 個新增
- [x] 測試計畫是否覆蓋關鍵路徑？→ 橡皮筋純函數 + 環形距離 edge cases

---

## 開發者註解區

> 以下區域供開發者在審核時加入註解，Claude 會根據註解修正計畫。
> 格式: `[註解] 你的意見`

