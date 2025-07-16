// Mobile Game Interface Controller

class MobileGameApp {
    constructor() {
        this.socket = null;
        this.currentScreen = 'loadingScreen';
        this.playerData = null;
        this.gameState = null;
        this.teamData = null;
        
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.showScreen('loadingScreen');
        
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    setupSocket() {
        this.socket = io();
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
            
            // Auto-transition to join screen if not already joined
            if (this.currentScreen === 'loadingScreen' && !this.playerData) {
                this.showScreen('joinScreen');
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
            this.showError('連接中斷，請重新連接');
        });

        // Player events
        this.socket.on('join_success', (data) => {
            console.log('Join successful:', data);
            this.playerData = data.player;
            this.updatePlayerInfo();
            this.showScreen('lobbyScreen');
        });

        // Game state events
        this.socket.on('game_state_update', (gameState) => {
            console.log('Game state updated:', gameState);
            this.gameState = gameState;
            this.updateGameState();
        });

        this.socket.on('teams_updated', (teams) => {
            console.log('Teams updated:', teams);
            this.updateTeamInfo();
        });

        this.socket.on('game_start', (data) => {
            console.log('Game started!');
            this.showScreen('gameScreen');
            this.updateGameInterface();
        });

        // Game flow events
        this.socket.on('turn_start', (data) => {
            console.log('Turn started:', data);
            this.handleTurnStart(data);
        });

        this.socket.on('dice_roll', (data) => {
            console.log('Dice rolled:', data);
            this.handleDiceRoll(data);
        });

        this.socket.on('timer_update', (data) => {
            this.updateTimer(data.timeLeft);
        });

        this.socket.on('score_update', (data) => {
            console.log('Score updated:', data);
            this.updateScore(data);
        });

        this.socket.on('event_trigger', (data) => {
            console.log('Event triggered:', data);
            this.handleEventTrigger(data);
        });

        this.socket.on('mini_game_start', (data) => {
            console.log('Mini game started:', data);
            this.showMiniGame(data);
        });

        this.socket.on('game_end', (data) => {
            console.log('Game ended:', data);
            this.showGameEnd(data);
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError(error.message);
        });
    }

