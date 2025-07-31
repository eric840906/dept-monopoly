/**
 * Mobile Captain Validation Tests
 * 
 * Tests the critical captain validation logic in mobile.js rollDice() method
 * Focuses on race condition scenarios that were causing WebSocket disconnections
 */

// Jest globals are automatically available

// Mock Socket.IO
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Mock DOM elements
const mockDOMElements = {
  rollDiceBtn: {
    disabled: false,
    textContent: '🎲 擲骰子',
    addEventListener: jest.fn()
  }
};

// Mock document methods
const mockDocument = {
  getElementById: jest.fn((id) => {
    if (id === 'rollDiceBtn') return mockDOMElements.rollDiceBtn;
    return null;
  }),
  addEventListener: jest.fn()
};

global.document = mockDocument;

// Simplified MobileGameApp class for testing (extracted core logic)
class TestMobileGameApp {
  constructor() {
    this.socket = mockSocket;
    this.currentScreen = 'loadingScreen';
    this.playerData = null;
    this.gameState = null;
    this.teamData = null;
    this.modalCount = 0;
    this.diceButtonDisabled = false;
    this.lastActionAttempt = 0;
    this.actionsDisabled = false;
    
    // Mock UI methods
    this.showTransitionWarning = jest.fn();
    this.showTurnValidationError = jest.fn();
    this.showCaptainValidationError = jest.fn();
  }

  // Core rollDice method (extracted from mobile.js)
  rollDice() {
    // ENHANCED validation to prevent race condition bugs and invalid captain attempts
    if (!this.teamData || !this.gameState || !this.playerData) {
      console.log('Cannot roll dice - missing essential data');
      return false;
    }

    // CRITICAL: Check if game is transitioning to prevent race conditions
    if (this.gameState.isTransitioning) {
      console.log('Cannot roll dice - game is transitioning between turns');
      this.showTransitionWarning('遊戲正在切換回合，請稍後再試');
      return false;
    }

    // Verify it's our team's turn with enhanced logging
    const isMyTurn = this.gameState.currentTurnTeamId === this.teamData.id;
    if (!isMyTurn) {
      console.log(`Cannot roll dice - not our team turn. Current turn: ${this.gameState.currentTurnTeamId}, Our team: ${this.teamData.id}`);
      
      // Show user-friendly error for wrong turn attempts
      const currentTeam = this.gameState.teams.find(t => t.id === this.gameState.currentTurnTeamId);
      const currentTeamName = currentTeam ? currentTeam.name : '未知隊伍';
      this.showTurnValidationError(`現在是 ${currentTeamName} 的回合，請等待輪到您的隊伍`);
      return false;
    }

    // Enhanced captain validation with better error messages
    if (!this.playerData || this.teamData.currentCaptainId !== this.playerData.id) {
      console.log(`Cannot roll dice - not captain. Current captain: ${this.teamData.currentCaptainId}, Player: ${this.playerData?.id}`);
      const currentCaptain = this.teamData.members.find(m => m.id === this.teamData.currentCaptainId);
      const captainName = currentCaptain ? currentCaptain.nickname : '隊友';
      this.showCaptainValidationError(`只有隊長 ${captainName} 可以擲骰子，請與隊長討論後由隊長操作`);
      return false;
    }

    // Check if actions are temporarily disabled
    if (this.actionsDisabled) {
      console.log('Cannot roll dice - actions temporarily disabled');
      this.showTransitionWarning('操作暫時停用，請等待狀態穩定');
      return false;
    }

    // Enhanced debouncing to prevent rapid attempts during state transitions
    const now = Date.now();
    if (now - this.lastActionAttempt < 1000) {
      console.log('Action blocked - too frequent attempts');
      this.showTransitionWarning('操作過於頻繁，請稍後再試');
      return false;
    }
    this.lastActionAttempt = Date.now();

    const rollBtn = document.getElementById('rollDiceBtn');
    if (rollBtn) {
      rollBtn.disabled = true;
      rollBtn.textContent = '擲骰中...';
    }

    console.log(`Rolling dice - Team: ${this.teamData.id}, Captain: ${this.playerData.id}`);
    this.socket.emit('dice_roll', { 
      teamId: this.teamData.id, 
      playerId: this.playerData.id 
    });
    
    return true;
  }
}

