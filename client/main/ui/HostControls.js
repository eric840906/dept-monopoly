// Host Controls UI Component for Main Screen

class HostControls {
  constructor(gameApp) {
    this.gameApp = gameApp
    this.isHost = window.location.search.includes('host=true')
    this.currentGameState = null
    this.hostToken = gameApp.hostToken // Get token from gameApp

    if (this.isHost) {
      this.setupHostInterface()
      this.setupEventDelegation()
    }
  }

  // Helper method to send host control commands with token
  sendHostControl(data) {
    if (!this.gameApp.socket) {
      console.error('Socket not available')
      return
    }
    
    // Add token to the request if available
    const requestData = { ...data }
    if (this.hostToken) {
      requestData.token = this.hostToken
    }
    
    this.gameApp.socket.emit('host_control', requestData)
  }

  setupHostInterface() {
    // Add host indicator to title
    const gameTitle = document.getElementById('gameTitle')
    if (gameTitle) {
      gameTitle.textContent = '🎯 MTO 體驗營 [主持人模式]'
      // Apply styling safely
      const hostSpan = document.createElement('span')
      hostSpan.style.color = '#f39c12'
      hostSpan.textContent = '[主持人模式]'
      gameTitle.innerHTML = '🎯 MTO 體驗營 '
      gameTitle.appendChild(hostSpan)
    }

    // Setup host control handlers
    this.setupEventListeners()
    this.addAdvancedControls()
  }

  setupEventListeners() {
    // Basic controls
    document.getElementById('assignTeamsBtn')?.addEventListener('click', () => {
      this.showTeamCreationModal()
    })

    document.getElementById('startGameBtn')?.addEventListener('click', () => {
      this.startGame()
    })

    document.getElementById('skipTurnBtn')?.addEventListener('click', () => {
      this.skipTurn()
    })

    document.getElementById('endGameBtn')?.addEventListener('click', () => {
      this.endGame()
    })
  }

  addAdvancedControls() {
    const hostControls = document.getElementById('hostControls')
    if (!hostControls) return

    // Check if advanced button already exists
    const existingAdvancedBtn = document.getElementById('advancedControlBtn')
    if (existingAdvancedBtn) return

    // Add advanced control button
    const advancedBtn = document.createElement('button')
    advancedBtn.id = 'advancedControlBtn'
    advancedBtn.className = 'host-btn'
    advancedBtn.textContent = '⚙️ 進階控制'
    advancedBtn.addEventListener('click', () => this.showAdvancedPanel())
    hostControls.appendChild(advancedBtn)

    // Create advanced control panel
    this.createAdvancedPanel()
  }

