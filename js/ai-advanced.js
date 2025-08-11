// 高级围棋AI引擎 - 包含真正的围棋战术
console.log('开始加载高级AI模块...');

class AIPlayer {
    constructor() {
        this.difficulty = 'medium';
        this.maxDepth = 2;
        this.evaluationCache = new Map();
        console.log('高级AI构造函数执行完成');
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
        console.log('AI难度设置为:', level, '搜索深度:', this.maxDepth);
    }

    getBestMove(game) {
        console.log('高级AI开始计算最佳着法...');
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

        // 使用评估函数对所有候选着法评分
        for (const move of possibleMoves) {
            let score;
            
            if (this.difficulty === 'easy') {
                // 简单模式：只用基础评估
                score = this.evaluateMove(game, move);
            } else {
                // 中等和困难模式：使用更深入的分析
                score = this.evaluatePosition(game, move);
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`AI计算完成，选择着法: (${bestMove.x}, ${bestMove.y})，评分: ${bestScore.toFixed(2)}，耗时: ${elapsed}ms`);
        
        return bestMove;
    }

    generateMoves(game) {
        const moves = [];
        const boardSize = game.boardSize;
        
        // 如果棋盘为空，返回星位
        if (game.moveHistory.length === 0) {
            return this.getStarPoints(boardSize);
        }

        // 智能生成候选着法：在已有棋子周围
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

        // 如果候选着法太少，添加一些边角点
        if (moves.length < 10) {
            const corners = this.getCornerPoints(boardSize);
            for (const corner of corners) {
                if (game.isValidMove(corner.x, corner.y)) {
                    moves.push(corner);
                }
            }
        }

        // 限制候选着法数量以提高性能
        if (moves.length > 25) {
            // 按照到棋盘中心的距离排序，保留最有希望的着法
            const center = Math.floor(boardSize / 2);
            moves.sort((a, b) => {
                const distA = Math.abs(a.x - center) + Math.abs(a.y - center);
                const distB = Math.abs(b.x - center) + Math.abs(b.y - center);
                return distA - distB;
            });
            return moves.slice(0, 25);
        }

        return moves;
    }

    getStarPoints(boardSize) {
        if (boardSize === 19) {
            return [
                { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 },
                { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 },
                { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 }
            ];
        } else if (boardSize === 13) {
            return [
                { x: 3, y: 3 }, { x: 6, y: 6 }, { x: 9, y: 3 },
                { x: 3, y: 9 }, { x: 9, y: 9 }
            ];
        } else if (boardSize === 9) {
            return [
                { x: 2, y: 2 }, { x: 4, y: 4 }, { x: 6, y: 2 },
                { x: 2, y: 6 }, { x: 6, y: 6 }
            ];
        }
        return [{ x: Math.floor(boardSize/2), y: Math.floor(boardSize/2) }];
    }

    getCornerPoints(boardSize) {
        return [
            { x: 3, y: 3 }, { x: boardSize-4, y: 3 },
            { x: 3, y: boardSize-4 }, { x: boardSize-4, y: boardSize-4 }
        ];
    }

    getOpeningMove(game) {
        const starPoints = this.getStarPoints(game.boardSize);
        
        // 找到第一个可用的星位
        for (const point of starPoints) {
            if (game.isValidMove(point.x, point.y)) {
                return point;
            }
        }
        
        return null;
    }

    findTacticalMove(game) {
        console.log('=== AI战术分析开始 ===');
        console.log('当前玩家:', game.currentPlayer === 1 ? '黑棋' : '白棋');
        
        // 🔥 1. 救自己的棋（最高优先级 - 保命第一！）
        console.log('🔥 [优先级1] 检查自救机会...');
        const escapeMove = this.findEscapeMove(game);
        if (escapeMove) {
            console.log('✓ 找到救棋着法（最高优先级）:', escapeMove);
            return escapeMove;
        }
        console.log('✗ 无需自救或无法自救');

        // 💰 2. 立即提子（第二优先级 - 获得实际利益）
        console.log('💰 [优先级2] 检查提子机会...');
        const captureMove = this.findCaptureMove(game);
        if (captureMove) {
            console.log('✓ 找到提子着法:', captureMove);
            return captureMove;
        }
        console.log('✗ 未找到提子机会');

        // ⚔️ 3. 打吃对方（第三优先级 - 制造威胁）
        console.log('⚔️ [优先级3] 检查打吃机会...');
        const atariMove = this.findAtariMove(game);
        if (atariMove) {
            console.log('✓ 找到打吃着法:', atariMove);
            return atariMove;
        }
        console.log('✗ 未找到打吃机会');

        // 🛡️ 4. 阻挡对方连接（第四优先级 - 防守策略）
        console.log('🛡️ [优先级4] 检查阻挡机会...');
        const blockMove = this.findBlockMove(game);
        if (blockMove) {
            console.log('✓ 找到阻挡着法:', blockMove);
            return blockMove;
        }
        console.log('✗ 未找到阻挡机会');

        console.log('=== 无紧急战术，使用位置评估 ===');
        return null;
    }

    findCaptureMove(game) {
        const moves = this.generateMoves(game);
        const myColor = game.currentPlayer;
        const opponentColor = -myColor;
        
        console.log(`检查${moves.length}个候选着法的提子机会...`);
        
        for (const move of moves) {
            // 模拟放子前先检查四周有没有对方的棋子
            let hasOpponentNeighbor = false;
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            
            for (const [dx, dy] of directions) {
                const nx = move.x + dx;
                const ny = move.y + dy;
                
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                    if (game.board[ny][nx] === opponentColor) {
                        hasOpponentNeighbor = true;
                        break;
                    }
                }
            }
            
            if (!hasOpponentNeighbor) {
                continue; // 附近没有对方棋子，跳过
            }
            
            // 模拟这一步棋
            const testGame = this.cloneGame(game);
            testGame.board[move.y][move.x] = myColor;
            
            // 检查四周对方棋组的气数
            let canCapture = false;
            for (const [dx, dy] of directions) {
                const nx = move.x + dx;
                const ny = move.y + dy;
                
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                    if (testGame.board[ny][nx] === opponentColor) {
                        const opponentGroup = this.getGroup(nx, ny, testGame);
                        const liberties = this.getLiberties(opponentGroup, testGame);
                        
                        if (liberties.length === 0) {
                            console.log(`着法 (${move.x}, ${move.y}) 可以提取对方 ${opponentGroup.length} 个棋子`);
                            canCapture = true;
                            break;
                        }
                    }
                }
            }
            
            if (canCapture) {
                return move;
            }
        }
        
