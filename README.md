# 🎯 MTO 體驗營 - 企業級團隊建設遊戲

一個高度安全、生產就緒的實時多人團隊建設棋盤遊戲，專為 60-120 人的企業活動設計。基於 Node.js、Phaser.js 和 Socket.IO 構建，具備完整的安全框架和 Docker 部署支援。

## 🌟 核心特色

### 🎮 遊戲特點

- **🏢 安全性**: 完整的安全框架，包含主持人授權、輸入驗證、速率限制
- **📱 連線體驗**: 投影機主畫面 + 手機操作介面，支援網路存取
- **👥 分組遊戲**: 將玩家分配到 6 個預設團隊 (A-F 隊)
- **🎯 豐富小遊戲**: 4 種小遊戲類型，包含機會與命運系統
- **📊 即時計分**: 實時積分系統和正確排序的排行榜
- **🎭 主持人控制**: 完整的遊戲管理和進階控制功能

### 🔒 安全特性

- **🛡️ 主持人授權**: 基於令牌的主持人驗證系統
- **🚫 XSS 防護**: 移除所有內聯事件處理器，使用安全的事件委派
- **⚡ 速率限制**: 針對所有關鍵操作的速率限制保護
- **🌐 CORS 配置**: 環境特定的跨域資源共享設定
- **📝 輸入驗證**: 全面的輸入清理和驗證機制
- **🔐 CSP 政策**: 內容安全政策，支援 Phaser.js 和網路存取

### 🐳 部署特性

- **📦 Docker 支援**: 生產就緒的 Docker 配置和編排
- **🏢 企業相容**: 遵循企業 Docker 部署模式
- **🌍 網路存取**: 自動檢測本地網路 IP，支援行動裝置存取
- **📚 完整文檔**: 部署指南、故障排除和檢查清單

## 🛠️ 技術架構

### 後端技術棧

- **🟢 Node.js 18+** + **Express 4**: 伺服器框架
- **🔌 Socket.IO 4**: 實時雙向通訊
- **🛡️ Helmet**: 安全標頭中介軟體
- **⚡ Express Rate Limit**: HTTP 請求速率限制
- **🌐 CORS**: 跨域資源共享配置
- **🔧 Dotenv**: 環境變數管理

### 前端技術棧

- **🎮 Phaser.js 3.70**: 主畫面遊戲引擎
- **📱 原生 JavaScript**: 響應式手機介面
- **🎨 現代 CSS**: Grid/Flexbox 佈局，支援行動裝置
- **🔌 Socket.IO Client**: 即時連線管理

### 🐳 部署技術

- **🐋 Docker**: Alpine Linux 基礎映像
- **📋 Docker Compose**: 服務編排
- **🔒 安全配置**: 非 root 使用者執行
- **📊 健康檢查**: 自動服務監控

## 📁 專案結構

```
dept-monopoly/
├── 🐳 Docker 配置
│   ├── Dockerfile              # 生產就緒的 Docker 映像
│   ├── docker-compose.yml      # 服務編排
│   ├── .dockerignore           # Docker 建置排除
│   ├── docker-deploy.sh        # 自動化部署腳本
│   └── .env.docker*            # 環境配置範本
├── 📚 文檔
│   ├── DEPLOYMENT_GUIDE.md     # 完整部署指南
│   ├── README-DOCKER.md        # Docker 快速參考
│   ├── DEPLOYMENT_CHECKLIST.md # 部署檢查清單
│   └── STATIC_FILES_FIX.md     # 靜態檔案修復記錄
├── 🖥️ 後端 (server/)
│   ├── index.js                # 主伺服器 (含安全中介軟體)
│   ├── game/
│   │   ├── GameManager.js      # 遊戲狀態管理
│   │   └── MiniGames.js        # 小遊戲處理器
│   └── socket/
│       └── handlers.js         # 安全的 Socket 事件處理
├── 💻 前端 (client/)
│   ├── main/                   # 主畫面 (投影機)
│   │   ├── index.html          # 主頁面
│   │   ├── js/main.js          # 主應用邏輯
│   │   ├── scenes/             # Phaser 遊戲場景
│   │   │   ├── GameScene.js    # 遊戲場景 (含圖片載入修復)
│   │   │   └── LobbyScene.js   # 大廳場景
│   │   └── ui/                 # UI 組件
│   │       ├── HostControls.js # 安全的主持人控制介面
│   │       └── ScoreBoard.js   # 即時計分板
│   ├── mobile/                 # 📱 手機介面
│   │   ├── index.html          # 手機頁面
│   │   ├── js/mobile.js        # 手機應用邏輯 (含安全修復)
│   │   ├── styles/mobile.css   # CSS 樣式
│   │   └── components/         # UI 組件
│   │       └── MiniGames.js    # 小遊戲組件
│   └── mobile-redirect.html    # 行動裝置存取助手
├── 🔧 共用 (shared/)
│   ├── types.js                # 資料結構定義
│   └── constants.js            # 遊戲常數
├── 🖼️ 資源 (public/images/)
│   ├── teams/                  # 團隊圖片 (team_A.png - team_F.png)
│   ├── special/                # 機會命運圖片
│   ├── quiz/                   # 小遊戲背景圖片
│   └── assets/                 # 遊戲資源
└── 📋 配置檔案
    ├── package.json            # 專案配置 (含 Docker 腳本)
    ├── .env.example            # 環境變數範本
    └── .gitignore              # Git 忽略檔案 (含 .env 保護)
```

