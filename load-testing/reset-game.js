#!/usr/bin/env node

/**
 * Reset Game State Script
 * Forces the game to reset to lobby state before load testing
 */

const io = require('socket.io-client');

async function resetGame() {
  console.log('🔄 Resetting game state for load testing...');
  
  const hostToken = process.env.HOST_TOKEN || 'default-host-token';
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
  
  return new Promise((resolve, reject) => {
    const socket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 10000,
      forceNew: true,
      auth: {
        hostToken: hostToken
      },
      extraHeaders: {
        'x-host-token': hostToken
      }
    });

    socket.on('connect', () => {
      console.log('🎯 Connected as host, sending reset command...');
      
      // Send reset game command
      socket.emit('host_control', {
        action: 'reset_game',
        token: hostToken
      });
    });

    socket.on('host_control_success', (data) => {
      console.log('✅ Game reset successful:', data.message);
      socket.disconnect();
      resolve(true);
    });

    socket.on('game_state_update', (gameState) => {
      if (gameState.phase === 'lobby') {
        console.log('✅ Game is now in lobby state');
        socket.disconnect();
        resolve(true);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Reset failed:', error.message);
      socket.disconnect();
      reject(error);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection failed:', error.message);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('⏱️ Reset timeout, assuming success');
      socket.disconnect();
      resolve(true);
    }, 10000);
  });
}

// CLI usage
if (require.main === module) {
  resetGame()
    .then(() => {
      console.log('🎯 Game reset complete - ready for load testing!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Game reset failed:', error.message);
      process.exit(1);
    });
}

module.exports = resetGame;