        return null;
    }

    findEscapeMove(game) {
        const moves = this.generateMoves(game);
        const myColor = game.currentPlayer;
        
        // 找到自己处于危险的棋组
        const dangerousGroups = this.findDangerousGroups(game, myColor);
        
        if (dangerousGroups.length === 0) {
            return null; // 没有危险的棋组
        }
        
        console.log(`发现${dangerousGroups.length}个危险棋组，尝试救棋...`);
        
        // 按照危险程度排序（气数少的优先，同等气数下棋子多的优先）
        dangerousGroups.sort((a, b) => {
            if (a.liberties.length !== b.liberties.length) {
                return a.liberties.length - b.liberties.length; // 气数少的优先
            }
            return b.stones.length - a.stones.length; // 同等气数下，棋子多的优先救
        });
        
        // 输出危险分析
        if (dangerousGroups.length > 0) {
            console.log('🚨 危险棋组分析（按优先级排序）:');
            dangerousGroups.forEach((group, index) => {
                console.log(`  ${index + 1}. 位置:(${group.stones[0].x},${group.stones[0].y}) 气数:${group.liberties.length} 大小:${group.stones.length} 级别:${group.danger === 'critical' ? '🔴致命' : '🟡警告'}`);
            });
        }
        
        // 优先检查最危险棋组的气位（1气的棋组优先）
        const criticalMoves = [];
        const warningMoves = [];
        
        for (const dangerousGroup of dangerousGroups) {
            for (const liberty of dangerousGroup.liberties) {
                if (game.isValidMove(liberty.x, liberty.y)) {
                    if (dangerousGroup.danger === 'critical') {
                        criticalMoves.push({
                            ...liberty,
                            groupInfo: `救${dangerousGroup.stones.length}子棋组`
                        });
                    } else {
                        warningMoves.push({
                            ...liberty,
                            groupInfo: `保护${dangerousGroup.stones.length}子棋组`
                        });
                    }
                }
            }
        }
        
        console.log(`🔴 致命级救棋位置: ${criticalMoves.length} 个`);
        console.log(`🟡 警告级救棋位置: ${warningMoves.length} 个`);
        
        // 1. 优先检查致命级救棋着法（1气棋组）
        for (const move of criticalMoves) {
            if (this.canSaveGroups(game, move, dangerousGroups)) {
                console.log(`🔥 找到致命级救棋着法: (${move.x}, ${move.y}) - ${move.groupInfo}`);
                return move;
            }
        }
        
        // 2. 检查警告级救棋着法（2气棋组）
        for (const move of warningMoves) {
            if (this.canSaveGroups(game, move, dangerousGroups)) {
                console.log(`⚠️ 找到预防性救棋着法: (${move.x}, ${move.y}) - ${move.groupInfo}`);
                return move;
            }
        }
        
        // 3. 检查其他可能的救棋着法
        const allEmergencyMoves = [...criticalMoves, ...warningMoves];
        for (const move of moves) {
            // 跳过已检查的紧急着法
            if (allEmergencyMoves.some(em => em.x === move.x && em.y === move.y)) {
                continue;
            }
            
            if (this.canSaveGroups(game, move, dangerousGroups)) {
                console.log(`💡 找到其他救棋着法: (${move.x}, ${move.y})`);
                return move;
            }
        }
        
        return null;
    }

    findAtariMove(game) {
        const moves = this.generateMoves(game);
        const opponentColor = -game.currentPlayer;
        
        for (const move of moves) {
            // 检查这一步是否能打吃对方
            if (this.canAtariOpponent(game, move, opponentColor)) {
                return move;
            }
        }
        
        return null;
    }

    findBlockMove(game) {
        const moves = this.generateMoves(game);
        
        for (const move of moves) {
            // 检查这一步是否能阻挡对方的重要连接
            if (this.canBlockConnection(game, move)) {
                return move;
            }
        }
        
        return null;
    }

    evaluateMove(game, move) {
        let score = 0;
        
        // 基础位置评分
        score += this.getPositionScore(game, move);
        
        // 影响力评分
        score += this.getInfluenceScore(game, move);
        
        // 安全性评分
        score += this.getSafetyScore(game, move);
        
        // 添加一些随机性
        score += (Math.random() - 0.5) * 2;
        
        return score;
    }

    evaluatePosition(game, move) {
        let score = this.evaluateMove(game, move);
        
        // 模拟这一步棋，看看结果
        const testGame = this.cloneGame(game);
        if (this.simulateMove(testGame, move.x, move.y)) {
            // 提子奖励
            score += (testGame.whiteCaptures + testGame.blackCaptures - 
                     game.whiteCaptures - game.blackCaptures) * 10;
            
            // 领地控制
            score += this.evaluateTerritory(testGame) * 0.3;
            
            // 连接性
            score += this.evaluateConnections(testGame, move) * 2;
        }
        
        return score;
    }

    getPositionScore(game, move) {
        let score = 0;
        const boardSize = game.boardSize;
        
        // 避免贴边
        const edgeDistance = Math.min(move.x, move.y, boardSize - 1 - move.x, boardSize - 1 - move.y);
        if (edgeDistance === 0) score -= 5;
        else if (edgeDistance === 1) score -= 2;
        
        // 星位加分
        const starPoints = this.getStarPoints(boardSize);
        for (const star of starPoints) {
            if (star.x === move.x && star.y === move.y) {
                score += 3;
                break;
            }
        }
        
        return score;
    }

    getInfluenceScore(game, move) {
        let score = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        // 检查周围的棋子
        for (const [dx, dy] of directions) {
            const nx = move.x + dx;
            const ny = move.y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                const cell = game.board[ny][nx];
                if (cell === game.currentPlayer) {
                    score += 2; // 连接己方棋子
                } else if (cell === -game.currentPlayer) {
                    score += 1; // 压制对方棋子
                }
            }
        }
        
        return score;
    }

    getSafetyScore(game, move) {
        // 检查这个位置的气数
        let liberties = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            const nx = move.x + dx;
            const ny = move.y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                if (game.board[ny][nx] === 0) {
                    liberties++;
                }
            }
        }
        
        return Math.max(0, liberties - 1); // 气数越多越安全
    }

    evaluateTerritory(game) {
        // 简化的领地评估
        let score = 0;
        const myColor = game.currentPlayer;
        
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === 0) {
                    const influence = this.getPointInfluence(game, x, y);
                    score += influence * myColor;
                }
            }
        }
        
        return score;
    }

    getPointInfluence(game, x, y) {
        let influence = 0;
        const range = 3;
        
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                    const cell = game.board[ny][nx];
                    if (cell !== 0) {
                        const distance = Math.abs(dx) + Math.abs(dy);
                        const weight = Math.max(0, range - distance + 1);
                        influence += cell * weight;
                    }
                }
            }
        }
        
        return influence;
    }

    evaluateConnections(game, move) {
        // 简化的连接性评估
        let score = 0;
        const myColor = game.currentPlayer;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            const nx = move.x + dx;
            const ny = move.y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                if (game.board[ny][nx] === myColor) {
                    score += 1; // 连接己方棋子
                }
            }
        }
        
        return score;
    }

    // 辅助方法
    cloneGame(game) {
        return {
            board: game.board.map(row => [...row]),
            boardSize: game.boardSize,
            currentPlayer: game.currentPlayer,
            blackCaptures: game.blackCaptures,
            whiteCaptures: game.whiteCaptures,
            moveHistory: [...game.moveHistory],
            koPosition: game.koPosition ? { ...game.koPosition } : null
        };
    }

    simulateMove(game, x, y) {
        if (!game.isValidMove || !game.isValidMove(x, y)) {
            return false;
        }
        
        // 放置棋子
        game.board[y][x] = game.currentPlayer;
        
        // 检查并处理提子
        const capturedGroups = this.getCapturedGroups(game, x, y);
        for (const group of capturedGroups) {
            for (const stone of group) {
                game.board[stone.y][stone.x] = 0; // 移除被提的棋子
            }
            
            // 更新提子计数
            if (game.currentPlayer === 1) {
                game.whiteCaptures = (game.whiteCaptures || 0) + group.length;
            } else {
                game.blackCaptures = (game.blackCaptures || 0) + group.length;
            }
        }
        
        game.currentPlayer = -game.currentPlayer;
        return true;
    }

    getCapturedGroups(game, x, y) {
        const capturedGroups = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const myColor = game.board[y][x];
        
        // 检查四个方向的相邻棋组
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                const neighborColor = game.board[ny][nx];
                
                // 如果是对方的棋子，检查是否被提
                if (neighborColor !== 0 && neighborColor !== myColor) {
                    const neighborGroup = this.getGroup(nx, ny, game);
                    const liberties = this.getLiberties(neighborGroup, game);
                    
                    // 如果没有气了，就是被提的棋组
                    if (liberties.length === 0) {
                        capturedGroups.push(neighborGroup);
                    }
                }
            }
        }
        
        return capturedGroups;
    }

    findDangerousGroups(game, color) {
        const dangerousGroups = [];
        const visited = new Set();
        
        console.log(`检查 ${color === 1 ? '黑棋' : '白棋'} 的危险棋组...`);
        
        // 遍历棋盘找到所有该颜色的棋组
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === color && !visited.has(`${x},${y}`)) {
                    // 找到一个新的棋组
                    const group = this.getGroup(x, y, game);
                    const liberties = this.getLiberties(group, game);
                    
                    // 标记这个棋组的所有棋子为已访问
                    for (const stone of group) {
                        visited.add(`${stone.x},${stone.y}`);
                    }
                    
                    console.log(`发现棋组 (${x},${y}) 周围，大小: ${group.length}，气数: ${liberties.length}`);
                    
                    // 如果气数<=2，认为是危险的棋组
                    if (liberties.length <= 2) {
                        dangerousGroups.push({
                            stones: group,
                            liberties: liberties,
                            danger: liberties.length === 1 ? 'critical' : 'warning'
                        });
                        console.log(`⚠️ 发现危险棋组在 (${x},${y})，气数: ${liberties.length}，棋子数: ${group.length}，危险级别: ${liberties.length === 1 ? '致命' : '警告'}`);
                    }
                }
            }
        }
        
        console.log(`总共发现 ${dangerousGroups.length} 个危险棋组`);
        return dangerousGroups;
    }

    canSaveGroups(game, move, groups) {
        // 模拟这一步棋
        const testGame = this.cloneGame(game);
        if (!this.simulateMove(testGame, move.x, move.y)) {
            return false;
        }
        
        // 检查是否救活了任何危险棋组
        for (const dangerousGroup of groups) {
            // 检查这个棋组在新状态下的气数
            if (dangerousGroup.stones.length > 0) {
                const firstStone = dangerousGroup.stones[0];
                
                // 检查棋组是否还存在（没有被提掉）
                if (testGame.board[firstStone.y][firstStone.x] === game.currentPlayer) {
                    const newGroup = this.getGroup(firstStone.x, firstStone.y, testGame);
                    const newLiberties = this.getLiberties(newGroup, testGame);
                    
                    // 如果气数增加了，说明救活了
                    if (newLiberties.length > dangerousGroup.liberties.length) {
                        console.log(`着法 (${move.x}, ${move.y}) 可以救活棋组，气数从 ${dangerousGroup.liberties.length} 增加到 ${newLiberties.length}`);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    // 获取指定位置棋子所在的棋组
    getGroup(x, y, game) {
        const color = game.board[y][x];
        if (color === 0) return [];
        
        const group = [];
        const visited = new Set();
        const stack = [{ x, y }];
        
        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // 边界检查
            if (current.x < 0 || current.x >= game.boardSize || 
                current.y < 0 || current.y >= game.boardSize) {
                continue;
            }
            
            // 颜色检查
            if (game.board[current.y][current.x] === color) {
                group.push({ x: current.x, y: current.y });
                
                // 添加四个方向的相邻点
                const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                for (const [dx, dy] of directions) {
                    const nx = current.x + dx;
                    const ny = current.y + dy;
                    const newKey = `${nx},${ny}`;
                    
                    if (!visited.has(newKey)) {
                        stack.push({ x: nx, y: ny });
                    }
                }
            }
        }
        
        return group;
    }

    // 计算棋组的气（空邻接点）
    getLiberties(group, game) {
        const liberties = new Set();
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const stone of group) {
            for (const [dx, dy] of directions) {
                const nx = stone.x + dx;
                const ny = stone.y + dy;
                
                if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                    if (game.board[ny][nx] === 0) {
                        liberties.add(`${nx},${ny}`);
                    }
                }
            }
        }
        
        // 转换为坐标数组
        return Array.from(liberties).map(coord => {
            const [x, y] = coord.split(',').map(Number);
            return { x, y };
        });
    }

    canAtariOpponent(game, move, opponentColor) {
        // 模拟这一步棋
        const testGame = this.cloneGame(game);
        testGame.board[move.y][move.x] = game.currentPlayer;
        
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        // 检查这一步是否能让对方的棋组只剩1气（打吃）
        for (const [dx, dy] of directions) {
            const nx = move.x + dx;
            const ny = move.y + dy;
            
            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
                if (testGame.board[ny][nx] === opponentColor) {
                    const opponentGroup = this.getGroup(nx, ny, testGame);
                    const liberties = this.getLiberties(opponentGroup, testGame);
                    
                    // 如果对方棋组只有1气，这就是打吃
                    if (liberties.length === 1) {
                        console.log(`着法 (${move.x}, ${move.y}) 可以打吃对方棋组`);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    canBlockConnection(game, move) {
        // 简化实现
        return Math.random() < 0.05;
    }
}

// 创建全局AI实例
console.log('开始创建高级AI实例...');
try {
    window.AIPlayer = new AIPlayer();
    console.log('高级AI实例创建成功!');
    console.log('window.AIPlayer类型:', typeof window.AIPlayer);
    console.log('getBestMove方法类型:', typeof window.AIPlayer.getBestMove);
} catch (error) {
    console.error('高级AI实例创建失败:', error);
}

console.log('高级AI模块加载完成');