## 🚀 快速開始

### 📋 環境需求

- **Node.js** 18+
- **npm** 8+
- **Docker** (可選，用於容器化部署)
- **現代瀏覽器** (Chrome, Safari, Firefox, Edge)

### ⚡ 開發環境設置

1. **克隆專案**

```bash
git clone <repository-url>
cd dept-monopoly
```

2. **安裝依賴**

```bash
npm install
```

3. **設置環境變數**

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 檔案，設置：
# - HOST_TOKEN: 主持人授權令牌
# - ALLOWED_ORIGINS: 允許的來源域名
```

4. **啟動開發伺服器**

```bash
npm run dev
```

5. **存取遊戲**

- 🖥️ **主畫面**: http://localhost:3000
- 📱 **手機介面**: http://localhost:3000/mobile
- 🎭 **主持人模式**: http://localhost:3000/?host=true
- 🔧 **網路資訊**: http://localhost:3000/network-info

### 🐳 Docker 部署 (推薦用於生產環境)

1. **建置 Docker 映像**

```bash
npm run docker:build
```

2. **使用 Docker Compose 啟動**

```bash
# 開發環境
ENV_FILE=.env.docker.dev docker-compose up -d

# 生產環境 (需先配置 .env.docker)
docker-compose up -d
```

3. **監控和管理**

```bash
# 查看日誌
npm run docker:logs

# 健康檢查
npm run docker:health

