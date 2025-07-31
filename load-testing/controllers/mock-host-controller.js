/**
 * Mock Host Controller for Load Testing
 * Simulates host actions to control game progression during load tests
 * 
 * RECENT IMPROVEMENTS (2025-07-31):
 * - Enhanced game start timing to wait for better team distribution
 * - Configurable timing parameters for different load testing scenarios
 * - Intelligent wait periods to allow players to join teams before starting
 * - Multiple conditions for game start: minimum teams, player ratio, and time limits
 * - Prevents starting games too early when most players haven't joined teams yet
 */

const io = require('socket.io-client');
const { EventEmitter } = require('events');

class MockHostController extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      hostToken: options.hostToken || 'load-test-host-token',
      autoProgressGame: options.autoProgressGame !== false,
      gameProgressInterval: options.gameProgressInterval || 10000, // 10 seconds
      turnTimeout: options.turnTimeout || 30000, // 30 seconds
      enableMiniGames: options.enableMiniGames !== false,
      maxRounds: options.maxRounds || 10,
      // Game start timing parameters
      minTeamsWithMembers: options.minTeamsWithMembers || 3, // Minimum teams with members before starting
      minPlayerTeamRatio: options.minPlayerTeamRatio || 0.5, // 50% of players should be in teams (more lenient)
      teamJoinWaitTime: options.teamJoinWaitTime || 30000, // Wait 30s for team joining after min conditions met
      gameStartDelay: options.gameStartDelay || 10000, // Final delay before starting game
      maxWaitTime: options.maxWaitTime || 90000, // Maximum time to wait before forcing game start (90s)
      ...options
    };

    this.socket = null;
    this.gameState = null;
    this.isConnected = false;
    this.isActive = false;
    this.gameProgressTimer = null;
    this.turnTimer = null;
    this.gameStartTimer = null;
    this.gameStartWaitStarted = null;
    this.lastPlayerCount = 0;
    this.lastTeamStats = { teamsWithMembers: 0, playersInTeams: 0 };
    this.metrics = {
      actionsPerformed: 0,
      gamesControlled: 0,
      startTime: null,
      lastActionTime: null
    };
  }

  /**
   * Connect to server as host
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🎯 MockHost: Connecting to server...');
      
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket'],
        timeout: 10000,
        forceNew: true,
        auth: {
          hostToken: this.config.hostToken
        },
        extraHeaders: {
          'x-host-token': this.config.hostToken
        }
      });

      this.socket.on('connect', () => {
        console.log('🎯 MockHost: Connected to server');
        this.isConnected = true;
        this.metrics.startTime = Date.now();
        this.setupEventHandlers();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('🎯 MockHost: Connection failed:', error.message);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🎯 MockHost: Disconnected from server');
        this.isConnected = false;
        this.isActive = false;
        this.clearTimers();
        this.emit('disconnected');
      });
    });
  }

  /**
   * Setup event handlers for game state updates
   */
  setupEventHandlers() {
    this.socket.on('game_state_update', (gameState) => {
      this.gameState = gameState;
      this.handleGameStateUpdate(gameState);
    });

    this.socket.on('host_control_success', (data) => {
      console.log('🎯 MockHost: Host control success:', data.message);
      this.metrics.actionsPerformed++;
      this.metrics.lastActionTime = Date.now();
    });

    this.socket.on('error', (error) => {
      console.error('🎯 MockHost: Socket error:', error.message);
      // Don't emit error for host authorization issues, just log them
      if (error.message && error.message.includes('未授權')) {
        console.log('🎯 MockHost: Host authorization failed, continuing with limited functionality');
        return;
      }
      this.emit('error', error);
    });

    console.log('🎯 MockHost: Event handlers setup complete');
  }

  /**
   * Handle game state updates and trigger appropriate actions
   */
  handleGameStateUpdate(gameState) {
    if (!this.isActive) return;

    const phase = gameState.phase;
    const playerCount = Object.keys(gameState.players).length;
    const teamCount = gameState.teams.length;
    const teamsWithMembers = gameState.teams.filter(team => team.members.length > 0).length;

    this.emit('gameStateUpdate', {
      phase,
      playerCount,
      teamCount,
      teamsWithMembers,
      round: gameState.round || 0
    });

    // Auto-progress based on game state
    if (this.config.autoProgressGame) {
      this.handleAutoProgress(gameState);
    }
  }

  /**
   * Automatically progress the game based on current state
   */
  handleAutoProgress(gameState) {
    const phase = gameState.phase;
    const playerCount = Object.keys(gameState.players).length;
    const teamsWithMembers = gameState.teams.filter(team => team.members.length > 0);
    const playersInTeams = teamsWithMembers.reduce((total, team) => total + team.members.length, 0);
    const playerTeamRatio = playerCount > 0 ? playersInTeams / playerCount : 0;

    switch (phase) {
      case 'lobby':
        this.handleLobbyProgress(gameState, playerCount, teamsWithMembers, playersInTeams, playerTeamRatio);
        break;

      case 'in_progress':
        this.handleInProgressGame(gameState);
        break;

      case 'ended':
        console.log('🎯 MockHost: Game ended, resetting for next round');
        this.metrics.gamesControlled++;
        setTimeout(() => this.resetGame(), 5000);
        break;
    }
  }

  /**
   * Handle game progression in lobby phase with improved timing
   */
  handleLobbyProgress(gameState, playerCount, teamsWithMembers, playersInTeams, playerTeamRatio) {
    const currentTime = Date.now();
    const teamsWithMembersCount = teamsWithMembers.length;
    
    // Log current state for debugging
    if (playerCount !== this.lastPlayerCount || 
        teamsWithMembersCount !== this.lastTeamStats.teamsWithMembers ||
        playersInTeams !== this.lastTeamStats.playersInTeams) {
      
      console.log(`🎯 MockHost: Lobby state - ${playerCount} players total, ${playersInTeams} in teams (${Math.round(playerTeamRatio * 100)}%), ${teamsWithMembersCount} teams with members`);
      
      this.lastPlayerCount = playerCount;
      this.lastTeamStats = { teamsWithMembers: teamsWithMembersCount, playersInTeams };
    }

    // Check minimum requirements
    const hasMinPlayers = playerCount >= 4;
    const hasMinTeams = teamsWithMembersCount >= this.config.minTeamsWithMembers;
    const hasMinRatio = playerTeamRatio >= this.config.minPlayerTeamRatio;
    
    if (!hasMinPlayers) {
      // Clear any existing timer if we don't have minimum players
      if (this.gameStartTimer) {
        console.log('🎯 MockHost: Clearing game start timer - insufficient players');
        clearTimeout(this.gameStartTimer);
        this.gameStartTimer = null;
        this.gameStartWaitStarted = null;
      }
      return;
    }

    // Check if we should start the wait period
    if (hasMinTeams && hasMinRatio && !this.gameStartWaitStarted) {
      console.log(`🎯 MockHost: Minimum conditions met - starting ${this.config.teamJoinWaitTime}ms wait for more players to join teams`);
      this.gameStartWaitStarted = currentTime;
      
      // Set timer for team join wait time
      this.gameStartTimer = setTimeout(() => {
        this.attemptGameStart('wait_time_completed');
      }, this.config.teamJoinWaitTime);
      
      return;
    }

    // Check if we're in wait period and conditions have improved significantly
    if (this.gameStartWaitStarted && hasMinTeams && hasMinRatio) {
      const waitTime = currentTime - this.gameStartWaitStarted;
      
      // If we have excellent team distribution, start sooner
      if (teamsWithMembersCount >= 4 && playerTeamRatio >= 0.85 && waitTime >= 5000) {
        console.log(`🎯 MockHost: Excellent team distribution reached - starting game early`);
        this.attemptGameStart('excellent_distribution');
        return;
      }
    }

    // Force start after maximum wait time
    if (this.gameStartWaitStarted) {
      const totalWaitTime = currentTime - this.gameStartWaitStarted;
      
      if (totalWaitTime >= this.config.maxWaitTime) {
        console.log(`🎯 MockHost: Maximum wait time (${this.config.maxWaitTime}ms) reached - forcing game start`);
        this.attemptGameStart('max_wait_reached');
        return;
      }
    }
  }

  /**
   * Attempt to start the game with the given reason
   */
  attemptGameStart(reason) {
    // Clear any existing timer
    if (this.gameStartTimer) {
      clearTimeout(this.gameStartTimer);
      this.gameStartTimer = null;
    }
    
    const gameState = this.gameState;
    if (!gameState) return;
    
    const playerCount = Object.keys(gameState.players).length;
    const teamsWithMembers = gameState.teams.filter(team => team.members.length > 0);
    const playersInTeams = teamsWithMembers.reduce((total, team) => total + team.members.length, 0);
    const playerTeamRatio = playerCount > 0 ? playersInTeams / playerCount : 0;

    console.log(`🎯 MockHost: Starting game - Reason: ${reason}`);
    console.log(`🎯 MockHost: Final stats - ${playerCount} players, ${playersInTeams} in teams (${Math.round(playerTeamRatio * 100)}%), ${teamsWithMembers.length} teams active`);
    
    // Reset wait state
    this.gameStartWaitStarted = null;
    
    // Start game after a brief delay
    setTimeout(() => this.startGame(), this.config.gameStartDelay);
  }

  /**
   * Handle game progression during active play
   */
  handleInProgressGame(gameState) {
    const currentRound = gameState.round || 1;
    const maxRounds = this.config.maxRounds;
    
    // End game if we've reached max rounds
    if (currentRound >= maxRounds) {
      console.log(`🎯 MockHost: Reached max rounds (${maxRounds}), ending game`);
      setTimeout(() => this.endGame(), 1000);
      return;
    }

    // Clear existing timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    // Set turn timeout to keep game moving
    this.turnTimer = setTimeout(() => {
      console.log(`🎯 MockHost: Turn timeout reached, skipping turn (Round ${currentRound})`);
      this.skipTurn();
    }, this.config.turnTimeout);

    // Occasionally adjust scores to simulate mini-game results
    if (this.config.enableMiniGames && Math.random() < 0.3) {
      setTimeout(() => this.simulateMiniGameResults(gameState), 5000);
    }
  }

  /**
   * Simulate mini-game results by adjusting team scores
   */
  simulateMiniGameResults(gameState) {
    const teamsWithMembers = gameState.teams.filter(team => team.members.length > 0);
    if (teamsWithMembers.length === 0) return;

    // Pick a random team to give bonus points
    const randomTeam = teamsWithMembers[Math.floor(Math.random() * teamsWithMembers.length)];
    const bonusPoints = Math.floor(Math.random() * 50) + 10; // 10-60 points

    console.log(`🎯 MockHost: Simulating mini-game result - ${randomTeam.name || randomTeam.id} gets ${bonusPoints} points`);
    
    this.adjustScore(randomTeam.id, bonusPoints, 'Load test mini-game simulation');
  }

  /**
   * Start the host controller
   */
  start() {
    console.log('🎯 MockHost: Starting host controller');
    this.isActive = true;
    this.emit('started');
  }

  /**
   * Prepare for new phase - ensures clean state
   */
  prepareForNewPhase() {
    console.log('🎯 MockHost: Preparing for new phase...');
    
    // Clear all timers and reset state
    this.clearTimers();
    this.gameStartWaitStarted = null;
    this.lastPlayerCount = 0;
    this.lastTeamStats = { teamsWithMembers: 0, playersInTeams: 0 };
    
    // Reset the controller to active state if connected
    if (this.isConnected) {
      this.isActive = true;
    }
    
    console.log('🎯 MockHost: Ready for new phase');
  }

  /**
   * Stop the host controller
   */
  stop() {
    console.log('🎯 MockHost: Stopping host controller');
    this.isActive = false;
    this.clearTimers();
    
    if (this.socket && this.isConnected) {
      this.socket.disconnect();
    }
    
    this.emit('stopped');
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.gameProgressTimer) {
      clearTimeout(this.gameProgressTimer);
      this.gameProgressTimer = null;
    }
    
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    
    if (this.gameStartTimer) {
      clearTimeout(this.gameStartTimer);
      this.gameStartTimer = null;
    }
  }

  // Host Control Actions

  /**
   * Start the game
   */
  startGame() {
    if (!this.isConnected) return;
    
    console.log('🎯 MockHost: Starting game');
    this.socket.emit('game_start');
  }

  /**
   * Skip current turn
   */
  skipTurn() {
    if (!this.isConnected) return;
    
    console.log('🎯 MockHost: Skipping turn');
    this.sendHostControl({ action: 'skip_turn' });
  }

  /**
   * End the game
   */
  endGame() {
    if (!this.isConnected) return;
    
    console.log('🎯 MockHost: Ending game');
    this.sendHostControl({ action: 'end_game' });
  }

  /**
   * Reset the game
   */
  resetGame() {
    if (!this.isConnected) return;
    
    console.log('🎯 MockHost: Resetting game');
    this.sendHostControl({ action: 'reset_game' });
  }

  /**
   * Reset game state for phase transition (with proper coordination)
   */
  async resetGameForPhase() {
    if (!this.isConnected) {
      throw new Error('Mock host not connected');
    }

    return new Promise((resolve, reject) => {
      console.log('🎯 MockHost: Resetting game for phase transition...');
      
      // Clear any existing timers to prevent conflicts
      this.clearTimers();
      this.gameStartWaitStarted = null;
      this.lastPlayerCount = 0;
      this.lastTeamStats = { teamsWithMembers: 0, playersInTeams: 0 };
      
      let isResolved = false;
      
      // Set up temporary listener for reset confirmation
      const resetHandler = (gameState) => {
        if (isResolved) return;
        
        if (gameState && gameState.phase === 'lobby') {
          console.log('🎯 MockHost: Game successfully reset to lobby state');
          isResolved = true;
          this.socket.off('game_state_update', resetHandler);
          clearTimeout(timeout);
          resolve();
        }
      };
      
      // Listen for game state update
      this.socket.on('game_state_update', resetHandler);
      
      // Set timeout in case reset doesn't complete
      const timeout = setTimeout(() => {
        if (isResolved) return;
        
        isResolved = true;
        this.socket.off('game_state_update', resetHandler);
        reject(new Error('Timeout waiting for game reset'));
      }, 10000);
      
      // Send reset command
      this.sendHostControl({ action: 'reset_game' });
    });
  }

  /**
   * Adjust team score
   */
  adjustScore(teamId, points, reason = 'Load test adjustment') {
    if (!this.isConnected) return;
    
    console.log(`🎯 MockHost: Adjusting score for ${teamId}: ${points} points`);
    this.sendHostControl({
      action: 'adjust_score',
      payload: { teamId, points, reason }
    });
  }

  /**
   * Update turn time limit
   */
  updateTurnTime(timeInSeconds) {
    if (!this.isConnected) return;
    
    console.log(`🎯 MockHost: Updating turn time to ${timeInSeconds}s`);
    this.sendHostControl({
      action: 'update_turn_time',
      payload: { time: timeInSeconds * 1000 }
    });
  }

  /**
   * Update maximum rounds
   */
  updateMaxRounds(rounds) {
    if (!this.isConnected) return;
    
    console.log(`🎯 MockHost: Updating max rounds to ${rounds}`);
    this.sendHostControl({
      action: 'update_max_rounds',
      payload: { rounds }
    });
  }

  /**
   * Pause the game
   */
  pauseGame() {
    if (!this.isConnected) return;
    
    console.log('🎯 MockHost: Pausing game');
    this.sendHostControl({ action: 'pause_game' });
  }

  /**
   * Resume the game
   */
  resumeGame() {
    if (!this.isConnected) return;
    
    console.log('🎯 MockHost: Resuming game');
    this.sendHostControl({ action: 'resume_game' });
  }

  /**
   * Send host control command with token
   */
  sendHostControl(data) {
    if (!this.socket || !this.isConnected) {
      console.error('🎯 MockHost: Cannot send command - not connected');
      return;
    }
    
    const requestData = { 
      ...data,
      token: this.config.hostToken
    };
    
    this.socket.emit('host_control', requestData);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const runtime = this.metrics.startTime ? Date.now() - this.metrics.startTime : 0;
    
    return {
      ...this.metrics,
      runtime: Math.floor(runtime / 1000), // in seconds
      actionsPerMinute: runtime > 0 ? Math.round((this.metrics.actionsPerformed * 60000) / runtime) : 0,
      isActive: this.isActive,
      isConnected: this.isConnected,
      currentGameState: this.gameState ? {
        phase: this.gameState.phase,
        playerCount: Object.keys(this.gameState.players).length,
        teamCount: this.gameState.teams.length,
        round: this.gameState.round || 0
      } : null
    };
  }

  /**
   * Generate status report
   */
  getStatusReport() {
    const metrics = this.getMetrics();
    
    return {
      title: '🎯 Mock Host Controller Status',
      status: this.isActive && this.isConnected ? 'ACTIVE' : 'INACTIVE',
      metrics,
      gameStartState: {
        waitStarted: this.gameStartWaitStarted,
        waitTimeRemaining: this.gameStartWaitStarted 
          ? Math.max(0, this.config.teamJoinWaitTime - (Date.now() - this.gameStartWaitStarted))
          : null,
        maxWaitTimeRemaining: this.gameStartWaitStarted
          ? Math.max(0, this.config.maxWaitTime - (Date.now() - this.gameStartWaitStarted))
          : null
      },
      config: {
        serverUrl: this.config.serverUrl,
        autoProgressGame: this.config.autoProgressGame,
        gameProgressInterval: this.config.gameProgressInterval,
        turnTimeout: this.config.turnTimeout,
        maxRounds: this.config.maxRounds,
        enableMiniGames: this.config.enableMiniGames,
        // Game start timing parameters
        minTeamsWithMembers: this.config.minTeamsWithMembers,
        minPlayerTeamRatio: this.config.minPlayerTeamRatio,
        teamJoinWaitTime: this.config.teamJoinWaitTime,
        gameStartDelay: this.config.gameStartDelay,
        maxWaitTime: this.config.maxWaitTime
      }
    };
  }
}

module.exports = MockHostController;