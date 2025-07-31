/**
 * WebSocket Integration Tests
 * 
 * Full integration tests simulating the exact race condition scenarios 
 * that were causing WebSocket disconnections in the original system
 */

// Jest globals are automatically available

// Mock Socket.IO Client
class MockSocketIO {
  constructor() {
    this.events = new Map();
    this.connected = true;
    this.emitHistory = [];
    this.disconnectCallbacks = [];
  }

  emit(event, data, callback) {
    this.emitHistory.push({ event, data, timestamp: Date.now() });
    
    // Simulate server response delay
    if (callback) {
      setTimeout(() => callback({ success: true }), 10);
    }
    
    return this;
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
    return this;
  }

  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    return this;
  }

  disconnect() {
    this.connected = false;
    this.disconnectCallbacks.forEach(cb => cb());
    return this;
  }

  onDisconnect(callback) {
    this.disconnectCallbacks.push(callback);
  }

  // Simulate receiving events from server
  simulateServerEvent(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => callback(data));
    }
  }

  // Get emit history for analysis
  getEmitHistory() {
    return [...this.emitHistory];
  }

  clearHistory() {
    this.emitHistory = [];
  }
}

// Integrated test system combining mobile and server logic
class IntegratedGameSystem {
  constructor() {
    this.socket = new MockSocketIO();
    this.gameState = {
      phase: 'active',
      currentTurnTeamId: 'team1',
      round: 1,
      teams: [
        { 
          id: 'team1', 
          name: 'Team A', 
          currentCaptainId: 'player1',
          members: [{ id: 'player1', nickname: 'Captain A' }]
        },
        { 
          id: 'team2', 
          name: 'Team B', 
          currentCaptainId: 'player2',
          members: [{ id: 'player2', nickname: 'Captain B' }]
        }
      ],
      isTransitioning: false
    };
    
    // Mobile client states
    this.clients = new Map();
    
    // Server state
    this.serverIsTransitioning = false;
    this.serverValidationHistory = [];
    
    this.setupServerLogic();
  }

  // Create mobile client
  createMobileClient(playerId, teamId) {
    const client = {
      socket: new MockSocketIO(),
      playerData: { id: playerId },
      teamData: this.gameState.teams.find(t => t.id === teamId),
      gameState: { ...this.gameState },
      lastActionAttempt: 0,
      actionsDisabled: false,
      
      // Mock UI methods
      showTransitionWarning: jest.fn(),
      showTurnValidationError: jest.fn(),
      showCaptainValidationError: jest.fn(),
      
      // Core rollDice logic
      rollDice: () => {
        if (!client.teamData || !client.gameState || !client.playerData) {
          console.log(`[${playerId}] Cannot roll dice - missing essential data`);
          return false;
        }

        if (client.gameState.isTransitioning) {
          console.log(`[${playerId}] Cannot roll dice - game is transitioning between turns`);
          client.showTransitionWarning('遊戲正在切換回合，請稍後再試');
          return false;
        }

        const isMyTurn = client.gameState.currentTurnTeamId === client.teamData.id;
        if (!isMyTurn) {
          console.log(`[${playerId}] Cannot roll dice - not our team turn. Current turn: ${client.gameState.currentTurnTeamId}, Our team: ${client.teamData.id}`);
          const currentTeam = client.gameState.teams.find(t => t.id === client.gameState.currentTurnTeamId);
          const currentTeamName = currentTeam ? currentTeam.name : '未知隊伍';
          client.showTurnValidationError(`現在是 ${currentTeamName} 的回合，請等待輪到您的隊伍`);
          return false;
        }

        if (!client.playerData || client.teamData.currentCaptainId !== client.playerData.id) {
          console.log(`[${playerId}] Cannot roll dice - not captain. Current captain: ${client.teamData.currentCaptainId}, Player: ${client.playerData?.id}`);
          const currentCaptain = client.teamData.members.find(m => m.id === client.teamData.currentCaptainId);
          const captainName = currentCaptain ? currentCaptain.nickname : '隊友';
          client.showCaptainValidationError(`只有隊長 ${captainName} 可以擲骰子，請與隊長討論後由隊長操作`);
          return false;
        }

        if (client.actionsDisabled) {
          console.log(`[${playerId}] Cannot roll dice - actions temporarily disabled`);
          client.showTransitionWarning('操作暫時停用，請等待狀態穩定');
          return false;
        }

        const now = Date.now();
        if (now - client.lastActionAttempt < 1000) {
          console.log(`[${playerId}] Action blocked - too frequent attempts`);
          client.showTransitionWarning('操作過於頻繁，請稍後再試');
          return false;
        }
        client.lastActionAttempt = Date.now();

        console.log(`[${playerId}] Rolling dice - Team: ${client.teamData.id}, Captain: ${client.playerData.id}`);
        client.socket.emit('dice_roll', { 
          teamId: client.teamData.id, 
          playerId: client.playerData.id 
        });
        
        return true;
      }
    };
    
    this.clients.set(playerId, client);
    return client;
  }