# 停止服務
npm run docker:stop
```

## 🎮 遊戲操作指南

### 🎭 主持人功能

#### 🔐 安全授權

- **主持人令牌**: 使用 `HOST_TOKEN` 環境變數進行授權
- **安全控制**: 所有主持人操作都需要令牌驗證
- **速率限制**: 防止操作濫用，每分鐘最多 30 次主控操作

#### 🎯 基本控制

- **📋 隊伍管理**: 顯示各隊加入連結和管理功能
- **🚀 開始遊戲**: 啟動遊戲並開始第一回合
- **⏭️ 跳過回合**: 強制結束當前回合
- **🏁 結束遊戲**: 立即結算並顯示排行榜

#### ⚙️ 進階控制

- **🕐 遊戲設定**: 調整回合時間限制和最大回合數
- **👥 隊伍管理**: 移動隊伍位置、淘汰/復活隊伍
- **📊 積分調整**: 手動調整隊伍積分 (-1000 到 +1000)
- **⏸️ 遊戲狀態**: 暫停/繼續/重置遊戲
- **📈 統計資訊**: 查看即時遊戲數據和玩家統計

### 📱 玩家操作

#### 🔗 加入遊戲

1. 使用主持人提供的隊伍連結或開啟 http://localhost:3000/mobile
2. 輸入暱稱和部門（輸入驗證，最多 20 字元）
3. 等待主持人分配隊伍和開始遊戲
4. 查看隊伍資訊和能力屬性

#### 🎯 遊戲進行

1. **⏳ 等待回合**: 查看當前隊伍狀態、積分和位置
2. **🎲 擲骰子**: 輪到自隊時點擊擲骰（僅隊長可操作）
3. **🎮 完成小遊戲**: 根據落地格子參與相應挑戰
4. **📊 查看結果**: 即時查看積分變化和排名更新

## 🎯 遊戲內容

### 🎮 小遊戲類型

#### 1. 📝 選擇題挑戰 (30 秒)

- **內容**: 企業文化、產品知識相關問題
- **玩法**: 隊長選擇答案，全隊共享結果
- **計分**: 正確 +10 分，錯誤 -10 分

#### 2. 🔄 拖拽排序 (45 秒)

- **內容**: 工作流程、專案步驟排序
- **玩法**: 拖拽項目到正確順序
- **計分**: 完全正確 +10 分，部分正確 +5 分，錯誤 -10 分

#### 3. 🔗 格式配對 (45 秒)

- **內容**: 技術配對、部門職責配對
- **玩法**: 連接相關項目
- **計分**: 80%+ 正確 +10 分，50%+ 正確 +5 分，其他 -10 分

#### 4. 🎯 真假判斷 (30 秒)

- **內容**: 事實驗證、政策判斷
- **玩法**: 判斷陳述真假
- **計分**: 正確 +10 分，錯誤 -10 分

### 🎲 機會與命運系統

- **🍀 機會格**: 隨機正面事件，可能獲得額外積分
- **🎭 命運格**: 隨機事件，可能獲得或失去積分
- **🖼️ 視覺效果**: 循環顯示多張機會/命運圖片
- **💬 對話框**: 角色對話形式顯示結果

### 🏆 計分系統

- **🏁 起始積分**: 每隊 100 分
- **📈 正確排序**: 伺服器端排序確保排行榜準確性
- **⚡ 即時更新**: Socket.IO 即時同步所有客戶端
- **🎯 最終排行**: 遊戲結束顯示完整排行榜，含隊伍圖片

## 🔒 安全特性

### 🛡️ 伺服器安全

- **🔐 主持人授權**: 基於 HOST_TOKEN 的令牌驗證
- **📝 輸入驗證**: 所有輸入都經過清理和驗證
- **⚡ 速率限制**: 防止 API 濫用和 DDoS 攻擊
- **🌐 CORS 控制**: 僅允許特定域名存取
- **🛡️ Helmet.js**: 安全標頭保護
- **🔒 CSP**: 內容安全政策防止 XSS

### 💻 客戶端安全

- **🚫 無內聯 JS**: 移除所有 onclick 等內聯事件處理器
- **🎯 事件委派**: 使用安全的事件委派模式
- **🧹 DOM 操作**: 安全的 DOM 建立，避免 innerHTML 注入
- **📱 錯誤處理**: 全域圖片錯誤處理，無內聯 onerror

### 🌐 網路安全

- **🏢 企業網路**: 自動檢測本地網路 IP
- **📱 行動支援**: HTTP 協定支援行動裝置存取
- **🔧 除錯端點**: 開發模式提供網路診斷工具
- **🛡️ 生產強化**: 生產環境嚴格的安全政策

## 🐳 Docker 部署指南

### 🏢 部署流程

1. **🔧 準備配置**

```bash
# 複製生產環境範本
cp .env.docker .env.production

# 編輯生產配置
# - 設置安全的 HOST_TOKEN (64 字元)
# - 配置公司域名到 ALLOWED_ORIGINS
# - 調整速率限制和超時設定
```

2. **🏗️ 建置映像**

```bash
# 建置生產映像
docker build -t dept-monopoly:v1.0.0 .

# 標記為公司註冊表
docker tag dept-monopoly:v1.0.0 your-registry/dept-monopoly:v1.0.0
```

3. **🚀 部署到生產**

```bash
# 使用 Docker Compose
ENV_FILE=.env.production docker-compose up -d

# 或直接運行容器
docker run -d \
  --name dept-monopoly \
  -p 3000:3000 \
  --env-file .env.production \
  dept-monopoly:v1.0.0
```

4. **📊 監控和維護**

```bash
# 查看容器狀態
docker-compose ps

# 監控日誌
docker-compose logs -f

# 健康檢查
curl -f http://localhost:3000/network-info
```

### 🔧 環境配置

#### 🏭 生產環境必需配置

```env
# 安全配置 - 必須設置
HOST_TOKEN=your-secure-64-character-token-here
ALLOWED_ORIGINS=https://games.company.com,https://company.com
NODE_ENV=production

# 可選配置
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

#### 🧪 開發環境配置

