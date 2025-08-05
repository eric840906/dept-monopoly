const { GAME_CONFIG } = require('../../shared/constants')

class MiniGameProcessor {
  constructor() {
    this.activeGames = new Map() // teamId -> gameData
    this.usedQuestions = new Map() // teamId -> Set of used question IDs
    this.currentGameSeed = Date.now() // Seed for synchronizing random generation across teams
    this.timeouts = new Map() // teamId -> setTimeout ID
    this.gameManager = null // Will be set by GameManager
  }

  setGameManager(gameManager) {
    this.gameManager = gameManager
  }

  resetUsedQuestions() {
    console.log('Resetting all used questions for all teams')
    this.usedQuestions.clear()
  }

  clearAllTimeouts() {
    console.log('Clearing all mini-game timeouts')
    for (const [teamId, timeoutId] of this.timeouts) {
      clearTimeout(timeoutId)
      console.log(`Cleared timeout for team ${teamId}`)
    }
    this.timeouts.clear()
  }

  startMiniGame(teamId, eventType, gameState) {
    // Update seed only when starting the first mini-game of this round
    // This ensures all teams get synchronized content
    if (this.activeGames.size === 0) {
      this.updateGameSeed()
    }
    
    const gameData = this.generateMiniGameData(eventType, gameState, teamId)
    this.activeGames.set(teamId, {
      ...gameData,
      startTime: null, // Will be set when client confirms ready
      teamId,
      isWaitingForClient: true,
      readyPlayers: new Set(), // Track which players have confirmed ready
    })

    return gameData
  }

  confirmClientReady(teamId) {
    const gameData = this.activeGames.get(teamId)
    if (gameData) {
      // Always allow confirmation, just track it
      if (gameData.isWaitingForClient) {
        gameData.startTime = Date.now()
        gameData.isWaitingForClient = false
        console.log(`Mini-game client ready confirmed for team ${teamId}`)
        // Note: Timeout will be set up when actual timer starts (after preparation phase)
      }
      return true // Always return true if the game exists
    }
    return false
  }

  startTimerWithTimeout(teamId) {
    const gameData = this.activeGames.get(teamId)
    if (gameData) {
      // Update the actual start time to now (when timer really starts)
      gameData.startTime = Date.now()
      console.log(`Mini-game timer started for team ${teamId}`)
      
      // Set up automatic timeout for the game duration
      this.setupTimeout(teamId, gameData.timeLimit)
      return true
    }
    return false
  }

  setupTimeout(teamId, timeLimit) {
    // Clear any existing timeout for this team
    this.clearTimeout(teamId)
    
    // Set up new timeout
    const timeoutId = setTimeout(() => {
      this.handleTimeout(teamId)
    }, timeLimit)
    
    this.timeouts.set(teamId, timeoutId)
    console.log(`Timeout set for team ${teamId}: ${timeLimit}ms`)
  }

  clearTimeout(teamId) {
    const timeoutId = this.timeouts.get(teamId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(teamId)
      console.log(`Timeout cleared for team ${teamId}`)
    }
  }

  handleTimeout(teamId) {
    console.log(`Mini-game timeout for team ${teamId}`)
    
    const gameData = this.activeGames.get(teamId)
    if (!gameData || !this.gameManager) {
      console.log(`No game data or game manager for team ${teamId}`)
      return
    }

    // Check if this game has already been processed (race condition prevention)
    if (gameData.processed) {
      console.log(`Mini-game for team ${teamId} already processed, ignoring timeout`)
      return
    }

    // Mark as processed to prevent double processing
    gameData.processed = true

    // Process timeout as a failed submission
    const result = this.evaluateSubmission(gameData, { timeout: true })
    
    // Update team score through game manager
    this.gameManager.updateScore(teamId, result.score, result.feedback)

    // Broadcast timeout result
    if (this.gameManager.io) {
      this.gameManager.io.emit('mini_game_result', {
        teamId,
        ...result,
      })
    }

    // Clean up
    this.activeGames.delete(teamId)
    this.clearTimeout(teamId)

    // End turn after timeout
    setTimeout(() => {
      if (this.gameManager.gameState.phase === 'in_progress' && 
          this.gameManager.gameState.currentTurnTeamId === teamId) {
        this.gameManager.endTurn()
      }
    }, GAME_CONFIG.RESULT_DISPLAY_TIME || 3000)
  }

