// 死活题练习模块

class TsumegoEngine {
    constructor() {
        this.problems = [];
        this.currentProblemIndex = 0;
        this.attemptedMoves = [];
        this.solved = false;
        this.originalBoard = null;
        
        this.initializeProblems();
    }

    initializeProblems() {
        // 简化的死活题库 - 确保逻辑正确
        this.problems = [
            {
                id: 1,
                title: "基础练习 - 简单提子",
                difficulty: 1,
                description: "黑先，提取中央的白棋",
                boardSize: 7,
                initialPosition: [
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 1, 1, 1, 0, 0],
                    [0, 0, 1, -1, 1, 0, 0],
                    [0, 0, 0, 1, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0]
                ],
                solutions: [
                    { x: 3, y: 4, reason: "封住白棋最后一口气，提取白棋" }
                ],
                hints: [
                    "数一下白棋有几口气",
                    "白棋已经被包围",
                    "点击白棋下方的空点"
                ]
            },
            {
                id: 2,
                title: "角落练习 - 破坏眼形",
                difficulty: 1,
                description: "黑先，阻止白棋做眼",
                boardSize: 7,
                initialPosition: [
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 1, 1, 1, 1, 0],
                    [0, 0, 1, -1, -1, 1, 0],
                    [0, 0, 1, 0, 0, 1, 0]
                ],
                solutions: [
                    { x: 3, y: 6, reason: "点入眼位破坏白棋做眼" }
                ],
                hints: [
                    "白棋想要做眼",
                    "眼形需要两个眼才能活",
                    "占据重要的眼位"
                ]
            },
            {
                id: 3,
                title: "边路练习 - 扳头提子",
                difficulty: 2,
                description: "黑先，提取边路的白棋",
                boardSize: 7,
                initialPosition: [
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 1, -1, -1, 0, 0],
                    [0, 0, 0, 1, 0, 0, 0]
                ],
                solutions: [
                    { x: 4, y: 6, reason: "扳头提取，封住白棋逃跑路线" }
                ],
                hints: [
                    "白棋在边路很危险",
                    "扳头是常用手筋",
                    "封住白棋的逃跑方向"
                ]
            }
        ];
    }

    startProblem(problemIndex) {
        if (problemIndex < 0 || problemIndex >= this.problems.length) return false;
        
        this.currentProblemIndex = problemIndex;
        this.attemptedMoves = [];
        this.solved = false;
        
        const problem = this.getCurrentProblem();
        this.originalBoard = problem.initialPosition.map(row => [...row]);
        
        // 设置游戏状态
        game.boardSize = problem.boardSize;
        game.calculateCellSize();
        game.board = problem.initialPosition.map(row => [...row]);
        game.currentPlayer = 1; // 通常黑先
        game.gameMode = 'tsumego';
        game.moveHistory = [];
        game.blackCaptures = 0;
        game.whiteCaptures = 0;
        game.koPosition = null;
        game.gameEnded = false;
        
        this.updateProblemUI();
        game.drawBoard();
        
        return true;
    }

    getCurrentProblem() {
        return this.problems[this.currentProblemIndex];
    }

    checkSolution(x, y) {
        const problem = this.getCurrentProblem();
        console.log(`检查解答: (${x}, ${y}), 正确答案: (${problem.solutions[0].x}, ${problem.solutions[0].y})`);
        
        // 检查是否是正确答案
        for (const solution of problem.solutions) {
            if (solution.x === x && solution.y === y) {
                this.solved = true;
                this.showSolutionFeedback(true, solution.reason);
                console.log("答案正确！");
                return true;
            }
        }
        
        // 记录错误尝试
        this.attemptedMoves.push({ x, y });
        this.showSolutionFeedback(false, "这不是正确答案，请再试试");
        console.log("答案错误");
        
        return false;
    }

    showSolutionFeedback(isCorrect, message) {
        const notification = this.createNotification(
            isCorrect ? 'success' : 'error',
            isCorrect ? '正确！' : '错误',
            message
        );
        
        if (isCorrect) {
            // 高亮正确的落子点
            setTimeout(() => {
                this.highlightSolution();
            }, 100);
            
            // 立即更新UI状态
            this.updateProblemUI();
            
            // 更新状态显示
            const statusElement = document.getElementById('game-status');
            if (statusElement) {
                statusElement.textContent = '恭喜！答案正确！';
            }
        } else {
            // 错误答案的处理
            const statusElement = document.getElementById('game-status');
            if (statusElement) {
                statusElement.textContent = '答案错误，请再试试';
            }
        }
    }

    highlightSolution() {
        const problem = this.getCurrentProblem();
        const solution = problem.solutions[0]; // 显示第一个解
        
        // 在canvas上绘制高亮标记
        const canvasX = game.boardMargin + solution.x * game.cellSize;
        const canvasY = game.boardMargin + solution.y * game.cellSize;
        
        game.ctx.strokeStyle = '#27ae60';
        game.ctx.lineWidth = 4;
        game.ctx.setLineDash([5, 5]);
        game.ctx.beginPath();
        game.ctx.arc(canvasX, canvasY, game.cellSize * 0.3, 0, 2 * Math.PI);
        game.ctx.stroke();
        game.ctx.setLineDash([]);
    }

    showHint() {
        const problem = this.getCurrentProblem();
        const hintIndex = Math.min(this.attemptedMoves.length, problem.hints.length - 1);
        const hint = problem.hints[hintIndex];
        
        this.createNotification('info', '提示', hint);
    }

    showSolution() {
        const problem = this.getCurrentProblem();
        const solution = problem.solutions[0]; // 显示第一个解
        
        let solutionText = `正确答案是 (${this.indexToCoordinate(solution.x)}, ${problem.boardSize - solution.y})`;
        solutionText += `\n解释: ${solution.reason}`;
        
        this.createNotification('info', '答案', solutionText);
        this.highlightSolution();
        this.solved = true;
    }

    resetProblem() {
        const problem = this.getCurrentProblem();
        game.board = this.originalBoard.map(row => [...row]);
        game.currentPlayer = 1;
        game.moveHistory = [];
        this.attemptedMoves = [];
        this.solved = false;
        
        game.drawBoard();
        
        // 重置UI
        this.updateProblemUI();
        
        // 更新状态显示
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.textContent = '死活题练习模式';
        }
    }

    nextProblem() {
        if (this.currentProblemIndex < this.problems.length - 1) {
            this.startProblem(this.currentProblemIndex + 1);
        } else {
            this.createNotification('success', '恭喜！', '您已完成所有死活题练习！');
        }
    }

    previousProblem() {
        if (this.currentProblemIndex > 0) {
            this.startProblem(this.currentProblemIndex - 1);
        }
    }

    updateProblemUI() {
        const problem = this.getCurrentProblem();
        
        // 更新题目信息
        const problemNumber = document.getElementById('problem-number');
        const problemDifficulty = document.getElementById('problem-difficulty');
        const problemText = document.getElementById('problem-text');
        const prevBtn = document.getElementById('prev-problem');
        const nextBtn = document.getElementById('next-problem');
        
        if (problemNumber) {
            problemNumber.textContent = `题目 ${this.currentProblemIndex + 1}/3`;
        }
        
        if (problemDifficulty) {
            problemDifficulty.textContent = `难度: ${'★'.repeat(problem.difficulty)}${'☆'.repeat(3 - problem.difficulty)}`;
        }
        
        if (problemText) {
            problemText.textContent = problem.description;
        }
        
        // 更新控制按钮状态
        if (prevBtn) {
            prevBtn.disabled = this.currentProblemIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = !this.solved;
        }
    }

    indexToCoordinate(index) {
        // 将数组索引转换为围棋坐标 (A-S, 跳过I)
        if (index >= 8) {
            return String.fromCharCode(66 + index); // 跳过I
        }
        return String.fromCharCode(65 + index);
    }

    createNotification(type, title, message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
            <div style="white-space: pre-line;">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => notification.classList.add('show'), 100);
        
        // 自动移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        return notification;
    }
}

