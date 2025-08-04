// Main Phaser configuration and game initialization

class GameApp {
  constructor() {
    this.socket = null
    this.gameState = null
    this.board = null
    this.game = null
    this.isHost = window.location.search.includes('host=true')
    this.hostToken = null
    this.hostAuthenticated = false

    this.init()
  }

  init() {
    // Show host authentication modal if accessing host interface
    if (this.isHost && !this.hostAuthenticated) {
      this.showHostAuthModal()
      return // Don't initialize until authenticated
    }

    this.setupSocket()
    this.setupPhaser()
    this.setupUI()
    this.updateMobileUrl()
  }

  setupSocket() {
    console.log('🔌 Setting up socket connection...')

    this.socket = io({
      // Enhanced connection settings for reliability
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      upgrade: true,
    })

    // Enhanced connection events
    this.socket.on('connect', () => {
      console.log(`✅ Connected to server (Socket ID: ${this.socket.id})`)
      this.updateConnectionStatus(true)
      this.hideConnectionLostIndicator()
    })

    this.socket.on('disconnect', (reason) => {
      console.log(`💔 Disconnected from server: ${reason}`)
      this.updateConnectionStatus(false)

      if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
        this.showConnectionLostIndicator()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
      this.hideConnectionLostIndicator()
      this.showReconnectionSuccess()
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`)
      this.updateConnectionStatus(false, `重新連接中... (${attemptNumber}/10)`)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('💀 All reconnection attempts failed')
      this.updateConnectionStatus(false, '連接失敗')
    })

    // Server connection status updates
    this.socket.on('connection_status', (status) => {
      console.log('📊 Server connection status:', status)
    })

    // Game state events
    this.socket.on('game_state_update', (gameState) => {
      // Detect game reset (when we go back to lobby phase with no players)
      const wasReset = this.gameState && this.gameState.phase === 'in_progress' && gameState.phase === 'lobby' && Object.keys(gameState.players).length === 0

      this.gameState = gameState
      this.updateUI()

      // Clean up modals if game was reset
      if (wasReset) {
        this.cleanupModals()
      }

      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').updateGameState(gameState)
      }
    })

    this.socket.on('board_state', (board) => {
      this.board = board

      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').setBoard(board)
      }
    })

    // Game flow events
    this.socket.on('game_start', (data) => {
      console.log('Game started!')
      this.game.scene.start('GameScene', {
        gameState: data.gameState,
        board: data.board,
      })
    })

    this.socket.on('dice_roll', (data) => {
      console.log('Dice rolled:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleDiceRoll(data)
      }
    })

    this.socket.on('event_trigger', (data) => {
      console.log('Event triggered:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleEventTrigger(data)
      }
    })

    this.socket.on('mini_game_start', (data) => {
      console.log('Mini-game started:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleMiniGameStart(data)
      }
    })

    this.socket.on('mini_game_preparation_start', (data) => {
      console.log('Mini-game preparation started:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleMiniGamePreparationStart(data)
      }
    })

    this.socket.on('mini_game_timer_start', (data) => {
      console.log('Mini-game timer started:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleMiniGameTimerStart(data)
      }
    })

    this.socket.on('mini_game_result', (data) => {
      console.log('Mini-game result:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleMiniGameResult(data)
      }
    })

    this.socket.on('chance_card_drawn', (data) => {
      console.log('Chance card drawn:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleChanceCard(data)
      }
    })

    this.socket.on('destiny_card_drawn', (data) => {
      console.log('Destiny card drawn:', data)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleDestinyCard(data)
      }
    })

    this.socket.on('score_update', (data) => {
      console.log('Score updated:', data)
      this.updateScoreBoard()
    })

    this.socket.on('timer_update', (data) => {
      this.updateTimer(data.timeLeft)
    })

    this.socket.on('teams_updated', (teams) => {
      console.log('Teams updated:', teams)
      this.updateScoreBoard()
    })

    this.socket.on('game_end', (data) => {
      console.log('Game ended:', data)
      // Show leaderboard in GameScene if available
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').handleGameEnd(data)
      }
    })

    this.socket.on('captain_change', (data) => {
      console.log('Captain changed:', data)
      // Update UI to reflect captain change
      this.updateUI()
      
      // Show team switch banner with new captain info (this replaces the transition banner)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').showTeamSwitchBanner('輪到新隊伍！', data)
      }
    })

    this.socket.on('turn_transition_start', (data) => {
      console.log('Turn transition started:', data)
      // Show initial transition banner (will be replaced by captain_change banner)
      if (this.game && this.game.scene.getScene('GameScene')) {
        this.game.scene.getScene('GameScene').showTeamSwitchBanner(data.message)
      }
    })

    this.socket.on('turn_end', (data) => {
      console.log('Turn ended:', data)
      // Team switch banner will auto-hide after 3 seconds, but we can also hide it manually if needed
      // if (this.game && this.game.scene.getScene('GameScene')) {
      //   this.game.scene.getScene('GameScene').hideTeamSwitchBanner()
      // }
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
      alert(`錯誤: ${error.message}`)
    })
  }

  setupPhaser() {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight - 80, // Subtract header height
      parent: 'gameCanvas',
      backgroundColor: '#2c3e50',
      scene: [LobbyScene, GameScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    }

    this.game = new Phaser.Game(config)

    // Pass socket reference to scenes
    this.game.socket = this.socket
  }

  setupUI() {
    // Host controls
    if (this.isHost) {
      document.getElementById('assignTeamsBtn').addEventListener('click', () => {
        this.socket.emit('team_assign')
      })

      document.getElementById('startGameBtn').addEventListener('click', () => {
        this.socket.emit('game_start')
      })

      document.getElementById('skipTurnBtn').addEventListener('click', () => {
        this.socket.emit('host_control', { action: 'skip_turn', token: this.hostToken })
      })

      document.getElementById('endGameBtn').addEventListener('click', () => {
        if (confirm('確定要結束遊戲嗎？')) {
          this.socket.emit('host_control', { action: 'end_game', token: this.hostToken })
        }
      })
    } else {
      // Hide host controls for non-host users
      document.getElementById('hostControls').style.display = 'none'
    }

    // Initialize UI Components
    this.rulesBoard = new GameRulesBoard(this)

    // Window resize handler
    window.addEventListener('resize', () => {
      if (this.game) {
        this.game.scale.resize(window.innerWidth, window.innerHeight - 80)
      }
    })
  }

  updateUI() {
    if (!this.gameState) return

    this.updateScoreBoard()
    this.updateGameInfo()
    this.updateHostControls()

    // Update rules board visibility based on game state
    if (this.rulesBoard) {
      this.rulesBoard.updateVisibility(this.gameState)
    }
  }

  updateScoreBoard() {
    if (!this.gameState) return

    const teamScoresContainer = document.getElementById('teamScores')

    if (this.gameState.teams.length === 0) {
      teamScoresContainer.innerHTML = `
                <div class="team-score">
                    <div class="team-info">
                        <span class="team-emoji">👥</span>
                        <span class="team-name">等待玩家加入...</span>
                    </div>
                    <span class="team-score-value">${Object.keys(this.gameState.players).length}/80</span>
                </div>
            `
      return
    }

    // Sort teams by score (descending)
    const sortedTeams = [...this.gameState.teams].sort((a, b) => b.score - a.score)

    teamScoresContainer.innerHTML = sortedTeams
      .map((team) => {
        const isCurrentTurn = team.id === this.gameState.currentTurnTeamId
        const memberCount = team.members.length

        return `
                <div class="team-score ${isCurrentTurn ? 'current-turn' : ''}">
                    <div class="team-info">
                        ${team.image ? `<img src="${team.image}" alt="${team.name}" class="team-emoji" style="width: 20px; height: 20px;">` : `<span class="team-emoji">${team.emoji}</span>`}
                        <div class="team-color" style="background-color: ${team.color}"></div>
                        <span class="team-name">${team.name || '隊伍 ' + team.id.split('_')[1]} (${memberCount}人)</span>
                    </div>
                    <span class="team-score-value">${team.score}</span>
                </div>
            `
      })
      .join('')
  }

  updateGameInfo() {
    if (!this.gameState) return

    const currentTeamElement = document.getElementById('currentTeam')
    const gameStatus = document.getElementById('gameStatus')

    if (this.gameState.phase === 'lobby') {
      currentTeamElement.textContent = '大廳等待中...'
      // Clear game end results when back in lobby
      if (gameStatus) {
        gameStatus.innerHTML = ''
      }
    } else if (this.gameState.phase === 'in_progress') {
      const currentTeam = this.gameState.teams.find((t) => t.id === this.gameState.currentTurnTeamId)
      if (currentTeam) {
        const runsCompleted = currentTeam.runsCompleted || 0
        const teamDisplay = currentTeam.name || `隊伍 ${currentTeam.id.split('_')[1]}`
        if (currentTeam.image) {
          currentTeamElement.innerHTML = `<img src="${currentTeam.image}" alt="${teamDisplay}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;">${teamDisplay} 的回合 (${runsCompleted}/5)`
        } else {
          currentTeamElement.textContent = `${currentTeam.emoji} ${teamDisplay} 的回合 (${runsCompleted}/5)`
        }
      }
      // Clear game end results when game is in progress
      if (gameStatus) {
        gameStatus.innerHTML = ''
      }
    } else if (this.gameState.phase === 'ended') {
      currentTeamElement.textContent = '遊戲結束'
    }
  }

  updateTimer(timeLeft) {
    const timerElement = document.getElementById('turnTimer')
    const seconds = Math.ceil(timeLeft / 1000)

    if (seconds <= 0) {
      timerElement.textContent = '00'
      timerElement.style.color = '#ff6b6b'
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`

      if (seconds <= 10) {
        timerElement.style.color = '#ff6b6b'
      } else if (seconds <= 30) {
        timerElement.style.color = '#ffa500'
      } else {
        timerElement.style.color = '#4ecdc4'
      }
    }
  }

  updateHostControls() {
    if (!this.isHost || !this.gameState) return

    const assignTeamsBtn = document.getElementById('assignTeamsBtn')
    const startGameBtn = document.getElementById('startGameBtn')
    const skipTurnBtn = document.getElementById('skipTurnBtn')
    const endGameBtn = document.getElementById('endGameBtn')

    const hasPlayers = Object.keys(this.gameState.players).length > 0
    const hasTeams = this.gameState.teams.length > 0
    const gameInProgress = this.gameState.phase === 'in_progress'

    assignTeamsBtn.disabled = !hasPlayers || gameInProgress
    startGameBtn.disabled = !hasTeams || gameInProgress
    skipTurnBtn.disabled = !gameInProgress
    endGameBtn.disabled = !gameInProgress
  }

  updateMobileUrl() {
    const mobileUrlElement = document.getElementById('mobileUrl')
    const baseUrl = window.location.origin
    mobileUrlElement.textContent = `${baseUrl}/mobile`
  }

  cleanupModals() {
    console.log('Cleaning up modals after game reset')

    // Remove team creation modal
    const teamModal = document.querySelector('.team-creation-modal')
    if (teamModal) {
      teamModal.remove()
      console.log('Removed team creation modal')
    }

    // Remove advanced controls panel
    const advancedPanel = document.getElementById('advancedControlsPanel')
    if (advancedPanel) {
      advancedPanel.remove()
      console.log('Removed advanced controls panel')
    }

    // Remove any authentication modals
    const authModal = document.getElementById('hostAuthModal')
    if (authModal && authModal.style.display !== 'none') {
      authModal.style.display = 'none'
      console.log('Hidden authentication modal')
    }

    // Remove any other modals that might be present
    const allModals = document.querySelectorAll('.modal, .game-modal, [class*="modal"]')
    allModals.forEach((modal) => {
      // Skip the auth modal since we handle it separately
      if (modal.id !== 'hostAuthModal') {
        modal.remove()
        console.log('Removed modal:', modal.className)
      }
    })

    // Also clean up any HostControls modals if they exist
    if (this.hostControls && typeof this.hostControls.cleanupModals === 'function') {
      this.hostControls.cleanupModals()
    }
  }

  showHostAuthModal() {
    const modal = document.getElementById('hostAuthModal')
    const form = document.getElementById('hostAuthForm')
    const tokenInput = document.getElementById('hostTokenInput')
    const submitBtn = document.getElementById('authSubmitBtn')
    const cancelBtn = document.getElementById('authCancelBtn')
    const errorDiv = document.getElementById('authError')

    // Show modal
    modal.style.display = 'flex'

    // Focus token input
    setTimeout(() => {
      tokenInput.focus()
    }, 300)

    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleHostAuth(tokenInput.value.trim())
    })

