// Game constants

const GAME_CONFIG = {
  MAX_PLAYERS: 80,
  MIN_TEAMS: 1,
  MAX_TEAMS: 1,
  TURN_TIME_LIMIT: 90000, // 90 seconds in milliseconds
  GAME_DURATION: 1800000, // 30 minutes in milliseconds
  BOARD_SIZE: 24,

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
    TEAM_PAIRING: 60000,
    RANDOM_EVENT: 15000,
  },
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
  TEAM_ASSIGN: 'team_assign',
  TEAMS_UPDATED: 'teams_updated',

  // Turn events
  DICE_ROLL: 'dice_roll',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
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
  SOCKET_EVENTS,
  BOARD_LAYOUT,
}
