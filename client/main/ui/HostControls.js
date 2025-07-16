// Host Controls UI Component for Main Screen

class HostControls {
  constructor(gameApp) {
    this.gameApp = gameApp
    this.isHost = window.location.search.includes('host=true')
    this.currentGameState = null

    if (this.isHost) {
      this.setupHostInterface()
    }
  }

  setupHostInterface() {
    // Add host indicator to title
    const gameTitle = document.getElementById('gameTitle')
    if (gameTitle) {
      gameTitle.innerHTML = '🎯 MTO 體驗營 <span style="color: #f39c12;">[主持人模式]</span>'
    }

    // Setup host control handlers
    this.setupEventListeners()
    this.addAdvancedControls()
  }

  setupEventListeners() {
    // Basic controls
    document.getElementById('assignTeamsBtn')?.addEventListener('click', () => {
      this.assignTeams()
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

    // Add advanced control button
    const advancedBtn = document.createElement('button')
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
                        <button class="close-btn" onclick="this.closest('.advanced-panel').classList.add('hidden')">×</button>
                    </div>

                    <div class="panel-section">
                        <h4>遊戲設定</h4>
                        <div class="control-group">
                            <label>回合時間限制 (秒):</label>
                            <input type="number" id="turnTimeLimit" value="90" min="30" max="300">
                            <button class="apply-btn" onclick="window.gameApp.hostControls.updateTurnTime()">套用</button>
                        </div>
                        <div class="control-group">
                            <label>最大回合數:</label>
                            <input type="number" id="maxRounds" value="15" min="5" max="30">
                            <button class="apply-btn" onclick="window.gameApp.hostControls.updateMaxRounds()">套用</button>
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
                            <button class="apply-btn" onclick="window.gameApp.hostControls.adjustScore()">調整積分</button>
                        </div>
                    </div>

                    <div class="panel-section">
                        <h4>遊戲狀態</h4>
                        <div class="control-group">
                            <button class="action-btn pause-btn" onclick="window.gameApp.hostControls.pauseGame()">
                                ⏸️ 暫停遊戲
                            </button>
                            <button class="action-btn resume-btn" onclick="window.gameApp.hostControls.resumeGame()">
                                ▶️ 繼續遊戲
                            </button>
                            <button class="action-btn reset-btn" onclick="window.gameApp.hostControls.resetGame()">
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

    container.innerHTML = this.currentGameState.teams
      .map(
        (team) => `
            <div class="team-control" data-team-id="${team.id}">
                <div class="team-info">
                    <span class="team-emoji">${team.emoji}</span>
                    <span class="team-name">隊伍 ${team.id.split('_')[1]}</span>
                    <span class="member-count">(${team.members.length} 人)</span>
                </div>
                <div class="team-actions">
                    <button class="mini-btn" onclick="window.gameApp.hostControls.moveTeam('${team.id}', -1)">←</button>
                    <span class="position">位置: ${team.position || 0}</span>
                    <button class="mini-btn" onclick="window.gameApp.hostControls.moveTeam('${team.id}', 1)">→</button>
                    <button class="mini-btn eliminate-btn" onclick="window.gameApp.hostControls.toggleElimination('${team.id}')">
                        ${team.isEliminated ? '復活' : '淘汰'}
                    </button>
                </div>
            </div>
        `
      )
      .join('')
  }

  updateTeamSelector() {
    const selector = document.getElementById('targetTeam')
    if (!selector || !this.currentGameState.teams) return

    selector.innerHTML = '<option value="">選擇隊伍...</option>' + this.currentGameState.teams.map((team) => `<option value="${team.id}">${team.emoji} 隊伍 ${team.id.split('_')[1]}</option>`).join('')
  }

  updateGameStats() {
    const container = document.getElementById('gameStats')
    if (!container) return

    const playerCount = Object.keys(this.currentGameState.players).length
    const teamCount = this.currentGameState.teams.length
    const avgTeamSize = teamCount > 0 ? Math.round(playerCount / teamCount) : 0

    container.innerHTML = `
            <div class="stat-item">
                <span>總玩家數:</span>
                <span>${playerCount}</span>
            </div>
            <div class="stat-item">
                <span>隊伍數量:</span>
                <span>${teamCount}</span>
            </div>
            <div class="stat-item">
                <span>平均隊伍大小:</span>
                <span>${avgTeamSize} 人</span>
            </div>
            <div class="stat-item">
                <span>當前回合:</span>
                <span>${this.currentGameState.round || 1}</span>
            </div>
            <div class="stat-item">
                <span>遊戲階段:</span>
                <span>${this.getPhaseText(this.currentGameState.phase)}</span>
            </div>
        `
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
  assignTeams() {
    if (this.gameApp.socket) {
      this.gameApp.socket.emit('team_assign')
    }
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
        this.gameApp.socket.emit('host_control', { action: 'skip_turn' })
      }
    }
  }

  endGame() {
    if (confirm('確定要結束遊戲嗎？這將立即結算最終分數。')) {
      if (this.gameApp.socket) {
        this.gameApp.socket.emit('host_control', { action: 'end_game' })
      }
    }
  }

  // Advanced Control Methods
  updateTurnTime() {
    const newTime = document.getElementById('turnTimeLimit').value
    if (this.gameApp.socket && newTime) {
      this.gameApp.socket.emit('host_control', {
        action: 'update_turn_time',
        payload: { time: parseInt(newTime) * 1000 },
      })
    }
  }

  updateMaxRounds() {
    const newMax = document.getElementById('maxRounds').value
    if (this.gameApp.socket && newMax) {
      this.gameApp.socket.emit('host_control', {
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
      this.gameApp.socket.emit('host_control', {
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
      this.gameApp.socket.emit('host_control', {
        action: 'move_team',
        payload: { teamId, direction },
      })
    }
  }

  toggleElimination(teamId) {
    if (this.gameApp.socket) {
      this.gameApp.socket.emit('host_control', {
        action: 'toggle_elimination',
        payload: { teamId },
      })
    }
  }

  pauseGame() {
    if (this.gameApp.socket) {
      this.gameApp.socket.emit('host_control', { action: 'pause_game' })
    }
  }

  resumeGame() {
    if (this.gameApp.socket) {
      this.gameApp.socket.emit('host_control', { action: 'resume_game' })
    }
  }

  resetGame() {
    if (confirm('確定要重置遊戲嗎？這將清除所有進度！')) {
      if (this.gameApp.socket) {
        this.gameApp.socket.emit('host_control', { action: 'reset_game' })
      }
    }
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
    const gameInProgress = this.currentGameState.phase === 'in_progress'
    const gameEnded = this.currentGameState.phase === 'ended'

    if (assignTeamsBtn) assignTeamsBtn.disabled = !hasPlayers || gameInProgress || gameEnded
    if (startGameBtn) startGameBtn.disabled = !hasTeams || gameInProgress || gameEnded
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.gameApp) {
    window.gameApp.hostControls = new HostControls(window.gameApp)
  }
})
