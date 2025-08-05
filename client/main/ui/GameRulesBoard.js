// Game Rules Board Component for Main Screen
// Shows game rules and instructions before the game starts

class GameRulesBoard {
  constructor(gameApp) {
    this.gameApp = gameApp
    this.rulesContainer = null
    this.isVisible = false
    this.currentPage = 0
    this.totalPages = 4
    this.keydownHandler = null

    this.setupRulesBoard()
    this.loadGameRules()
  }

  setupRulesBoard() {
    // Create rules board container
    this.rulesContainer = document.createElement('div')
    this.rulesContainer.id = 'gameRulesBoard'
    this.rulesContainer.className = 'rules-board hidden' // Start hidden

    document.body.appendChild(this.rulesContainer)
    this.addRulesStyles()
  }

  loadGameRules() {
    // Game rules content organized by pages
    this.rulesContent = [
      {
        title: '遊戲說明',
        icon: '',
        content: ['每隊選出一位隊長', '隊長掃描 QR code 加入遊戲', '隊長可以與隊員討論答案', '隊長負責最終決策和提交', '注意時間限制，動作要快！'],
        highlight: '隊長請注意不要重整畫面 & 讓手機進入待機，以免斷線！',
      },
      {
        title: '遊戲目標',
        icon: '',
        content: ['在棋盤上移動並完成各種挑戰', '透過小遊戲獲得積分', '團隊合作達成最高分數', '在規定時間內成為積分王！'],
        highlight: '目標：獲得最高團隊積分！',
      },
      {
        title: '遊戲流程',
        icon: '',
        content: ['1️⃣ 隊長擲骰子決定移動步數', '2️⃣ 移動到新位置觸發事件', '3️⃣ 完成小遊戲或挑戰', '4️⃣ 根據表現獲得積分獎勵', '5️⃣ 輪到下一隊繼續遊戲'],
        highlight: '記住：只有隊長可以擲骰子和提交答案！',
      },
      {
        title: '小遊戲類型',
        icon: '',
        content: ['選擇題：選出正確答案', '是非題：判斷對錯', '流程排序：按正確順序排列', '連連看：配對正確組合', '限時作答：把握黃金時間！'],
        highlight: '提示：隊友可以協助討論，但只有隊長能提交答案',
      },
    ]
  }

  showRules() {
    if (this.isVisible) return

    this.currentPage = 0
    this.renderRulesPage()
    this.rulesContainer.classList.remove('hidden')
    this.isVisible = true

    // Update host button state
    if (this.gameApp.hostControls) {
      this.gameApp.hostControls.updateRulesButtonState()
    }

    // Animate in
    setTimeout(() => {
      this.rulesContainer.classList.add('visible')
    }, 50)
  }

  hideRules() {
    if (!this.isVisible) return

    this.rulesContainer.classList.remove('visible')

    setTimeout(() => {
      this.rulesContainer.classList.add('hidden')
      this.isVisible = false

      // Update host button state
      if (this.gameApp.hostControls) {
        this.gameApp.hostControls.updateRulesButtonState()
      }
    }, 300)
  }

