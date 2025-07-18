// Shared data structures for the game

const GamePhase = {
  LOBBY: 'lobby',
  IN_PROGRESS: 'in_progress',
  ENDED: 'ended'
};

const AbilityType = {
  TECH: 'tech',
  CREATIVE: 'creative',
  COMMS: 'comms',
  CRISIS: 'crisis',
  OPS: 'ops',
  LUCK: 'luck'
};

const MiniGameType = {
  MULTIPLE_CHOICE: 'multiple_choice',
  DRAG_DROP: 'drag_drop',
  FORMAT_MATCHING: 'format_matching',
  TEAM_PAIRING: 'team_pairing',
  RANDOM_EVENT: 'random_event'
};

const TileType = {
  EVENT: 'event',
  SAFE: 'safe',
  START: 'start'
};

// Factory functions for creating data structures
function createPlayer(id, nickname, department) {
  return {
    id,
    nickname,
    department,
    teamId: null,
    isConnected: true
  };
}

function createTeam(id, color, emoji) {
  return {
    id,
    color,
    emoji,
    members: [],
    currentCaptainId: null, // ID of current captain for mini-games
    captainRotationIndex: 0, // Index for rotating captains
    abilities: {
      tech: Math.floor(Math.random() * 6) + 1,
      creative: Math.floor(Math.random() * 6) + 1,
      comms: Math.floor(Math.random() * 6) + 1,
      crisis: Math.floor(Math.random() * 6) + 1,
      ops: Math.floor(Math.random() * 6) + 1,
      luck: Math.floor(Math.random() * 6) + 1,
      reroll: 3
    },
    score: 100,
    position: 0,
    isEliminated: false
  };
}

function createGameState() {
  return {
    phase: GamePhase.LOBBY,
    teams: [],
    players: {},
    currentTurnTeamId: null,
    turnTimer: 0,
    round: 1,
    maxRounds: 15,
    boardSize: 28,
    isGameStarted: false,
    winner: null
  };
}

function createTile(index, type, event = null) {
  return {
    index,
    type,
    event,
    name: type === TileType.START ? '起點' : 
          type === TileType.SAFE ? `安全格 ${index}` : 
          `事件格 ${index}`
  };
}

module.exports = {
  GamePhase,
  AbilityType,
  MiniGameType,
  TileType,
  createPlayer,
  createTeam,
  createGameState,
  createTile
};