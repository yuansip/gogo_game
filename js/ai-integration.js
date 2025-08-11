// 开源围棋AI集成模块
// 支持多种AI引擎：KataGo, Leela Zero, GNU Go等

class OpenSourceAIIntegration {
    constructor() {
        this.availableEngines = [];
        this.currentEngine = null;
        this.isLocalEngineAvailable = false;
        
        // 异步检查可用引擎
        this.checkAvailableEngines().catch(console.error);
    }

    async checkAvailableEngines() {
        console.log('检查可用的AI引擎...');
        
        // 检查是否有本地KataGo
        if (await this.checkKataGoAvailability()) {
            this.availableEngines.push('katago');
        }
        
        // 检查在线AI服务
        if (await this.checkOnlineAIServices()) {
            this.availableEngines.push('online');
        }
        
        console.log('可用AI引擎:', this.availableEngines);
    }

    async checkKataGoAvailability() {
        // 检查是否可以使用本地KataGo
        // 使用统一服务器，无CORS问题
        try {
            console.log('检查KataGo连接状态...');
            
            // 创建超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('/api/katago/status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('KataGo状态检查响应:', response.status);
            const isAvailable = response.ok;
            
            // 更新可用引擎列表
            if (isAvailable && !this.availableEngines.includes('katago')) {
                this.availableEngines.push('katago');
                console.log('KataGo已添加到可用引擎列表');
            } else if (!isAvailable && this.availableEngines.includes('katago')) {
                this.availableEngines = this.availableEngines.filter(e => e !== 'katago');
                console.log('KataGo已从可用引擎列表移除');
            }
            
            return isAvailable;
        } catch (error) {
            console.log('KataGo不可用:', error.message);
            // 从可用引擎列表移除KataGo
            if (this.availableEngines.includes('katago')) {
                this.availableEngines = this.availableEngines.filter(e => e !== 'katago');
                console.log('KataGo已从可用引擎列表移除');
            }
            return false;
        }
    }

    async checkOnlineAIServices() {
        // 检查在线AI服务的可用性
        const services = [
            'https://go-ai-api.example.com',  // 示例API
            'https://katago-online.herokuapp.com'  // 示例在线服务
        ];
        
        for (const service of services) {
            try {
                const response = await fetch(`${service}/health`, {
                    method: 'GET',
                    timeout: 5000
                });
                if (response.ok) {
                    return true;
                }
            } catch (error) {
                console.log(`在线服务 ${service} 不可用`);
            }
        }
        return false;
    }

    async getBestMove(gameState) {
        // 根据引擎类型尝试不同的AI
        if (gameState.currentAIEngine === 'katago' && this.availableEngines.includes('katago')) {
            return await this.getKataGoMove(gameState);
        } else if (gameState.currentAIEngine === 'online' && this.availableEngines.includes('online')) {
            return await this.getOnlineAIMove(gameState);
        } else {
            // 回退到内置AI
            console.log('使用内置AI引擎');
            const move = window.AIPlayer.getBestMove(gameState);
            if (move) {
                move.source = 'local';
            }
            return move;
        }
    }