  generateMiniGameData(eventType, gameState, teamId) {
    switch (eventType) {
      case 'multiple_choice_quiz':
        return this.generateMultipleChoiceQuiz(teamId)
      case 'drag_drop_workflow':
        return this.generateDragDropWorkflow(teamId)
      case 'format_matching':
        return this.generateFormatMatching(teamId)
      case 'true_or_false':
        return this.generateTrueOrFalse(teamId)
      default:
        return this.generateDefaultGame(eventType)
    }
  }

  generateMultipleChoiceQuiz(teamId) {
    const questions = [
      {
        id: 'mc_q1',
        question: '請問 OneAD 集團裡有幾個 UI/UX 設計師？',
        options: ['8', '3', '1', '5'],
        correct: 2,
        explanation: '',
      },
      {
        id: 'mc_q2',
        question: '請問 OneAD 集團裡有幾個 QA？',
        options: ['5', '3', '2', '4'],
        correct: 2,
        explanation: '',
      },
      {
        id: 'mc_q3',
        question: 'IAS 量測目前不支援什麼環境量測？',
        options: ['Desktop', 'Mobile', 'APP', 'Instream'],
        correct: 2,
        explanation: '',
      },
      {
        id: 'mc_q4',
        question: '以下 Studio 圖片示意是那個格式？',
        options: ['MIB Flash', 'MIB Flash Location', 'MIB Location', 'MIB Location Video'],
        correct: 1,
        explanation: '',
        image: '/images/quiz/mib_flash_location_door_video.svg',
      },
      {
        id: 'mc_q5',
        question: '媒體部署 OneAD Player SDK 有哪些方式？',
        options: ['直接部署', '透過 GAM 部署', '媒體 Server 部署', '以上皆是'],
        correct: 3,
        explanation: '',
      },
      {
        id: 'mc_q6',
        question: 'MTO 不會跟哪部門直接合作？',
        options: ['AOE', 'BAO', 'Sales', 'Creative Center'],
        correct: 2,
        explanation: '',
      },
      {
        id: 'mc_q7',
        question: 'MTO 全名是什麼？',
        options: ['Marketing Technology Office', 'Media Transmission Optimization', 'Multimedia Tech Operations', 'Media Tech Operation'],
        correct: 3,
        explanation: '',
      },
      {
        id: 'mc_q8',
        question: '新格式是？',
        options: ['MTO 的一廂情願', 'PM, 創意, MTO 的協作成果', '自我實現的產物', '為了美化媒體網站'],
        correct: 1,
        explanation: '',
      },
      {
        id: 'mc_q9',
        question: '下列何者不是 MTO 工作內容？',
        options: ['開發新格式 ', '媒體客製化', '檢查追蹤碼', '廣告追蹤碼埋設'],
        correct: 3,
        explanation: '',
      },
      {
        id: 'mc_q10',
        question: '誰是 MTO 最資深員工？',
        options: ['Eric', 'Sam', 'Tobey', 'Baird'],
        correct: 1,
        explanation: '',
      },
      {
        id: 'mc_q11',
        question: 'MTO 平日最愛系統？',
        options: ['ODM', 'Studio', 'ERP', '以上皆是'],
        correct: 3,
        explanation: '',
      },
      {
        id: 'mc_q12',
        question: '以下同事誰沒待過 MTO？',
        options: ['江乾輔', '孟慶泰', '陳坤鐘', '簡福仁 '],
        correct: 3,
        explanation: '',
      },
    ]

    // Get or initialize used questions for this team
    if (!this.usedQuestions.has(teamId)) {
      this.usedQuestions.set(teamId, new Set())
    }
    
    const usedQuestionIds = this.usedQuestions.get(teamId)
    
    // Filter out used questions
    const availableQuestions = questions.filter(q => !usedQuestionIds.has(q.id))
    
    // If all questions have been used, reset the used questions for this team
    if (availableQuestions.length === 0) {
      console.log(`Team ${teamId} has seen all multiple choice questions, resetting pool`)
      usedQuestionIds.clear()
      availableQuestions.push(...questions)
    }
    
    // Select a random question from available ones
    const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
    
    // Mark this question as used for this team
    usedQuestionIds.add(selectedQuestion.id)
    
    console.log(`Team ${teamId} got multiple choice question: ${selectedQuestion.id}`)

    return {
      eventType: 'multiple_choice_quiz',
      timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.MULTIPLE_CHOICE,
      data: selectedQuestion,
    }
  }

