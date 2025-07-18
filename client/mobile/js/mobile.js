// Mobile Game Interface Controller

class MobileGameApp {
  constructor() {
    this.socket = null
    this.currentScreen = 'loadingScreen'
    this.playerData = null
    this.gameState = null
    this.teamData = null

    this.init()
  }

  init() {
    this.setupSocket()
    this.setupEventListeners()
    this.showScreen('loadingScreen')

    // Prevent zoom on double tap
    let lastTouchEnd = 0
    document.addEventListener(
      'touchend',
      function (event) {
        const now = new Date().getTime()
        if (now - lastTouchEnd <= 300) {
          event.preventDefault()
        }
        lastTouchEnd = now
      },
      false
    )
  }

  setupSocket() {
    this.socket = io()

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.updateConnectionStatus(true)

      // Auto-transition to join screen if not already joined
      if (this.currentScreen === 'loadingScreen' && !this.playerData) {
        this.showScreen('joinScreen')
      }
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
      this.updateConnectionStatus(false)
      this.showError('連接中斷，請重新連接')
    })

    // Player events
    this.socket.on('join_success', (data) => {
      console.log('Join successful:', data)
      this.playerData = data.player
      this.updatePlayerInfo()
      this.showScreen('lobbyScreen')
    })

    // Game state events
    this.socket.on('game_state_update', (gameState) => {
      console.log('Game state updated:', gameState)
      this.gameState = gameState
      this.updateGameState()
    })

    this.socket.on('teams_updated', (teams) => {
      console.log('Teams updated:', teams)
      this.updateTeamInfo()
    })

    this.socket.on('game_start', (data) => {
      console.log('Game started!', data)
      this.showScreen('gameScreen')
      this.updateGameInterface()
    })

    // Game flow events
    this.socket.on('turn_start', (data) => {
      console.log('Turn started:', data)
      this.handleTurnStart(data)
    })

    this.socket.on('turn_end', (data) => {
      console.log('Turn ended:', data)
      this.handleTurnEnd(data)
    })

    this.socket.on('dice_roll', (data) => {
      console.log('Dice rolled:', data)
      this.handleDiceRoll(data)
    })

    this.socket.on('timer_update', (data) => {
      this.updateTimer(data.timeLeft)
    })

    this.socket.on('score_update', (data) => {
      console.log('Score updated:', data)
      this.updateScore(data)
    })

    this.socket.on('event_trigger', (data) => {
      console.log('Event triggered:', data)
      this.handleEventTrigger(data)
    })

    this.socket.on('mini_game_start', (data) => {
      console.log('Mini game started:', data)
      this.showMiniGame(data)
    })

    this.socket.on('mini_game_timer_start', (data) => {
      console.log('Mini game timer started:', data)
      // Timer is already started when mini-game loads, no need to restart it
      // This event is primarily for the main screen to display the game interface
    })

    this.socket.on('mini_game_result', (data) => {
      console.log('Mini game result:', data)
      // Only show result if it's for our team
      if (this.teamData && data.teamId === this.teamData.id) {
        if (window.MiniGames) {
          window.MiniGames.showResult(data)
        }
      }
    })

    this.socket.on('game_end', (data) => {
      console.log('Game ended:', data)
      this.showGameEnd(data)
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
      this.showError(error.message)
    })
  }

  setupEventListeners() {
    // Join form
    const joinForm = document.getElementById('joinForm')
    if (joinForm) {
      joinForm.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleJoin()
      })
    }

    // Dice roll button
    const rollDiceBtn = document.getElementById('rollDiceBtn')
    if (rollDiceBtn) {
      rollDiceBtn.addEventListener('click', () => {
        this.rollDice()
      })
    }

    // Retry button
    const retryBtn = document.getElementById('retryBtn')
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.retry()
      })
    }

    // New game button
    const newGameBtn = document.getElementById('newGameBtn')
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        window.location.reload()
      })
    }
  }

  showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.remove('active')
    })

    // Show target screen
    const targetScreen = document.getElementById(screenId)
    if (targetScreen) {
      targetScreen.classList.add('active')
      this.currentScreen = screenId
    }
  }

  updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot')
    const statusText = document.querySelector('.status-item span:last-child')

    if (statusDot && statusText) {
      if (connected) {
        statusDot.classList.add('connected')
        statusText.textContent = '連接狀態: 已連接'
      } else {
        statusDot.classList.remove('connected')
        statusText.textContent = '連接狀態: 已斷線'
      }
    }
  }

  handleJoin() {
    const nickname = document.getElementById('nickname').value.trim()
    const department = document.getElementById('department').value

    if (!nickname || !department) {
      alert('請填寫所有必填欄位')
      return
    }

    // Disable form
    const submitBtn = document.querySelector('#joinForm button')
    submitBtn.disabled = true
    submitBtn.textContent = '加入中...'

    // Send join request
    this.socket.emit('player_join', {
      nickname,
      department,
    })
  }

  updatePlayerInfo() {
    if (!this.playerData) return

    const nicknameEl = document.getElementById('playerNickname')
    const departmentEl = document.getElementById('playerDepartment')

    if (nicknameEl) nicknameEl.textContent = this.playerData.nickname
    if (departmentEl) departmentEl.textContent = this.playerData.department
  }

  updateGameState() {
    if (!this.gameState) return

    // Update lobby info
    const totalPlayersEl = document.getElementById('totalPlayers')
    const totalTeamsEl = document.getElementById('totalTeams')
    const gamePhaseEl = document.getElementById('gamePhase')

    if (totalPlayersEl) {
      totalPlayersEl.textContent = Object.keys(this.gameState.players).length
    }

    if (totalTeamsEl) {
      totalTeamsEl.textContent = this.gameState.teams.length
    }

    if (gamePhaseEl) {
      const phaseText = {
        lobby: '大廳等待',
        in_progress: '遊戲進行中',
        ended: '遊戲結束',
      }
      gamePhaseEl.textContent = phaseText[this.gameState.phase] || this.gameState.phase
    }

    // Update team info
    this.updateTeamInfo()

    // Update game interface if in game
    if (this.gameState.phase === 'in_progress' && this.currentScreen === 'gameScreen') {
      this.updateGameInterface()
    }
  }

  updateTeamInfo() {
    if (!this.playerData || !this.gameState) return

    const team = this.gameState.teams.find((t) => t.members.some((m) => m.id === this.playerData.id))

    if (team) {
      this.teamData = team

      // Update lobby team display
      const playerTeamEl = document.getElementById('playerTeam')
      if (playerTeamEl) {
        playerTeamEl.textContent = `${team.emoji} 隊伍 ${team.id.split('_')[1]}`
      }

      // Show team info card
      const teamInfoCard = document.getElementById('teamInfo')
      if (teamInfoCard) {
        teamInfoCard.classList.remove('hidden')

        document.getElementById('teamEmoji').textContent = team.emoji
        document.getElementById('teamColor').style.backgroundColor = team.color
        document.getElementById('teamName').textContent = `隊伍 ${team.id.split('_')[1]}`
        document.getElementById('teamMembers').textContent = `成員: ${team.members.map((m) => m.nickname).join(', ')}`

        // Update abilities
        this.updateTeamAbilities(team.abilities)
      }

      // Update game screen team info
      this.updateGameTeamInfo()
    } else {
      // Player's team no longer exists (was removed due to being empty)
      console.log('Player team no longer exists, clearing team data')
      this.teamData = null

      // Update lobby team display
      const playerTeamEl = document.getElementById('playerTeam')
      if (playerTeamEl) {
        playerTeamEl.textContent = '隊伍已解散，請重新分配'
      }

      // Hide team info card
      const teamInfoCard = document.getElementById('teamInfo')
      if (teamInfoCard) {
        teamInfoCard.classList.add('hidden')
      }

      // Show message if in game screen
      if (this.currentScreen === 'gameScreen') {
        this.showError('您的隊伍已解散，遊戲已結束')
      }
    }
  }

  updateTeamAbilities(abilities) {
    const abilitiesContainer = document.getElementById('teamAbilities')
    if (!abilitiesContainer) return

    const abilityNames = {
      tech: '技術',
      creative: '創意',
      comms: '溝通',
      crisis: '應變力',
      ops: '營運',
      luck: '運氣',
    }

    abilitiesContainer.innerHTML = Object.entries(abilities)
      .filter(([key]) => key !== 'reroll')
      .map(
        ([key, value]) => `
                <div class="ability-item">
                    <div class="ability-name">${abilityNames[key] || key}</div>
                    <div class="ability-value">${value}</div>
                </div>
            `
      )
      .join('')
  }

  updateGameInterface() {
    if (!this.gameState || !this.teamData) return

    const isMyTurn = this.gameState.currentTurnTeamId === this.teamData.id
    const isCaptain = this.teamData.currentCaptainId === this.playerData.id

    // Update turn status
    const turnStatusEl = document.getElementById('turnStatus')
    if (turnStatusEl) {
      if (isMyTurn) {
        if (isCaptain) {
          turnStatusEl.textContent = '🎯 您的回合！(隊長)'
          turnStatusEl.style.color = '#2ecc71'
        } else {
          const currentCaptain = this.teamData.members.find(m => m.id === this.teamData.currentCaptainId)
          const captainName = currentCaptain ? currentCaptain.nickname : '隊友'
          turnStatusEl.textContent = `🎯 您隊的回合！(隊長: ${captainName})`
          turnStatusEl.style.color = '#f39c12'
        }
      } else {
        const currentTeam = this.gameState.teams.find((t) => t.id === this.gameState.currentTurnTeamId)
        if (currentTeam) {
          turnStatusEl.textContent = `${currentTeam.emoji} 隊伍 ${currentTeam.id.split('_')[1]} 的回合`
          turnStatusEl.style.color = '#f39c12'
        }
      }
    }

    // Show/hide interfaces based on turn and captain status
    if (isMyTurn && isCaptain) {
      this.showInterface('diceInterface')
    } else if (isMyTurn && !isCaptain) {
      this.showAdvisorDiceInterface()
    } else {
      this.showInterface('waitingInterface')
    }
  }

  updateGameTeamInfo() {
    if (!this.teamData) return

    // Update current score
    const currentScoreEl = document.getElementById('currentScore')
    if (currentScoreEl) {
      currentScoreEl.textContent = this.teamData.score
    }

    // Update team position
    const teamPositionEl = document.getElementById('teamPosition')
    if (teamPositionEl) {
      teamPositionEl.textContent = this.teamData.position || 0
    }

    // Update reroll count
    const rerollCountEl = document.getElementById('rerollCount')
    if (rerollCountEl) {
      rerollCountEl.textContent = `重擲: ${this.teamData.abilities.reroll || 0}`
    }
  }

  showInterface(interfaceId) {
    const interfaces = ['diceInterface', 'waitingInterface', 'miniGameInterface']

    interfaces.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        if (id === interfaceId) {
          element.classList.remove('hidden')
        } else {
          element.classList.add('hidden')
        }
      }
    })
  }

  showAdvisorDiceInterface() {
    // Hide all interfaces first
    this.showInterface('waitingInterface')
    
    // Update waiting message to show advisor role for dice rolling
    const waitingMessage = document.getElementById('waitingMessage')
    if (waitingMessage && this.teamData) {
      const currentCaptain = this.teamData.members.find(m => m.id === this.teamData.currentCaptainId)
      const captainName = currentCaptain ? currentCaptain.nickname : '隊友'
      
      waitingMessage.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h3 style="color: #f39c12; margin-bottom: 15px;">👥 團隊討論階段</h3>
          <div style="background: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 2px solid rgba(52, 152, 219, 0.3);">
            <div style="font-size: 16px; color: #3498db; margin-bottom: 8px;">
              🎯 <strong>本輪隊長：${captainName}</strong>
            </div>
            <div style="font-size: 14px; color: #7f8c8d;">
              負責擲骰子決定移動步數
            </div>
          </div>
          <div style="background: rgba(241, 196, 15, 0.1); padding: 12px; border-radius: 6px; border: 1px solid rgba(241, 196, 15, 0.3);">
            <div style="font-size: 14px; color: #f39c12; margin-bottom: 8px;">
              💡 <strong>討論建議：</strong>
            </div>
            <div style="font-size: 13px; color: #7f8c8d; line-height: 1.4;">
              • 與隊長討論策略<br>
              • 分析當前棋盤情況<br>
              • 協助做出最佳決策
            </div>
          </div>
        </div>
      `
    }
  }

  rollDice() {
    if (!this.teamData || this.gameState.currentTurnTeamId !== this.teamData.id) {
      return
    }

    const rollBtn = document.getElementById('rollDiceBtn')
    rollBtn.disabled = true
    rollBtn.textContent = '擲骰中...'

    this.socket.emit('dice_roll', { 
      teamId: this.teamData.id, 
      playerId: this.playerData.id 
    })
  }

  handleTurnStart(data) {
    console.log('Turn started for:', data)
    this.updateGameInterface()
  }

  handleTurnEnd(data) {
    console.log('Turn ended, next team:', data.nextTeamId)
    this.updateGameInterface()
  }

  handleDiceRoll(data) {
    if (data.teamId === this.teamData?.id) {
      // Show dice result
      const diceResultEl = document.getElementById('diceResult')
      const dice1El = document.getElementById('dice1')
      const dice2El = document.getElementById('dice2')
      const diceTotalEl = document.getElementById('diceTotal')

      if (diceResultEl && dice1El && dice2El && diceTotalEl) {
        dice1El.textContent = data.dice[0]
        dice2El.textContent = data.dice[1]
        diceTotalEl.textContent = data.total
        diceResultEl.classList.remove('hidden')
      }

      // Reset roll button
      const rollBtn = document.getElementById('rollDiceBtn')
      rollBtn.disabled = false
      rollBtn.textContent = '🎲 擲骰子'
    }

    // Update team position
    this.updateGameTeamInfo()
  }

  updateTimer(timeLeft) {
    const timerEl = document.getElementById('turnTimer')
    if (!timerEl) return

    const seconds = Math.ceil(timeLeft / 1000)

    if (seconds <= 0) {
      timerEl.textContent = '00:00'
      timerEl.style.color = '#e74c3c'
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`

      if (seconds <= 10) {
        timerEl.style.color = '#e74c3c'
      } else if (seconds <= 30) {
        timerEl.style.color = '#f39c12'
      } else {
        timerEl.style.color = '#2ecc71'
      }
    }
  }

  updateScore(data) {
    if (data.teamId === this.teamData?.id) {
      // Update team data
      this.teamData.score = data.newScore
      this.updateGameTeamInfo()

      // Show score change animation
      this.showScoreChange(data.pointsChanged, data.reason)
    }
  }

  showScoreChange(points, reason) {
    const scoreEl = document.getElementById('currentScore')
    if (!scoreEl) return

    // Create temporary score change indicator
    const changeEl = document.createElement('div')
    changeEl.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            background: ${points > 0 ? '#2ecc71' : '#e74c3c'};
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 14px;
            font-weight: bold;
            transform: translateY(-100%);
            animation: scoreChange 2s ease-out forwards;
            z-index: 1000;
        `
    changeEl.textContent = `${points > 0 ? '+' : ''}${points}`

    const parentEl = scoreEl.parentElement
    parentEl.style.position = 'relative'
    parentEl.appendChild(changeEl)

    // Add animation keyframes if not already added
    if (!document.querySelector('#scoreChangeAnimation')) {
      const style = document.createElement('style')
      style.id = 'scoreChangeAnimation'
      style.textContent = `
                @keyframes scoreChange {
                    0% {
                        opacity: 1;
                        transform: translateY(-100%);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-200%);
                    }
                }
            `
      document.head.appendChild(style)
    }

    // Remove after animation
    setTimeout(() => {
      if (changeEl.parentElement) {
        changeEl.parentElement.removeChild(changeEl)
      }
    }, 2000)
  }

  handleEventTrigger(data) {
    if (data.teamId === this.teamData?.id) {
      // Show event notification
      const waitingMessage = document.getElementById('waitingMessage')
      if (waitingMessage) {
        waitingMessage.textContent = `觸發事件: ${data.tile.name}`
      }
    }
  }

  showMiniGame(data) {
    // Only show mini-game if it's for our team
    if (!this.teamData || data.teamId !== this.teamData.id) {
      console.log(`Mini-game is for team ${data.teamId}, not our team ${this.teamData?.id}`)
      // Show waiting message instead
      const waitingMessage = document.getElementById('waitingMessage')
      if (waitingMessage) {
        waitingMessage.textContent = '其他隊伍正在進行小遊戲...'
      }
      return
    }

    console.log(`Showing mini-game for our team: ${data.teamId}`)
    
    // Check if current player is the captain
    const isCaptain = data.captainId === this.playerData.id;
    console.log(`Player ${this.playerData.id} is ${isCaptain ? 'CAPTAIN' : 'ADVISOR'} for this mini-game`);
    
    this.showInterface('miniGameInterface')

    if (window.MiniGames) {
      const miniGameContent = document.getElementById('miniGameContent')
      
      if (isCaptain) {
        // Captain gets interactive mini-game interface
        window.MiniGames.load(data, miniGameContent, this.socket, this.teamData.id, this.playerData.id, () => {
          console.log('Captain mini-game UI ready, notifying server to start timer')
          this.socket.emit('mini_game_ready', { teamId: this.teamData.id })
        })
      } else {
        // Non-captain gets advisor interface
        this.showAdvisorInterface(data, miniGameContent);
        // Advisors don't need to notify server - only captain does
      }
    } else {
      // Fallback: if MiniGames not available, start timer immediately
      this.socket.emit('mini_game_ready', { teamId: this.teamData.id })
    }
  }

  showAdvisorInterface(data, container) {
    const captainName = data.captainName || '隊友';
    
    container.innerHTML = `
      <div class="advisor-interface">
        <style>
          .advisor-interface {
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            color: white;
            min-height: 300px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 20px;
          }
          .captain-info {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            border: 2px solid rgba(255,255,255,0.2);
          }
          .captain-name {
            font-size: 18px;
            font-weight: bold;
            color: #ffd700;
          }
          .advisor-tips {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.5;
          }
          .timer-display {
            font-size: 24px;
            font-weight: bold;
            color: #ff6b6b;
          }
        </style>
        
        <h3>👥 團隊討論時間</h3>
        
        <div class="captain-info">
          <div class="captain-name">🎯 本輪隊長：${captainName}</div>
          <p style="margin: 8px 0 0 0; font-size: 14px;">負責提交最終答案</p>
        </div>
        
        <div class="advisor-tips">
          <p>💡 <strong>討論建議：</strong></p>
          <p>• 與隊友分享你的想法</p>
          <p>• 協助隊長分析選項</p>
          <p>• 確保團隊達成共識</p>
        </div>
        
        <div class="timer-display">
          ⏰ <span id="miniGameTimer">${data.timeLimit / 1000}</span> 秒
        </div>
      </div>
    `;

    // Start timer for advisor interface
    if (window.MiniGames && window.MiniGames.startTimer) {
      window.MiniGames.startTimer(data.timeLimit / 1000);
    }
  }

  showGameEnd(data) {
    const gameEndTitle = document.getElementById('gameEndTitle')
    const winnerDisplay = document.getElementById('winnerDisplay')
    const finalScoresList = document.getElementById('finalScoresList')

    if (gameEndTitle) {
      gameEndTitle.textContent = data.winner ? '🏆 遊戲結束！' : '🏁 遊戲結束！'
    }

    if (winnerDisplay) {
      if (data.winner) {
        winnerDisplay.innerHTML = `
                  <div style="font-size: 48px; margin-bottom: 10px;">${data.winner.emoji}</div>
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                      隊伍 ${data.winner.id.split('_')[1]} 獲勝！
                  </div>
                  <div style="font-size: 18px; color: #2ecc71;">
                      最終分數: ${data.winner.score} 分
                  </div>
              `
      } else {
        winnerDisplay.innerHTML = `
                  <div style="font-size: 36px; margin-bottom: 10px;">🏁</div>
                  <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">
                      遊戲提前結束
                  </div>
                  <div style="font-size: 16px; color: #666;">
                      ${data.reason === 'no_teams_remaining' ? '沒有隊伍剩餘' : '遊戲被終止'}
                  </div>
              `
      }
    }

    if (finalScoresList) {
      finalScoresList.innerHTML = data.finalScores
        .sort((a, b) => b.score - a.score)
        .map(
          (team, index) => `
                    <div class="score-item">
                        <div>
                            <span style="margin-right: 10px;">${index + 1}.</span>
                            <span style="margin-right: 10px;">${team.emoji}</span>
                            <span>隊伍 ${team.teamId.split('_')[1]}</span>
                        </div>
                        <span style="font-weight: bold;">${team.score}</span>
                    </div>
                `
        )
        .join('')
    }

    this.showScreen('endScreen')
  }

  showError(message) {
    const errorMessage = document.getElementById('errorMessage')
    if (errorMessage) {
      errorMessage.textContent = message
    }
    this.showScreen('errorScreen')
  }

  retry() {
    window.location.reload()
  }
}

// Initialize the mobile app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.mobileApp = new MobileGameApp()
})