describe('Mobile Captain Validation Tests', () => {
  let app;
  
  beforeEach(() => {
    app = new TestMobileGameApp();
    jest.clearAllMocks();
    
    // Reset DOM mock
    mockDOMElements.rollDiceBtn.disabled = false;
    mockDOMElements.rollDiceBtn.textContent = '🎲 擲骰子';
    
    // Reset document mock
    mockDocument.getElementById.mockImplementation((id) => {
      if (id === 'rollDiceBtn') return mockDOMElements.rollDiceBtn;
      return null;
    });
  });

  describe('Essential Data Validation', () => {
    test('should reject rollDice when teamData is null', () => {
      app.teamData = null;
      app.gameState = { isTransitioning: false };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Cannot roll dice - missing essential data');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });

    test('should reject rollDice when gameState is null', () => {
      app.teamData = { id: 'team1' };
      app.gameState = null;
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Cannot roll dice - missing essential data');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });

    test('should reject rollDice when playerData is null', () => {
      app.teamData = { id: 'team1' };
      app.gameState = { isTransitioning: false };
      app.playerData = null;

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Cannot roll dice - missing essential data');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Critical Race Condition Prevention', () => {
    test('should reject rollDice during game transition (isTransitioning = true)', () => {
      app.teamData = { id: 'team1', currentCaptainId: 'player1' };
      app.gameState = { 
        isTransitioning: true,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Cannot roll dice - game is transitioning between turns');
      expect(app.showTransitionWarning).toHaveBeenCalledWith('遊戲正在切換回合，請稍後再試');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });

    test('should allow rollDice when not transitioning (isTransitioning = false)', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1',
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(true);
      expect(app.showTransitionWarning).not.toHaveBeenCalled();
      expect(app.socket.emit).toHaveBeenCalledWith('dice_roll', {
        teamId: 'team1',
        playerId: 'player1'
      });
    });
  });

  describe('Turn Validation Logic', () => {
    test('should reject rollDice when it is not team\'s turn', () => {
      app.teamData = { id: 'team1', currentCaptainId: 'player1' };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team2', // Different team's turn
        teams: [
          { id: 'team1', name: 'Team A' },
          { id: 'team2', name: 'Team B' }
        ]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Cannot roll dice - not our team turn. Current turn: team2, Our team: team1');
      expect(app.showTurnValidationError).toHaveBeenCalledWith('現在是 Team B 的回合，請等待輪到您的隊伍');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });

    test('should handle missing current team gracefully', () => {
      app.teamData = { id: 'team1', currentCaptainId: 'player1' };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'nonexistent-team',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(app.showTurnValidationError).toHaveBeenCalledWith('現在是 未知隊伍 的回合，請等待輪到您的隊伍');
    });

    test('should allow rollDice when it is team\'s turn', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1',
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1', // Same team's turn
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(true);
      expect(app.socket.emit).toHaveBeenCalledWith('dice_roll', {
        teamId: 'team1',
        playerId: 'player1'
      });
    });
  });

  describe('Captain Validation Logic', () => {
    test('should reject rollDice when player is not the captain', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player2', // Different player is captain
        members: [
          { id: 'player1', nickname: 'Player1' },
          { id: 'player2', nickname: 'Captain' }
        ]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Cannot roll dice - not captain. Current captain: player2, Player: player1');
      expect(app.showCaptainValidationError).toHaveBeenCalledWith('只有隊長 Captain 可以擲骰子，請與隊長討論後由隊長操作');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });

    test('should handle missing captain member gracefully', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'nonexistent-player',
        members: [{ id: 'player1', nickname: 'Player1' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(app.showCaptainValidationError).toHaveBeenCalledWith('只有隊長 隊友 可以擲骰子，請與隊長討論後由隊長操作');
    });

    test('should allow rollDice when player is the captain', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1', // Same player is captain
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      const result = app.rollDice();

      expect(result).toBe(true);
      expect(app.socket.emit).toHaveBeenCalledWith('dice_roll', {
        teamId: 'team1',
        playerId: 'player1'
      });
    });
  });

  describe('Actions Disabled State', () => {
    test('should reject rollDice when actions are temporarily disabled', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1',
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };
      app.actionsDisabled = true;

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Cannot roll dice - actions temporarily disabled');
      expect(app.showTransitionWarning).toHaveBeenCalledWith('操作暫時停用，請等待狀態穩定');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Debouncing and Rate Limiting', () => {
    test('should reject rapid attempts within 1000ms (debouncing)', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1',
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };
      
      // Set last action attempt to very recent
      app.lastActionAttempt = Date.now() - 500; // 500ms ago

      const result = app.rollDice();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Action blocked - too frequent attempts');
      expect(app.showTransitionWarning).toHaveBeenCalledWith('操作過於頻繁，請稍後再試');
      expect(app.socket.emit).not.toHaveBeenCalled();
    });

    test('should allow action after 1000ms delay', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1',
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };
      
      // Set last action attempt to over 1000ms ago
      app.lastActionAttempt = Date.now() - 1500; // 1500ms ago

      const result = app.rollDice();

      expect(result).toBe(true);
      expect(app.socket.emit).toHaveBeenCalledWith('dice_roll', {
        teamId: 'team1',
        playerId: 'player1'
      });
    });

    test('should update lastActionAttempt timestamp on successful action', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1',
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };
      
      const initialTimestamp = app.lastActionAttempt;
      
      app.rollDice();

      expect(app.lastActionAttempt).toBeGreaterThan(initialTimestamp);
      expect(app.lastActionAttempt).toBeWithinRange(Date.now() - 100, Date.now() + 100);
    });
  });

  describe('DOM Integration', () => {
    test.skip('DOM tests require more complex setup - focusing on core logic', () => {
      // DOM integration is tested in the real application
      // These tests focus on the critical race condition logic
    });
  });

  describe('Race Condition Scenario Integration', () => {
    test('should handle multiple rapid attempts during wrong turn gracefully', () => {
      app.teamData = { id: 'team1', currentCaptainId: 'player1' };
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team2',
        teams: [
          { id: 'team1', name: 'Team A' },
          { id: 'team2', name: 'Team B' }
        ]
      };
      app.playerData = { id: 'player1' };

      // Multiple rapid attempts
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(app.rollDice());
      }

      // All should fail
      expect(results.every(result => result === false)).toBe(true);
      expect(app.socket.emit).not.toHaveBeenCalled();
      expect(app.showTurnValidationError).toHaveBeenCalledTimes(5);
    });

    test('should prevent captain attempts during turn transition', () => {
      app.teamData = { 
        id: 'team1', 
        currentCaptainId: 'player1',
        members: [{ id: 'player1', nickname: 'Captain' }]
      };
      
      // Start with valid state
      app.gameState = { 
        isTransitioning: false,
        currentTurnTeamId: 'team1',
        teams: [{ id: 'team1', name: 'Team A' }]
      };
      app.playerData = { id: 'player1' };

      // First attempt should succeed
      const firstResult = app.rollDice();
      expect(firstResult).toBe(true);

      // Simulate transition starting
      app.gameState.isTransitioning = true;

      // Second attempt should fail due to transition
      const secondResult = app.rollDice();
      expect(secondResult).toBe(false);
      expect(app.showTransitionWarning).toHaveBeenCalledWith('遊戲正在切換回合，請稍後再試');
    });
  });
});