  renderRulesPage() {
    const currentRule = this.rulesContent[this.currentPage]

    this.rulesContainer.innerHTML = `
      <div class="rules-board-content">
        <div class="rules-header">
          <div class="rules-title">
            <span class="rules-icon">${currentRule.icon}</span>
            <h2>${currentRule.title}</h2>
          </div>
          <div class="rules-navigation">
            <span class="page-indicator">${this.currentPage + 1} / ${this.totalPages}</span>
            <button class="close-btn" id="rulesCloseBtn">×</button>
          </div>
        </div>

        <div class="rules-body">
          <div class="rules-content">
            ${currentRule.content
              .map(
                (item) => `
              <div class="rule-item">
                <span class="rule-text">${item}</span>
              </div>
            `
              )
              .join('')}
          </div>

          <div class="rules-highlight">
            <div class="highlight-box">
              <span class="highlight-icon">💡</span>
              <span class="highlight-text">${currentRule.highlight}</span>
            </div>
          </div>
        </div>

        <div class="rules-footer">
          <div class="navigation-buttons">
            <button class="nav-btn prev-btn" id="rulesPrevBtn" ${this.currentPage === 0 ? 'disabled' : ''}>
              <span class="nav-icon">◀</span>
              <span class="nav-text">上一頁</span>
            </button>

            <div class="page-dots" id="rulesPageDots">
              ${Array.from(
                { length: this.totalPages },
                (_, i) => `
                <div class="page-dot ${i === this.currentPage ? 'active' : ''}"
                     data-page="${i}"></div>
              `
              ).join('')}
            </div>

            <button class="nav-btn next-btn" id="rulesNextBtn" ${this.currentPage === this.totalPages - 1 ? 'disabled' : ''}>
              <span class="nav-text">下一頁</span>
              <span class="nav-icon">▶</span>
            </button>
          </div>

          ${
            this.currentPage === this.totalPages - 1
              ? `
            <div class="start-game-prompt">
              <p class="prompt-text">📢 請主持人開始遊戲</p>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `

    // Set up event listeners after rendering
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Clean up any existing listeners first
    this.cleanupEventListeners()

    // Close button
    const closeBtn = document.getElementById('rulesCloseBtn')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideRules())
    }

    // Navigation buttons
    const prevBtn = document.getElementById('rulesPrevBtn')
    const nextBtn = document.getElementById('rulesNextBtn')

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previousPage())
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextPage())
    }

    // Page dots
    const pageDots = document.getElementById('rulesPageDots')
    if (pageDots) {
      pageDots.addEventListener('click', (e) => {
        if (e.target.classList.contains('page-dot')) {
          const pageIndex = parseInt(e.target.dataset.page)
          this.goToPage(pageIndex)
        }
      })
    }

    // ESC key to close (store reference for cleanup)
    this.keydownHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hideRules()
      }
    }
    document.addEventListener('keydown', this.keydownHandler)

    // Click outside to close
    this.rulesContainer.addEventListener('click', (e) => {
      if (e.target === this.rulesContainer) {
        this.hideRules()
      }
    })
  }

  cleanupEventListeners() {
    // Remove global keydown listener
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
      this.keydownHandler = null
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++
      this.animatePageTransition()
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--
      this.animatePageTransition()
    }
  }

  goToPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.totalPages && pageIndex !== this.currentPage) {
      this.currentPage = pageIndex
      this.animatePageTransition()
    }
  }

  animatePageTransition() {
    const content = this.rulesContainer.querySelector('.rules-board-content')
    if (content) {
      content.style.opacity = '0.7'
      content.style.transform = 'scale(0.98)'

      setTimeout(() => {
        this.renderRulesPage()
        const newContent = this.rulesContainer.querySelector('.rules-board-content')
        if (newContent) {
          newContent.style.opacity = '1'
          newContent.style.transform = 'scale(1)'
        }
      }, 150)
    }
  }

  // Check if rules should be shown based on game state
  updateVisibility(gameState) {
    if (!gameState) return

    // Only auto-hide when game starts, don't auto-show when players join
    const shouldHide = gameState.phase !== 'lobby' && this.isVisible

    if (shouldHide) {
      // Auto-hide when game starts
      this.hideRules()
    }
  }

  addRulesStyles() {
    if (document.getElementById('gameRulesStyles')) return

    const styles = document.createElement('style')
    styles.id = 'gameRulesStyles'
    styles.textContent = `
      .rules-board {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1500;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(8px);
      }

      .rules-board.hidden {
        display: none;
      }

      .rules-board.visible {
        opacity: 1;
      }

      .rules-board-content {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border-radius: 20px;
        max-width: 800px;
        width: 90vw;
        max-height: 90vh;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
        animation: slideInScale 0.4s ease;
        transition: all 0.2s ease;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      @keyframes slideInScale {
        from {
          transform: translateY(50px) scale(0.9);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .rules-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 25px 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
      }

      .rules-title {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .rules-icon {
        font-size: 32px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .rules-title h2 {
        margin: 0;
        font-size: 32px;
        font-weight: bold;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .rules-navigation {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .page-indicator {
        background: rgba(255, 255, 255, 0.2);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: bold;
      }

      .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      .rules-body {
        padding: 40px;
        flex: 1;
        overflow-y: auto;
      }

      .rules-content {
        margin-bottom: 30px;
      }

      .rule-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 20px;
        padding: 15px 20px;
        background: #f8f9fa;
        border-radius: 12px;
        border-left: 4px solid #667eea;
        transition: all 0.3s ease;
      }

      .rule-item:hover {
        background: #e3f2fd;
        border-left-color: #2196f3;
        transform: translateX(5px);
      }

      .rule-text {
        font-size: 24px;
        line-height: 1.6;
        color: #2c3e50;
        font-weight: 500;
      }

      .rules-highlight {
        margin-top: 30px;
      }

      .highlight-box {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        border: 2px solid #ff9800;
        border-radius: 15px;
        padding: 20px 25px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
      }

      .highlight-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .highlight-text {
        font-size: 24px;
        font-weight: bold;
        color: #e65100;
        line-height: 1.4;
      }

      .rules-footer {
        padding: 25px 40px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
      }

      .navigation-buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .nav-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        font-weight: bold;
        min-width: 120px;
        justify-content: center;
      }

      .nav-btn:hover:not(:disabled) {
        background: #5a6fd8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .nav-btn:disabled {
        background: #bdbdbd;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .nav-icon {
        font-size: 12px;
      }

      .page-dots {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .page-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #dee2e6;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .page-dot.active {
        background: #667eea;
        transform: scale(1.3);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      }

      .page-dot:hover {
        background: #adb5bd;
        transform: scale(1.1);
      }

      .start-game-prompt {
        text-align: center;
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #dee2e6;
      }

      .prompt-text {
        color: #28a745;
        font-size: 16px;
        font-weight: bold;
        margin: 0;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .rules-board-content {
          width: 95vw;
          max-height: 95vh;
        }

        .rules-header {
          padding: 20px;
        }

        .rules-title h2 {
          font-size: 24px;
        }

        .rules-body {
          padding: 30px 20px;
        }

        .rule-text {
          font-size: 16px;
        }

        .rules-footer {
          padding: 20px;
        }

        .nav-btn {
          min-width: 100px;
          padding: 10px 16px;
          font-size: 13px;
        }
      }
    `
    document.head.appendChild(styles)
  }
}
