// Mobile Game Interface Controller

class MobileGameApp {
  constructor() {
    this.socket = null
    this.currentScreen = 'loadingScreen'
    this.playerData = null
    this.gameState = null
    this.teamData = null
    this.targetTeamId = null
    this.modalCount = 0 // Track active modals
    this.diceButtonDisabled = false // Track dice button state

    this.init()
  }

  init() {
    // Check for team joining URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    this.targetTeamId = urlParams.get('team') // Changed from 'teamId' to 'team'
    
    this.setupSocket()
    this.setupEventListeners()
    this.setupEventDelegation()
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

  setupEventDelegation() {
    // Handle all data-action clicks through event delegation
    document.addEventListener('click', (event) => {
      const target = event.target
      const action = target.getAttribute('data-action')
      
      if (!action) return
      
      // Prevent default behavior
      event.preventDefault()
      
      switch (action) {
        case 'close-overlay':
          // Find the overlay element and remove it
          const overlay = target.closest('.overlay') || target.closest('.game-modal')
          if (overlay) {
            overlay.remove()
            // Decrement modal count if it's a game modal
            if (overlay.classList.contains('game-modal')) {
              this.modalCount--;
              this.enableDiceButtonIfReady();
            }
          } else {
            // Fallback: try to find parent elements
            let parent = target.parentElement
            while (parent && !parent.classList.contains('overlay') && !parent.classList.contains('game-modal')) {
              parent = parent.parentElement
            }
            if (parent) {
              if (parent.classList.contains('game-modal')) {
                this.modalCount--;
                this.enableDiceButtonIfReady();
              }
              parent.remove()
            }
          }
          break
        default:
          console.warn('Unknown mobile action:', action)
      }
    })
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
      
      // If we have a target team, try to join it after a small delay
      // This allows time for the game state to be synchronized
      if (this.targetTeamId) {
        console.log(`Attempting to join team: ${this.targetTeamId}`)
        this.showTeamJoiningIndicator()
        
        // Wait a bit for game state to sync, then attempt team join
        setTimeout(() => {
          if (this.targetTeamId) { // Check again in case it was cleared
            this.socket.emit('team_join', { teamId: this.targetTeamId })
          }
        }, 500) // 500ms delay
      }
      
      this.showScreen('lobbyScreen')
    })

    this.socket.on('team_joined', (data) => {
      console.log('Team joined successfully:', data)
      this.teamData = data.team
      this.showTeamJoinSuccess()
    })

