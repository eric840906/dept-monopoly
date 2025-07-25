const { GAME_CONFIG } = require('../../shared/constants')

class MiniGameProcessor {
  constructor() {
    this.activeGames = new Map() // teamId -> gameData
  }

  startMiniGame(teamId, eventType, gameState) {
    const gameData = this.generateMiniGameData(eventType, gameState)
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
        console.log(`Mini-game timer started for team ${teamId}`)
      }
      return true // Always return true if the game exists
    }
    return false
  }

  generateMiniGameData(eventType, gameState) {
    switch (eventType) {
      case 'multiple_choice_quiz':
        return this.generateMultipleChoiceQuiz()
      case 'drag_drop_workflow':
        return this.generateDragDropWorkflow()
      case 'format_matching':
        return this.generateFormatMatching()
      case 'true_or_false':
        return this.generateTrueOrFalse()
      default:
        return this.generateDefaultGame(eventType)
    }
  }

  generateMultipleChoiceQuiz() {
    const questions = [
      {
        question: '請問 OneAD 集團裡有幾個 UI/UX 設計師？',
        options: ['8', '3', '1', '5'],
        correct: 2,
        explanation: '答案是1個，你現在知道了',
      },
      {
        question: 'IAS 量測目前不支援什麼環境量測？',
        options: ['Desktop', 'Mobile', 'APP', 'Instream'],
        correct: 2,
        explanation: 'IAS 量測目前不支援 APP 環境量測',
        // No image for this question
      },
      {
        question: '以下 Studio 圖片示意是那個格式？',
        options: ['MIB Flash', 'MIB Flash Location', 'MIB Location', 'MIB Location Video'],
        correct: 1,
        explanation: '哈哈，這是 MIB Flash Location 啦！',
        image: '/images/quiz/mib_flash_location_door_video.svg', // Optional image
      },
      {
        question: '媒體部署 OneAD Player SDK 有哪些方式？',
        options: ['直接部署', '透過 GAM 部署', '媒體 Server 部署', '以上皆是'],
        correct: 3,
        explanation: '哈哈，三種都行啦！',
      },
      {
        question: 'MTO 不會跟哪部門直接合作？',
        options: ['AOE', 'BAO', 'Sales', 'Creative Center'],
        correct: 2,
        explanation: '你現在知道了吧',
      },
      {
        question: 'One-Pixel 的用意是什麼？',
        options: ['一份文件', '一張圖片', '一個紀錄', '一種使命'],
        correct: 2,
        explanation: '你現在知道了吧',
      },
      {
        question: '新格式是？',
        options: ['MTO 的一廂情願', 'PM, 創意, MTO 的協作成果', '自我實現的產物', '為了美化媒體網站'],
        correct: 1,
        explanation: '答案是「PM, 創意, MTO 的協作成果」，你現在知道了吧',
      },
      {
        question: '下列何者不是 MTO 工作內容？',
        options: ['開發新格式 ', '媒體客製化', '檢查追蹤碼', '廣告追蹤碼埋設'],
        correct: 3,
        explanation: '答案是「廣告追蹤碼埋設」，你現在知道了吧',
      },
      {
        question: '誰是 MTO 最資深員工？',
        options: ['Eric', 'Sam', 'Tobey', 'Baird'],
        correct: 1,
        explanation: '答案是「Sam」，你現在知道了吧',
      },
      {
        question: 'MTO 平日最愛系統？',
        options: ['ODM', 'Studio', 'ERP', '以上皆是'],
        correct: 3,
        explanation: '答案是「以上皆是」，你現在知道了吧',
      },
      {
        question: '以下同事誰沒待過 MTO？',
        options: ['Zack', 'Ryan', 'Zone', 'Rocco'],
        correct: 3,
        explanation: '答案是「Rocco」，你現在知道了吧',
      },
    ]

    const selectedQuestion = questions[Math.floor(Math.random() * questions.length)]

    return {
      eventType: 'multiple_choice_quiz',
      timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.MULTIPLE_CHOICE,
      data: selectedQuestion,
    }
  }

  generateDragDropWorkflow() {
    const workflows = [
      {
        title: '格式開發流程',
        correctOrder: ['技術可行性討論', 'UI/UX 設計', 'Kick off 產品', '排程開發', '裝置環境測試', '媒體投放測試'],
        description: '請按格式開發的正確順序排列',
      },
      {
        title: '第 3 方追蹤碼部署流程',
        correctOrder: ['kanban 接收需求', '檢視部署方案', '執行部署與檢查'],
        description: '請按照第 3 方追蹤碼部署的流程排列',
      },
      //   {
      //     title: '產品設計流程',
      //     correctOrder: ['市場調研', '用戶分析', '原型設計', '測試驗證', '迭代優化', '產品發布'],
      //     description: '請按照產品設計的完整流程排列',
      //   },
      //   {
      //     title: '問題解決流程',
      //     correctOrder: ['問題識別', '原因分析', '方案制定', '方案執行', '效果評估'],
      //     description: '請按照問題解決的科學方法排列',
      //   },
    ]

    const selectedWorkflow = workflows[Math.floor(Math.random() * workflows.length)]
    // Shuffle the correct order for display
    const shuffledItems = [...selectedWorkflow.correctOrder].sort(() => Math.random() - 0.5)

    return {
      eventType: 'drag_drop_workflow',
      timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.DRAG_DROP,
      data: {
        ...selectedWorkflow,
        shuffledItems,
      },
    }
  }

  generateFormatMatching() {
    const matchingSets = [
      {
        title: '連連看 - MIR 格式',
        pairs: [
          { left: 'Page', right: '飛天魔毯' },
          { left: 'Sticky', right: '影音三秒膠' },
          { left: 'Tag', right: '互動標籤' },
          { left: 'Ticker', right: '焦點跑馬燈' },
          { left: 'Scratch', right: '神刮手' },
        ],
      },
      {
        title: '連連看 - MIB 格式',
        pairs: [
          { left: 'Flash', right: '快閃焦點' },
          { left: 'Gallery', right: '置底迴廊' },
          { left: 'Star', right: '置底大明星' },
          { left: 'Message', right: '訊息響叮噹' },
          { left: 'Social', right: '社群便利貼' },
        ],
      },
      {
        title: '連連看 - 其他格式',
        pairs: [
          { left: 'Cover', right: '大蓋板' },
          { left: 'Poster', right: '蓋版大海報' },
          { left: 'Desktop-frame', right: 'ㄇ簾' },
        ],
      },
      {
        title: '連連看 - MTO 成員名字1',
        pairs: [
          { left: 'Sam', right: '張碩吟' },
          { left: 'James', right: '許晨光' },
          { left: 'Tobey', right: '簡佑珊' },
          { left: 'Baird', right: '馬舜仁' },
          { left: 'Eric', right: '邱玉躍' },
        ],
      },
      {
        title: '連連看 - MTO 成員名字2',
        pairs: [
          { left: 'Jack', right: '鄭仲傑' },
          { left: 'Danson', right: '王奕智' },
          { left: 'Neko', right: '徐瑾彣' },
          { left: 'Emma', right: '王君瑜' },
        ],
      },
    ]

    const selectedSet = matchingSets[Math.floor(Math.random() * matchingSets.length)]
    // Randomly select 4-5 pairs
    const selectedPairs = selectedSet.pairs.sort(() => Math.random() - 0.5).slice(0, Math.min(5, selectedSet.pairs.length))

    return {
      eventType: 'format_matching',
      timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.FORMAT_MATCHING,
      data: {
        title: selectedSet.title,
        pairs: selectedPairs,
      },
    }
  }

  generateTrueOrFalse() {
    const questions = [
      {
        question: '在 Figma 中想用 cursor 聊天按滑鼠右鍵就可以了',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        question: 'MTO 最常使用的系統測試機是 rd-odm',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        question: '可直接找 MTO 提亂七八糟的需求',
        answer: false,
        explanation: '請按照正常流程',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        question: 'VAST 支援 CCT',
        answer: false,
        explanation: '',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        question: '客戶的需求永遠是正確的',
        answer: false,
        explanation: '客戶的需求需要被理解和分析，有時需要專業建議來引導到更好的解決方案',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        question: 'VPAID 支援 CCT',
        answer: true,
        explanation: '客戶的需求需要被理解和分析，有時需要專業建議來引導到更好的解決方案',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
      {
        question: 'SIMID 支援 CCT',
        answer: true,
        explanation: '客戶的需求需要被理解和分析，有時需要專業建議來引導到更好的解決方案',
        trueEmoji: '⭕',
        falseEmoji: '❌',
      },
    ]

    const selectedQuestion = questions[Math.floor(Math.random() * questions.length)]

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
      return {
        eventType: 'no_active_game',
        score: 0,
        success: false,
        feedback: '沒有進行中的小遊戲，請等待您的回合',
        timeTaken: 0,
        isTimeout: false,
      }
    }

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

    if (isTimeout && !submission.timeout) {
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
    }
  }

  evaluateMultipleChoice(data, submission) {
    const isCorrect = submission.answer === data.correct
    return {
      score: isCorrect ? GAME_CONFIG.SCORING.SUCCESS : GAME_CONFIG.SCORING.FAILURE,
      success: isCorrect,
      feedback: isCorrect ? '回答正確！' : `回答錯誤。正確答案：${data.options[data.correct]}`,
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
