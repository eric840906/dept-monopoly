const { GAME_CONFIG } = require('../../shared/constants');

class MiniGameProcessor {
    constructor() {
        this.activeGames = new Map(); // teamId -> gameData
    }

    startMiniGame(teamId, eventType, gameState) {
        const gameData = this.generateMiniGameData(eventType, gameState);
        this.activeGames.set(teamId, {
            ...gameData,
            startTime: Date.now(),
            teamId
        });
        
        return gameData;
    }

    generateMiniGameData(eventType, gameState) {
        switch (eventType) {
            case 'multiple_choice_quiz':
                return this.generateMultipleChoiceQuiz();
            case 'drag_drop_workflow':
                return this.generateDragDropWorkflow();
            case 'format_matching':
                return this.generateFormatMatching();
            case 'team_info_pairing':
                return this.generateTeamPairing();
            case 'random_stat_check':
                return this.generateRandomStatCheck();
            default:
                return this.generateDefaultGame(eventType);
        }
    }

    generateMultipleChoiceQuiz() {
        const questions = [
            {
                question: "在團隊協作中，最重要的是什麼？",
                options: ["個人能力", "溝通交流", "工作速度", "技術水平"],
                correct: 1,
                explanation: "溝通交流是團隊協作的基礎"
            },
            {
                question: "專案管理的核心原則是？",
                options: ["時間管理", "質量控制", "風險評估", "以上皆是"],
                correct: 3,
                explanation: "專案管理需要綜合考慮多個要素"
            },
            {
                question: "公司文化建設的關鍵是？",
                options: ["制度規範", "價值觀念", "獎懲機制", "團隊活動"],
                correct: 1,
                explanation: "共同的價值觀念是企業文化的核心"
            },
            {
                question: "創新思維的特點是？",
                options: ["循規蹈矩", "跳躍思考", "按部就班", "謹慎保守"],
                correct: 1,
                explanation: "創新需要打破常規，跳躍思考"
            },
            {
                question: "客戶服務的黃金法則是？",
                options: ["快速回應", "耐心傾聽", "專業建議", "超越期待"],
                correct: 3,
                explanation: "超越客戶期待是優質服務的最高標準"
            }
        ];

        const selectedQuestion = questions[Math.floor(Math.random() * questions.length)];
        
        return {
            eventType: 'multiple_choice_quiz',
            timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.MULTIPLE_CHOICE,
            data: selectedQuestion
        };
    }

    generateDragDropWorkflow() {
        const workflows = [
            {
                title: "軟體開發流程",
                correctOrder: ["需求分析", "系統設計", "編碼實現", "測試驗證", "部署上線", "維護優化"],
                description: "請按照軟體開發的正確順序排列"
            },
            {
                title: "專案管理流程",
                correctOrder: ["項目啟動", "需求收集", "計劃制定", "執行監控", "結案總結"],
                description: "請按照專案管理的標準流程排列"
            },
            {
                title: "產品設計流程",
                correctOrder: ["市場調研", "用戶分析", "原型設計", "測試驗證", "迭代優化", "產品發布"],
                description: "請按照產品設計的完整流程排列"
            },
            {
                title: "問題解決流程",
                correctOrder: ["問題識別", "原因分析", "方案制定", "方案執行", "效果評估"],
                description: "請按照問題解決的科學方法排列"
            }
        ];

        const selectedWorkflow = workflows[Math.floor(Math.random() * workflows.length)];
        // Shuffle the correct order for display
        const shuffledItems = [...selectedWorkflow.correctOrder].sort(() => Math.random() - 0.5);
        
        return {
            eventType: 'drag_drop_workflow',
            timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.DRAG_DROP,
            data: {
                ...selectedWorkflow,
                shuffledItems
            }
        };
    }

    generateFormatMatching() {
        const matchingSets = [
            {
                title: "技術與應用",
                pairs: [
                    { left: "HTML", right: "網頁結構" },
                    { left: "CSS", right: "樣式設計" },
                    { left: "JavaScript", right: "互動功能" },
                    { left: "React", right: "前端框架" },
                    { left: "Node.js", right: "後端服務" },
                    { left: "MongoDB", right: "數據庫" }
                ]
            },
            {
                title: "部門與職責",
                pairs: [
                    { left: "人資部", right: "人才招聘" },
                    { left: "財務部", right: "資金管理" },
                    { left: "行銷部", right: "品牌推廣" },
                    { left: "研發部", right: "產品創新" },
                    { left: "業務部", right: "客戶拓展" },
                    { left: "營運部", right: "流程優化" }
                ]
            },
            {
                title: "管理理論與創始人",
                pairs: [
                    { left: "科學管理", right: "泰勒" },
                    { left: "人際關係", right: "梅奧" },
                    { left: "需求層次", right: "馬斯洛" },
                    { left: "雙因子理論", right: "赫茲伯格" },
                    { left: "目標管理", right: "德魯克" }
                ]
            }
        ];

        const selectedSet = matchingSets[Math.floor(Math.random() * matchingSets.length)];
        // Randomly select 4-5 pairs
        const selectedPairs = selectedSet.pairs
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(5, selectedSet.pairs.length));

