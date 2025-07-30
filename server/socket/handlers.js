const { SOCKET_EVENTS } = require('../../shared/constants');

// Security utilities
const validateInput = (data, schema) => {
  if (!data || typeof data !== 'object') return false
  
  for (const [key, validator] of Object.entries(schema)) {
    const value = data[key]
    if (!validator(value)) return false
  }
  return true
}

const sanitizeString = (str) => {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>'"&]/g, (match) => {
    const escape = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    }
    return escape[match]
  }).substring(0, 100) // Limit length
}

const authorizeHost = (socket) => {
  // Check for host token in environment or socket handshake
  const hostToken = process.env.HOST_TOKEN || 'default-host-token'
  const providedToken = socket.handshake.auth?.hostToken || socket.handshake.headers['x-host-token']
  
  console.log('🔐 Host authorization check:');
  console.log('  Expected token:', hostToken ? hostToken.substring(0, 8) + '...' : 'none');
  console.log('  Provided token:', providedToken ? providedToken.substring(0, 8) + '...' : 'none');
  console.log('  Auth object:', socket.handshake.auth);
  console.log('  Headers:', Object.keys(socket.handshake.headers).filter(k => k.includes('token')));
  
  const isAuthorized = socket.handshake.auth?.hostToken === hostToken || 
                      socket.handshake.headers['x-host-token'] === hostToken;
  
  console.log('  Authorization result:', isAuthorized ? '✅ AUTHORIZED' : '❌ DENIED');
  return isAuthorized;
}

// Rate limiting map
const rateLimitMap = new Map()
const checkRateLimit = (socketId, action, limit = 10, windowMs = 60000) => {
  const key = `${socketId}:${action}`
  const now = Date.now()
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  const entry = rateLimitMap.get(key)
  if (now > entry.resetTime) {
    entry.count = 1
    entry.resetTime = now + windowMs
    return true
  }
  
  if (entry.count >= limit) {
    return false
  }
  
  entry.count++
  return true
}