    // Game state events
    this.socket.on('game_state_update', (gameState) => {
      console.log('Game state updated:', gameState)
      
      // Detect game reset (when we go back to lobby phase with no players)
      const wasReset = this.gameState && 
                      this.gameState.phase === 'in_progress' && 
                      gameState.phase === 'lobby' && 
                      Object.keys(gameState.players).length === 0

      this.gameState = gameState
      this.updateGameState()
      
      // Clean up modals if game was reset
      if (wasReset) {
        this.cleanupModals()
      }
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
        this.modalCount++; // Track mini-game result modal
        if (window.MiniGames) {
          window.MiniGames.showResult(data)
        }
        // Mini-game results don't auto-close, so enable dice after a delay
        setTimeout(() => {
          this.modalCount--;
          this.enableDiceButtonIfReady();
        }, 3000); // Give time for players to read the result
      }
    })

    this.socket.on('chance_card_drawn', (data) => {
      console.log('Chance card drawn:', data)
      // Only show if it's for our team
      if (this.teamData && data.teamId === this.teamData.id) {
        this.showChanceCardResult(data)
      }
    })

    this.socket.on('destiny_card_drawn', (data) => {
      console.log('Destiny card drawn:', data)
      // Only show if it's for our team
      if (this.teamData && data.teamId === this.teamData.id) {
        this.showDestinyCardResult(data)
      }
    })

    this.socket.on('game_end', (data) => {
      console.log('Game ended:', data)
      this.showGameEnd(data)
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
      
      // If team joining failed, provide specific handling
      if (this.targetTeamId && error.message.includes('Team not found')) {
        // Remove joining indicator
        const joiningIndicator = document.getElementById('teamJoiningIndicator')
        if (joiningIndicator) {
          joiningIndicator.remove()
        }
        
        // Show specific error message for team not found
        const errorMsg = `隊伍連結無效或已過期\n\n` +
                        `原因: ${error.message}\n\n` +
                        `建議解決方案:\n` +
                        `• 檢查連結是否正確\n` +
                        `• 檢查隊伍連結是否正確\n` +
                        `• 詢問主持人最新連結`
        
        this.showError(errorMsg)
        this.targetTeamId = null
        return
      }
      
      // Generic team joining error
      if (this.targetTeamId && error.message.includes('Team')) {
        // Remove joining indicator
        const joiningIndicator = document.getElementById('teamJoiningIndicator')
        if (joiningIndicator) {
          joiningIndicator.remove()
        }
        this.targetTeamId = null
      }
      
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
        const teamIcon = team.image ? 
          `<img src="${team.image}" alt="${team.name}" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">` :
          team.emoji;
        playerTeamEl.innerHTML = `${teamIcon} ${team.name || '隊伍 ' + team.id.split('_')[1]}`;
      }

      // Show team info card
      const teamInfoCard = document.getElementById('teamInfo')
      if (teamInfoCard) {
        teamInfoCard.classList.remove('hidden')

        if (team.image) {
          document.getElementById('teamEmoji').innerHTML = `<img src="${team.image}" alt="${team.name}" style="width: 32px; height: 32px;">`
        } else {
          document.getElementById('teamEmoji').textContent = team.emoji
        }
        document.getElementById('teamColor').style.backgroundColor = team.color
        document.getElementById('teamName').textContent = team.name || `隊伍 ${team.id.split('_')[1]}`
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
    const isMoving = this.teamData.isMoving

    // Update turn status
    const turnStatusEl = document.getElementById('turnStatus')
    if (turnStatusEl) {
      if (isMyTurn) {
        if (isMoving) {
          turnStatusEl.textContent = '🎲 隊伍移動中...'
          turnStatusEl.style.color = '#e67e22'
        } else if (isCaptain) {
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
          const teamDisplay = currentTeam.name || `隊伍 ${currentTeam.id.split('_')[1]}`;
          if (currentTeam.isMoving) {
            turnStatusEl.textContent = `🎲 ${teamDisplay} 移動中...`
            turnStatusEl.style.color = '#e67e22'
          } else {
            if (currentTeam.image) {
              turnStatusEl.innerHTML = `<img src="${currentTeam.image}" alt="${teamDisplay}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;">${teamDisplay} 的回合`;
            } else {
              turnStatusEl.textContent = `${currentTeam.emoji} ${teamDisplay} 的回合`;
            }
            turnStatusEl.style.color = '#f39c12'
          }
        }
      }
    }

    // Show/hide interfaces based on turn, captain status, and movement state
    if (isMyTurn && !isMoving && isCaptain) {
      this.showInterface('diceInterface')
    } else if (isMyTurn && !isMoving && !isCaptain) {
      this.showAdvisorDiceInterface()
    } else {
      this.showInterface('waitingInterface')
    }
    
    // Update dice button state
    this.updateDiceButtonState(isMyTurn, isCaptain, isMoving)
  }

  updateDiceButtonState(isMyTurn, isCaptain, isMoving) {
    const rollBtn = document.getElementById('rollDiceBtn')
    if (!rollBtn || !isMyTurn || !isCaptain) return

    if (isMoving || this.diceButtonDisabled || this.modalCount > 0) {
      rollBtn.disabled = true
      if (isMoving) {
        rollBtn.textContent = '移動中...'
      } else if (this.modalCount > 0) {
        rollBtn.textContent = '等待確認...'
      } else {
        rollBtn.textContent = '處理中...'
      }
    } else {
      rollBtn.disabled = false
      rollBtn.textContent = '🎲 擲骰子'
    }
  }

  enableDiceButtonIfReady() {
    // Only enable dice button if no modals are active and dice is not disabled for other reasons
    if (this.modalCount <= 0) {
      this.diceButtonDisabled = false
      // Refresh the dice button state
      if (this.gameState && this.teamData) {
        const isMyTurn = this.gameState.currentTurnTeamId === this.teamData.id
        const isCaptain = this.teamData.currentCaptainId === this.playerData.id
        const isMoving = this.teamData.isMoving
        this.updateDiceButtonState(isMyTurn, isCaptain, isMoving)
      }
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

    // Prevent rolling if team is currently moving
    if (this.teamData.isMoving) {
      console.log('Cannot roll dice - team is currently moving')
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
      // Show animated dice roll
      this.showAnimatedDiceRoll(data.dice, data.total)

      // Disable dice button and schedule re-enable after all modals are dismissed
      this.diceButtonDisabled = true
      setTimeout(() => {
        this.enableDiceButtonIfReady()
      }, 4000) // Wait for dice animation to complete first
    }

    // Update team position
    this.updateGameTeamInfo()
  }

  showAnimatedDiceRoll(finalDice, total) {
    // Create dice animation overlay similar to main screen
    const overlay = document.createElement('div')
    overlay.id = 'diceAnimationOverlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `

    // Create container for dice roll display - same as main screen
    const diceContainer = document.createElement('div')
    diceContainer.style.cssText = `
      background: #2c3e50;
      border: 3px solid #3498db;
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      opacity: 0.9;
      min-width: 300px;
    `
    
    // Add title text
    const titleText = document.createElement('div')
    titleText.textContent = '🎲 擲骰子'
    titleText.style.cssText = `
      font-size: 20px;
      font-family: Arial;
      color: #ffffff;
      text-align: center;
      margin-bottom: 25px;
      font-weight: bold;
    `
    diceContainer.appendChild(titleText)
    
    // Create two dice containers
    const diceRow = document.createElement('div')
    diceRow.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 25px;
    `
    
    const dice1Container = this.createMobileDiceSprite()
    const dice2Container = this.createMobileDiceSprite()
    
    diceRow.appendChild(dice1Container)
    const plusSign = document.createElement('div')
    plusSign.textContent = '+'
    plusSign.style.cssText = `
      color: white;
      font-size: 24px;
      font-weight: bold;
    `
    diceRow.appendChild(plusSign)
    diceRow.appendChild(dice2Container)
    
    diceContainer.appendChild(diceRow)
    
    // Add total text (initially hidden)
    const totalText = document.createElement('div')
    totalText.textContent = `總和: ${total}`
    totalText.style.cssText = `
      font-size: 22px;
      font-family: Arial;
      color: #f39c12;
      text-align: center;
      font-weight: bold;
      opacity: 0;
      transition: opacity 0.3s ease;
    `
    diceContainer.appendChild(totalText)
    
    overlay.appendChild(diceContainer)
    document.body.appendChild(overlay)

    // Start rolling animation - same logic as main screen
    this.animateMobileDiceRoll(dice1Container, dice2Container, finalDice, totalText, overlay)
  }
  
  createMobileDiceSprite() {
    // Create dice container
    const diceContainer = document.createElement('div')
    diceContainer.style.cssText = `
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    `
    
    const diceBg = document.createElement('div')
    diceBg.style.cssText = `
      width: 50px;
      height: 50px;
      background: #ffffff;
      border: 2px solid #2c3e50;
      border-radius: 8px;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    `
    diceContainer.appendChild(diceBg)
    
    // Store reference to background for adding dots
    diceContainer.diceBg = diceBg
    
    return diceContainer
  }
  
  createMobileDiceDots(value) {
    const dots = []
    const dotSize = 4
    const dotColor = '#2c3e50'
    
    // Create dots in mobile-friendly positions
    const positions = {
      1: [[0, 0]], // center
      2: [[-10, -10], [10, 10]], // diagonal
      3: [[-12, -12], [0, 0], [12, 12]], // diagonal
      4: [[-10, -10], [10, -10], [-10, 10], [10, 10]], // corners
      5: [[-10, -10], [10, -10], [0, 0], [-10, 10], [10, 10]], // corners + center
      6: [[-10, -12], [10, -12], [-10, 0], [10, 0], [-10, 12], [10, 12]] // two columns
    }
    
    if (positions[value]) {
      positions[value].forEach(([x, y]) => {
        const dot = document.createElement('div')
        dot.style.cssText = `
          position: absolute;
          width: ${dotSize}px;
          height: ${dotSize}px;
          background: ${dotColor};
          border-radius: 50%;
          left: 50%;
          top: 50%;
          transform: translate(${x - dotSize/2}px, ${y - dotSize/2}px);
        `
        dots.push(dot)
      })
    }
    
    return dots
  }
  
  updateMobileDiceValue(diceSprite, value) {
    // Clear existing dots
    const existingDots = diceSprite.diceBg.querySelectorAll('div')
    existingDots.forEach(dot => dot.remove())
    
    // Add new dots
    const newDots = this.createMobileDiceDots(value)
    newDots.forEach(dot => diceSprite.diceBg.appendChild(dot))
  }
  
  animateMobileDiceRoll(dice1, dice2, finalValues, totalText, overlay) {
    let rollCount = 0
    const maxRolls = 15 // Same as main screen
    const rollInterval = 100 // Same as main screen
    
    // Add bouncing animation to dice - same as main screen
    dice1.style.animation = 'mobileDiceBounce 0.1s ease infinite'
    dice2.style.animation = 'mobileDiceBounce 0.1s ease infinite'
    
    // Add CSS for mobile dice bounce if not exists
    if (!document.querySelector('#mobileDiceAnimation')) {
      const style = document.createElement('style')
      style.id = 'mobileDiceAnimation'
      style.textContent = `
        @keyframes mobileDiceBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(5deg); }
        }
        @keyframes mobileSparkle {
          0% { opacity: 1; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.2); }
        }
      `
      document.head.appendChild(style)
    }
    
    const rollTimer = setInterval(() => {
      rollCount++
      
      // Generate random dice values during rolling - same as main screen
      const randomValue1 = Math.floor(Math.random() * 6) + 1
      const randomValue2 = Math.floor(Math.random() * 6) + 1
      
      this.updateMobileDiceValue(dice1, randomValue1)
      this.updateMobileDiceValue(dice2, randomValue2)
      
      if (rollCount >= maxRolls) {
        // Show final values
        this.updateMobileDiceValue(dice1, finalValues[0])
        this.updateMobileDiceValue(dice2, finalValues[1])
        
        // Stop bouncing animation
        dice1.style.animation = 'none'
        dice2.style.animation = 'none'
        
        // Show total with fade in - same as main screen
        totalText.style.opacity = '1'
        
        // Add simple celebration effect
        this.addMobileCelebration(overlay)
        
        clearInterval(rollTimer)
        
        // Remove overlay after showing result - same timing as main screen
        setTimeout(() => {
          overlay.remove()
          // Update static dice display
          this.updateStaticDiceDisplay(finalValues, total)
        }, 3000)
      }
    }, rollInterval)
  }
  
  addMobileCelebration(overlay) {
    // Add simple sparkle effect - much more subtle than before
    for (let i = 0; i < 6; i++) {
      const sparkle = document.createElement('div')
      sparkle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: #f1c40f;
        border-radius: 50%;
        left: ${40 + Math.random() * 20}%;
        top: ${40 + Math.random() * 20}%;
        animation: mobileSparkle 0.8s ease-out;
        animation-delay: ${i * 0.1}s;
        pointer-events: none;
      `
      overlay.appendChild(sparkle)
      
      // Remove sparkle after animation
      setTimeout(() => {
        if (sparkle.parentElement) {
          sparkle.remove()
        }
      }, 800 + (i * 100))
    }
  }

  updateStaticDiceDisplay(dice, total) {
    // Update the original static dice display that might exist
    const diceResultEl = document.getElementById('diceResult')
    const dice1El = document.getElementById('dice1')
    const dice2El = document.getElementById('dice2')
    const diceTotalEl = document.getElementById('diceTotal')

    if (diceResultEl && dice1El && dice2El && diceTotalEl) {
      dice1El.textContent = dice[0]
      dice2El.textContent = dice[1]
      diceTotalEl.textContent = total
      diceResultEl.classList.remove('hidden')
    }
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
      
      // ALL team members now see the quiz interface, but with different interaction levels
      window.MiniGames.load(data, miniGameContent, this.socket, this.teamData.id, this.playerData.id, () => {
        // Only captain needs to notify server to start timer
        if (isCaptain) {
          console.log('Captain mini-game UI ready, notifying server to start timer')
          this.socket.emit('mini_game_ready', { teamId: this.teamData.id })
        } else {
          console.log('Advisor mini-game UI ready, captain will start the timer')
        }
      }, isCaptain) // Pass captain status to MiniGames
    } else {
      // Fallback: if MiniGames not available, start timer immediately (only for captain)
      if (isCaptain) {
        this.socket.emit('mini_game_ready', { teamId: this.teamData.id })
      }
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

  showChanceCardResult(data) {
    const { chanceCard, newScore, newPosition } = data;
    
    // Track modal count
    this.modalCount++;
    
    // Determine card color based on type
    let cardColor, bgGradient;
    switch (chanceCard.type) {
      case 'disaster':
        cardColor = '#8e44ad';
        bgGradient = 'linear-gradient(135deg, #8e44ad 0%, #732d91 100%)';
        break;
      case 'bad':
        cardColor = '#e74c3c';
        bgGradient = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        break;
      case 'neutral':
        cardColor = '#7f8c8d';
        bgGradient = 'linear-gradient(135deg, #7f8c8d 0%, #5d6d6e 100%)';
        break;
      case 'good':
        cardColor = '#27ae60';
        bgGradient = 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)';
        break;
      case 'excellent':
        cardColor = '#f1c40f';
        bgGradient = 'linear-gradient(135deg, #f1c40f 0%, #d4ac0d 100%)';
        break;
      default:
        cardColor = '#34495e';
        bgGradient = 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)';
    }

    const scoreText = chanceCard.scoreChange > 0 ? `+${chanceCard.scoreChange}` : `${chanceCard.scoreChange}`;
    const positionText = chanceCard.effect === 'reset_to_start' ? '📍 回到起點！' : '';

    // Show chance card in a modal-like overlay
    const overlay = document.createElement('div');
    overlay.classList.add('game-modal');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cardSlideIn {
          from { 
            transform: scale(0.8) translateY(50px); 
            opacity: 0; 
          }
          to { 
            transform: scale(1) translateY(0); 
            opacity: 1; 
          }
        }
        .chance-card {
          background: ${bgGradient};
          padding: 25px;
          border-radius: 15px;
          max-width: 350px;
          width: 90%;
          color: white;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: cardSlideIn 0.5s ease-out;
          border: 3px solid rgba(255,255,255,0.2);
        }
        .chance-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #fff;
        }
        .chance-description {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 20px;
          color: rgba(255,255,255,0.9);
        }
        .chance-effects {
          background: rgba(0,0,0,0.2);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .score-change {
          font-size: 20px;
          font-weight: bold;
          color: ${chanceCard.scoreChange >= 0 ? '#2ecc71' : '#e74c3c'};
        }
        .close-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.3);
        }
      </style>
      
      <div class="chance-card">
        <div class="chance-title">🃏 ${chanceCard.title}</div>
        <div class="chance-description">${chanceCard.description}</div>
        <div class="chance-effects">
          <div class="score-change">💰 ${scoreText} 分</div>
          ${positionText ? `<div style="margin-top: 8px; color: #ff6b6b;">${positionText}</div>` : ''}
          <div style="margin-top: 10px; font-size: 14px; color: rgba(255,255,255,0.8);">
            新分數: ${newScore}
          </div>
        </div>
        <button class="close-btn" data-action="close-overlay">
          確認
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
        this.modalCount--;
        this.enableDiceButtonIfReady();
      }
    }, 5000);
  }

  showDestinyCardResult(data) {
    const { destinyCard, newScore, newPosition } = data;
    
    // Track modal count
    this.modalCount++;
    
    // Determine card color based on type (all destiny cards are negative)
    let cardColor, bgGradient;
    switch (destinyCard.type) {
      case 'curse':
        cardColor = '#8b0000';
        bgGradient = 'linear-gradient(135deg, #8b0000 0%, #5c0000 100%)';
        break;
      case 'storm':
        cardColor = '#4a4a4a';
        bgGradient = 'linear-gradient(135deg, #4a4a4a 0%, #2f2f2f 100%)';
        break;
      case 'financial':
        cardColor = '#b22222';
        bgGradient = 'linear-gradient(135deg, #b22222 0%, #8b1a1a 100%)';
        break;
      case 'reputation':
        cardColor = '#dc143c';
        bgGradient = 'linear-gradient(135deg, #dc143c 0%, #b71c1c 100%)';
        break;
      case 'technical':
        cardColor = '#800080';
        bgGradient = 'linear-gradient(135deg, #800080 0%, #4b0082 100%)';
        break;
      case 'competition':
        cardColor = '#8b4513';
        bgGradient = 'linear-gradient(135deg, #8b4513 0%, #654321 100%)';
        break;
      case 'regulatory':
        cardColor = '#696969';
        bgGradient = 'linear-gradient(135deg, #696969 0%, #2f4f4f 100%)';
        break;
      case 'economic':
        cardColor = '#556b2f';
        bgGradient = 'linear-gradient(135deg, #556b2f 0%, #2f4f2f 100%)';
        break;
      default:
        cardColor = '#8b0000';
        bgGradient = 'linear-gradient(135deg, #8b0000 0%, #5c0000 100%)';
    }

    const scoreText = `${destinyCard.scoreChange}`;
    const positionText = destinyCard.effect === 'reset_to_start' ? '📍 回到起點！' :
                        destinyCard.effect === 'move_back' ? `📍 後退 ${Math.abs(destinyCard.positionChange || 0)} 格！` : '';

    // Show destiny card in a modal-like overlay
    const overlay = document.createElement('div');
    overlay.classList.add('game-modal');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes destinySlideIn {
          from { 
            transform: scale(0.8) translateY(50px); 
            opacity: 0; 
          }
          to { 
            transform: scale(1) translateY(0); 
            opacity: 1; 
          }
        }
        .destiny-card {
          background: ${bgGradient};
          padding: 25px;
          border-radius: 15px;
          max-width: 350px;
          width: 90%;
          color: white;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.7), 0 0 20px rgba(255,0,0,0.3);
          animation: destinySlideIn 0.5s ease-out;
          border: 3px solid rgba(255,0,0,0.3);
        }
        .destiny-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #fff;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .destiny-description {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 20px;
          color: rgba(255,255,255,0.9);
        }
        .destiny-effects {
          background: rgba(0,0,0,0.3);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid rgba(255,0,0,0.2);
        }
        .score-change {
          font-size: 20px;
          font-weight: bold;
          color: #ff4444;
        }
        .close-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.3);
        }
      </style>
      
      <div class="destiny-card">
        <div class="destiny-title">💀 ${destinyCard.title}</div>
        <div class="destiny-description">${destinyCard.description}</div>
        <div class="destiny-effects">
          <div class="score-change">💸 ${scoreText} 分</div>
          ${positionText ? `<div style="margin-top: 8px; color: #ff6b6b;">${positionText}</div>` : ''}
          <div style="margin-top: 10px; font-size: 14px; color: rgba(255,255,255,0.8);">
            新分數: ${newScore}
          </div>
        </div>
        <button class="close-btn" data-action="close-overlay">
          接受命運
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
        this.modalCount--;
        this.enableDiceButtonIfReady();
      }
    }, 5000);
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
        const teamDisplay = data.winner.name || `隊伍 ${data.winner.id.split('_')[1]}`;
        winnerDisplay.innerHTML = `
                  <div style="font-size: 48px; margin-bottom: 10px;">
                    ${data.winner.image ? 
                      `<img src="${data.winner.image}" alt="${teamDisplay}" style="width: 48px; height: 48px;">` :
                      `<span style="font-size: 48px;">${data.winner.emoji}</span>`
                    }
                  </div>
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                      ${teamDisplay} 獲勝！
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
          (team, index) => {
            const teamDisplay = team.name || `隊伍 ${team.teamId.split('_')[1]}`;
            return `
                    <div class="score-item">
                        <div>
                            <span style="margin-right: 10px;">${index + 1}.</span>
                            ${team.image ? 
                              `<img src="${team.image}" alt="${teamDisplay}" style="width: 20px; height: 20px; margin-right: 10px; vertical-align: middle;">` :
                              `<span style="margin-right: 10px; font-size: 20px;">${team.emoji}</span>`
                            }
                            <span>${teamDisplay}</span>
                        </div>
                        <span style="font-weight: bold;">${team.score}</span>
                    </div>
                `;
          }
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

  showTeamJoiningIndicator() {
    // Show joining indicator
    const joiningMsg = document.createElement('div')
    joiningMsg.id = 'teamJoiningIndicator'
    joiningMsg.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #3498db;
      color: white;
      padding: 15px 25px;
      border-radius: 25px;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      animation: slideDown 0.5s ease-out;
    `
    joiningMsg.innerHTML = `⏳ 正在加入隊伍...`
    
    // Add animation if not exists
    if (!document.querySelector('#teamJoinAnimation')) {
      const style = document.createElement('style')
      style.id = 'teamJoinAnimation'
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }
    
    document.body.appendChild(joiningMsg)
  }

  showTeamJoinSuccess() {
    // Remove joining indicator
    const joiningIndicator = document.getElementById('teamJoiningIndicator')
    if (joiningIndicator) {
      joiningIndicator.remove()
    }
    
    // Show success message
    const successMsg = document.createElement('div')
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #2ecc71;
      color: white;
      padding: 15px 25px;
      border-radius: 25px;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      animation: slideDown 0.5s ease-out;
    `
    successMsg.innerHTML = `✅ 成功加入 ${this.teamData.name}！`
    
    document.body.appendChild(successMsg)
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (successMsg.parentElement) {
        successMsg.remove()
      }
    }, 3000)
  }

  retry() {
    window.location.reload()
  }

  cleanupModals() {
    console.log('Mobile: Cleaning up modals after game reset')

    // Remove all game modals (chance cards, destiny cards, mini-game results)
    const gameModals = document.querySelectorAll('.game-modal, .overlay, [class*="modal"]')
    gameModals.forEach(modal => {
      modal.remove()
      console.log('Mobile: Removed modal:', modal.className)
    })

    // Reset modal count
    this.modalCount = 0

    // Re-enable dice button if it was disabled due to modals
    this.enableDiceButtonIfReady()

    // Return to appropriate screen based on player state
    if (this.playerData && this.teamData) {
      this.showScreen('lobbyScreen')
    } else if (this.playerData) {
      this.showScreen('lobbyScreen')
    } else {
      this.showScreen('joinScreen')
    }
  }
}

// Initialize the mobile app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.mobileApp = new MobileGameApp()
})
