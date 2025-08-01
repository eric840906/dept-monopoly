// Game constants

const GAME_CONFIG = {
  MAX_PLAYERS: 120,
  MIN_TEAMS: 1,
  MAX_TEAMS: 6,
  TURN_TIME_LIMIT: 90000, // 90 seconds in milliseconds
  GAME_DURATION: 1800000, // 30 minutes in milliseconds (kept for backwards compatibility)
  BOARD_SIZE: 24,
  MAX_RUNS_PER_TEAM: 5, // Game ends after each team completes this many runs

  SCORING: {
    SUCCESS: 10,
    PARTIAL: 5,
    FAILURE: -10,
    STARTING_SCORE: 100,
  },

  MINI_GAME_TIME_LIMITS: {
    MULTIPLE_CHOICE: 30000,
    DRAG_DROP: 45000,
    FORMAT_MATCHING: 45000,
    TRUE_OR_FALSE: 20000,
  },

  // Time for players to read mini-game content before actual timer starts
  MINI_GAME_PREPARATION_TIME: 5000, // 5 seconds
}

const TEAM_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#FFB347', // Orange
  '#87CEEB', // Sky Blue
]

const TEAM_EMOJIS = ['🚀', '⚡', '🎯', '🌟', '🔥', '💎', '🎪', '🏆']

// Pre-configured teams that are created when server starts
const PREDEFINED_TEAMS = [
  {
    id: 'team_A',
    name: 'A隊',
    color: '#FF6B6B', // Red
    emoji: '🚀',
    image: '/images/teams/team_A.png',
    maxPlayers: 1, // Maximum 1 player per team
  },
  {
    id: 'team_B',
    name: 'B隊',
    color: '#4ECDC4', // Teal
    emoji: '⚡',
    image: '/images/teams/team_B.png',
    maxPlayers: 1,
  },
  {
    id: 'team_C',
    name: 'C隊',
    color: '#45B7D1', // Blue
    emoji: '🎯',
    image: '/images/teams/team_C.png',
    maxPlayers: 1,
  },
  {
    id: 'team_D',
    name: 'D隊',
    color: '#96CEB4', // Green
    emoji: '🌟',
    image: '/images/teams/team_D.png',
    maxPlayers: 1,
  },
  {
    id: 'team_E',
    name: 'E隊',
    color: '#FFEAA7', // Yellow
    emoji: '🔥',
    image: '/images/teams/team_E.png',
    maxPlayers: 1,
  },
  {
    id: 'team_F',
    name: 'F隊',
    color: '#DDA0DD', // Plum
    emoji: '💎',
    image: '/images/teams/team_F.png',
    maxPlayers: 1,
  },
]

const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Player events
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',

  // Game flow events
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  GAME_STATE_UPDATE: 'game_state_update',

  // Team events
  TEAM_JOIN: 'team_join',
  TEAM_LEAVE: 'team_leave',
  TEAMS_UPDATED: 'teams_updated',

  // Turn events
  DICE_ROLL: 'dice_roll',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  TURN_TRANSITION_START: 'turn_transition_start',
  CAPTAIN_CHANGE: 'captain_change',
  TIMER_UPDATE: 'timer_update',

  // Event tile events
  EVENT_TRIGGER: 'event_trigger',
  MINI_GAME_START: 'mini_game_start',
  MINI_GAME_SUBMIT: 'mini_game_submit',
  MINI_GAME_RESULT: 'mini_game_result',

  // Score events
  SCORE_UPDATE: 'score_update',

  // Host events
  HOST_CONTROL: 'host_control',

  // Error events
  ERROR: 'error',
}

const BOARD_LAYOUT = {
  SAFE_TILE_PERCENTAGE: 0.3,
  EVENT_TILE_PERCENTAGE: 0.7,
}

module.exports = {
  GAME_CONFIG,
  TEAM_COLORS,
  TEAM_EMOJIS,
  PREDEFINED_TEAMS,
  SOCKET_EVENTS,
  BOARD_LAYOUT,
}
