# GWP 2.0 - Party Game

## 背景與目標

透過 Chromecast 將手機變成體感控制器，在電視上進行多人 Party Game 體感運動競賽。

## 功能說明

### 遊戲類型

#### 1. 計次比拼型

玩家在限定時間內比拚動作次數，次數越多分數越高。

| 遊戲 | 玩法說明 | 感測方式 | 狀態 |
|------|---------|---------|------|
| 深蹲跳 (Squat Jump) | 跳越多分越高 | G-sensor | ✅ 已完成 |
| 搖搖樂 | 手持手機瘋狂搖晃（開合跳、甩手），比誰搖最多次 | G-sensor | 待開發 |
| 煎鍋翻面 | 模擬翻鍋動作，手機偵測翻轉，比誰成功翻面最多次 | G-sensor (gyroscope) | 待開發 |

#### 2. 反應指令型

電視隨機發出動作指令，玩家需在限定時間內完成對應動作。

| 遊戲 | 玩法說明 | 感測方式 | 備註 |
|------|---------|---------|------|
| 動作指令 | 電視隨機出「跳！」「蹲！」「舉手！」，判定動作對不對 | G-sensor | 給 1-2 秒反應窗口，延遲完全不是問題 |

- 做錯扣分或淘汰

#### 3. 撐住挑戰型

比誰能維持特定姿勢最久，手機偵測穩定度。

| 遊戲 | 玩法說明 | 感測方式 | 備註 |
|------|---------|---------|------|
| 單腳平衡挑戰 | 手持手機單腳站立，偵測是否穩定不動 | G-sensor | 晃動太大 = 撐不住 = 結束 |
| 端湯不灑 | 手機平放手掌上模擬端湯，保持水平不傾斜 | G-sensor (gyroscope) | 傾斜超過閾值 = 灑出 = 結束 |

- 比誰撐最久，電視上角色慢慢往上爬

#### 4. HIIT 教練型

電視出運動菜單，玩家完成後回報，比誰先做完整套。

| 遊戲 | 玩法說明 | 備註 |
|------|---------|------|
| HIIT 挑戰 | 電視出運動菜單：「深蹲 ×10 → 開合跳 ×10 → 休息 15 秒」 | 不需要即時同步，完全容錯 |

- 玩家完成後回報，比誰先做完整套

#### 5. 高度 / 力道型

單次動作比拚峰值表現。

| 遊戲 | 玩法說明 | 感測方式 | 備註 |
|------|---------|---------|------|
| 誰跳最高 | 取 G-sensor 峰值加速度，比單次跳躍高度 | G-sensor | 一輪只跳一次，不受延遲影響 |
| 揮拳力道 | 模擬出拳，取 G-sensor 加速度峰值，比單次力道最大 | G-sensor | 一輪只揮一次，不受延遲影響 |

## 核心需求

### 玩家人數

- 每位玩家使用自己的手機作為控制器
- 盲玩 → 揭曉模式的遊戲（計次比拼、撐住挑戰、HIIT 教練、高度/力道）：支援 1-8 人
- 反應指令型：支援 1-4 人（需要 Cast 即時發送指令與判定，人數過多影響體驗）

### 遊戲流程模式：盲玩 → 揭曉

所有遊戲採用「盲玩 → 揭曉」流程，避免手機與 Cast 之間的延遲（100-300ms）影響體驗與公平性：

1. **Cast 發出開始信號** — 電視顯示倒數計時，所有玩家同時開始
2. **盲玩階段** — 遊戲進行中，手機端本地偵測與計分，Cast 不顯示即時數據
3. **回傳結果** — 時間到或遊戲結束後，各手機回傳最終結果（次數、秒數、峰值等）
4. **統一揭曉** — Cast 收齊所有結果後，統一顯示排名

> **設計原則：手機端負責偵測與判定，Cast 端只負責發號施令與展示結果。**

### Use Cases

#### UC1：第一個使用者啟動遊戲（正常流程）

1. 使用者 A 開啟 App → 看到遊戲列表
2. 點選「深蹲跳躍」
3. 點 Cast 按鈕 → 選擇 Chromecast → 連線
4. Chromecast 載入 Receiver（初始狀態：LOBBY，無遊戲）
5. Sender 收到 `sessionStarted`
6. Sender 發送 `{ action: 'LOAD_GAME', gameId: 'squat_jump' }`
7. Receiver 載入深蹲跳躍模組 → 回覆 `{ type: 'GAME_LOADED', gameId: 'squat_jump' }`
8. Sender 收到確認 → 切換到深蹲跳躍 UI → 自動發送 `PLAYER_JOIN`
9. 正常遊戲流程...

