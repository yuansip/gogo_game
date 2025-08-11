// 围棋游戏核心逻辑

class GoGame {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 19;
        this.cellSize = 0;
        this.board = [];
        this.currentPlayer = 1; // 1=黑棋, -1=白棋
        this.gameMode = 'pvp'; // pvp, ai
        this.currentAIEngine = 'local'; // local, katago, online
        this.blackCaptures = 0;
        this.whiteCaptures = 0;
        this.moveHistory = [];
        this.koPosition = null; // 劫争位置
        this.gameEnded = false;
        this.passCount = 0;
        this.aiMoving = false; // AI是否正在思考中
        
        this.initializeBoard();
        this.setupEventListeners();
        this.drawBoard();
    }

    initializeBoard() {
        // 初始化空棋盘
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.calculateCellSize();
    }

    calculateCellSize() {
        const canvasSize = Math.min(this.canvas.width, this.canvas.height);
        const boardMargin = 40;
        this.cellSize = (canvasSize - boardMargin * 2) / (this.boardSize - 1);
        this.boardMargin = boardMargin;
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // 游戏控制按钮
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('pass-btn').addEventListener('click', () => this.pass());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        
        // 棋盘大小选择
        document.getElementById('board-size').addEventListener('change', (e) => {
            this.changeBoardSize(parseInt(e.target.value));
        });
    }

    drawBoard() {
        // 验证棋盘状态一致性
        this.validateBoardState();
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制木纹背景
        this.drawWoodBackground();
        
        // 绘制网格线
        this.drawGrid();
        
        // 绘制星位
        this.drawStarPoints();
        
        // 绘制坐标
        this.drawCoordinates();
        
        // 在双人对战模式下绘制领地估算
        if (this.gameMode === 'pvp' && this.moveHistory.length > 0) {
            this.drawTerritoryEstimate();
        }
        
        // 绘制棋子
        this.drawStones();
        
        // 绘制最后一手标记
        this.drawLastMoveMarker();
    }
    
    validateBoardState() {
        // 检查棋盘状态一致性
        let blackCount = 0;
        let whiteCount = 0;
        
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const value = this.board[y][x];
                if (value === 1) blackCount++;
                else if (value === -1) whiteCount++;
                else if (value !== 0) {
                    console.error(`棋盘状态异常: (${x}, ${y}) 值为 ${value}, 应该为 -1, 0, 或 1`);
                }
            }
        }
        
        const expectedMoves = this.moveHistory.filter(move => !move.pass).length;
        const actualStones = blackCount + whiteCount;
        const capturedStones = this.blackCaptures + this.whiteCaptures;
        
        if (expectedMoves !== actualStones + capturedStones) {
            console.warn(`棋盘计数不一致: 预期${expectedMoves}手棋, 实际${actualStones}子 + ${capturedStones}提子 = ${actualStones + capturedStones}`);
            console.log(`黑棋: ${blackCount}子, 白棋: ${whiteCount}子`);
            console.log(`黑棋提子: ${this.blackCaptures}, 白棋提子: ${this.whiteCaptures}`);
        }
    }

    drawWoodBackground() {
        // 创建木纹渐变
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#d4a574');
        gradient.addColorStop(0.5, '#c9956a');
        gradient.addColorStop(1, '#d4a574');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 添加木纹纹理
        this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < 20; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * 30);
            this.ctx.lineTo(this.canvas.width, i * 30 + Math.sin(i) * 10);
            this.ctx.stroke();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        
        // 绘制垂直线
        for (let i = 0; i < this.boardSize; i++) {
            const x = this.boardMargin + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.boardMargin);
            this.ctx.lineTo(x, this.boardMargin + (this.boardSize - 1) * this.cellSize);
            this.ctx.stroke();
        }
        
        // 绘制水平线
        for (let i = 0; i < this.boardSize; i++) {
            const y = this.boardMargin + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.boardMargin, y);
            this.ctx.lineTo(this.boardMargin + (this.boardSize - 1) * this.cellSize, y);
            this.ctx.stroke();
        }
    }

    drawStarPoints() {
        if (this.boardSize === 19) {
            const starPoints = [
                [3, 3], [3, 9], [3, 15],
                [9, 3], [9, 9], [9, 15],
                [15, 3], [15, 9], [15, 15]
            ];
            this.drawStarPointsAt(starPoints);
        } else if (this.boardSize === 13) {
            const starPoints = [
                [3, 3], [3, 9], [6, 6], [9, 3], [9, 9]
            ];
            this.drawStarPointsAt(starPoints);
        } else if (this.boardSize === 9) {
            const starPoints = [
                [2, 2], [2, 6], [4, 4], [6, 2], [6, 6]
            ];
            this.drawStarPointsAt(starPoints);
        }
    }

    drawStarPointsAt(points) {
        this.ctx.fillStyle = '#000';
        points.forEach(([x, y]) => {
            const canvasX = this.boardMargin + x * this.cellSize;
            const canvasY = this.boardMargin + y * this.cellSize;
            this.ctx.beginPath();
            this.ctx.arc(canvasX, canvasY, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    drawCoordinates() {
        this.ctx.fillStyle = '#8b4513';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        // 绘制列标签 (A-S，跳过I)
        for (let i = 0; i < this.boardSize; i++) {
            let letter = String.fromCharCode(65 + i);
            if (i >= 8) letter = String.fromCharCode(66 + i); // 跳过I
            
            const x = this.boardMargin + i * this.cellSize;
            this.ctx.fillText(letter, x, this.boardMargin - 10);
            this.ctx.fillText(letter, x, this.boardMargin + (this.boardSize - 1) * this.cellSize + 20);
        }
        
        // 绘制行标签 (1-19)
        this.ctx.textAlign = 'right';
        for (let i = 0; i < this.boardSize; i++) {
            const y = this.boardMargin + i * this.cellSize + 4;
            const number = this.boardSize - i;
            this.ctx.fillText(number.toString(), this.boardMargin - 10, y);
            this.ctx.fillText(number.toString(), this.boardMargin + (this.boardSize - 1) * this.cellSize + 25, y);
        }
    }

    drawStones() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawStone(col, row, this.board[row][col]);
                }
            }
        }
    }

    drawStone(x, y, player) {
        const canvasX = this.boardMargin + x * this.cellSize;
        const canvasY = this.boardMargin + y * this.cellSize;
        const radius = this.cellSize * 0.4;
        
        // 绘制阴影
        this.ctx.beginPath();
        this.ctx.arc(canvasX + 2, canvasY + 2, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();
        
        // 绘制棋子
        this.ctx.beginPath();
        this.ctx.arc(canvasX, canvasY, radius, 0, 2 * Math.PI);
        
        if (player === 1) { // 黑棋
            const gradient = this.ctx.createRadialGradient(
                canvasX - radius * 0.3, canvasY - radius * 0.3, 0,
                canvasX, canvasY, radius
            );
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
            this.ctx.fillStyle = gradient;
        } else { // 白棋
            const gradient = this.ctx.createRadialGradient(
                canvasX - radius * 0.3, canvasY - radius * 0.3, 0,
                canvasX, canvasY, radius
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            this.ctx.fillStyle = gradient;
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawTerritoryEstimate() {
        const influence = this.calculateInfluence();
        const threshold = 1.5; // 影响力阈值，超过此值才显示领地标记
        
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                // 只在空点显示领地标记
                if (this.board[y][x] === 0) {
                    const influenceValue = influence[y][x];
                    
                    if (Math.abs(influenceValue) >= threshold) {
                        const canvasX = this.boardMargin + x * this.cellSize;
                        const canvasY = this.boardMargin + y * this.cellSize;
                        
                        if (influenceValue > 0) {
                            // 黑棋领地 - 蓝色圆点
                            this.drawTerritoryMarker(canvasX, canvasY, 'black');
                        } else {
                            // 白棋领地 - 红色圆点
                            this.drawTerritoryMarker(canvasX, canvasY, 'white');
                        }
                    }
                }
            }
        }
    }

    drawTerritoryMarker(x, y, territory) {
        this.ctx.save();
        
        if (territory === 'black') {
            // 黑棋领地 - 蓝色方形
            this.ctx.fillStyle = '#3498db';
            this.ctx.globalAlpha = 0.7;
            const size = this.cellSize * 0.2;
            this.ctx.fillRect(x - size/2, y - size/2, size, size);
            
            // 深蓝色边框
            this.ctx.strokeStyle = '#2980b9';
            this.ctx.lineWidth = 1.5;
            this.ctx.globalAlpha = 1.0;
            this.ctx.strokeRect(x - size/2, y - size/2, size, size);
        } else {
            // 白棋领地 - 紫色菱形
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.globalAlpha = 0.8;
            const size = this.cellSize * 0.15;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - size);     // 上
            this.ctx.lineTo(x + size, y);     // 右
            this.ctx.lineTo(x, y + size);     // 下  
            this.ctx.lineTo(x - size, y);     // 左
            this.ctx.closePath();
            this.ctx.fill();
            
            // 深紫色边框
            this.ctx.strokeStyle = '#8e44ad';
            this.ctx.lineWidth = 1.5;
            this.ctx.globalAlpha = 1.0;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawLastMoveMarker() {
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            if (lastMove && lastMove.x !== undefined && lastMove.y !== undefined) {
                const canvasX = this.boardMargin + lastMove.x * this.cellSize;
                const canvasY = this.boardMargin + lastMove.y * this.cellSize;
                
                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(canvasX, canvasY, this.cellSize * 0.15, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        }
    }

    handleCanvasClick(e) {
        if (this.gameEnded) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const boardPos = this.canvasToBoard(x, y);
        if (boardPos) {
            console.log(`点击位置: (${boardPos.x}, ${boardPos.y}), 棋盘状态: ${this.board[boardPos.y][boardPos.x]}`);
            
            const moveResult = this.makeMove(boardPos.x, boardPos.y);
            if (!moveResult) {
                // 移动无效，给用户反馈 - 按照检查顺序给出具体原因
                console.log(`无效着法诊断: 位置(${boardPos.x}, ${boardPos.y})`);
                console.log(`- 棋盘值: ${this.board[boardPos.y][boardPos.x]}`);
                console.log(`- 劫争位置: ${this.koPosition ? `(${this.koPosition.x}, ${this.koPosition.y})` : 'null'}`);
                
                if (this.board[boardPos.y][boardPos.x] !== 0) {
                    console.log('错误原因: 位置已被占用');
                    this.showMoveError('该位置已有棋子');
                } else if (this.koPosition && this.koPosition.x === boardPos.x && this.koPosition.y === boardPos.y) {
                    console.log('错误原因: 劫争');
                    this.showMoveError('劫争：此位置暂时不能下子');
                } else if (this.isSuicideMove(boardPos.x, boardPos.y, this.currentPlayer)) {
                    console.log('错误原因: 自杀手');
                    this.showMoveError('禁入点：此位置不能下子（自杀手）');
                } else {
                    console.log('错误原因: 其他未知原因');
                    this.showMoveError('无效的着法');
                }
            } else {
                console.log(`成功下子: (${boardPos.x}, ${boardPos.y})`);
            }
        }
    }

    handleMouseMove(e) {
        // 鼠标悬停效果，可以在这里添加预览功能
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const boardPos = this.canvasToBoard(x, y);
        if (boardPos && this.isValidMove(boardPos.x, boardPos.y)) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    canvasToBoard(canvasX, canvasY) {
        const boardX = Math.round((canvasX - this.boardMargin) / this.cellSize);
        const boardY = Math.round((canvasY - this.boardMargin) / this.cellSize);
        
        if (boardX >= 0 && boardX < this.boardSize && boardY >= 0 && boardY < this.boardSize) {
            return { x: boardX, y: boardY };
        }
        return null;
    }

    makeMove(x, y) {
        if (!this.isValidMove(x, y)) {
            return false;
        }

        // 保存当前状态用于悔棋
        const moveData = {
            x: x,
            y: y,
            player: this.currentPlayer,
            board: this.board.map(row => [...row]),
            blackCaptures: this.blackCaptures,
            whiteCaptures: this.whiteCaptures,
            koPosition: this.koPosition
        };

        // 放置棋子
        this.board[y][x] = this.currentPlayer;
        
        // 检查并处理提子
        const capturedGroups = this.checkCaptures(x, y);
        
        // 更新提子计数
        if (capturedGroups.length > 0) {
            const capturedStones = capturedGroups.reduce((sum, group) => sum + group.length, 0);
            if (this.currentPlayer === 1) {
                this.whiteCaptures += capturedStones;
            } else {
                this.blackCaptures += capturedStones;
            }
        }

        // 检查劫争
        this.updateKoPosition(capturedGroups);

        // 记录这一手
        this.moveHistory.push(moveData);
        
        // 切换玩家
        this.currentPlayer = -this.currentPlayer;
        this.passCount = 0; // 重置连续停一手计数
        
        // 更新UI
        this.updateUI();
        this.drawBoard();
        
        // 如果是人机对战模式且轮到AI且AI没有在思考中
        if (this.gameMode === 'ai' && this.currentPlayer === -1 && !this.aiMoving) {
            // 同步UI控制器的AI引擎设置
            if (window.UIController && window.UIController.instance) {
                this.currentAIEngine = window.UIController.instance.currentAIEngine;
            }
            setTimeout(() => this.makeAIMove(), 500);
        }

        return true;
    }

    isValidMove(x, y) {
        // 检查位置是否在棋盘内
        if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) {
            console.log(`isValidMove: 位置超出棋盘范围: (${x}, ${y})`);
            return false;
        }
        
        // 检查位置是否已被占用
        const currentValue = this.board[y][x];
        if (currentValue !== 0) {
            console.log(`isValidMove: 位置已被占用: (${x}, ${y}), 当前值: ${currentValue}`);
            return false;
        }
        
        // 检查是否违反劫争规则
        if (this.koPosition && this.koPosition.x === x && this.koPosition.y === y) {
            console.log(`isValidMove: 劫争位置: (${x}, ${y})`);
            return false;
        }
        
        // 检查自杀规则 - 禁止下入没有气且不能提子的位置
        if (this.isSuicideMove(x, y, this.currentPlayer)) {
            console.log(`isValidMove: 自杀手检测: (${x}, ${y}) 为玩家 ${this.currentPlayer} 的自杀手`);
            return false;
        }
        
        console.log(`isValidMove: 位置有效: (${x}, ${y})`);
        return true;
    }

    checkCaptures(x, y) {
        const capturedGroups = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        directions.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                const neighborColor = this.board[ny][nx];
                if (neighborColor !== 0 && neighborColor !== this.currentPlayer) {
                    const group = this.getGroup(nx, ny);
                    if (this.hasNoLiberties(group)) {
                        capturedGroups.push(group);
                        // 移除被提的棋子
                        group.forEach(([gx, gy]) => {
                            this.board[gy][gx] = 0;
                        });
                    }
                }
            }
        });
        
        return capturedGroups;
    }

    getGroup(x, y) {
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
                
                // 添加相邻位置
                const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                directions.forEach(([dx, dy]) => {
                    stack.push([cx + dx, cy + dy]);
                });
            }
        }
        
        return group;
    }

    hasNoLiberties(group) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const position of group) {
            // 兼容两种格式：[x, y] 数组格式和 {x, y} 对象格式
            let x, y;
            if (Array.isArray(position)) {
                [x, y] = position;
            } else if (position && typeof position === 'object') {
                x = position.x;
                y = position.y;
            } else {
                console.error('无效的位置格式:', position);
                continue;
            }
            
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize && 
                    this.board[ny][nx] === 0) {
                    return false; // 找到气，没有被完全包围
                }
            }
        }
        
        return true; // 没有气
    }

    updateKoPosition(capturedGroups) {
        // 简化的劫争检查：如果只提了一个子，设置劫争位置
        if (capturedGroups.length === 1 && capturedGroups[0].length === 1) {
            this.koPosition = { x: capturedGroups[0][0][0], y: capturedGroups[0][0][1] };
        } else {
            this.koPosition = null;
        }
    }

    pass() {
        this.passCount++;
        this.currentPlayer = -this.currentPlayer;
        
        // 记录停一手
        this.moveHistory.push({
            pass: true,
            player: -this.currentPlayer,
            board: this.board.map(row => [...row]),
            blackCaptures: this.blackCaptures,
            whiteCaptures: this.whiteCaptures
        });
        
        if (this.passCount >= 2) {
            this.endGame();
        } else {
            this.updateUI();
            
            // 如果是人机对战模式且轮到AI且AI没有在思考中
            if (this.gameMode === 'ai' && this.currentPlayer === -1 && !this.aiMoving) {
                // 同步UI控制器的AI引擎设置
                if (window.UIController && window.UIController.instance) {
                    this.currentAIEngine = window.UIController.instance.currentAIEngine;
                }
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
    }

    undo() {
        if (this.moveHistory.length === 0) return;
        
        // 在人机对战模式下，需要撤销两步（AI的和玩家的）
        const stepsToUndo = (this.gameMode === 'ai') ? 2 : 1;
        
        for (let i = 0; i < stepsToUndo && this.moveHistory.length > 0; i++) {
            const lastMove = this.moveHistory.pop();
            this.board = lastMove.board;
            this.blackCaptures = lastMove.blackCaptures;
            this.whiteCaptures = lastMove.whiteCaptures;
            this.koPosition = lastMove.koPosition;
            this.currentPlayer = lastMove.player;
        }
        
        this.passCount = 0;
        this.gameEnded = false;
        this.updateUI();
        this.drawBoard();
    }

    newGame() {
        this.initializeBoard();
        this.currentPlayer = 1;
        this.blackCaptures = 0;
        this.whiteCaptures = 0;
        this.moveHistory = [];
        this.koPosition = null;
        this.gameEnded = false;
        this.passCount = 0;
        this.aiMoving = false; // 重置AI移动状态
        
        // 重置玩家信息显示
        this.resetPlayerDisplay();
        this.updateUI();
        this.drawBoard();
    }

    resetPlayerDisplay() {
        const blackDetails = document.querySelector('.black-player .player-details');
        const whiteDetails = document.querySelector('.white-player .player-details');
        
        if (blackDetails) {
            blackDetails.innerHTML = `
                <span class="player-name">黑棋</span>
                <span class="captures">提子: 0</span>
            `;
        }
        
        if (whiteDetails) {
            whiteDetails.innerHTML = `
                <span class="player-name">白棋</span>
                <span class="captures">提子: 0</span>
            `;
        }
    }

    changeBoardSize(size) {
        this.boardSize = size;
        this.newGame();
    }

    async makeAIMove() {
        console.log('开始AI回合, 当前玩家:', this.currentPlayer);
        console.log('游戏模式:', this.gameMode);
        console.log('当前AI引擎:', this.currentAIEngine);
        
        if (this.gameEnded) {
            console.log('游戏已结束，AI不下子');
            return;
        }
        
        // 防止重复调用
        if (this.aiMoving) {
            console.log('AI正在思考中，忽略重复调用');
            return;
        }
        
        this.aiMoving = true;
        document.getElementById('game-status').textContent = 'AI思考中...';
        
        let aiMove = null;
        
        try {
            // 根据选择的AI引擎获取着法
            if (this.currentAIEngine === 'katago' && window.OpenSourceAI) {
                console.log('尝试使用KataGo引擎...');
                aiMove = await window.OpenSourceAI.getBestMove(this);
                if (aiMove && aiMove.source === 'katago') {
                    console.log('KataGo返回着法:', aiMove);
                } else {
                    console.log('KataGo失败，回退到本地AI');
                    aiMove = null;
                }
            } else if (this.currentAIEngine === 'online' && window.OpenSourceAI) {
                console.log('尝试使用在线AI引擎...');
                aiMove = await window.OpenSourceAI.getBestMove(this);
                if (aiMove && aiMove.source === 'online') {
                    console.log('在线AI返回着法:', aiMove);
                } else {
                    console.log('在线AI失败，回退到本地AI');
                    aiMove = null;
                }
            }
            
            // 如果以上AI引擎都失败，使用本地AI
            if (!aiMove) {
                console.log('使用本地AI引擎...');
                if (!window.AIPlayer) {
                    console.error('本地AI模块未加载');
                    document.getElementById('game-status').textContent = 'AI模块未加载';
                    return;
                }
                
                aiMove = window.AIPlayer.getBestMove(this);
                if (aiMove) {
                    aiMove.source = 'local';
                }
                console.log('本地AI返回着法:', aiMove);
            }
            
            // 处理AI返回的着法
            if (aiMove && aiMove.x !== undefined && aiMove.y !== undefined) {
                console.log(`AI选择下在 (${aiMove.x}, ${aiMove.y}), 来源: ${aiMove.source}`);
                
                // 验证着法有效性
                if (this.isValidMove(aiMove.x, aiMove.y)) {
                    this.makeMove(aiMove.x, aiMove.y);
                    const engineName = this.getEngineDisplayName(aiMove.source);
                    document.getElementById('game-status').textContent = `${engineName}落子于 (${String.fromCharCode(65 + aiMove.x)}${this.boardSize - aiMove.y})`;
                } else {
                    console.error('AI返回了无效着法:', aiMove);
                    console.log('AI着法无效，尝试随机着法');
                    this.makeRandomMove();
                }
            } else {
                console.log('AI选择停一手');
                this.pass();
                const engineName = this.getEngineDisplayName(this.currentAIEngine);
                document.getElementById('game-status').textContent = `${engineName}选择停一手`;
            }
        } catch (error) {
            console.error('AI计算出错:', error);
            console.error('错误堆栈:', error.stack);
            console.log('AI计算异常，尝试随机着法');
            this.makeRandomMove();
        } finally {
            // 无论如何都要清除AI移动标志
            this.aiMoving = false;
        }
    }
    
    getEngineDisplayName(source) {
        switch (source) {
            case 'katago':
                return 'KataGo';
            case 'online':
                return '在线AI';
            case 'local':
            default:
                return '本地AI';
        }
    }

    makeRandomMove() {
        const validMoves = [];
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.isValidMove(x, y)) {
                    validMoves.push({ x, y });
                }
            }
        }
        
        if (validMoves.length > 0) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            console.log('随机选择着法:', randomMove);
            this.makeMove(randomMove.x, randomMove.y);
        } else {
            this.pass();
        }
    }

    isSuicideMove(x, y, player) {
        // 判断在(x,y)位置下子是否为自杀手
        // 自杀手定义：下子后自己的棋子群没有气，且不能提取对方棋子
        
        // 保存原始状态
        const originalValue = this.board[y][x];
        
        try {
            // 模拟下子
            this.board[y][x] = player;
            
            // 检查是否能提取对方棋子
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            let canCapture = false;
            
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                    const neighbor = this.board[ny][nx];
                    // 如果相邻是对方棋子，检查是否可以提取
                    if (neighbor !== 0 && neighbor !== player) {
                        if (this.getLibertiesCount(nx, ny) === 0) {
                            canCapture = true;
                            break;
                        }
                    }
                }
            }
            
            // 如果能提取对方棋子，则不是自杀手
            if (canCapture) {
                return false;
            }
            
            // 检查下子后自己的棋子群是否有气
            const hasLiberty = this.getLibertiesCount(x, y) > 0;
            
            // 如果没有气，则是自杀手
            return !hasLiberty;
            
        } finally {
            // 无论如何都要恢复棋盘状态
            this.board[y][x] = originalValue;
        }
    }

    getLibertiesCount(x, y) {
        // 计算棋子群的气数
        const color = this.board[y][x];
        if (color === 0) return 0;
        
        const visited = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(false));
        const liberties = new Set();
        
        this.findGroupLibertiesRecursive(x, y, color, visited, liberties);
        
        return liberties.size;
    }

    findGroupLibertiesRecursive(x, y, color, visited, liberties) {
        // 递归查找棋子群的所有气
        if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize || visited[y][x]) {
            return;
        }
        
        visited[y][x] = true;
        
        if (this.board[y][x] === 0) {
            // 空点就是气
            liberties.add(`${x},${y}`);
            return;
        }
        
        if (this.board[y][x] !== color) {
            // 不同颜色的棋子，停止搜索
            return;
        }
        
        // 同色棋子，继续搜索四个方向
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of directions) {
            this.findGroupLibertiesRecursive(x + dx, y + dy, color, visited, liberties);
        }
    }


    showMoveError(message) {
        // 显示移动错误信息
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            const originalText = statusElement.textContent;
            statusElement.textContent = '❌ ' + message;
            statusElement.style.color = '#e74c3c';
            
            // 2秒后恢复原文本
            setTimeout(() => {
                statusElement.textContent = originalText;
                statusElement.style.color = '';
            }, 2000);
        }
        
        // 可选：使用UI控制器的通知系统
        if (window.UIController && window.UIController.instance && window.UIController.instance.showNotification) {
            window.UIController.instance.showNotification('error', '无效着法', message, 2000);
        }
    }

    updateTerritoryEstimate() {
        const blackScore = this.estimateTerritory(1) + this.blackCaptures;
        const whiteScore = this.estimateTerritory(-1) + this.whiteCaptures + 6.5; // 贴目
        
        // 更新玩家信息显示
        const blackDetails = document.querySelector('.black-player .player-details');
        const whiteDetails = document.querySelector('.white-player .player-details');
        
        
        if (blackDetails) {
            blackDetails.innerHTML = `
                <span class="player-name">黑棋</span>
                <span class="captures">提子: ${this.blackCaptures}</span>
                <span class="territory-estimate">估算: ${blackScore.toFixed(1)}目</span>
            `;
        }
        
        if (whiteDetails) {
            whiteDetails.innerHTML = `
                <span class="player-name">白棋</span>
                <span class="captures">提子: ${this.whiteCaptures}</span>
                <span class="territory-estimate">估算: ${whiteScore.toFixed(1)}目</span>
            `;
        }
    }

    updateBasicPlayerInfo() {
        // 更新基本玩家信息（不显示局势估算）
        const blackDetails = document.querySelector('.black-player .player-details');
        const whiteDetails = document.querySelector('.white-player .player-details');
        
        if (blackDetails) {
            blackDetails.innerHTML = `
                <span class="player-name">黑棋</span>
                <span class="captures">提子: ${this.blackCaptures}</span>
            `;
        }
        
        if (whiteDetails) {
            whiteDetails.innerHTML = `
                <span class="player-name">白棋</span>
                <span class="captures">提子: ${this.whiteCaptures}</span>
            `;
        }
    }

    estimateTerritory(player) {
        let territory = 0;
        const influence = this.calculateInfluence();

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 0) {
                    if (player === 1 && influence[y][x] > 0) {
                        territory++;
                    } else if (player === -1 && influence[y][x] < 0) {
                        territory++;
                    }
                }
            }
        }

        return territory;
    }

    calculateInfluence() {
        const influence = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] !== 0) {
                    const color = this.board[y][x];
                    
                    // 扩散影响力，距离越远影响越小
                    for (let dy = -3; dy <= 3; dy++) {
                        for (let dx = -3; dx <= 3; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                                const distance = Math.abs(dx) + Math.abs(dy);
                                if (distance <= 3) {
                                    const influenceValue = Math.max(0, 4 - distance) * color;
                                    influence[ny][nx] += influenceValue;
                                }
                            }
                        }
                    }
                }
            }
        }

        return influence;
    }

    endGame() {
        this.gameEnded = true;
        // TODO: 实现计算得分和显示结果
        document.getElementById('game-status').textContent = '游戏结束';
    }

    updateUI() {
        // 更新当前玩家显示
        const turnText = this.currentPlayer === 1 ? '黑棋行棋' : '白棋行棋';
        document.getElementById('current-turn').textContent = turnText;
        
        // 更新提子计数
        document.querySelector('.black-player .captures').textContent = `提子: ${this.blackCaptures}`;
        document.querySelector('.white-player .captures').textContent = `提子: ${this.whiteCaptures}`;
        
        // 更新玩家激活状态
        document.querySelectorAll('.player').forEach(player => player.classList.remove('active'));
        if (this.currentPlayer === 1) {
            document.querySelector('.black-player').classList.add('active');
        } else {
            document.querySelector('.white-player').classList.add('active');
        }
        
        // 在双人对战模式下显示局势估算
        if (this.gameMode === 'pvp' && this.moveHistory.length > 0) {
            this.updateTerritoryEstimate();
        } else if (this.gameMode !== 'pvp') {
            // 在非双人对战模式下，只显示基本信息
            this.updateBasicPlayerInfo();
        }
        
        // 更新状态栏
        let status = '';
        if (this.gameEnded) {
            status = '游戏结束';
        } else if (this.passCount === 1) {
            status = '对方停一手';
        } else {
            status = `${this.currentPlayer === 1 ? '黑棋' : '白棋'}行棋`;
        }
        document.getElementById('game-status').textContent = status;
    }
}

// 初始化游戏
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GoGame();
});