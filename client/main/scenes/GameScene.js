class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.gameState = null
    this.board = null
    this.boardTiles = []
    this.teamTokens = {}
    this.boardRadius = 300
    this.centerX = 0
    this.centerY = 0
  }

  preload() {
    // Load background image with error handling
    this.load.image('background', '/images/assets/background.png')

    // Add load error handlers
    this.load.on('filecomplete-image-background', () => {
      console.log('Background image loaded successfully!')
    })

    this.load.on('loaderror', (file) => {
      console.error('Failed to load file:', file.src)
      if (file.key === 'background') {
        console.error('Background image failed to load. Check if the file exists at: assets/background.png')
      }
    })

    // Create colored rectangles for different tile types
    this.createTileTextures()
    this.createTokenTextures()

    // Preload team images
    this.preloadTeamImages()

    // Preload quiz images
    this.preloadQuizImages()

    // Preload tile images
    this.preloadTileImages()

    // Preload result images
    this.preloadResultImages()
  }

  create(data) {
    const { width, height } = this.scale
    this.centerX = width / 2
    this.centerY = height / 2

    if (data) {
      this.gameState = data.gameState
      this.board = data.board
    }

    // Background image with fallback
    try {
      const background = this.add.image(width / 2, height / 2, 'background')
      // Scale the background to fit the screen
      background.setDisplaySize(width, height)
      console.log('Background image applied successfully!')
    } catch (error) {
      console.error('Failed to create background image, using fallback color:', error)
      // Fallback to solid color background
      this.add.rectangle(width / 2, height / 2, width, height, 0xf0f0f0)
    }

    // Create the board
    this.createBoard()

    // Create team tokens
    this.createTeamTokens()

    // Add board title
    this.add
      .text(this.centerX, 50, '', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
  }

  createTileTextures() {
    // Create textures for different tile types (rectangular for Monopoly style)
    const graphics = this.add.graphics()
    const tileWidth = 70
    const tileHeight = 50

    // Safe tile (green)
    graphics.fillStyle(0x2ecc71)
    graphics.fillRect(0, 0, tileWidth, tileHeight)
    graphics.lineStyle(2, 0x27ae60)
    graphics.strokeRect(0, 0, tileWidth, tileHeight)
    graphics.generateTexture('safe-tile', tileWidth, tileHeight)

    // Event tile (orange)
    graphics.clear()
    graphics.fillStyle(0xadd68a)
    graphics.fillRect(0, 0, tileWidth, tileHeight)
    graphics.lineStyle(2, 0xadd68a)
    graphics.strokeRect(0, 0, tileWidth, tileHeight)
    graphics.generateTexture('event-tile', tileWidth, tileHeight)

    // Chance tile (transparent)
    graphics.clear()
    graphics.fillStyle(0x000000, 0)
    graphics.fillRect(0, 0, tileWidth, tileHeight)
    graphics.lineStyle(2, 0x000000, 0)
    graphics.strokeRect(0, 0, tileWidth, tileHeight)
    graphics.generateTexture('chance-tile', tileWidth, tileHeight)

    // Start tile (blue)
    graphics.clear()
    graphics.fillStyle(0x3498db)
    graphics.fillRect(0, 0, tileWidth, tileHeight)
    graphics.lineStyle(2, 0x2980b9)
    graphics.strokeRect(0, 0, tileWidth, tileHeight)
    graphics.generateTexture('start-tile', tileWidth, tileHeight)

    // Destiny tile (transparent)
    graphics.clear()
    graphics.fillStyle(0x000000, 0)
    graphics.fillRect(0, 0, tileWidth, tileHeight)
    graphics.lineStyle(2, 0x000000, 0)
    graphics.strokeRect(0, 0, tileWidth, tileHeight)
    graphics.generateTexture('destiny-tile', tileWidth, tileHeight)

    graphics.destroy()
  }

  createTokenTextures() {
    // Create colored circle textures for team tokens
    const graphics = this.add.graphics()

    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7, 0xdda0dd, 0xffb347, 0x87ceeb]

    colors.forEach((color, index) => {
      graphics.clear()
      graphics.fillStyle(color)
      graphics.fillCircle(15, 15, 15)
      graphics.lineStyle(3, 0xffffff)
      graphics.strokeCircle(15, 15, 15)
      graphics.generateTexture(`team-token-${index}`, 30, 30)
    })

    graphics.destroy()
  }

  preloadTeamImages() {
    // Preload all team images to avoid loading delays during gameplay
    try {
      // Try to get predefined teams from constants
      const teamImages = [
        { id: 'team_A', image: '/images/teams/team_A.png' },
        { id: 'team_B', image: '/images/teams/team_B.png' },
        { id: 'team_C', image: '/images/teams/team_C.png' },
        { id: 'team_D', image: '/images/teams/team_D.png' },
        { id: 'team_E', image: '/images/teams/team_E.png' },
        { id: 'team_F', image: '/images/teams/team_F.png' },
      ]

      teamImages.forEach((team) => {
        if (team.image) {
          this.load.image(team.id, team.image)
        }
      })
    } catch (error) {
      console.log('Could not preload team images:', error)
    }
  }

  preloadQuizImages() {
    // Preload quiz images to avoid loading delays during mini-games
    try {
      const quizImages = [
        { key: 'mib_flash_location_door_video', path: '/images/quiz/mib_flash_location_door_video.svg' },
        { key: 'quiz_bg_chi', path: '/images/quiz/quiz_image_chi.png' },
        { key: 'quiz_bg_ha', path: '/images/quiz/quiz_image_ha.png' },
        { key: 'quiz_bg_us1', path: '/images/quiz/quiz_image_us.png' },
        { key: 'quiz_bg_us2', path: '/images/quiz/quiz_image_us2.png' },
        // Add more quiz images here as needed
      ]

      quizImages.forEach((img) => {
        this.load.image(img.key, img.path)
      })
    } catch (error) {
      console.log('Could not preload quiz images:', error)
    }
  }

  preloadTileImages() {
    // Preload quiz images to avoid loading delays during mini-games
    try {
      const quizImages = [
        { key: 'chanceImg', path: '/images/special/chance.png' },
        { key: 'destinyImg', path: '/images/special/destiny.png' },
        // Add more quiz images here as needed
      ]

      quizImages.forEach((img) => {
        this.load.image(img.key, img.path)
      })
    } catch (error) {
      console.log('Could not preload tile images:', error)
    }
  }

  preloadResultImages() {
    // Preload quiz images to avoid loading delays during mini-games
    try {
      const quizImages = [
        { key: 'resultBadImg', path: '/images/special/sad_ha1.png' },
        { key: 'resultBadImg2', path: '/images/special/sad_ha2.png' },
        { key: 'resultGoodImg', path: '/images/special/good_res1.png' },
        { key: 'resultGoodImg2', path: '/images/special/good_res2.png' },
        // Add more quiz images here as needed
      ]

      quizImages.forEach((img) => {
        this.load.image(img.key, img.path)
      })
    } catch (error) {
      console.log('Could not preload result images:', error)
    }
  }

  createBoard() {
    if (!this.board) return

    this.boardTiles = []
    const tileCount = this.board.length

    // Calculate board dimensions for square layout
    const boardWidth = 600
    const boardHeight = 600
    const tileSize = 90
    const tilesPerSide = Math.ceil(tileCount / 4)

    // Calculate positions for square Monopoly-style layout
    this.board.forEach((tile, index) => {
      const { x, y } = this.calculateSquareTilePosition(index, tileCount, boardWidth, boardHeight, tileSize)

      // Choose texture based on tile type
      let texture
      switch (tile.type) {
        case 'start':
          texture = 'start-tile'
          break
        case 'safe':
          texture = 'safe-tile'
          break
        case 'event':
          texture = 'event-tile'
          break
        case 'chance':
          texture = 'chance-tile'
          break
        case 'destiny':
          texture = 'destiny-tile'
          break
        default:
          texture = 'safe-tile'
      }

      // Create tile sprite
      const tileSprite = this.add.image(x, y, texture)
      tileSprite.setDisplaySize(105, 75)

      // Add tile number (skip for START tile)
      let tileNumber = null
      if (index !== 0) {
        tileNumber = this.add.text(x, y, index.toString(), {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#505050',
          align: 'center',
        })
        tileNumber.setOrigin(0.5)
      }

      // Add tile name below (for important tiles)
      if (tile.type === 'start') {
        const tileName = this.add.text(x, y + 15, '起點', {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#ffffff',
          align: 'center',
        })
        tileName.setOrigin(0.5)
      } else if (tile.type === 'chance') {
        const chanceImage = this.add.image(x, y, 'chanceImg')
        chanceImage.setDisplaySize(60, 60)
        chanceImage.setOrigin(0.5)
      } else if (tile.type === 'destiny') {
        const chanceImage = this.add.image(x, y, 'destinyImg')
        chanceImage.setDisplaySize(60, 60)
        chanceImage.setOrigin(0.5)
      }

      this.boardTiles.push({
        sprite: tileSprite,
        number: tileNumber,
        tile: tile,
        x: x,
        y: y,
        index: index,
      })
    })

    // Add center logo/title
    // const centerBg = this.add.rectangle(this.centerX, this.centerY, 400, 400, 0x2c3e50, 0.8)
    // centerBg.setStrokeStyle(3, 0x34495e)
    // const centerText = this.add.text(this.centerX, this.centerY, '🎯\nMTO\n體驗營', {
    //   fontSize: '24px',
    //   fontFamily: 'Arial',
    //   color: '#ffffff',
    //   align: 'center',
    //   lineSpacing: 5,
    // })
    // centerText.setOrigin(0.5)
  }

  calculateSquareTilePosition(index, totalTiles, boardWidth, boardHeight, tileSize) {
    const sideLength = 650 // Increased for larger gaps between tiles
    const tilesPerSide = Math.floor(totalTiles / 4)
    const tileSpacing = sideLength / tilesPerSide
    const tileOffset = 30 // Increased offset to prevent tile overlapping

    let x, y

    // Bottom side (tiles 0-5 for 24-tile board)
    if (index < tilesPerSide) {
      const sideIndex = index
      x = this.centerX - sideLength / 2 + sideIndex * tileSpacing + tileSpacing / 2
      y = this.centerY + sideLength / 2 + tileOffset
    }
    // Right side (tiles 6-11 for 24-tile board)
    else if (index < tilesPerSide * 2) {
      const sideIndex = index - tilesPerSide
      x = this.centerX + sideLength / 2 + tileOffset
      y = this.centerY + sideLength / 2 - sideIndex * tileSpacing - tileSpacing / 2
    }
    // Top side (tiles 12-17 for 24-tile board)
    else if (index < tilesPerSide * 3) {
      const sideIndex = index - tilesPerSide * 2
      x = this.centerX + sideLength / 2 - sideIndex * tileSpacing - tileSpacing / 2
      y = this.centerY - sideLength / 2 - tileOffset
    }
    // Left side (tiles 18-23 for 24-tile board)
    else {
      const sideIndex = index - tilesPerSide * 3
      x = this.centerX - sideLength / 2 - tileOffset
      y = this.centerY - sideLength / 2 + sideIndex * tileSpacing + tileSpacing / 2
    }

    return { x, y }
  }

  createTeamTokens() {
    if (!this.gameState || !this.gameState.teams) return

    this.teamTokens = {}

    this.gameState.teams.forEach((team, index) => {
      // Only create token if team has members
      if (!team.members || team.members.length === 0) {
        console.log(`Skipping token creation for empty team: ${team.id}`)
        return
      }

      const position = team.position || 0
      const tileData = this.boardTiles[position]

      if (tileData) {
        // Calculate position with slight offset for multiple teams on same tile
        const offsetX = (index % 2) * 20 - 10
        const offsetY = Math.floor(index / 2) * 20 - 10

        let tokenImage

        // Use PNG image if available, otherwise fallback to colored circle and emoji
        if (team.image && this.textures.exists(team.id)) {
          // Create team PNG image only (no background circle needed)
          tokenImage = this.add.image(tileData.x + offsetX, tileData.y + offsetY, team.id)
          tokenImage.setDisplaySize(32, 32) // Full size since no background

          this.teamTokens[team.id] = {
            token: tokenImage, // Use the image as the main token
            team: team,
          }
        } else {
          // Fallback to original emoji system
          const token = this.add.image(tileData.x + offsetX, tileData.y + offsetY, `team-token-${index}`)
          token.setDisplaySize(30, 30)

          const emoji = this.add.text(tileData.x + offsetX, tileData.y + offsetY, team.emoji, {
            fontSize: '16px',
            align: 'center',
          })
          emoji.setOrigin(0.5)

          this.teamTokens[team.id] = {
            token: token,
            emoji: emoji,
            team: team,
          }
        }

        console.log(`Created token for team: ${team.id} with ${team.members.length} members`)
      }
    })
  }

  updateGameState(gameState) {
    this.gameState = gameState
    this.updateTeamTokens()
  }

  setBoard(board) {
    this.board = board
    if (this.boardTiles.length === 0) {
      this.createBoard()
    }
  }

  updateTeamTokens() {
    if (!this.gameState || !this.gameState.teams) return

    // Get current team IDs from game state
    const currentTeamIds = new Set(this.gameState.teams.map((team) => team.id))

    // Remove tokens for teams that no longer exist
    Object.keys(this.teamTokens).forEach((teamId) => {
      if (!currentTeamIds.has(teamId)) {
        console.log(`Removing token for deleted team: ${teamId}`)
        const token = this.teamTokens[teamId]
        if (token.token) token.token.destroy()
        if (token.emoji) token.emoji.destroy()
        delete this.teamTokens[teamId]
      }
    })

    // Update existing tokens and create new ones if needed
    this.gameState.teams.forEach((team, index) => {
      if (!this.teamTokens[team.id]) {
        // Create new token for new team
        this.createTeamToken(team, index)
      } else {
        // Update existing token position
        this.updateTeamTokenPosition(team, index)
      }
    })
  }

  createTeamToken(team, index) {
    // Only create token if team has members
    if (!team.members || team.members.length === 0) {
      console.log(`Skipping token creation for empty team: ${team.id}`)
      return
    }

    const position = team.position || 0
    const tileData = this.boardTiles[position]

    if (!tileData) return

    // Calculate position with slight offset for multiple teams on same tile
    const offsetX = (index % 2) * 20 - 10
    const offsetY = Math.floor(index / 2) * 20 - 10

    // Use PNG image if available, otherwise fallback to colored circle and emoji
    if (team.image && this.textures.exists(team.id)) {
      // Create team PNG image only (no background circle needed)
      const tokenImage = this.add.image(tileData.x + offsetX, tileData.y + offsetY, team.id)
      tokenImage.setDisplaySize(32, 32) // Full size since no background

      this.teamTokens[team.id] = {
        token: tokenImage, // Use the image as the main token
        team: team,
      }
    } else {
      // Fallback to original emoji system
      const token = this.add.image(tileData.x + offsetX, tileData.y + offsetY, `team-token-${index}`)
      token.setDisplaySize(30, 30)

      const emoji = this.add.text(tileData.x + offsetX, tileData.y + offsetY, team.emoji, {
        fontSize: '16px',
        align: 'center',
      })
      emoji.setOrigin(0.5)

      this.teamTokens[team.id] = {
        token: token,
        emoji: emoji,
        team: team,
      }
    }

    console.log(`Created token for team: ${team.id} with ${team.members.length} members`)
  }

  updateTeamTokenPosition(team, index) {
    const token = this.teamTokens[team.id]
    if (!token || !this.boardTiles[team.position]) return

    const tileData = this.boardTiles[team.position]
    const offsetX = (index % 2) * 20 - 10
    const offsetY = Math.floor(index / 2) * 20 - 10

    // Animate token movement
    const targets = [token.token]
    if (token.emoji) targets.push(token.emoji)

    this.tweens.add({
      targets: targets,
      x: tileData.x + offsetX,
      y: tileData.y + offsetY,
      duration: 1000,
      ease: 'Power2',
    })
  }

  updateTeamPositions() {
    // Legacy function - now using updateTeamTokens
    this.updateTeamTokens()
  }

  handleDiceRoll(data) {
    const { teamId, dice, total, oldPosition, newPosition, landedTile } = data

    console.log(`Team ${teamId} rolled ${dice.join(' + ')} = ${total}`)
    console.log(`Moved from position ${oldPosition} to ${newPosition}`)
    console.log(`Landed on: ${landedTile.name} (${landedTile.type})`)

    // Show dice roll animation and wait for it to complete before moving token
    this.showDiceRoll(dice, total, () => {
      // Dice animation complete, now animate token movement
      const token = this.teamTokens[teamId]
      if (token) {
        this.animateTokenMovement(token, oldPosition, newPosition, () => {
          // Movement complete - notify server to handle tile effects
          this.game.socket.emit('movement_complete', {
            teamId: teamId,
            position: newPosition,
          })
        })
      } else {
        // No token to animate, directly notify server
        this.game.socket.emit('movement_complete', {
          teamId: teamId,
          position: newPosition,
        })
      }

      // Show tile effect animation (visual only, events handled after movement)
      if (landedTile.type === 'event') {
        this.showTileEffect(newPosition, landedTile)
      }
    })
  }

  handleEventTrigger(data) {
    const { teamId, tile, eventType } = data
    console.log(`Event triggered for team ${teamId}: ${eventType}`)

    // Show event notification on main screen
    this.showEventNotification(teamId, tile, eventType)
  }

  handleMiniGameStart(data) {
    const { teamId, eventType, timeLimit, captainName } = data
    console.log(`Mini-game started for team ${teamId}: ${eventType}, captain: ${captainName}`)

    // Store the complete game data for later use
    this.pendingMiniGameData = data

    // Show mini-game notification on main screen with captain info
    this.showMiniGameNotification(teamId, eventType, timeLimit, captainName)
  }

  handleMiniGameResult(data) {
    const { teamId, score, feedback, success } = data
    console.log(`Mini-game result for team ${teamId}: ${score} points`)

    // Show result notification on main screen
    this.showMiniGameResult(teamId, score, feedback, success)
  }

  handleChanceCard(data) {
    const { teamId, chanceCard, newScore, newPosition } = data
    console.log(`Chance card drawn by team ${teamId}:`, chanceCard)

    // Show chance card on main screen
    this.showChanceCard(teamId, chanceCard, newScore, newPosition)
  }

  handleDestinyCard(data) {
    const { teamId, destinyCard, newScore, newPosition } = data
    console.log(`Destiny card drawn by team ${teamId}:`, destinyCard)

    // Show destiny card on main screen
    this.showDestinyCard(teamId, destinyCard, newScore, newPosition)
  }

  showDiceRoll(dice, total, onComplete = null) {
    // Create animated dice rolling display
    this.createAnimatedDiceRoll(dice, total, onComplete)
  }

  createAnimatedDiceRoll(finalDice, total, onComplete = null) {
    // Create container for dice roll display
    const diceContainer = this.add.container(this.centerX, this.centerY - 50)

    // Create background panel
    const background = this.add.rectangle(0, 0, 300, 100, 0x2c3e50, 0.9)
    background.setStrokeStyle(3, 0x3498db)
    diceContainer.add(background)

    // Create two dice sprites
    const dice1 = this.createDiceSprite(-60, 0, 1)
    const dice2 = this.createDiceSprite(60, 0, 1)
    diceContainer.add(dice1)
    diceContainer.add(dice2)

    // Add title text
    const titleText = this.add.text(0, -35, '🎲 擲骰子', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    })
    titleText.setOrigin(0.5)
    diceContainer.add(titleText)

    // Add total text (initially hidden)
    const totalText = this.add.text(0, 35, `總和: ${total}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#f39c12',
      align: 'center',
    })
    totalText.setOrigin(0.5)
    totalText.setAlpha(0)
    diceContainer.add(totalText)

    // Start rolling animation
    this.animateDiceRoll(dice1, dice2, finalDice, totalText, diceContainer, onComplete)
  }

  createDiceSprite(x, y, value) {
    // Create dice background
    const diceContainer = this.add.container(x, y)

    const diceBg = this.add.rectangle(0, 0, 40, 40, 0xffffff, 1)
    diceBg.setStrokeStyle(2, 0x2c3e50)
    diceContainer.add(diceBg)

    // Create dots based on value
    const dots = this.createDiceDots(value)
    dots.forEach((dot) => diceContainer.add(dot))

    return diceContainer
  }

  createDiceDots(value) {
    const dots = []
    const dotSize = 4
    const dotColor = 0x2c3e50

    switch (value) {
      case 1:
        dots.push(this.add.circle(0, 0, dotSize, dotColor))
        break
      case 2:
        dots.push(this.add.circle(-8, -8, dotSize, dotColor))
        dots.push(this.add.circle(8, 8, dotSize, dotColor))
        break
      case 3:
        dots.push(this.add.circle(-10, -10, dotSize, dotColor))
        dots.push(this.add.circle(0, 0, dotSize, dotColor))
        dots.push(this.add.circle(10, 10, dotSize, dotColor))
        break
      case 4:
        dots.push(this.add.circle(-8, -8, dotSize, dotColor))
        dots.push(this.add.circle(8, -8, dotSize, dotColor))
        dots.push(this.add.circle(-8, 8, dotSize, dotColor))
        dots.push(this.add.circle(8, 8, dotSize, dotColor))
        break
      case 5:
        dots.push(this.add.circle(-8, -8, dotSize, dotColor))
        dots.push(this.add.circle(8, -8, dotSize, dotColor))
        dots.push(this.add.circle(0, 0, dotSize, dotColor))
        dots.push(this.add.circle(-8, 8, dotSize, dotColor))
        dots.push(this.add.circle(8, 8, dotSize, dotColor))
        break
      case 6:
        dots.push(this.add.circle(-8, -10, dotSize, dotColor))
        dots.push(this.add.circle(8, -10, dotSize, dotColor))
        dots.push(this.add.circle(-8, 0, dotSize, dotColor))
        dots.push(this.add.circle(8, 0, dotSize, dotColor))
        dots.push(this.add.circle(-8, 10, dotSize, dotColor))
        dots.push(this.add.circle(8, 10, dotSize, dotColor))
        break
    }

    return dots
  }

  updateDiceValue(diceSprite, value) {
    // Clear existing dots
    const dotsToRemove = diceSprite.list.slice(1) // Keep background, remove dots
    dotsToRemove.forEach((dot) => {
      diceSprite.remove(dot)
      dot.destroy()
    })

    // Add new dots
    const newDots = this.createDiceDots(value)
    newDots.forEach((dot) => diceSprite.add(dot))
  }

  animateDiceRoll(dice1, dice2, finalValues, totalText, container, onComplete = null) {
    let rollCount = 0
    const maxRolls = 15 // Number of random values to show
    const rollInterval = 100 // ms between rolls

    // Add bouncing animation to dice
    this.tweens.add({
      targets: [dice1, dice2],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: rollInterval,
      yoyo: true,
      repeat: maxRolls - 1,
      ease: 'Power2',
    })

    // Add rotation animation
    this.tweens.add({
      targets: [dice1, dice2],
      rotation: Math.PI * 2,
      duration: rollInterval * maxRolls,
      ease: 'Linear',
    })

    const rollTimer = this.time.addEvent({
      delay: rollInterval,
      callback: () => {
        rollCount++

        // Generate random dice values during rolling
        const randomValue1 = Phaser.Math.Between(1, 6)
        const randomValue2 = Phaser.Math.Between(1, 6)

        this.updateDiceValue(dice1, randomValue1)
        this.updateDiceValue(dice2, randomValue2)

        if (rollCount >= maxRolls) {
          // Show final values
          this.updateDiceValue(dice1, finalValues[0])
          this.updateDiceValue(dice2, finalValues[1])

          // Show total with fade in
          this.tweens.add({
            targets: totalText,
            alpha: 1,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
              // Add celebration effect
              this.addDiceRollCelebration(container)

              // Wait a bit after showing result, then call completion callback
              this.time.delayedCall(800, () => {
                if (onComplete) {
                  onComplete()
                }
              })
            },
          })

          rollTimer.destroy()
        }
      },
      loop: true,
    })

    // Auto-remove the entire display after showing result
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        y: container.y - 50,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => {
          container.destroy()
        },
      })
    })
  }

  addDiceRollCelebration(container) {
    // Add sparkle effect around dice
    for (let i = 0; i < 8; i++) {
      const sparkle = this.add.circle(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-40, 40), 3, 0xf1c40f)
      container.add(sparkle)

      this.tweens.add({
        targets: sparkle,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 800,
        delay: i * 50,
        ease: 'Power2',
        onComplete: () => sparkle.destroy(),
      })
    }
  }

  animateTokenMovement(token, oldPosition, newPosition, onComplete = null) {
    // Create a path for the token to follow around the square board
    const steps = []
    const totalSteps = newPosition >= oldPosition ? newPosition - oldPosition : this.boardTiles.length - oldPosition + newPosition

    for (let i = 1; i <= totalSteps; i++) {
      const pos = (oldPosition + i) % this.boardTiles.length
      const tileData = this.boardTiles[pos]
      steps.push({ x: tileData.x, y: tileData.y })
    }

    // Animate along the path with smoother movement for square layout
    let currentStep = 0
    const moveToNextStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep]
        this.tweens.add({
          targets: [token.token, token.emoji],
          x: step.x,
          y: step.y,
          duration: 400, // Slightly slower for better visibility
          ease: 'Power2',
          onComplete: () => {
            currentStep++
            if (currentStep < steps.length) {
              moveToNextStep()
            } else {
              // Movement complete - call callback if provided
              if (onComplete) {
                onComplete()
              }
            }
          },
        })
      }
    }

    moveToNextStep()
  }

  showTileEffect(position, tile) {
    const tileData = this.boardTiles[position]
    if (!tileData) return

    // Create effect animation
    const effect = this.add.circle(tileData.x, tileData.y, 30, 0xf39c12, 0.7)

    this.tweens.add({
      targets: effect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        effect.destroy()
      },
    })

    // Show event name
    const eventText = this.add.text(tileData.x, tileData.y - 60, `⚡ ${tile.name}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#e67e22',
      padding: { x: 10, y: 5 },
    })
    eventText.setOrigin(0.5)

    this.tweens.add({
      targets: eventText,
      alpha: 0,
      y: tileData.y - 100,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        eventText.destroy()
      },
    })
  }

  showEventNotification(teamId, tile, eventType) {
    const team = this.gameState?.teams.find((t) => t.id === teamId)
    if (!team) return

    // Create notification banner
    const notification = this.add.rectangle(this.centerX, 100, 600, 80, 0x3498db, 0.9)
    notification.setStrokeStyle(3, 0x2980b9)

    const teamDisplay = team.name || `隊伍 ${team.id.split('_')[1]}`
    // Add team image
    const teamImage = this.add.image(this.centerX - 120, 100, team.id || 'team_default')
    teamImage.setDisplaySize(40, 40)
    teamImage.setOrigin(0.5)
    teamImage.setAlpha(0)

    const notificationText = this.add.text(this.centerX, 100, `⚡ ${teamDisplay} 觸發事件！\n${this.getEventName(eventType)}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5,
    })
    notificationText.setOrigin(0.5)

    // Animate notification
    notification.setAlpha(0)
    notificationText.setAlpha(0)

    this.tweens.add({
      targets: [notification, notificationText, teamImage],
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    })

    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: [notification, notificationText, teamImage],
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          notification.destroy()
          notificationText.destroy()
          teamImage.destroy()
        },
      })
    })
  }

  showMiniGameNotification(teamId, eventType, timeLimit, captainName) {
    const team = this.gameState?.teams.find((t) => t.id === teamId)
    if (!team) return

    // Clean up any existing banner first
    this.hideMiniGameBanner()

    const timeInSeconds = Math.ceil(timeLimit / 1000)

    // Create mini-game banner
    const banner = this.add.rectangle(this.centerX, this.centerY, 550, 140, 0xe74c3c, 0.95)
    banner.setStrokeStyle(4, 0xc0392b)

    const captainDisplay = captainName ? `🎯 隊長：${captainName}` : '等待隊長指定'

    const teamDisplay = team.name || `隊伍 ${team.id.split('_')[1]}`

    // Add team image to banner
    const bannerTeamImage = this.add.image(this.centerX - 150, this.centerY - 20, team.id || 'team_default')
    bannerTeamImage.setDisplaySize(40, 40)
    bannerTeamImage.setOrigin(0.5)

    const bannerText = this.add.text(this.centerX, this.centerY, `🎮 小遊戲準備中...\n${teamDisplay}\n${this.getEventName(eventType)}\n${captainDisplay}\n等待介面載入完成`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 6,
    })
    bannerText.setOrigin(0.5)

    // Pulse animation
    this.tweens.add({
      targets: [banner, bannerText, bannerTeamImage],
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })

    // Store reference for cleanup and update
    this.currentMiniGameBanner = { banner, bannerText, bannerTeamImage, teamId, eventType, timeLimit }
  }

  handleMiniGameTimerStart(data) {
    const { teamId, gameData } = data
    console.log(`Mini-game timer starting for team ${teamId}`, gameData)

    // Hide the preparation banner first
    this.hideMiniGameBanner()

    // Use the stored game data from mini_game_start if gameData is missing
    const actualGameData = gameData || this.pendingMiniGameData

    // Small delay to ensure banner cleanup, then display mini-game interface
    this.time.delayedCall(100, () => {
      if (actualGameData) {
        console.log('Displaying mini-game interface with data:', actualGameData)
        this.displayMiniGameInterface(teamId, actualGameData)
      } else {
        console.warn('No gameData received from either source, cannot display mini-game interface')
        // Fallback: at least show that the timer started
        this.showMiniGameFallback(teamId)
      }
    })

    // Clear the pending data after use
    this.pendingMiniGameData = null
  }

  showMiniGameFallback(teamId) {
    const team = this.gameState?.teams.find((t) => t.id === teamId)
    if (!team) return

    // Create a simple fallback display
    const container = this.add.container(this.centerX, this.centerY)

    const background = this.add.rectangle(0, 0, 600, 300, 0x2c3e50, 0.95)
    background.setStrokeStyle(4, 0x3498db)
    container.add(background)

    const teamDisplay = team.name || `隊伍 ${team.id.split('_')[1]}`

    if (team.image && this.textures.exists(team.id)) {
      // Create fallback header with team image
      const teamImage = this.add.image(-60, -100, team.id)
      teamImage.setDisplaySize(24, 24)
      teamImage.setOrigin(0.5)
      container.add(teamImage)

      const headerText = this.add.text(0, -100, `${teamDisplay} - 小遊戲進行中`, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center',
      })
      headerText.setOrigin(0.5)
      container.add(headerText)
    } else {
      // Fallback to emoji
      const headerText = this.add.text(0, -100, `${team.emoji} ${teamDisplay} - 小遊戲進行中`, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center',
      })
      headerText.setOrigin(0.5)
      container.add(headerText)
    }

    const statusText = this.add.text(0, -50, '🎮 遊戲界面載入中...', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#f39c12',
      align: 'center',
    })
    statusText.setOrigin(0.5)
    container.add(statusText)

    // Store for cleanup
    this.currentMiniGameDisplay = { container }
  }

  displayMiniGameInterface(teamId, gameData) {
    const team = this.gameState?.teams.find((t) => t.id === teamId)
    if (!team) return

    // Clear any existing mini-game display and banner
    this.hideMiniGameDisplay()
    this.hideMiniGameBanner()

    // Create main container for mini-game
    const container = this.add.container(this.centerX, this.centerY)

    // Add background - larger container to accommodate bigger image
    const background = this.add.rectangle(0, 0, 1600, 850, 0x2c3e50, 0.95)
    background.setStrokeStyle(4, 0x3498db)
    container.add(background)

    // Add team header with image
    const teamDisplay = team.name || `隊伍 ${team.id.split('_')[1]}`

    // Add team image to header
    // const headerTeamImage = this.add.image(-140, -360, team.id || 'team_default')
    // headerTeamImage.setDisplaySize(40, 40)
    // headerTeamImage.setOrigin(0.5)
    // container.add(headerTeamImage)

    const teamHeader = this.add.text(0, -360, `${this.getEventName(gameData.eventType)}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    })
    teamHeader.setOrigin(0.5)
    container.add(teamHeader)

    // Add timer display
    const timerText = this.add.text(0, -400, `⏱️ 時間: ${Math.ceil(gameData.timeLimit / 1000)} 秒`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#e74c3c',
      align: 'center',
    })
    timerText.setOrigin(0.5)
    container.add(timerText)

    // Display specific mini-game content
    this.renderMiniGameContent(container, gameData)

    // Store reference for cleanup
    this.currentMiniGameDisplay = { container, timerText, gameData }

    // Start timer countdown
    this.startMiniGameTimer(gameData.timeLimit)
  }

  renderMiniGameContent(container, gameData) {
    switch (gameData.eventType) {
      case 'multiple_choice_quiz':
        this.renderMultipleChoiceQuiz(container, gameData)
        break
      case 'drag_drop_workflow':
        this.renderDragDropWorkflow(container, gameData)
        break
      case 'format_matching':
        this.renderFormatMatching(container, gameData)
        break
      case 'true_or_false':
        this.renderTrueOrFalse(container, gameData)
        break
      default:
        this.renderDefaultGame(container, gameData)
    }
  }

  renderMultipleChoiceQuiz(container, gameData) {
    const us = this.add.image(500, 290, 'quiz_bg_us2')
    us.setScale(1.25)
    container.add(us)
    // Use actual question data from server or fallback - same as mobile implementation
    let question = gameData.data

    // If question is just a string, wrap it in proper structure
    if (typeof question === 'string') {
      question = {
        question: question,
        options: ['創新', '誠信', '團隊合作', '客戶至上'],
        correct: 1,
      }
    } else if (!question || typeof question !== 'object') {
      // Fallback if no question data
      question = {
        question: '公司最重要的價值觀是什麼？',
        options: ['創新', '誠信', '團隊合作', '客戶至上'],
        correct: 1,
      }
    }

    // Ensure options is always an array
    if (!Array.isArray(question.options)) {
      question.options = ['創新', '誠信', '團隊合作', '客戶至上']
    }

    const questionText = this.add.text(0, -320, question.question, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 700 },
    })
    questionText.setOrigin(0.5)
    container.add(questionText)

    // Add image if available
    let imageYOffset = 0
    if (question.image) {
      try {
        // Convert path to texture key (remove path and extension)
        const imageKey = question.image.split('/').pop().replace('.png', '').replace('.jpg', '').replace('.jpeg', '').replace('.svg', '')

        if (this.textures.exists(imageKey)) {
          const questionImage = this.add.image(0, -150, imageKey)
          questionImage.setOrigin(0.5)

          // Calculate proper aspect ratio scaling to maintain image proportions
          const texture = this.textures.get(imageKey)
          const originalWidth = texture.source[0].width
          const originalHeight = texture.source[0].height
          const maxWidth = 240 // Maximum width for the quiz image
          const maxHeight = 135 // Maximum height (16:9 ratio reference)

          // Calculate scale to fit within bounds while maintaining aspect ratio
          const scaleX = maxWidth / originalWidth
          const scaleY = maxHeight / originalHeight
          const scale = Math.min(scaleX, scaleY) // Use smaller scale to fit within bounds

          // Increase target size but avoid excessive scaling that causes blur
          const desiredDisplayWidth = 400 // Target display width
          const desiredDisplayHeight = 300 // Target display height

          // Calculate scale for desired size while maintaining aspect ratio
          const desiredScaleX = desiredDisplayWidth / originalWidth
          const desiredScaleY = desiredDisplayHeight / originalHeight
          const desiredScale = Math.min(desiredScaleX, desiredScaleY)

          // Limit scaling to avoid blur - don't scale up more than 1.5x original size
          const finalScale = Math.min(desiredScale, 1.5)
          questionImage.setScale(finalScale)
          container.add(questionImage)
          // Calculate dynamic offset based on actual scaled image height
          const scaledHeight = originalHeight * finalScale
          imageYOffset = Math.max(120, scaledHeight * 0.6) // Dynamic offset based on image size
        }
      } catch (error) {
        console.warn('Could not load quiz image:', question.image, error)
      }
    }

    // Display options (adjusted position based on image presence)
    const optionsStartY = imageYOffset > 0 ? 50 : 0
    question.options.forEach((option, index) => {
      const yPosition = optionsStartY + index * 70
      const optionText = this.add.text(0, yPosition, `${String.fromCharCode(65 + index)}. ${option}`, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#bdc3c7',
        align: 'center',
        wordWrap: { width: 500 },
      })
      optionText.setOrigin(0.5)
      container.add(optionText)

      // Add option background
      const optionBg = this.add.rectangle(0, yPosition, 520, 50, 0x34495e, 0.7)
      optionBg.setStrokeStyle(2, 0x7f8c8d)
      container.add(optionBg)
      container.sendToBack(optionBg)
    })

    const instructionText = this.add.text(0, 320, '👆 隊伍正在選擇答案...', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#f39c12',
      align: 'center',
    })
    instructionText.setOrigin(0.5)
    container.add(instructionText)
  }

  renderDragDropWorkflow(container, gameData) {
    const us = this.add.image(500, 295, 'quiz_bg_us1')
    us.setScale(1.25)
    container.add(us)
    const title = this.add.text(0, -150, gameData.data?.title || '🔄 流程排序', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    })
    title.setOrigin(0.5)
    container.add(title)

    const description = this.add.text(0, -110, gameData.data?.description || '請將以下項目按正確順序排列：', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#bdc3c7',
      align: 'center',
    })
    description.setOrigin(0.5)
    container.add(description)

    // Display shuffled items
    const items = gameData.data?.shuffledItems || ['項目 A', '項目 B', '項目 C', '項目 D']
    items.forEach((item, index) => {
      const itemBg = this.add.rectangle(-200 + (index % 2) * 400, -50 + Math.floor(index / 2) * 80, 350, 60, 0x34495e, 0.8)
      itemBg.setStrokeStyle(2, 0x7f8c8d)
      container.add(itemBg)

      const itemText = this.add.text(-200 + (index % 2) * 400, -50 + Math.floor(index / 2) * 80, item, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 300 },
      })
      itemText.setOrigin(0.5)
      container.add(itemText)
    })

    const instructionText = this.add.text(0, 180, '🔄 隊伍正在排列順序...', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#f39c12',
      align: 'center',
    })
    instructionText.setOrigin(0.5)
    container.add(instructionText)
  }

  renderFormatMatching(container, gameData) {
    const chi = this.add.image(500, 300, 'quiz_bg_chi')
    chi.setScale(1.25)
    container.add(chi)
    const matchingData = gameData.data || {}
    const title = this.add.text(0, -250, `🔗 ${matchingData.title || '連連看'}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    })
    title.setOrigin(0.5)
    container.add(title)

    const description = this.add.text(0, -210, '請將左側和右側的項目正確配對：', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#bdc3c7',
      align: 'center',
    })
    description.setOrigin(0.5)
    container.add(description)

    // Use actual pairs from server or fallback
    const pairs = matchingData.pairs || [
      { left: 'HTML', right: '網頁結構' },
      { left: 'CSS', right: '樣式設計' },
      { left: 'JavaScript', right: '互動功能' },
      { left: 'Node.js', right: '後端服務' },
    ]

    const leftItems = pairs.map((pair) => pair.left)
    const rightItems = pairs.map((pair) => pair.right)

    // Left column
    leftItems.forEach((item, index) => {
      const itemBg = this.add.rectangle(-400, -150 + index * 80, 180, 40, 0x3498db, 0.8)
      container.add(itemBg)

      const itemText = this.add.text(-400, -150 + index * 80, item, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center',
      })
      itemText.setOrigin(0.5)
      container.add(itemText)
    })

    // Right column (shuffled for display)
    const shuffledRight = [...rightItems].sort(() => Math.random() - 0.5)
    shuffledRight.forEach((item, index) => {
      const itemBg = this.add.rectangle(400, -150 + index * 80, 180, 40, 0xe67e22, 0.8)
      container.add(itemBg)

      const itemText = this.add.text(400, -150 + index * 80, item, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center',
      })
      itemText.setOrigin(0.5)
      container.add(itemText)
    })

    const instructionText = this.add.text(0, 250, '🔗 隊伍正在進行配對...', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#f39c12',
      align: 'center',
    })
    instructionText.setOrigin(0.5)
    container.add(instructionText)
  }

  renderDefaultGame(container, gameData) {
    const title = this.add.text(0, -100, '🎯 特殊事件', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    })
    title.setOrigin(0.5)
    container.add(title)

    const eventInfo = this.add.text(0, -50, `事件類型: ${gameData.eventType}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#bdc3c7',
      align: 'center',
    })
    eventInfo.setOrigin(0.5)
    container.add(eventInfo)

    const instructionText = this.add.text(0, 0, '⏳ 請等待主持人說明...', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#f39c12',
      align: 'center',
    })
    instructionText.setOrigin(0.5)
    container.add(instructionText)
  }

  renderTrueOrFalse(container, gameData) {
    const question = gameData.data
    const ha = this.add.image(500, 300, 'quiz_bg_ha')
    ha.setScale(1.25)
    container.add(ha)
    // Safari-safe text handling - ensure question text is properly processed
    let questionTextContent = question.question || '請選擇正確或錯誤'

    // Convert to string and handle any special characters that Safari might not render
    if (typeof questionTextContent !== 'string') {
      questionTextContent = String(questionTextContent)
    }

    // Clean up any problematic characters for Safari
    questionTextContent = questionTextContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Question text with Safari-compatible styling - scaled up for larger container
    const questionText = this.add.text(0, -200, questionTextContent, {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 800 },
      lineSpacing: 8,
      padding: { x: 20, y: 10 },
    })
    questionText.setOrigin(0.5)
    container.add(questionText)

    // Create True button - much larger size for the enlarged container
    const trueButton = this.add.rectangle(-200, 50, 240, 200, 0x27ae60)
    trueButton.setStrokeStyle(6, 0x2ecc71)
    container.add(trueButton)

    // Safari-compatible emoji rendering - larger emoji
    const trueEmojiText = question.trueEmoji || '⭕'
    const trueEmoji = this.add.text(-200, 20, trueEmojiText, {
      fontSize: '64px',
      fontFamily: 'Arial, Apple Color Emoji, sans-serif',
      color: '#ffffff',
    })
    trueEmoji.setOrigin(0.5)
    container.add(trueEmoji)

    const trueLabel = this.add.text(-200, 100, '正確', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
    })
    trueLabel.setOrigin(0.5)
    container.add(trueLabel)

    // Create False button - much larger size for the enlarged container
    const falseButton = this.add.rectangle(200, 50, 240, 200, 0xe74c3c)
    falseButton.setStrokeStyle(6, 0xc0392b)
    container.add(falseButton)

    // Safari-compatible emoji rendering - larger emoji
    const falseEmojiText = question.falseEmoji || '❌'
    const falseEmoji = this.add.text(200, 20, falseEmojiText, {
      fontSize: '64px',
      fontFamily: 'Arial, Apple Color Emoji, sans-serif',
      color: '#ffffff',
    })
    falseEmoji.setOrigin(0.5)
    container.add(falseEmoji)

    const falseLabel = this.add.text(200, 100, '錯誤', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
    })
    falseLabel.setOrigin(0.5)
    container.add(falseLabel)

    // Make buttons interactive
    trueButton.setInteractive({ cursor: 'pointer' })
    falseButton.setInteractive({ cursor: 'pointer' })

    let answered = false

    trueButton.on('pointerdown', () => {
      if (!answered) {
        answered = true
        this.submitMiniGameAnswer(true)
        trueButton.setFillStyle(0x2ecc71)
        falseButton.setAlpha(0.5)
      }
    })

    falseButton.on('pointerdown', () => {
      if (!answered) {
        answered = true
        this.submitMiniGameAnswer(false)
        falseButton.setFillStyle(0xc0392b)
        trueButton.setAlpha(0.5)
      }
    })

    // Hover effects
    trueButton.on('pointerover', () => {
      if (!answered) trueButton.setFillStyle(0x2ecc71)
    })
    trueButton.on('pointerout', () => {
      if (!answered) trueButton.setFillStyle(0x27ae60)
    })

    falseButton.on('pointerover', () => {
      if (!answered) falseButton.setFillStyle(0xc0392b)
    })
    falseButton.on('pointerout', () => {
      if (!answered) falseButton.setFillStyle(0xe74c3c)
    })
  }

  startMiniGameTimer(timeLimit) {
    if (!this.currentMiniGameDisplay) return

    const { timerText } = this.currentMiniGameDisplay
    let timeLeft = Math.ceil(timeLimit / 1000)

    const timer = setInterval(() => {
      timeLeft--
      if (timerText && timerText.active) {
        timerText.setText(`⏱️ 時間: ${timeLeft} 秒`)

        // Change color when time is running out
        if (timeLeft <= 10) {
          timerText.setColor('#e74c3c')
        } else if (timeLeft <= 30) {
          timerText.setColor('#f39c12')
        }
      }

      if (timeLeft <= 0) {
        clearInterval(timer)
        if (timerText && timerText.active) {
          timerText.setText('⏰ 時間到！')
        }
      }
    }, 1000)

    // Store timer reference for cleanup
    this.miniGameTimer = timer
  }

  hideMiniGameDisplay() {
    if (this.currentMiniGameDisplay) {
      this.currentMiniGameDisplay.container.destroy()
      this.currentMiniGameDisplay = null
    }

    if (this.miniGameTimer) {
      clearInterval(this.miniGameTimer)
      this.miniGameTimer = null
    }
  }

  showMiniGameResult(teamId, score, feedback, success) {
    const team = this.gameState?.teams.find((t) => t.id === teamId)
    if (!team) return

    // Hide the mini-game display
    this.hideMiniGameDisplay()

    const color = success ? 0x2ecc71 : 0xe74c3c
    const scoreText = score > 0 ? `+${score}` : `${score}`

    // Create result banner - much larger to accommodate character images
    const resultBanner = this.add.rectangle(this.centerX, this.centerY - 50, 1200, 350, color, 0.9)
    resultBanner.setStrokeStyle(6, success ? 0x27ae60 : 0xc0392b)

    const teamDisplay = team.name || `隊伍 ${team.id.split('_')[1]}`

    // Add team image to result modal - larger size
    // const resultTeamImage = this.add.image(this.centerX - 160, this.centerY - 80, team.id || 'team_default')
    // resultTeamImage.setDisplaySize(60, 60) // Much larger size
    // resultTeamImage.setOrigin(0.5)

    // Add random result image based on success/failure
    let resultImage = null
    if (!success) {
      // Add random bad result image when losing
      const badImages = ['resultBadImg', 'resultBadImg2']
      const randomBadImage = badImages[Math.floor(Math.random() * badImages.length)]
      resultImage = this.add.image(this.centerX + 450, this.centerY, randomBadImage)
      resultImage.setDisplaySize(200, 200)
      resultImage.setOrigin(0.5)
    } else {
      // Add random good result image when winning
      const goodImages = ['resultGoodImg', 'resultGoodImg2']
      const randomGoodImage = goodImages[Math.floor(Math.random() * goodImages.length)]
      resultImage = this.add.image(this.centerX + 450, this.centerY, randomGoodImage)
      resultImage.setDisplaySize(200, 200)
      resultImage.setOrigin(0.5)
    }

    const resultText = this.add.text(this.centerX, this.centerY - 50, `${success ? '✅' : '❌'} ${teamDisplay}\n${feedback}\n${scoreText} 分`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: 800 }, // Add proper word wrap for better text layout
    })
    resultText.setOrigin(0.5)

    // Animate result
    resultBanner.setScale(0)
    resultText.setScale(0)
    // resultTeamImage.setScale(0)
    if (resultImage) resultImage.setScale(0)

    const animationTargets = [resultBanner, resultText]
    if (resultImage) animationTargets.push(resultImage)

    this.tweens.add({
      targets: animationTargets,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    })

    // Auto-hide after 4 seconds
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: animationTargets,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          resultBanner.destroy()
          resultText.destroy()
          // resultTeamImage.destroy()
          if (resultImage) resultImage.destroy()
        },
      })
    })
  }

  showChanceCard(teamId, chanceCard, newScore, newPosition) {
    const team = this.gameState?.teams.find((t) => t.id === teamId)
    if (!team) return

    // Determine color based on card type
    let bgColor, borderColor
    switch (chanceCard.type) {
      case 'disaster':
        bgColor = 0x8e44ad
        borderColor = 0x732d91
        break
      case 'bad':
        bgColor = 0xe74c3c
        borderColor = 0xc0392b
        break
      case 'neutral':
        bgColor = 0x7f8c8d
        borderColor = 0x5d6d6e
        break
      case 'good':
        bgColor = 0x27ae60
        borderColor = 0x1e8449
        break
      case 'excellent':
        bgColor = 0xf1c40f
        borderColor = 0xd4ac0d
        break
      default:
        bgColor = 0x34495e
        borderColor = 0x2c3e50
    }

    // Create chance card display - much larger for enlarged container
    const cardBanner = this.add.rectangle(this.centerX, this.centerY, 1200, 400, bgColor, 0.95)
    cardBanner.setStrokeStyle(8, borderColor)

    const scoreText = chanceCard.scoreChange > 0 ? `+${chanceCard.scoreChange}` : `${chanceCard.scoreChange}`
    const positionText = chanceCard.effect === 'reset_to_start' ? '\n📍 回到起點！' : ''

    const teamDisplay = team.name || `隊伍 ${team.id.split('_')[1]}`

    // Add team image to chance card modal - larger size
    const chanceTeamImage = this.add.image(this.centerX - 240, this.centerY - 120, team.id || 'team_default')
    chanceTeamImage.setScale(0.15)
    chanceTeamImage.setOrigin(0.5)

    const cardText = this.add.text(this.centerX, this.centerY, `🃏 ${teamDisplay} 抽到機會卡！\n\n${chanceCard.title}\n${chanceCard.description}\n\n💰 分數變化: ${scoreText}${positionText}`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 16,
      wordWrap: { width: 1100 },
    })
    cardText.setOrigin(0.5)

    // Dramatic entrance animation
    cardBanner.setScale(0)
    cardText.setScale(0)
    chanceTeamImage.setScale(0)

    this.tweens.add({
      targets: [cardBanner, cardText, chanceTeamImage],
      scaleX: 1,
      scaleY: 1,
      duration: 800,
      ease: 'Back.easeOut',
    })

    // Auto-hide after 4 seconds
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: [cardBanner, cardText, chanceTeamImage],
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          cardBanner.destroy()
          cardText.destroy()
          chanceTeamImage.destroy()
        },
      })
    })
  }

  showDestinyCard(teamId, destinyCard, newScore, newPosition) {
    const team = this.gameState?.teams.find((t) => t.id === teamId)
    if (!team) return

    // Determine dark colors for destiny cards (all negative)
    let bgColor, borderColor
    switch (destinyCard.type) {
      case 'disaster':
        bgColor = 0x8b0000
        borderColor = 0x5c0000
        break
      case 'bad':
        bgColor = 0xc0392b
        borderColor = 0xa93226
        break
      case 'curse':
        bgColor = 0x4a0e4e
        borderColor = 0x2e0932
        break
      case 'storm':
        bgColor = 0x34495e
        borderColor = 0x2c3e50
        break
      case 'competition':
        bgColor = 0x8b4513
        borderColor = 0x654321
        break
      case 'economic':
        bgColor = 0x556b2f
        borderColor = 0x2f4f2f
        break
      default:
        bgColor = 0x8b0000
        borderColor = 0x5c0000
    }

    // Create destiny card display with darker, more ominous styling - much larger for enlarged container
    const cardBanner = this.add.rectangle(this.centerX, this.centerY, 1200, 400, bgColor, 0.95)
    cardBanner.setStrokeStyle(8, borderColor)

    const scoreText = `${destinyCard.scoreChange}`
    const positionText = destinyCard.effect === 'reset_to_start' ? '\n📍 回到起點！' : destinyCard.effect === 'move_back' ? `\n📍 後退 ${Math.abs(destinyCard.positionChange || 0)} 格！` : ''

    const teamDisplay = team.name || `隊伍 ${team.id.split('_')[1]}`

    // Add team image to destiny card modal - larger size
    const destinyTeamImage = this.add.image(this.centerX - 240, this.centerY - 120, team.id || 'team_default')
    destinyTeamImage.setScale(0.15)
    destinyTeamImage.setOrigin(0.5)
    destinyTeamImage.setTint(0x888888) // Darken the team image for destiny effect

    const cardText = this.add.text(this.centerX, this.centerY, `💀 ${teamDisplay} 抽到命運卡！\n\n${destinyCard.title}\n${destinyCard.description}\n\n💸 分數變化: ${scoreText}${positionText}`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 16,
      wordWrap: { width: 1100 },
    })
    cardText.setOrigin(0.5)

    // Dramatic entrance animation with shake effect
    cardBanner.setScale(0)
    cardText.setScale(0)
    destinyTeamImage.setScale(0)

    this.tweens.add({
      targets: [cardBanner, cardText, destinyTeamImage],
      scaleX: 1,
      scaleY: 1,
      duration: 800,
      ease: 'Back.easeOut',
    })

    // Add screen shake effect for dramatic impact
    this.cameras.main.shake(200, 0.01)

    // Auto-hide after 4 seconds
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: [cardBanner, cardText, destinyTeamImage],
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          cardBanner.destroy()
          cardText.destroy()
          destinyTeamImage.destroy()
        },
      })
    })
  }

  hideMiniGameBanner() {
    if (this.currentMiniGameBanner) {
      const { banner, bannerText, bannerTeamImage } = this.currentMiniGameBanner

      // Stop any existing tweens on these objects first
      this.tweens.killTweensOf([banner, bannerText, bannerTeamImage].filter(Boolean))

      this.tweens.add({
        targets: [banner, bannerText, bannerTeamImage].filter(Boolean),
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          if (banner) banner.destroy()
          if (bannerTeamImage) bannerTeamImage.destroy()
          if (bannerText) bannerText.destroy()
        },
      })

      this.currentMiniGameBanner = null
    }
  }

  getEventName(eventType) {
    const eventNames = {
      multiple_choice_quiz: '選擇題挑戰',
      drag_drop_workflow: '流程排序',
      format_matching: '連連看',
      true_or_false: '是非題',
    }
    return eventNames[eventType] || `🎯 ${eventType}`
  }
}