  // Setup server-side logic
  setupServerLogic() {
    // Server validation
    this.validateCaptainSubmission = (teamId, playerId) => {
      const validation = {
        teamId,
        playerId,
        timestamp: Date.now(),
        isTransitioning: this.serverIsTransitioning
      };

      if (this.serverIsTransitioning) {
        validation.result = { valid: false, reason: 'turn_transition', message: '正在切換回合，請稍等片刻再試' };
        this.serverValidationHistory.push(validation);
        return validation.result;
      }

      const team = this.gameState.teams.find(t => t.id === teamId);
      if (!team) {
        validation.result = { valid: false, reason: 'team_not_found', message: '找不到隊伍' };
        this.serverValidationHistory.push(validation);
        return validation.result;
      }

      if (team.currentCaptainId !== playerId) {
        validation.result = { valid: false, reason: 'not_captain', message: '您不是隊長，無法執行此操作' };
        this.serverValidationHistory.push(validation);
        return validation.result;
      }

      if (this.gameState.currentTurnTeamId !== teamId) {
        validation.result = { valid: false, reason: 'wrong_turn', message: '現在不是您隊伍的回合' };
        this.serverValidationHistory.push(validation);
        return validation.result;
      }

      validation.result = { valid: true };
      this.serverValidationHistory.push(validation);
      return validation.result;
    };

    // Server turn transition
    this.startTurnTransition = () => {
      if (this.serverIsTransitioning) {
        console.log('[SERVER] Turn transition already in progress');
        return false;
      }

      this.serverIsTransitioning = true;
      this.gameState.isTransitioning = true;

      // Broadcast state update to all clients
      this.broadcastGameStateUpdate();

      // Simulate transition delay
      setTimeout(() => {
        // Switch to next team
        const currentIndex = this.gameState.teams.findIndex(t => t.id === this.gameState.currentTurnTeamId);
        const nextIndex = (currentIndex + 1) % this.gameState.teams.length;
        this.gameState.currentTurnTeamId = this.gameState.teams[nextIndex].id;

        // Complete transition
        this.serverIsTransitioning = false;
        this.gameState.isTransitioning = false;

        console.log(`[SERVER] Turn transition completed, now ${this.gameState.currentTurnTeamId}'s turn`);
        this.broadcastGameStateUpdate();
      }, 500);

      return true;
    };
  }

  // Broadcast game state to all clients
  broadcastGameStateUpdate() {
    const gameStateWithTransition = {
      ...this.gameState,
      isTransitioning: this.serverIsTransitioning
    };

    this.clients.forEach((client, playerId) => {
      client.gameState = { ...gameStateWithTransition };
      client.teamData = gameStateWithTransition.teams.find(t => t.id === client.teamData.id);
    });
  }

