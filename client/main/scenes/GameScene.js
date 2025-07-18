class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.gameState = null;
        this.board = null;
        this.boardTiles = [];
        this.teamTokens = {};
        this.boardRadius = 300;
        this.centerX = 0;
        this.centerY = 0;
    }

    preload() {
        // Create colored rectangles for different tile types
        this.createTileTextures();
        this.createTokenTextures();
    }

    create(data) {
        const { width, height } = this.scale;
        this.centerX = width / 2;
        this.centerY = height / 2;
        
        if (data) {
            this.gameState = data.gameState;
            this.board = data.board;
        }
        
        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x34495e);
        
        // Create the board
        this.createBoard();
        
        // Create team tokens
        this.createTeamTokens();
        
        // Add board title
        this.add.text(this.centerX, 50, '', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }

    createTileTextures() {
        // Create textures for different tile types
        const graphics = this.add.graphics();
        
        // Safe tile (green)
        graphics.fillStyle(0x2ecc71);
        graphics.fillRect(0, 0, 60, 60);
        graphics.generateTexture('safe-tile', 60, 60);
        
        // Event tile (orange)
        graphics.clear();
        graphics.fillStyle(0xe67e22);
        graphics.fillRect(0, 0, 60, 60);
        graphics.generateTexture('event-tile', 60, 60);
        
        // Chance tile (purple)
        graphics.clear();
        graphics.fillStyle(0x9b59b6);
        graphics.fillRect(0, 0, 60, 60);
        graphics.generateTexture('chance-tile', 60, 60);
        
        // Start tile (blue)
        graphics.clear();
        graphics.fillStyle(0x3498db);
        graphics.fillRect(0, 0, 60, 60);
        graphics.generateTexture('start-tile', 60, 60);
        
        graphics.destroy();
    }

    createTokenTextures() {
        // Create colored circle textures for team tokens
        const graphics = this.add.graphics();
        
        const colors = [
            0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4, 
            0xFFEAA7, 0xDDA0DD, 0xFFB347, 0x87CEEB
        ];
        
        colors.forEach((color, index) => {
            graphics.clear();
            graphics.fillStyle(color);
            graphics.fillCircle(15, 15, 15);
            graphics.lineStyle(3, 0xffffff);
            graphics.strokeCircle(15, 15, 15);
            graphics.generateTexture(`team-token-${index}`, 30, 30);
        });
        
        graphics.destroy();
    }

    createBoard() {
        if (!this.board) return;
        
        this.boardTiles = [];
        const tileCount = this.board.length;
        const angleStep = (2 * Math.PI) / tileCount;
        
        this.board.forEach((tile, index) => {
            const angle = index * angleStep - Math.PI / 2; // Start from top
            const x = this.centerX + Math.cos(angle) * this.boardRadius;
            const y = this.centerY + Math.sin(angle) * this.boardRadius;
            
            // Choose texture based on tile type
            let texture;
            switch (tile.type) {
                case 'start':
                    texture = 'start-tile';
                    break;
                case 'safe':
                    texture = 'safe-tile';
                    break;
                case 'event':
                    texture = 'event-tile';
                    break;
                case 'chance':
                    texture = 'chance-tile';
                    break;
                default:
                    texture = 'safe-tile';
            }
            
            // Create tile sprite
            const tileSprite = this.add.image(x, y, texture);
            tileSprite.setDisplaySize(50, 50);
            
            // Add tile number
            const tileNumber = this.add.text(x, y, index.toString(), {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            });
            tileNumber.setOrigin(0.5);
            
            // Add tile name below (for important tiles)
            if (tile.type === 'start') {
                const tileName = this.add.text(x, y + 35, '起點', {
                    fontSize: '10px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    align: 'center'
                });
                tileName.setOrigin(0.5);
            } else if (tile.type === 'chance') {
                const tileName = this.add.text(x, y + 35, '機會', {
                    fontSize: '10px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    align: 'center'
                });
                tileName.setOrigin(0.5);
            }
            
            this.boardTiles.push({
                sprite: tileSprite,
                number: tileNumber,
                tile: tile,
                x: x,
                y: y,
                index: index
            });
        });
        
        // Add center logo/title
        const centerBg = this.add.circle(this.centerX, this.centerY, 100, 0x2c3e50, 0.8);
        const centerText = this.add.text(this.centerX, this.centerY, '🎯\nMTO\n體驗營', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 5
        });
        centerText.setOrigin(0.5);
    }

    createTeamTokens() {
        if (!this.gameState || !this.gameState.teams) return;
        
        this.teamTokens = {};
        
        this.gameState.teams.forEach((team, index) => {
            // Only create token if team has members
            if (!team.members || team.members.length === 0) {
                console.log(`Skipping token creation for empty team: ${team.id}`);
                return;
            }
            
            const position = team.position || 0;
            const tileData = this.boardTiles[position];
            
            if (tileData) {
                // Calculate position with slight offset for multiple teams on same tile
                const offsetX = (index % 2) * 20 - 10;
                const offsetY = Math.floor(index / 2) * 20 - 10;
                
                const token = this.add.image(
                    tileData.x + offsetX, 
                    tileData.y + offsetY, 
                    `team-token-${index}`
                );
                token.setDisplaySize(30, 30);
                
                // Add team emoji as text overlay
                const emoji = this.add.text(
                    tileData.x + offsetX, 
                    tileData.y + offsetY, 
                    team.emoji, {
                    fontSize: '16px',
                    align: 'center'
                });
                emoji.setOrigin(0.5);
                
                this.teamTokens[team.id] = {
                    token: token,
                    emoji: emoji,
                    team: team
                };
                
                console.log(`Created token for team: ${team.id} with ${team.members.length} members`);
            }
        });
    }

    updateGameState(gameState) {
        this.gameState = gameState;
        this.updateTeamTokens();
    }

    setBoard(board) {
        this.board = board;
        if (this.boardTiles.length === 0) {
            this.createBoard();
        }
    }

    updateTeamTokens() {
        if (!this.gameState || !this.gameState.teams) return;
        
        // Get current team IDs from game state
        const currentTeamIds = new Set(this.gameState.teams.map(team => team.id));
        
        // Remove tokens for teams that no longer exist
        Object.keys(this.teamTokens).forEach(teamId => {
            if (!currentTeamIds.has(teamId)) {
                console.log(`Removing token for deleted team: ${teamId}`);
                const token = this.teamTokens[teamId];
                if (token.token) token.token.destroy();
                if (token.emoji) token.emoji.destroy();
                delete this.teamTokens[teamId];
            }
        });
        
        // Update existing tokens and create new ones if needed
        this.gameState.teams.forEach((team, index) => {
            if (!this.teamTokens[team.id]) {
                // Create new token for new team
                this.createTeamToken(team, index);
            } else {
                // Update existing token position
                this.updateTeamTokenPosition(team, index);
            }
        });
    }

    createTeamToken(team, index) {
        // Only create token if team has members
        if (!team.members || team.members.length === 0) {
            console.log(`Skipping token creation for empty team: ${team.id}`);
            return;
        }
        
        const position = team.position || 0;
        const tileData = this.boardTiles[position];
        
        if (!tileData) return;
        
        // Calculate position with slight offset for multiple teams on same tile
        const offsetX = (index % 2) * 20 - 10;
        const offsetY = Math.floor(index / 2) * 20 - 10;
        
        const token = this.add.image(
            tileData.x + offsetX, 
            tileData.y + offsetY, 
            `team-token-${index}`
        );
        token.setDisplaySize(30, 30);
        
        // Add team emoji as text overlay
        const emoji = this.add.text(
            tileData.x + offsetX, 
            tileData.y + offsetY, 
            team.emoji, {
            fontSize: '16px',
            align: 'center'
        });
        emoji.setOrigin(0.5);
        
        this.teamTokens[team.id] = {
            token: token,
            emoji: emoji,
            team: team
        };
        
        console.log(`Created token for team: ${team.id} with ${team.members.length} members`);
    }

    updateTeamTokenPosition(team, index) {
        const token = this.teamTokens[team.id];
        if (!token || !this.boardTiles[team.position]) return;
        
        const tileData = this.boardTiles[team.position];
        const offsetX = (index % 2) * 20 - 10;
        const offsetY = Math.floor(index / 2) * 20 - 10;
        
        // Animate token movement
        this.tweens.add({
            targets: [token.token, token.emoji],
            x: tileData.x + offsetX,
            y: tileData.y + offsetY,
            duration: 1000,
            ease: 'Power2'
        });
    }

    updateTeamPositions() {
        // Legacy function - now using updateTeamTokens
        this.updateTeamTokens();
    }

    handleDiceRoll(data) {
        const { teamId, dice, total, oldPosition, newPosition, landedTile } = data;
        
        console.log(`Team ${teamId} rolled ${dice.join(' + ')} = ${total}`);
        console.log(`Moved from position ${oldPosition} to ${newPosition}`);
        console.log(`Landed on: ${landedTile.name} (${landedTile.type})`);
        
        // Show dice roll animation
        this.showDiceRoll(dice, total);
        
        // Animate token movement and handle events after completion
        const token = this.teamTokens[teamId];
        if (token) {
            this.animateTokenMovement(token, oldPosition, newPosition, () => {
                // Movement complete - notify server to handle tile effects
                this.game.socket.emit('movement_complete', {
                    teamId: teamId,
                    position: newPosition
                });
            });
        } else {
            // No token to animate, directly notify server
            this.game.socket.emit('movement_complete', {
                teamId: teamId,
                position: newPosition
            });
        }
        
        // Show tile effect animation (visual only, events handled after movement)
        if (landedTile.type === 'event') {
            this.showTileEffect(newPosition, landedTile);
        }
    }

    handleEventTrigger(data) {
        const { teamId, tile, eventType } = data;
        console.log(`Event triggered for team ${teamId}: ${eventType}`);
        
        // Show event notification on main screen
        this.showEventNotification(teamId, tile, eventType);
    }

    handleMiniGameStart(data) {
        const { teamId, eventType, timeLimit, captainName } = data;
        console.log(`Mini-game started for team ${teamId}: ${eventType}, captain: ${captainName}`);
        
        // Store the complete game data for later use
        this.pendingMiniGameData = data;
        
        // Show mini-game notification on main screen with captain info
        this.showMiniGameNotification(teamId, eventType, timeLimit, captainName);
    }

    handleMiniGameResult(data) {
        const { teamId, score, feedback, success } = data;
        console.log(`Mini-game result for team ${teamId}: ${score} points`);
        
        // Show result notification on main screen
        this.showMiniGameResult(teamId, score, feedback, success);
    }

    handleChanceCard(data) {
        const { teamId, chanceCard, newScore, newPosition } = data;
        console.log(`Chance card drawn by team ${teamId}:`, chanceCard);
        
        // Show chance card on main screen
        this.showChanceCard(teamId, chanceCard, newScore, newPosition);
    }

    showDiceRoll(dice, total) {
        const diceText = this.add.text(this.centerX, this.centerY - 50, 
            `🎲 ${dice[0]} + ${dice[1]} = ${total}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#2c3e50',
            padding: { x: 20, y: 10 }
        });
        diceText.setOrigin(0.5);
        
        // Animate and remove
        this.tweens.add({
            targets: diceText,
            alpha: 0,
            y: this.centerY - 100,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                diceText.destroy();
            }
        });
    }

    animateTokenMovement(token, oldPosition, newPosition, onComplete = null) {
        // Create a path for the token to follow around the board
        const steps = [];
        const totalSteps = newPosition >= oldPosition ? 
            (newPosition - oldPosition) : 
            (this.boardTiles.length - oldPosition + newPosition);
        
        for (let i = 1; i <= totalSteps; i++) {
            const pos = (oldPosition + i) % this.boardTiles.length;
            const tileData = this.boardTiles[pos];
            steps.push({ x: tileData.x, y: tileData.y });
        }
        
        // Animate along the path
        let currentStep = 0;
        const moveToNextStep = () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                this.tweens.add({
                    targets: [token.token, token.emoji],
                    x: step.x,
                    y: step.y,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => {
                        currentStep++;
                        if (currentStep < steps.length) {
                            moveToNextStep();
                        } else {
                            // Movement complete - call callback if provided
                            if (onComplete) {
                                onComplete();
                            }
                        }
                    }
                });
            }
        };
        
        moveToNextStep();
    }

    showTileEffect(position, tile) {
        const tileData = this.boardTiles[position];
        if (!tileData) return;
        
        // Create effect animation
        const effect = this.add.circle(tileData.x, tileData.y, 30, 0xf39c12, 0.7);
        
        this.tweens.add({
            targets: effect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                effect.destroy();
            }
        });
        
        // Show event name
        const eventText = this.add.text(tileData.x, tileData.y - 60, 
            `⚡ ${tile.name}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#e67e22',
            padding: { x: 10, y: 5 }
        });
        eventText.setOrigin(0.5);
        
        this.tweens.add({
            targets: eventText,
            alpha: 0,
            y: tileData.y - 100,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                eventText.destroy();
            }
        });
    }

    showEventNotification(teamId, tile, eventType) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        // Create notification banner
        const notification = this.add.rectangle(
            this.centerX, 
            100, 
            600, 
            80, 
            0x3498db, 
            0.9
        );
        notification.setStrokeStyle(3, 0x2980b9);

        const notificationText = this.add.text(
            this.centerX, 
            100,
            `⚡ ${team.emoji} 隊伍 ${team.id.split('_')[1]} 觸發事件！\n${this.getEventName(eventType)}`,
            {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 5
            }
        );
        notificationText.setOrigin(0.5);

        // Animate notification
        notification.setAlpha(0);
        notificationText.setAlpha(0);

        this.tweens.add({
            targets: [notification, notificationText],
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        // Auto-hide after 3 seconds
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: [notification, notificationText],
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    notification.destroy();
                    notificationText.destroy();
                }
            });
        });
    }

    showMiniGameNotification(teamId, eventType, timeLimit, captainName) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        // Clean up any existing banner first
        this.hideMiniGameBanner();

        const timeInSeconds = Math.ceil(timeLimit / 1000);

        // Create mini-game banner
        const banner = this.add.rectangle(
            this.centerX, 
            this.centerY, 
            550, 
            140, 
            0xe74c3c, 
            0.95
        );
        banner.setStrokeStyle(4, 0xc0392b);

        const captainDisplay = captainName ? `🎯 隊長：${captainName}` : '等待隊長指定';
        
        const bannerText = this.add.text(
            this.centerX, 
            this.centerY,
            `🎮 小遊戲準備中...\n${team.emoji} 隊伍 ${team.id.split('_')[1]}\n${this.getEventName(eventType)}\n${captainDisplay}\n等待介面載入完成`,
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 6
            }
        );
        bannerText.setOrigin(0.5);

        // Pulse animation
        this.tweens.add({
            targets: [banner, bannerText],
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Store reference for cleanup and update
        this.currentMiniGameBanner = { banner, bannerText, teamId, eventType, timeLimit };
    }

    handleMiniGameTimerStart(data) {
        const { teamId, gameData } = data;
        console.log(`Mini-game timer starting for team ${teamId}`, gameData);
        
        // Hide the preparation banner first
        this.hideMiniGameBanner();
        
        // Use the stored game data from mini_game_start if gameData is missing
        const actualGameData = gameData || this.pendingMiniGameData;
        
        // Small delay to ensure banner cleanup, then display mini-game interface
        this.time.delayedCall(100, () => {
            if (actualGameData) {
                console.log('Displaying mini-game interface with data:', actualGameData);
                this.displayMiniGameInterface(teamId, actualGameData);
            } else {
                console.warn('No gameData received from either source, cannot display mini-game interface');
                // Fallback: at least show that the timer started
                this.showMiniGameFallback(teamId);
            }
        });
        
        // Clear the pending data after use
        this.pendingMiniGameData = null;
    }

    showMiniGameFallback(teamId) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        // Create a simple fallback display
        const container = this.add.container(this.centerX, this.centerY);
        
        const background = this.add.rectangle(0, 0, 600, 300, 0x2c3e50, 0.95);
        background.setStrokeStyle(4, 0x3498db);
        container.add(background);

        const headerText = this.add.text(0, -100, 
            `${team.emoji} 隊伍 ${team.id.split('_')[1]} - 小遊戲進行中`, 
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            }
        );
        headerText.setOrigin(0.5);
        container.add(headerText);

        const statusText = this.add.text(0, -50, 
            '🎮 遊戲界面載入中...', 
            {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#f39c12',
                align: 'center'
            }
        );
        statusText.setOrigin(0.5);
        container.add(statusText);

        // Store for cleanup
        this.currentMiniGameDisplay = { container };
    }

    displayMiniGameInterface(teamId, gameData) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        // Clear any existing mini-game display and banner
        this.hideMiniGameDisplay();
        this.hideMiniGameBanner();

        // Create main container for mini-game
        const container = this.add.container(this.centerX, this.centerY);
        
        // Add background
        const background = this.add.rectangle(0, 0, 800, 600, 0x2c3e50, 0.95);
        background.setStrokeStyle(4, 0x3498db);
        container.add(background);

        // Add team header
        const teamHeader = this.add.text(0, -280, 
            `${team.emoji} 隊伍 ${team.id.split('_')[1]} - ${this.getEventName(gameData.eventType)}`, 
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            }
        );
        teamHeader.setOrigin(0.5);
        container.add(teamHeader);

        // Add timer display
        const timerText = this.add.text(0, -240, 
            `⏱️ 時間: ${Math.ceil(gameData.timeLimit / 1000)} 秒`, 
            {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#e74c3c',
                align: 'center'
            }
        );
        timerText.setOrigin(0.5);
        container.add(timerText);

        // Display specific mini-game content
        this.renderMiniGameContent(container, gameData);

        // Store reference for cleanup
        this.currentMiniGameDisplay = { container, timerText, gameData };

        // Start timer countdown
        this.startMiniGameTimer(gameData.timeLimit);
    }

    renderMiniGameContent(container, gameData) {
        switch (gameData.eventType) {
            case 'multiple_choice_quiz':
                this.renderMultipleChoiceQuiz(container, gameData);
                break;
            case 'drag_drop_workflow':
                this.renderDragDropWorkflow(container, gameData);
                break;
            case 'format_matching':
                this.renderFormatMatching(container, gameData);
                break;
            case 'team_info_pairing':
                this.renderTeamPairing(container, gameData);
                break;
            case 'random_stat_check':
            case 'random_event':
                this.renderRandomEvent(container, gameData);
                break;
            default:
                this.renderDefaultGame(container, gameData);
        }
    }

    renderMultipleChoiceQuiz(container, gameData) {
        // Use actual question data from server or fallback to sample
        let question = gameData.data?.question;
        
        // If question is just a string, wrap it in proper structure
        if (typeof question === 'string') {
            question = {
                question: question,
                options: ["創新", "誠信", "團隊合作", "客戶至上"]
            };
        } else if (!question || typeof question !== 'object') {
            // Fallback if no question data
            question = {
                question: "公司最重要的價值觀是什麼？",
                options: ["創新", "誠信", "團隊合作", "客戶至上"]
            };
        }
        
        // Ensure options is always an array
        if (!Array.isArray(question.options)) {
            question.options = ["創新", "誠信", "團隊合作", "客戶至上"];
        }

        const questionText = this.add.text(0, -150, question.question, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 600 }
        });
        questionText.setOrigin(0.5);
        container.add(questionText);

        // Display options
        question.options.forEach((option, index) => {
            const optionText = this.add.text(0, -50 + index * 60, 
                `${String.fromCharCode(65 + index)}. ${option}`, 
                {
                    fontSize: '18px',
                    fontFamily: 'Arial',
                    color: '#bdc3c7',
                    align: 'center'
                }
            );
            optionText.setOrigin(0.5);
            container.add(optionText);

            // Add option background
            const optionBg = this.add.rectangle(0, -50 + index * 60, 400, 40, 0x34495e, 0.7);
            optionBg.setStrokeStyle(2, 0x7f8c8d);
            container.add(optionBg);
            container.sendToBack(optionBg);
        });

        const instructionText = this.add.text(0, 200, 
            '👆 隊伍正在選擇答案...', 
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#f39c12',
                align: 'center'
            }
        );
        instructionText.setOrigin(0.5);
        container.add(instructionText);
    }

    renderDragDropWorkflow(container, gameData) {
        const title = this.add.text(0, -150, 
            gameData.data?.title || '🔄 流程排序', 
            {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            }
        );
        title.setOrigin(0.5);
        container.add(title);

        const description = this.add.text(0, -110, 
            gameData.data?.description || '請將以下項目按正確順序排列：', 
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#bdc3c7',
                align: 'center'
            }
        );
        description.setOrigin(0.5);
        container.add(description);

        // Display shuffled items
        const items = gameData.data?.shuffledItems || ['項目 A', '項目 B', '項目 C', '項目 D'];
        items.forEach((item, index) => {
            const itemBg = this.add.rectangle(-200 + (index % 2) * 400, -50 + Math.floor(index / 2) * 80, 
                350, 60, 0x34495e, 0.8);
            itemBg.setStrokeStyle(2, 0x7f8c8d);
            container.add(itemBg);

            const itemText = this.add.text(-200 + (index % 2) * 400, -50 + Math.floor(index / 2) * 80, 
                item, 
                {
                    fontSize: '16px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: 300 }
                }
            );
            itemText.setOrigin(0.5);
            container.add(itemText);
        });

        const instructionText = this.add.text(0, 150, 
            '🔄 隊伍正在排列順序...', 
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#f39c12',
                align: 'center'
            }
        );
        instructionText.setOrigin(0.5);
        container.add(instructionText);
    }

    renderFormatMatching(container, gameData) {
        const matchingData = gameData.data || {};
        const title = this.add.text(0, -150, 
            `🔗 ${matchingData.title || '配對遊戲'}`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        });
        title.setOrigin(0.5);
        container.add(title);

        const description = this.add.text(0, -110, '請將左側和右側的項目正確配對：', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#bdc3c7',
            align: 'center'
        });
        description.setOrigin(0.5);
        container.add(description);

        // Use actual pairs from server or fallback
        const pairs = matchingData.pairs || [
            { left: 'HTML', right: '網頁結構' },
            { left: 'CSS', right: '樣式設計' },
            { left: 'JavaScript', right: '互動功能' },
            { left: 'Node.js', right: '後端服務' }
        ];

        const leftItems = pairs.map(pair => pair.left);
        const rightItems = pairs.map(pair => pair.right);

        // Left column
        leftItems.forEach((item, index) => {
            const itemBg = this.add.rectangle(-200, -50 + index * 60, 180, 40, 0x3498db, 0.8);
            container.add(itemBg);
            
            const itemText = this.add.text(-200, -50 + index * 60, item, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            });
            itemText.setOrigin(0.5);
            container.add(itemText);
        });

        // Right column (shuffled for display)
        const shuffledRight = [...rightItems].sort(() => Math.random() - 0.5);
        shuffledRight.forEach((item, index) => {
            const itemBg = this.add.rectangle(200, -50 + index * 60, 180, 40, 0xe67e22, 0.8);
            container.add(itemBg);
            
            const itemText = this.add.text(200, -50 + index * 60, item, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            });
            itemText.setOrigin(0.5);
            container.add(itemText);
        });

        const instructionText = this.add.text(0, 150, 
            '🔗 隊伍正在進行配對...', 
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#f39c12',
                align: 'center'
            }
        );
        instructionText.setOrigin(0.5);
        container.add(instructionText);
    }

    renderTeamPairing(container, gameData) {
        const teamData = gameData.data || {};
        const title = this.add.text(0, -150, '👥 團隊協作', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        });
        title.setOrigin(0.5);
        container.add(title);

        const taskTitle = this.add.text(0, -110, 
            teamData.title || '任務：設計一個完美的工作日', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#e74c3c',
            align: 'center'
        });
        taskTitle.setOrigin(0.5);
        container.add(taskTitle);

        const description = this.add.text(0, -80, 
            teamData.description || '請按優先順序排列以下活動：', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#bdc3c7',
            align: 'center',
            wordWrap: { width: 600 }
        });
        description.setOrigin(0.5);
        container.add(description);

        const activities = teamData.items || [
            '📅 團隊會議',
            '💻 專案開發', 
            '📞 客戶溝通',
            '📚 學習成長',
            '☕ 休息放鬆'
        ];

        activities.slice(0, 5).forEach((activity, index) => {
            const itemBg = this.add.rectangle(0, -30 + index * 50, 400, 40, 0x34495e, 0.8);
            itemBg.setStrokeStyle(2, 0x7f8c8d);
            container.add(itemBg);

            const itemText = this.add.text(0, -30 + index * 50, activity, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center'
            });
            itemText.setOrigin(0.5);
            container.add(itemText);
        });

        const instructionText = this.add.text(0, 200, 
            '👥 隊伍正在討論並排序...', 
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#f39c12',
                align: 'center'
            }
        );
        instructionText.setOrigin(0.5);
        container.add(instructionText);
    }

    renderRandomEvent(container, gameData) {
        const title = this.add.text(0, -150, '🎲 隨機事件', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        });
        title.setOrigin(0.5);
        container.add(title);

        const eventBg = this.add.rectangle(0, -50, 500, 200, 0x8e44ad, 0.8);
        eventBg.setStrokeStyle(3, 0x9b59b6);
        container.add(eventBg);

        const eventTitle = this.add.text(0, -100, '技術挑戰', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        });
        eventTitle.setOrigin(0.5);
        container.add(eventTitle);

        const eventDesc = this.add.text(0, -60, '需要解決一個緊急的技術問題', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ecf0f1',
            align: 'center'
        });
        eventDesc.setOrigin(0.5);
        container.add(eventDesc);

        const statCheck = this.add.text(0, -20, '需要技術能力：4+', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#f1c40f',
            align: 'center'
        });
        statCheck.setOrigin(0.5);
        container.add(statCheck);

        const diceDisplay = this.add.text(0, 20, '🎲 ?', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        });
        diceDisplay.setOrigin(0.5);
        container.add(diceDisplay);

        const instructionText = this.add.text(0, 150, 
            '🎲 隊伍準備擲骰檢定...', 
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#f39c12',
                align: 'center'
            }
        );
        instructionText.setOrigin(0.5);
        container.add(instructionText);
    }

    renderDefaultGame(container, gameData) {
        const title = this.add.text(0, -100, '🎯 特殊事件', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        });
        title.setOrigin(0.5);
        container.add(title);

        const eventInfo = this.add.text(0, -50, `事件類型: ${gameData.eventType}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#bdc3c7',
            align: 'center'
        });
        eventInfo.setOrigin(0.5);
        container.add(eventInfo);

        const instructionText = this.add.text(0, 0, 
            '⏳ 請等待主持人說明...', 
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#f39c12',
                align: 'center'
            }
        );
        instructionText.setOrigin(0.5);
        container.add(instructionText);
    }

    startMiniGameTimer(timeLimit) {
        if (!this.currentMiniGameDisplay) return;

        const { timerText } = this.currentMiniGameDisplay;
        let timeLeft = Math.ceil(timeLimit / 1000);
        
        const timer = setInterval(() => {
            timeLeft--;
            if (timerText && timerText.active) {
                timerText.setText(`⏱️ 時間: ${timeLeft} 秒`);
                
                // Change color when time is running out
                if (timeLeft <= 10) {
                    timerText.setColor('#e74c3c');
                } else if (timeLeft <= 30) {
                    timerText.setColor('#f39c12');
                }
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                if (timerText && timerText.active) {
                    timerText.setText('⏰ 時間到！');
                }
            }
        }, 1000);

        // Store timer reference for cleanup
        this.miniGameTimer = timer;
    }

    hideMiniGameDisplay() {
        if (this.currentMiniGameDisplay) {
            this.currentMiniGameDisplay.container.destroy();
            this.currentMiniGameDisplay = null;
        }
        
        if (this.miniGameTimer) {
            clearInterval(this.miniGameTimer);
            this.miniGameTimer = null;
        }
    }

    showMiniGameResult(teamId, score, feedback, success) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        // Hide the mini-game display
        this.hideMiniGameDisplay();

        const color = success ? 0x2ecc71 : 0xe74c3c;
        const scoreText = score > 0 ? `+${score}` : `${score}`;

        // Create result banner
        const resultBanner = this.add.rectangle(
            this.centerX, 
            this.centerY - 50, 
            400, 
            100, 
            color, 
            0.9
        );
        resultBanner.setStrokeStyle(3, success ? 0x27ae60 : 0xc0392b);

        const resultText = this.add.text(
            this.centerX, 
            this.centerY - 50,
            `${success ? '✅' : '❌'} ${team.emoji} 隊伍 ${team.id.split('_')[1]}\n${feedback}\n${scoreText} 分`,
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 5
            }
        );
        resultText.setOrigin(0.5);

        // Animate result
        resultBanner.setScale(0);
        resultText.setScale(0);

        this.tweens.add({
            targets: [resultBanner, resultText],
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });

        // Auto-hide after 4 seconds
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: [resultBanner, resultText],
                alpha: 0,
                scaleX: 0.8,
                scaleY: 0.8,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    resultBanner.destroy();
                    resultText.destroy();
                }
            });
        });
    }

    showChanceCard(teamId, chanceCard, newScore, newPosition) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        // Determine color based on card type
        let bgColor, borderColor;
        switch (chanceCard.type) {
            case 'disaster':
                bgColor = 0x8e44ad;
                borderColor = 0x732d91;
                break;
            case 'bad':
                bgColor = 0xe74c3c;
                borderColor = 0xc0392b;
                break;
            case 'neutral':
                bgColor = 0x7f8c8d;
                borderColor = 0x5d6d6e;
                break;
            case 'good':
                bgColor = 0x27ae60;
                borderColor = 0x1e8449;
                break;
            case 'excellent':
                bgColor = 0xf1c40f;
                borderColor = 0xd4ac0d;
                break;
            default:
                bgColor = 0x34495e;
                borderColor = 0x2c3e50;
        }

        // Create chance card display
        const cardBanner = this.add.rectangle(
            this.centerX, 
            this.centerY, 
            600, 
            200, 
            bgColor, 
            0.95
        );
        cardBanner.setStrokeStyle(4, borderColor);

        const scoreText = chanceCard.scoreChange > 0 ? `+${chanceCard.scoreChange}` : `${chanceCard.scoreChange}`;
        const positionText = chanceCard.effect === 'reset_to_start' ? '\n📍 回到起點！' : '';

        const cardText = this.add.text(
            this.centerX, 
            this.centerY,
            `🃏 ${team.emoji} 隊伍 ${team.id.split('_')[1]} 抽到機會卡！\n\n${chanceCard.title}\n${chanceCard.description}\n\n💰 分數變化: ${scoreText}${positionText}`,
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 8,
                wordWrap: { width: 550 }
            }
        );
        cardText.setOrigin(0.5);

        // Dramatic entrance animation
        cardBanner.setScale(0);
        cardText.setScale(0);

        this.tweens.add({
            targets: [cardBanner, cardText],
            scaleX: 1,
            scaleY: 1,
            duration: 800,
            ease: 'Back.easeOut'
        });

        // Auto-hide after 4 seconds
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: [cardBanner, cardText],
                alpha: 0,
                scaleX: 0.8,
                scaleY: 0.8,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    cardBanner.destroy();
                    cardText.destroy();
                }
            });
        });
    }

    hideMiniGameBanner() {
        if (this.currentMiniGameBanner) {
            const { banner, bannerText } = this.currentMiniGameBanner;
            
            // Stop any existing tweens on these objects first
            this.tweens.killTweensOf([banner, bannerText]);
            
            this.tweens.add({
                targets: [banner, bannerText],
                alpha: 0,
                scaleX: 0.8,
                scaleY: 0.8,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    if (banner) banner.destroy();
                    if (bannerText) bannerText.destroy();
                }
            });
            
            this.currentMiniGameBanner = null;
        }
    }

    getEventName(eventType) {
        const eventNames = {
            'multiple_choice_quiz': '📝 選擇題挑戰',
            'drag_drop_workflow': '🔄 流程排序',
            'format_matching': '🔗 配對遊戲',
            'team_info_pairing': '👥 團隊協作',
            'random_stat_check': '🎲 隨機事件',
            'random_event': '🎲 隨機事件'
        };
        return eventNames[eventType] || `🎯 ${eventType}`;
    }
}