        return {
            eventType: 'format_matching',
            timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.FORMAT_MATCHING,
            data: {
                title: selectedSet.title,
                pairs: selectedPairs
            }
        };
    }

    generateTeamPairing() {
        const collaborationTasks = [
            {
                title: "設計完美工作日",
                description: "請團隊共同討論並排列理想工作日的活動優先順序",
                items: [
                    "團隊晨會",
                    "專注工作時間",
                    "跨部門協作",
                    "學習成長",
                    "創意發想",
                    "休息交流",
                    "總結反思"
                ]
            },
            {
                title: "制定團隊價值觀",
                description: "請從以下選項中選出最符合團隊的核心價值觀（最多選5個）",
                items: [
                    "誠信正直",
                    "創新進取",
                    "團隊合作",
                    "客戶至上",
                    "追求卓越",
                    "持續學習",
                    "責任擔當",
                    "開放包容"
                ]
            },
            {
                title: "項目成功要素",
                description: "請團隊討論並選出專案成功的關鍵要素（按重要性排序）",
                items: [
                    "明確目標",
                    "團隊溝通",
                    "資源配置",
                    "風險管控",
                    "時間管理",
                    "質量把控",
                    "客戶滿意"
                ]
            }
        ];

        const selectedTask = collaborationTasks[Math.floor(Math.random() * collaborationTasks.length)];
        
        return {
            eventType: 'team_info_pairing',
            timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.TEAM_PAIRING,
            data: selectedTask
        };
    }

    generateRandomStatCheck() {
        const events = [
            {
                title: "技術危機",
                description: "系統出現重大故障，需要緊急修復",
                requiredAbility: "tech",
                threshold: 4,
                successMessage: "團隊成功解決了技術問題！",
                failureMessage: "技術問題暫時無法解決，需要外部支援"
            },
            {
                title: "創意挑戰",
                description: "客戶要求創新的解決方案",
                requiredAbility: "creative",
                threshold: 4,
                successMessage: "團隊提出了令人驚艷的創意方案！",
                failureMessage: "創意方案未能滿足客戶需求"
            },
            {
                title: "溝通協調",
                description: "跨部門合作出現分歧，需要協調解決",
                requiredAbility: "comms",
                threshold: 4,
                successMessage: "成功協調各方，達成共識！",
                failureMessage: "溝通協調失敗，問題仍未解決"
            },
            {
                title: "危機處理",
                description: "突發事件需要緊急應對",
                requiredAbility: "crisis",
                threshold: 5,
                successMessage: "危機處理得當，損失降到最低！",
                failureMessage: "危機處理不當，造成一定損失"
            },
            {
                title: "營運優化",
                description: "發現流程效率問題，需要改善",
                requiredAbility: "ops",
                threshold: 4,
                successMessage: "成功優化流程，效率大幅提升！",
                failureMessage: "優化方案效果有限"
            },
            {
                title: "意外機遇",
                description: "出現意外的商業機會",
                requiredAbility: "luck",
                threshold: 3,
                successMessage: "幸運抓住了機遇！",
                failureMessage: "錯失了這次機會"
            }
        ];

        const selectedEvent = events[Math.floor(Math.random() * events.length)];
        
        return {
            eventType: 'random_stat_check',
            timeLimit: GAME_CONFIG.MINI_GAME_TIME_LIMITS.RANDOM_EVENT,
            data: selectedEvent
        };
    }

    generateDefaultGame(eventType) {
        return {
            eventType: 'default',
            timeLimit: 15000,
            data: {
                title: "特殊事件",
                description: `觸發了 ${eventType} 事件，請等待主持人說明。`,
                message: "這是一個特殊情況，需要主持人判斷結果。"
            }
        };
    }

    processResult(teamId, submission) {
        const gameData = this.activeGames.get(teamId);
        if (!gameData) {
            throw new Error('No active mini-game for this team');
        }

        const result = this.evaluateSubmission(gameData, submission);
        
        // Clean up
        this.activeGames.delete(teamId);
        
        return result;
    }

    evaluateSubmission(gameData, submission) {
        const { eventType, data, startTime } = gameData;
        const timeTaken = Date.now() - startTime;
        const isTimeout = timeTaken > gameData.timeLimit;

        let score = 0;
        let success = false;
        let feedback = "";

        if (isTimeout && !submission.timeout) {
            score = -5;
            feedback = "時間超時";
        } else {
            switch (eventType) {
                case 'multiple_choice_quiz':
                    ({ score, success, feedback } = this.evaluateMultipleChoice(data, submission));
                    break;
                case 'drag_drop_workflow':
                    ({ score, success, feedback } = this.evaluateDragDrop(data, submission));
                    break;
                case 'format_matching':
                    ({ score, success, feedback } = this.evaluateFormatMatching(data, submission));
                    break;
                case 'team_info_pairing':
                    ({ score, success, feedback } = this.evaluateTeamPairing(data, submission));
                    break;
                case 'random_stat_check':
                    ({ score, success, feedback } = this.evaluateRandomEvent(data, submission));
                    break;
                default:
                    score = 0;
                    success = true;
                    feedback = "特殊事件完成";
            }
        }

        return {
            eventType,
            score,
            success,
            feedback,
            timeTaken,
            isTimeout
        };
    }

    evaluateMultipleChoice(data, submission) {
        const isCorrect = submission.answer === data.correct;
        return {
            score: isCorrect ? GAME_CONFIG.SCORING.SUCCESS : GAME_CONFIG.SCORING.FAILURE,
            success: isCorrect,
            feedback: isCorrect ? "回答正確！" : `回答錯誤。正確答案：${data.options[data.correct]}`
        };
    }

    evaluateDragDrop(data, submission) {
        const correctOrder = data.correctOrder;
        const userOrder = submission.answer;
        
        if (!Array.isArray(userOrder)) {
            return {
                score: GAME_CONFIG.SCORING.FAILURE,
                success: false,
                feedback: "提交格式錯誤"
            };
        }

        let correctPositions = 0;
        const minLength = Math.min(correctOrder.length, userOrder.length);
        
        for (let i = 0; i < minLength; i++) {
            if (correctOrder[i] === userOrder[i]) {
                correctPositions++;
            }
        }

        const accuracy = correctPositions / correctOrder.length;
        let score, success;

        if (accuracy >= 0.8) {
            score = GAME_CONFIG.SCORING.SUCCESS;
            success = true;
        } else if (accuracy >= 0.5) {
            score = GAME_CONFIG.SCORING.PARTIAL;
            success = false;
        } else {
            score = GAME_CONFIG.SCORING.FAILURE;
            success = false;
        }

        return {
            score,
            success,
            feedback: `正確率: ${Math.round(accuracy * 100)}%`
        };
    }

    evaluateFormatMatching(data, submission) {
        const correctPairs = data.pairs;
        const userMatches = submission.answer;
        
        if (!Array.isArray(userMatches)) {
            return {
                score: GAME_CONFIG.SCORING.FAILURE,
                success: false,
                feedback: "提交格式錯誤"
            };
        }

        let correctMatches = 0;
        
        userMatches.forEach(match => {
            const correctPair = correctPairs.find(pair => pair.left === match.left);
            if (correctPair && correctPair.right === match.right) {
                correctMatches++;
            }
        });

        const accuracy = correctMatches / correctPairs.length;
        let score, success;

        if (accuracy >= 0.8) {
            score = GAME_CONFIG.SCORING.SUCCESS;
            success = true;
        } else if (accuracy >= 0.5) {
            score = GAME_CONFIG.SCORING.PARTIAL;
            success = false;
        } else {
            score = GAME_CONFIG.SCORING.FAILURE;
            success = false;
        }

        return {
            score,
            success,
            feedback: `配對正確: ${correctMatches}/${correctPairs.length}`
        };
    }

    evaluateTeamPairing(data, submission) {
        const userSelection = submission.answer;
        
        if (!Array.isArray(userSelection) || userSelection.length === 0) {
            return {
                score: 0,
                success: false,
                feedback: "未提交有效答案"
            };
        }

        // Team pairing is more about participation than correctness
        const participationBonus = userSelection.length >= 3 ? 5 : 0;
        const completionBonus = userSelection.length >= 5 ? 5 : 0;

        return {
            score: GAME_CONFIG.SCORING.PARTIAL + participationBonus + completionBonus,
            success: true,
            feedback: `團隊協作完成，獲得參與獎勵！`
        };
    }

    evaluateRandomEvent(data, submission) {
        if (submission.roll !== undefined) {
            // Dice roll submission
            const success = submission.roll >= data.threshold;
            return {
                score: success ? GAME_CONFIG.SCORING.SUCCESS : GAME_CONFIG.SCORING.FAILURE,
                success,
                feedback: success ? data.successMessage : data.failureMessage
            };
        } else {
            // Default success for other submissions
            return {
                score: GAME_CONFIG.SCORING.PARTIAL,
                success: true,
                feedback: "事件處理完成"
            };
        }
    }

    getActiveGameCount() {
        return this.activeGames.size;
    }

    clearExpiredGames() {
        const now = Date.now();
        const expiredGames = [];
        
        this.activeGames.forEach((gameData, teamId) => {
            if (now - gameData.startTime > gameData.timeLimit + 5000) { // 5 second grace period
                expiredGames.push(teamId);
            }
        });

        expiredGames.forEach(teamId => {
            this.activeGames.delete(teamId);
        });

        return expiredGames.length;
    }
}

module.exports = MiniGameProcessor;