// 创建全局死活题引擎实例
window.TsumegoEngine = new TsumegoEngine();

// 扩展游戏类以支持死活题模式的函数
function extendGameForTsumego() {
    if (typeof game !== 'undefined' && game.makeMove && !game._tsumegoExtended) {
        const originalMakeMove = game.makeMove;
        game.makeMove = function(x, y) {
            if (this.gameMode === 'tsumego') {
                // 死活题模式下的特殊处理
                if (!this.isValidMove(x, y)) return false;
                
                // 检查是否是正确解答（先检查再下子）
                const isCorrect = window.TsumegoEngine && window.TsumegoEngine.checkSolution(x, y);
                
                // 执行这一手
                const moveSuccess = originalMakeMove.call(this, x, y);
                if (!moveSuccess) return false;
                
                if (!isCorrect) {
                    // 错误答案，撤销这一手
                    setTimeout(() => {
                        // 重置到原始位置而不是简单撤销
                        if (window.TsumegoEngine) {
                            window.TsumegoEngine.resetProblem();
                        }
                    }, 1000);
                }
                
                return true;
            } else {
                // 正常游戏模式
                return originalMakeMove.call(this, x, y);
            }
        };
        game._tsumegoExtended = true;
    }
}

// KataGo 死活题生成器
class KataGoTsumegoGenerator {
    constructor() {
        this.isGenerating = false;
    }
    
