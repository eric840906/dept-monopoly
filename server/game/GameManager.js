const { GamePhase, TileType, createPlayer, createTeam, createGameState, createTile } = require('../../shared/types')
const { GAME_CONFIG, TEAM_COLORS, TEAM_EMOJIS, PREDEFINED_TEAMS, SOCKET_EVENTS, BOARD_LAYOUT } = require('../../shared/constants')
const MiniGameProcessor = require('./MiniGames')

class GameManager {
  constructor() {
    this.gameState = createGameState()
    this.io = null
    this.turnTimer = null
    this.gameTimer = null
    this.board = this.generateBoard()
    this.miniGameProcessor = new MiniGameProcessor()

    // Auto-create predefined teams
    this.initializePredefinedTeams()
  }

  setIO(io) {
    this.io = io
  }

  initializePredefinedTeams() {
    console.log('Initializing predefined teams...')

    PREDEFINED_TEAMS.forEach((teamConfig) => {
      const team = createTeam(teamConfig.id, teamConfig.color, teamConfig.emoji)
      team.name = teamConfig.name
      team.maxPlayers = teamConfig.maxPlayers
      team.image = teamConfig.image
      team.joinUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/mobile?team=${teamConfig.id}`

      this.gameState.teams.push(team)
      console.log(`Created team: ${teamConfig.name} (${teamConfig.id}) - URL: ${team.joinUrl}`)
    })

    console.log(`Initialized ${PREDEFINED_TEAMS.length} predefined teams`)
  }

  generateBoard() {
    const board = []
    const eventCounts = {}

    // Start tile
    board.push(createTile(0, TileType.START))

    // Generate remaining tiles
    for (let i = 1; i < GAME_CONFIG.BOARD_SIZE; i++) {
      if (i % 6 === 0) {
        // Every 6th tile is a chance tile
        board.push(createTile(i, TileType.CHANCE))
      } else if ((i - 9) % 6 === 0 && i >= 9) {
        // Every 6th tile starting from tile 9 is a destiny tile (9, 15, 21, etc.)
        board.push(createTile(i, TileType.DESTINY))
      } else {
        // All other tiles are event tiles
        const eventType = this.generateRandomEvent()
        board.push(createTile(i, TileType.EVENT, eventType))
        eventCounts[eventType] = (eventCounts[eventType] || 0) + 1
      }
    }

    console.log('Generated board with event distribution:', eventCounts)
    return board
  }

  generateRandomEvent() {
    // const events = ['multiple_choice_quiz', 'drag_drop_workflow', 'format_matching', 'true_or_false']
    // const events = ['multiple_choice_quiz']
    const events = ['drag_drop_workflow']
    // const events = ['format_matching']
    // const events = ['true_or_false']
    return events[Math.floor(Math.random() * events.length)]
  }

  generateChanceCard() {
    const chanceCards = [
      // Neutral Events
      {
        title: '😀 新格式大賣',
        description: '獲得口頭嘉獎，團隊士氣大增。',
        effect: 'score_only',
        scoreChange: 0,
        type: 'neutral',
      },

      // Good Events
      {
        title: '🔧 新工具製作完成',
        description: '完成新工具開發，改善部分工作流程，效率 + 87%。',
        effect: 'score_only',
        scoreChange: 30,
        type: 'good',
      },

      // Very Good Events
      {
        title: '🚀 完成新的 CI/CD 流程',
        description: '佈署效率大幅提升，團隊工作更順暢！',
        effect: 'score_only',
        scoreChange: 50,
        type: 'excellent',
      },
      {
        title: '💰 獲得大型投資',
        description: '頂級創投注資，公司估值翻倍，進入獨角獸行列！',
        effect: 'score_only',
        scoreChange: 45,
        type: 'excellent',
      },
      {
        title: '🌟 國際市場突破',
        description: '成功進軍國際市場，產品在海外大獲成功！',
        effect: 'score_only',
        scoreChange: 42,
        type: 'excellent',
      },
      {
        title: '🎊 技術突破獲利',
        description: '核心技術獲得專利，授權收入帶來巨大利潤！',
        effect: 'score_only',
        scoreChange: 38,
        type: 'excellent',
      },
    ]

    return chanceCards[Math.floor(Math.random() * chanceCards.length)]
  }

  generateDestinyCard() {
    const destinyCards = [
      // Disaster Events (from chance cards) - reset to start
      {
        title: '👍 新格式修改規格',
        description: '因神秘力量，新格式在開發過程中修改規格，導致大量時間和資源浪費',
        effect: 'reset_to_start',
        scoreChange: -90,
        type: 'disaster',
      },
      // Bad Events (from chance cards)
      {
        title: '🌋 媒體網頁 CTR 異常啦！MTO 快想想辦法啊！',
        description: '緊急分配資源處理。',
        effect: 'score_penalty',
        scoreChange: -30,
        type: 'bad',
      },
      {
        title: '📉 季度業績不佳',
        description: '你問為什麼這要扣 MTO 分？ 問就是 ONETEAM 要有難同當',
        effect: 'score_penalty',
        scoreChange: -25,
        type: 'bad',
      },
      {
        title: '⚠️ 格式漏洞發現',
        description: '內部人員巡檢發現問題，立即修復，群組內一片祥和。',
        effect: 'score_penalty',
        scoreChange: -10,
        type: 'bad',
      },
      {
        title: '🤐 關鍵員工離職',
        description: '天無不散筵席，團隊需要時間重新組織和培訓。',
        effect: 'score_penalty',
        scoreChange: -10,
        type: 'bad',
      },
      {
        title: '🔧 設備補助',
        description: '但看了一下設備補助的錢什麼都買不了，打消了這個念頭',
        effect: 'score_penalty',
        scoreChange: -5,
        type: 'bad',
      },
    ]

    return destinyCards[Math.floor(Math.random() * destinyCards.length)]
  }

  addPlayer(playerId, nickname, department) {
    if (this.gameState.phase !== GamePhase.LOBBY) {
      throw new Error('Cannot join game in progress')
    }

    if (Object.keys(this.gameState.players).length >= GAME_CONFIG.MAX_PLAYERS) {
      throw new Error('Game is full')
    }

    const player = createPlayer(playerId, nickname, department)
    this.gameState.players[playerId] = player

    this.broadcastGameState()
    return player
  }

  removePlayer(playerId) {
    const player = this.gameState.players[playerId]
    if (!player) return

    // Remove from team if assigned
    if (player.teamId) {
      const team = this.gameState.teams.find((t) => t.id === player.teamId)
      if (team) {
        team.members = team.members.filter((m) => m.id !== playerId)

        // If team is now empty, check if it's a predefined team
        if (team.members.length === 0) {
          // Check if this is a predefined team (should not be removed)
          const isPredefinedTeam = PREDEFINED_TEAMS.some((predefined) => predefined.id === team.id)

          if (isPredefinedTeam) {
            console.log(`Team ${team.id} is now empty but is predefined, keeping it for future games`)
            // Reset team properties to initial state but keep the team
            team.score = GAME_CONFIG.SCORING.STARTING_SCORE
            team.position = 0
            team.runsCompleted = 0
            team.currentCaptainId = null
            team.captainRotationIndex = 0
          } else {
            console.log(`Team ${team.id} is now empty, removing from game`)
            this.gameState.teams = this.gameState.teams.filter((t) => t.id !== team.id)
          }

          // If the removed team was the current turn team, skip to next team
          if (this.gameState.currentTurnTeamId === team.id) {
            this.skipToNextTeam()
          }
        }
      }
    }

    delete this.gameState.players[playerId]
    this.broadcastGameState()
  }

  skipToNextTeam() {
    // Check if game has already ended
    if (this.gameState.phase === GamePhase.ENDED) {
      console.log('Game has ended, ignoring skipToNextTeam call')
      return
    }

    if (this.gameState.teams.length === 0) {
      // No teams left, end the game
      this.endGame('no_teams_remaining')
      return
    }

    // Find next valid team
    const currentTeamIndex = this.gameState.teams.findIndex((t) => t.id === this.gameState.currentTurnTeamId)

    let nextTeamIndex
    if (currentTeamIndex === -1) {
      // Current team was removed, start from first team
      nextTeamIndex = 0
    } else {
      // Move to next team
      nextTeamIndex = (currentTeamIndex + 1) % this.gameState.teams.length
    }

    this.gameState.currentTurnTeamId = this.gameState.teams[nextTeamIndex].id

    // Reset turn timer
    this.startTurnTimer()

    console.log(`Skipped to next team: ${this.gameState.currentTurnTeamId}`)
  }

  joinTeam(playerId, teamId) {
    const player = this.gameState.players[playerId]
    const team = this.gameState.teams.find((t) => t.id === teamId)

    console.log(`Join team request: player=${playerId}, teamId=${teamId}`)
    console.log(`Player exists: ${!!player}, Team exists: ${!!team}`)

    if (!player) {
      console.error(`Player ${playerId} not found in game state`)
      throw new Error('Player not found')
    }

    if (!team) {
      console.error(`Team ${teamId} not found. Available teams: ${this.gameState.teams.map((t) => t.id).join(', ')}`)
      throw new Error('Team not found')
    }

    if (team.maxPlayers && team.members.length >= team.maxPlayers) {
      throw new Error('Team is full')
    }

    // Remove player from current team if any
    if (player.teamId) {
      this.leaveTeam(playerId)
    }

    // Add player to new team
    player.teamId = teamId
    team.members.push(player)

    console.log(`Player ${player.nickname} joined team ${team.name}`)
    this.broadcastGameState()

    return team
  }

  leaveTeam(playerId) {
    const player = this.gameState.players[playerId]

    if (!player || !player.teamId) {
      return
    }

    const team = this.gameState.teams.find((t) => t.id === player.teamId)
    if (team) {
      team.members = team.members.filter((member) => member.id !== playerId)
      console.log(`Player ${player.nickname} left team ${team.name}`)
    }

    player.teamId = null
    this.broadcastGameState()
  }

  getTeamByJoinCode(teamId) {
    return this.gameState.teams.find((t) => t.id === teamId)
  }

  startGame() {
    // Check if we have teams and at least one team with members
    if (this.gameState.teams.length === 0) {
      throw new Error('Cannot start game - no teams created. Please create teams first.')
    }

    const teamsWithMembers = this.gameState.teams.filter((team) => team.members.length > 0)
    if (teamsWithMembers.length === 0) {
      throw new Error('Cannot start game - no teams have members. Players need to join teams first.')
    }

    // Remove teams with no members from the game
    const emptyTeams = this.gameState.teams.filter((team) => team.members.length === 0)
    if (emptyTeams.length > 0) {
      console.log(
        `Removing ${emptyTeams.length} empty teams from game:`,
        emptyTeams.map((t) => t.name)
      )
      this.gameState.teams = teamsWithMembers
    }

    this.gameState.phase = GamePhase.IN_PROGRESS
    this.gameState.isGameStarted = true
    this.gameState.currentTurnTeamId = this.gameState.teams[0].id

    // Set initial captain for the first team
    const firstTeam = this.gameState.teams[0]
    const captain = this.rotateCaptain(firstTeam.id)

    this.startTurnTimer()
    // Note: Game timer is kept as backup but primary ending is based on runs
    this.startGameTimer()

    this.broadcastGameState()
    this.io.emit(SOCKET_EVENTS.GAME_START, {
      gameState: this.gameState,
      board: this.board,
      captainId: captain?.id || null,
      captainName: captain?.nickname || 'Unknown',
      maxRunsPerTeam: GAME_CONFIG.MAX_RUNS_PER_TEAM,
    })
  }

  rollDice(teamId) {
    if (this.gameState.currentTurnTeamId !== teamId) {
      throw new Error('Not your turn')
    }

    const team = this.gameState.teams.find((t) => t.id === teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    // Prevent rolling dice while team is moving
    if (team.isMoving) {
      throw new Error('Cannot roll dice while team is moving')
    }

    const dice1 = Math.floor(Math.random() * 6) + 1
    const dice2 = Math.floor(Math.random() * 6) + 1
    const total = dice1 + dice2

    const oldPosition = team.position
    const newPosition = (team.position + total) % GAME_CONFIG.BOARD_SIZE

    // Don't update team.position here - let handleMovementComplete do it
    // This prevents the visual jump issue

    // Set movement state to prevent further dice rolls
    team.isMoving = true

    const landedTile = this.board[newPosition]

    this.io.emit(SOCKET_EVENTS.DICE_ROLL, {
      teamId,
      dice: [dice1, dice2],
      total,
      oldPosition,
      newPosition,
      landedTile,
    })

    // Broadcast updated game state with movement flag
    this.broadcastGameState()

    // Note: Event triggering will be handled by frontend after movement animation completes
    // Events are triggered via movement_complete socket event

    return { dice: [dice1, dice2], total, landedTile }
  }

  triggerEvent(teamId, tile) {
    this.io.emit(SOCKET_EVENTS.EVENT_TRIGGER, {
      teamId,
      tile,
      eventType: tile.event,
    })

    // Start mini-game
    if (tile.event) {
      try {
        // Use current captain (don't rotate again - already rotated at start of turn)
        const team = this.gameState.teams.find((t) => t.id === teamId)
        const captain = team?.members.find((m) => m.id === team.currentCaptainId)

        const miniGameData = this.miniGameProcessor.startMiniGame(teamId, tile.event, this.gameState)

        this.io.emit(SOCKET_EVENTS.MINI_GAME_START, {
          teamId,
          captainId: captain?.id || null,
          captainName: captain?.nickname || 'Unknown',
          ...miniGameData,
        })
      } catch (error) {
        console.error('Error starting mini-game:', error)
        // Continue turn without mini-game
        this.endTurn()
      }
    } else {
      this.endTurn()
    }
  }

  triggerChanceCard(teamId, tile) {
    const team = this.gameState.teams.find((t) => t.id === teamId)
    if (!team) return

    const chanceCard = this.generateChanceCard()

    console.log(`Team ${teamId} drew chance card: ${chanceCard.title}`)

    // Apply the effect
    if (chanceCard.effect === 'reset_to_start') {
      // Reset team position to start
      team.position = 0
      // Apply score change (will likely set score very low)
      team.score = Math.max(1, team.score + chanceCard.scoreChange)
    } else if (chanceCard.effect === 'score_only') {
      // Only change score
      team.score = Math.max(0, team.score + chanceCard.scoreChange)
    }

    // Broadcast the chance card result
    this.io.emit('chance_card_drawn', {
      teamId,
      chanceCard,
      newScore: team.score,
      newPosition: team.position,
    })

    // Update score with explanation
    this.io.emit(SOCKET_EVENTS.SCORE_UPDATE, {
      teamId,
      newScore: team.score,
      pointsChanged: chanceCard.scoreChange,
      reason: chanceCard.title,
    })

    // Broadcast updated game state
    this.broadcastGameState()

    // End turn after chance card effect
    setTimeout(() => {
      if (this.gameState.phase === GamePhase.IN_PROGRESS && this.gameState.currentTurnTeamId === teamId) {
        this.endTurn()
      }
    }, 4000) // 4 second delay to show the chance card effect
  }

  triggerDestinyCard(teamId, tile) {
    const team = this.gameState.teams.find((t) => t.id === teamId)
    if (!team) return

    const destinyCard = this.generateDestinyCard()

    console.log(`Team ${teamId} drew destiny card: ${destinyCard.title}`)

    // Apply the negative effect
    if (destinyCard.effect === 'reset_to_start') {
      // Reset team position to start
      team.position = 0
      // Apply score change (will set score very low)
      team.score = Math.max(1, team.score + destinyCard.scoreChange)
    } else if (destinyCard.effect === 'score_penalty') {
      // Apply score reduction
      team.score = Math.max(0, team.score + destinyCard.scoreChange)
    } else if (destinyCard.effect === 'move_back') {
      // Move team backwards and apply score penalty
      const newPosition = Math.max(0, team.position + destinyCard.positionChange)
      team.position = newPosition
      team.score = Math.max(0, team.score + destinyCard.scoreChange)
    }

    // Broadcast the destiny card result
    this.io.emit('destiny_card_drawn', {
      teamId,
      destinyCard,
      newScore: team.score,
      newPosition: team.position,
    })

    // Update score with explanation
    this.io.emit(SOCKET_EVENTS.SCORE_UPDATE, {
      teamId,
      newScore: team.score,
      pointsChanged: destinyCard.scoreChange,
      reason: destinyCard.title,
    })

    // Broadcast updated game state
    this.broadcastGameState()

    // End turn after destiny card effect
    setTimeout(() => {
      if (this.gameState.phase === GamePhase.IN_PROGRESS && this.gameState.currentTurnTeamId === teamId) {
        this.endTurn()
      }
    }, 4000) // 4 second delay to show the destiny card effect
  }

  rotateCaptain(teamId) {
    const team = this.gameState.teams.find((t) => t.id === teamId)
    if (!team || team.members.length === 0) {
      console.warn(`Cannot rotate captain for team ${teamId}: team not found or no members`)
      return null
    }

    // Get current captain based on rotation index
    const captain = team.members[team.captainRotationIndex % team.members.length]
    team.currentCaptainId = captain.id

    // Increment rotation index for next time
    team.captainRotationIndex = (team.captainRotationIndex + 1) % team.members.length

    console.log(`Team ${teamId} captain rotated to: ${captain.nickname} (${captain.id})`)
    return captain
  }

  handleMovementComplete(teamId, position) {
    const team = this.gameState.teams.find((t) => t.id === teamId)
    if (!team) return

    // Update team position now that movement animation is complete
    team.position = position

    // Clear movement flag - team has finished moving
    team.isMoving = false

    const landedTile = this.board[position]

    // Broadcast updated game state with new position and cleared movement flag
    this.broadcastGameState()

    // Handle tile effect after movement animation is complete
    if (landedTile.type === TileType.EVENT) {
      this.triggerEvent(teamId, landedTile)
    } else if (landedTile.type === TileType.CHANCE) {
      this.triggerChanceCard(teamId, landedTile)
    } else if (landedTile.type === TileType.DESTINY) {
      this.triggerDestinyCard(teamId, landedTile)
    } else {
      this.endTurn()
    }
  }

  confirmMiniGameReady(teamId) {
    console.log(`Confirming mini-game ready for team ${teamId}`)
    const confirmed = this.miniGameProcessor.confirmClientReady(teamId)
    console.log(`Confirmation result: ${confirmed}`)

    if (confirmed) {
      // Get the game data to send to the main screen
      const gameData = this.miniGameProcessor.activeGames.get(teamId)
      console.log(`Game data for team ${teamId}:`, gameData ? 'present' : 'null')

      this.io.emit('mini_game_timer_start', {
        teamId,
        gameData: gameData
          ? {
              eventType: gameData.eventType,
              timeLimit: gameData.timeLimit,
              data: gameData.data,
            }
          : null,
      })
      console.log(`Mini-game timer started for team ${teamId}, emitted mini_game_timer_start event`)
    } else {
      console.log(`Failed to confirm mini-game ready for team ${teamId}`)
    }
    return confirmed
  }

  validateCaptainSubmission(teamId, playerId) {
    const team = this.gameState.teams.find((t) => t.id === teamId)
    if (!team) {
      console.warn(`Team ${teamId} not found for captain validation`)
      return false
    }

    if (!team.currentCaptainId) {
      console.warn(`No captain set for team ${teamId}`)
      return false
    }

    const isValidCaptain = team.currentCaptainId === playerId
    console.log(`Captain validation for team ${teamId}: player ${playerId} is ${isValidCaptain ? 'VALID' : 'INVALID'} captain (expected: ${team.currentCaptainId})`)

    return isValidCaptain
  }

  processMiniGameSubmission(teamId, submission) {
    try {
      const result = this.miniGameProcessor.processResult(teamId, submission)

      // Update team score
      this.updateScore(teamId, result.score, result.feedback)

      // Broadcast mini-game result
      this.io.emit(SOCKET_EVENTS.MINI_GAME_RESULT, {
        teamId,
        ...result,
      })

      // End turn after mini-game
      setTimeout(() => {
        // Check if game is still in progress AND it's still this team's turn
        if (this.gameState.phase === GamePhase.IN_PROGRESS && this.gameState.currentTurnTeamId === teamId) {
          this.endTurn()
        }
      }, 3000) // 3 second delay to show result

      return result
    } catch (error) {
      console.error('Error processing mini-game submission:', error)
      throw error
    }
  }

  updateScore(teamId, points, reason) {
    const team = this.gameState.teams.find((t) => t.id === teamId)
    if (!team) return

    team.score = Math.max(0, team.score + points)

    this.io.emit(SOCKET_EVENTS.SCORE_UPDATE, {
      teamId,
      newScore: team.score,
      pointsChanged: points,
      reason,
    })

    this.checkWinCondition()
  }

  endTurn() {
    // Check if game has already ended - if so, don't process turn
    if (this.gameState.phase === GamePhase.ENDED) {
      console.log('Game has ended, ignoring endTurn call')
      this.clearTurnTimer()
      return
    }

    this.clearTurnTimer()

    // Check if there are any teams left
    if (this.gameState.teams.length === 0) {
      console.log('No teams remaining, ending game')
      this.endGame('no_teams_remaining')
      return
    }

    const currentTeamIndex = this.gameState.teams.findIndex((t) => t.id === this.gameState.currentTurnTeamId)

    // Increment run count for current team
    if (currentTeamIndex !== -1) {
      const currentTeam = this.gameState.teams[currentTeamIndex]
      currentTeam.runsCompleted++
      console.log(`Team ${currentTeam.id} completed run ${currentTeam.runsCompleted}/${GAME_CONFIG.MAX_RUNS_PER_TEAM}`)
    }

    const nextTeamIndex = (currentTeamIndex + 1) % this.gameState.teams.length
    this.gameState.currentTurnTeamId = this.gameState.teams[nextTeamIndex].id

    if (nextTeamIndex === 0) {
      this.gameState.round++
    }

    // Check if all teams have completed their maximum runs
    const allTeamsFinished = this.gameState.teams.every((team) => team.runsCompleted >= GAME_CONFIG.MAX_RUNS_PER_TEAM)

    if (allTeamsFinished) {
      console.log('All teams have completed their maximum runs, ending game')
      this.endGame('runs_completed')
      return
    }

    // Rotate captain for the new turn team
    const nextTeam = this.gameState.teams[nextTeamIndex]
    const captain = this.rotateCaptain(nextTeam.id)

    this.startTurnTimer()
    this.broadcastGameState()

    this.io.emit(SOCKET_EVENTS.TURN_END, {
      nextTeamId: this.gameState.currentTurnTeamId,
      captainId: captain?.id || null,
      captainName: captain?.nickname || 'Unknown',
      round: this.gameState.round,
    })
  }

  startTurnTimer() {
    // Always clear any existing timer first to prevent multiple timers
    this.clearTurnTimer()

    this.gameState.turnTimer = GAME_CONFIG.TURN_TIME_LIMIT

    this.turnTimer = setInterval(() => {
      // Check if game has ended - if so, clear timer and stop
      if (this.gameState.phase === GamePhase.ENDED) {
        this.clearTurnTimer()
        return
      }

      this.gameState.turnTimer -= 1000

      this.io.emit(SOCKET_EVENTS.TIMER_UPDATE, {
        timeLeft: this.gameState.turnTimer,
      })

      if (this.gameState.turnTimer <= 0) {
        this.endTurn()
      }
    }, 1000)
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer)
      this.turnTimer = null
    }
  }

  startGameTimer() {
    this.gameTimer = setTimeout(() => {
      this.endGame('timeout')
    }, GAME_CONFIG.GAME_DURATION)
  }

  checkWinCondition() {
    // Check if all teams have completed their maximum runs
    const allTeamsFinished = this.gameState.teams.every((team) => team.runsCompleted >= GAME_CONFIG.MAX_RUNS_PER_TEAM)

    if (allTeamsFinished) {
      this.endGame('runs_completed')
    }
  }

  endGame(reason) {
    this.gameState.phase = GamePhase.ENDED
    this.clearTurnTimer()

    if (this.gameTimer) {
      clearTimeout(this.gameTimer)
      this.gameTimer = null
    }

    // Find winner (highest score) - handle empty teams array
    let winner = null
    if (this.gameState.teams.length > 0) {
      winner = this.gameState.teams.reduce((prev, current) => (prev.score > current.score ? prev : current))
    }

    this.gameState.winner = winner

    this.io.emit(SOCKET_EVENTS.GAME_END, {
      reason,
      winner,
      finalScores: this.gameState.teams.map((t) => ({
        teamId: t.id,
        name: t.name,
        score: t.score,
        color: t.color,
        emoji: t.emoji,
        image: t.image,
      })),
    })

    this.broadcastGameState()
  }

  resetGame() {
    console.log('Resetting game state')

    // Clear all timers
    this.clearTurnTimer()
    if (this.gameTimer) {
      clearTimeout(this.gameTimer)
      this.gameTimer = null
    }

    // Reset game state to initial values
    this.gameState = createGameState()

    // Reinitialize predefined teams after reset
    this.initializePredefinedTeams()

    // Generate new board for fresh game
    this.board = this.generateBoard()

    // Clear mini-games
    this.miniGameProcessor.activeGames.clear()

    console.log('Game reset complete - ready for new players')
    this.broadcastGameState()
    this.io.emit('board_state', this.board)
  }

  broadcastGameState() {
    if (this.io) {
      this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, this.gameState)
    }
  }

  getGameState() {
    return this.gameState
  }

  getBoard() {
    return this.board
  }
}

module.exports = GameManager