#### UC2：第二個使用者加入已在進行的遊戲

1. 使用者 B 開啟 App → 看到遊戲列表
2. 點選「搖搖樂」（注意：跟 A 選的不同）
3. 連線到同一台 Chromecast
4. Sender 收到 `sessionStarted`
5. Sender 先發 `{ action: 'QUERY_STATE' }`（不是直接 LOAD_GAME）
6. Receiver 回覆 `{ type: 'CURRENT_STATE', gameId: 'squat_jump', state: 'START_SCREEN' }`
7. Sender 發現 Chromecast 已在跑「深蹲跳躍」→ 兩種處理方式：
   - a. 自動切換到深蹲跳躍 UI（推薦）
   - b. 提示「目前正在玩深蹲跳躍，是否加入？」
8. 使用者 B 加入深蹲跳躍 → 發送 `PLAYER_JOIN`

#### UC3：遊戲結束後切換遊戲

1. 深蹲跳躍結束 → `GAME_OVER`
2. 使用者 A 按「回到大廳」（新按鈕，不是「再來一局」）
3. Sender 發送 `{ action: 'RETURN_LOBBY' }`
4. Receiver 卸載當前遊戲 → 切換到 LOBBY 狀態
5. Receiver 廣播 `{ type: 'STATE_UPDATE', state: 'LOBBY', gameId: null }`
6. 所有 Sender 收到 → 回到遊戲選擇畫面
7. 任一使用者選擇新遊戲 → 回到 UC1 步驟 6

#### UC4：使用者中途斷線重連

1. 使用者 A 正在玩深蹲跳躍
2. App 進背景 / 網路斷線
3. App 回到前景 → Cast SDK 自動重連（或手動重連）
4. Sender 收到 `sessionStarted`
5. Sender 發送 `{ action: 'QUERY_STATE' }`
6. Receiver 回覆 `{ type: 'CURRENT_STATE', gameId: 'squat_jump', state: 'PLAYING' }`
7. Sender 切到深蹲跳躍 UI → 顯示「遊戲進行中，請等待下一輪」
8. 遊戲結束 → Receiver 回到 START_SCREEN → Sender 自動 `PLAYER_JOIN`（auto-rejoin）

#### UC5：Chromecast 已有遊戲，新使用者開 App

1. Chromecast 正在跑深蹲跳躍（別人已經在玩）
2. 使用者 C 第一次開啟 App
3. 連線到 Chromecast（Cast SDK 加入已存在的 session）
4. Sender 發送 `QUERY_STATE`
5. Receiver 回覆當前狀態
6. Sender 根據 `gameId` 自動切到對應 UI
   - 如果 `PLAYING`：顯示等待畫面
   - 如果 `START_SCREEN`：允許加入

#### UC6：兩人同時選不同遊戲（競爭條件）

1. Chromecast 在 LOBBY 狀態
2. 使用者 A 發送 `LOAD_GAME { gameId: 'squat_jump' }`
3. 使用者 B 幾乎同時發送 `LOAD_GAME { gameId: 'shake' }`
4. Receiver 處理：**先到先贏**
   - 第一個 `LOAD_GAME` 成功 → 回覆 `GAME_LOADED`
   - 第二個 `LOAD_GAME` 失敗 → 回覆 `{ type: 'LOAD_REJECTED', reason: 'GAME_ALREADY_LOADED', currentGameId: 'squat_jump' }`
5. 使用者 B 收到拒絕 → 自動切到深蹲跳躍 UI

## 技術需求

### 架構決策：單一 APP_ID

Google Cast SDK 的 `GCKCastContext.setSharedInstanceWith()` (iOS) 和 `CastContext.initialize()` (Android) 只能在 App 啟動時呼叫一次，**不支援 runtime 切換 APP_ID**。因此採用：

```
一個 APP_ID → 一個 Receiver「平台」
Sender 選好遊戲後 → 連線 → 發送 LOAD_GAME → Receiver 動態載入對應遊戲模組
```

- Namespace：所有遊戲共用 `urn:x-cast:com.example.castsquat`

### 系統架構圖