  generateDragDropWorkflow(teamId) {
    const workflows = [
      {
        title: '格式開發流程',
        correctOrder: ['共同討論需求可行性', 'UI/UX 視覺設計', 'Developer 開發', 'QA 團隊測試'],
        description: '請按正確順序排列',
      },
      {
        title: 'OnePixel 部署流程',
        correctOrder: ['kanban 接收需求', '檢視部署方案', '執行部署與檢查'],
        description: '請按正確順序排列',
      },
      {
        title: '媒體廣告投放異常',
        correctOrder: ['定義問題', '共同討論解決方案', '排入工作修正', 'QA 團隊測試', '回報修正'],
        description: '請按照產品設計的完整流程排列',
      },
    ]

    // Use a fixed seed based on current time/round to ensure all teams get the same workflow and shuffle
    const seed = this.getCurrentGameSeed()
    const selectedWorkflow = workflows[seed % workflows.length]
    
    // Use seeded random to ensure all teams get the same shuffle
    const shuffledItems = [...selectedWorkflow.correctOrder]
    this.seededShuffle(shuffledItems, seed)

    return {
      eventType: 'drag_drop_workflow',
      timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.DRAG_DROP,
      data: {
        ...selectedWorkflow,
        shuffledItems,
      },
    }
  }

  generateFormatMatching(teamId) {
    const matchingSets = [
      {
        title: 'MIR 格式',
        pairs: [
          { left: 'Page', right: '飛天魔毯' },
          { left: 'Sticky', right: '影音三秒膠' },
          { left: 'Tag', right: '互動標籤' },
          { left: 'Ticker', right: '焦點跑馬燈' },
          { left: 'Scratch', right: '神刮手' },
        ],
      },
      {
        title: 'MIB 格式',
        pairs: [
          { left: 'Flash', right: '快閃焦點' },
          { left: 'Gallery', right: '置底迴廊' },
          { left: 'Star', right: '置底大明星' },
          { left: 'Message', right: '訊息響叮噹' },
          { left: 'Social', right: '社群便利貼' },
        ],
      },
      {
        title: '其他格式',
        pairs: [
          { left: 'Cover', right: '大蓋板' },
          { left: 'Poster', right: '蓋版大海報' },
          { left: 'Desktop-frame', right: 'ㄇ簾' },
        ],
      },
      {
        title: 'MTO 成員名字 1',
        pairs: [
          { left: 'Sam', right: '張碩吟' },
          { left: 'James', right: '許晨光' },
          { left: 'Tobey', right: '簡佑珊' },
          { left: 'Baird', right: '馬舜仁' },
          { left: 'Eric', right: '邱玉躍' },
        ],
      },
      {
        title: 'MTO 成員名字 2',
        pairs: [
          { left: 'Jack', right: '鄭仲傑' },
          { left: 'Danson', right: '王奕智' },
          { left: 'Neko', right: '徐瑾彣' },
          { left: 'Emma', right: '王君瑜' },
        ],
      },
    ]

    // Use a fixed seed to ensure all teams get the same matching set and pairs
    const seed = this.getCurrentGameSeed()
    const selectedSet = matchingSets[seed % matchingSets.length]
    
    // Use seeded random to select pairs consistently across all teams
    const shuffledPairs = [...selectedSet.pairs]
    this.seededShuffle(shuffledPairs, seed)
    const selectedPairs = shuffledPairs.slice(0, Math.min(5, selectedSet.pairs.length))

    // Create synchronized shuffled left and right columns for consistent display
    // Create shuffled versions using seeded randomization
    const shuffledLeft = [...selectedPairs]
    const shuffledRight = [...selectedPairs]
    this.seededShuffle(shuffledLeft, seed + 1) // Different seed for left shuffle
    this.seededShuffle(shuffledRight, seed + 2) // Different seed for right shuffle

    return {
      eventType: 'format_matching',
      timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.FORMAT_MATCHING,
      data: {
        title: selectedSet.title,
        pairs: selectedPairs,
        shuffledLeft: shuffledLeft,
        shuffledRight: shuffledRight,
      },
    }
  }