  createAdvancedPanel() {
    const panel = document.createElement('div')
    panel.id = 'advancedPanel'
    panel.className = 'advanced-panel hidden'
    panel.innerHTML = `
            <div class="panel-overlay">
                <div class="panel-content">
                    <div class="panel-header">
                        <h3>⚙️ 進階主持人控制</h3>
                        <button class="close-btn" data-action="close-panel">×</button>
                    </div>

                    <div class="panel-section">
                        <h4>遊戲設定</h4>
                        <div class="control-group">
                            <label>回合時間限制 (秒):</label>
                            <input type="number" id="turnTimeLimit" value="90" min="30" max="300">
                            <button class="apply-btn" data-action="update-turn-time">套用</button>
                        </div>
                        <div class="control-group">
                            <label>最大回合數:</label>
                            <input type="number" id="maxRounds" value="15" min="5" max="30">
                            <button class="apply-btn" data-action="update-max-rounds">套用</button>
                        </div>
                    </div>

                    <div class="panel-section">
                        <h4>隊伍管理</h4>
                        <div id="teamManagement">
                            <!-- Team controls will be populated here -->
                        </div>
                    </div>

                    <div class="panel-section">
                        <h4>積分調整</h4>
                        <div class="control-group">
                            <select id="targetTeam">
                                <option value="">選擇隊伍...</option>
                            </select>
                            <input type="number" id="scoreAdjustment" placeholder="積分變化" step="5">
                            <input type="text" id="adjustmentReason" placeholder="調整原因">
                            <button class="apply-btn" data-action="adjust-score">調整積分</button>
                        </div>
                    </div>

                    <div class="panel-section">
                        <h4>遊戲狀態</h4>
                        <div class="control-group">
                            <button class="action-btn pause-btn" data-action="pause-game">
                                ⏸️ 暫停遊戲
                            </button>
                            <button class="action-btn resume-btn" data-action="resume-game">
                                ▶️ 繼續遊戲
                            </button>
                            <button class="action-btn reset-btn" data-action="reset-game">
                                🔄 重置遊戲
                            </button>
                        </div>
                    </div>

                    <div class="panel-section">
                        <h4>統計資訊</h4>
                        <div id="gameStats">
                            <!-- Stats will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `

    document.body.appendChild(panel)
    this.addPanelStyles()
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
        case 'close-panel':
          target.closest('.advanced-panel').classList.add('hidden')
          break
        case 'close-modal':
          target.closest('.team-creation-modal').remove()
          break
        case 'update-turn-time':
          this.updateTurnTime()
          break
        case 'update-max-rounds':
          this.updateMaxRounds()
          break
        case 'adjust-score':
          this.adjustScore()
          break
        case 'pause-game':
          this.pauseGame()
          break
        case 'resume-game':
          this.resumeGame()
          break
        case 'reset-game':
          this.resetGame()
          break
        default:
          console.warn('Unknown action:', action)
      }
    })
  }

  showAdvancedPanel() {
    const panel = document.getElementById('advancedPanel')
    if (panel) {
      panel.classList.remove('hidden')
      this.updateAdvancedPanel()
    }
  }

  updateAdvancedPanel() {
    if (!this.currentGameState) return

    // Update team management section
    this.updateTeamManagement()

    // Update team selector for score adjustment
    this.updateTeamSelector()

    // Update game stats
    this.updateGameStats()
  }

  updateTeamManagement() {
    const container = document.getElementById('teamManagement')
    if (!container || !this.currentGameState.teams) return

    // Clear container first
    container.innerHTML = ''
    
    // Create elements safely without innerHTML
    this.currentGameState.teams.forEach((team) => {
      const teamControl = document.createElement('div')
      teamControl.className = 'team-control'
      teamControl.dataset.teamId = team.id
      
      const teamInfo = document.createElement('div')
      teamInfo.className = 'team-info'
      
      const emoji = document.createElement('span')
      emoji.className = 'team-emoji'
      emoji.textContent = team.emoji
      
      const name = document.createElement('span')
      name.className = 'team-name'
      name.textContent = team.name || '隊伍 ' + team.id.split('_')[1]
      
      const memberCount = document.createElement('span')
      memberCount.className = 'member-count'
      memberCount.textContent = `(${team.members.length} 人)`
      
      teamInfo.appendChild(emoji)
      teamInfo.appendChild(name)
      teamInfo.appendChild(memberCount)
      
      const teamActions = document.createElement('div')
      teamActions.className = 'team-actions'
      
      const leftBtn = document.createElement('button')
      leftBtn.className = 'mini-btn'
      leftBtn.textContent = '←'
      leftBtn.addEventListener('click', () => this.moveTeam(team.id, -1))
      
      const position = document.createElement('span')
      position.className = 'position'
      position.textContent = `位置: ${team.position || 0}`
      
      const rightBtn = document.createElement('button')
      rightBtn.className = 'mini-btn'
      rightBtn.textContent = '→'
      rightBtn.addEventListener('click', () => this.moveTeam(team.id, 1))
      
      const eliminateBtn = document.createElement('button')
      eliminateBtn.className = 'mini-btn eliminate-btn'
      eliminateBtn.textContent = team.isEliminated ? '復活' : '淘汰'
      eliminateBtn.addEventListener('click', () => this.toggleElimination(team.id))
      
      teamActions.appendChild(leftBtn)
      teamActions.appendChild(position)
      teamActions.appendChild(rightBtn)
      teamActions.appendChild(eliminateBtn)
      
      teamControl.appendChild(teamInfo)
      teamControl.appendChild(teamActions)
      
      container.appendChild(teamControl)
    })
  }

  updateTeamSelector() {
    const selector = document.getElementById('targetTeam')
    if (!selector || !this.currentGameState.teams) return

    // Clear selector first
    selector.innerHTML = ''
    
    // Add default option
    const defaultOption = document.createElement('option')
    defaultOption.value = ''
    defaultOption.textContent = '選擇隊伍...'
    selector.appendChild(defaultOption)
    
    // Add team options safely
    this.currentGameState.teams.forEach((team) => {
      const option = document.createElement('option')
      option.value = team.id
      option.textContent = `${team.emoji} ${team.name || '隊伍 ' + team.id.split('_')[1]}`
      selector.appendChild(option)
    })
  }

  updateGameStats() {
    const container = document.getElementById('gameStats')
    if (!container) return

    const playerCount = Object.keys(this.currentGameState.players).length
    const teamCount = this.currentGameState.teams.length
    const avgTeamSize = teamCount > 0 ? Math.round(playerCount / teamCount) : 0

    // Clear container first
    container.innerHTML = ''
    
    // Create stat items safely
    const stats = [
      { label: '總玩家數:', value: playerCount },
      { label: '隊伍數量:', value: teamCount },
      { label: '平均隊伍大小:', value: `${avgTeamSize} 人` },
      { label: '當前回合:', value: this.currentGameState.round || 1 },
      { label: '遊戲階段:', value: this.getPhaseText(this.currentGameState.phase) }
    ]
    
    stats.forEach(stat => {
      const statItem = document.createElement('div')
      statItem.className = 'stat-item'
      
      const label = document.createElement('span')
      label.textContent = stat.label
      
      const value = document.createElement('span')
      value.textContent = stat.value
      
      statItem.appendChild(label)
      statItem.appendChild(value)
      container.appendChild(statItem)
    })
  }

  getPhaseText(phase) {
    const phases = {
      lobby: '大廳等待',
      in_progress: '遊戲進行中',
      ended: '遊戲結束',
    }
    return phases[phase] || phase
  }

  // Host Action Methods
  showTeamCreationModal() {
    const modal = this.createTeamListModal()
    document.body.appendChild(modal)
  }

  createTeamListModal() {
    const modal = document.createElement('div')
    modal.className = 'team-creation-modal'
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>🏆 隊伍管理</h3>
            <button class="close-btn" data-action="close-modal">×</button>
          </div>
          <div class="modal-body">
            <div class="teams-info">
              <p style="text-align: center; color: #666; margin-bottom: 20px;">
                📱 請將隊伍連結提供給玩家加入對應隊伍
              </p>
            </div>
            
            <div class="existing-teams">
              <h4>可用隊伍 & 加入連結</h4>
              <div id="teamsList">
                <!-- Teams will be populated here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    
    this.addTeamModalStyles()
    
    // Populate teams
    setTimeout(() => this.updateTeamsList(), 100)
    
    return modal
  }


  updateTeamsList() {
    const container = document.getElementById('teamsList')
    if (!container || !this.currentGameState?.teams) return
    
    if (this.currentGameState.teams.length === 0) {
      container.innerHTML = '<p style="color: #666; text-align: center;">隊伍加載中...</p>'
      return
    }
    
    // Clear container first
    container.innerHTML = ''
    
    // Create team items safely
    this.currentGameState.teams.forEach(team => {
      const teamItem = document.createElement('div')
      teamItem.className = 'team-item'
      
      const teamInfo = document.createElement('div')
      teamInfo.className = 'team-info'
      
      const teamName = document.createElement('div')
      teamName.className = 'team-name'
      
      if (team.image) {
        const img = document.createElement('img')
        img.src = team.image
        img.alt = team.name
        img.style.cssText = 'width: 24px; height: 24px; margin-right: 8px; vertical-align: middle;'
        teamName.appendChild(img)
      } else {
        const emoji = document.createElement('span')
        emoji.style.color = team.color
        emoji.textContent = team.emoji
        teamName.appendChild(emoji)
      }
      
      const nameStrong = document.createElement('strong')
      nameStrong.textContent = team.name
      teamName.appendChild(nameStrong)
      
      const memberCount = document.createElement('span')
      memberCount.className = 'member-count'
      memberCount.textContent = `(${team.members.length} 人)`
      teamName.appendChild(memberCount)
      
      const teamUrl = document.createElement('div')
      teamUrl.className = 'team-url'
      
      const small = document.createElement('small')
      small.textContent = '加入連結: '
      
      const link = document.createElement('a')
      link.href = team.joinUrl
      link.target = '_blank'
      link.textContent = team.joinUrl
      
      small.appendChild(link)
      teamUrl.appendChild(small)
      
      teamInfo.appendChild(teamName)
      teamInfo.appendChild(teamUrl)
      
      const teamActions = document.createElement('div')
      teamActions.className = 'team-actions'
      
      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-btn'
      copyBtn.textContent = '📋 複製連結'
      copyBtn.addEventListener('click', () => this.copyURL(team.joinUrl))
      
      teamActions.appendChild(copyBtn)
      
      teamItem.appendChild(teamInfo)
      teamItem.appendChild(teamActions)
      
      container.appendChild(teamItem)
    })
  }


  copyURL(url) {
    navigator.clipboard.writeText(url).then(() => {
      // Show success message
      const successMsg = document.createElement('div')
      successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 10000;
        animation: fadeInOut 2s ease-out;
      `
      successMsg.textContent = '✅ 連結已複製到剪貼板'
      
      if (!document.querySelector('#copyAnimation')) {
        const style = document.createElement('style')
        style.id = 'copyAnimation'
        style.textContent = `
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            20% { opacity: 1; transform: translateY(0); }
            80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
        `
        document.head.appendChild(style)
      }
      
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 2000)
    }).catch(err => {
      alert('複製失敗，請手動複製連結')
    })
  }

  startGame() {
    if (confirm('確定要開始遊戲嗎？開始後將無法再加入新玩家。')) {
      if (this.gameApp.socket) {
        this.gameApp.socket.emit('game_start')
      }
    }
  }

  skipTurn() {
    if (confirm('確定要跳過當前回合嗎？')) {
      if (this.gameApp.socket) {
        this.sendHostControl({ action: 'skip_turn' })
      }
    }
  }

  endGame() {
    if (confirm('確定要結束遊戲嗎？這將立即結算最終分數。')) {
      if (this.gameApp.socket) {
        this.sendHostControl({ action: 'end_game' })
      }
    }
  }

  // Advanced Control Methods
  updateTurnTime() {
    const newTime = document.getElementById('turnTimeLimit').value
    if (this.gameApp.socket && newTime) {
      this.sendHostControl({
        action: 'update_turn_time',
        payload: { time: parseInt(newTime) * 1000 },
      })
    }
  }

  updateMaxRounds() {
    const newMax = document.getElementById('maxRounds').value
    if (this.gameApp.socket && newMax) {
      this.sendHostControl({
        action: 'update_max_rounds',
        payload: { rounds: parseInt(newMax) },
      })
    }
  }

  adjustScore() {
    const teamId = document.getElementById('targetTeam').value
    const points = document.getElementById('scoreAdjustment').value
    const reason = document.getElementById('adjustmentReason').value

    if (!teamId || !points) {
      alert('請選擇隊伍並輸入積分變化')
      return
    }

    if (this.gameApp.socket) {
      this.sendHostControl({
        action: 'adjust_score',
        payload: {
          teamId,
          points: parseInt(points),
          reason: reason || '主持人調整',
        },
      })
    }

    // Clear inputs
    document.getElementById('scoreAdjustment').value = ''
    document.getElementById('adjustmentReason').value = ''
  }

  moveTeam(teamId, direction) {
    if (this.gameApp.socket) {
      this.sendHostControl({
        action: 'move_team',
        payload: { teamId, direction },
      })
    }
  }

  toggleElimination(teamId) {
    if (this.gameApp.socket) {
      this.sendHostControl({
        action: 'toggle_elimination',
        payload: { teamId },
      })
    }
  }

  pauseGame() {
    if (this.gameApp.socket) {
      this.sendHostControl({ action: 'pause_game' })
    }
  }

  resumeGame() {
    if (this.gameApp.socket) {
      this.sendHostControl({ action: 'resume_game' })
    }
  }

  resetGame() {
    if (confirm('確定要重置遊戲嗎？這將清除所有進度！')) {
      if (this.gameApp.socket) {
        this.sendHostControl({ action: 'reset_game' })
      }
    }
  }

  cleanupModals() {
    console.log('HostControls: Cleaning up modals')

    // Remove team creation modal
    const teamModal = document.querySelector('.team-creation-modal')
    if (teamModal) {
      teamModal.remove()
      console.log('HostControls: Removed team creation modal')
    }

    // Remove advanced controls panel
    const advancedPanel = document.getElementById('advancedControlsPanel')
    if (advancedPanel) {
      advancedPanel.remove()
      console.log('HostControls: Removed advanced controls panel')
    }

    // Remove any other host-related modals
    const hostModals = document.querySelectorAll('.host-modal, [class*="host-modal"]')
    hostModals.forEach(modal => {
      modal.remove()
      console.log('HostControls: Removed host modal:', modal.className)
    })
  }

  update(gameState) {
    this.currentGameState = gameState

    if (this.isHost) {
      this.updateHostControls()

      // Update advanced panel if it's open
      const panel = document.getElementById('advancedPanel')
      if (panel && !panel.classList.contains('hidden')) {
        this.updateAdvancedPanel()
      }
    }
  }

  updateHostControls() {
    if (!this.currentGameState) return

    const assignTeamsBtn = document.getElementById('assignTeamsBtn')
    const startGameBtn = document.getElementById('startGameBtn')
    const skipTurnBtn = document.getElementById('skipTurnBtn')
    const endGameBtn = document.getElementById('endGameBtn')

    const hasPlayers = Object.keys(this.currentGameState.players).length > 0
    const hasTeams = this.currentGameState.teams.length > 0
    const hasTeamsWithMembers = this.currentGameState.teams.some(team => team.members.length > 0)
    const gameInProgress = this.currentGameState.phase === 'in_progress'
    const gameEnded = this.currentGameState.phase === 'ended'

    // Create Teams button is always enabled until game starts
    if (assignTeamsBtn) assignTeamsBtn.disabled = gameInProgress || gameEnded
    // Start Game button requires teams with members
    if (startGameBtn) startGameBtn.disabled = !hasTeamsWithMembers || gameInProgress || gameEnded
    if (skipTurnBtn) skipTurnBtn.disabled = !gameInProgress
    if (endGameBtn) endGameBtn.disabled = !gameInProgress
  }

  addPanelStyles() {
    if (document.getElementById('hostControlStyles')) return

    const styles = document.createElement('style')
    styles.id = 'hostControlStyles'
    styles.textContent = `
            .advanced-panel {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                transition: opacity 0.3s ease;
            }

            .advanced-panel.hidden {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }

            .panel-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .panel-content {
                background: white;
                border-radius: 15px;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }

            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
                border-radius: 15px 15px 0 0;
            }

            .panel-header h3 {
                margin: 0;
                color: #2c3e50;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 5px;
                line-height: 1;
            }

            .close-btn:hover {
                color: #e74c3c;
            }

            .panel-section {
                padding: 20px;
                border-bottom: 1px solid #eee;
            }

            .panel-section:last-child {
                border-bottom: none;
            }

            .panel-section h4 {
                margin: 0 0 15px 0;
                color: #34495e;
                font-size: 16px;
            }

            .control-group {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }

            .control-group label {
                min-width: 120px;
                font-weight: 600;
                color: #2c3e50;
            }

            .control-group input,
            .control-group select {
                padding: 8px 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
            }

            .apply-btn,
            .mini-btn {
                padding: 8px 16px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.3s;
            }

            .apply-btn:hover,
            .mini-btn:hover {
                background: #2980b9;
            }

            .action-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                margin: 5px;
                transition: all 0.3s;
            }

            .pause-btn {
                background: #f39c12;
                color: white;
            }

            .resume-btn {
                background: #2ecc71;
                color: white;
            }

            .reset-btn {
                background: #e74c3c;
                color: white;
            }

            .team-control {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                margin-bottom: 10px;
            }

            .team-info {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .team-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .mini-btn {
                padding: 4px 8px;
                font-size: 12px;
                min-width: auto;
            }

            .eliminate-btn {
                background: #e74c3c;
            }

            .eliminate-btn:hover {
                background: #c0392b;
            }

            .position {
                font-size: 12px;
                color: #666;
                min-width: 60px;
                text-align: center;
            }

            .stat-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #ecf0f1;
            }

            .stat-item:last-child {
                border-bottom: none;
            }

            .stat-item span:first-child {
                color: #7f8c8d;
                font-weight: 600;
            }

            .stat-item span:last-child {
                color: #2c3e50;
                font-weight: bold;
            }
        `
    document.head.appendChild(styles)
  }

  addTeamModalStyles() {
    if (document.getElementById('teamModalStyles')) return

    const styles = document.createElement('style')
    styles.id = 'teamModalStyles'
    styles.textContent = `
      .team-creation-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .team-creation-modal .modal-content {
        background: white;
        border-radius: 15px;
        max-width: 700px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }


      .team-creation-form {
        padding: 20px;
        border-bottom: 1px solid #eee;
      }

      .form-group {
        margin-bottom: 15px;
      }

      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #2c3e50;
      }

      .form-group input {
        width: 100%;
        padding: 10px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        box-sizing: border-box;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .create-btn, .cancel-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s;
      }

      .create-btn {
        background: #2ecc71;
        color: white;
      }

      .create-btn:hover {
        background: #27ae60;
      }

      .cancel-btn {
        background: #95a5a6;
        color: white;
      }

      .cancel-btn:hover {
        background: #7f8c8d;
      }

      .existing-teams {
        padding: 20px;
      }

      .existing-teams h4 {
        margin: 0 0 15px 0;
        color: #34495e;
      }

      .team-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
        margin-bottom: 10px;
        border-left: 4px solid #3498db;
      }

      .team-name {
        font-size: 16px;
        margin-bottom: 5px;
      }

      .team-url {
        font-size: 12px;
      }

      .team-url a {
        color: #3498db;
        text-decoration: none;
      }

      .team-actions {
        display: flex;
        gap: 10px;
      }

      .copy-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.3s;
        background: #2ecc71;
        color: white;
        width: 100%;
      }

      .copy-btn:hover {
        background: #27ae60;
      }

      .url-display {
        display: flex;
        gap: 10px;
        margin-top: 15px;
        align-items: center;
      }

      .url-display input {
        flex: 1;
        padding: 8px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 12px;
      }

      .url-display button {
        padding: 8px 12px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      }
    `
    document.head.appendChild(styles)
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.gameApp) {
    window.gameApp.hostControls = new HostControls(window.gameApp)
  }
})