    async generateProblem(difficulty = 'easy', boardSize = 9) {
        if (this.isGenerating) {
            console.log('正在生成死活题，请稍候...');
            return null;
        }
        
        this.isGenerating = true;
        
        try {
            console.log(`开始生成 ${difficulty} 难度的死活题...`);
            
            const response = await fetch('/api/katago/generate-tsumego', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    difficulty: difficulty,
                    boardSize: boardSize
                })
            });
            
            if (!response.ok) {
                throw new Error(`生成死活题失败: ${response.status} ${response.statusText}`);
            }
            
            const problem = await response.json();
            console.log('KataGo生成的死活题:', problem);
            
            return problem;
            
        } catch (error) {
            console.error('生成死活题出错:', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }
    
    async addGeneratedProblem(difficulty = 'easy', boardSize = 9) {
        try {
            const problem = await this.generateProblem(difficulty, boardSize);
            
            if (problem && window.TsumegoEngine) {
                // 添加到死活题库
                window.TsumegoEngine.problems.push(problem);
                console.log(`成功添加KataGo生成的死活题: ${problem.title}`);
                
                // 可选：自动切换到新生成的题目
                window.TsumegoEngine.currentProblemIndex = window.TsumegoEngine.problems.length - 1;
                window.TsumegoEngine.startProblem(window.TsumegoEngine.currentProblemIndex);
                
                return problem;
            }
            
        } catch (error) {
            console.error('添加生成的死活题失败:', error);
            if (window.UIController && window.UIController.instance) {
                window.UIController.instance.showNotification('error', '错误', `生成死活题失败: ${error.message}`);
            }
            return null;
        }
    }
}

// 创建全局实例
window.KataGoTsumegoGenerator = new KataGoTsumegoGenerator();

// 扩展死活题引擎，添加生成按钮功能
if (window.TsumegoEngine) {
    const originalEngine = window.TsumegoEngine;
    
    // 添加生成新题目的方法
    originalEngine.generateNewProblem = async function(difficulty = 'easy') {
        try {
            const problem = await window.KataGoTsumegoGenerator.addGeneratedProblem(difficulty, game.boardSize);
            if (problem) {
                console.log('成功生成并加载新的死活题');
                return true;
            }
            return false;
        } catch (error) {
            console.error('生成新死活题失败:', error);
            return false;
        }
    };
}

// 尝试立即扩展
extendGameForTsumego();

// 如果游戏还没初始化，等待DOM加载完成后再试
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(extendGameForTsumego, 100);
});