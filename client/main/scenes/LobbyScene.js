class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' })
  }

  preload() {
    // Create simple colored rectangles for team tokens
    this.load.image('board-bg', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
  }

  create() {
    const { width, height } = this.scale

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x2c3e50)

    // Title
    const title = this.add.text(width / 2, height / 2 - 100, '🎯 MTO 體驗營', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    })
    title.setOrigin(0.5)

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 2 - 40, '等待玩家加入...', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ecf0f1',
      align: 'center',
    })
    subtitle.setOrigin(0.5)

    // Player count
    this.playerCountText = this.add.text(width / 2, height / 2 + 20, '玩家數量: 0/80', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#3498db',
      align: 'center',
    })
    this.playerCountText.setOrigin(0.5)

    // Instructions
    const instructions = this.add.text(width / 2, height / 2 + 80, '🔸 玩家請用手機掃描 QR 碼或輸入網址加入遊戲\n' + '🔸 主持人可以分配隊伍並開始遊戲\n' + '🔸 建議 60-80 人同時遊玩', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#bdc3c7',
      align: 'center',
      lineSpacing: 10,
    })
    instructions.setOrigin(0.5)

    // QR Code placeholder (you could generate a real QR code here)
    const qrPlaceholder = this.add.rectangle(width / 2, height / 2 + 200, 150, 150, 0xffffff)
    qrPlaceholder.setStrokeStyle(2, 0x34495e)

    const qrText = this.add.text(width / 2, height / 2 + 200, '📱\nQR 碼\n(手機加入)', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#2c3e50',
      align: 'center',
    })
    qrText.setOrigin(0.5)

    // Animated background elements
    this.createFloatingElements()

    // Listen for game state updates
    if (this.game.socket) {
      this.game.socket.on('game_state_update', (gameState) => {
        this.updatePlayerCount(gameState)
      })
    }
  }

  createFloatingElements() {
    const { width, height } = this.scale

    // Create floating geometric shapes
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const size = Math.random() * 20 + 10
      const color = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6][Math.floor(Math.random() * 5)]

      const shape = this.add.circle(x, y, size, color, 0.3)

      // Animate floating
      this.tweens.add({
        targets: shape,
        y: y + (Math.random() * 100 - 50),
        x: x + (Math.random() * 100 - 50),
        alpha: 0.1,
        duration: 3000 + Math.random() * 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      })
    }
  }

  updatePlayerCount(gameState) {
    const playerCount = Object.keys(gameState.players).length
    const teamCount = gameState.teams.length

    if (teamCount > 0) {
      this.playerCountText.setText(`玩家數量: ${playerCount}/80 (${teamCount} 個隊伍)`)
    } else {
      this.playerCountText.setText(`玩家數量: ${playerCount}/80`)
    }
  }
}
