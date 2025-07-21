const { 
  GamePhase, 
  TileType,
  createPlayer, 
  createTeam, 
  createGameState, 
  createTile 
} = require('../../shared/types');
const { 
  GAME_CONFIG, 
  TEAM_COLORS, 
  TEAM_EMOJIS, 
  PREDEFINED_TEAMS,
  SOCKET_EVENTS,
  BOARD_LAYOUT 
} = require('../../shared/constants');
const MiniGameProcessor = require('./MiniGames');

class GameManager {
  constructor() {
    this.gameState = createGameState();
    this.io = null;
    this.turnTimer = null;
    this.gameTimer = null;
    this.board = this.generateBoard();
    this.miniGameProcessor = new MiniGameProcessor();
    
    // Auto-create predefined teams
    this.initializePredefinedTeams();
  }

  setIO(io) {
    this.io = io;
  }

  initializePredefinedTeams() {
    console.log('Initializing predefined teams...');
    
    PREDEFINED_TEAMS.forEach(teamConfig => {
      const team = createTeam(teamConfig.id, teamConfig.color, teamConfig.emoji);
      team.name = teamConfig.name;
      team.maxPlayers = teamConfig.maxPlayers;
      team.image = teamConfig.image;
      team.joinUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/mobile?team=${teamConfig.id}`;
      
      this.gameState.teams.push(team);
      console.log(`Created team: ${teamConfig.name} (${teamConfig.id}) - URL: ${team.joinUrl}`);
    });
    
    console.log(`Initialized ${PREDEFINED_TEAMS.length} predefined teams`);
  }

  generateBoard() {
    const board = [];
    
    // Start tile
    board.push(createTile(0, TileType.START));
    
    // Generate remaining tiles
    for (let i = 1; i < GAME_CONFIG.BOARD_SIZE; i++) {
      if (i % 6 === 0) {
        // Every 6th tile is a chance tile
        board.push(createTile(i, TileType.CHANCE));
      } else {
        // All other tiles are event tiles
        board.push(createTile(i, TileType.EVENT, this.generateRandomEvent()));
      }
    }
    
    return board;
  }

  generateRandomEvent() {
    const events = [
      'multiple_choice_quiz',
      'drag_drop_workflow',
      'format_matching',
      'team_info_pairing',
      'random_stat_check'
    ];
    return events[Math.floor(Math.random() * events.length)];
  }

  generateChanceCard() {
    const chanceCards = [
      // Very Bad Events
      {
        title: "🚨 專案重大失敗",
        description: "你們的核心專案出現致命錯誤，客戶取消合約，公司損失慘重。",
        effect: "reset_to_start",
        scoreChange: -99, // Set to 1 (100 base - 99)
        type: "disaster"
      },
      {
        title: "💔 團隊解散危機",
        description: "團隊內部嚴重衝突，多名核心成員提出離職，專案陷入停滯。",
        effect: "reset_to_start",
        scoreChange: -90,
        type: "disaster"
      },
      
      // Bad Events
      {
        title: "🐛 系統當機事件",
        description: "伺服器當機導致服務中斷，需要緊急修復並賠償客戶損失。",
        effect: "score_only",
        scoreChange: -30,
        type: "bad"
      },
      {
        title: "📉 季度業績不佳",
        description: "本季度營收未達標，需要重新檢討策略和資源分配。",
        effect: "score_only",
        scoreChange: -25,
        type: "bad"
      },
      {
        title: "⚠️ 安全漏洞發現",
        description: "系統發現安全漏洞，需要立即修補並加強防護措施。",
        effect: "score_only",
        scoreChange: -20,
        type: "bad"
      },
      {
        title: "😰 關鍵員工離職",
        description: "重要的技術主管離職，團隊需要時間重新組織和培訓。",
        effect: "score_only",
        scoreChange: -15,
        type: "bad"
      },
      
      // Neutral Events
      {
        title: "🔄 例行系統維護",
        description: "進行定期系統維護，暫時影響部分服務但確保長期穩定。",
        effect: "score_only",
        scoreChange: -5,
        type: "neutral"
      },
      {
        title: "📋 合規檢查",
        description: "配合監管單位進行例行檢查，流程順利但消耗一些資源。",
        effect: "score_only",
        scoreChange: 0,
        type: "neutral"
      },
      
      // Good Events
      {
        title: "💡 創新突破",
        description: "團隊研發出創新解決方案，獲得業界認可和媒體報導。",
        effect: "score_only",
        scoreChange: 20,
        type: "good"
      },
      {
        title: "🤝 新合作夥伴",
        description: "成功與知名企業建立戰略合作關係，開拓新的市場機會。",
        effect: "score_only",
        scoreChange: 25,
        type: "good"
      },
      {
        title: "🏆 獲得產業獎項",
        description: "產品獲得重要產業獎項，大幅提升公司品牌形象和市場地位。",
        effect: "score_only",
        scoreChange: 30,
        type: "good"
      },
      {
        title: "📈 市場佔有率提升",
        description: "成功搶佔競爭對手市場份額，營收大幅成長。",
        effect: "score_only",
        scoreChange: 35,
        type: "good"
      },
      
      // Very Good Events
      {
        title: "🚀 IPO成功上市",
        description: "公司成功公開上市，估值暴漲，團隊獲得豐厚股票收益！",
        effect: "score_only",
        scoreChange: 50,
        type: "excellent"
      },
      {
        title: "💰 獲得大型投資",
        description: "頂級創投注資，公司估值翻倍，進入獨角獸行列！",
        effect: "score_only",
        scoreChange: 45,
        type: "excellent"
      }
    ];

    return chanceCards[Math.floor(Math.random() * chanceCards.length)];
  }

  addPlayer(playerId, nickname, department) {
    if (this.gameState.phase !== GamePhase.LOBBY) {
      throw new Error('Cannot join game in progress');
    }
    
    if (Object.keys(this.gameState.players).length >= GAME_CONFIG.MAX_PLAYERS) {
      throw new Error('Game is full');
    }

    const player = createPlayer(playerId, nickname, department);
    this.gameState.players[playerId] = player;
    
    this.broadcastGameState();
    return player;
  }

  removePlayer(playerId) {
    const player = this.gameState.players[playerId];
    if (!player) return;

    // Remove from team if assigned
    if (player.teamId) {
      const team = this.gameState.teams.find(t => t.id === player.teamId);
      if (team) {
        team.members = team.members.filter(m => m.id !== playerId);
        
        // If team is now empty, check if it's a predefined team
        if (team.members.length === 0) {
          // Check if this is a predefined team (should not be removed)
          const isPredefinedTeam = PREDEFINED_TEAMS.some(predefined => predefined.id === team.id);
          
          if (isPredefinedTeam) {
            console.log(`Team ${team.id} is now empty but is predefined, keeping it for future games`);
            // Reset team properties to initial state but keep the team
            team.score = GAME_CONFIG.SCORING.STARTING_SCORE;
            team.position = 0;
            team.runsCompleted = 0;
            team.currentCaptainId = null;
            team.captainRotationIndex = 0;
          } else {
            console.log(`Team ${team.id} is now empty, removing from game`);
            this.gameState.teams = this.gameState.teams.filter(t => t.id !== team.id);
          }
          
          // If the removed team was the current turn team, skip to next team
          if (this.gameState.currentTurnTeamId === team.id) {
            this.skipToNextTeam();
          }
        }
      }
    }

    delete this.gameState.players[playerId];
    this.broadcastGameState();
  }

  skipToNextTeam() {
    // Check if game has already ended
    if (this.gameState.phase === GamePhase.ENDED) {
      console.log('Game has ended, ignoring skipToNextTeam call');
      return;
    }
    
    if (this.gameState.teams.length === 0) {
      // No teams left, end the game
      this.endGame('no_teams_remaining');
      return;
    }

    // Find next valid team
    const currentTeamIndex = this.gameState.teams.findIndex(
      t => t.id === this.gameState.currentTurnTeamId
    );
    
    let nextTeamIndex;
    if (currentTeamIndex === -1) {
      // Current team was removed, start from first team
      nextTeamIndex = 0;
    } else {
      // Move to next team
      nextTeamIndex = (currentTeamIndex + 1) % this.gameState.teams.length;
    }
    
    this.gameState.currentTurnTeamId = this.gameState.teams[nextTeamIndex].id;
    
    // Reset turn timer
    this.startTurnTimer();
    
    console.log(`Skipped to next team: ${this.gameState.currentTurnTeamId}`);
  }


  joinTeam(playerId, teamId) {
    const player = this.gameState.players[playerId];
    const team = this.gameState.teams.find(t => t.id === teamId);
    
    console.log(`Join team request: player=${playerId}, teamId=${teamId}`);
    console.log(`Player exists: ${!!player}, Team exists: ${!!team}`);
    
    if (!player) {
      console.error(`Player ${playerId} not found in game state`);
      throw new Error('Player not found');
    }
    
    if (!team) {
      console.error(`Team ${teamId} not found. Available teams: ${this.gameState.teams.map(t => t.id).join(', ')}`);
      throw new Error('Team not found');
    }
    
    if (team.maxPlayers && team.members.length >= team.maxPlayers) {
      throw new Error('Team is full');
    }
    
    // Remove player from current team if any
    if (player.teamId) {
      this.leaveTeam(playerId);
    }
    
    // Add player to new team
    player.teamId = teamId;
    team.members.push(player);
    
    console.log(`Player ${player.nickname} joined team ${team.name}`);
    this.broadcastGameState();
    
    return team;
  }

  leaveTeam(playerId) {
    const player = this.gameState.players[playerId];
    
    if (!player || !player.teamId) {
      return;
    }
    
    const team = this.gameState.teams.find(t => t.id === player.teamId);
    if (team) {
      team.members = team.members.filter(member => member.id !== playerId);
      console.log(`Player ${player.nickname} left team ${team.name}`);
    }
    
    player.teamId = null;
    this.broadcastGameState();
  }


  getTeamByJoinCode(teamId) {
    return this.gameState.teams.find(t => t.id === teamId);
  }

  startGame() {
    // Check if we have teams and at least one team with members
    if (this.gameState.teams.length === 0) {
      throw new Error('Cannot start game - no teams created. Please create teams first.');
    }

    const teamsWithMembers = this.gameState.teams.filter(team => team.members.length > 0);
    if (teamsWithMembers.length === 0) {
      throw new Error('Cannot start game - no teams have members. Players need to join teams first.');
    }

    // Remove teams with no members from the game
    const emptyTeams = this.gameState.teams.filter(team => team.members.length === 0);
    if (emptyTeams.length > 0) {
      console.log(`Removing ${emptyTeams.length} empty teams from game:`, emptyTeams.map(t => t.name));
      this.gameState.teams = teamsWithMembers;
    }

    this.gameState.phase = GamePhase.IN_PROGRESS;
    this.gameState.isGameStarted = true;
    this.gameState.currentTurnTeamId = this.gameState.teams[0].id;
    
    // Set initial captain for the first team
    const firstTeam = this.gameState.teams[0];
    const captain = this.rotateCaptain(firstTeam.id);
    
    this.startTurnTimer();
    // Note: Game timer is kept as backup but primary ending is based on runs
    this.startGameTimer();
    
    this.broadcastGameState();
    this.io.emit(SOCKET_EVENTS.GAME_START, {
      gameState: this.gameState,
      board: this.board,
      captainId: captain?.id || null,
      captainName: captain?.nickname || 'Unknown',
      maxRunsPerTeam: GAME_CONFIG.MAX_RUNS_PER_TEAM
    });
  }

  rollDice(teamId) {
    if (this.gameState.currentTurnTeamId !== teamId) {
      throw new Error('Not your turn');
    }

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    const team = this.gameState.teams.find(t => t.id === teamId);
    const oldPosition = team.position;
    team.position = (team.position + total) % GAME_CONFIG.BOARD_SIZE;

    const landedTile = this.board[team.position];

    this.io.emit(SOCKET_EVENTS.DICE_ROLL, {
      teamId,
      dice: [dice1, dice2],
      total,
      oldPosition,
      newPosition: team.position,
      landedTile
    });

    // Note: Event triggering will be handled by frontend after movement animation completes
    // Events are triggered via movement_complete socket event

    return { dice: [dice1, dice2], total, landedTile };
  }

  triggerEvent(teamId, tile) {
    this.io.emit(SOCKET_EVENTS.EVENT_TRIGGER, {
      teamId,
      tile,
      eventType: tile.event
    });

    // Start mini-game
    if (tile.event) {
      try {
        // Use current captain (don't rotate again - already rotated at start of turn)
        const team = this.gameState.teams.find(t => t.id === teamId);
        const captain = team?.members.find(m => m.id === team.currentCaptainId);
        
        const miniGameData = this.miniGameProcessor.startMiniGame(teamId, tile.event, this.gameState);
        
        this.io.emit(SOCKET_EVENTS.MINI_GAME_START, {
          teamId,
          captainId: captain?.id || null,
          captainName: captain?.nickname || 'Unknown',
          ...miniGameData
        });
      } catch (error) {
        console.error('Error starting mini-game:', error);
        // Continue turn without mini-game
        this.endTurn();
      }
    } else {
      this.endTurn();
    }
  }

  triggerChanceCard(teamId, tile) {
    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) return;

    const chanceCard = this.generateChanceCard();
    
    console.log(`Team ${teamId} drew chance card: ${chanceCard.title}`);

    // Apply the effect
    if (chanceCard.effect === "reset_to_start") {
      // Reset team position to start
      team.position = 0;
      // Apply score change (will likely set score very low)
      team.score = Math.max(1, team.score + chanceCard.scoreChange);
    } else if (chanceCard.effect === "score_only") {
      // Only change score
      team.score = Math.max(0, team.score + chanceCard.scoreChange);
    }

    // Broadcast the chance card result
    this.io.emit('chance_card_drawn', {
      teamId,
      chanceCard,
      newScore: team.score,
      newPosition: team.position
    });

    // Update score with explanation
    this.io.emit(SOCKET_EVENTS.SCORE_UPDATE, {
      teamId,
      newScore: team.score,
      pointsChanged: chanceCard.scoreChange,
      reason: chanceCard.title
    });

    // Broadcast updated game state
    this.broadcastGameState();

    // End turn after chance card effect
    setTimeout(() => {
      if (this.gameState.phase === GamePhase.IN_PROGRESS && 
          this.gameState.currentTurnTeamId === teamId) {
        this.endTurn();
      }
    }, 4000); // 4 second delay to show the chance card effect
  }

  rotateCaptain(teamId) {
    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team || team.members.length === 0) {
      console.warn(`Cannot rotate captain for team ${teamId}: team not found or no members`);
      return null;
    }

    // Get current captain based on rotation index
    const captain = team.members[team.captainRotationIndex % team.members.length];
    team.currentCaptainId = captain.id;
    
    // Increment rotation index for next time
    team.captainRotationIndex = (team.captainRotationIndex + 1) % team.members.length;
    
    console.log(`Team ${teamId} captain rotated to: ${captain.nickname} (${captain.id})`);
    return captain;
  }

  handleMovementComplete(teamId, position) {
    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) return;

    const landedTile = this.board[position];
    
    // Handle tile effect after movement animation is complete
    if (landedTile.type === TileType.EVENT) {
      this.triggerEvent(teamId, landedTile);
    } else if (landedTile.type === TileType.CHANCE) {
      this.triggerChanceCard(teamId, landedTile);
    } else {
      this.endTurn();
    }
  }

  confirmMiniGameReady(teamId) {
    console.log(`Confirming mini-game ready for team ${teamId}`);
    const confirmed = this.miniGameProcessor.confirmClientReady(teamId);
    console.log(`Confirmation result: ${confirmed}`);
    
    if (confirmed) {
      // Get the game data to send to the main screen
      const gameData = this.miniGameProcessor.activeGames.get(teamId);
      console.log(`Game data for team ${teamId}:`, gameData ? 'present' : 'null');
      
      this.io.emit('mini_game_timer_start', { 
        teamId,
        gameData: gameData || null
      });
      console.log(`Mini-game timer started for team ${teamId}, emitted mini_game_timer_start event`);
    } else {
      console.log(`Failed to confirm mini-game ready for team ${teamId}`);
    }
    return confirmed;
  }

  validateCaptainSubmission(teamId, playerId) {
    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) {
      console.warn(`Team ${teamId} not found for captain validation`);
      return false;
    }
    
    if (!team.currentCaptainId) {
      console.warn(`No captain set for team ${teamId}`);
      return false;
    }
    
    const isValidCaptain = team.currentCaptainId === playerId;
    console.log(`Captain validation for team ${teamId}: player ${playerId} is ${isValidCaptain ? 'VALID' : 'INVALID'} captain (expected: ${team.currentCaptainId})`);
    
    return isValidCaptain;
  }

  processMiniGameSubmission(teamId, submission) {
    try {
      const result = this.miniGameProcessor.processResult(teamId, submission);
      
      // Update team score
      this.updateScore(teamId, result.score, result.feedback);
      
      // Broadcast mini-game result
      this.io.emit(SOCKET_EVENTS.MINI_GAME_RESULT, {
        teamId,
        ...result
      });
      
      // End turn after mini-game
      setTimeout(() => {
        // Check if game is still in progress AND it's still this team's turn
        if (this.gameState.phase === GamePhase.IN_PROGRESS && 
            this.gameState.currentTurnTeamId === teamId) {
          this.endTurn();
        }
      }, 3000); // 3 second delay to show result
      
      return result;
    } catch (error) {
      console.error('Error processing mini-game submission:', error);
      throw error;
    }
  }

  updateScore(teamId, points, reason) {
    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) return;

    team.score = Math.max(0, team.score + points);
    
    this.io.emit(SOCKET_EVENTS.SCORE_UPDATE, {
      teamId,
      newScore: team.score,
      pointsChanged: points,
      reason
    });

    this.checkWinCondition();
  }

  endTurn() {
    // Check if game has already ended - if so, don't process turn
    if (this.gameState.phase === GamePhase.ENDED) {
      console.log('Game has ended, ignoring endTurn call');
      this.clearTurnTimer();
      return;
    }
    
    this.clearTurnTimer();
    
    // Check if there are any teams left
    if (this.gameState.teams.length === 0) {
      console.log('No teams remaining, ending game');
      this.endGame('no_teams_remaining');
      return;
    }
    
    const currentTeamIndex = this.gameState.teams.findIndex(
      t => t.id === this.gameState.currentTurnTeamId
    );
    
    // Increment run count for current team
    if (currentTeamIndex !== -1) {
      const currentTeam = this.gameState.teams[currentTeamIndex];
      currentTeam.runsCompleted++;
      console.log(`Team ${currentTeam.id} completed run ${currentTeam.runsCompleted}/${GAME_CONFIG.MAX_RUNS_PER_TEAM}`);
    }
    
    const nextTeamIndex = (currentTeamIndex + 1) % this.gameState.teams.length;
    this.gameState.currentTurnTeamId = this.gameState.teams[nextTeamIndex].id;
    
    if (nextTeamIndex === 0) {
      this.gameState.round++;
    }

    // Check if all teams have completed their maximum runs
    const allTeamsFinished = this.gameState.teams.every(team => 
      team.runsCompleted >= GAME_CONFIG.MAX_RUNS_PER_TEAM
    );
    
    if (allTeamsFinished) {
      console.log('All teams have completed their maximum runs, ending game');
      this.endGame('runs_completed');
      return;
    }

    // Rotate captain for the new turn team
    const nextTeam = this.gameState.teams[nextTeamIndex];
    const captain = this.rotateCaptain(nextTeam.id);
    
    this.startTurnTimer();
    this.broadcastGameState();
    
    this.io.emit(SOCKET_EVENTS.TURN_END, {
      nextTeamId: this.gameState.currentTurnTeamId,
      captainId: captain?.id || null,
      captainName: captain?.nickname || 'Unknown',
      round: this.gameState.round
    });
  }

  startTurnTimer() {
    // Always clear any existing timer first to prevent multiple timers
    this.clearTurnTimer();
    
    this.gameState.turnTimer = GAME_CONFIG.TURN_TIME_LIMIT;
    
    this.turnTimer = setInterval(() => {
      // Check if game has ended - if so, clear timer and stop
      if (this.gameState.phase === GamePhase.ENDED) {
        this.clearTurnTimer();
        return;
      }
      
      this.gameState.turnTimer -= 1000;
      
      this.io.emit(SOCKET_EVENTS.TIMER_UPDATE, {
        timeLeft: this.gameState.turnTimer
      });
      
      if (this.gameState.turnTimer <= 0) {
        this.endTurn();
      }
    }, 1000);
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  startGameTimer() {
    this.gameTimer = setTimeout(() => {
      this.endGame('timeout');
    }, GAME_CONFIG.GAME_DURATION);
  }

  checkWinCondition() {
    // Check if all teams have completed their maximum runs
    const allTeamsFinished = this.gameState.teams.every(team => 
      team.runsCompleted >= GAME_CONFIG.MAX_RUNS_PER_TEAM
    );
    
    if (allTeamsFinished) {
      this.endGame('runs_completed');
    }
  }

  endGame(reason) {
    this.gameState.phase = GamePhase.ENDED;
    this.clearTurnTimer();
    
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }

    // Find winner (highest score) - handle empty teams array
    let winner = null;
    if (this.gameState.teams.length > 0) {
      winner = this.gameState.teams.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );
    }
    
    this.gameState.winner = winner;

    this.io.emit(SOCKET_EVENTS.GAME_END, {
      reason,
      winner,
      finalScores: this.gameState.teams.map(t => ({
        teamId: t.id,
        name: t.name,
        score: t.score,
        color: t.color,
        emoji: t.emoji,
        image: t.image
      }))
    });

    this.broadcastGameState();
  }

  resetGame() {
    console.log('Resetting game state');
    
    // Clear all timers
    this.clearTurnTimer();
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    
    // Reset game state to initial values
    this.gameState = createGameState();
    
    // Reinitialize predefined teams after reset
    this.initializePredefinedTeams();
    
    // Generate new board for fresh game
    this.board = this.generateBoard();
    
    // Clear mini-games
    this.miniGameProcessor.activeGames.clear();
    
    console.log('Game reset complete - ready for new players');
    this.broadcastGameState();
    this.io.emit('board_state', this.board);
  }

  broadcastGameState() {
    if (this.io) {
      this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, this.gameState);
    }
  }

  getGameState() {
    return this.gameState;
  }

  getBoard() {
    return this.board;
  }
}

module.exports = GameManager;