```
┌──────────────────────────────────────────────────────┐
│                  Chromecast (Receiver)                 │
│                                                       │
│  ┌──────────┐   LOAD_GAME    ┌──────────────────┐    │
│  │  LOBBY   │ ─────────────→ │  遊戲模組載入器   │    │
│  │  等候畫面 │ ←───────────── │                  │    │
│  └──────────┘  GAME_LOADED   │ ┌──────────────┐ │    │
│                              │ │ 深蹲跳躍      │ │    │
│                              │ ├──────────────┤ │    │
│                              │ │ 搖搖樂       │ │    │
│                              │ ├──────────────┤ │    │
│                              │ │ 煎鍋翻面     │ │    │
│                              │ └──────────────┘ │    │
│                              └──────────────────┘    │
│                         │                             │
│                         │ fetch POST (GAME_OVER)      │
│                         ▼                             │
│                   Backend API                         │
└─────────────────────┬────────────────────────────────┘
                      │ Cast Custom Channel
                      │ (urn:x-cast:com.example.castsquat)
         ┌────────────┼────────────┐
         │            │            │
  ┌──────┴──────┐ ┌───┴──┐ ┌──────┴─────┐
  │  Sender A   │ │  B   │ │     C      │
  │  (Flutter)  │ │      │ │            │
  │ iOS/Android │ │      │ │            │
  └─────────────┘ └──────┘ └────────────┘
```

### Receiver 狀態機

```
                   ┌──────────────────────────────────────────┐
                   │                                          │
                   ▼                                          │
              ┌─────────┐   LOAD_GAME    ┌─────────────┐     │
 Receiver ──→ │  LOBBY  │ ────────────→  │ 遊戲模組啟動 │     │
 啟動         │  等候畫面 │               │             │     │
              └─────────┘               └──────┬──────┘     │
                   ▲                           │             │
                   │                           ▼             │
                   │  RETURN_LOBBY     ┌─────────────┐       │
                   │◄───────────────── │ 遊戲內狀態   │       │
                   │                   │ (各遊戲自管) │       │
                   │                   └─────────────┘       │
                   │                                          │
                   │            LOAD_GAME (切換遊戲)           │
                   └──────────────────────────────────────────┘
```

**平台狀態：**

| 狀態 | 說明 |
|------|------|
| `LOBBY` | 平台等候畫面，等待 Sender 發送 LOAD_GAME |
| `GAME_ACTIVE` | 遊戲模組已載入，內部狀態由模組自行管理 |

**遊戲模組內部狀態（以深蹲跳躍為例）：**

```
START_SCREEN → COUNTDOWN → PLAYING → GAME_OVER
      ↑                                   │
      └──── 再來一局（START_GAME）──────────┘
                    或
              RETURN_LOBBY → 回到平台 LOBBY
```

### Sender App 流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   App 首頁   │     │  搜尋裝置    │     │   連線成功    │     │  遊戲控制頁  │
│              │────→│              │────→│              │────→│              │
│  顯示遊戲列表 │     │  選擇裝置    │     │  QUERY_STATE │     │  JUMP 按鈕   │
│  選擇遊戲    │     │  等待連線    │     │  LOAD_GAME   │     │  遊戲狀態同步 │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 訊息協議

#### 平台層訊息（Sender → Receiver）

| 訊息 | 格式 | 說明 |
|------|------|------|
| QUERY_STATE | `{ action: 'QUERY_STATE' }` | 查詢 Receiver 當前狀態（連入時使用） |
| LOAD_GAME | `{ action: 'LOAD_GAME', gameId: 'squat_jump' }` | 要求載入指定遊戲 |
| RETURN_LOBBY | `{ action: 'RETURN_LOBBY' }` | 回到大廳（卸載當前遊戲） |

#### 平台層訊息（Receiver → Sender）

| 訊息 | 格式 | 說明 |
|------|------|------|
| CURRENT_STATE | `{ type: 'CURRENT_STATE', state: 'LOBBY' \| 'GAME_ACTIVE', gameId: null \| 'squat_jump', gameState: null \| 'START_SCREEN' }` | 回覆 QUERY_STATE |
| GAME_LOADED | `{ type: 'GAME_LOADED', gameId: 'squat_jump' }` | 遊戲載入完成 |
| LOAD_REJECTED | `{ type: 'LOAD_REJECTED', reason: 'GAME_ALREADY_LOADED', currentGameId: 'squat_jump' }` | 載入被拒絕 |

#### 遊戲層訊息（Sender → Receiver）

各遊戲可自訂，以下為通用 + 深蹲跳躍範例：

