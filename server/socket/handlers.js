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

    // Handle team assignment (host only)
    socket.on(SOCKET_EVENTS.TEAM_ASSIGN, () => {
      try {
        const teams = gameManager.assignTeams();
        io.emit(SOCKET_EVENTS.TEAMS_UPDATED, teams);
        console.log('Teams assigned');
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
        const { teamId } = data;
        const result = gameManager.rollDice(teamId);
        console.log(`Team ${teamId} rolled: ${result.dice.join(', ')} (total: ${result.total})`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
      }
    });

    // Handle mini-game submissions
    socket.on(SOCKET_EVENTS.MINI_GAME_SUBMIT, (data) => {
      try {
        const { teamId, ...submission } = data;
        const result = gameManager.processMiniGameSubmission(teamId, submission);
        console.log(`Mini-game result for team ${teamId}:`, result);
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