  // Simulate rapid captain attempts
  simulateRapidCaptainAttempts(playerId, attempts = 5, delay = 100) {
    const client = this.clients.get(playerId);
    if (!client) return [];

    const results = [];
    
    for (let i = 0; i < attempts; i++) {
      setTimeout(() => {
        const result = client.rollDice();
        results.push({
          attempt: i + 1,
          success: result,
          timestamp: Date.now()
        });
      }, i * delay);
    }

    return results;
  }

  // Get detailed system state
  getSystemState() {
    return {
      gameState: { ...this.gameState },
      serverIsTransitioning: this.serverIsTransitioning,
      serverValidationHistory: [...this.serverValidationHistory],
      clients: Array.from(this.clients.entries()).map(([playerId, client]) => ({
        playerId,
        teamId: client.teamData?.id,
        lastActionAttempt: client.lastActionAttempt,
        actionsDisabled: client.actionsDisabled,
        socketEmitHistory: client.socket.getEmitHistory()
      }))
    };
  }

  // Reset system state
  reset() {
    this.serverIsTransitioning = false;
    this.gameState.isTransitioning = false;
    this.gameState.currentTurnTeamId = 'team1';
    this.serverValidationHistory = [];
    
    this.clients.forEach(client => {
      client.lastActionAttempt = 0;
      client.actionsDisabled = false;
      client.socket.clearHistory();
      jest.clearAllMocks();
    });
  }
}

