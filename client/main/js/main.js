// Main Phaser configuration and game initialization

class GameApp {
    constructor() {
        this.socket = null;
        this.gameState = null;
        this.board = null;
        this.game = null;
        this.isHost = window.location.search.includes('host=true');
        
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupPhaser();
        this.setupUI();
        this.updateMobileUrl();
    }

    setupSocket() {
        this.socket = io();
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        // Game state events
        this.socket.on('game_state_update', (gameState) => {
            this.gameState = gameState;
            this.updateUI();
            
            if (this.game && this.game.scene.getScene('GameScene')) {
                this.game.scene.getScene('GameScene').updateGameState(gameState);
            }
        });

        this.socket.on('board_state', (board) => {
            this.board = board;
            
            if (this.game && this.game.scene.getScene('GameScene')) {
                this.game.scene.getScene('GameScene').setBoard(board);
            }
        });

        // Game flow events
        this.socket.on('game_start', (data) => {
            console.log('Game started!');
            this.game.scene.start('GameScene', { 
                gameState: data.gameState, 
                board: data.board 
            });
        });

        this.socket.on('dice_roll', (data) => {
            console.log('Dice rolled:', data);
            if (this.game && this.game.scene.getScene('GameScene')) {
                this.game.scene.getScene('GameScene').handleDiceRoll(data);
            }
        });

        this.socket.on('event_trigger', (data) => {
            console.log('Event triggered:', data);
            if (this.game && this.game.scene.getScene('GameScene')) {
                this.game.scene.getScene('GameScene').handleEventTrigger(data);
            }
        });

        this.socket.on('mini_game_start', (data) => {
            console.log('Mini-game started:', data);
            if (this.game && this.game.scene.getScene('GameScene')) {
                this.game.scene.getScene('GameScene').handleMiniGameStart(data);
            }
        });

        this.socket.on('mini_game_timer_start', (data) => {
            console.log('Mini-game timer started:', data);
            if (this.game && this.game.scene.getScene('GameScene')) {
                this.game.scene.getScene('GameScene').handleMiniGameTimerStart(data);
            }
        });

        this.socket.on('mini_game_result', (data) => {
            console.log('Mini-game result:', data);
            if (this.game && this.game.scene.getScene('GameScene')) {
                this.game.scene.getScene('GameScene').handleMiniGameResult(data);
            }
        });

        this.socket.on('score_update', (data) => {
            console.log('Score updated:', data);
            this.updateScoreBoard();
        });

        this.socket.on('timer_update', (data) => {
            this.updateTimer(data.timeLeft);
        });

        this.socket.on('teams_updated', (teams) => {
            console.log('Teams updated:', teams);
            this.updateScoreBoard();
        });

        this.socket.on('game_end', (data) => {
            console.log('Game ended:', data);
            this.showGameEndScreen(data);
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert(`錯誤: ${error.message}`);
        });
    }

    setupPhaser() {
        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight - 80, // Subtract header height
            parent: 'gameCanvas',
            backgroundColor: '#2c3e50',
            scene: [LobbyScene, GameScene],
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        this.game = new Phaser.Game(config);
        
        // Pass socket reference to scenes
        this.game.socket = this.socket;
    }

