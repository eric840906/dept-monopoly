/**
 * GameManager Turn Transition Tests
 * 
 * Tests the critical turn transition logic and isTransitioning state management
 * Focuses on preventing race conditions in server-side validation
 */

// Jest globals are automatically available

// Mock constants and types
const GamePhase = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  ENDED: 'ended'
};

const SOCKET_EVENTS = {
  GAME_STATE_UPDATE: 'game_state_update',
  TURN_END: 'turn_end',
  TURN_TRANSITION_START: 'turn_transition_start'
};

// Mock IO
const mockIO = {
  emit: jest.fn(),
  to: jest.fn(() => mockIO)
};

// Simplified GameManager class for testing (extracted core logic)
class TestGameManager {
  constructor() {
    this.gameState = {
      phase: GamePhase.ACTIVE,
      currentTurnTeamId: 'team1',
      round: 1,
      teams: [
        { 
          id: 'team1', 
          name: 'Team A', 
          currentCaptainId: 'player1',
          members: [{ id: 'player1', nickname: 'Captain A' }],
          score: 0
        },
        { 
          id: 'team2', 
          name: 'Team B', 
          currentCaptainId: 'player2',
          members: [{ id: 'player2', nickname: 'Captain B' }],
          score: 0
        }
      ],
      players: {
        'player1': { id: 'player1', nickname: 'Captain A', teamId: 'team1' },
        'player2': { id: 'player2', nickname: 'Captain B', teamId: 'team2' }
      }
    };
    this.io = mockIO;
    this.isTransitioning = false;
    this.turnTimer = null;
  }

  // Core validation method from GameManager.js
  validateCaptainSubmission(teamId, playerId) {
    // Prevent actions during turn transitions to avoid race conditions
    if (this.isTransitioning) {
      console.warn(`Captain validation blocked during turn transition for team ${teamId}, player ${playerId}`);
      return { valid: false, reason: 'turn_transition', message: '正在切換回合，請稍等片刻再試' };
    }

    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) {
      console.warn(`Team ${teamId} not found for captain validation`);
      return { valid: false, reason: 'team_not_found', message: '找不到隊伍' };
    }

    if (!team.currentCaptainId) {
      console.warn(`No captain set for team ${teamId}`);
      return { valid: false, reason: 'no_captain', message: '隊伍尚未設定隊長' };
    }

    if (team.currentCaptainId !== playerId) {
      console.warn(`Player ${playerId} is not captain of team ${teamId}. Current captain: ${team.currentCaptainId}`);
      return { valid: false, reason: 'not_captain', message: '您不是隊長，無法執行此操作' };
    }

    if (this.gameState.currentTurnTeamId !== teamId) {
      console.warn(`Team ${teamId} attempting action during team ${this.gameState.currentTurnTeamId}'s turn`);
      return { valid: false, reason: 'wrong_turn', message: '現在不是您隊伍的回合' };
    }

