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
  }

  setIO(io) {
    this.io = io;
  }

  generateBoard() {
    const board = [];
    
    // Start tile
    board.push(createTile(0, TileType.START));
    
    // Generate remaining tiles - all as event tiles
    for (let i = 1; i < GAME_CONFIG.BOARD_SIZE; i++) {
      board.push(createTile(i, TileType.EVENT, this.generateRandomEvent()));
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
        
        // If team is now empty, remove it from the game
        if (team.members.length === 0) {
          console.log(`Team ${team.id} is now empty, removing from game`);
          this.gameState.teams = this.gameState.teams.filter(t => t.id !== team.id);
          
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

  assignTeams() {
    const players = Object.values(this.gameState.players);
    
    if (players.length === 0) {
      console.log('No players to assign to teams');
      return [];
    }
    
    // Calculate optimal team count based on player count
    // Ensure each team has at least 1 player, but prefer 8-12 players per team
    const idealPlayersPerTeam = 10;
    let teamCount = Math.max(1, Math.ceil(players.length / idealPlayersPerTeam));
    
    // Apply min/max team constraints
    teamCount = Math.min(GAME_CONFIG.MAX_TEAMS, Math.max(GAME_CONFIG.MIN_TEAMS, teamCount));
    
    // However, never create more teams than we have players
    teamCount = Math.min(teamCount, players.length);

    console.log(`Creating ${teamCount} teams for ${players.length} players`);

    // Clear existing teams
    this.gameState.teams = [];

    // Create teams
    for (let i = 0; i < teamCount; i++) {
      const team = createTeam(
        `team_${i}`,
        TEAM_COLORS[i % TEAM_COLORS.length],
        TEAM_EMOJIS[i % TEAM_EMOJIS.length]
      );
      this.gameState.teams.push(team);
    }

    // Shuffle players and assign to teams
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    shuffledPlayers.forEach((player, index) => {
      const teamIndex = index % teamCount;
      const team = this.gameState.teams[teamIndex];
      
      player.teamId = team.id;
      team.members.push(player);
    });

    // Log team assignments
    this.gameState.teams.forEach(team => {
      console.log(`Team ${team.id}: ${team.members.length} members`);
    });

    this.broadcastGameState();
    return this.gameState.teams;
  }

  startGame() {
    if (this.gameState.teams.length === 0) {
      this.assignTeams();
    }

    // Safety check: ensure we have teams after assignment
    if (this.gameState.teams.length === 0) {
      throw new Error('Cannot start game - no teams available');
    }

    this.gameState.phase = GamePhase.IN_PROGRESS;
    this.gameState.isGameStarted = true;
    this.gameState.currentTurnTeamId = this.gameState.teams[0].id;
    
    // Set initial captain for the first team
    const firstTeam = this.gameState.teams[0];
    const captain = this.rotateCaptain(firstTeam.id);
    
    this.startTurnTimer();
    this.startGameTimer();
    
    this.broadcastGameState();
    this.io.emit(SOCKET_EVENTS.GAME_START, {
      gameState: this.gameState,
      board: this.board,
      captainId: captain?.id || null,
      captainName: captain?.nickname || 'Unknown'
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
    
    const nextTeamIndex = (currentTeamIndex + 1) % this.gameState.teams.length;
    this.gameState.currentTurnTeamId = this.gameState.teams[nextTeamIndex].id;
    
    if (nextTeamIndex === 0) {
      this.gameState.round++;
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
    if (this.gameState.round >= this.gameState.maxRounds) {
      this.endGame('rounds_completed');
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
        score: t.score,
        color: t.color,
        emoji: t.emoji
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