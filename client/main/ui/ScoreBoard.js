// ScoreBoard UI Component for Main Screen

class ScoreBoard {
    constructor(gameApp) {
        this.gameApp = gameApp;
        this.container = document.getElementById('scoreBoard');
        this.teamScoresContainer = document.getElementById('teamScores');
        this.currentGameState = null;
    }

    update(gameState) {
        this.currentGameState = gameState;
        this.render();
    }

    render() {
        if (!this.currentGameState) {
            this.renderEmpty();
            return;
        }

        if (this.currentGameState.teams.length === 0) {
            this.renderLobby();
        } else {
            this.renderTeams();
        }
    }

    renderEmpty() {
        this.teamScoresContainer.innerHTML = `
            <div class="team-score">
                <div class="team-info">
                    <span class="team-emoji">🔌</span>
                    <span class="team-name">連接中...</span>
                </div>
            </div>
        `;
    }

    renderLobby() {
        const playerCount = Object.keys(this.currentGameState.players).length;
        
        this.teamScoresContainer.innerHTML = `
            <div class="team-score">
                <div class="team-info">
                    <span class="team-emoji">👥</span>
                    <span class="team-name">等待玩家加入</span>
                </div>
                <span class="team-score-value">${playerCount}/80</span>
            </div>
            ${playerCount > 0 ? `
                <div class="player-list">
                    <h4>已加入玩家:</h4>
                    <div class="player-grid">
                        ${Object.values(this.currentGameState.players)
                            .slice(0, 20) // Show first 20 players
                            .map(player => `
                                <div class="player-item">
                                    <span class="player-name">${player.nickname}</span>
                                    <span class="player-dept">${player.department}</span>
                                </div>
                            `).join('')}
                        ${playerCount > 20 ? `
                            <div class="player-item more">
                                +${playerCount - 20} 更多...
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderTeams() {
        // Sort teams by score (descending)
        const sortedTeams = [...this.currentGameState.teams].sort((a, b) => b.score - a.score);
        
        this.teamScoresContainer.innerHTML = sortedTeams.map((team, index) => {
            const isCurrentTurn = team.id === this.currentGameState.currentTurnTeamId;
            const memberCount = team.members.length;
            const isWinning = index === 0 && sortedTeams.length > 1 && team.score > sortedTeams[1].score;
            const runsCompleted = team.runsCompleted || 0;
            
            return `
                <div class="team-score ${isCurrentTurn ? 'current-turn' : ''} ${isWinning ? 'winning' : ''}">
                    <div class="team-info">
                        ${team.image ? 
                          `<img src="${team.image}" alt="${team.name}" class="team-emoji" style="width: 20px; height: 20px;">` :
                          `<span class="team-emoji">${team.emoji}</span>`
                        }
                        <div class="team-color" style="background-color: ${team.color}"></div>
                        <div class="team-details">
                            <span class="team-name">${team.name || '隊伍 ' + team.id.split('_')[1]}</span>
                            <span class="team-members">${memberCount} 人</span>
                        </div>
                    </div>
                    <div class="team-score-section">
                        <span class="team-score-value">${team.score}</span>
                        ${isWinning ? '<span class="winning-indicator">👑</span>' : ''}
                    </div>
                    <div class="team-position">
                        位置: ${team.position || 0}
                    </div>
                    <div class="team-runs">
                        完成: ${runsCompleted}/5
                    </div>
                </div>
            `;
        }).join('');

        // Add game progress info
        if (this.currentGameState.phase === 'in_progress') {
            const progressInfo = document.createElement('div');
            progressInfo.className = 'progress-info';
            
            // Calculate total runs completed vs max runs
            const totalRunsCompleted = this.currentGameState.teams.reduce((sum, team) => sum + (team.runsCompleted || 0), 0);
            const maxTotalRuns = this.currentGameState.teams.length * 5; // 5 runs per team
            const progressPercentage = maxTotalRuns > 0 ? (totalRunsCompleted / maxTotalRuns) * 100 : 0;
            
            progressInfo.innerHTML = `
                <div class="progress-item">
                    <span>遊戲進度:</span>
                    <span>${totalRunsCompleted}/${maxTotalRuns} 回合</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
            `;
            this.teamScoresContainer.appendChild(progressInfo);
        }
    }

    highlightTeam(teamId, duration = 2000) {
        const teamElement = this.container.querySelector(`[data-team-id="${teamId}"]`);
        if (teamElement) {
            teamElement.classList.add('highlighted');
            setTimeout(() => {
                teamElement.classList.remove('highlighted');
            }, duration);
        }
    }

    showScoreChange(teamId, points, reason) {
        const teamElement = this.container.querySelector(`[data-team-id="${teamId}"]`);
        if (teamElement) {
            const scoreChange = document.createElement('div');
            scoreChange.className = `score-change ${points > 0 ? 'positive' : 'negative'}`;
            scoreChange.textContent = `${points > 0 ? '+' : ''}${points}`;
            
            teamElement.appendChild(scoreChange);
            
            // Animate and remove
            setTimeout(() => {
                scoreChange.classList.add('animate');
                setTimeout(() => {
                    if (scoreChange.parentElement) {
                        scoreChange.parentElement.removeChild(scoreChange);
                    }
                }, 1000);
            }, 100);
        }
    }

    addCustomStyles() {
        if (document.getElementById('scoreboardStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'scoreboardStyles';
        styles.textContent = `
            .player-list {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #eee;
            }

            .player-list h4 {
                margin-bottom: 10px;
                font-size: 14px;
                color: #666;
            }

            .player-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 5px;
                max-height: 200px;
                overflow-y: auto;
            }

            .player-item {
                padding: 5px;
                background: #f8f9fa;
                border-radius: 5px;
                font-size: 12px;
            }

            .player-name {
                font-weight: bold;
                display: block;
            }

            .player-dept {
                color: #666;
                font-size: 11px;
            }

            .player-item.more {
                text-align: center;
                color: #666;
                font-style: italic;
            }

            .team-details {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .team-members {
                font-size: 11px;
                color: #666;
            }

            .team-score-section {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .winning-indicator {
                font-size: 16px;
            }

            .team-position {
                font-size: 11px;
                color: #666;
                text-align: right;
            }

            .team-runs {
                font-size: 11px;
                color: #666;
                text-align: right;
                margin-top: 2px;
            }

            .winning {
                background: linear-gradient(135deg, #fff3cd, #ffeeba);
                border: 2px solid #ffc107;
            }

            .highlighted {
                animation: highlight 1s ease-in-out;
            }

            @keyframes highlight {
                0%, 100% { background: inherit; }
                50% { background: #e3f2fd; }
            }

            .score-change {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                font-weight: bold;
                font-size: 14px;
                opacity: 0;
                pointer-events: none;
            }

            .score-change.positive {
                color: #2ecc71;
            }

            .score-change.negative {
                color: #e74c3c;
            }

            .score-change.animate {
                animation: scoreChangeAnim 1s ease-out forwards;
            }

            @keyframes scoreChangeAnim {
                0% {
                    opacity: 1;
                    transform: translateY(-50%);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-150%);
                }
            }

            .progress-info {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #eee;
            }

            .progress-item {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                margin-bottom: 5px;
            }

            .progress-bar {
                height: 8px;
                background: #ecf0f1;
                border-radius: 4px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3498db, #2ecc71);
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.gameApp) {
        window.gameApp.scoreBoard = new ScoreBoard(window.gameApp);
        window.gameApp.scoreBoard.addCustomStyles();
    }
});