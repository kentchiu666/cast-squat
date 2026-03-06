# Research: Virtual Run（虛擬跑步遊戲）

> 建立日期: 2026-03-05
> 狀態: 已完成

## 目標

建立一個「虛擬跑步」遊戲模組 Demo 版本：
- Chromecast 播放 YouTube 跑步風景影片作為背景
- 玩家拿手機擺動手臂（模擬跑步）
- 畫面上顯示累積跑步距離
- Demo 版本：單人、固定影片（1-2 分鐘）

影片：[Virtual Run in Italy: Val Fiscalina Trail – Dolomites](https://www.youtube.com/watch?v=j5V7sxGGb_s)（RunVirtual 頻道）

## 現有程式碼分析

### 相關檔案
| 檔案 | 職責 | 與本功能的關係 |
|------|------|----------------|
| `src/types/game.ts` | GameModule 介面、所有型別 | 新遊戲必須實作此介面 |
| `src/game-registry.ts` | 遊戲註冊表 | 需新增 virtual-run 註冊 |
| `src/App.vue` | 平台主元件、遊戲迴圈 | 載入/卸載遊戲、tick/render 驅動 |
| `src/games/shake-it/` | 最新遊戲模組範例 | 參考 ui-state + Vue 元件 pattern |

### 現有架構理解

#### GameModule 介面（完整）
```typescript
interface GameModule {
  id: string
  name: string
  init(canvas, ctx, characterSheets, itemSpritesheet): void
  start(): void
  stop(): void
  destroy(): void
  handleMessage(data, senderId?): void
  getState(): string
  getUIComponent(): Component
  setBroadcastCallbacks(broadcastFn, replyFn): void
  setReturnToLobbyCallback?(fn): void
  tick(): void
  render(ctx): void
}
```

#### 遊戲 UI 模式（Vue reactive state）
```
index.ts 更新 uiState → Vue 元件自動渲染
Vue 元件按鈕 → uiState.onAction → index.ts handleAction()
```

#### 與現有遊戲的差異
| 特性 | squat-jump / shake-it | virtual-run |
|------|----------------------|-------------|
| 主畫面 | Canvas 繪製角色/粒子 | YouTube 影片 |
| 遊戲時間 | 固定 20 秒 | 影片長度（1-2 分鐘） |
| 輸入方式 | 單次動作（跳/搖） | 持續手臂擺動 |
| 計分 | 次數 + 金幣 | 累積距離（公尺） |
| render() | 每幀 Canvas 繪製 | 可能不需要（YouTube 自行渲染） |

### 相關模式與慣例
- 遊戲 CSS class 用遊戲名前綴（`run-`）
- module-level `let` 變數管理狀態
- `ui-state.ts` + `*UI.vue` 的 reactive 模式
- `destroy()` 必須清理所有資源
- `constants.ts` 管理可調參數

## 技術調研

### 核心問題：YouTube 在 Cast Web Receiver 播放

#### 方案 A：YouTube IFrame Player API
已有開源專案 [android-youtube-player](https://github.com/PierfrancescoSoffritti/android-youtube-player) 在 Chromecast receiver 成功使用 YouTube IFrame API，證明可行。

**嵌入方式**：
```javascript
// 1. 動態載入 API script
const tag = document.createElement('script')
tag.src = "https://www.youtube.com/iframe_api"
document.head.appendChild(tag)

// 2. API ready 後建立 player
function onYouTubeIframeAPIReady() {
  player = new YT.Player('playerDiv', {
    videoId: 'j5V7sxGGb_s',
    playerVars: { controls: 0, autoplay: 1, modestbranding: 1 },
    events: { onReady, onStateChange, onError }
  })
}

// 3. 控制
player.playVideo() / pauseVideo() / getCurrentTime() / getDuration()
```

**優點**：
- 已驗證可在 Chromecast 運行
- 完整的 JS API 控制播放
- 不需要自行處理影片串流

**缺點/風險**：
- ⚠️ **YouTube ToS overlay 限制**：YouTube Required Minimum Functionality 規定「不得在播放器上方顯示遮蓋物」。在影片上疊加遊戲 UI 嚴格來說違反 ToS
- 5 分鐘 idle 斷線問題（需要 setTimeout hack）
- 地區限制（某些影片可能無法播放）
- iframe 額外消耗 GPU/CPU 資源

#### 方案 B：CAF 內建 Media Player
```html
<cast-media-player></cast-media-player>
```
**不可行** — 只支援 MPEG-DASH / HLS / Smooth Streaming 等直接串流 URL，**不支援 YouTube URL**。

#### 方案 C：分區設計（規避 ToS）
YouTube 影片佔畫面一部分，遊戲 UI 佔另一部分，互不重疊。

```
┌──────────────────────────────┐
│                              │
│      YouTube 影片（上方）      │
│         (全寬, 70%高)         │
│                              │
├──────────────────────────────┤
│  🏃 距離: 156m    ⏱ 1:23    │
│  ████████░░░░░░  (進度條)     │
│        [ STOP ]              │
└──────────────────────────────┘
```

**優點**：不違反 YouTube ToS（UI 不在播放器上方）
**缺點**：影片無法全屏，沉浸感降低

#### 方案 D：全屏影片 + 底部半透明 overlay
影片全屏，UI 只在底部一小條區域（類似字幕位置）。

```
┌──────────────────────────────┐
│                              │
│     YouTube 全屏影片          │
│                              │
│                              │
│                              │
│                              │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│ 🏃 156m          ⏱ 1:23     │  ← 半透明黑底 overlay
└──────────────────────────────┘
```

**評估**：技術上仍然在播放器上方，但類似字幕區域，風險較低。許多 YouTube overlay 應用程式（如彈幕、字幕）都這樣做。Demo 階段可以先這樣。

### 手機加速度計計步（Flutter Sender）

#### sensors_plus 套件
```dart
import 'package:sensors_plus/sensors_plus.dart';

userAccelerometerEventStream(
  samplingPeriod: const Duration(milliseconds: 20), // 50 Hz
).listen((event) {
  _processStep(event.x, event.y, event.z);
});
```

#### 計步演算法（Peak Detection）
1. 計算加速度向量長度：`magnitude = sqrt(x² + y² + z²)`
2. 低通濾波（EMA，alpha=0.3）去除高頻雜訊
3. 偵測峰值（從上升轉為下降的轉折點，且超過閾值）
4. 最小步間隔 300ms 防止雙重計數

```dart
class StepDetector {
  double _lastMag = 0;
  bool _isRising = false;
  int _lastStepTime = 0;
  final double threshold = 1.2;        // m/s²
  final int minStepInterval = 300;     // ms

  bool processSample(double x, double y, double z, int timestampMs) {
    final mag = _lowPassFilter(sqrt(x*x + y*y + z*z));
    if (mag > _lastMag) {
      _isRising = true;
    } else if (_isRising && mag < _lastMag && _lastMag > threshold) {
      _isRising = false;
      if (timestampMs - _lastStepTime > minStepInterval) {
        _lastStepTime = timestampMs;
        _lastMag = mag;
        return true; // 偵測到一步
      }
    }
    _lastMag = mag;
    return false;
  }
}
```

#### 步數 → 距離
- 平均步幅約 0.7m（可用身高 × 0.415 估算）
- Demo 版本直接用固定步幅即可

### Sender → Receiver 通訊設計

計步資料在 Sender 端處理，定期發送累積距離給 Receiver：

```dart
// Sender 端：每秒發送一次距離更新
castChannel.sendMessage({
  'action': 'RUN_UPDATE',
  'playerId': playerId,
  'steps': stepCount,
  'distance': stepCount * 0.7,  // 公尺
});
```

**為什麼不傳原始加速度**：
- 網路頻寬考量（50Hz × 3 軸 = 150 個數值/秒太多）
- 計步邏輯放 Sender 端延遲更低
- Receiver 只需顯示結果，不需重新計算

## 限制與風險

### 技術限制
1. **YouTube ToS overlay**：在播放器上方顯示 UI 違反 ToS。Demo 可用分區或底部 bar 設計規避
2. **5 分鐘 idle 斷線**：Cast Custom Channel 使用時 receiver 保持 IDLE，需要 hack 或定期發送 heartbeat
3. **計步精確度**：加速度計計步不 100% 準確，但 Demo 夠用。閾值和步間隔需要實機調參
4. **影片地區限制**：部分 YouTube 影片可能在 Chromecast 上無法播放

### Chromecast v3 效能
- YouTube 播放本身沒問題（Chromecast 就是設計來播影片的）
- **但** YouTube iframe + Canvas 同時運行有風險
- **建議**：遊戲 UI 全部用 DOM/Vue（不用 Canvas），降低 GPU 負擔
- `tick()` 和 `render()` 可以是空操作或極輕量

### 架構特殊性
這個遊戲跟現有遊戲有根本性差異：
- **不需要 Canvas 繪製**（影片由 YouTube iframe 處理）
- **render() 可以是空操作**
- **tick() 只需更新計時和 UI state**
- 主要視覺是 YouTube 影片 + DOM overlay，不是 Canvas 精靈動畫

## 結論

### 建議方向
1. **YouTube IFrame API** — 唯一可行的 YouTube 播放方案（CAF 不支援）
2. **UI 分區設計（方案 D）** — 影片全屏 + 底部半透明 bar 顯示距離/時間，盡量不遮擋影片主體
3. **計步在 Sender 端** — 用 sensors_plus + peak detection，每秒發送距離更新
4. **遊戲 UI 用 Vue DOM** — 不用 Canvas，降低 Chromecast 效能壓力
5. **render() 為空操作** — 影片和 UI 都不經過 Canvas

### Demo 範圍
- 單人模式
- 固定 YouTube 影片（`j5V7sxGGb_s`）
- 影片播完 = 遊戲結束
- 顯示：距離（公尺）、已用時間、進度條
- 最簡狀態機：START_SCREEN → PLAYING → GAME_OVER

### Cast 訊息設計（初步）
| 方向 | Action | 資料 |
|------|--------|------|
| Sender → Receiver | `RUN_UPDATE` | `{ playerId, steps, distance }` |
| Sender → Receiver | `START_GAME` | — |
| Receiver → Sender | `STATE_UPDATE` | `{ state: 'PLAYING' }` |
| Receiver → Sender | `GAME_RESULTS` | `{ distance, time, steps }` |