    // Handle cancel button
    cancelBtn.addEventListener('click', () => {
      this.hideHostAuthModal()
      // Redirect to regular view
      window.location.href = window.location.origin
    })

    // Handle enter key
    tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.handleHostAuth(tokenInput.value.trim())
      }
    })
  }

  hideHostAuthModal() {
    const modal = document.getElementById('hostAuthModal')
    modal.style.display = 'none'
  }

  showAuthError(message) {
    const errorDiv = document.getElementById('authError')
    errorDiv.textContent = message
    errorDiv.style.display = 'block'

    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none'
    }, 5000)
  }

  async handleHostAuth(token) {
    if (!token) {
      this.showAuthError('請輸入主持人令牌')
      return
    }

    const submitBtn = document.getElementById('authSubmitBtn')
    const tokenInput = document.getElementById('hostTokenInput')

    // Disable form during verification
    submitBtn.disabled = true
    submitBtn.textContent = '🔍 驗證中...'
    tokenInput.disabled = true

    try {
      // Test the token by attempting a simple host operation
      const testSocket = io()

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('連線超時'))
        }, 10000)

        testSocket.on('connect', () => {
          // Test token with a simple host operation
          testSocket.emit('host_control', {
            action: 'test_auth',
            token: token,
          })
        })

        testSocket.on('host_control_success', (data) => {
          clearTimeout(timeout)
          testSocket.disconnect()
          resolve(data)
        })

        testSocket.on('error', (error) => {
          clearTimeout(timeout)
          testSocket.disconnect()
          reject(error)
        })
      })

      // Authentication successful
      this.hostToken = token
      this.hostAuthenticated = true
      this.hideHostAuthModal()

      // Continue with normal initialization
      this.setupSocket()
      this.setupPhaser()
      this.setupUI()
      this.updateMobileUrl()

      // Initialize host controls with token
      if (this.isHost) {
        this.hostControls = new HostControls(this)
      }
    } catch (error) {
      console.error('Host authentication failed:', error)
      this.showAuthError(error.message || '驗證失敗，請檢查令牌是否正確')

      // Re-enable form
      submitBtn.disabled = false
      submitBtn.textContent = '🔓 驗證並進入'
      tokenInput.disabled = false
      tokenInput.focus()
      tokenInput.select()
    }
  }

  // Connection management methods

  updateConnectionStatus(connected, customMessage = null) {
    const statusElement = document.querySelector('.connection-status')
    if (!statusElement) return

    if (connected) {
      statusElement.innerHTML = '🟢 已連接'
      statusElement.style.color = '#2ecc71'
    } else {
      const message = customMessage || '🔑 已斷線'
      statusElement.innerHTML = message
      statusElement.style.color = '#e74c3c'
    }
  }

  showConnectionLostIndicator() {
    if (document.getElementById('connectionLostIndicator')) return

    const indicator = document.createElement('div')
    indicator.id = 'connectionLostIndicator'
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e74c3c;
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      animation: pulse 1.5s ease-in-out infinite alternate;
    `
    indicator.innerHTML = '⚠️ 連接中斷'

    // Add pulse animation if not exists
    if (!document.querySelector('#mainConnectionPulse')) {
      const style = document.createElement('style')
      style.id = 'mainConnectionPulse'
      style.textContent = `
        @keyframes pulse {
          from { opacity: 0.7; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1.02); }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(indicator)
  }

  hideConnectionLostIndicator() {
    const indicator = document.getElementById('connectionLostIndicator')
    if (indicator) {
      indicator.remove()
    }
  }

  showReconnectionSuccess() {
    const successMsg = document.createElement('div')
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2ecc71;
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `
    successMsg.innerHTML = '✅ 重新連接成功'

    document.body.appendChild(successMsg)

    // Remove after 3 seconds
    setTimeout(() => {
      if (successMsg.parentElement) {
        successMsg.remove()
      }
    }, 3000)
  }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp()
})
