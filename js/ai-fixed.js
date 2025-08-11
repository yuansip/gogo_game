// 修复版围棋AI引擎
console.log('开始加载修复版AI模块...');

class AIPlayer {
    constructor() {
        this.difficulty = 'medium';
        this.maxDepth = 2;
        console.log('AI构造函数执行完成');
    }

    setDifficulty(level) {
        this.difficulty = level;
        switch (level) {
            case 'easy':
                this.maxDepth = 1;
                break;
            case 'medium':
                this.maxDepth = 2;
                break;
            case 'hard':
                this.maxDepth = 3;
                break;
        }
        console.log('AI难度设置为:', level, '深度:', this.maxDepth);
    }

    getBestMove(game) {
        console.log('AI开始计算最佳着法...');
        
        // 获取所有可能的着法
        const possibleMoves = this.generateMoves(game);
        
        if (possibleMoves.length === 0) {
            console.log('没有可行着法，AI选择停一手');
            return null;
        }
        
        // 如果是开局，使用开局库
        if (game.moveHistory.length < 5) {
            const openingMove = this.getOpeningMove(game);
            if (openingMove && game.isValidMove(openingMove.x, openingMove.y)) {
                console.log('使用开局库着法:', openingMove);
                return openingMove;
            }
        }

        // 检查是否有紧急的战术着法
        const tacticalMove = this.findTacticalMove(game);
        if (tacticalMove) {
            console.log('找到战术着法:', tacticalMove);
            return tacticalMove;
        }

        // 评估所有可能的着法
        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of possibleMoves) {
            const score = this.evaluateMove(game, move);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        console.log('AI选择着法:', bestMove, '评分:', bestScore);
        return bestMove;
    }

    generateMoves(game) {
        const moves = [];
        const boardSize = game.boardSize;
        
        // 如果棋盘为空，返回中心点附近的位置
        if (game.moveHistory.length === 0) {
            const center = Math.floor(boardSize / 2);
            return [
                { x: center, y: center },
                { x: center - 1, y: center - 1 },
                { x: center + 1, y: center + 1 },
                { x: center - 1, y: center + 1 },
                { x: center + 1, y: center - 1 }
            ];
        }

        // 在已有棋子周围生成候选着法
        const candidates = new Set();
        
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (game.board[y][x] !== 0) {
                    // 在已有棋子周围2格范围内生成候选点
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && 
                                game.isValidMove(nx, ny)) {
                                candidates.add(`${nx},${ny}`);
                            }
                        }
                    }
                }
            }
        }

        // 转换为坐标数组
        for (const coord of candidates) {
            const [x, y] = coord.split(',').map(Number);
            moves.push({ x, y });
        }

        // 限制候选着法数量以提高性能
        if (moves.length > 20) {
            moves.sort(() => Math.random() - 0.5);
            return moves.slice(0, 20);
        }

        return moves;
    }

    getOpeningMove(game) {
        const boardSize = game.boardSize;
        const openingPoints = [];
        
        if (boardSize === 19) {
            openingPoints.push(
                { x: 3, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 15 }, { x: 15, y: 15 },
                { x: 9, y: 3 }, { x: 3, y: 9 }, { x: 15, y: 9 }, { x: 9, y: 15 }, { x: 9, y: 9 }
            );
        } else if (boardSize === 13) {
            openingPoints.push(
                { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 6, y: 6 }
            );
        } else if (boardSize === 9) {
            openingPoints.push(
                { x: 2, y: 2 }, { x: 6, y: 2 }, { x: 2, y: 6 }, { x: 6, y: 6 }, { x: 4, y: 4 }
            );
        }

        // 随机选择一个开局点
        if (openingPoints.length > 0) {
            return openingPoints[Math.floor(Math.random() * openingPoints.length)];
        }
        
        return null;
    }

    findTacticalMove(game) {
        // 1. 检查是否可以立即提子
        const captureMove = this.findCaptureMove(game);
        if (captureMove) return captureMove;

        // 2. 检查是否需要救自己的棋
        const escapeMove = this.findEscapeMove(game);
        if (escapeMove) return escapeMove;

        // 3. 检查是否可以打吃对方
        const atariMove = this.findAtariMove(game);
        if (atariMove) return atariMove;

        return null;
    }

    findCaptureMove(game) {
        const moves = this.generateMoves(game);
        
        for (const move of moves) {
            if (this.canCapture(game, move.x, move.y)) {
                return move;
            }
        }
        
        return null;
    }

    findEscapeMove(game) {
        // 简化的逃跑逻辑
        const moves = this.generateMoves(game);
        
        for (const move of moves) {
            if (this.canEscape(game, move.x, move.y)) {
                return move;
            }
        }
        
        return null;
    }

    findAtariMove(game) {
        // 简化的打吃逻辑
        const moves = this.generateMoves(game);
        
        for (const move of moves) {
            if (this.canAtari(game, move.x, move.y)) {
                return move;
            }
        }
        
        return null;
    }

    canCapture(game, x, y) {
        // 简化检查：是否能提子
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const opponent = -game.currentPlayer;
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                game.board[ny][nx] === opponent) {
                return true; // 简化判断
            }
        }
        
        return false;
    }

    canEscape(game, x, y) {
        // 简化的逃跑判断
        return Math.random() < 0.1; // 10%的概率认为是逃跑着法
    }

    canAtari(game, x, y) {
        // 简化的打吃判断
        return Math.random() < 0.1; // 10%的概率认为是打吃着法
    }

    evaluateMove(game, move) {
        let score = 0;
        
        // 基础位置评分
        const boardSize = game.boardSize;
        const centerX = Math.floor(boardSize / 2);
        const centerY = Math.floor(boardSize / 2);
        
        // 距离中心越近分数越高
        const distanceToCenter = Math.abs(move.x - centerX) + Math.abs(move.y - centerY);
        score += Math.max(0, 10 - distanceToCenter);
        
        // 随机因子，增加变化
        score += Math.random() * 5;
        
        // 避免过于接近边缘
        const edgeDistance = Math.min(move.x, move.y, boardSize - 1 - move.x, boardSize - 1 - move.y);
        if (edgeDistance < 2) {
            score -= 5;
        }
        
        return score;
    }
}

// 创建全局AI实例
console.log('开始创建AI实例...');
try {
    window.AIPlayer = new AIPlayer();
    console.log('AI实例创建成功!');
    console.log('window.AIPlayer类型:', typeof window.AIPlayer);
    console.log('getBestMove方法类型:', typeof window.AIPlayer.getBestMove);
} catch (error) {
    console.error('AI实例创建失败:', error);
}

console.log('修复版AI模块加载完成');