| 訊息 | 格式 | 說明 |
|------|------|------|
| PLAYER_JOIN | `{ action: 'PLAYER_JOIN', playerId: 'xxx', playerName: 'Alice', token: '...' }` | 加入遊戲（附帶驗證 token） |
| PLAYER_LEAVE | `{ action: 'PLAYER_LEAVE', playerId: 'xxx' }` | 離開遊戲 |
| START_GAME | `{ action: 'START_GAME' }` | 開始遊戲 |
| SQUAT_JUMP | `{ action: 'SQUAT_JUMP', playerId: 'xxx' }` | 深蹲跳躍動作 |
| GAME_RESULT | `{ action: 'GAME_RESULT', playerId: 'xxx', score: 15, details: {...} }` | 盲玩模式：回傳本地結果 |

#### 遊戲層訊息（Receiver → Sender）

| 訊息 | 格式 | 說明 |
|------|------|------|
| STATE_UPDATE | `{ type: 'STATE_UPDATE', state: 'START_SCREEN' \| 'COUNTDOWN' \| 'PLAYING' \| 'GAME_OVER' }` | 遊戲狀態廣播 |
| JOIN_RESULT | `{ type: 'JOIN_RESULT', success: true/false, reason?: 'ROOM_FULL' \| 'GAME_IN_PROGRESS' }` | 加入結果回覆 |

### 遊戲模組介面規範

每個遊戲模組需實作統一介面，供 Receiver 平台呼叫：

```javascript
export default {
    id: 'squat_jump',
    name: '深蹲跳躍',

    init(canvas, assets),                      // 初始化遊戲
    start(),                                   // 啟動遊戲迴圈
    stop(),                                    // 停止遊戲迴圈
    destroy(),                                 // 銷毀遊戲、釋放資源

    handleMessage(data, senderId),             // 處理 Sender 訊息
    getState(),                                // 回傳當前遊戲狀態

    setBroadcastCallbacks(broadcastFn, replyFn) // 設定通訊回呼
}
```

### 資料流

```
1. PLAYER_JOIN
   Sender → Receiver
   { playerId, playerName, token }
   → Receiver 存 token 到 player 物件

2. 遊戲進行
   Sender → Receiver（傳送 G-sensor 動作資料）
   → 分數由 Receiver 計算（防作弊）

3. GAME_OVER
   Receiver → Backend API（fetch POST）
   {
     gameId: "squat_jump",
     players: [
       { token: "xxx", score: 15, jumps: 12, coins: 1 },
       { token: "yyy", score: 22, jumps: 18, coins: 2 }
     ],
     gameDuration: 20,
     timestamp: Date.now()
   }
```

### 技術限制與注意事項

| 項目 | 說明 |
|------|------|
| Cast 延遲 | 100-300ms（WiFi hop），無法技術優化，透過「盲玩 → 揭曉」模式和 Sender 本地回饋（震動、動畫、音效）遮掩 |
| APP_ID | 只能在 App 啟動時設定一次，不可 runtime 切換 |
| 最大玩家數 | 即時互動型遊戲建議 4 人（Chromecast 30fps 效能限制）；盲玩型可支援 8 人 |
| 訊息吞吐量 | Cast Custom Channel 瓶頸在訊息處理頻率，非連線數 |
| Namespace | 所有遊戲共用 `urn:x-cast:com.example.castsquat` |
| Receiver 記憶體 | Chromecast 記憶體有限，切換遊戲時須完整 destroy 前一個模組 |
| CORS | Server 需允許 Chromecast 的 origin（Receiver 的 origin 為 Google CDN 域名，可能需開放 `*`） |
| Token 儲存 | Receiver 在 player 物件中儲存玩家 token，用於回報 API 時識別身份 |
| 防作弊 | 分數由 Receiver 計算，非 Sender 自行回報，可信度較高 |

### 安全性設計

#### 現有傳輸層保護

| 環節 | 傳輸方式 | 加密 |
|------|----------|------|
| Sender ↔ Receiver | Cast Custom Channel | Cast 協議內建 TLS |
| Receiver → Backend | fetch POST | HTTPS |

Cast 通道和 HTTPS 已處理傳輸層加密，訊息在網路上不會被明文截取。**不需額外對 Cast 訊息做應用層加密**（Receiver 是 web 頁面，密鑰會在 source code 中曝露，加了等於沒加）。

#### Backend API 請求驗證

重點在於防止偽造 API 請求和重放攻擊：

```
Receiver → Backend API (GAME_OVER)
{
  gameId: "squat_jump",
  players: [...],
  timestamp: 1707500000,
  nonce: "uuid-v4",
  signature: HMAC-SHA256(payload, SERVER_SECRET)
}
```