function setupSocketHandlers(io, gameManager) {
  gameManager.setIO(io);

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send current game state to new connection
    socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, gameManager.getGameState());
    socket.emit('board_state', gameManager.getBoard());

    // Handle player joining
    socket.on(SOCKET_EVENTS.PLAYER_JOIN, (data) => {
      try {
        // Rate limiting for join attempts
        if (!checkRateLimit(socket.id, 'player_join', 3, 60000)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '加入請求過於頻繁，請稍後再試' });
          return;
        }
        
        // Validate input
        if (!validateInput(data, {
          nickname: (val) => typeof val === 'string' && val.length > 0 && val.length <= 20,
          department: (val) => typeof val === 'string' && val.length > 0 && val.length <= 50
        })) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '無效的玩家資訊' });
          return;
        }
        
        const { nickname, department } = data;
        const sanitizedNickname = sanitizeString(nickname);
        const sanitizedDepartment = sanitizeString(department);
        
        const player = gameManager.addPlayer(socket.id, sanitizedNickname, sanitizedDepartment);
        
        socket.emit('join_success', { player });
        console.log(`Player joined: ${sanitizedNickname} (${sanitizedDepartment})`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });


    // Handle team joining
    socket.on(SOCKET_EVENTS.TEAM_JOIN, (data) => {
      try {
        // Rate limiting for team join attempts
        if (!checkRateLimit(socket.id, 'team_join', 5, 60000)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '加入隊伍請求過於頻繁，請稍後再試' });
          return;
        }
        
        // Validate input
        if (!validateInput(data, {
          teamId: (val) => typeof val === 'string' && val.length > 0 && val.length <= 50
        })) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '無效的隊伍ID' });
          return;
        }
        
        const { teamId } = data;
        const sanitizedTeamId = sanitizeString(teamId);
        console.log(`Player ${socket.id} attempting to join team: ${sanitizedTeamId}`);
        
        // Log available teams for debugging
        const availableTeams = gameManager.getGameState().teams;
        console.log(`Available teams: ${availableTeams.map(t => t.id).join(', ')}`);
        
        if (!sanitizedTeamId) {
          throw new Error('Team ID is required');
        }
        
        // Check if team exists before attempting to join
        const existingTeam = availableTeams.find(t => t.id === sanitizedTeamId);
        if (!existingTeam) {
          console.error(`Team not found: ${sanitizedTeamId}. Available teams: ${availableTeams.map(t => t.id).join(', ')}`);
          throw new Error(`Team not found: ${sanitizedTeamId}. Please check the team link or try refreshing the page.`);
        }
        
        const team = gameManager.joinTeam(socket.id, sanitizedTeamId);
        io.emit(SOCKET_EVENTS.TEAMS_UPDATED, gameManager.getGameState().teams);
        socket.emit('team_joined', { team });
        console.log(`Player ${socket.id} successfully joined team ${team.name} (${team.id})`);
      } catch (error) {
        console.error(`Team join error for player ${socket.id}:`, error.message);
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle team leaving
    socket.on(SOCKET_EVENTS.TEAM_LEAVE, () => {
      try {
        gameManager.leaveTeam(socket.id);
        io.emit(SOCKET_EVENTS.TEAMS_UPDATED, gameManager.getGameState().teams);
        console.log(`Player ${socket.id} left their team`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle game start (host only)
    socket.on(SOCKET_EVENTS.GAME_START, () => {
      try {
        gameManager.startGame();
        console.log('Game started');
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle dice roll
    socket.on(SOCKET_EVENTS.DICE_ROLL, (data) => {
      try {
        // Rate limiting for dice rolls
        if (!checkRateLimit(socket.id, 'dice_roll', 3, 10000)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '擲骰子過於頻繁，請稍後再試' });
          return;
        }
        
        // Validate input
        if (!validateInput(data, {
          teamId: (val) => typeof val === 'string' && val.length > 0,
          playerId: (val) => typeof val === 'string' && val.length > 0
        })) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '無效的擲骰子請求' });
          return;
        }
        
        const { teamId, playerId } = data;
        const sanitizedTeamId = sanitizeString(teamId);
        const sanitizedPlayerId = sanitizeString(playerId);
        
        // Validate that the player is the current captain
        const isValidCaptain = gameManager.validateCaptainSubmission(sanitizedTeamId, sanitizedPlayerId);
        if (!isValidCaptain) {
          console.warn(`Non-captain player ${sanitizedPlayerId} attempted to roll dice for team ${sanitizedTeamId}`);
          socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "只有隊長可以擲骰子，請與隊長討論後由隊長操作" 
          });
          return;
        }
        
        const result = gameManager.rollDice(sanitizedTeamId);
        console.log(`Team ${sanitizedTeamId} captain ${sanitizedPlayerId} rolled: ${result.dice.join(', ')} (total: ${result.total})`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle movement complete
    socket.on('movement_complete', (data) => {
      try {
        const { teamId, position } = data;
        gameManager.handleMovementComplete(teamId, position);
        console.log(`Team ${teamId} movement complete at position ${position}`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle mini-game ready confirmation
    socket.on('mini_game_ready', (data) => {
      try {
        const { teamId } = data;
        const confirmed = gameManager.confirmMiniGameReady(teamId);
        if (!confirmed) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'No mini-game waiting for this team' });
        }
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle mini-game submissions
    socket.on(SOCKET_EVENTS.MINI_GAME_SUBMIT, (data) => {
      try {
        // Rate limiting for submissions
        if (!checkRateLimit(socket.id, 'mini_game_submit', 3, 10000)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '提交過於頻繁，請稍後再試' });
          return;
        }
        
        // Validate basic structure
        if (!validateInput(data, {
          teamId: (val) => typeof val === 'string' && val.length > 0,
          playerId: (val) => typeof val === 'string' && val.length > 0
        })) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '無效的提交請求' });
          return;
        }
        
        const { teamId, playerId, ...submission } = data;
        const sanitizedTeamId = sanitizeString(teamId);
        const sanitizedPlayerId = sanitizeString(playerId);
        
        // Sanitize submission data
        const sanitizedSubmission = {};
        for (const [key, value] of Object.entries(submission)) {
          if (typeof value === 'string') {
            sanitizedSubmission[key] = sanitizeString(value);
          } else {
            sanitizedSubmission[key] = value;
          }
        }
        
        // Validate that the submitting player is the current captain
        const isValidCaptain = gameManager.validateCaptainSubmission(sanitizedTeamId, sanitizedPlayerId);
        if (!isValidCaptain) {
          console.warn(`Non-captain player ${sanitizedPlayerId} attempted to submit for team ${sanitizedTeamId}`);
          socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "只有隊長可以提交答案，請與隊長討論後由隊長提交" 
          });
          return;
        }
        
        const result = gameManager.processMiniGameSubmission(sanitizedTeamId, sanitizedSubmission);
        console.log(`Mini-game result for team ${sanitizedTeamId} (captain: ${sanitizedPlayerId}):`, result);
      } catch (error) {
        console.error('Mini-game submission error:', error);
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
        // End turn anyway to prevent game from getting stuck
        gameManager.endTurn();
      }
    });

    // Handle host controls
    socket.on(SOCKET_EVENTS.HOST_CONTROL, (data) => {
      try {
        // Add rate limiting check
        if (!checkRateLimit(socket.id, 'host_control', 5, 60000)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '操作過於頻繁，請稍後再試' });
          return;
        }
        
        // Add host authorization
        if (!authorizeHost(socket)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '未授權的主持人操作' });
          return;
        }
        
        // Validate input structure
        if (!validateInput(data, {
          action: (val) => typeof val === 'string' && val.length > 0 && val.length < 50
        })) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '無效的操作請求' });
          return;
        }
        
        const { action, payload } = data;
        const sanitizedAction = sanitizeString(action);
        
        switch (sanitizedAction) {
          case 'skip_turn':
            gameManager.endTurn();
            break;
          case 'adjust_score':
            if (!payload || !validateInput(payload, {
              teamId: (val) => typeof val === 'string' && val.length > 0,
              points: (val) => typeof val === 'number' && val >= -1000 && val <= 1000,
              reason: (val) => typeof val === 'string' && val.length <= 100
            })) {
              socket.emit(SOCKET_EVENTS.ERROR, { message: '無效的積分調整參數' });
              return;
            }
            const { teamId, points, reason } = payload;
            gameManager.updateScore(teamId, points, sanitizeString(reason));
            break;
          case 'end_game':
            gameManager.endGame('host_ended');
            break;
          case 'reset_game':
            gameManager.resetGame();
            break;
          default:
            throw new Error(`Unknown host action: ${sanitizedAction}`);
        }
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`Player disconnected: ${socket.id}`);
      gameManager.removePlayer(socket.id);
    });
  });
}

module.exports = { setupSocketHandlers };