```env
# 開發配置 - 寬鬆安全政策
HOST_TOKEN=development-token-for-testing-only
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
NODE_ENV=development
```

## 🔧 配置選項

### 🎮 遊戲參數 (shared/constants.js)

```javascript
const GAME_CONFIG = {
  MAX_PLAYERS: 120, // 最大玩家數
  BOARD_SIZE: 28, // 棋盤格數
  TURN_TIME_LIMIT: 90000, // 回合時間限制 (毫秒)
  MAX_RUNS_PER_TEAM: 3, // 每隊最大圈數
  MINI_GAME_TIME_LIMITS: {
    MULTIPLE_CHOICE: 30000, // 選擇題時間
    DRAG_DROP: 45000, // 拖拽排序時間
    FORMAT_MATCHING: 45000, // 格式配對時間
    TRUE_OR_FALSE: 30000, // 真假判斷時間
  },
}
```

### 📊 計分設定

```javascript
const SCORING = {
  SUCCESS: 10, // 成功分數
  PARTIAL: 5, // 部分成功分數
  FAILURE: -10, // 失敗分數
  STARTING_SCORE: 100, // 起始分數
}
```

### 🔒 安全設定

```javascript
// 速率限制配置
const RATE_LIMITS = {
  HOST_CONTROL: { max: 30, windowMs: 60000 }, // 主持人控制 (每分鐘 30 次)
  PLAYER_JOIN: { max: 3, windowMs: 60000 }, // 玩家加入
  DICE_ROLL: { max: 3, windowMs: 10000 }, // 擲骰子
  MINI_GAME_SUBMIT: { max: 3, windowMs: 10000 }, // 小遊戲提交
}
```

## 🔍 故障排除

### 🚨 常見問題

#### 1. 🔐 主持人授權失敗

**症狀**: "未授權的主持人操作" 錯誤
**解決方案**:

- 檢查 `HOST_TOKEN` 環境變數是否正確設置
- 確認瀏覽器沒有快取舊的令牌
- 查看伺服器日誌中的授權檢查訊息

#### 2. 📱 行動裝置 SSL 錯誤

**症狀**: `ERR_SSL_PROTOCOL_ERROR` 錯誤
**解決方案**:

- 使用 HTTP 而非 HTTPS URL
- 開啟行動助手頁面: `/mobile-helper`
- 檢查 CORS 設定是否包含正確的網路 IP

#### 3. 🖼️ 圖片載入失敗

**症狀**: "Failed to process file: image" 錯誤
**解決方案**:

- 檢查 `/images/` 路徑下檔案是否存在
- 確認 CSP 設定允許 blob: URL (用於 Phaser.js)
- 查看伺服器日誌中的圖片請求記錄

#### 4. 🎮 遊戲同步問題

**症狀**: 玩家看不到最新遊戲狀態
**解決方案**:

- 檢查 Socket.IO 連線狀態
- 重新整理瀏覽器頁面
- 主持人可使用「跳過回合」功能重新同步

### 🛠️ 除錯工具

```bash
# 伺服器日誌
npm run dev                    # 開發模式詳細日誌
npm run docker:logs           # Docker 容器日誌

# 網路診斷
curl http://localhost:3000/network-info  # 網路資訊
curl http://localhost:3000/mobile-debug  # 行動除錯頁面

# Docker 除錯
docker-compose ps             # 容器狀態
docker exec -it <container> sh # 進入容器
```

### 📊 效能監控

```bash
# 系統資源監控
docker stats                  # 容器資源使用
htop                          # 系統負載

# 應用監控
npm run docker:health         # 應用健康檢查
curl -f http://localhost:3000/network-info # API 回應測試
```

## 🎨 自訂指南

### 🎯 修改遊戲內容

#### 1. 新增小遊戲題目

編輯 `server/game/MiniGames.js`:

```javascript
// 新增選擇題
const questions = [
  {
    question: '公司的核心價值是什麼？',
    options: ['創新', '團隊合作', '客戶至上', '以上皆是'],
    correct: 3,
    explanation: '我們的核心價值包含創新、團隊合作和客戶至上',
  },
]
```

#### 2. 調整隊伍配置

修改 `server/game/GameManager.js`:

```javascript
// 在 initializePredefinedTeams() 中修改隊伍
const teams = [
  { id: 'team_A', name: 'A隊', emoji: '🚀', color: '#FF6B6B' },
  { id: 'team_B', name: 'B隊', emoji: '⚡', color: '#4ECDC4' },
  // 新增更多隊伍...
]
```

