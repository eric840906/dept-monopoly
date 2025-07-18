// Mini Games Component for Mobile Interface

window.MiniGames = {
    currentGame: null,
    gameContainer: null,
    socket: null,
    teamId: null,

    load(gameData, container, socket, teamId, playerId, onReadyCallback) {
        // Stop any existing timer first
        this.stopTimer();

        this.gameContainer = container;
        this.socket = socket;
        this.teamId = teamId;
        this.playerId = playerId;
        this.currentGame = gameData;
        this.onReadyCallback = onReadyCallback;

        // Clear container
        container.innerHTML = '';

        // Load appropriate mini-game
        switch (gameData.eventType) {
            case 'multiple_choice_quiz':
                this.loadMultipleChoice(gameData);
                break;
            case 'drag_drop_workflow':
                this.loadDragDrop(gameData);
                break;
            case 'format_matching':
                this.loadFormatMatching(gameData);
                break;
            case 'team_info_pairing':
                this.loadTeamPairing(gameData);
                break;
            case 'random_stat_check':
                this.loadRandomEvent(gameData);
                break;
            default:
                this.loadDefaultGame(gameData);
        }

        // Call the ready callback after loading is complete
        if (this.onReadyCallback) {
            // Small delay to ensure DOM is fully rendered
            setTimeout(() => {
                this.onReadyCallback();
            }, 100);
        }
    },

    loadMultipleChoice(gameData) {
        // Use actual question data from server or fallback
        let question = gameData.data?.question;
        
        // If question is just a string, wrap it in proper structure
        if (typeof question === 'string') {
            question = {
                question: question,
                options: ["創新", "誠信", "團隊合作", "客戶至上"],
                correct: 1
            };
        } else if (!question || typeof question !== 'object') {
            // Fallback if no question data
            question = {
                question: "公司最重要的價值觀是什麼？",
                options: ["創新", "誠信", "團隊合作", "客戶至上"],
                correct: 1
            };
        }
        
        // Ensure options is always an array
        if (!Array.isArray(question.options)) {
            question.options = ["創新", "誠信", "團隊合作", "客戶至上"];
        }
        
        this.gameContainer.innerHTML = `
            <div class="mini-game multiple-choice">
                <h3>📝 選擇題挑戰</h3>
                <div class="question-text">${question.question}</div>
                <div class="options-container">
                    ${question.options.map((option, index) => `
                        <button class="option-btn" data-index="${index}">
                            ${String.fromCharCode(65 + index)}. ${option}
                        </button>
                    `).join('')}
                </div>
                <div class="timer-display">
                    <span id="miniGameTimer">30</span> 秒
                </div>
                <button id="submitAnswer" class="btn btn-primary" disabled>
                    提交答案
                </button>
            </div>
        `;

        this.setupMultipleChoiceHandlers(question.correct);
        this.startTimer(30);
    },

    setupMultipleChoiceHandlers(correctIndex) {
        let selectedAnswer = null;
        
        document.querySelectorAll('.option-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                
                // Select current option
                btn.classList.add('selected');
                selectedAnswer = index;
                
                // Enable submit button
                document.getElementById('submitAnswer').disabled = false;
            });
        });

        document.getElementById('submitAnswer').addEventListener('click', () => {
            const isCorrect = selectedAnswer === correctIndex;
            this.submitResult({
                gameType: 'multiple_choice',
                answer: selectedAnswer,
                correct: isCorrect,
                score: isCorrect ? 10 : -10
            });
        });
    },

    loadDragDrop(gameData) {
        // Use server-provided workflow data
        const workflow = {
            title: gameData.data.title || "流程排序",
            items: gameData.data.correctOrder || [],
            shuffled: gameData.data.shuffledItems || []
        };
        
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
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
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
                            ${workflow.shuffled.map((item, index) => `
                                <div class="drag-item" draggable="true" data-item="${item}" data-index="${index}">
                                    ${item}
                                </div>
                            `).join('')}
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
        `;

        this.setupDragDropHandlers(workflow.items);
        this.startTimer(45);
    },

    setupDragDropHandlers(correctOrder) {
        const dragItems = document.querySelectorAll('.drag-item');
        const dropZone = document.getElementById('dropZone');
        this.droppedItems = []; // Make it accessible to removeItem
        let draggedElement = null;
        let dragStartPosition = null;

        // Helper function to get clean item text
        const getCleanItemText = (element) => {
            if (element.dataset.item) return element.dataset.item;
            return element.textContent.replace(/^(\d+\.)+\s*/, '').replace('×', '').trim();
        };

        // Helper function to find insertion position
        const getInsertPosition = (e, container) => {
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                return this.droppedItems.length;
            } else {
                return parseInt(afterElement.dataset.position);
            }
        };

        // Helper function to determine where to insert based on Y position
        const getDragAfterElement = (container, y) => {
            const draggableElements = [...container.querySelectorAll('.dropped-item:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        };

        // Setup drag handlers for source items
        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedElement = e.target;
                dragStartPosition = 'source';
                e.dataTransfer.setData('text/plain', e.target.dataset.item);
                e.target.style.opacity = '0.5';
            });

            item.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
                draggedElement = null;
                dragStartPosition = null;
            });

            // Touch support for mobile - fallback to click
            item.addEventListener('click', () => {
                if (this.droppedItems.length < correctOrder.length) {
                    const itemText = item.dataset.item;
                    if (!this.droppedItems.includes(itemText)) {
                        this.droppedItems.push(itemText);
                        this.updateDropZone(this.droppedItems);
                        item.style.opacity = '0.5';
                        item.style.pointerEvents = 'none';
                    }
                }
            });
        });

        // Setup drop zone handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            // Visual feedback for insertion position
            const afterElement = getDragAfterElement(dropZone, e.clientY);
            const draggables = dropZone.querySelectorAll('.dropped-item');
            
            // Remove existing indicators
            draggables.forEach(item => item.classList.remove('drag-over'));
            
            // Add indicator
            if (afterElement == null) {
                // Insert at end
                const lastItem = draggables[draggables.length - 1];
                if (lastItem) lastItem.classList.add('drag-over');
            } else {
                afterElement.classList.add('drag-over');
            }
        });

        dropZone.addEventListener('dragleave', (e) => {
            // Remove visual feedback when leaving drop zone
            const draggables = dropZone.querySelectorAll('.dropped-item');
            draggables.forEach(item => item.classList.remove('drag-over'));
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            
            // Remove visual feedback
            const draggables = dropZone.querySelectorAll('.dropped-item');
            draggables.forEach(item => item.classList.remove('drag-over'));
            
            const itemText = e.dataTransfer.getData('text/plain');
            
            if (dragStartPosition === 'source') {
                // Dragging from source items
                if (!this.droppedItems.includes(itemText) && this.droppedItems.length < correctOrder.length) {
                    const insertPos = getInsertPosition(e, dropZone);
                    this.droppedItems.splice(insertPos, 0, itemText);
                    this.updateDropZone(this.droppedItems);
                    
                    // Hide the dragged item
                    const draggedItem = document.querySelector(`[data-item="${itemText}"]`);
                    if (draggedItem) {
                        draggedItem.style.opacity = '0.5';
                        draggedItem.style.pointerEvents = 'none';
                    }
                }
            } else if (dragStartPosition === 'dropzone') {
                // Reordering within drop zone
                const oldIndex = this.droppedItems.indexOf(itemText);
                const newIndex = getInsertPosition(e, dropZone);
                
                if (oldIndex !== -1 && newIndex !== oldIndex) {
                    // Remove from old position
                    this.droppedItems.splice(oldIndex, 1);
                    // Insert at new position (adjust for removal)
                    const adjustedNewIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
                    this.droppedItems.splice(adjustedNewIndex, 0, itemText);
                    this.updateDropZone(this.droppedItems);
                }
            }
        });

        // Progress tracking and submit button management
        const updateProgress = () => {
            const orderCount = document.getElementById('orderCount');
            const submitBtn = document.getElementById('submitOrder');
            if (orderCount) orderCount.textContent = this.droppedItems.length;
            
            if (submitBtn) {
                if (this.droppedItems.length === correctOrder.length) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '📤 提交順序';
                } else {
                    submitBtn.disabled = true;
                    submitBtn.textContent = `需要排序 ${correctOrder.length - this.droppedItems.length} 個項目`;
                }
            }
        };

        // Initial progress update
        updateProgress();

        // Override the updateDropZone to include progress updates
        const originalUpdateDropZone = this.updateDropZone.bind(this);
        this.updateDropZone = (items) => {
            originalUpdateDropZone(items);
            updateProgress();
        };

        document.getElementById('submitOrder').addEventListener('click', () => {
            if (this.droppedItems.length !== correctOrder.length) {
                alert(`請完成所有 ${correctOrder.length} 個項目的排序！`);
                return;
            }

            const isCorrect = JSON.stringify(this.droppedItems) === JSON.stringify(correctOrder);
            const partialCorrect = this.droppedItems.filter((item, index) => item === correctOrder[index]).length;
            const score = isCorrect ? 10 : (partialCorrect >= correctOrder.length / 2 ? 5 : -10);
            
            this.submitResult({
                gameType: 'drag_drop',
                answer: this.droppedItems,
                correct: isCorrect,
                score: score
            });
        });
    },

    updateDropZone(items) {
        const dropZone = document.getElementById('dropZone');
        
        if (items.length === 0) {
            dropZone.innerHTML = `
                <div class="drop-zone-empty">
                    拖拽項目到此處進行排序
                </div>
            `;
        } else {
            dropZone.innerHTML = items.map((item, index) => `
                <div class="dropped-item" data-position="${index}" draggable="true" data-item="${item}">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="item-text">${index + 1}. ${item}</span>
                    <button class="remove-btn" data-remove-index="${index}">×</button>
                </div>
            `).join('');
        }
        
        // Setup drag handlers for dropped items (for reordering)
        const droppedItems = dropZone.querySelectorAll('.dropped-item');
        droppedItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.target.classList.add('dragging');
                this.draggedElement = e.target;
                this.dragStartPosition = 'dropzone';
                e.dataTransfer.setData('text/plain', e.target.dataset.item);
                e.target.style.opacity = '0.5';
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                e.target.style.opacity = '1';
                this.draggedElement = null;
                this.dragStartPosition = null;
            });
        });

        // Setup remove button handlers
        const removeButtons = dropZone.querySelectorAll('.remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent drag events
                const index = parseInt(button.dataset.removeIndex);
                this.removeItem(index);
            });
        });
    },

    removeItem(index) {
        // Use stored droppedItems array
        if (this.droppedItems && this.droppedItems.length > index) {
            const itemText = this.droppedItems[index];
            
            // Re-enable the item in the original drag items area (not the drop zone)
            const dragItemsContainer = document.querySelector('.drag-items');
            if (dragItemsContainer) {
                const originalItem = dragItemsContainer.querySelector(`[data-item="${itemText}"]`);
                if (originalItem && originalItem.classList.contains('drag-item')) {
                    originalItem.style.opacity = '1';
                    originalItem.style.pointerEvents = 'auto';
                }
            }
            
            // Remove from dropped items array
            this.droppedItems.splice(index, 1);
            this.updateDropZone(this.droppedItems);
        }
    },

    loadFormatMatching(gameData) {
        // Use actual pairs from server or fallback
        const pairs = gameData.data?.pairs || [
            { left: "HTML", right: "網頁結構" },
            { left: "CSS", right: "樣式設計" },
            { left: "JavaScript", right: "互動功能" },
            { left: "Node.js", right: "後端服務" }
        ];

        // Shuffle both left and right items for better UX
        const shuffledLeft = [...pairs].sort(() => Math.random() - 0.5);
        const shuffledRight = [...pairs].sort(() => Math.random() - 0.5);

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
                        ${shuffledLeft.map((pair, index) => `
                            <div class="match-item left" data-value="${pair.left}" data-index="${index}">
                                ${pair.left}
                            </div>
                        `).join('')}
                    </div>
                    <div class="right-column">
                        ${shuffledRight.map((pair, index) => `
                            <div class="match-item right" data-value="${pair.right}" data-left="${pair.left}">
                                ${pair.right}
                            </div>
                        `).join('')}
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
        `;

        this.setupMatchingHandlers(pairs);
        this.startTimer(45);
    },

    setupMatchingHandlers(correctPairs) {
        let selectedLeft = null;
        let matches = [];

        const updateMatchCount = () => {
            document.getElementById('matchCount').textContent = matches.length;
            const submitBtn = document.getElementById('submitMatches');
            if (matches.length === correctPairs.length) {
                submitBtn.disabled = false;
                submitBtn.textContent = '提交配對';
            } else {
                submitBtn.disabled = true;
                submitBtn.textContent = `需要配對 ${correctPairs.length - matches.length} 組`;
            }
        };

        const clearAllMatches = () => {
            matches = [];
            selectedLeft = null;
            document.querySelectorAll('.match-item').forEach(item => {
                item.classList.remove('selected', 'matched');
            });
            updateMatchCount();
        };

        document.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', () => {
                // Don't allow interaction with already matched items
                if (item.classList.contains('matched')) return;

                if (item.classList.contains('left')) {
                    // Select left item
                    document.querySelectorAll('.left').forEach(l => l.classList.remove('selected'));
                    item.classList.add('selected');
                    selectedLeft = item;
                } else if (item.classList.contains('right') && selectedLeft) {
                    // Match with right item
                    const leftValue = selectedLeft.dataset.value;
                    const rightValue = item.dataset.value;
                    
                    matches.push({ left: leftValue, right: rightValue });
                    
                    // Mark as matched
                    selectedLeft.classList.add('matched');
                    item.classList.add('matched');
                    selectedLeft.classList.remove('selected');
                    
                    selectedLeft = null;
                    updateMatchCount();
                }
            });
        });

        // Clear matches button
        document.getElementById('clearMatches').addEventListener('click', clearAllMatches);

        // Submit button
        document.getElementById('submitMatches').addEventListener('click', () => {
            if (matches.length !== correctPairs.length) {
                alert(`請完成所有 ${correctPairs.length} 組配對後再提交！`);
                return;
            }

            let correctCount = 0;
            matches.forEach(match => {
                const correctPair = correctPairs.find(p => p.left === match.left);
                if (correctPair && correctPair.right === match.right) {
                    correctCount++;
                }
            });

            const isCorrect = correctCount === correctPairs.length;
            const score = correctCount >= correctPairs.length / 2 ? 
                (isCorrect ? 10 : 5) : -10;

            this.submitResult({
                gameType: 'format_matching',
                answer: matches,
                correct: isCorrect,
                score: score
            });
        });

        // Initial state
        updateMatchCount();
    },

    loadTeamPairing(gameData) {
        // Use actual team pairing data from server or fallback
        const taskData = gameData.data || {};
        const taskTitle = taskData.title || "設計一個完美的工作日";
        const taskDescription = taskData.description || "請按優先順序排列以下活動（隊伍共同決定）：";
        const activities = taskData.items || [
            "團隊會議", "專案開發", "客戶溝通", "學習成長", "休息放鬆"
        ];

        this.gameContainer.innerHTML = `
            <div class="mini-game team-pairing">
                <h3>👥 團隊協作</h3>
                <p>請與隊友討論並共同完成以下任務：</p>
                <div class="collaboration-task">
                    <h4>任務：${taskTitle}</h4>
                    <p>${taskDescription}</p>
                    <div class="priority-list" id="priorityList">
                        ${activities.map(activity => `
                            <div class="priority-item" data-item="${activity}">📅 ${activity}</div>
                        `).join('')}
                    </div>
                </div>
                <div class="timer-display">
                    <span id="miniGameTimer">60</span> 秒
                </div>
                <button id="submitPriority" class="btn btn-primary">
                    提交排序
                </button>
            </div>
        `;

        this.setupTeamPairingHandlers();
        this.startTimer(60);
    },

    setupTeamPairingHandlers() {
        const priorityList = document.getElementById('priorityList');
        let currentOrder = [];

        // Make items clickable to reorder
        document.querySelectorAll('.priority-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const itemName = item.dataset.item;
                
                if (currentOrder.includes(itemName)) {
                    // Remove from order
                    currentOrder = currentOrder.filter(i => i !== itemName);
                    item.classList.remove('selected');
                    item.querySelector('.order-number')?.remove();
                } else {
                    // Add to order
                    currentOrder.push(itemName);
                    item.classList.add('selected');
                    
                    const orderNumber = document.createElement('span');
                    orderNumber.className = 'order-number';
                    orderNumber.textContent = currentOrder.length;
                    item.appendChild(orderNumber);
                }
            });
        });

        document.getElementById('submitPriority').addEventListener('click', () => {
            // For team pairing, success is based on participation
            const score = currentOrder.length >= 3 ? 10 : 5;
            
            this.submitResult({
                gameType: 'team_pairing',
                answer: currentOrder,
                correct: true,
                score: score
            });
        });
    },

    loadRandomEvent(gameData) {
        // Use actual event data from server or fallback
        const event = gameData.data?.event || {
            title: "技術挑戰",
            description: "需要解決一個緊急的技術問題",
            ability: "tech",
            threshold: 4
        };
        
        this.gameContainer.innerHTML = `
            <div class="mini-game random-event">
                <h3>🎲 隨機事件</h3>
                <div class="event-card">
                    <h4>${event.title}</h4>
                    <p>${event.description}</p>
                    <div class="stat-check">
                        <span>需要 ${event.ability} 能力：${event.threshold}+</span>
                    </div>
                </div>
                <div class="action-buttons">
                    <button id="rollCheck" class="btn btn-primary">
                        🎲 擲骰檢定
                    </button>
                    <button id="useReroll" class="btn btn-secondary" disabled>
                        🔄 使用重擲 (剩餘: <span id="rerollCount">3</span>)
                    </button>
                </div>
                <div id="checkResult" class="check-result hidden">
                    <!-- Result will be shown here -->
                </div>
            </div>
        `;

        this.setupRandomEventHandlers(event);
    },

    setupRandomEventHandlers(event) {
        let rollResult = null;
        let hasRolled = false;

        document.getElementById('rollCheck').addEventListener('click', () => {
            const roll = Math.floor(Math.random() * 6) + 1;
            rollResult = roll;
            hasRolled = true;

            const success = roll >= event.threshold;
            const resultEl = document.getElementById('checkResult');
            
            resultEl.innerHTML = `
                <div class="roll-result">
                    <div class="dice-roll">🎲 ${roll}</div>
                    <div class="result-text ${success ? 'success' : 'failure'}">
                        ${success ? '✅ 成功！' : '❌ 失敗'}
                    </div>
                </div>
                <button id="acceptResult" class="btn btn-primary">
                    接受結果
                </button>
            `;
            
            resultEl.classList.remove('hidden');
            
            // Enable reroll if available and failed
            if (!success) {
                document.getElementById('useReroll').disabled = false;
            }

            document.getElementById('acceptResult').addEventListener('click', () => {
                this.submitResult({
                    gameType: 'random_event',
                    roll: roll,
                    success: success,
                    score: success ? 10 : -10
                });
            });
        });

        document.getElementById('useReroll').addEventListener('click', () => {
            // Reset for reroll
            hasRolled = false;
            document.getElementById('checkResult').classList.add('hidden');
            document.getElementById('useReroll').disabled = true;
            
            // Decrease reroll count
            const rerollEl = document.getElementById('rerollCount');
            const currentCount = parseInt(rerollEl.textContent) - 1;
            rerollEl.textContent = currentCount;
            
            if (currentCount <= 0) {
                document.getElementById('useReroll').style.display = 'none';
            }
        });
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
        `;

        document.getElementById('continueGame').addEventListener('click', () => {
            this.submitResult({
                gameType: 'default',
                score: 0
            });
        });
    },

    startTimer(seconds) {
        const timerEl = document.getElementById('miniGameTimer');
        if (!timerEl) return;

        // Clear any existing timer first
        this.stopTimer();

        // Validate seconds parameter
        if (typeof seconds !== 'number' || seconds <= 0) {
            console.warn('Invalid timer seconds:', seconds);
            return;
        }

        let timeLeft = seconds;
        
        this.currentTimer = setInterval(() => {
            timeLeft--;
            if (timerEl && timerEl.parentNode) {
                timerEl.textContent = timeLeft;
            } else {
                // Element was removed, stop timer
                this.stopTimer();
                return;
            }
            
            if (timeLeft <= 0) {
                this.stopTimer();
                this.timeUp();
            }
        }, 1000);
    },

    stopTimer() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
        }
    },

    timeUp() {
        // Auto-submit with timeout result
        this.submitResult({
            gameType: this.currentGame?.eventType || 'timeout',
            timeout: true,
            score: -5
        });
    },

    submitResult(result) {
        // Stop timer when submitting result
        this.stopTimer();

        // Only submit if we have valid connection and team
        if (this.socket && this.teamId && this.currentGame) {
            console.log(`Submitting mini-game result for team ${this.teamId}:`, result);
            this.socket.emit('mini_game_submit', {
                teamId: this.teamId,
                playerId: this.playerId,
                ...result
            });
            
            // Show result feedback
            this.showResult(result);
        } else {
            console.warn('Cannot submit result: missing socket, teamId, or currentGame');
            // Show error message instead
            this.showResult({
                score: 0,
                feedback: "無法提交結果，請重新整理頁面"
            });
        }
    },

    showResult(result) {
        const isError = result.eventType === 'no_active_game' || result.feedback?.includes('無法提交');
        
        this.gameContainer.innerHTML = `
            <div class="mini-game-result">
                <h3>📊 ${isError ? '提示' : '結果'}</h3>
                <div class="result-display">
                    ${!isError ? `
                        <div class="score-change ${result.score > 0 ? 'positive' : 'negative'}">
                            ${result.score > 0 ? '+' : ''}${result.score} 分
                        </div>
                    ` : ''}
                    <div class="result-message">
                        ${result.feedback || 
                          (result.score > 0 ? '太棒了！' : 
                           result.score === 0 ? '還不錯！' : '下次會更好！')}
                    </div>
                </div>
                <div class="waiting-next">
                    ${isError ? '🔄 請等待您的隊伍回合...' : '⏳ 等待下一回合...'}
                </div>
            </div>
        `;
    }
};