  generateTrueOrFalse(teamId) {
    const questions = [
      {
        id: 'tf_q1',
        question: '在 Figma 中想用 cursor 聊天按滑鼠右鍵就可以了',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q2',
        question: 'MTO 全名是 Media Technology Office',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q3',
        question: 'MTO 全名是 Multimedia Tech Operations',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q4',
        question: 'MTO 全名是 Media Tech Operation',
        answer: true,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q5',
        question: 'MTO 最常使用的系統測試機是 rd-odm',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q6',
        question: '可直接找 MTO 提亂七八糟的需求',
        answer: false,
        explanation: '請按照正常流程',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q7',
        question: 'VAST 支援 CCT',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q8',
        question: '客戶的需求永遠是正確的',
        answer: false,
        explanation: '需求可能需要調整和優化',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q9',
        question: 'VPAID 支援 CCT',
        answer: true,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        id: 'tf_q10',
        question: 'SIMID 支援 CCT',
        answer: true,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
    ]

    // Get or initialize used questions for this team  
    if (!this.usedQuestions.has(teamId)) {
      this.usedQuestions.set(teamId, new Set())
    }
    
    const usedQuestionIds = this.usedQuestions.get(teamId)
    
    // Filter out used questions
    const availableQuestions = questions.filter(q => !usedQuestionIds.has(q.id))
    
    // If all questions have been used, reset the used questions for this team
    if (availableQuestions.length === 0) {
      console.log(`Team ${teamId} has seen all true/false questions, resetting pool`)
      usedQuestionIds.clear()
      availableQuestions.push(...questions)
    }
    
    // Select a random question from available ones
    const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
    
    // Mark this question as used for this team
    usedQuestionIds.add(selectedQuestion.id)
    
    console.log(`Team ${teamId} got true/false question: ${selectedQuestion.id}`)

    return {
      eventType: 'true_or_false',
      timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.TRUE_OR_FALSE,
      data: selectedQuestion,
    }
  }

  generateDefaultGame(eventType) {
    return {
      eventType: 'default',
      timeLimit: 15000,
      data: {
        title: '特殊事件',
        description: `觸發了 ${eventType} 事件，請等待主持人說明。`,
        message: '這是一個特殊情況，需要主持人判斷結果。',
      },
    }
  }

  processResult(teamId, submission) {
    const gameData = this.activeGames.get(teamId)
    if (!gameData) {
      // Instead of throwing an error, return a graceful response
      console.warn(`No active mini-game for team ${teamId}. Submission ignored.`)
      return null // Return null to indicate no banner should be shown
    }

    // Check if this game has already been processed (race condition prevention)
    if (gameData.processed) {
      console.log(`Mini-game for team ${teamId} already processed, ignoring submission`)
      return null // Return null to indicate no banner should be shown
    }

    // Mark as processed to prevent double processing
    gameData.processed = true

    // Clear timeout since we received a submission
    this.clearTimeout(teamId)

    const result = this.evaluateSubmission(gameData, submission)

    // Clean up
    this.activeGames.delete(teamId)

    return result
  }

  evaluateSubmission(gameData, submission) {
    const { eventType, data, startTime, isWaitingForClient } = gameData

    // Calculate timing - if timer hasn't started yet, no timeout possible
    let timeTaken, isTimeout
    if (!startTime || isWaitingForClient) {
      timeTaken = 0
      isTimeout = false
    } else {
      timeTaken = Date.now() - startTime
      isTimeout = timeTaken > gameData.timeLimit
    }

    let score = 0
    let success = false
    let feedback = ''

    if (isTimeout || submission.timeout) {
      score = -5
      feedback = '時間超時'
    } else {
      switch (eventType) {
        case 'multiple_choice_quiz':
          ;({ score, success, feedback } = this.evaluateMultipleChoice(data, submission))
          break
        case 'drag_drop_workflow':
          ;({ score, success, feedback } = this.evaluateDragDrop(data, submission))
          break
        case 'format_matching':
          ;({ score, success, feedback } = this.evaluateFormatMatching(data, submission))
          break
        case 'true_or_false':
          ;({ score, success, feedback } = this.evaluateTrueOrFalse(data, submission))
          break
        default:
          score = 0
          success = true
          feedback = '特殊事件完成'
      }
    }

    return {
      eventType,
      score,
      success,
      feedback,
      timeTaken,
      isTimeout,
      userAnswer: submission.answer,
      gameData: data,
    }
  }

  evaluateMultipleChoice(data, submission) {
    const isCorrect = submission.answer === data.correct
    return {
      score: isCorrect ? GAME_CONFIG.SCORING.SUCCESS : GAME_CONFIG.SCORING.FAILURE,
      success: isCorrect,
      feedback: isCorrect ? '回答正確！' : '回答錯誤。',
    }
  }

  evaluateDragDrop(data, submission) {
    const correctOrder = data.correctOrder
    const userOrder = submission.answer

    if (!Array.isArray(userOrder)) {
      return {
        score: GAME_CONFIG.SCORING.FAILURE,
        success: false,
        feedback: '提交格式錯誤',
      }
    }

    let correctPositions = 0
    const minLength = Math.min(correctOrder.length, userOrder.length)

    for (let i = 0; i < minLength; i++) {
      if (correctOrder[i] === userOrder[i]) {
        correctPositions++
      }
    }

    const accuracy = correctPositions / correctOrder.length
    let score, success

    if (accuracy >= 0.8) {
      score = GAME_CONFIG.SCORING.SUCCESS
      success = true
    } else if (accuracy >= 0.5) {
      score = GAME_CONFIG.SCORING.PARTIAL
      success = false
    } else {
      score = GAME_CONFIG.SCORING.FAILURE
      success = false
    }

    return {
      score,
      success,
      feedback: `正確率: ${Math.round(accuracy * 100)}%`,
    }
  }

  evaluateFormatMatching(data, submission) {
    const correctPairs = data.pairs
    const userMatches = submission.answer

    if (!Array.isArray(userMatches)) {
      return {
        score: GAME_CONFIG.SCORING.FAILURE,
        success: false,
        feedback: '提交格式錯誤',
      }
    }

    let correctMatches = 0

    userMatches.forEach((match) => {
      const correctPair = correctPairs.find((pair) => pair.left === match.left)
      if (correctPair && correctPair.right === match.right) {
        correctMatches++
      }
    })

    const accuracy = correctMatches / correctPairs.length
    let score, success

    if (accuracy >= 0.8) {
      score = GAME_CONFIG.SCORING.SUCCESS
      success = true
    } else if (accuracy >= 0.5) {
      score = GAME_CONFIG.SCORING.PARTIAL
      success = false
    } else {
      score = GAME_CONFIG.SCORING.FAILURE
      success = false
    }

    return {
      score,
      success,
      feedback: `配對正確: ${correctMatches}/${correctPairs.length}`,
    }
  }

  evaluateTrueOrFalse(data, submission) {
    const isCorrect = submission.answer === data.answer
    return {
      score: isCorrect ? GAME_CONFIG.SCORING.SUCCESS : GAME_CONFIG.SCORING.FAILURE,
      success: isCorrect,
      feedback: isCorrect ? '回答正確！' : `回答錯誤。${data.explanation}`,
    }
  }

  // Utility methods for synchronized random generation
  getCurrentGameSeed() {
    return this.currentGameSeed
  }

  updateGameSeed() {
    this.currentGameSeed = Date.now()
    console.log('Updated game seed for synchronized mini-games:', this.currentGameSeed)
  }

  // Seeded random number generator using simple Linear Congruential Generator
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // Fisher-Yates shuffle with seeded randomization
  seededShuffle(array, seed) {
    let currentIndex = array.length
    let temporaryValue, randomIndex

    // While there remain elements to shuffle
    while (0 !== currentIndex) {
      // Pick a remaining element using seeded random
      randomIndex = Math.floor(this.seededRandom(seed + currentIndex) * currentIndex)
      currentIndex -= 1

      // Swap it with the current element
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }

    return array
  }

  getActiveGameCount() {
    return this.activeGames.size
  }

  clearExpiredGames() {
    const now = Date.now()
    const expiredGames = []

    this.activeGames.forEach((gameData, teamId) => {
      if (now - gameData.startTime > gameData.timeLimit + 5000) {
        // 5 second grace period
        expiredGames.push(teamId)
      }
    })

    expiredGames.forEach((teamId) => {
      this.activeGames.delete(teamId)
    })

    return expiredGames.length
  }
}

module.exports = MiniGameProcessor
