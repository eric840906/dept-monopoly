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
        this.add.text(this.centerX, 50, '🎯 團隊建設棋盤', {
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
        const centerText = this.add.text(this.centerX, this.centerY, '🎯\n團隊\n建設', {
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
        
        // Animate token movement
        const token = this.teamTokens[teamId];
        if (token) {
            this.animateTokenMovement(token, oldPosition, newPosition);
        }
        
        // Show tile effect
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
        const { teamId, eventType, timeLimit } = data;
        console.log(`Mini-game started for team ${teamId}: ${eventType}`);
        
        // Show mini-game notification on main screen
        this.showMiniGameNotification(teamId, eventType, timeLimit);
    }

    handleMiniGameResult(data) {
        const { teamId, score, feedback, success } = data;
        console.log(`Mini-game result for team ${teamId}: ${score} points`);
        
        // Show result notification on main screen
        this.showMiniGameResult(teamId, score, feedback, success);
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

    animateTokenMovement(token, oldPosition, newPosition) {
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

    showMiniGameNotification(teamId, eventType, timeLimit) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        const timeInSeconds = Math.ceil(timeLimit / 1000);

        // Create mini-game banner
        const banner = this.add.rectangle(
            this.centerX, 
            this.centerY, 
            500, 
            120, 
            0xe74c3c, 
            0.95
        );
        banner.setStrokeStyle(4, 0xc0392b);

        const bannerText = this.add.text(
            this.centerX, 
            this.centerY,
            `🎮 小遊戲開始！\n${team.emoji} 隊伍 ${team.id.split('_')[1]}\n${this.getEventName(eventType)}\n時間限制: ${timeInSeconds} 秒`,
            {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 8
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

        // Store reference for cleanup
        this.currentMiniGameBanner = { banner, bannerText };

        // Auto-hide after time limit + 2 seconds
        this.time.delayedCall(timeLimit + 2000, () => {
            this.hideMiniGameBanner();
        });
    }

    showMiniGameResult(teamId, score, feedback, success) {
        const team = this.gameState?.teams.find(t => t.id === teamId);
        if (!team) return;

        // Hide the mini-game banner if it exists
        this.hideMiniGameBanner();

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

    hideMiniGameBanner() {
        if (this.currentMiniGameBanner) {
            const { banner, bannerText } = this.currentMiniGameBanner;
            
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