| 措施 | 防禦目標 | 說明 |
|------|----------|------|
| HMAC 簽章 | 偽造請求 | Server 驗證 signature，確認來自合法 Receiver |
| Timestamp | 重放攻擊 | Server 拒絕超過 ±30 秒的請求 |
| Nonce | 重複提交 | Server 記錄已處理的 nonce，拒絕重複 |
| Token 驗證 | 身份冒充 | Server 檢查 token 是否合法、未過期、屬於該用戶 |
| 分數合理性 | 異常數據 | Server 驗證分數是否在合理範圍（如 20 秒內跳躍不超過 N 次） |

#### 安全性邊界

> **Receiver 是 web 頁面，所有 JavaScript 原始碼（包含 HMAC 密鑰）皆可被檢視。** 上述措施可防止一般使用者的偽造行為，但無法防止具技術能力的人反編譯取得密鑰。這與純前端遊戲防作弊的本質限制相同。如需更高安全性，需引入 Server-side 遊戲邏輯驗證。

### 遊戲 ID 註冊表

| gameId | 遊戲名稱 | 類型 | 感測方式 | 流程模式 | 最大玩家數 | 狀態 |
|--------|----------|------|----------|----------|-----------|------|
| `squat_jump` | 深蹲跳 | 計次比拼 | G-sensor | 即時 | 4 | ✅ 已完成 |
| `shake_it` | 搖搖樂 | 計次比拼 | G-sensor | 盲玩→揭曉 | 8 | 待開發 |
| `pan_flip` | 煎鍋翻面 | 計次比拼 | Gyroscope | 盲玩→揭曉 | 8 | 待開發 |
| `action_command` | 動作指令 | 反應指令 | G-sensor | 即時 | 4 | 待開發 |
| `balance` | 單腳平衡 | 撐住挑戰 | G-sensor | 盲玩→揭曉 | 8 | 待開發 |
| `soup_carry` | 端湯不灑 | 撐住挑戰 | Gyroscope | 盲玩→揭曉 | 8 | 待開發 |
| `hiit` | HIIT 挑戰 | HIIT 教練 | 按鈕回報 | 盲玩→揭曉 | 8 | 待開發 |
| `high_jump` | 誰跳最高 | 高度/力道 | G-sensor | 盲玩→揭曉 | 8 | 待開發 |
| `punch` | 揮拳力道 | 揮拳力道 | G-sensor | 盲玩→揭曉 | 8 | 待開發 |

### G-sensor 偵測規格

#### 通用設定

| 項目 | 規格 |
|------|------|
| 取樣頻率 | 60 Hz（`SensorManager.SENSOR_DELAY_GAME` / `CMMotionManager` 60Hz） |
| 座標系 | 裝置本地座標系（x: 右, y: 上, z: 螢幕朝外） |
| 單位 | m/s²（含重力 9.8） |
| 省電策略 | App 進背景時停止取樣，回前景時恢復 |

#### 各動作判定邏輯

| 動作 | 感測器 | 判定條件 | 冷卻時間 | 備註 |
|------|--------|----------|----------|------|
| 跳躍 | Accelerometer | Y 軸加速度峰值 > 15 m/s² | 500ms | 需過濾行走/晃動的低幅度訊號 |
| 搖晃 | Accelerometer | 合加速度變化量 > 20 m/s² | 200ms | `sqrt(x²+y²+z²)` 的變化率 |
| 翻轉 | Gyroscope | X 軸角速度 > 3 rad/s 且完成 180° 旋轉 | 800ms | 需偵測完整翻轉而非只是傾斜 |
| 平衡 | Accelerometer | 合加速度標準差 < 0.5 m/s²（每秒計算） | - | 持續偵測，超出閾值即失敗 |
| 端湯 | Gyroscope | 任意軸傾斜角 > 15° | - | 從初始校準姿態計算偏移 |
| 出拳 | Accelerometer | Z 軸加速度峰值（取最大值） | 一輪一次 | 單次動作，取峰值即可 |

#### 平台差異

| 項目 | iOS | Android |
|------|-----|---------|
| API | `CMMotionManager` | `SensorManager` |
| 取樣頻率設定 | `motionUpdateInterval = 1/60` | `SENSOR_DELAY_GAME` (~60Hz) |
| 背景限制 | 進背景後感測器自動停止 | 需手動 `unregisterListener` |
| 權限 | 不需額外權限 | 不需額外權限 |

