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
            }
        });
    }

    updateGameState(gameState) {
        this.gameState = gameState;
        this.updateTeamPositions();
    }

    setBoard(board) {
        this.board = board;
        if (this.boardTiles.length === 0) {
            this.createBoard();
        }
    }

    updateTeamPositions() {
        if (!this.gameState || !this.gameState.teams) return;
        
        this.gameState.teams.forEach((team, index) => {
            const token = this.teamTokens[team.id];
            if (token && this.boardTiles[team.position]) {
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
        });
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
}