    setupEventListeners() {
        // Join form
        const joinForm = document.getElementById('joinForm');
        if (joinForm) {
            joinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleJoin();
            });
        }

        // Dice roll button
        const rollDiceBtn = document.getElementById('rollDiceBtn');
        if (rollDiceBtn) {
            rollDiceBtn.addEventListener('click', () => {
                this.rollDice();
            });
        }

        // Retry button
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.retry();
            });
        }

        // New game button
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    updateConnectionStatus(connected) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-item span:last-child');
        
        if (statusDot && statusText) {
            if (connected) {
                statusDot.classList.add('connected');
                statusText.textContent = '連接狀態: 已連接';
            } else {
                statusDot.classList.remove('connected');
                statusText.textContent = '連接狀態: 已斷線';
            }
        }
    }

    handleJoin() {
        const nickname = document.getElementById('nickname').value.trim();
        const department = document.getElementById('department').value;

        if (!nickname || !department) {
            alert('請填寫所有必填欄位');
            return;
        }

        // Disable form
        const submitBtn = document.querySelector('#joinForm button');
        submitBtn.disabled = true;
        submitBtn.textContent = '加入中...';

        // Send join request
        this.socket.emit('player_join', {
            nickname,
            department
        });
    }

    updatePlayerInfo() {
        if (!this.playerData) return;

        const nicknameEl = document.getElementById('playerNickname');
        const departmentEl = document.getElementById('playerDepartment');
        
        if (nicknameEl) nicknameEl.textContent = this.playerData.nickname;
        if (departmentEl) departmentEl.textContent = this.playerData.department;
    }

    updateGameState() {
        if (!this.gameState) return;

        // Update lobby info
        const totalPlayersEl = document.getElementById('totalPlayers');
        const totalTeamsEl = document.getElementById('totalTeams');
        const gamePhaseEl = document.getElementById('gamePhase');

        if (totalPlayersEl) {
            totalPlayersEl.textContent = Object.keys(this.gameState.players).length;
        }
        
        if (totalTeamsEl) {
            totalTeamsEl.textContent = this.gameState.teams.length;
        }
        
        if (gamePhaseEl) {
            const phaseText = {
                'lobby': '大廳等待',
                'in_progress': '遊戲進行中',
                'ended': '遊戲結束'
            };
            gamePhaseEl.textContent = phaseText[this.gameState.phase] || this.gameState.phase;
        }

        // Update team info
        this.updateTeamInfo();

        // Update game interface if in game
        if (this.gameState.phase === 'in_progress' && this.currentScreen === 'gameScreen') {
            this.updateGameInterface();
        }
    }

    updateTeamInfo() {
        if (!this.playerData || !this.gameState) return;

        const team = this.gameState.teams.find(t => 
            t.members.some(m => m.id === this.playerData.id)
        );

        if (team) {
            this.teamData = team;
            
            // Update lobby team display
            const playerTeamEl = document.getElementById('playerTeam');
            if (playerTeamEl) {
                playerTeamEl.textContent = `${team.emoji} 隊伍 ${team.id.split('_')[1]}`;
            }

            // Show team info card
            const teamInfoCard = document.getElementById('teamInfo');
            if (teamInfoCard) {
                teamInfoCard.classList.remove('hidden');
                
                document.getElementById('teamEmoji').textContent = team.emoji;
                document.getElementById('teamColor').style.backgroundColor = team.color;
                document.getElementById('teamName').textContent = `隊伍 ${team.id.split('_')[1]}`;
                document.getElementById('teamMembers').textContent = 
                    `成員: ${team.members.map(m => m.nickname).join(', ')}`;
                
                // Update abilities
                this.updateTeamAbilities(team.abilities);
            }

            // Update game screen team info
            this.updateGameTeamInfo();
        }
    }

    updateTeamAbilities(abilities) {
        const abilitiesContainer = document.getElementById('teamAbilities');
        if (!abilitiesContainer) return;

        const abilityNames = {
            tech: '技術',
            creative: '創意',
            comms: '溝通',
            crisis: '危機',
            ops: '營運',
            luck: '運氣'
        };

        abilitiesContainer.innerHTML = Object.entries(abilities)
            .filter(([key]) => key !== 'reroll')
            .map(([key, value]) => `
                <div class="ability-item">
                    <div class="ability-name">${abilityNames[key] || key}</div>
                    <div class="ability-value">${value}</div>
                </div>
            `).join('');
    }

    updateGameInterface() {
        if (!this.gameState || !this.teamData) return;

        const isMyTurn = this.gameState.currentTurnTeamId === this.teamData.id;
        
        // Update turn status
        const turnStatusEl = document.getElementById('turnStatus');
        if (turnStatusEl) {
            if (isMyTurn) {
                turnStatusEl.textContent = '🎯 您的回合！';
                turnStatusEl.style.color = '#2ecc71';
            } else {
                const currentTeam = this.gameState.teams.find(t => t.id === this.gameState.currentTurnTeamId);
                if (currentTeam) {
                    turnStatusEl.textContent = `${currentTeam.emoji} 隊伍 ${currentTeam.id.split('_')[1]} 的回合`;
                    turnStatusEl.style.color = '#f39c12';
                }
            }
        }

        // Show/hide interfaces
        const diceInterface = document.getElementById('diceInterface');
        const waitingInterface = document.getElementById('waitingInterface');
        const miniGameInterface = document.getElementById('miniGameInterface');

        if (isMyTurn) {
            this.showInterface('diceInterface');
        } else {
            this.showInterface('waitingInterface');
        }
    }

    updateGameTeamInfo() {
        if (!this.teamData) return;

        // Update current score
        const currentScoreEl = document.getElementById('currentScore');
        if (currentScoreEl) {
            currentScoreEl.textContent = this.teamData.score;
        }

        // Update team position
        const teamPositionEl = document.getElementById('teamPosition');
        if (teamPositionEl) {
            teamPositionEl.textContent = this.teamData.position || 0;
        }

        // Update reroll count
        const rerollCountEl = document.getElementById('rerollCount');
        if (rerollCountEl) {
            rerollCountEl.textContent = `重擲: ${this.teamData.abilities.reroll || 0}`;
        }
    }

    showInterface(interfaceId) {
        const interfaces = ['diceInterface', 'waitingInterface', 'miniGameInterface'];
        
        interfaces.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === interfaceId) {
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            }
        });
    }

    rollDice() {
        if (!this.teamData || this.gameState.currentTurnTeamId !== this.teamData.id) {
            return;
        }

        const rollBtn = document.getElementById('rollDiceBtn');
        rollBtn.disabled = true;
        rollBtn.textContent = '擲骰中...';

        this.socket.emit('dice_roll', { teamId: this.teamData.id });
    }

    handleDiceRoll(data) {
        if (data.teamId === this.teamData?.id) {
            // Show dice result
            const diceResultEl = document.getElementById('diceResult');
            const dice1El = document.getElementById('dice1');
            const dice2El = document.getElementById('dice2');
            const diceTotalEl = document.getElementById('diceTotal');

            if (diceResultEl && dice1El && dice2El && diceTotalEl) {
                dice1El.textContent = data.dice[0];
                dice2El.textContent = data.dice[1];
                diceTotalEl.textContent = data.total;
                diceResultEl.classList.remove('hidden');
            }

            // Reset roll button
            const rollBtn = document.getElementById('rollDiceBtn');
            rollBtn.disabled = false;
            rollBtn.textContent = '🎲 擲骰子';
        }

        // Update team position
        this.updateGameTeamInfo();
    }

    updateTimer(timeLeft) {
        const timerEl = document.getElementById('turnTimer');
        if (!timerEl) return;

        const seconds = Math.ceil(timeLeft / 1000);
        
        if (seconds <= 0) {
            timerEl.textContent = '00:00';
            timerEl.style.color = '#e74c3c';
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            if (seconds <= 10) {
                timerEl.style.color = '#e74c3c';
            } else if (seconds <= 30) {
                timerEl.style.color = '#f39c12';
            } else {
                timerEl.style.color = '#2ecc71';
            }
        }
    }

    updateScore(data) {
        if (data.teamId === this.teamData?.id) {
            // Update team data
            this.teamData.score = data.newScore;
            this.updateGameTeamInfo();

            // Show score change animation
            this.showScoreChange(data.pointsChanged, data.reason);
        }
    }

    showScoreChange(points, reason) {
        const scoreEl = document.getElementById('currentScore');
        if (!scoreEl) return;

        // Create temporary score change indicator
        const changeEl = document.createElement('div');
        changeEl.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            background: ${points > 0 ? '#2ecc71' : '#e74c3c'};
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 14px;
            font-weight: bold;
            transform: translateY(-100%);
            animation: scoreChange 2s ease-out forwards;
            z-index: 1000;
        `;
        changeEl.textContent = `${points > 0 ? '+' : ''}${points}`;

        const parentEl = scoreEl.parentElement;
        parentEl.style.position = 'relative';
        parentEl.appendChild(changeEl);

        // Add animation keyframes if not already added
        if (!document.querySelector('#scoreChangeAnimation')) {
            const style = document.createElement('style');
            style.id = 'scoreChangeAnimation';
            style.textContent = `
                @keyframes scoreChange {
                    0% {
                        opacity: 1;
                        transform: translateY(-100%);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-200%);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove after animation
        setTimeout(() => {
            if (changeEl.parentElement) {
                changeEl.parentElement.removeChild(changeEl);
            }
        }, 2000);
    }

    handleEventTrigger(data) {
        if (data.teamId === this.teamData?.id) {
            // Show event notification
            const waitingMessage = document.getElementById('waitingMessage');
            if (waitingMessage) {
                waitingMessage.textContent = `觸發事件: ${data.tile.name}`;
            }
        }
    }

    showMiniGame(data) {
        // This will be implemented with the MiniGames component
        this.showInterface('miniGameInterface');
        
        if (window.MiniGames) {
            const miniGameContent = document.getElementById('miniGameContent');
            window.MiniGames.load(data, miniGameContent, this.socket, this.teamData.id);
        }
    }

    showGameEnd(data) {
        const gameEndTitle = document.getElementById('gameEndTitle');
        const winnerDisplay = document.getElementById('winnerDisplay');
        const finalScoresList = document.getElementById('finalScoresList');

        if (gameEndTitle) {
            gameEndTitle.textContent = '🏆 遊戲結束！';
        }

        if (winnerDisplay) {
            winnerDisplay.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">${data.winner.emoji}</div>
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                    隊伍 ${data.winner.id.split('_')[1]} 獲勝！
                </div>
                <div style="font-size: 18px; color: #2ecc71;">
                    最終分數: ${data.winner.score} 分
                </div>
            `;
        }

        if (finalScoresList) {
            finalScoresList.innerHTML = data.finalScores
                .sort((a, b) => b.score - a.score)
                .map((team, index) => `
                    <div class="score-item">
                        <div>
                            <span style="margin-right: 10px;">${index + 1}.</span>
                            <span style="margin-right: 10px;">${team.emoji}</span>
                            <span>隊伍 ${team.teamId.split('_')[1]}</span>
                        </div>
                        <span style="font-weight: bold;">${team.score}</span>
                    </div>
                `).join('');
        }

        this.showScreen('endScreen');
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        this.showScreen('errorScreen');
    }

    retry() {
        window.location.reload();
    }
}

// Initialize the mobile app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileGameApp();
});