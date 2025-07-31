#!/usr/bin/env node

/**
 * Socket.IO Load Testing Script for Dept-Monopoly
 * Simulates realistic player behavior patterns
 */

const { io } = require('socket.io-client');
const EventEmitter = require('events');

class LoadTester extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      maxPlayers: options.maxPlayers || 120,
      rampUpTime: options.rampUpTime || 30000, // 30 seconds
      testDuration: options.testDuration || 300000, // 5 minutes
      playerBehavior: options.playerBehavior || 'realistic',
      reportInterval: options.reportInterval || 5000, // 5 seconds
      ...options
    };
    
    this.players = new Map();
    this.teams = ['team_A', 'team_B', 'team_C', 'team_D', 'team_E', 'team_F'];
    this.metrics = {
      connectionsAttempted: 0,
      connectionsSuccessful: 0,
      connectionsFailed: 0,
      messagessent: 0,
      messagesReceived: 0,
      errors: [],
      latencies: [],
      gameActions: {
        joins: 0,
        teamJoins: 0,
        diceRolls: 0,
        miniGameSubmissions: 0
      }
    };
    
    this.startTime = Date.now();
    this.isRunning = false;
    
    // Realistic player names and departments
    this.playerNames = [
      '小明', '小華', '小美', '小強', '小芳', '小王', '小李', '小張',
      '小陳', '小林', '小黃', '小劉', '小吳', '小蔡', '小許', '小鄭',
      '小謝', '小洪', '小郭', '小馬', '小孫', '小梁', '小潘', '小羅'
    ];
    
    this.departments = [
      '資訊部', '行銷部', '業務部', '財務部', '人事部', '研發部',
      '企劃部', '客服部', '法務部', '採購部', '品管部', '生產部'
    ];
  }
  
  /**
   * Start the load test
   */
  async start() {
    console.log(`🚀 Starting load test with ${this.config.maxPlayers} players`);
    console.log(`📊 Target server: ${this.config.serverUrl}`);
    console.log(`⏱️  Ramp-up time: ${this.config.rampUpTime}ms`);
    console.log(`🕐 Test duration: ${this.config.testDuration}ms`);
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    // Start periodic reporting
    this.reportingInterval = setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);
    
    // Ramp up players gradually
    await this.rampUpPlayers();
    
    // Run test for specified duration
    console.log(`⚡ All players connected. Running test for ${this.config.testDuration}ms...`);
    
    setTimeout(() => {
      this.stop();
    }, this.config.testDuration);
  }
  
  /**
   * Gradually connect players to avoid connection storms
   */
  async rampUpPlayers() {
    const playersPerBatch = Math.max(1, Math.floor(this.config.maxPlayers / 10));
    const batchInterval = this.config.rampUpTime / (this.config.maxPlayers / playersPerBatch);
    
    console.log(`📈 Ramping up ${playersPerBatch} players every ${batchInterval.toFixed(0)}ms`);
    
    for (let i = 0; i < this.config.maxPlayers; i += playersPerBatch) {
      const batchSize = Math.min(playersPerBatch, this.config.maxPlayers - i);
      
      // Connect batch of players
      const promises = [];
      for (let j = 0; j < batchSize; j++) {
        const playerId = i + j;
        promises.push(this.createPlayer(playerId));
      }
      
      await Promise.allSettled(promises);
      
      console.log(`📊 Connected ${Math.min(i + batchSize, this.config.maxPlayers)}/${this.config.maxPlayers} players`);
      
      // Wait before next batch (unless this is the last batch)
      if (i + batchSize < this.config.maxPlayers) {
        await this.sleep(batchInterval);
      }
    }
  }
  
  /**
   * Create and connect a single player
   */
  async createPlayer(playerId) {
    return new Promise((resolve) => {
      const playerName = this.getRandomName(playerId);
      const department = this.getRandomDepartment(playerId);
      const isMobile = Math.random() < 0.7; // 70% mobile users
      
      const socketOptions = {
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['websocket', 'polling']
      };
      
      // Simulate mobile vs desktop user agents
      if (isMobile) {
        socketOptions.extraHeaders = {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        };
      }
      
      this.metrics.connectionsAttempted++;
      
      const socket = io(this.config.serverUrl, socketOptions);
      const player = {
        id: playerId,
        socket,
        name: playerName,
        department,
        isMobile,
        connected: false,
        teamId: null,
        metrics: {
          messagesReceived: 0,
          latencies: [],
          lastActivity: Date.now()
        }
      };
      
      this.setupPlayerEventHandlers(player, resolve);
      this.players.set(playerId, player);
    });
  }
  
  /**
   * Set up event handlers for a player
   */
  setupPlayerEventHandlers(player, connectResolve) {
    const { socket } = player;
    
    // Connection events
    socket.on('connect', () => {
      player.connected = true;
      this.metrics.connectionsSuccessful++;
      console.log(`✅ Player ${player.id} (${player.name}) connected`);
      
      // Join the game immediately
      this.joinGame(player);
      
      connectResolve();
    });
    
    socket.on('disconnect', (reason) => {
      player.connected = false;
      console.log(`❌ Player ${player.id} disconnected: ${reason}`);
    });
    
    socket.on('connect_error', (error) => {
      this.metrics.connectionsFailed++;
      this.metrics.errors.push({
        type: 'connection_error',
        player: player.id,
        error: error.message,
        timestamp: Date.now()
      });
      console.error(`⚠️  Player ${player.id} connection error:`, error.message);
      connectResolve(); // Resolve anyway to continue with test
    });
    
    // Game events
    socket.on('join_success', (data) => {
      console.log(`🎮 Player ${player.id} joined successfully:`, data.player?.nickname);
      this.metrics.gameActions.joins++;
      
      // Join a team after successful game join
      setTimeout(() => {
        this.joinRandomTeam(player);
      }, this.randomDelay(1000, 3000));
    });
    
    socket.on('team_joined', (data) => {
      player.teamId = data.team?.id;
      this.metrics.gameActions.teamJoins++;
      console.log(`👥 Player ${player.id} joined team ${data.team?.name}`);
      
      // Start realistic gameplay behavior
      this.startPlayerBehavior(player);
    });
    
    socket.on('game_state_update', (gameState) => {
      player.metrics.messagesReceived++;
      this.metrics.messagesReceived++;
      player.metrics.lastActivity = Date.now();
    });
    
    socket.on('mini_game_start', (data) => {
      // Simulate mini-game participation
      setTimeout(() => {
        this.submitMiniGame(player, data);
      }, this.randomDelay(5000, 15000));
    });
    
    socket.on('error', (error) => {
      this.metrics.errors.push({
        type: 'game_error',
        player: player.id,
        error: error.message,
        timestamp: Date.now()
      });
      
      // Special handling for "game in progress" errors
      if (error.message && error.message.includes('Cannot join game in progress')) {
        console.error(`❌ Player ${player.id} cannot join - game in progress. This indicates phase transition sync issue.`);
        
        // Try to rejoin after a delay (game might reset soon)
        setTimeout(() => {
          if (player.connected && this.isRunning) {
            console.log(`🔄 Player ${player.id} retrying join after game in progress error...`);
            this.joinGame(player);
          }
        }, this.randomDelay(5000, 10000));
        
      } else {
        console.error(`⚠️  Player ${player.id} game error:`, error.message);
      }
    });
    
    // Latency tracking
    socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      player.metrics.latencies.push(latency);
      this.metrics.latencies.push(latency);
    });
    
    // Periodic ping for latency measurement
    setInterval(() => {
      if (player.connected) {
        socket.emit('ping', Date.now());
      }
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Join the game with player details
   */
  joinGame(player) {
    const joinData = {
      nickname: player.name,
      department: player.department
    };
    
    player.socket.emit('player_join', joinData);
    this.metrics.messagesent++;
  }
  
  /**
   * Join a random team
   */
  joinRandomTeam(player) {
    const teamId = this.teams[Math.floor(Math.random() * this.teams.length)];
    
    player.socket.emit('team_join', { teamId });
    this.metrics.messagesent++;
  }
  
  /**
   * Start realistic player behavior patterns
   */
  startPlayerBehavior(player) {
    if (!this.isRunning) return;
    
    const behaviorInterval = setInterval(() => {
      if (!this.isRunning || !player.connected) {
        clearInterval(behaviorInterval);
        return;
      }
      
      // Random actions based on behavior pattern
      const action = Math.random();
      
      if (action < 0.1) {
        // 10% chance to roll dice (if it's player's turn)
        this.attemptDiceRoll(player);
      } else if (action < 0.05) {
        // 5% chance to send heartbeat
        player.socket.emit('ping', Date.now());
      }
      
      player.metrics.lastActivity = Date.now();
      
    }, this.randomDelay(10000, 30000)); // Every 10-30 seconds
  }
  
  /**
   * Attempt to roll dice (simulates turn-based gameplay)
   */
  attemptDiceRoll(player) {
    if (!player.teamId) return;
    
    const rollData = {
      teamId: player.teamId,
      playerId: player.socket.id
    };
    
    player.socket.emit('dice_roll', rollData);
    this.metrics.messagesent++;
    this.metrics.gameActions.diceRolls++;
  }
  
  /**
   * Submit mini-game response
   */
  submitMiniGame(player, gameData) {
    if (!player.teamId) return;
    
    // Simulate different types of mini-game responses
    const responses = [
      { answer: 'A' }, // Multiple choice
      { answer: true }, // True/False
      { matches: [1, 2, 3] }, // Drag & Drop
      { selection: 'option1' } // General selection
    ];
    
    const submission = {
      teamId: player.teamId,
      playerId: player.socket.id,
      ...responses[Math.floor(Math.random() * responses.length)]
    };
    
    player.socket.emit('mini_game_submit', submission);
    this.metrics.messagesent++;
    this.metrics.gameActions.miniGameSubmissions++;
  }
  
  /**
   * Generate performance report
   */
  generateReport() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.startTime;
    const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected).length;
    
    const avgLatency = this.metrics.latencies.length > 0 
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length 
      : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      elapsed: Math.floor(elapsedTime / 1000),
      connections: {
        attempted: this.metrics.connectionsAttempted,
        successful: this.metrics.connectionsSuccessful,
        failed: this.metrics.connectionsFailed,
        active: connectedPlayers,
        successRate: ((this.metrics.connectionsSuccessful / this.metrics.connectionsAttempted) * 100).toFixed(2)
      },
      messages: {
        sent: this.metrics.messagesent,
        received: this.metrics.messagesReceived,
        rate: Math.floor(this.metrics.messagesReceived / (elapsedTime / 1000))
      },
      performance: {
        avgLatency: Math.floor(avgLatency),
        maxLatency: Math.max(...this.metrics.latencies, 0),
        minLatency: Math.min(...this.metrics.latencies, 0)
      },
      gameActions: this.metrics.gameActions,
      errors: this.metrics.errors.length
    };
    
    console.log('📊 PERFORMANCE REPORT:');
    console.log(`⏱️  Elapsed: ${report.elapsed}s | Active Players: ${report.connections.active}/${this.config.maxPlayers}`);
    console.log(`🔗 Connection Success: ${report.connections.successRate}% | Errors: ${report.errors}`);
    console.log(`📡 Messages: ${report.messages.received} received (${report.messages.rate}/s)`);
    console.log(`⚡ Latency: ${report.performance.avgLatency}ms avg | ${report.performance.maxLatency}ms max`);
    console.log(`🎮 Game Actions: ${report.gameActions.joins} joins, ${report.gameActions.teamJoins} team joins`);
    console.log('---');
    
    this.emit('report', report);
  }
  
  /**
   * Stop the load test
   */
  stop() {
    console.log('🛑 Stopping load test...');
    this.isRunning = false;
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    // Disconnect all players
    this.players.forEach(player => {
      if (player.socket && player.connected) {
        player.socket.disconnect();
      }
    });
    
    // Generate final report
    this.generateReport();
    
    console.log('✅ Load test completed');
    this.emit('complete', this.metrics);
  }
  
  // Utility methods
  getRandomName(playerId) {
    const baseName = this.playerNames[playerId % this.playerNames.length];
    return `${baseName}_${String(playerId).padStart(3, '0')}`;
  }
  
  getRandomDepartment(playerId) {
    return this.departments[playerId % this.departments.length];
  }
  
  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LoadTester;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (['maxPlayers', 'rampUpTime', 'testDuration', 'reportInterval'].includes(key)) {
        config[key] = parseInt(value);
      } else {
        config[key] = value;
      }
    }
  }
  
  const tester = new LoadTester(config);
  
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, stopping test...');
    tester.stop();
    process.exit(0);
  });
  
  tester.start().catch(console.error);
}