#### 3. 修改計分規則

修改 `shared/constants.js`:

```javascript
const SCORING = {
  SUCCESS: 15, // 提高成功分數
  PARTIAL: 8, // 調整部分成功分數
  FAILURE: -5, // 降低失敗懲罰
  BONUS_FAST: 5, // 新增快速完成獎勵
}
```

### 🎨 視覺自訂

#### 1. 更換隊伍圖片

- 替換 `public/images/teams/` 中的 `team_A.png` 到 `team_F.png`
- 建議尺寸: 256x256 像素，PNG 格式

#### 2. 自訂主題色彩

編輯 `client/main/index.html` 和 `client/mobile/styles/mobile.css`

```css
:root {
  --primary-color: #your-brand-color;
  --secondary-color: #your-accent-color;
  --background-gradient: linear-gradient(135deg, #color1, #color2);
}
```

#### 3. 品牌化內容

- 修改遊戲標題和文字內容
- 替換 Logo 和圖示
- 更新小遊戲背景圖片

## 📈 效能最佳化

### 🖥️ 伺服器效能

- **🐳 容器化**: Docker 提供資源隔離和限制
- **⚡ 快取**: Express 靜態檔案快取
- **🔒 安全標頭**: Helmet.js 最佳化安全效能
- **📊 監控**: 內建健康檢查端點

### 💻 前端效能

- **🖼️ 圖片最佳化**: 壓縮團隊和遊戲圖片
- **📦 資源載入**: Phaser.js CDN 載入
- **🎯 錯誤處理**: 全域錯誤捕獲避免崩潰
- **📱 響應式**: CSS Grid/Flexbox 高效佈局

### 🌐 網路最佳化

- **🔌 WebSocket**: Socket.IO 最佳化實時通訊
- **🏠 本地網路**: 自動檢測內網 IP 減少延遲
- **⚡ 速率限制**: 防止網路濫用
- **🛡️ CORS**: 精確的跨域設定

## 🤝 貢獻指南

### 🔧 開發環境設置

1. Fork 專案並克隆到本地
2. 安裝依賴: `npm install`
3. 設置開發環境變數: `cp .env.example .env`
4. 啟動開發模式: `npm run dev`

### 📝 程式碼規範

- 使用 ESLint 進行程式碼檢查
- 遵循既有的命名慣例和檔案結構
- 新增功能時更新相關文檔
- 確保所有安全檢查通過

### 🚀 提交流程

1. 創建功能分支: `git checkout -b feature/your-feature`
2. 提交變更: `git commit -m "feat: add your feature"`
3. 推送分支: `git push origin feature/your-feature`
4. 創建 Pull Request 並等待審查

### 🐛 問題回報

- 使用 GitHub Issues 回報問題
- 提供詳細的重現步驟和環境資訊
- 包含螢幕截圖或錯誤日誌
- 標記問題類型 (bug/enhancement/security)

## 📄 授權條款

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 🎉 Stacks

感謝以下優秀的開源專案和技術：

- **🎮 [Phaser.js](https://phaser.io/)** - 強大的 HTML5 遊戲框架
- **🔌 [Socket.IO](https://socket.io/)** - 即時雙向通訊解決方案
- **🚀 [Express.js](https://expressjs.com/)** - 快速、簡潔的 Web 框架
- **🟢 [Node.js](https://nodejs.org/)** - JavaScript 伺服器運行環境
- **🛡️ [Helmet.js](https://helmetjs.github.io/)** - Express 安全中介軟體
- **🐳 [Docker](https://www.docker.com/)** - 容器化平台

---

## 🚀 快速啟動檢查清單

- [ ] ✅ 安裝 Node.js 18+ 和 Docker
- [ ] 📋 克隆專案並安裝依賴
- [ ] 🔧 設置 `.env` 檔案 (HOST_TOKEN 和 ALLOWED_ORIGINS)
- [ ] 🎮 啟動開發伺服器: `npm run dev`
- [ ] 🌐 開啟主畫面: http://localhost:3000/?host=true
- [ ] 📱 測試手機介面: http://localhost:3000/mobile
- [ ] 🐳 (可選) 測試 Docker 部署: `npm run docker:deploy`

🎯 **準備好感受 MTO 的痛苦！** 🎯