    async getKataGoMove(gameState) {
        try {
            const sgfData = this.convertToSGF(gameState);
            const difficulty = this.getDifficultySettings();
            console.log('请求KataGo分析，SGF数据:', sgfData, '难度设置:', difficulty);
            
            const response = await fetch('/api/katago/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sgf: sgfData,
                    moves: this.getMoveSequence(gameState),
                    komi: 6.5,
                    rules: 'chinese',
                    analyzeDepth: difficulty.analyzeDepth,
                    maxVisits: difficulty.maxVisits,
                    playoutDoublingAdvantage: difficulty.playoutDoublingAdvantage,
                    boardSize: gameState.boardSize,
                    includePolicy: difficulty.includePolicy,
                    includeOwnership: difficulty.includeOwnership
                })
            });

            console.log('KataGo分析响应状态:', response.status);

            if (!response.ok) {
                throw new Error(`KataGo API请求失败: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('KataGo分析结果:', result);
            return this.parseKataGoResult(result, gameState.boardSize);
            
        } catch (error) {
            console.error('KataGo分析失败:', error);
            console.log('回退到本地AI');
            const move = window.AIPlayer.getBestMove(gameState);
            if (move) {
                move.source = 'local'; // 标记为本地AI着法
            }
            return move;
        }
    }

    async getOnlineAIMove(gameState) {
        try {
            const boardData = this.convertToBoardArray(gameState);
            
            const response = await fetch('https://go-ai-api.example.com/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    board: boardData,
                    toMove: gameState.currentPlayer === 1 ? 'B' : 'W',
                    komi: 6.5,
                    level: this.getDifficultyLevel()
                })
            });

            if (!response.ok) {
                throw new Error('在线AI服务请求失败');
            }

            const result = await response.json();
            return this.parseOnlineAIResult(result);
            
        } catch (error) {
            console.error('在线AI分析失败:', error);
            return window.AIPlayer.getBestMove(gameState);
        }
    }

    convertToSGF(gameState) {
        // 将游戏状态转换为SGF格式
        let sgf = '(;GM[1]FF[4]SZ[' + gameState.boardSize + ']KM[6.5]';
        
        const moves = this.getMoveSequence(gameState);
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const color = (i % 2 === 0) ? 'B' : 'W';
            const coords = this.coordinateToSGF(move.x, move.y);
            sgf += ';' + color + '[' + coords + ']';
        }
        
        sgf += ')';
        return sgf;
    }

    getMoveSequence(gameState) {
        // 从游戏历史中提取着法序列
        return gameState.moveHistory
            .filter(move => !move.pass && move.x !== undefined && move.y !== undefined)
            .map(move => ({ x: move.x, y: move.y }));
    }

    coordinateToSGF(x, y) {
        // 将坐标转换为SGF格式
        const letters = 'abcdefghijklmnopqrs';
        return letters[x] + letters[y];
    }

    convertToBoardArray(gameState) {
        // 将棋盘状态转换为数组格式
        return gameState.board.map(row => 
            row.map(cell => {
                if (cell === 1) return 'B';
                if (cell === -1) return 'W';
                return '.';
            })
        );
    }

    parseKataGoResult(result, boardSize = 19) {
        // 解析KataGo返回的结果
        if (result.moveInfos && result.moveInfos.length > 0) {
            const bestMove = result.moveInfos[0];
            console.log('解析KataGo结果, 原始着法:', bestMove.move, '棋盘大小:', boardSize);
            
            const coords = this.sgfToCoordinate(bestMove.move, boardSize);
            if (!coords) {
                console.error('无法解析KataGo着法坐标:', bestMove.move);
                return null;
            }
            
            console.log('KataGo着法解析结果:', coords);
            return {
                x: coords.x,
                y: coords.y,
                confidence: bestMove.visits || 1000,
                winRate: bestMove.winrate || 0.5,
                source: 'katago'
            };
        }
        
        console.warn('KataGo未返回有效着法信息');
        return null;
    }

    parseOnlineAIResult(result) {
        // 解析在线AI服务的结果
        if (result.move && result.move !== 'pass') {
            return {
                x: result.move.x,
                y: result.move.y,
                confidence: result.confidence || 0.5,
                source: 'online'
            };
        }
        return null;
    }

    sgfToCoordinate(moveStr, boardSize = 19) {
        // 处理KataGo返回的GTP格式坐标（如Q16）和SGF格式坐标（如qq）
        if (!moveStr || moveStr.toLowerCase() === 'pass') {
            return null;
        }
        
        // 如果是GTP格式（大写字母+数字，如Q16）
        if (/^[A-Z]\d+$/.test(moveStr)) {
            return this.gtpToCoordinate(moveStr, boardSize);
        }
        
        // 如果是SGF格式（两个小写字母，如qq）
        if (moveStr.length === 2 && /^[a-z]{2}$/.test(moveStr)) {
            const letters = 'abcdefghijklmnopqrs';
            const x = letters.indexOf(moveStr[0]);
            const y = letters.indexOf(moveStr[1]);
            
            // 验证坐标是否在棋盘范围内
            if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                return { x, y };
            } else {
                console.warn('SGF坐标超出棋盘范围:', moveStr, '棋盘大小:', boardSize);
                return null;
            }
        }
        
        console.warn('无法识别的坐标格式:', moveStr);
        return null;
    }

    gtpToCoordinate(gtpMove, boardSize = 19) {
        // 将GTP坐标（如Q16）转换为数组坐标
        if (!gtpMove || gtpMove.length < 2) {
            return null;
        }
        
        // GTP坐标：A-T（跳过I），1-boardSize
        const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'; // 跳过I
        const colChar = gtpMove[0].toUpperCase();
        const rowStr = gtpMove.slice(1);
        
        try {
            const x = letters.indexOf(colChar);
            const row = parseInt(rowStr);
            
            if (x === -1 || isNaN(row) || row < 1 || row > boardSize) {
                console.warn('无效的GTP坐标:', gtpMove, '棋盘大小:', boardSize);
                return null;
            }
            
            // GTP的1对应棋盘底部，boardSize对应顶部
            // 我们的数组坐标系：y=0是顶部，y=boardSize-1是底部
            const y = boardSize - row;
            
            console.log(`GTP坐标 ${gtpMove} 转换为数组坐标 (${x}, ${y}) [棋盘${boardSize}x${boardSize}]`);
            return { x, y };
        } catch (error) {
            console.error('GTP坐标转换错误:', gtpMove, error);
            return null;
        }
    }

    getDifficultyLevel() {
        // 根据AI难度设置返回相应的级别（保留用于在线AI兼容性）
        const difficulty = window.AIPlayer?.difficulty || 'medium';
        switch (difficulty) {
            case 'easy': return 1;
            case 'medium': return 5;
            case 'hard': return 9;
            default: return 5;
        }
    }

    getDifficultySettings() {
        // 根据AI难度设置返回KataGo专用的详细参数
        // 优先从UI控制器获取难度设置
        let difficulty = 'medium';
        
        // 尝试从多个来源获取难度设置
        if (window.UIController && window.UIController.instance) {
            const aiDifficultySelect = document.getElementById('ai-difficulty');
            if (aiDifficultySelect) {
                difficulty = aiDifficultySelect.value;
            }
        }
        
        // 备用方案：从AI实例获取
        if (!difficulty || difficulty === 'medium') {
            difficulty = window.AIPlayer?.difficulty || 'medium';
        }
        
        console.log('获取AI难度设置:', difficulty);
        
        switch (difficulty) {
            case 'easy':
                return {
                    analyzeDepth: 5,           // 较浅的分析深度
                    maxVisits: 100,            // 较少的访问次数
                    playoutDoublingAdvantage: 0.1, // 降低计算优势
                    includePolicy: false,       // 不包含策略网络信息
                    includeOwnership: false     // 不包含所有权分析
                };
            case 'medium':
                return {
                    analyzeDepth: 10,          // 中等分析深度
                    maxVisits: 400,            // 中等访问次数
                    playoutDoublingAdvantage: 0.0, // 标准计算
                    includePolicy: true,        // 包含策略网络信息
                    includeOwnership: false     // 不包含所有权分析
                };
            case 'hard':
                return {
                    analyzeDepth: 20,          // 深度分析
                    maxVisits: 1600,           // 大量访问次数
                    playoutDoublingAdvantage: 0.0, // 标准计算
                    includePolicy: true,        // 包含策略网络信息
                    includeOwnership: true      // 包含所有权分析
                };
            default:
                return this.getDifficultySettings('medium');
        }
    }

    async analyzePosition(gameState) {
        // 分析当前局面，返回胜率和目数评估
        console.log('开始局势分析...');
        console.log('游戏状态:', {
            currentAIEngine: gameState.currentAIEngine,
            availableEngines: this.availableEngines,
            boardSize: gameState.boardSize,
            moveCount: gameState.moveHistory ? gameState.moveHistory.length : 0
        });
        
        // 总是优先尝试使用KataGo进行局势分析，无论当前游戏模式如何
        console.log('优先尝试KataGo分析...');
        
        // 先检查KataGo是否可用
        const katagoAvailable = await this.checkKataGoAvailability();
        if (katagoAvailable) {
            console.log('KataGo可用，使用KataGo分析...');
            try {
                const katagoResult = await this.getKataGoAnalysis(gameState);
                if (katagoResult) {
                    console.log('KataGo分析成功');
                    return katagoResult;
                }
            } catch (error) {
                console.log('KataGo分析失败，回退到本地分析:', error.message);
            }
        } else {
            console.log('KataGo不可用，直接使用本地分析');
        }
        
        console.log('使用本地分析...');
        return this.getLocalAnalysis(gameState);
    }

    async getKataGoAnalysis(gameState) {
        try {
            const sgfData = this.convertToSGF(gameState);
            const difficulty = this.getDifficultySettings();
            console.log('请求KataGo局势分析...');
            
            const response = await fetch('/api/katago/analyze-position', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sgf: sgfData,
                    moves: this.getMoveSequence(gameState),
                    komi: 6.5,
                    rules: 'chinese',
                    analyzeDepth: difficulty.analyzeDepth,
                    maxVisits: difficulty.maxVisits,
                    boardSize: gameState.boardSize,
                    includeOwnership: true,
                    includePolicy: true
                })
            });

            if (!response.ok) {
                throw new Error(`KataGo分析请求失败: ${response.status}`);
            }

            const result = await response.json();
            console.log('KataGo局势分析结果:', result);
            return this.parseKataGoAnalysis(result);
            
        } catch (error) {
            console.error('KataGo局势分析失败:', error);
            return this.getLocalAnalysis(gameState);
        }
    }

    parseKataGoAnalysis(result) {
        // 解析KataGo的分析结果
        console.log('解析KataGo分析结果，原始数据:', JSON.stringify(result, null, 2));
        
        // 尝试多种可能的数据格式
        let blackWinRate, scoreLead, visits;
        
        if (result.rootInfo && result.rootInfo.winrate !== undefined) {
            // 标准KataGo格式
            blackWinRate = result.rootInfo.winrate;
            scoreLead = result.rootInfo.scoreLead || 0;
            visits = result.rootInfo.visits || 0;
            console.log('使用rootInfo格式');
        } else if (result.moveInfos && result.moveInfos.length > 0) {
            // 从moveInfos获取信息
            const moveInfo = result.moveInfos[0];
            blackWinRate = moveInfo.winrate;
            scoreLead = moveInfo.scoreLead || 0;
            visits = moveInfo.visits || 0;
            console.log('使用moveInfos格式');
        } else if (result.winrate !== undefined) {
            // 直接格式
            blackWinRate = result.winrate;
            scoreLead = result.scoreLead || 0;
            visits = result.visits || 0;
            console.log('使用直接格式');
        } else {
            console.error('无法解析KataGo结果，未识别的格式');
            return null;
        }
        
        console.log('解析出的数据:', {
            blackWinRate,
            scoreLead,
            visits
        });
        
        // 确保胜率在合理范围内
        if (blackWinRate === undefined || isNaN(blackWinRate)) {
            console.error('胜率数据无效:', blackWinRate);
            return null;
        }
        
        const whiteWinRate = 1 - blackWinRate;
        
        return {
            blackWinRate: blackWinRate,
            whiteWinRate: whiteWinRate,
            scoreLead: scoreLead,
            blackScore: scoreLead > 0 ? Math.abs(scoreLead) : 0,
            whiteScore: scoreLead < 0 ? Math.abs(scoreLead) : 0,
            confidence: visits,
            analysis: this.generateAnalysisText(blackWinRate, scoreLead),
            source: 'katago'
        };
    }

    getLocalAnalysis(gameState) {
        // 简单的本地局势分析
        console.log('开始本地分析...');
        
        // 检查是否是空盘或极少棋子
        const totalStones = this.countTotalStones(gameState);
        console.log('棋盘上总棋子数:', totalStones);
        
        // 如果是空盘或棋子很少，返回基本平衡的结果
        if (totalStones < 3) {
            console.log('棋盘棋子太少，返回基本平衡结果');
            return {
                blackWinRate: 0.48, // 考虑贴目，黑棋略劣
                whiteWinRate: 0.52,
                scoreLead: -6.5, // 贴目
                blackScore: 0,
                whiteScore: 6.5,
                confidence: 50,
                analysis: this.generateAnalysisText(0.48, -6.5),
                source: 'local'
            };
        }
        
        const blackTerritory = this.estimateLocalTerritory(gameState, 1);
        const whiteTerritory = this.estimateLocalTerritory(gameState, -1);
        const komi = 6.5;
        
        const blackCaptures = gameState.blackCaptures || 0;
        const whiteCaptures = gameState.whiteCaptures || 0;
        
        const blackScore = blackTerritory + blackCaptures;
        const whiteScore = whiteTerritory + whiteCaptures + komi;
        const scoreDiff = blackScore - whiteScore;
        
        console.log('本地分析结果:', {
            blackTerritory,
            whiteTerritory,
            blackCaptures,
            whiteCaptures,
            blackScore,
            whiteScore,
            scoreDiff
        });
        
        // 改进的胜率估算
        let blackWinRate;
        if (Math.abs(scoreDiff) < 1) {
            blackWinRate = 0.5; // 非常接近时
        } else {
            // 使用更合理的转换函数：每20目约50%胜率差
            blackWinRate = 0.5 + Math.tanh(scoreDiff / 20) * 0.4;
        }
        const clampedBlackWinRate = Math.max(0.05, Math.min(0.95, blackWinRate));
        
        console.log('胜率计算:', {
            原始胜率: blackWinRate,
            限制后胜率: clampedBlackWinRate
        });
        
        return {
            blackWinRate: clampedBlackWinRate,
            whiteWinRate: 1 - clampedBlackWinRate,
            scoreLead: scoreDiff,
            blackScore: blackScore,
            whiteScore: whiteScore,
            confidence: Math.min(200, totalStones * 10), // 基于棋子数的置信度
            analysis: this.generateAnalysisText(clampedBlackWinRate, scoreDiff),
            source: 'local'
        };
    }

    countTotalStones(gameState) {
        let count = 0;
        for (let y = 0; y < gameState.boardSize; y++) {
            for (let x = 0; x < gameState.boardSize; x++) {
                if (gameState.board[y][x] !== 0) {
                    count++;
                }
            }
        }
        return count;
    }

    estimateLocalTerritory(gameState, player) {
        // 简化的领地估算（复用游戏中的逻辑）
        let territory = 0;
        const influence = this.calculateInfluence(gameState);

        console.log(`计算${player === 1 ? '黑棋' : '白棋'}领地...`);
        
        for (let y = 0; y < gameState.boardSize; y++) {
            for (let x = 0; x < gameState.boardSize; x++) {
                if (gameState.board[y][x] === 0) {
                    const influenceValue = influence[y][x];
                    if (player === 1 && influenceValue > 0.5) { // 提高阈值
                        territory++;
                    } else if (player === -1 && influenceValue < -0.5) { // 提高阈值
                        territory++;
                    }
                }
            }
        }

        console.log(`${player === 1 ? '黑棋' : '白棋'}估算领地: ${territory}`);
        return territory;
    }

    calculateInfluence(gameState) {
        // 简单的影响力计算
        const influence = Array(gameState.boardSize).fill().map(() => Array(gameState.boardSize).fill(0));

        for (let y = 0; y < gameState.boardSize; y++) {
            for (let x = 0; x < gameState.boardSize; x++) {
                if (gameState.board[y][x] !== 0) {
                    const color = gameState.board[y][x];
                    
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < gameState.boardSize && ny >= 0 && ny < gameState.boardSize) {
                                const distance = Math.abs(dx) + Math.abs(dy);
                                const influenceValue = Math.max(0, 3 - distance) * color;
                                influence[ny][nx] += influenceValue;
                            }
                        }
                    }
                }
            }
        }

        return influence;
    }

    generateAnalysisText(blackWinRate, scoreLead) {
        // 生成易读的分析文本
        const blackWinPercent = (blackWinRate * 100).toFixed(1);
        const whiteWinPercent = ((1 - blackWinRate) * 100).toFixed(1);
        
        let leader, advantage;
        if (scoreLead > 2) {
            leader = '黑棋';
            advantage = `领先约${scoreLead.toFixed(1)}目`;
        } else if (scoreLead < -2) {
            leader = '白棋';
            advantage = `领先约${Math.abs(scoreLead).toFixed(1)}目`;
        } else if (Math.abs(scoreLead) > 0.5) {
            leader = scoreLead > 0 ? '黑棋' : '白棋';
            advantage = `微弱优势（${Math.abs(scoreLead).toFixed(1)}目）`;
        } else {
            leader = '局势';
            advantage = '完全平衡';
        }
        
        // 根据胜率添加更详细的描述
        let confidence = '';
        if (blackWinRate > 0.8) {
            confidence = '黑棋大优';
        } else if (blackWinRate > 0.65) {
            confidence = '黑棋有利';
        } else if (blackWinRate > 0.55) {
            confidence = '黑棋略优';
        } else if (blackWinRate < 0.2) {
            confidence = '白棋大优';
        } else if (blackWinRate < 0.35) {
            confidence = '白棋有利';
        } else if (blackWinRate < 0.45) {
            confidence = '白棋略优';
        } else {
            confidence = '势均力敌';
        }
        
        return {
            summary: `${leader}${advantage} (${confidence})`,
            details: `黑棋胜率: ${blackWinPercent}%, 白棋胜率: ${whiteWinPercent}%`
        };
    }
}

// 创建AI集成实例
window.OpenSourceAI = new OpenSourceAIIntegration();

// 增强原有的AI，但保持同步调用
class EnhancedAIPlayer {
    constructor() {
        // 保存原有的AIPlayer实例
        this.originalAI = window.AIPlayer;
        this.difficulty = 'medium';
    }

    setDifficulty(level) {
        this.difficulty = level;
        if (this.originalAI && this.originalAI.setDifficulty) {
            this.originalAI.setDifficulty(level);
        }
    }

    getBestMove(game) {
        console.log('AI开始计算最佳着法...');
        
        // 目前先使用内置AI，确保功能正常
        if (this.originalAI && this.originalAI.getBestMove) {
            const move = this.originalAI.getBestMove(game);
            console.log('AI计算完成，着法:', move);
            return move;
        } else {
            console.error('原有AI不可用，使用备用逻辑');
            return this.getBackupMove(game);
        }
    }

    getBackupMove(game) {
        // 备用的简单AI逻辑
        const validMoves = [];
        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.isValidMove(x, y)) {
                    validMoves.push({ x, y });
                }
            }
        }
        
        if (validMoves.length > 0) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        return null;
    }

    // 异步版本（未来扩展用）
    async getBestMoveAsync(game) {
        try {
            const enhancedMove = await window.OpenSourceAI.getBestMove(game);
            if (enhancedMove) {
                console.log('开源AI推荐着法:', enhancedMove);
                return enhancedMove;
            }
        } catch (error) {
            console.log('开源AI不可用，使用内置AI');
        }
        
        return this.getBestMove(game);
    }
}

// 暂时禁用AI集成，确保原有AI正常工作
console.log('AI集成模块已加载，但暂时不替换原有AI');

// 等DOM加载完成后检查AI状态
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.AIPlayer) {
            console.log('原有AI模块已正常加载:', typeof window.AIPlayer);
            console.log('AI方法可用:', typeof window.AIPlayer.getBestMove);
        } else {
            console.error('AI模块未加载');
        }
    }, 500);
});