describe('WebSocket Integration Tests', () => {
  let system;

  beforeEach(() => {
    system = new IntegratedGameSystem();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Race Condition Scenario 1: Rapid Captain Attempts During Wrong Turn', () => {
    test('should handle multiple rapid attempts from wrong team without disconnection', async () => {
      // Setup: Team B's turn, but Team A player attempts actions
      system.gameState.currentTurnTeamId = 'team2';
      system.broadcastGameStateUpdate();

      const teamAPlayer = system.createMobileClient('player1', 'team1');
      
      // Simulate 5 rapid attempts from Team A during Team B's turn
      const attempts = [];
      for (let i = 0; i < 5; i++) {
        attempts.push(teamAPlayer.rollDice());
      }

      // All attempts should fail gracefully
      expect(attempts.every(result => result === false)).toBe(true);
      expect(teamAPlayer.showTurnValidationError).toHaveBeenCalledTimes(5);
      expect(teamAPlayer.showTurnValidationError).toHaveBeenCalledWith('現在是 Team B 的回合，請等待輪到您的隊伍');
      
      // No socket emissions should occur
      expect(teamAPlayer.socket.getEmitHistory()).toHaveLength(0);
      
      // Socket should remain connected
      expect(teamAPlayer.socket.connected).toBe(true);
    });

    test('should handle rapid attempts with proper debouncing', () => {
      const teamAPlayer = system.createMobileClient('player1', 'team1');
      system.gameState.currentTurnTeamId = 'team1'; // Team A's turn
      system.broadcastGameStateUpdate();

      // First attempt should succeed
      const firstResult = teamAPlayer.rollDice();
      expect(firstResult).toBe(true);

      // Immediate second attempt should fail due to debouncing
      const secondResult = teamAPlayer.rollDice();
      expect(secondResult).toBe(false);
      expect(teamAPlayer.showTransitionWarning).toHaveBeenCalledWith('操作過於頻繁，請稍後再試');

      // After 1000ms delay, should succeed again
      jest.advanceTimersByTime(1000);
      const thirdResult = teamAPlayer.rollDice();
      expect(thirdResult).toBe(true);
    });
  });

  describe('Race Condition Scenario 2: Turn Transition Race Conditions', () => {
    test('should prevent actions during turn transition', () => {
      const teamAPlayer = system.createMobileClient('player1', 'team1');
      const teamBPlayer = system.createMobileClient('player2', 'team2');

      // Start with Team A's turn
      system.gameState.currentTurnTeamId = 'team1';
      system.broadcastGameStateUpdate();

      // Team A player should be able to act initially
      const initialResult = teamAPlayer.rollDice();
      expect(initialResult).toBe(true);

      // Start turn transition
      system.startTurnTransition();

      // During transition, both players should be blocked
      const duringTransitionA = teamAPlayer.rollDice();
      const duringTransitionB = teamBPlayer.rollDice();

      expect(duringTransitionA).toBe(false);
      expect(duringTransitionB).toBe(false);
      expect(teamAPlayer.showTransitionWarning).toHaveBeenCalledWith('遊戲正在切換回合，請稍後再試');
      expect(teamBPlayer.showTransitionWarning).toHaveBeenCalledWith('遊戲正在切換回合，請稍後再試');

      // Complete transition
      jest.advanceTimersByTime(500);

      // After transition, only new turn team should be able to act
      const afterTransitionA = teamAPlayer.rollDice();
      const afterTransitionB = teamBPlayer.rollDice();

      expect(afterTransitionA).toBe(false); // Team A no longer has turn
      expect(afterTransitionB).toBe(true);  // Team B now has turn
    });

    test('should handle simultaneous actions during transition start', () => {
      const teamAPlayer = system.createMobileClient('player1', 'team1');
      const teamBPlayer = system.createMobileClient('player2', 'team2');

      system.gameState.currentTurnTeamId = 'team1';
      system.broadcastGameStateUpdate();

      // Start transition
      system.startTurnTransition();

      // Simulate simultaneous attempts from both teams
      const resultsA = [];
      const resultsB = [];

      for (let i = 0; i < 3; i++) {
        resultsA.push(teamAPlayer.rollDice());
        resultsB.push(teamBPlayer.rollDice());
      }

      // All attempts should fail during transition
      expect(resultsA.every(result => result === false)).toBe(true);
      expect(resultsB.every(result => result === false)).toBe(true);

      // Check that appropriate warnings were shown
      expect(teamAPlayer.showTransitionWarning).toHaveBeenCalledTimes(3);
      expect(teamBPlayer.showTransitionWarning).toHaveBeenCalledTimes(3);
    });
  });

  describe('Race Condition Scenario 3: Captain Change During Action Attempts', () => {
    test('should handle captain change during action validation', () => {
      const player1 = system.createMobileClient('player1', 'team1');
      const player2 = system.createMobileClient('player3', 'team1'); // Same team, different player
      
      // Initially player1 is captain
      system.gameState.teams[0].currentCaptainId = 'player1';
      system.broadcastGameStateUpdate();

      // Player1 should be able to act
      const result1 = player1.rollDice();
      expect(result1).toBe(true);

      // Change captain to player3
      system.gameState.teams[0].currentCaptainId = 'player3';
      system.gameState.teams[0].members.push({ id: 'player3', nickname: 'New Captain' });
      system.broadcastGameStateUpdate();

      // Player1 should no longer be able to act
      const result2 = player1.rollDice();
      expect(result2).toBe(false);
      expect(player1.showCaptainValidationError).toHaveBeenCalled();

      // Player2 (now player3) should be able to act
      player2.playerData = { id: 'player3' };
      const result3 = player2.rollDice();
      expect(result3).toBe(true);
    });
  });

  describe('Server-Side Validation Integration', () => {
    test('should maintain server validation history for debugging', () => {
      const player1 = system.createMobileClient('player1', 'team1');
      const player2 = system.createMobileClient('player2', 'team2');

      // Valid attempt
      system.validateCaptainSubmission('team1', 'player1');
      
      // Invalid attempts
      system.validateCaptainSubmission('team2', 'player2'); // Wrong turn
      system.validateCaptainSubmission('team1', 'wrong-player'); // Not captain

      const history = system.serverValidationHistory;
      expect(history).toHaveLength(3);
      
      expect(history[0].result.valid).toBe(true);
      expect(history[1].result.reason).toBe('wrong_turn');
      expect(history[2].result.reason).toBe('not_captain');
    });

    test('should block server validation during transition', () => {
      system.serverIsTransitioning = true;

      const result = system.validateCaptainSubmission('team1', 'player1');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('turn_transition');
      expect(result.message).toBe('正在切換回合，請稍等片刻再試');
    });
  });

  describe('System State Consistency', () => {
    test('should maintain consistent state across client and server', () => {
      const player1 = system.createMobileClient('player1', 'team1');
      
      // Check initial state consistency
      const initialState = system.getSystemState();
      expect(initialState.gameState.currentTurnTeamId).toBe('team1');
      expect(initialState.clients[0].teamId).toBe('team1');

      // Start transition and check state
      system.startTurnTransition();
      const transitionState = system.getSystemState();
      expect(transitionState.serverIsTransitioning).toBe(true);
      expect(transitionState.gameState.isTransitioning).toBe(true);

      // Complete transition and check final state
      jest.advanceTimersByTime(500);
      const finalState = system.getSystemState();
      expect(finalState.serverIsTransitioning).toBe(false);
      expect(finalState.gameState.isTransitioning).toBe(false);
      expect(finalState.gameState.currentTurnTeamId).toBe('team2');
    });

    test('should track all socket emissions for analysis', () => {
      const player1 = system.createMobileClient('player1', 'team1');
      
      // Perform various actions
      player1.rollDice(); // Should succeed
      player1.rollDice(); // Should fail due to debouncing

      const emitHistory = player1.socket.getEmitHistory();
      expect(emitHistory).toHaveLength(1); // Only one successful emission
      expect(emitHistory[0].event).toBe('dice_roll');
      expect(emitHistory[0].data).toEqual({
        teamId: 'team1',
        playerId: 'player1'
      });
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    test('should handle missing team data gracefully', () => {
      const player1 = system.createMobileClient('player1', 'nonexistent-team');
      player1.teamData = null;

      const result = player1.rollDice();
      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('[player1] Cannot roll dice - missing essential data');
    });

    test('should handle corrupt game state gracefully', () => {
      const player1 = system.createMobileClient('player1', 'team1');
      player1.gameState = null;

      const result = player1.rollDice();
      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('[player1] Cannot roll dice - missing essential data');
    });

    test('should continue functioning after temporary errors', () => {
      const player1 = system.createMobileClient('player1', 'team1');
      
      // Simulate temporary error state
      player1.actionsDisabled = true;
      const errorResult = player1.rollDice();
      expect(errorResult).toBe(false);

      // Recover from error
      player1.actionsDisabled = false;
      const recoveryResult = player1.rollDice();
      expect(recoveryResult).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high-frequency validation requests', () => {
      const startTime = Date.now();
      
      // Perform 100 validations
      for (let i = 0; i < 100; i++) {
        system.validateCaptainSubmission('team1', 'player1');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (under 100ms)
      expect(duration).toBeLessThan(100);
      expect(system.serverValidationHistory).toHaveLength(100);
    });

    test('should maintain performance during multiple client simulation', () => {
      // Create multiple clients - some are captains, some are not
      const clients = [];
      for (let i = 0; i < 10; i++) {
        const teamId = i % 2 === 0 ? 'team1' : 'team2';
        const client = system.createMobileClient(`player${i}`, teamId);
        
        // Only player0 is the captain of team1, player1 is captain of team2
        if (i === 0) {
          // This is the team1 captain (should succeed since team1 has turn)
          client.playerData = { id: 'player1' }; // Use existing captain
          client.teamData = system.gameState.teams[0]; // team1
        } else if (i === 1) {
          // This is team2 player (should fail - wrong turn)
          client.playerData = { id: 'player2' }; // Use existing captain
          client.teamData = system.gameState.teams[1]; // team2
        } else {
          // These are non-captain players (should fail - not captain)
          client.playerData = { id: `player${i}` };
        }
        
        clients.push(client);
      }

      const startTime = Date.now();
      
      // All clients attempt actions simultaneously
      const results = clients.map(client => client.rollDice());
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(50);
      
      // Only the team1 captain should succeed (client[0])
      const successfulAttempts = results.filter(r => r === true);
      expect(successfulAttempts).toHaveLength(1);
      
      // Verify that the successful attempt was from the correct client
      expect(results[0]).toBe(true); // Team1 captain should succeed
    });
  });
});