    return { valid: true };
  }

  // Core skipToNextTeam method from GameManager.js
  skipToNextTeam() {
    // Check if game has already ended
    if (this.gameState.phase === GamePhase.ENDED) {
      console.log('Game has ended, ignoring skipToNextTeam call');
      return false;
    }

    // Prevent concurrent team transitions
    if (this.isTransitioning) {
      console.log('Team transition already in progress, ignoring duplicate skipToNextTeam call');
      return false;
    }

    this.isTransitioning = true;

    if (this.gameState.teams.length === 0) {
      // No teams left, end the game
      this.endGame('no_teams_remaining');
      return false;
    }

    // Find next valid team
    const currentTeamIndex = this.gameState.teams.findIndex(t => t.id === this.gameState.currentTurnTeamId);

    let nextTeamIndex;
    if (currentTeamIndex === -1) {
      // Current team was removed, start from first team
      nextTeamIndex = 0;
    } else {
      // Move to next team, wrapping around if necessary
      nextTeamIndex = (currentTeamIndex + 1) % this.gameState.teams.length;
      
      // If we've wrapped around to the first team, increment the round
      if (nextTeamIndex === 0) {
        this.gameState.round++;
      }
    }

    const nextTeam = this.gameState.teams[nextTeamIndex];
    this.gameState.currentTurnTeamId = nextTeam.id;

    console.log(`Skipped to next team: ${nextTeam.name} (${nextTeam.id}), Round: ${this.gameState.round}`);

    // Broadcast game state update
    this.broadcastGameState();

    // Reset transition state after a brief delay to allow state synchronization
    setTimeout(() => {
      this.isTransitioning = false;
      console.log('Team skip transition completed, actions now allowed');
    }, 500); // 500ms delay for state sync

    return true;
  }

  // Core endTurn method logic from GameManager.js
  endTurn() {
    if (this.gameState.phase === GamePhase.ENDED) {
      console.log('Game has ended, ignoring endTurn call');
      return false;
    }

    // Prevent concurrent turn transitions
    if (this.isTransitioning) {
      console.log('Turn transition already in progress, ignoring duplicate endTurn call');
      return false;
    }

    this.isTransitioning = true;
    this.clearTurnTimer();

    // Notify clients that turn transition is starting
    this.io.emit(SOCKET_EVENTS.TURN_TRANSITION_START, {
      message: '正在切換回合，請稍等...'
    });

    // Check if there are any teams left
    if (this.gameState.teams.length === 0) {
      console.log('No teams remaining, ending game');
      this.endGame('no_teams_remaining');
      return false;
    }

    const currentTeamIndex = this.gameState.teams.findIndex(t => t.id === this.gameState.currentTurnTeamId);
    let nextTeamIndex = (currentTeamIndex + 1) % this.gameState.teams.length;

    // If we've wrapped around to the first team, increment the round
    if (nextTeamIndex === 0) {
      this.gameState.round++;
    }

    const nextTeam = this.gameState.teams[nextTeamIndex];
    this.gameState.currentTurnTeamId = nextTeam.id;

    // Find the captain for the next team
    const captain = nextTeam.members.find(m => m.id === nextTeam.currentCaptainId);

    // Broadcast updated game state first
    this.broadcastGameState();

    // Reset transition state BEFORE emitting turn end to prevent race conditions
    setTimeout(() => {
      this.isTransitioning = false;
      console.log('Turn transition completed, emitting TURN_END event');
      
      // Now emit turn end after transition is complete
      this.io.emit(SOCKET_EVENTS.TURN_END, {
        nextTeamId: this.gameState.currentTurnTeamId,
        captainId: captain?.id || null,
        captainName: captain?.nickname || 'Unknown',
        round: this.gameState.round,
      });
      
      console.log(`Round ${this.gameState.round} Turn transitioned to team ${this.gameState.currentTurnTeamId} with captain ${captain?.nickname}`);
    }, 300); // Reduced delay but still allows for state sync

    return true;
  }

  broadcastGameState() {
    if (this.io) {
      // Include transition state in game state broadcasts to prevent race conditions
      const gameStateWithTransition = {
        ...this.gameState,
        isTransitioning: this.isTransitioning
      };
      this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, gameStateWithTransition);
    }
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  endGame(reason) {
    this.gameState.phase = GamePhase.ENDED;
    this.isTransitioning = false; // Reset transition state when game ends
    this.clearTurnTimer();

    // Find winner (highest score) - handle empty teams array
    let winner = null;
    if (this.gameState.teams.length > 0) {
      winner = this.gameState.teams.reduce((prev, current) => (prev.score > current.score ? prev : current));
    }

    this.gameState.winner = winner;
    console.log(`Game ended: ${reason}, Winner: ${winner?.name || 'None'}`);
    
    this.broadcastGameState();
  }
}

