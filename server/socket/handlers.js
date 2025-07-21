const { SOCKET_EVENTS } = require('../../shared/constants');

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
        const { nickname, department } = data;
        const player = gameManager.addPlayer(socket.id, nickname, department);
        
        socket.emit('join_success', { player });
        console.log(`Player joined: ${nickname} (${department})`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });


    // Handle team joining
    socket.on(SOCKET_EVENTS.TEAM_JOIN, (data) => {
      try {
        const { teamId } = data;
        console.log(`Player ${socket.id} attempting to join team: ${teamId}`);
        
        // Log available teams for debugging
        const availableTeams = gameManager.getGameState().teams;
        console.log(`Available teams: ${availableTeams.map(t => t.id).join(', ')}`);
        
        if (!teamId) {
          throw new Error('Team ID is required');
        }
        
        // Check if team exists before attempting to join
        const existingTeam = availableTeams.find(t => t.id === teamId);
        if (!existingTeam) {
          console.error(`Team not found: ${teamId}. Available teams: ${availableTeams.map(t => t.id).join(', ')}`);
          throw new Error(`Team not found: ${teamId}. Please check the team link or try refreshing the page.`);
        }
        
        const team = gameManager.joinTeam(socket.id, teamId);
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
        const { teamId, playerId } = data;
        
        // Validate that the player is the current captain
        const isValidCaptain = gameManager.validateCaptainSubmission(teamId, playerId);
        if (!isValidCaptain) {
          console.warn(`Non-captain player ${playerId} attempted to roll dice for team ${teamId}`);
          socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "只有隊長可以擲骰子，請與隊長討論後由隊長操作" 
          });
          return;
        }
        
        const result = gameManager.rollDice(teamId);
        console.log(`Team ${teamId} captain ${playerId} rolled: ${result.dice.join(', ')} (total: ${result.total})`);
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
        const { teamId, playerId, ...submission } = data;
        
        // Validate that the submitting player is the current captain
        const isValidCaptain = gameManager.validateCaptainSubmission(teamId, playerId);
        if (!isValidCaptain) {
          console.warn(`Non-captain player ${playerId} attempted to submit for team ${teamId}`);
          socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "只有隊長可以提交答案，請與隊長討論後由隊長提交" 
          });
          return;
        }
        
        const result = gameManager.processMiniGameSubmission(teamId, submission);
        console.log(`Mini-game result for team ${teamId} (captain: ${playerId}):`, result);
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
        const { action, payload } = data;
        
        switch (action) {
          case 'skip_turn':
            gameManager.endTurn();
            break;
          case 'adjust_score':
            const { teamId, points, reason } = payload;
            gameManager.updateScore(teamId, points, reason);
            break;
          case 'end_game':
            gameManager.endGame('host_ended');
            break;
          case 'reset_game':
            gameManager.resetGame();
            break;
          default:
            throw new Error(`Unknown host action: ${action}`);
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