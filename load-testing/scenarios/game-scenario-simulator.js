#!/usr/bin/env node

/**
 * Game Scenario Simulator
 * Simulates realistic Monopoly game scenarios including team formation,
 * turn-based gameplay, mini-games, and various player behaviors
 */

const { io } = require('socket.io-client');
const EventEmitter = require('events');

class GameScenarioSimulator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      scenario: options.scenario || 'full_game',
      playerCount: options.playerCount || 60,
      teamDistribution: options.teamDistribution || 'balanced', // balanced, random, uneven
      gameplayStyle: options.gameplayStyle || 'realistic', // realistic, aggressive, passive
      mobileMix: options.mobileMix || 0.7, // 70% mobile users
      ...options
    };
    
    this.players = new Map();
    this.teams = ['team_A', 'team_B', 'team_C', 'team_D', 'team_E', 'team_F'];
    this.gameState = {
      phase: 'waiting',
      currentTurn: null,
      miniGameActive: null,
      scores: {}
    };
    
    this.metrics = {
      scenarioStart: null,
      scenarioEnd: null,
      gameActions: {
        connections: 0,
        teamJoins: 0,
        diceRolls: 0,
        miniGameParticipations: 0,
        miniGameSubmissions: 0,
        disconnections: 0,
        reconnections: 0
      },
      performance: {
        connectionTimes: [],
        teamJoinTimes: [],
        gameActionTimes: [],
        miniGameResponseTimes: []
      },
      errors: []
    };
    
    // Scenario definitions
    this.scenarios = {
      connection_storm: {
        description: 'Rapid simultaneous connections to test connection handling',
        duration: 120000, // 2 minutes
        phases: ['mass_connect', 'basic_activity', 'gradual_disconnect']
      },
      
      team_formation: {
        description: 'Realistic team formation with various joining patterns',
        duration: 300000, // 5 minutes
        phases: ['connect', 'team_selection', 'team_balancing', 'game_preparation']
      },
      
      full_game: {
        description: 'Complete game simulation with all mechanics',
        duration: 1800000, // 30 minutes
        phases: ['setup', 'gameplay', 'mini_games', 'endgame']
      },
      
      mini_game_stress: {
        description: 'Intensive mini-game testing with concurrent submissions',
        duration: 600000, // 10 minutes
        phases: ['setup', 'mini_game_rounds', 'cleanup']
      },
      
      mobile_heavy: {
        description: 'Mobile-centric scenario with connection instability',
        duration: 900000, // 15 minutes
        phases: ['mobile_connect', 'unstable_connections', 'recovery_test']
      }
    };
    
    // Player behavior patterns
    this.behaviorPatterns = {
      realistic: {
        actionDelay: [3000, 15000], // 3-15 seconds between actions
        miniGameResponse: [5000, 25000], // 5-25 seconds to respond
        disconnectionChance: 0.02, // 2% chance per minute
        reconnectionChance: 0.8, // 80% chance to reconnect
        teamLoyalty: 0.9 // 90% stay with first team
      },
      
      aggressive: {
        actionDelay: [1000, 5000], // 1-5 seconds
        miniGameResponse: [2000, 8000], // 2-8 seconds
        disconnectionChance: 0.01, // 1% chance
        reconnectionChance: 0.95, // 95% reconnect
        teamLoyalty: 0.7 // 70% stay with team
      },
      
      passive: {
        actionDelay: [10000, 30000], // 10-30 seconds
        miniGameResponse: [15000, 45000], // 15-45 seconds
        disconnectionChance: 0.05, // 5% chance
        reconnectionChance: 0.6, // 60% reconnect
        teamLoyalty: 0.95 // 95% stay
      }
    };
    
    this.currentScenario = this.scenarios[this.config.scenario];
    this.behaviorConfig = this.behaviorPatterns[this.config.gameplayStyle];
  }
  
  /**
   * Start scenario simulation
   */
  async start() {
    console.log(`🎮 Starting Game Scenario Simulation: ${this.config.scenario}`);
    console.log(`📊 Players: ${this.config.playerCount} | Mobile Mix: ${(this.config.mobileMix * 100)}%`);
    console.log(`🎯 Scenario: ${this.currentScenario.description}`);
    console.log(`⏱️  Duration: ${this.currentScenario.duration / 1000}s\n`);
    
    this.metrics.scenarioStart = Date.now();
    
    // Execute scenario phases
    for (const phase of this.currentScenario.phases) {
      console.log(`📍 Executing phase: ${phase}`);
      await this.executePhase(phase);
      console.log(`✅ Phase ${phase} completed\n`);
    }
    
    this.metrics.scenarioEnd = Date.now();
    console.log('🎯 Scenario simulation completed');
    
    this.generateScenarioReport();
  }
  
  /**
   * Execute a specific phase of the scenario
   */
  async executePhase(phase) {
    switch (phase) {
      case 'mass_connect':
      case 'connect':
        await this.phaseConnect();
        break;
      
      case 'setup':
        await this.phaseSetup();
        break;
      
      case 'basic_activity':
        await this.phaseBasicActivity();
        break;
      
      case 'team_selection':
      case 'team_balancing':
        await this.phaseTeamFormation();
        break;
      
      case 'game_preparation':
        await this.phaseGamePreparation();
        break;
      
      case 'gameplay':
        await this.phaseGameplay();
        break;
      
      case 'mini_games':
      case 'mini_game_rounds':
        await this.phaseMiniGames();
        break;
      
      case 'mobile_connect':
        await this.phaseMobileConnect();
        break;
      
      case 'unstable_connections':
        await this.phaseUnstableConnections();
        break;
      
      case 'recovery_test':
        await this.phaseRecoveryTest();
        break;
      
      case 'endgame':
      case 'cleanup':
        await this.phaseCleanup();
        break;
      
      case 'gradual_disconnect':
        await this.phaseGradualDisconnect();
        break;
      
      default:
        console.log(`⚠️  Unknown phase: ${phase}`);
    }
  }
  
  /**
   * Phase: Connect players to the game
   */
  async phaseConnect() {
    console.log('🔗 Connecting players...');
    
    const connectBatchSize = Math.max(1, Math.floor(this.config.playerCount / 8));
    const batchDelay = 2000; // 2 seconds between batches
    
    for (let i = 0; i < this.config.playerCount; i += connectBatchSize) {
      const batchSize = Math.min(connectBatchSize, this.config.playerCount - i);
      
      // Connect batch of players
      const promises = [];
      for (let j = 0; j < batchSize; j++) {
        const playerId = i + j;
        promises.push(this.createPlayer(playerId));
      }
      
      await Promise.allSettled(promises);
      
      console.log(`📊 Connected ${Math.min(i + batchSize, this.config.playerCount)}/${this.config.playerCount} players`);
      
      if (i + batchSize < this.config.playerCount) {
        await this.sleep(batchDelay);
      }
    }
    
    console.log('✅ All players connected');
  }
  
  /**
   * Phase: Setup and initial game join
   */
  async phaseSetup() {
    console.log('⚙️  Setting up game session...');
    
    // Connect all players first
    await this.phaseConnect();
    
    // Wait for all connections to stabilize
    await this.sleep(3000);
    
    // Players join the game
    const joinPromises = [];
    for (const [playerId, player] of this.players) {
      if (player.connected) {
        joinPromises.push(this.joinGame(player));
      }
    }
    
    await Promise.allSettled(joinPromises);
    console.log('✅ Players joined game');
  }
  
  /**
   * Phase: Basic activity and presence
   */
  async phaseBasicActivity() {
    console.log('🎯 Simulating basic player activity...');
    
    const activityDuration = 60000; // 1 minute of activity
    const startTime = Date.now();
    
    // Start random activity for all connected players
    const activityPromises = [];
    for (const [playerId, player] of this.players) {
      if (player.connected) {
        activityPromises.push(this.simulateBasicActivity(player, activityDuration));
      }
    }
    
    await Promise.allSettled(activityPromises);
    console.log('✅ Basic activity simulation completed');
  }
  
  /**
   * Phase: Team formation with realistic patterns
   */
  async phaseTeamFormation() {
    console.log('👥 Simulating team formation...');
    
    const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected);
    
    if (this.config.teamDistribution === 'balanced') {
      // Distribute players evenly across teams
      const playersPerTeam = Math.ceil(connectedPlayers.length / this.teams.length);
      
      for (let i = 0; i < connectedPlayers.length; i++) {
        const player = connectedPlayers[i];
        const teamIndex = Math.floor(i / playersPerTeam) % this.teams.length;
        const teamId = this.teams[teamIndex];
        
        await this.joinTeam(player, teamId);
        
        // Add realistic delay between team joins
        await this.sleep(this.randomDelay(500, 2000));
      }
    } else if (this.config.teamDistribution === 'random') {
      // Random team distribution
      for (const player of connectedPlayers) {
        const randomTeam = this.teams[Math.floor(Math.random() * this.teams.length)];
        await this.joinTeam(player, randomTeam);
        await this.sleep(this.randomDelay(200, 1500));
      }
    } else if (this.config.teamDistribution === 'uneven') {
      // Create uneven distribution (some teams more popular)
      const popularTeams = this.teams.slice(0, 3); // First 3 teams are popular
      
      for (const player of connectedPlayers) {
        const usePopularTeam = Math.random() < 0.7; // 70% join popular teams
        const teamId = usePopularTeam
          ? popularTeams[Math.floor(Math.random() * popularTeams.length)]
          : this.teams[Math.floor(Math.random() * this.teams.length)];
        
        await this.joinTeam(player, teamId);
        await this.sleep(this.randomDelay(300, 2000));
      }
    }
    
    console.log('✅ Team formation completed');
    this.logTeamDistribution();
  }
  
  /**
   * Phase: Game preparation and readiness
   */
  async phaseGamePreparation() {
    console.log('🎲 Preparing for gameplay...');
    
    // Simulate players getting ready
    const readyPromises = [];
    for (const [playerId, player] of this.players) {
      if (player.connected && player.teamId) {
        readyPromises.push(this.simulatePlayerReady(player));
      }
    }
    
    await Promise.allSettled(readyPromises);
    
    // Wait for game to start
    await this.sleep(5000);
    
    console.log('✅ Game preparation completed');
  }
  
  /**
   * Phase: Full gameplay simulation
   */
  async phaseGameplay() {
    console.log('🎮 Simulating full gameplay...');
    
    const gameplayDuration = 600000; // 10 minutes of gameplay
    const turnDuration = 30000; // 30 seconds per turn simulation
    const numTurns = gameplayDuration / turnDuration;
    
    for (let turn = 0; turn < numTurns; turn++) {
      console.log(`🎯 Simulating turn ${turn + 1}/${numTurns}`);
      
      // Simulate turn-based actions
      await this.simulateTurn();
      
      // Random events and interactions
      await this.simulateRandomEvents();
      
      await this.sleep(turnDuration / 4); // Quarter of turn duration for processing
    }
    
    console.log('✅ Gameplay simulation completed');
  }
  
  /**
   * Phase: Mini-game intensive testing
   */
  async phaseMiniGames() {
    console.log('🎯 Simulating intensive mini-game activity...');
    
    const miniGameRounds = 8;
    
    for (let round = 0; round < miniGameRounds; round++) {
      console.log(`🎮 Mini-game round ${round + 1}/${miniGameRounds}`);
      
      // Start mini-game for random teams
      const activeTeams = this.getTeamsWithPlayers();
      const selectedTeams = this.shuffleArray(activeTeams).slice(0, Math.min(3, activeTeams.length));
      
      await this.simulateMiniGameRound(selectedTeams);
      
      // Break between rounds
      await this.sleep(15000);
    }
    
    console.log('✅ Mini-game simulation completed');
  }
  
  /**
   * Phase: Mobile-specific connection testing
   */
  async phaseMobileConnect() {
    console.log('📱 Simulating mobile-heavy connections...');
    
    // Connect players with mobile-specific patterns
    const mobilePlayerCount = Math.floor(this.config.playerCount * this.config.mobileMix);
    
    // Simulate slower, more variable mobile connections
    for (let i = 0; i < this.config.playerCount; i++) {
      const isMobile = i < mobilePlayerCount;
      const connectionDelay = isMobile 
        ? this.randomDelay(2000, 8000) // Mobile: 2-8 seconds
        : this.randomDelay(500, 2000);  // Desktop: 0.5-2 seconds
      
      await this.sleep(connectionDelay);
      await this.createPlayer(i, { forceMobile: isMobile });
      
      console.log(`📱 Connected ${i + 1}/${this.config.playerCount} players (${isMobile ? 'Mobile' : 'Desktop'})`);
    }
    
    console.log('✅ Mobile connection simulation completed');
  }
  
  /**
   * Phase: Connection stability testing
   */
  async phaseUnstableConnections() {
    console.log('📶 Simulating unstable connections...');
    
    const instabilityDuration = 300000; // 5 minutes
    const startTime = Date.now();
    
    // Simulate connection drops and recoveries
    const instabilityInterval = setInterval(() => {
      this.simulateConnectionInstability();
    }, 10000); // Every 10 seconds
    
    // Keep some basic activity going
    const activityPromises = [];
    for (const [playerId, player] of this.players) {
      if (player.connected) {
        activityPromises.push(this.simulateBasicActivity(player, instabilityDuration));
      }
    }
    
    await this.sleep(instabilityDuration);
    clearInterval(instabilityInterval);
    
    console.log('✅ Connection instability simulation completed');
  }
  
  /**
   * Phase: Recovery and resilience testing
   */
  async phaseRecoveryTest() {
    console.log('🔄 Testing connection recovery...');
    
    // Simulate network interruption
    console.log('📡 Simulating network interruption...');
    
    // Disconnect random players
    const playersToDisconnect = Array.from(this.players.values())
      .filter(p => p.connected)
      .slice(0, Math.floor(this.players.size * 0.3)); // 30% of players
    
    for (const player of playersToDisconnect) {
      this.disconnectPlayer(player);
    }
    
    // Wait for recovery period
    await this.sleep(30000);
    
    // Simulate reconnections
    console.log('🔄 Simulating reconnections...');
    for (const player of playersToDisconnect) {
      if (Math.random() < this.behaviorConfig.reconnectionChance) {
        await this.reconnectPlayer(player);
        await this.sleep(this.randomDelay(1000, 5000));
      }
    }
    
    console.log('✅ Recovery testing completed');
  }
  
  /**
   * Phase: Cleanup and graceful shutdown
   */
  async phaseCleanup() {
    console.log('🧹 Cleaning up scenario...');
    
    // Gradual disconnection
    const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected);
    const disconnectBatchSize = Math.max(1, Math.floor(connectedPlayers.length / 5));
    
    for (let i = 0; i < connectedPlayers.length; i += disconnectBatchSize) {
      const batch = connectedPlayers.slice(i, i + disconnectBatchSize);
      
      for (const player of batch) {
        this.disconnectPlayer(player);
      }
      
      await this.sleep(2000); // 2 second delay between batches
    }
    
    console.log('✅ Cleanup completed');
  }
  
  /**
   * Phase: Gradual disconnection
   */
  async phaseGradualDisconnect() {
    console.log('👋 Simulating gradual disconnection...');
    
    const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected);
    const disconnectInterval = 60000 / connectedPlayers.length; // Spread over 1 minute
    
    for (const player of connectedPlayers) {
      this.disconnectPlayer(player);
      await this.sleep(disconnectInterval);
    }
    
    console.log('✅ Gradual disconnection completed');
  }
  
  /**
   * Create and configure a player
   */
  async createPlayer(playerId, options = {}) {
    return new Promise((resolve) => {
      const playerName = this.generatePlayerName(playerId);
      const department = this.generateDepartment(playerId);
      const isMobile = options.forceMobile !== undefined 
        ? options.forceMobile 
        : Math.random() < this.config.mobileMix;
      
      const socketOptions = {
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['websocket', 'polling']
      };
      
      if (isMobile) {
        socketOptions.extraHeaders = {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        };
      }
      
      const connectStart = Date.now();
      const socket = io(this.config.serverUrl, socketOptions);
      
      const player = {
        id: playerId,
        socket,
        name: playerName,
        department,
        isMobile,
        connected: false,
        teamId: null,
        lastActivity: Date.now(),
        connectionTime: null,
        gameJoined: false,
        metrics: {
          connectionAttempts: 1,
          gameActions: 0,
          miniGameParticipations: 0
        }
      };
      
      this.setupPlayerEventHandlers(player, connectStart, resolve);
      this.players.set(playerId, player);
    });
  }
  
  /**
   * Set up event handlers for a player
   */
  setupPlayerEventHandlers(player, connectStart, resolve) {
    const { socket } = player;
    
    socket.on('connect', () => {
      player.connected = true;
      player.connectionTime = Date.now() - connectStart;
      this.metrics.gameActions.connections++;
      this.metrics.performance.connectionTimes.push(player.connectionTime);
      
      resolve();
    });
    
    socket.on('disconnect', (reason) => {
      player.connected = false;
      this.metrics.gameActions.disconnections++;
    });
    
    socket.on('connect_error', (error) => {
      this.metrics.errors.push({
        type: 'connection_error',
        player: player.id,
        error: error.message,
        timestamp: Date.now()
      });
      resolve(); // Continue even on error
    });
    
    socket.on('join_success', (data) => {
      player.gameJoined = true;
    });
    
    socket.on('team_joined', (data) => {
      player.teamId = data.team?.id;
      this.metrics.gameActions.teamJoins++;
    });
    
    socket.on('mini_game_start', (data) => {
      player.metrics.miniGameParticipations++;
      this.metrics.gameActions.miniGameParticipations++;
      
      // Respond to mini-game with delay
      setTimeout(() => {
        this.submitMiniGameResponse(player, data);
      }, this.randomDelay(...this.behaviorConfig.miniGameResponse));
    });
    
    socket.on('error', (error) => {
      this.metrics.errors.push({
        type: 'game_error',
        player: player.id,
        error: error.message,
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Join game for a player
   */
  async joinGame(player) {
    if (!player.connected || player.gameJoined) return;
    
    const joinData = {
      nickname: player.name,
      department: player.department
    };
    
    player.socket.emit('player_join', joinData);
    player.metrics.gameActions++;
  }
  
  /**
   * Join team for a player
   */
  async joinTeam(player, teamId) {
    if (!player.connected || !player.gameJoined || player.teamId) return;
    
    const joinStart = Date.now();
    
    player.socket.emit('team_join', { teamId });
    player.metrics.gameActions++;
    
    // Record team join time (will be updated when response received)
    setTimeout(() => {
      if (player.teamId === teamId) {
        this.metrics.performance.teamJoinTimes.push(Date.now() - joinStart);
      }
    }, 5000);
  }
  
  /**
   * Simulate basic player activity
   */
  async simulateBasicActivity(player, duration) {
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime && player.connected) {
      // Random activity
      const activity = Math.random();
      
      if (activity < 0.1) {
        // Send heartbeat
        player.socket.emit('ping', Date.now());
      } else if (activity < 0.05 && player.teamId) {
        // Attempt dice roll (might not be player's turn)
        this.attemptDiceRoll(player);
      }
      
      // Wait before next activity
      await this.sleep(this.randomDelay(...this.behaviorConfig.actionDelay));
    }
  }
  
  /**
   * Simulate a game turn
   */
  async simulateTurn() {
    const teamsWithPlayers = this.getTeamsWithPlayers();
    if (teamsWithPlayers.length === 0) return;
    
    // Pick random team for turn
    const currentTeam = teamsWithPlayers[Math.floor(Math.random() * teamsWithPlayers.length)];
    const teamPlayers = Array.from(this.players.values())
      .filter(p => p.connected && p.teamId === currentTeam);
    
    if (teamPlayers.length === 0) return;
    
    // Random player from team attempts dice roll
    const activePlayer = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
    await this.attemptDiceRoll(activePlayer);
    
    // Simulate turn processing time
    await this.sleep(5000);
  }
  
  /**
   * Simulate random game events
   */
  async simulateRandomEvents() {
    const eventChance = Math.random();
    
    if (eventChance < 0.3) {
      // 30% chance of mini-game
      const teams = this.getTeamsWithPlayers();
      if (teams.length > 0) {
        const randomTeam = teams[Math.floor(Math.random() * teams.length)];
        await this.simulateMiniGameForTeam(randomTeam);
      }
    }
  }
  
  /**
   * Simulate mini-game round
   */
  async simulateMiniGameRound(teams) {
    console.log(`🎯 Starting mini-game for teams: ${teams.join(', ')}`);
    
    const miniGamePromises = teams.map(teamId => 
      this.simulateMiniGameForTeam(teamId)
    );
    
    await Promise.allSettled(miniGamePromises);
  }
  
  /**
   * Simulate mini-game for a specific team
   */
  async simulateMiniGameForTeam(teamId) {
    const teamPlayers = Array.from(this.players.values())
      .filter(p => p.connected && p.teamId === teamId);
    
    if (teamPlayers.length === 0) return;
    
    // Simulate mini-game start
    teamPlayers.forEach(player => {
      player.socket.emit('mini_game_ready', { teamId });
    });
    
    // Wait for mini-game processing
    await this.sleep(this.randomDelay(10000, 30000));
    
    // Random team captain submits response
    const captain = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
    await this.submitMiniGameResponse(captain, { teamId });
  }
  
  /**
   * Submit mini-game response
   */
  async submitMiniGameResponse(player, gameData) {
    if (!player.connected || !player.teamId) return;
    
    const responses = [
      { answer: 'A' },
      { answer: 'B' },
      { answer: 'C' },
      { answer: true },
      { answer: false },
      { matches: [1, 2, 3] },
      { selection: 'option1' }
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    const submissionStart = Date.now();
    
    player.socket.emit('mini_game_submit', {
      teamId: player.teamId,
      playerId: player.socket.id,
      ...response
    });
    
    this.metrics.gameActions.miniGameSubmissions++;
    this.metrics.performance.miniGameResponseTimes.push(Date.now() - submissionStart);
  }
  
  /**
   * Attempt dice roll
   */
  async attemptDiceRoll(player) {
    if (!player.connected || !player.teamId) return;
    
    const rollStart = Date.now();
    
    player.socket.emit('dice_roll', {
      teamId: player.teamId,
      playerId: player.socket.id
    });
    
    this.metrics.gameActions.diceRolls++;
    this.metrics.performance.gameActionTimes.push(Date.now() - rollStart);
  }
  
  /**
   * Simulate player ready state
   */
  async simulatePlayerReady(player) {
    // Random delay before ready
    await this.sleep(this.randomDelay(2000, 8000));
    
    // Player indicates readiness (if such mechanism exists)
    player.lastActivity = Date.now();
  }
  
  /**
   * Simulate connection instability
   */
  simulateConnectionInstability() {
    const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected);
    const instabilityCount = Math.floor(connectedPlayers.length * 0.05); // 5% of players
    
    for (let i = 0; i < instabilityCount; i++) {
      const randomPlayer = connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)];
      
      if (Math.random() < this.behaviorConfig.disconnectionChance * 10) { // Amplified for simulation
        this.disconnectPlayer(randomPlayer);
        
        // Schedule reconnection
        setTimeout(() => {
          if (Math.random() < this.behaviorConfig.reconnectionChance) {
            this.reconnectPlayer(randomPlayer);
          }
        }, this.randomDelay(5000, 20000));
      }
    }
  }
  
  /**
   * Disconnect a player
   */
  disconnectPlayer(player) {
    if (player.connected && player.socket) {
      player.socket.disconnect();
      player.connected = false;
    }
  }
  
  /**
   * Reconnect a player
   */
  async reconnectPlayer(player) {
    if (player.connected) return;
    
    // Create new connection
    await this.createPlayer(player.id, { 
      forceMobile: player.isMobile 
    });
    
    this.metrics.gameActions.reconnections++;
    
    // Rejoin game and team if previously joined
    if (player.gameJoined) {
      await this.sleep(1000);
      await this.joinGame(player);
      
      if (player.teamId) {
        await this.sleep(1000);
        await this.joinTeam(player, player.teamId);
      }
    }
  }
  
  /**
   * Get teams that have players
   */
  getTeamsWithPlayers() {
    const teamsWithPlayers = new Set();
    
    for (const player of this.players.values()) {
      if (player.connected && player.teamId) {
        teamsWithPlayers.add(player.teamId);
      }
    }
    
    return Array.from(teamsWithPlayers);
  }
  
  /**
   * Log current team distribution
   */
  logTeamDistribution() {
    const teamCounts = {};
    
    for (const teamId of this.teams) {
      teamCounts[teamId] = 0;
    }
    
    for (const player of this.players.values()) {
      if (player.teamId) {
        teamCounts[player.teamId]++;
      }
    }
    
    console.log('👥 Team Distribution:');
    Object.entries(teamCounts).forEach(([teamId, count]) => {
      console.log(`   ${teamId}: ${count} players`);
    });
  }
  
  /**
   * Generate scenario report
   */
  generateScenarioReport() {
    console.log('\n📊 SCENARIO SIMULATION REPORT');
    console.log('=============================\n');
    
    const duration = this.metrics.scenarioEnd - this.metrics.scenarioStart;
    const connectedCount = Array.from(this.players.values()).filter(p => p.connected).length;
    
    console.log('📈 METRICS SUMMARY:');
    console.log(`Duration: ${Math.floor(duration / 1000)}s`);
    console.log(`Players Created: ${this.players.size}`);
    console.log(`Currently Connected: ${connectedCount}`);
    console.log(`Connections: ${this.metrics.gameActions.connections}`);
    console.log(`Team Joins: ${this.metrics.gameActions.teamJoins}`);
    console.log(`Dice Rolls: ${this.metrics.gameActions.diceRolls}`);
    console.log(`Mini-game Participations: ${this.metrics.gameActions.miniGameParticipations}`);
    console.log(`Mini-game Submissions: ${this.metrics.gameActions.miniGameSubmissions}`);
    console.log(`Disconnections: ${this.metrics.gameActions.disconnections}`);
    console.log(`Reconnections: ${this.metrics.gameActions.reconnections}`);
    console.log(`Errors: ${this.metrics.errors.length}`);
    
    if (this.metrics.performance.connectionTimes.length > 0) {
      const avgConnTime = this.metrics.performance.connectionTimes.reduce((a, b) => a + b, 0) / 
                          this.metrics.performance.connectionTimes.length;
      console.log(`\n⚡ PERFORMANCE:`)
      console.log(`Average Connection Time: ${Math.floor(avgConnTime)}ms`);
    }
    
    if (this.metrics.errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      const errorCounts = {};
      this.metrics.errors.forEach(error => {
        errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
      });
      
      Object.entries(errorCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    
    this.logTeamDistribution();
  }
  
  // Utility methods
  generatePlayerName(playerId) {
    const names = ['小明', '小華', '小美', '小強', '小芳', '小王', '小李', '小張', '小陳', '小林'];
    const baseName = names[playerId % names.length];
    return `${baseName}_${String(playerId).padStart(3, '0')}`;
  }
  
  generateDepartment(playerId) {
    const departments = ['資訊部', '行銷部', '業務部', '財務部', '人事部', '研發部'];
    return departments[playerId % departments.length];
  }
  
  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  shuffleArray(array) {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GameScenarioSimulator;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (['playerCount'].includes(key)) {
        config[key] = parseInt(value);
      } else if (['mobileMix'].includes(key)) {
        config[key] = parseFloat(value);
      } else {
        config[key] = value;
      }
    }
  }
  
  const simulator = new GameScenarioSimulator(config);
  
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, stopping simulation...');
    process.exit(0);
  });
  
  simulator.start().catch(console.error);
}