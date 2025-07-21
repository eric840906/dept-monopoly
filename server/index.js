const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const GameManager = require('./game/GameManager');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for main client
app.use('/js', express.static(path.join(__dirname, '../client/main/js')));
app.use('/scenes', express.static(path.join(__dirname, '../client/main/scenes')));
app.use('/ui', express.static(path.join(__dirname, '../client/main/ui')));
app.use('/sprites', express.static(path.join(__dirname, '../client/main/sprites')));

// Serve static files for mobile client
app.use('/mobile/js', express.static(path.join(__dirname, '../client/mobile/js')));
app.use('/mobile/styles', express.static(path.join(__dirname, '../client/mobile/styles')));
app.use('/mobile/components', express.static(path.join(__dirname, '../client/mobile/components')));

// Serve public assets
app.use(express.static(path.join(__dirname, '../public')));

// Serve main game screen
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/main/index.html'));
});

// Serve mobile interface
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/mobile/index.html'));
});


// Initialize game manager
const gameManager = new GameManager();

// Setup socket event handlers
setupSocketHandlers(io, gameManager);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🎮 Game server running on port ${PORT}`);
  console.log(`📱 Mobile interface: http://localhost:${PORT}/mobile`);
  console.log(`🖥️  Main screen: http://localhost:${PORT}`);
});