### Sender 遊戲模組化

#### 架構

每個遊戲在 Sender 端需要兩個元件：

1. **遊戲控制頁面** — 遊戲進行中的 UI（按鈕、G-sensor 回饋）
2. **感測器邏輯** — 對應的 G-sensor 偵測與動作判定

```
lib/
├── games/
│   ├── game_registry.dart         # 遊戲註冊表（gameId → 頁面 + 感測器）
│   ├── squat_jump/
│   │   ├── squat_jump_page.dart   # 跳躍按鈕 UI
│   │   └── squat_jump_sensor.dart # 跳躍偵測邏輯
│   ├── shake_it/
│   │   ├── shake_it_page.dart     # 搖晃回饋 UI
│   │   └── shake_it_sensor.dart   # 搖晃偵測邏輯
│   └── ...
├── cast_service.dart              # Cast 通訊（共用）
└── home_screen.dart               # 遊戲選擇 + Cast 連線
```

#### 新增遊戲 Checklist

新增一個遊戲時需要修改的地方：

| 端 | 檔案/位置 | 修改內容 |
|----|----------|----------|
| Sender | `game_registry.dart` | 註冊 gameId、頁面元件、感測器類別 |
| Sender | `games/[gameId]/` | 新增遊戲控制頁面 + 感測器邏輯 |
| Receiver | `js/games/[gameId].js` | 新增遊戲模組（實作統一介面） |
| Receiver | `index.html` 或模組載入器 | 註冊遊戲模組 |
| 共用 | 遊戲 ID 註冊表 | 新增 gameId 定義 |

### 錯誤處理與降級策略

| 異常情境 | 處理方式 |
|----------|----------|
| **Backend API 無回應** | Receiver 重試 2 次（間隔 3 秒），仍失敗則放棄回報，遊戲繼續正常運作（結果不記錄） |
| **Backend API 回傳錯誤** | 記錄錯誤到 console，不影響遊戲流程 |
| **Chromecast 閒置超時** | Cast SDK 預設 5 分鐘無活動自動關閉 Receiver。LOBBY 狀態下定時發送心跳（每 60 秒）或接受超時（使用者重新連線即可） |
| **Sender App 被系統殺掉** | Receiver 繼續運作不受影響。使用者重開 App 後走 UC4 斷線重連流程 |
| **遊戲中 WiFi 斷線** | Sender 顯示斷線提示，Cast SDK 自動嘗試重連。重連後走 QUERY_STATE 同步 |
| **Token 過期** | Server 回傳 401，Receiver 忽略該玩家的結果回報。Sender 下次加入時需重新取得 token |
| **遊戲模組載入失敗** | Receiver 回覆 `LOAD_REJECTED` 並附帶 reason: `MODULE_LOAD_FAILED`，Sender 顯示錯誤提示 |

### Receiver 部署

| 項目 | 說明 |
|------|------|
| **Cast Developer Console** | 在 [Google Cast SDK Developer Console](https://cast.google.com/publish/) 註冊 Receiver 應用，取得 APP_ID |
| **Receiver 網頁 hosting** | 部署到自有域名（HTTPS 必須），例如 `https://games.example.com/receiver/` |
| **測試裝置** | 在 Developer Console 新增測試裝置的序號，測試版 Receiver 只有白名單裝置可載入 |
| **發布流程** | 測試通過後在 Console 發布為正式版，所有 Chromecast 裝置皆可載入 |
| **版本更新** | 更新 hosting 上的檔案即可，Chromecast 會在下次載入時取得新版（有快取，約 15-30 分鐘生效） |

## 成功指標

| 指標 | 目標 | 驗證方式 |
|------|------|----------|
| 延遲體感可接受度 | 使用者測試通過率 ≥ 80% | 5 人以上實測問卷，「操作有延遲感嗎？」回答「可接受」以上 |
| 同時連線穩定性 | 4 人連線 30 分鐘無斷線 | 4 台手機 + Chromecast 連續遊玩 3 局以上，無異常斷線 |
| 遊戲結果回報成功率 | ≥ 95% | Receiver → Backend API 的 GAME_OVER 回報成功率（含重試） |
| 跨平台一致性 | iOS / Android 行為一致 | 同場遊戲中 iOS 和 Android 混合測試，功能與體驗無差異 |
| 遊戲切換穩定性 | 連續切換 5 款遊戲無異常 | LOBBY → 遊戲 A → LOBBY → 遊戲 B... 連續切換，無記憶體洩漏或畫面殘留 |
