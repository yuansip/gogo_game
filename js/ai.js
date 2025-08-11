// 围棋AI引擎

class AIPlayer {
    constructor() {
        this.difficulty = 'medium'; // easy, medium, hard
        this.maxDepth = 2;
        this.evaluationCache = new Map();
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
    }

    getBestMove(game) {
        const startTime = Date.now();
        let bestMove = null;
        let bestScore = -Infinity;
        
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
                console.log('使用开局库着法');
                return openingMove;
            }
        }

        // 检查是否有紧急的战术着法
        const tacticalMove = this.findTacticalMove(game);
        if (tacticalMove) {
            console.log('找到战术着法');
            return tacticalMove;
        }

        // 简单模式使用快速启发式，复杂模式使用minimax
        if (this.difficulty === 'easy') {
            // 简单模式：使用启发式评估 + 随机性
            for (const move of possibleMoves) {
                const score = this.moveHeuristic(game, move) + (Math.random() - 0.5) * 30;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        } else {
            // 中等和困难模式：使用minimax算法
            for (const move of possibleMoves) {
                const score = this.minimax(game, move, this.maxDepth, -Infinity, Infinity, false);
                
                // 添加一些随机性
                const randomFactor = this.difficulty === 'medium' ? (Math.random() - 0.5) * 15 : 
                                    (Math.random() - 0.5) * 5;
                
                const finalScore = score + randomFactor;
                
                if (finalScore > bestScore) {
                    bestScore = finalScore;
                    bestMove = move;
                }
            }
        }

        const computeTime = Date.now() - startTime;
        console.log(`AI计算时间: ${computeTime}ms, 最佳着法: (${bestMove?.x}, ${bestMove?.y}), 评分: ${bestScore.toFixed(2)}`);
        
        return bestMove || possibleMoves[0]; // 确保总是返回一个着法
    }

    minimax(game, move, depth, alpha, beta, isMaximizing) {
        // 制作一个游戏状态的副本
        const tempGame = this.cloneGameState(game);
        
        // 执行这一步
        if (!this.simulateMove(tempGame, move.x, move.y)) {
            return -Infinity; // 非法着法
        }

        // 如果到达最大深度，返回评估值
        if (depth === 0) {
            return this.evaluatePosition(tempGame);
        }

        const moves = this.generateMoves(tempGame);
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const nextMove of moves) {
                const evaluation = this.minimax(tempGame, nextMove, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break; // Alpha-beta剪枝
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const nextMove of moves) {
                const evaluation = this.minimax(tempGame, nextMove, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break; // Alpha-beta剪枝
            }
            return minEval;
        }
    }

    generateMoves(game) {
        const moves = [];
        const boardSize = game.boardSize;
        
        // 根据棋盘上已有的棋子，智能生成候选着法
        const existingStones = [];
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (game.board[y][x] !== 0) {
                    existingStones.push({ x, y });
                }
            }
        }

        if (existingStones.length === 0) {
            // 如果棋盘是空的，选择中心附近的点
            const center = Math.floor(boardSize / 2);
            const radius = 2;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const x = center + dx;
                    const y = center + dy;
                    if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                        moves.push({ x, y });
                    }
                }
            }
        } else {
            // 在已有棋子附近寻找着法点
            const candidates = new Set();
            
            for (const stone of existingStones) {
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const x = stone.x + dx;
                        const y = stone.y + dy;
                        
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize && 
                            game.board[y][x] === 0 && game.isValidMove(x, y)) {
                            candidates.add(`${x},${y}`);
                        }
                    }
                }
            }
            
            // 转换为数组并限制数量
            candidates.forEach(key => {
                const [x, y] = key.split(',').map(Number);
                moves.push({ x, y });
            });
        }

        // 根据启发式排序，优先考虑更有前途的着法
        return moves.sort((a, b) => this.moveHeuristic(game, b) - this.moveHeuristic(game, a))
                   .slice(0, Math.min(moves.length, this.difficulty === 'easy' ? 8 : this.difficulty === 'medium' ? 12 : 16)); // 根据难度限制搜索空间
    }

    moveHeuristic(game, move) {
        let score = 0;
        
        // 中心偏好
        const center = Math.floor(game.boardSize / 2);
        const distanceFromCenter = Math.abs(move.x - center) + Math.abs(move.y - center);
        score -= distanceFromCenter * 2;
        
        // 角落和边的处理
        if (this.isCorner(move, game.boardSize)) {
            score += 15;
        } else if (this.isEdge(move, game.boardSize)) {
            score += 5;
        }
        
        // 连接性分析
        score += this.analyzeConnectivity(game, move) * 10;
        
        return score;
    }

    evaluatePosition(game) {
        let score = 0;
        
        // 提子优势
        score += (game.whiteCaptures - game.blackCaptures) * 15;
        
        // 领地控制
        score += this.evaluateTerritory(game) * 0.5;
        
        // 棋子安全性
        score += this.evaluateSafety(game) * 3;
        
        // 连接性评估
        score += this.evaluateConnections(game) * 2;
        
        // 形状评估
        score += this.evaluateShapes(game);
        
        return score;
    }

    evaluateTerritory(game) {
        let score = 0;
        const influence = this.calculateInfluence(game);
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === 0) {
                    // 空点的影响力差值
                    score += influence[y][x];
                }
            }
        }
        
        return score;
    }

    calculateInfluence(game) {
        const influence = Array(game.boardSize).fill().map(() => Array(game.boardSize).fill(0));
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] !== 0) {
                    const color = game.board[y][x];
                    
                    // 计算这个棋子对周围的影响
                    for (let dy = -3; dy <= 3; dy++) {
                        for (let dx = -3; dx <= 3; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                                const distance = Math.abs(dx) + Math.abs(dy);
                                const influenceValue = Math.max(0, 4 - distance) * color;
                                influence[ny][nx] += influenceValue;
                            }
                        }
                    }
                }
            }
        }
        
        return influence;
    }

    evaluateSafety(game) {
        let score = 0;
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] !== 0) {
                    const color = game.board[y][x];
                    const group = game.getGroup(x, y);
                    const liberties = this.countLiberties(game, group);
                    
                    // 气数越多越安全
                    const safetyScore = Math.min(liberties, 5) * color;
                    score += safetyScore;
                    
                    // 如果只有一口气，非常危险
                    if (liberties === 1) {
                        score -= 20 * color;
                    }
                }
            }
        }
        
        return score;
    }

    countLiberties(game, group) {
        const liberties = new Set();
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [x, y] of group) {
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                    game.board[ny][nx] === 0) {
                    liberties.add(`${nx},${ny}`);
                }
            }
        }
        
        return liberties.size;
    }

    evaluateConnections(game) {
        let score = 0;
        
        // 评估棋子之间的连接强度
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] !== 0) {
                    const color = game.board[y][x];
                    const connections = this.countConnections(game, x, y);
                    score += connections * color * 2;
                }
            }
        }
        
        return score;
    }

    countConnections(game, x, y) {
        let connections = 0;
        const color = game.board[y][x];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                game.board[ny][nx] === color) {
                connections++;
            }
        }
        
        return connections;
    }

    evaluateShapes(game) {
        let score = 0;
        
        // 寻找好形状和坏形状
        for (let y = 1; y < game.boardSize - 1; y++) {
            for (let x = 1; x < game.boardSize - 1; x++) {
                if (game.board[y][x] !== 0) {
                    const color = game.board[y][x];
                    
                    // 检查虎口
                    if (this.isTiger(game, x, y)) {
                        score += 8 * color;
                    }
                    
                    // 检查愚形
                    if (this.isBadShape(game, x, y)) {
                        score -= 5 * color;
                    }
                }
            }
        }
        
        return score;
    }

    isTiger(game, x, y) {
        // 简单的虎口形状检测
        const color = game.board[y][x];
        const patterns = [
            [[0, 1], [1, 0]], // 右下虎口
            [[0, 1], [-1, 0]], // 左下虎口
            [[0, -1], [1, 0]], // 右上虎口
            [[0, -1], [-1, 0]]  // 左上虎口
        ];
        
        for (const pattern of patterns) {
            let matches = true;
            for (const [dx, dy] of pattern) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= game.boardSize || ny < 0 || ny >= game.boardSize || 
                    game.board[ny][nx] !== color) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        
        return false;
    }

    isBadShape(game, x, y) {
        // 检测一些基本的坏形状
        const color = game.board[y][x];
        
        // 检查是否形成了空三角
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        let adjacentCount = 0;
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                game.board[ny][nx] === color) {
                adjacentCount++;
            }
        }
        
        return adjacentCount === 0; // 孤立的棋子可能是坏形状
    }

    findTacticalMove(game) {
        // 查找紧急的战术着法，按优先级排序
        
        // 1. 立即提子（最高优先级）
        const captureMove = this.findCaptureMove(game);
        if (captureMove) {
            console.log('找到提子着法:', captureMove);
            return captureMove;
        }
        
        // 2. 救自己的棋（第二优先级）
        const escapeMove = this.findEscapeMove(game);
        if (escapeMove) {
            console.log('找到逃跑着法:', escapeMove);
            return escapeMove;
        }
        
        // 3. 打吃对方（第三优先级）
        const atariMove = this.findAtariMove(game);
        if (atariMove) {
            console.log('找到打吃着法:', atariMove);
            return atariMove;
        }
        
        // 4. 阻止对方的打吃
        const blockAtariMove = this.findBlockAtariMove(game);
        if (blockAtariMove) {
            console.log('找到阻止打吃着法:', blockAtariMove);
            return blockAtariMove;
        }
        
        // 5. 扩张己方势力
        const expandMove = this.findExpansionMove(game);
        if (expandMove) {
            console.log('找到扩张着法:', expandMove);
            return expandMove;
        }
        
        return null;
    }

    findCaptureMove(game) {
        // 寻找能够提取对方棋子的着法
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.isValidMove(x, y)) {
                    // 模拟这一步
                    const tempGame = this.cloneGameState(game);
                    if (this.simulateMove(tempGame, x, y)) {
                        // 检查是否提取了对方棋子
                        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                        for (const [dx, dy] of directions) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                                const neighborColor = game.board[ny][nx];
                                if (neighborColor !== 0 && neighborColor !== game.currentPlayer) {
                                    const group = game.getGroup(nx, ny);
                                    if (this.countLiberties(tempGame, group) === 0) {
                                        return { x, y };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    findEscapeMove(game) {
        // 寻找拯救己方棋子的着法
        const myColor = game.currentPlayer;
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === myColor) {
                    const group = game.getGroup(x, y);
                    const liberties = this.countLiberties(game, group);
                    
                    if (liberties === 1) {
                        // 找到唯一的逃跑点
                        const libertiesSet = new Set();
                        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                        
                        for (const [gx, gy] of group) {
                            for (const [dx, dy] of directions) {
                                const nx = gx + dx;
                                const ny = gy + dy;
                                
                                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                                    game.board[ny][nx] === 0 && game.isValidMove(nx, ny)) {
                                    libertiesSet.add(`${nx},${ny}`);
                                }
                            }
                        }
                        
                        if (libertiesSet.size === 1) {
                            const [escapeX, escapeY] = Array.from(libertiesSet)[0].split(',').map(Number);
                            return { x: escapeX, y: escapeY };
                        }
                    }
                }
            }
        }
        return null;
    }

    findBlockMove(game) {
        // 寻找阻止对方提子的着法
        const opponentColor = -game.currentPlayer;
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === opponentColor) {
                    const group = game.getGroup(x, y);
                    const liberties = this.countLiberties(game, group);
                    
                    if (liberties === 1) {
                        // 找到对方的叫吃，尝试阻止
                        const libertiesSet = new Set();
                        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                        
                        for (const [gx, gy] of group) {
                            for (const [dx, dy] of directions) {
                                const nx = gx + dx;
                                const ny = gy + dy;
                                
                                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                                    game.board[ny][nx] === 0 && game.isValidMove(nx, ny)) {
                                    libertiesSet.add(`${nx},${ny}`);
                                }
                            }
                        }
                        
                        if (libertiesSet.size === 1) {
                            const [blockX, blockY] = Array.from(libertiesSet)[0].split(',').map(Number);
                            // 检查这一步是否对我们有利
                            return { x: blockX, y: blockY };
                        }
                    }
                }
            }
        }
        return null;
    }

    getOpeningMove(game) {
        const boardSize = game.boardSize;
        const moveCount = game.moveHistory.length;
        
        if (boardSize !== 19) {
            const center = Math.floor(boardSize / 2);
            if (moveCount === 0) return { x: center, y: center };
            return null;
        }
        
        // 19路棋盘的开局定式
        switch (moveCount) {
            case 0:
                // 第一手：选择星位或小目
                const firstMoves = [
                    { x: 3, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 15 }, { x: 15, y: 15 }, // 星位
                    { x: 3, y: 9 }, { x: 15, y: 9 }, { x: 9, y: 3 }, { x: 9, y: 15 }  // 小目
                ];
                return firstMoves[Math.floor(Math.random() * firstMoves.length)];
                
            case 1:
                // 第二手：占据空角
                const corners = [
                    { x: 3, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 15 }, { x: 15, y: 15 }
                ];
                const availableCorners = corners.filter(corner => 
                    game.board[corner.y][corner.x] === 0
                );
                if (availableCorners.length > 0) {
                    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
                }
                break;
                
            case 2:
            case 3:
                // 第三、四手：继续占角或布局
                const layoutMoves = this.getLayoutMoves(game);
                if (layoutMoves.length > 0) {
                    return layoutMoves[Math.floor(Math.random() * layoutMoves.length)];
                }
                break;
                
            default:
                // 开局后期：寻找定式应对
                const josekiMove = this.findJosekiResponse(game);
                if (josekiMove) return josekiMove;
        }
        
        return null;
    }
    
    getLayoutMoves(game) {
        const layoutPoints = [
            // 星位系统
            { x: 3, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 15 }, { x: 15, y: 15 },
            // 小目系统
            { x: 3, y: 9 }, { x: 15, y: 9 }, { x: 9, y: 3 }, { x: 9, y: 15 },
            // 边上要点
            { x: 9, y: 9 }, // 天元
            { x: 6, y: 3 }, { x: 12, y: 3 }, { x: 3, y: 6 }, { x: 3, y: 12 },
            { x: 15, y: 6 }, { x: 15, y: 12 }, { x: 6, y: 15 }, { x: 12, y: 15 }
        ];
        
        return layoutPoints.filter(point => 
            game.board[point.y][point.x] === 0 && 
            game.isValidMove(point.x, point.y)
        );
    }
    
    findJosekiResponse(game) {
        // 简单的定式库 - 检查常见的角部定式
        const josekiPatterns = [
            // 星位小飞定式
            {
                pattern: [[3, 3, 1], [5, 4, -1]], // 黑星位，白小飞挂
                response: { x: 4, y: 6 } // 黑跳出
            },
            // 小目定式
            {
                pattern: [[3, 9, 1], [6, 8, -1]], // 黑小目，白挂角
                response: { x: 6, y: 10 } // 黑小飞应
            }
        ];
        
        for (const joseki of josekiPatterns) {
            if (this.matchesPattern(game, joseki.pattern)) {
                const move = joseki.response;
                if (game.isValidMove(move.x, move.y)) {
                    console.log('使用定式应对:', move);
                    return move;
                }
            }
        }
        
        return null;
    }
    
    matchesPattern(game, pattern) {
        return pattern.every(([x, y, color]) => {
            if (x < 0 || x >= game.boardSize || y < 0 || y >= game.boardSize) {
                return false;
            }
            return game.board[y][x] === color;
        });
    }

    findAtariMove(game) {
        // 寻找打吃对方棋子的着法（让对方只剩一口气）
        const myColor = game.currentPlayer;
        const opponentColor = -myColor;
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.isValidMove(x, y)) {
                    // 模拟这一步
                    const tempGame = this.cloneGameState(game);
                    if (this.simulateMove(tempGame, x, y)) {
                        // 检查是否有对方棋块被打吃
                        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                        for (const [dx, dy] of directions) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                                tempGame.board[ny][nx] === opponentColor) {
                                const group = tempGame.getGroup(nx, ny);
                                const liberties = this.countLiberties(tempGame, group);
                                if (liberties === 1) {
                                    return { x, y, priority: 'atari' };
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    findBlockAtariMove(game) {
        // 阻止对方的打吃
        const myColor = game.currentPlayer;
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === myColor) {
                    const group = game.getGroup(x, y);
                    const liberties = this.countLiberties(game, group);
                    
                    if (liberties === 2) {
                        // 如果己方棋块只有两口气，考虑补强
                        const libertyPositions = this.getLibertyPositions(game, group);
                        for (const pos of libertyPositions) {
                            if (game.isValidMove(pos.x, pos.y)) {
                                // 检查这一步是否能增加气数
                                const tempGame = this.cloneGameState(game);
                                if (this.simulateMove(tempGame, pos.x, pos.y)) {
                                    const newGroup = tempGame.getGroup(pos.x, pos.y);
                                    const newLiberties = this.countLiberties(tempGame, newGroup);
                                    if (newLiberties > 2) {
                                        return { x: pos.x, y: pos.y, priority: 'defend' };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    findExpansionMove(game) {
        // 寻找扩张势力的着法
        const myColor = game.currentPlayer;
        let bestMove = null;
        let bestScore = -Infinity;
        
        // 寻找己方棋子附近的扩张点
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === myColor) {
                    // 检查这个棋子周围的扩张机会
                    const directions = [
                        [0, 1], [1, 0], [0, -1], [-1, 0],  // 直接相邻
                        [1, 1], [1, -1], [-1, 1], [-1, -1] // 对角
                    ];
                    
                    for (const [dx, dy] of directions) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                            game.isValidMove(nx, ny)) {
                            
                            const expansionScore = this.evaluateExpansion(game, nx, ny);
                            if (expansionScore > bestScore) {
                                bestScore = expansionScore;
                                bestMove = { x: nx, y: ny };
                            }
                        }
                    }
                }
            }
        }
        
        return bestMove;
    }

    evaluateExpansion(game, x, y) {
        let score = 0;
        const myColor = game.currentPlayer;
        
        // 连接价值
        const connections = this.analyzeConnectivity(game, { x, y });
        score += connections * 10;
        
        // 领地控制
        const influence = this.calculateInfluence(game);
        score += influence[y][x] * myColor * 2;
        
        // 形状价值
        if (this.isGoodShape(game, x, y)) {
            score += 15;
        }
        
        // 避开坏形状
        if (this.isBadPositionalShape(game, x, y)) {
            score -= 20;
        }
        
        return score;
    }

    isGoodShape(game, x, y) {
        // 检查是否形成好的形状
        const myColor = game.currentPlayer;
        
        // 检查是否形成飞、跳等好形状
        const patterns = [
            // 飞的形状
            [[1, 0], [2, 1]], [[0, 1], [1, 2]], [[-1, 0], [-2, 1]], [[0, -1], [1, -2]],
            // 跳的形状  
            [[2, 0]], [[0, 2]], [[-2, 0]], [[0, -2]],
            // 小飞
            [[1, 1]], [[1, -1]], [[-1, 1]], [[-1, -1]]
        ];
        
        for (const pattern of patterns) {
            let matches = 0;
            for (const [dx, dy] of pattern) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                    game.board[ny][nx] === myColor) {
                    matches++;
                }
            }
            if (matches === pattern.length) {
                return true;
            }
        }
        
        return false;
    }

    isBadPositionalShape(game, x, y) {
        // 检查是否形成坏的形状
        const myColor = game.currentPlayer;
        
        // 检查空三角等坏形状
        const badPatterns = [
            // 空三角
            [[1, 0], [0, 1]], [[1, 0], [0, -1]], [[-1, 0], [0, 1]], [[-1, 0], [0, -1]]
        ];
        
        for (const pattern of badPatterns) {
            let matches = 0;
            for (const [dx, dy] of pattern) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                    game.board[ny][nx] === myColor) {
                    matches++;
                }
            }
            if (matches === pattern.length) {
                return true;
            }
        }
        
        return false;
    }

    getLibertyPositions(game, group) {
        const liberties = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const libertySet = new Set();
        
        for (const [x, y] of group) {
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                    game.board[ny][nx] === 0) {
                    const key = `${nx},${ny}`;
                    if (!libertySet.has(key)) {
                        libertySet.add(key);
                        liberties.push({ x: nx, y: ny });
                    }
                }
            }
        }
        
        return liberties;
    }

    cloneGameState(game) {
        const clone = {
            board: game.board.map(row => [...row]),
            currentPlayer: game.currentPlayer,
            boardSize: game.boardSize,
            blackCaptures: game.blackCaptures,
            whiteCaptures: game.whiteCaptures,
            koPosition: game.koPosition,
            getGroup: game.getGroup.bind(game),
            isValidMove: game.isValidMove.bind(game)
        };
        
        // 修正绑定的方法
        clone.getGroup = function(x, y) {
            const color = this.board[y][x];
            if (color === 0) return [];
            
            const group = [];
            const visited = new Set();
            const stack = [[x, y]];
            
            while (stack.length > 0) {
                const [cx, cy] = stack.pop();
                const key = `${cx},${cy}`;
                
                if (visited.has(key)) continue;
                visited.add(key);
                
                if (cx >= 0 && cx < this.boardSize && cy >= 0 && cy < this.boardSize && 
                    this.board[cy][cx] === color) {
                    group.push([cx, cy]);
                    
                    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                    directions.forEach(([dx, dy]) => {
                        stack.push([cx + dx, cy + dy]);
                    });
                }
            }
            
            return group;
        };
        
        clone.isValidMove = function(x, y) {
            if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) {
                return false;
            }
            if (this.board[y][x] !== 0) {
                return false;
            }
            if (this.koPosition && this.koPosition.x === x && this.koPosition.y === y) {
                return false;
            }
            return true;
        };
        
        return clone;
    }

    simulateMove(gameState, x, y) {
        if (!gameState.isValidMove(x, y)) {
            return false;
        }

        gameState.board[y][x] = gameState.currentPlayer;
        
        // 简化的提子检查
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        directions.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < gameState.boardSize && ny >= 0 && ny < gameState.boardSize) {
                const neighborColor = gameState.board[ny][nx];
                if (neighborColor !== 0 && neighborColor !== gameState.currentPlayer) {
                    const group = gameState.getGroup(nx, ny);
                    if (this.countLiberties(gameState, group) === 0) {
                        // 移除被提的棋子
                        group.forEach(([gx, gy]) => {
                            gameState.board[gy][gx] = 0;
                        });
                    }
                }
            }
        });
        
        gameState.currentPlayer = -gameState.currentPlayer;
        return true;
    }

    analyzeConnectivity(game, move) {
        let connectivity = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            const nx = move.x + dx;
            const ny = move.y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize && 
                game.board[ny][nx] === game.currentPlayer) {
                connectivity++;
            }
        }
        
        return connectivity;
    }

    isCorner(move, boardSize) {
        return (move.x === 0 || move.x === boardSize - 1) && 
               (move.y === 0 || move.y === boardSize - 1);
    }

    isEdge(move, boardSize) {
        return move.x === 0 || move.x === boardSize - 1 || 
               move.y === 0 || move.y === boardSize - 1;
    }
}

// 立即创建全局AI实例
console.log('开始创建AI实例...');
try {
    window.AIPlayer = new AIPlayer();
    console.log('AI实例创建成功:', typeof window.AIPlayer);
    console.log('AI getBestMove方法:', typeof window.AIPlayer.getBestMove);
} catch (error) {
    console.error('AI实例创建失败:', error);
}

// 确保AI模块在DOM加载完成时可用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，检查AI模块状态...');
    console.log('window.AIPlayer存在:', !!window.AIPlayer);
    if (window.AIPlayer) {
        console.log('AI实例类型:', typeof window.AIPlayer);
        console.log('AI getBestMove方法可用:', typeof window.AIPlayer.getBestMove);
        console.log('AI实例方法列表:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.AIPlayer)));
    } else {
        console.error('AI模块未正确初始化！');
    }
});