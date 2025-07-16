// Mini Games Component for Mobile Interface

window.MiniGames = {
    currentGame: null,
    gameContainer: null,
    socket: null,
    teamId: null,

    load(gameData, container, socket, teamId) {
        this.gameContainer = container;
        this.socket = socket;
        this.teamId = teamId;
        this.currentGame = gameData;

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
    },

    loadMultipleChoice(gameData) {
        const questions = [
            {
                question: "公司最重要的價值觀是什麼？",
                options: ["創新", "誠信", "團隊合作", "客戶至上"],
                correct: 1
            },
            {
                question: "在專案管理中，最關鍵的是？",
                options: ["時間管理", "溝通協調", "資源分配", "風險控制"],
                correct: 1
            }
        ];

        const question = questions[Math.floor(Math.random() * questions.length)];
        
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
                <h3>🔄 ${workflow.title}</h3>
                <p>${gameData.data.description || '請將以下項目按正確順序排列：'}</p>
                <div class="drop-zone" id="dropZone">
                    <!-- Drop items here -->
                </div>
                <div class="drag-items">
                    ${workflow.shuffled.map((item, index) => `
                        <div class="drag-item" draggable="true" data-item="${item}" data-index="${index}">
                            ${item}
                        </div>
                    `).join('')}
                </div>
                <div class="timer-display">
                    <span id="miniGameTimer">45</span> 秒
                </div>
                <button id="submitOrder" class="btn btn-primary">
                    提交順序
                </button>
            </div>
        `;

        this.setupDragDropHandlers(workflow.items);
        this.startTimer(45);
    },

    setupDragDropHandlers(correctOrder) {
        const dragItems = document.querySelectorAll('.drag-item');
        const dropZone = document.getElementById('dropZone');
        let droppedItems = [];

        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.item);
                e.target.style.opacity = '0.5';
            });

            item.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
            });

            // Touch support for mobile
            item.addEventListener('touchstart', (e) => {
                e.target.classList.add('dragging');
            });

            item.addEventListener('click', () => {
                if (droppedItems.length < correctOrder.length) {
                    const itemText = item.dataset.item;
                    if (!droppedItems.includes(itemText)) {
                        droppedItems.push(itemText);
                        this.updateDropZone(droppedItems);
                        item.style.opacity = '0.5';
                        item.style.pointerEvents = 'none';
                    }
                }
            });
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const itemText = e.dataTransfer.getData('text/plain');
            if (!droppedItems.includes(itemText) && droppedItems.length < correctOrder.length) {
                droppedItems.push(itemText);
                this.updateDropZone(droppedItems);
                
                // Hide the dragged item
                const draggedItem = document.querySelector(`[data-item="${itemText}"]`);
                if (draggedItem) {
                    draggedItem.style.opacity = '0.5';
                    draggedItem.style.pointerEvents = 'none';
                }
            }
        });

        document.getElementById('submitOrder').addEventListener('click', () => {
            const isCorrect = JSON.stringify(droppedItems) === JSON.stringify(correctOrder);
            const partialCorrect = droppedItems.filter((item, index) => item === correctOrder[index]).length;
            const score = isCorrect ? 10 : (partialCorrect >= correctOrder.length / 2 ? 5 : -10);
            
            this.submitResult({
                gameType: 'drag_drop',
                answer: droppedItems,
                correct: isCorrect,
                score: score
            });
        });
    },

    updateDropZone(items) {
        const dropZone = document.getElementById('dropZone');
        dropZone.innerHTML = items.map((item, index) => `
            <div class="dropped-item" data-position="${index}">
                ${index + 1}. ${item}
                <button class="remove-btn" onclick="window.MiniGames.removeItem(${index})">×</button>
            </div>
        `).join('');
    },

    removeItem(index) {
        // Re-enable the item in drag area
        const dropZone = document.getElementById('dropZone');
        const droppedItems = Array.from(dropZone.children);
        if (droppedItems[index]) {
            const itemText = droppedItems[index].textContent.replace(/^(\d+\.)+\s*/, '').replace('×', '').trim();
            const originalItem = document.querySelector(`[data-item="${itemText}"]`);
            if (originalItem) {
                originalItem.style.opacity = '1';
                originalItem.style.pointerEvents = 'auto';
            }
            
            // Update dropped items array
            const currentItems = Array.from(droppedItems).map(item => 
                item.textContent.replace(/^(\d+\.)+\s*/, '').replace('×', '').trim()
            );
            currentItems.splice(index, 1);
            this.updateDropZone(currentItems);
        }
    },

    loadFormatMatching(gameData) {
        const pairs = [
            { left: "HTML", right: "網頁結構" },
            { left: "CSS", right: "樣式設計" },
            { left: "JavaScript", right: "互動功能" },
            { left: "Node.js", right: "後端服務" }
        ];

        this.gameContainer.innerHTML = `
            <div class="mini-game format-matching">
                <h3>🔗 配對遊戲</h3>
                <p>請將左側和右側的項目正確配對：</p>
                <div class="matching-container">
                    <div class="left-column">
                        ${pairs.map((pair, index) => `
                            <div class="match-item left" data-value="${pair.left}" data-index="${index}">
                                ${pair.left}
                            </div>
                        `).join('')}
                    </div>
                    <div class="right-column">
                        ${pairs.sort(() => Math.random() - 0.5).map((pair, index) => `
                            <div class="match-item right" data-value="${pair.right}" data-left="${pair.left}">
                                ${pair.right}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="timer-display">
                    <span id="miniGameTimer">45</span> 秒
                </div>
                <button id="submitMatches" class="btn btn-primary">
                    提交配對
                </button>
            </div>
        `;

        this.setupMatchingHandlers(pairs);
        this.startTimer(45);
    },

    setupMatchingHandlers(correctPairs) {
        let selectedLeft = null;
        let matches = [];

        document.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', () => {
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
                }
            });
        });

        document.getElementById('submitMatches').addEventListener('click', () => {
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
    },

    loadTeamPairing(gameData) {
        this.gameContainer.innerHTML = `
            <div class="mini-game team-pairing">
                <h3>👥 團隊協作</h3>
                <p>請與隊友討論並共同完成以下任務：</p>
                <div class="collaboration-task">
                    <h4>任務：設計一個完美的工作日</h4>
                    <p>請按優先順序排列以下活動（隊伍共同決定）：</p>
                    <div class="priority-list" id="priorityList">
                        <div class="priority-item" data-item="團隊會議">📅 團隊會議</div>
                        <div class="priority-item" data-item="專案開發">💻 專案開發</div>
                        <div class="priority-item" data-item="客戶溝通">📞 客戶溝通</div>
                        <div class="priority-item" data-item="學習成長">📚 學習成長</div>
                        <div class="priority-item" data-item="休息放鬆">☕ 休息放鬆</div>
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
        const events = [
            {
                title: "技術挑戰",
                description: "需要解決一個緊急的技術問題",
                ability: "tech",
                threshold: 4
            },
            {
                title: "創意發想",
                description: "需要提出創新的解決方案",
                ability: "creative",
                threshold: 4
            },
            {
                title: "溝通協調",
                description: "需要處理跨部門溝通問題",
                ability: "comms",
                threshold: 4
            }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        
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

        let timeLeft = seconds;
        
        const timer = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.timeUp();
            }
        }, 1000);
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
        // Only submit if we have valid connection and team
        if (this.socket && this.teamId && this.currentGame) {
            console.log(`Submitting mini-game result for team ${this.teamId}:`, result);
            this.socket.emit('mini_game_submit', {
                teamId: this.teamId,
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