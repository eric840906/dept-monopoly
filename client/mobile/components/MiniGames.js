// Mini Games Component for Mobile Interface

window.MiniGames = {
  currentGame: null,
  gameContainer: null,
  socket: null,
  teamId: null,

  load(gameData, container, socket, teamId, playerId, onReadyCallback) {
    // Stop any existing timer first
    this.stopTimer()

    this.gameContainer = container
    this.socket = socket
    this.teamId = teamId
    this.playerId = playerId
    this.currentGame = gameData
    this.onReadyCallback = onReadyCallback

    // Clear container
    container.innerHTML = ''

    // Load appropriate mini-game
    switch (gameData.eventType) {
      case 'multiple_choice_quiz':
        this.loadMultipleChoice(gameData)
        break
      case 'drag_drop_workflow':
        this.loadDragDrop(gameData)
        break
      case 'format_matching':
        this.loadFormatMatching(gameData)
        break
      case 'true_or_false':
        this.loadTrueOrFalse(gameData)
        break
      default:
        this.loadDefaultGame(gameData)
    }

    // Call the ready callback after loading is complete
    if (this.onReadyCallback) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        this.onReadyCallback()
      }, 100)
    }
  },

  loadMultipleChoice(gameData) {
    // Use actual question data from server or fallback
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

    this.gameContainer.innerHTML = `
            <div class="mini-game multiple-choice">
                <style>
                    .multiple-choice {
                        padding: 15px;
                        max-height: 100vh;
                        overflow-y: auto;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                    }
                    .multiple-choice h3 {
                        margin: 0 0 15px 0;
                        text-align: center;
                        color: #333;
                        font-size: 18px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    .question-text {
                        background: #f8f9fa;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 20px;
                        font-size: 16px;
                        line-height: 1.5;
                        text-align: center;
                        color: #495057;
                        border: 2px solid #e9ecef;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .question-image {
                        display: block;
                        max-width: 100%;
                        width: auto;
                        height: auto;
                        max-height: 180px;
                        margin: 0 auto 20px auto;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                        object-fit: contain;
                        /* SVG support - ensures proper scaling */
                        background: transparent;
                        /* Maintain 16:9 aspect ratio */
                        aspect-ratio: 16/9;
                    }
                    .options-container {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        margin-bottom: 20px;
                        flex: 1;
                    }
                    .option-btn {
                        background: #ffffff;
                        border: 2px solid #dee2e6;
                        border-radius: 12px;
                        padding: 16px 20px;
                        font-size: 15px;
                        line-height: 1.4;
                        text-align: left;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        position: relative;
                        min-height: 60px;
                        display: flex;
                        align-items: center;
                        word-wrap: break-word;
                        user-select: none;
                    }
                    .option-btn:hover {
                        border-color: #007bff;
                        background: #f8f9ff;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0,123,255,0.15);
                    }
                    .option-btn.selected {
                        background: #e3f2fd;
                        border-color: #2196f3;
                        border-width: 3px;
                        color: #1976d2;
                        font-weight: bold;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(33,150,243,0.2);
                    }
                    .option-btn.selected::before {
                        content: "✓";
                        position: absolute;
                        right: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: #2196f3;
                        color: white;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                    }
                    .option-btn.selected::after {
                        content: "";
                        position: absolute;
                        left: -2px;
                        top: -2px;
                        right: -2px;
                        bottom: -2px;
                        border: 2px solid #2196f3;
                        border-radius: 12px;
                        animation: pulse 1.5s infinite;
                    }
                    @keyframes pulse {
                        0% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(1.02); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    .timer-display {
                        text-align: center;
                        font-size: 18px;
                        font-weight: bold;
                        margin: 15px 0;
                        color: #d32f2f;
                        background: #fff3e0;
                        padding: 12px;
                        border-radius: 10px;
                        border: 3px solid #ff9800;
                        position: relative;
                    }
                    .timer-display::before {
                        content: "⏰";
                        margin-right: 8px;
                        font-size: 20px;
                    }
                    .btn {
                        width: 100%;
                        padding: 16px;
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-top: 10px;
                        position: relative;
                        overflow: hidden;
                    }
                    .btn-primary {
                        background: #28a745;
                        color: white;
                        box-shadow: 0 2px 4px rgba(40,167,69,0.2);
                    }
                    .btn-primary:hover:not(:disabled) {
                        background: #218838;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(40,167,69,0.3);
                    }
                    .btn-primary:disabled {
                        background: #6c757d;
                        cursor: not-allowed;
                        transform: none;
                        box-shadow: none;
                        opacity: 0.7;
                    }
                    .btn-primary:active:not(:disabled) {
                        transform: translateY(0);
                        box-shadow: 0 2px 4px rgba(40,167,69,0.2);
                    }
                    .instructions {
                        background: #e8f5e8;
                        border: 1px solid #c3e6cb;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        font-size: 14px;
                        text-align: center;
                        color: #155724;
                    }
                </style>
                <h3>📝 選擇題挑戰</h3>
                <div class="instructions">
                    💡 仔細閱讀題目，選擇最合適的答案
                </div>
                <div class="question-text">${question.question}</div>
                ${question.image ? `<img src="${question.image}" alt="Quiz Image" class="question-image" onerror="this.style.display='none'">` : ''}
                <div class="options-container">
                    ${question.options
                      .map(
                        (option, index) => `
                        <button class="option-btn" data-index="${index}">
                            <span style="margin-right: 12px; font-weight: bold; color: #666;">${String.fromCharCode(65 + index)}.</span>
                            <span>${option}</span>
                        </button>
                    `
                      )
                      .join('')}
                </div>
                <div class="timer-display">
                    <span id="miniGameTimer">30</span> 秒
                </div>
                <button id="submitAnswer" class="btn btn-primary" disabled>
                    請選擇一個答案
                </button>
            </div>
        `

    this.setupMultipleChoiceHandlers(question.correct)
    this.startTimer(30)
  },

  setupMultipleChoiceHandlers(correctIndex) {
    let selectedAnswer = null
    let hasSubmitted = false

    const updateSubmitButton = () => {
      const submitBtn = document.getElementById('submitAnswer')
      if (selectedAnswer !== null && !hasSubmitted) {
        submitBtn.disabled = false
        const selectedOption = String.fromCharCode(65 + selectedAnswer)
        submitBtn.textContent = `提交答案 (選擇 ${selectedOption})`
      } else if (hasSubmitted) {
        submitBtn.disabled = true
        submitBtn.textContent = '已提交答案'
      } else {
        submitBtn.disabled = true
        submitBtn.textContent = '請選擇一個答案'
      }
    }

    document.querySelectorAll('.option-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        if (hasSubmitted) return // Prevent changes after submission

        // Remove previous selection
        document.querySelectorAll('.option-btn').forEach((b) => b.classList.remove('selected'))

        // Select current option
        btn.classList.add('selected')
        selectedAnswer = index

        // Provide immediate feedback
        btn.style.animation = 'none'
        setTimeout(() => {
          btn.style.animation = ''
        }, 10)

        updateSubmitButton()
      })

      // Add touch feedback for mobile
      btn.addEventListener('touchstart', () => {
        if (!hasSubmitted) {
          btn.style.transform = 'translateY(-1px) scale(0.98)'
        }
      })

      btn.addEventListener('touchend', () => {
        if (!hasSubmitted) {
          setTimeout(() => {
            btn.style.transform = ''
          }, 100)
        }
      })
    })

    document.getElementById('submitAnswer').addEventListener('click', () => {
      if (selectedAnswer === null || hasSubmitted) return

      hasSubmitted = true
      const isCorrect = selectedAnswer === correctIndex

      // Disable all options after submission
      document.querySelectorAll('.option-btn').forEach((btn) => {
        btn.style.pointerEvents = 'none'
        btn.style.opacity = '0.7'
      })

      // Highlight the selected option
      const selectedBtn = document.querySelector(`[data-index="${selectedAnswer}"]`)
      if (selectedBtn) {
        selectedBtn.style.opacity = '1'
        selectedBtn.style.background = isCorrect ? '#d4edda' : '#f8d7da'
        selectedBtn.style.borderColor = isCorrect ? '#28a745' : '#dc3545'
      }

      updateSubmitButton()

      // Small delay before submitting to show feedback
      setTimeout(() => {
        this.submitResult({
          gameType: 'multiple_choice',
          answer: selectedAnswer,
          correct: isCorrect,
          score: isCorrect ? 10 : -10,
        })
      }, 500)
    })

    // Initial button state
    updateSubmitButton()
  },

  loadDragDrop(gameData) {
    // Use server-provided workflow data
    const workflow = {
      title: gameData.data.title || '流程排序',
      items: gameData.data.correctOrder || [],
      shuffled: gameData.data.shuffledItems || [],
    }

    this.gameContainer.innerHTML = `
            <div class="mini-game drag-drop">
                <style>
                    .drag-drop {
                        padding: 10px;
                        height: 100vh;
                        max-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        box-sizing: border-box;
                    }
                    .drag-drop h3 {
                        margin: 0 0 8px 0;
                        font-size: 18px;
                        text-align: center;
                    }
                    .drag-drop p {
                        margin: 0 0 12px 0;
                        font-size: 14px;
                        text-align: center;
                        color: #666;
                    }
                    .drag-drop-container {
                        display: flex;
                        gap: 8px;
                        flex: 1;
                        min-height: 0;
                    }
                    .source-section, .target-section {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    .section-header {
                        font-size: 14px;
                        font-weight: bold;
                        padding: 8px;
                        text-align: center;
                        border-radius: 6px;
                        margin-bottom: 8px;
                    }
                    .source-header {
                        background: #e3f2fd;
                        color: #1976d2;
                        border: 2px solid #2196f3;
                    }
                    .target-header {
                        background: #f3e5f5;
                        color: #7b1fa2;
                        border: 2px solid #9c27b0;
                    }
                    .drag-items {
                        padding: 8px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        border: 2px dashed #dee2e6;
                        min-height: 240px;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .drop-zone {
                        padding: 8px;
                        background: #fff;
                        border-radius: 8px;
                        border: 2px dashed #9c27b0;
                        min-height: 240px;
                        max-height: 400px;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        overflow-y: auto;
                        overflow-x: hidden;
                    }
                    .drop-zone-empty {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #999;
                        font-style: italic;
                        font-size: 13px;
                        flex: 1;
                    }
                    .drag-item {
                        background: #2196f3;
                        color: white;
                        padding: 10px 8px;
                        border-radius: 6px;
                        cursor: move;
                        font-size: 13px;
                        line-height: 1.3;
                        transition: all 0.2s ease;
                        word-wrap: break-word;
                        user-select: none;
                        text-align: center;
                        flex-shrink: 0;
                    }
                    .drag-item:hover {
                        background: #1976d2;
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    .drag-item[style*="opacity: 0.5"] {
                        background: #ccc !important;
                        cursor: not-allowed;
                    }
                    .dropped-item {
                        background: #f3e5f5;
                        color: #4a148c;
                        border: 2px solid #9c27b0;
                        padding: 8px;
                        border-radius: 6px;
                        font-size: 13px;
                        line-height: 1.3;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        cursor: move;
                        transition: all 0.2s ease;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        flex-shrink: 0;
                        min-height: 36px;
                        max-width: 100%;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .dropped-item:hover {
                        background: #e1bee7;
                        border-color: #7b1fa2;
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                    }
                    .drag-handle {
                        color: #7b1fa2;
                        cursor: move;
                        font-size: 12px;
                        opacity: 0.7;
                    }
                    .item-text {
                        flex: 1;
                        min-width: 0;
                        font-weight: 500;
                    }
                    .remove-btn {
                        background: #9c27b0;
                        border: none;
                        color: white;
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 11px;
                        line-height: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                    }
                    .remove-btn:hover {
                        background: #7b1fa2;
                        transform: scale(1.1);
                    }
                    .progress-indicator {
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        margin: 8px 0;
                        padding: 4px 8px;
                        background: #f0f0f0;
                        border-radius: 12px;
                    }
                    .timer-display {
                        text-align: center;
                        font-size: 16px;
                        font-weight: bold;
                        margin: 10px 0;
                        color: #d32f2f;
                    }
                    .btn {
                        padding: 12px;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-top: 8px;
                    }
                    .btn-primary {
                        background: #4caf50;
                        color: white;
                    }
                    .btn-primary:hover {
                        background: #45a049;
                    }
                    .btn-primary:disabled {
                        background: #ccc;
                        cursor: not-allowed;
                    }
                </style>
                <h3>🔄 ${workflow.title}</h3>
                <p>${gameData.data.description || '請將以下項目按正確順序排列：'}</p>
                <div class="progress-indicator">
                    已排序：<span id="orderCount">0</span> / ${workflow.shuffled.length}
                </div>
                <div class="drag-drop-container">
                    <div class="source-section">
                        <div class="section-header source-header">
                            📦 可選項目
                        </div>
                        <div class="drag-items" id="dragItems">
                            ${workflow.shuffled
                              .map(
                                (item, index) => `
                                <div class="drag-item" draggable="true" data-item="${item}" data-index="${index}">
                                    ${item}
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    </div>
                    <div class="target-section">
                        <div class="section-header target-header">
                            🎯 排序結果
                        </div>
                        <div class="drop-zone" id="dropZone">
                            <div class="drop-zone-empty">
                                拖拽項目到此處進行排序
                            </div>
                        </div>
                    </div>
                </div>
                <div class="timer-display">
                    ⏰ <span id="miniGameTimer">45</span> 秒
                </div>
                <button id="submitOrder" class="btn btn-primary" disabled>
                    📤 提交順序
                </button>
            </div>
        `

    this.setupDragDropHandlers(workflow.items)
    this.startTimer(45)
  },

  setupDragDropHandlers(correctOrder) {
    const dragItems = document.querySelectorAll('.drag-item')
    const dropZone = document.getElementById('dropZone')
    this.droppedItems = [] // Make it accessible to removeItem
    let draggedElement = null
    let dragStartPosition = null

    // Helper function to get clean item text
    const getCleanItemText = (element) => {
      if (element.dataset.item) return element.dataset.item
      return element.textContent
        .replace(/^(\d+\.)+\s*/, '')
        .replace('×', '')
        .trim()
    }

    // Helper function to find insertion position
    const getInsertPosition = (e, container) => {
      const afterElement = getDragAfterElement(container, e.clientY)
      if (afterElement == null) {
        return this.droppedItems.length
      } else {
        return parseInt(afterElement.dataset.position)
      }
    }

    // Helper function to determine where to insert based on Y position
    const getDragAfterElement = (container, y) => {
      const draggableElements = [...container.querySelectorAll('.dropped-item:not(.dragging)')]

      return draggableElements.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect()
          const offset = y - box.top - box.height / 2

          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child }
          } else {
            return closest
          }
        },
        { offset: Number.NEGATIVE_INFINITY }
      ).element
    }

    // Setup drag handlers for source items
    dragItems.forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        draggedElement = e.target
        dragStartPosition = 'source'
        e.dataTransfer.setData('text/plain', e.target.dataset.item)
        e.target.style.opacity = '0.5'
      })

      item.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1'
        draggedElement = null
        dragStartPosition = null
      })

      // Touch support for mobile - fallback to click
      item.addEventListener('click', () => {
        if (this.droppedItems.length < correctOrder.length) {
          const itemText = item.dataset.item
          if (!this.droppedItems.includes(itemText)) {
            this.droppedItems.push(itemText)
            this.updateDropZone(this.droppedItems)
            item.style.opacity = '0.5'
            item.style.pointerEvents = 'none'
          }
        }
      })
    })

    // Setup drop zone handlers
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()

      // Visual feedback for insertion position
      const afterElement = getDragAfterElement(dropZone, e.clientY)
      const draggables = dropZone.querySelectorAll('.dropped-item')

      // Remove existing indicators
      draggables.forEach((item) => item.classList.remove('drag-over'))

      // Add indicator
      if (afterElement == null) {
        // Insert at end
        const lastItem = draggables[draggables.length - 1]
        if (lastItem) lastItem.classList.add('drag-over')
      } else {
        afterElement.classList.add('drag-over')
      }
    })

    dropZone.addEventListener('dragleave', (e) => {
      // Remove visual feedback when leaving drop zone
      const draggables = dropZone.querySelectorAll('.dropped-item')
      draggables.forEach((item) => item.classList.remove('drag-over'))
    })

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()

      // Remove visual feedback
      const draggables = dropZone.querySelectorAll('.dropped-item')
      draggables.forEach((item) => item.classList.remove('drag-over'))

      const itemText = e.dataTransfer.getData('text/plain')

      if (dragStartPosition === 'source') {
        // Dragging from source items
        if (!this.droppedItems.includes(itemText) && this.droppedItems.length < correctOrder.length) {
          const insertPos = getInsertPosition(e, dropZone)
          this.droppedItems.splice(insertPos, 0, itemText)
          this.updateDropZone(this.droppedItems)

          // Hide the dragged item
          const draggedItem = document.querySelector(`[data-item="${itemText}"]`)
          if (draggedItem) {
            draggedItem.style.opacity = '0.5'
            draggedItem.style.pointerEvents = 'none'
          }
        }
      } else if (dragStartPosition === 'dropzone') {
        // Reordering within drop zone
        const oldIndex = this.droppedItems.indexOf(itemText)
        const newIndex = getInsertPosition(e, dropZone)

        if (oldIndex !== -1 && newIndex !== oldIndex) {
          // Remove from old position
          this.droppedItems.splice(oldIndex, 1)
          // Insert at new position (adjust for removal)
          const adjustedNewIndex = newIndex > oldIndex ? newIndex - 1 : newIndex
          this.droppedItems.splice(adjustedNewIndex, 0, itemText)
          this.updateDropZone(this.droppedItems)
        }
      }
    })

    // Progress tracking and submit button management
    const updateProgress = () => {
      const orderCount = document.getElementById('orderCount')
      const submitBtn = document.getElementById('submitOrder')
      if (orderCount) orderCount.textContent = this.droppedItems.length

      if (submitBtn) {
        if (this.droppedItems.length === correctOrder.length) {
          submitBtn.disabled = false
          submitBtn.textContent = '📤 提交順序'
        } else {
          submitBtn.disabled = true
          submitBtn.textContent = `需要排序 ${correctOrder.length - this.droppedItems.length} 個項目`
        }
      }
    }

    // Initial progress update
    updateProgress()

    // Override the updateDropZone to include progress updates
    const originalUpdateDropZone = this.updateDropZone.bind(this)
    this.updateDropZone = (items) => {
      originalUpdateDropZone(items)
      updateProgress()
    }

    document.getElementById('submitOrder').addEventListener('click', () => {
      if (this.droppedItems.length !== correctOrder.length) {
        alert(`請完成所有 ${correctOrder.length} 個項目的排序！`)
        return
      }

      const isCorrect = JSON.stringify(this.droppedItems) === JSON.stringify(correctOrder)
      const partialCorrect = this.droppedItems.filter((item, index) => item === correctOrder[index]).length
      const score = isCorrect ? 10 : partialCorrect >= correctOrder.length / 2 ? 5 : -10

      this.submitResult({
        gameType: 'drag_drop',
        answer: this.droppedItems,
        correct: isCorrect,
        score: score,
      })
    })
  },

  updateDropZone(items) {
    const dropZone = document.getElementById('dropZone')

    if (items.length === 0) {
      dropZone.innerHTML = `
                <div class="drop-zone-empty">
                    拖拽項目到此處進行排序
                </div>
            `
    } else {
      dropZone.innerHTML = items
        .map(
          (item, index) => `
                <div class="dropped-item" data-position="${index}" draggable="true" data-item="${item}">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="item-text">${index + 1}. ${item}</span>
                    <button class="remove-btn" data-remove-index="${index}">×</button>
                </div>
            `
        )
        .join('')
    }

    // Setup drag handlers for dropped items (for reordering)
    const droppedItems = dropZone.querySelectorAll('.dropped-item')
    droppedItems.forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        e.target.classList.add('dragging')
        this.draggedElement = e.target
        this.dragStartPosition = 'dropzone'
        e.dataTransfer.setData('text/plain', e.target.dataset.item)
        e.target.style.opacity = '0.5'
      })

      item.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging')
        e.target.style.opacity = '1'
        this.draggedElement = null
        this.dragStartPosition = null
      })
    })

    // Setup remove button handlers
    const removeButtons = dropZone.querySelectorAll('.remove-btn')
    removeButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation() // Prevent drag events
        const index = parseInt(button.dataset.removeIndex)
        this.removeItem(index)
      })
    })
  },

  removeItem(index) {
    // Use stored droppedItems array
    if (this.droppedItems && this.droppedItems.length > index) {
      const itemText = this.droppedItems[index]

      // Re-enable the item in the original drag items area (not the drop zone)
      const dragItemsContainer = document.querySelector('.drag-items')
      if (dragItemsContainer) {
        const originalItem = dragItemsContainer.querySelector(`[data-item="${itemText}"]`)
        if (originalItem && originalItem.classList.contains('drag-item')) {
          originalItem.style.opacity = '1'
          originalItem.style.pointerEvents = 'auto'
        }
      }

      // Remove from dropped items array
      this.droppedItems.splice(index, 1)
      this.updateDropZone(this.droppedItems)
    }
  },

  loadFormatMatching(gameData) {
    // Use actual pairs from server or fallback
    const pairs = gameData.data?.pairs || [
      { left: 'HTML', right: '網頁結構' },
      { left: 'CSS', right: '樣式設計' },
      { left: 'JavaScript', right: '互動功能' },
      { left: 'Node.js', right: '後端服務' },
    ]

    // Shuffle both left and right items for better UX
    const shuffledLeft = [...pairs].sort(() => Math.random() - 0.5)
    const shuffledRight = [...pairs].sort(() => Math.random() - 0.5)

    this.gameContainer.innerHTML = `
            <div class="mini-game format-matching">
                <style>
                    .format-matching {
                        text-align: center;
                        padding: 10px;
                    }
                    .matching-container {
                        display: flex;
                        gap: 10px;
                        margin: 15px 0;
                        min-height: 300px;
                    }
                    .left-column, .right-column {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .left-column {
                        border-right: 2px dashed #ccc;
                        padding-right: 8px;
                    }
                    .right-column {
                        padding-left: 8px;
                    }
                    .match-item {
                        background: #f8f9fa;
                        border: 2px solid #dee2e6;
                        border-radius: 8px;
                        padding: 10px 8px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        line-height: 1.2;
                        word-wrap: break-word;
                        position: relative;
                        min-height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .match-item.left {
                        background: #e3f2fd;
                        border-color: #2196f3;
                    }
                    .match-item.right {
                        background: #f3e5f5;
                        border-color: #9c27b0;
                    }
                    .match-item.selected {
                        background: #fff3e0 !important;
                        border-color: #ff9800 !important;
                        border-width: 3px;
                        transform: scale(1.05);
                        box-shadow: 0 4px 8px rgba(255, 152, 0, 0.3);
                    }
                    .match-item.selected::before {
                        content: "👆";
                        position: absolute;
                        top: -25px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-size: 18px;
                        animation: bounce 1s infinite;
                    }
                    .match-item.matched {
                        background: #e8f5e8 !important;
                        border-color: #4caf50 !important;
                        color: #2e7d32;
                        opacity: 0.8;
                        cursor: not-allowed;
                    }
                    .match-item.matched::after {
                        content: "✓";
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: #4caf50;
                        color: white;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                    }
                    .matching-progress {
                        background: #fff;
                        border-radius: 20px;
                        padding: 8px 16px;
                        margin: 10px 0;
                        font-weight: bold;
                        color: #333;
                        border: 2px solid #ddd;
                    }
                    .game-instructions {
                        background: #fff9c4;
                        border: 1px solid #f57f17;
                        border-radius: 8px;
                        padding: 10px;
                        margin: 10px 0;
                        font-size: 13px;
                        color: #e65100;
                    }
                    .game-controls {
                        display: flex;
                        gap: 10px;
                        margin-top: 15px;
                    }
                    .btn {
                        flex: 1;
                        padding: 12px;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .btn-primary {
                        background: #2196f3;
                        color: white;
                    }
                    .btn-primary:disabled {
                        background: #ccc;
                        cursor: not-allowed;
                    }
                    .btn-secondary {
                        background: #ff9800;
                        color: white;
                    }
                    @keyframes bounce {
                        0%, 20%, 50%, 80%, 100% { transform: translateY(0) translateX(-50%); }
                        40% { transform: translateY(-10px) translateX(-50%); }
                        60% { transform: translateY(-5px) translateX(-50%); }
                    }
                </style>
                <h3>🔗 ${gameData.data?.title || '配對遊戲'}</h3>
                <div class="game-instructions">
                    💡 先點選左側藍色項目，再點選右側紫色項目進行配對
                </div>
                <div class="matching-progress">
                    已配對：<span id="matchCount">0</span> / ${pairs.length}
                </div>
                <div class="matching-container">
                    <div class="left-column">
                        ${shuffledLeft
                          .map(
                            (pair, index) => `
                            <div class="match-item left" data-value="${pair.left}" data-index="${index}">
                                ${pair.left}
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                    <div class="right-column">
                        ${shuffledRight
                          .map(
                            (pair, index) => `
                            <div class="match-item right" data-value="${pair.right}" data-left="${pair.left}">
                                ${pair.right}
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                <div class="timer-display">
                    ⏰ <span id="miniGameTimer">45</span> 秒
                </div>
                <div class="game-controls">
                    <button id="clearMatches" class="btn btn-secondary">
                        🔄 重置配對
                    </button>
                    <button id="submitMatches" class="btn btn-primary" disabled>
                        📤 提交配對
                    </button>
                </div>
            </div>
        `

    this.setupMatchingHandlers(pairs)
    this.startTimer(45)
  },

  setupMatchingHandlers(correctPairs) {
    let selectedLeft = null
    let matches = []

    const updateMatchCount = () => {
      document.getElementById('matchCount').textContent = matches.length
      const submitBtn = document.getElementById('submitMatches')
      if (matches.length === correctPairs.length) {
        submitBtn.disabled = false
        submitBtn.textContent = '提交配對'
      } else {
        submitBtn.disabled = true
        submitBtn.textContent = `需要配對 ${correctPairs.length - matches.length} 組`
      }
    }

    const clearAllMatches = () => {
      matches = []
      selectedLeft = null
      document.querySelectorAll('.match-item').forEach((item) => {
        item.classList.remove('selected', 'matched')
      })
      updateMatchCount()
    }

    document.querySelectorAll('.match-item').forEach((item) => {
      item.addEventListener('click', () => {
        // Don't allow interaction with already matched items
        if (item.classList.contains('matched')) return

        if (item.classList.contains('left')) {
          // Select left item
          document.querySelectorAll('.left').forEach((l) => l.classList.remove('selected'))
          item.classList.add('selected')
          selectedLeft = item
        } else if (item.classList.contains('right') && selectedLeft) {
          // Match with right item
          const leftValue = selectedLeft.dataset.value
          const rightValue = item.dataset.value

          matches.push({ left: leftValue, right: rightValue })

          // Mark as matched
          selectedLeft.classList.add('matched')
          item.classList.add('matched')
          selectedLeft.classList.remove('selected')

          selectedLeft = null
          updateMatchCount()
        }
      })
    })

    // Clear matches button
    document.getElementById('clearMatches').addEventListener('click', clearAllMatches)

    // Submit button
    document.getElementById('submitMatches').addEventListener('click', () => {
      if (matches.length !== correctPairs.length) {
        alert(`請完成所有 ${correctPairs.length} 組配對後再提交！`)
        return
      }

      let correctCount = 0
      matches.forEach((match) => {
        const correctPair = correctPairs.find((p) => p.left === match.left)
        if (correctPair && correctPair.right === match.right) {
          correctCount++
        }
      })

      const isCorrect = correctCount === correctPairs.length
      const score = correctCount >= correctPairs.length / 2 ? (isCorrect ? 10 : 5) : -10

      this.submitResult({
        gameType: 'format_matching',
        answer: matches,
        correct: isCorrect,
        score: score,
      })
    })

    // Initial state
    updateMatchCount()
  },



  loadTrueOrFalse(gameData) {
    const question = gameData.data

    this.gameContainer.innerHTML = `
            <div class="mini-game true-or-false">
                <h3>✅❌ 是非題</h3>
                <div class="question-text">
                    <p>${question.question}</p>
                </div>
                <div class="answer-buttons">
                    <button id="trueBtn" class="btn btn-true">
                        <div class="btn-emoji">${question.trueEmoji || '⭕'}</div>
                        <div class="btn-label">正確</div>
                    </button>
                    <button id="falseBtn" class="btn btn-false">
                        <div class="btn-emoji">${question.falseEmoji || '❌'}</div>
                        <div class="btn-label">錯誤</div>
                    </button>
                </div>
                <div class="timer-display">
                    剩餘時間: <span id="miniGameTimer">${Math.floor((gameData.timeLimit || 20000) / 1000)}</span> 秒
                </div>
            </div>
        `

    // Add CSS styles
    const style = document.createElement('style')
    style.textContent = `
            .mini-game.true-or-false {
                text-align: center;
                padding: 20px;
            }
            .question-text {
                margin: 20px 0;
                font-size: 18px;
                font-weight: bold;
                line-height: 1.4;
                color: #2c3e50;
            }
            .answer-buttons {
                display: flex;
                justify-content: space-around;
                margin: 30px 0;
                gap: 20px;
            }
            .btn-true, .btn-false {
                flex: 1;
                max-width: 120px;
                padding: 15px;
                border: 3px solid;
                border-radius: 10px;
                background: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .btn-true {
                border-color: #27ae60;
                color: #27ae60;
            }
            .btn-true:hover {
                background: #27ae60;
                color: white;
            }
            .btn-false {
                border-color: #e74c3c;
                color: #e74c3c;
            }
            .btn-false:hover {
                background: #e74c3c;
                color: white;
            }
            .btn-emoji {
                font-size: 24px;
                margin-bottom: 5px;
            }
            .btn-label {
                font-size: 14px;
            }
            .answer-buttons button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `
    document.head.appendChild(style)

    let answered = false

    // True button handler
    document.getElementById('trueBtn').addEventListener('click', () => {
      if (!answered) {
        answered = true
        document.getElementById('trueBtn').style.background = '#27ae60'
        document.getElementById('trueBtn').style.color = 'white'
        document.getElementById('falseBtn').disabled = true
        this.submitResult({
          gameType: 'true_or_false',
          answer: true,
        })
      }
    })

    // False button handler
    document.getElementById('falseBtn').addEventListener('click', () => {
      if (!answered) {
        answered = true
        document.getElementById('falseBtn').style.background = '#e74c3c'
        document.getElementById('falseBtn').style.color = 'white'
        document.getElementById('trueBtn').disabled = true
        this.submitResult({
          gameType: 'true_or_false',
          answer: false,
        })
      }
    })

    // Start the timer
    this.startTimer(Math.floor((gameData.timeLimit || 20000) / 1000))
  },

  loadDefaultGame(gameData) {
    this.gameContainer.innerHTML = `
            <div class="mini-game default">
                <h3>🎯 特殊事件</h3>
                <p>您遇到了特殊情況！</p>
                <div class="event-info">
                    <p>事件類型: ${gameData.eventType}</p>
                    <p>請等待主持人說明...</p>
                </div>
                <button id="continueGame" class="btn btn-primary">
                    繼續遊戲
                </button>
            </div>
        `

    document.getElementById('continueGame').addEventListener('click', () => {
      this.submitResult({
        gameType: 'default',
        score: 0,
      })
    })
  },

  startTimer(seconds) {
    const timerEl = document.getElementById('miniGameTimer')
    if (!timerEl) return

    // Clear any existing timer first
    this.stopTimer()

    // Validate seconds parameter
    if (typeof seconds !== 'number' || seconds <= 0) {
      console.warn('Invalid timer seconds:', seconds)
      return
    }

    let timeLeft = seconds

    this.currentTimer = setInterval(() => {
      timeLeft--
      if (timerEl && timerEl.parentNode) {
        timerEl.textContent = timeLeft
      } else {
        // Element was removed, stop timer
        this.stopTimer()
        return
      }

      if (timeLeft <= 0) {
        this.stopTimer()
        this.timeUp()
      }
    }, 1000)
  },

  stopTimer() {
    if (this.currentTimer) {
      clearInterval(this.currentTimer)
      this.currentTimer = null
    }
  },

  timeUp() {
    // Auto-submit with timeout result
    this.submitResult({
      gameType: this.currentGame?.eventType || 'timeout',
      timeout: true,
      score: -5,
    })
  },

  submitResult(result) {
    // Stop timer when submitting result
    this.stopTimer()

    // Only submit if we have valid connection and team
    if (this.socket && this.teamId && this.currentGame) {
      console.log(`Submitting mini-game result for team ${this.teamId}:`, result)
      this.socket.emit('mini_game_submit', {
        teamId: this.teamId,
        playerId: this.playerId,
        ...result,
      })

      // Show result feedback
      this.showResult(result)
    } else {
      console.warn('Cannot submit result: missing socket, teamId, or currentGame')
      // Show error message instead
      this.showResult({
        score: 0,
        feedback: '無法提交結果，請重新整理頁面',
      })
    }
  },

  showResult(result) {
    const isError = result.eventType === 'no_active_game' || result.feedback?.includes('無法提交')

    this.gameContainer.innerHTML = `
            <div class="mini-game-result">
                <h3>📊 ${isError ? '提示' : '結果'}</h3>
                <div class="result-display">
                    ${
                      !isError
                        ? `
                        <div class="score-change ${result.score > 0 ? 'positive' : 'negative'}">
                            ${result.score > 0 ? '+' : ''}${result.score} 分
                        </div>
                    `
                        : ''
                    }
                    <div class="result-message">
                        ${result.feedback || (result.score > 0 ? '太棒了！' : result.score === 0 ? '還不錯！' : '下次會更好！')}
                    </div>
                </div>
                <div class="waiting-next">
                    ${isError ? '🔄 請等待您的隊伍回合...' : '⏳ 等待下一回合...'}
                </div>
            </div>
        `
  },
}