    setupUI() {
        // Host controls
        if (this.isHost) {
            document.getElementById('assignTeamsBtn').addEventListener('click', () => {
                this.socket.emit('team_assign');
            });

            document.getElementById('startGameBtn').addEventListener('click', () => {
                this.socket.emit('game_start');
            });

            document.getElementById('skipTurnBtn').addEventListener('click', () => {
                this.socket.emit('host_control', { action: 'skip_turn' });
            });

            document.getElementById('endGameBtn').addEventListener('click', () => {
                if (confirm('確定要結束遊戲嗎？')) {
                    this.socket.emit('host_control', { action: 'end_game' });
                }
            });
        } else {
            // Hide host controls for non-host users
            document.getElementById('hostControls').style.display = 'none';
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.game) {
                this.game.scale.resize(window.innerWidth, window.innerHeight - 80);
            }
        });
    }

    updateUI() {
        if (!this.gameState) return;

        this.updateScoreBoard();
        this.updateGameInfo();
        this.updateHostControls();
    }

    updateScoreBoard() {
        if (!this.gameState) return;

        const teamScoresContainer = document.getElementById('teamScores');
        
        if (this.gameState.teams.length === 0) {
            teamScoresContainer.innerHTML = `
                <div class="team-score">
                    <div class="team-info">
                        <span class="team-emoji">👥</span>
                        <span class="team-name">等待玩家加入...</span>
                    </div>
                    <span class="team-score-value">${Object.keys(this.gameState.players).length}/80</span>
                </div>
            `;
            return;
        }

        // Sort teams by score (descending)
        const sortedTeams = [...this.gameState.teams].sort((a, b) => b.score - a.score);
        
        teamScoresContainer.innerHTML = sortedTeams.map(team => {
            const isCurrentTurn = team.id === this.gameState.currentTurnTeamId;
            const memberCount = team.members.length;
            
            return `
                <div class="team-score ${isCurrentTurn ? 'current-turn' : ''}">
                    <div class="team-info">
                        <span class="team-emoji">${team.emoji}</span>
                        <div class="team-color" style="background-color: ${team.color}"></div>
                        <span class="team-name">隊伍 ${team.id.split('_')[1]} (${memberCount}人)</span>
                    </div>
                    <span class="team-score-value">${team.score}</span>
                </div>
            `;
        }).join('');
    }

    updateGameInfo() {
        if (!this.gameState) return;

        const currentTeamElement = document.getElementById('currentTeam');
        
        if (this.gameState.phase === 'lobby') {
            currentTeamElement.textContent = '大廳等待中...';
        } else if (this.gameState.phase === 'in_progress') {
            const currentTeam = this.gameState.teams.find(t => t.id === this.gameState.currentTurnTeamId);
            if (currentTeam) {
                currentTeamElement.textContent = `${currentTeam.emoji} 隊伍 ${currentTeam.id.split('_')[1]} 的回合`;
            }
        } else if (this.gameState.phase === 'ended') {
            currentTeamElement.textContent = '遊戲結束';
        }
    }

    updateTimer(timeLeft) {
        const timerElement = document.getElementById('turnTimer');
        const seconds = Math.ceil(timeLeft / 1000);
        
        if (seconds <= 0) {
            timerElement.textContent = '00';
            timerElement.style.color = '#ff6b6b';
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            if (seconds <= 10) {
                timerElement.style.color = '#ff6b6b';
            } else if (seconds <= 30) {
                timerElement.style.color = '#ffa500';
            } else {
                timerElement.style.color = '#4ecdc4';
            }
        }
    }

    updateHostControls() {
        if (!this.isHost || !this.gameState) return;

        const assignTeamsBtn = document.getElementById('assignTeamsBtn');
        const startGameBtn = document.getElementById('startGameBtn');
        const skipTurnBtn = document.getElementById('skipTurnBtn');
        const endGameBtn = document.getElementById('endGameBtn');

        const hasPlayers = Object.keys(this.gameState.players).length > 0;
        const hasTeams = this.gameState.teams.length > 0;
        const gameInProgress = this.gameState.phase === 'in_progress';

        assignTeamsBtn.disabled = !hasPlayers || gameInProgress;
        startGameBtn.disabled = !hasTeams || gameInProgress;
        skipTurnBtn.disabled = !gameInProgress;
        endGameBtn.disabled = !gameInProgress;
    }

    updateMobileUrl() {
        const mobileUrlElement = document.getElementById('mobileUrl');
        const baseUrl = window.location.origin;
        mobileUrlElement.textContent = `${baseUrl}/mobile`;
    }

    showGameEndScreen(data) {
        const gameStatus = document.getElementById('gameStatus');
        
        if (data.winner) {
            gameStatus.innerHTML = `
                <div style="text-align: center;">
                    <h2>🏆 遊戲結束！</h2>
                    <p>獲勝隊伍: ${data.winner.emoji} 隊伍 ${data.winner.id.split('_')[1]}</p>
                    <p>最終分數: ${data.winner.score} 分</p>
                </div>
            `;
        } else {
            gameStatus.innerHTML = `
                <div style="text-align: center;">
                    <h2>🏁 遊戲結束！</h2>
                    <p>遊戲因為 ${data.reason === 'no_teams_remaining' ? '沒有隊伍' : '其他原因'} 而結束</p>
                </div>
            `;
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
});