describe('GameManager Turn Transition Tests', () => {
  let gameManager;
  
  beforeEach(() => {
    gameManager = new TestGameManager();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validateCaptainSubmission', () => {
    test('should reject validation during turn transition', () => {
      gameManager.isTransitioning = true;

      const result = gameManager.validateCaptainSubmission('team1', 'player1');

      expect(result).toEqual({
        valid: false,
        reason: 'turn_transition',
        message: '正在切換回合，請稍等片刻再試'
      });
      expect(console.warn).toHaveBeenCalledWith('Captain validation blocked during turn transition for team team1, player player1');
    });

    test('should allow validation when not transitioning', () => {
      gameManager.isTransitioning = false;

      const result = gameManager.validateCaptainSubmission('team1', 'player1');

      expect(result.valid).toBe(true);
    });

    test('should reject validation for non-existent team', () => {
      gameManager.isTransitioning = false;

      const result = gameManager.validateCaptainSubmission('nonexistent', 'player1');

      expect(result).toEqual({
        valid: false,
        reason: 'team_not_found',
        message: '找不到隊伍'
      });
    });

    test('should reject validation when team has no captain', () => {
      gameManager.isTransitioning = false;
      gameManager.gameState.teams[0].currentCaptainId = null;

      const result = gameManager.validateCaptainSubmission('team1', 'player1');

      expect(result).toEqual({
        valid: false,
        reason: 'no_captain',
        message: '隊伍尚未設定隊長'
      });
    });

    test('should reject validation when player is not the captain', () => {
      gameManager.isTransitioning = false;

      const result = gameManager.validateCaptainSubmission('team1', 'wrong-player');

      expect(result).toEqual({
        valid: false,
        reason: 'not_captain',
        message: '您不是隊長，無法執行此操作'
      });
    });

    test('should reject validation during wrong team\'s turn', () => {
      gameManager.isTransitioning = false;
      gameManager.gameState.currentTurnTeamId = 'team2';

      const result = gameManager.validateCaptainSubmission('team1', 'player1');

      expect(result).toEqual({
        valid: false,
        reason: 'wrong_turn',
        message: '現在不是您隊伍的回合'
      });
    });

    test('should pass validation for valid captain during their turn', () => {
      gameManager.isTransitioning = false;
      gameManager.gameState.currentTurnTeamId = 'team1';

      const result = gameManager.validateCaptainSubmission('team1', 'player1');

      expect(result).toEqual({ valid: true });
    });
  });

  describe('skipToNextTeam', () => {
    test('should ignore skip when game has ended', () => {
      gameManager.gameState.phase = GamePhase.ENDED;

      const result = gameManager.skipToNextTeam();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Game has ended, ignoring skipToNextTeam call');
      expect(gameManager.isTransitioning).toBe(false);
    });

    test('should ignore duplicate skip calls during transition', () => {
      gameManager.isTransitioning = true;

      const result = gameManager.skipToNextTeam();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Team transition already in progress, ignoring duplicate skipToNextTeam call');
    });

    test('should end game when no teams remain', () => {
      gameManager.gameState.teams = [];
      gameManager.endGame = jest.fn();

      const result = gameManager.skipToNextTeam();

      expect(result).toBe(false);
      expect(gameManager.endGame).toHaveBeenCalledWith('no_teams_remaining');
    });

    test('should skip to next team in normal sequence', () => {
      gameManager.gameState.currentTurnTeamId = 'team1';
      gameManager.gameState.round = 1;

      const result = gameManager.skipToNextTeam();

      expect(result).toBe(true);
      expect(gameManager.gameState.currentTurnTeamId).toBe('team2');
      expect(gameManager.gameState.round).toBe(1); // Should not increment mid-round
      expect(gameManager.isTransitioning).toBe(true);
    });

    test('should increment round when wrapping around to first team', () => {
      gameManager.gameState.currentTurnTeamId = 'team2'; // Last team
      gameManager.gameState.round = 1;

      const result = gameManager.skipToNextTeam();

      expect(result).toBe(true);
      expect(gameManager.gameState.currentTurnTeamId).toBe('team1'); // First team
      expect(gameManager.gameState.round).toBe(2); // Round incremented
    });

    test('should handle removed current team by starting from first team', () => {
      gameManager.gameState.currentTurnTeamId = 'removed-team';
      gameManager.gameState.round = 1;

      const result = gameManager.skipToNextTeam();

      expect(result).toBe(true);
      expect(gameManager.gameState.currentTurnTeamId).toBe('team1');
      expect(gameManager.gameState.round).toBe(1);
    });

    test('should broadcast game state after skip', () => {
      gameManager.broadcastGameState = jest.fn();

      gameManager.skipToNextTeam();

      expect(gameManager.broadcastGameState).toHaveBeenCalled();
    });

    test('should reset transition state after delay', () => {
      gameManager.skipToNextTeam();

      expect(gameManager.isTransitioning).toBe(true);

      // Fast-forward time by 500ms
      jest.advanceTimersByTime(500);

      expect(gameManager.isTransitioning).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Team skip transition completed, actions now allowed');
    });
  });

  describe('endTurn', () => {
    test('should ignore endTurn when game has ended', () => {
      gameManager.gameState.phase = GamePhase.ENDED;

      const result = gameManager.endTurn();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Game has ended, ignoring endTurn call');
    });

    test('should ignore duplicate endTurn calls during transition', () => {
      gameManager.isTransitioning = true;

      const result = gameManager.endTurn();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Turn transition already in progress, ignoring duplicate endTurn call');
    });

    test('should end game when no teams remain', () => {
      gameManager.gameState.teams = [];
      gameManager.endGame = jest.fn();

      const result = gameManager.endTurn();

      expect(result).toBe(false);
      expect(gameManager.endGame).toHaveBeenCalledWith('no_teams_remaining');
    });

    test('should emit turn transition start event', () => {
      gameManager.endTurn();

      expect(mockIO.emit).toHaveBeenCalledWith(SOCKET_EVENTS.TURN_TRANSITION_START, {
        message: '正在切換回合，請稍等...'
      });
    });

    test('should advance to next team and increment round when wrapping', () => {
      gameManager.gameState.currentTurnTeamId = 'team2'; // Last team
      gameManager.gameState.round = 1;

      const result = gameManager.endTurn();

      expect(result).toBe(true);
      expect(gameManager.gameState.currentTurnTeamId).toBe('team1');
      expect(gameManager.gameState.round).toBe(2);
    });

    test('should broadcast game state before emitting turn end', () => {
      gameManager.broadcastGameState = jest.fn();

      gameManager.endTurn();

      expect(gameManager.broadcastGameState).toHaveBeenCalled();
    });

    test('should emit turn end event after delay', () => {
      gameManager.endTurn();

      // Initially, turn end should not be emitted
      expect(mockIO.emit).not.toHaveBeenCalledWith(SOCKET_EVENTS.TURN_END, expect.any(Object));

      // Fast-forward time by 300ms
      jest.advanceTimersByTime(300);

      expect(mockIO.emit).toHaveBeenCalledWith(SOCKET_EVENTS.TURN_END, {
        nextTeamId: 'team2',
        captainId: 'player2',
        captainName: 'Captain B',
        round: 1
      });
      expect(gameManager.isTransitioning).toBe(false);
    });

    test('should clear turn timer', () => {
      gameManager.turnTimer = setTimeout(() => {}, 1000);
      gameManager.clearTurnTimer = jest.fn();

      gameManager.endTurn();

      expect(gameManager.clearTurnTimer).toHaveBeenCalled();
    });
  });

  describe('broadcastGameState', () => {
    test('should include isTransitioning in broadcasted state', () => {
      gameManager.isTransitioning = true;

      gameManager.broadcastGameState();

      expect(mockIO.emit).toHaveBeenCalledWith(SOCKET_EVENTS.GAME_STATE_UPDATE, {
        ...gameManager.gameState,
        isTransitioning: true
      });
    });

    test('should broadcast with isTransitioning false when not transitioning', () => {
      gameManager.isTransitioning = false;

      gameManager.broadcastGameState();

      expect(mockIO.emit).toHaveBeenCalledWith(SOCKET_EVENTS.GAME_STATE_UPDATE, {
        ...gameManager.gameState,
        isTransitioning: false
      });
    });
  });

  describe('Race Condition Prevention', () => {
    test('should prevent concurrent skipToNextTeam calls', () => {
      // First call should succeed
      const result1 = gameManager.skipToNextTeam();
      expect(result1).toBe(true);
      expect(gameManager.isTransitioning).toBe(true);

      // Second call should fail
      const result2 = gameManager.skipToNextTeam();
      expect(result2).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Team transition already in progress, ignoring duplicate skipToNextTeam call');
    });

    test('should prevent concurrent endTurn calls', () => {
      // First call should succeed
      const result1 = gameManager.endTurn();
      expect(result1).toBe(true);
      expect(gameManager.isTransitioning).toBe(true);

      // Second call should fail
      const result2 = gameManager.endTurn();
      expect(result2).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Turn transition already in progress, ignoring duplicate endTurn call');
    });

    test('should prevent captain validation during any transition', () => {
      // Start transition
      gameManager.skipToNextTeam();
      expect(gameManager.isTransitioning).toBe(true);

      // Captain validation should fail
      const result = gameManager.validateCaptainSubmission('team1', 'player1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('turn_transition');
    });

    test('should allow operations after transition completes', () => {
      // Start transition
      gameManager.skipToNextTeam();
      expect(gameManager.isTransitioning).toBe(true);

      // Captain validation should fail during transition
      let result = gameManager.validateCaptainSubmission('team2', 'player2');
      expect(result.valid).toBe(false);

      // Complete transition
      jest.advanceTimersByTime(500);
      expect(gameManager.isTransitioning).toBe(false);

      // Captain validation should succeed after transition
      result = gameManager.validateCaptainSubmission('team2', 'player2');
      expect(result.valid).toBe(true);
    });
  });

  describe('endGame', () => {
    test('should reset isTransitioning when game ends', () => {
      gameManager.isTransitioning = true;

      gameManager.endGame('test_reason');

      expect(gameManager.isTransitioning).toBe(false);
      expect(gameManager.gameState.phase).toBe(GamePhase.ENDED);
    });

    test('should find winner with highest score', () => {
      gameManager.gameState.teams[0].score = 100;
      gameManager.gameState.teams[1].score = 150;

      gameManager.endGame('test_reason');

      expect(gameManager.gameState.winner).toEqual(gameManager.gameState.teams[1]);
    });

    test('should handle empty teams array gracefully', () => {
      gameManager.gameState.teams = [];

      gameManager.endGame('no_teams');

      expect(gameManager.gameState.winner).toBe(null);
    });
  });
});