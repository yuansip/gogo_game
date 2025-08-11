// 用户界面控制模块

class UIController {
    constructor() {
        this.currentMode = 'pvp';
        this.currentAIEngine = 'local';
        this.isInitialized = false;
        this.isFullscreen = false;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.setupModeHandlers();
        this.setupResponsiveLayout();
        this.initializeTooltips();
        this.setupFullscreenListeners();
        
        this.isInitialized = true;
        
        // 初始化默认模式
        this.switchMode('pvp');
        
        // 初始化AI引擎状态
        this.updateAIEngineStatus('local');
        
        // 确保容器和侧边栏在初始化时正确显示
        const gameInfoSidebar = document.querySelector('.game-info-sidebar');
        const gameContainer = document.querySelector('.game-container');
        if (gameInfoSidebar) {
            gameInfoSidebar.style.display = 'block';
        }
        if (gameContainer) {
            gameContainer.style.display = 'flex';
        }
        
        console.log('UI Controller initialized');
    }

    setupEventListeners() {
        // 模式切换按钮
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });

        // AI引擎选择
        document.getElementById('ai-engine').addEventListener('change', (e) => {
            const engine = e.target.value;
            this.setAIEngine(engine);
        });

        // AI难度设置
        document.getElementById('ai-difficulty').addEventListener('change', (e) => {
            const difficulty = e.target.value;
            if (window.AIPlayer) {
                window.AIPlayer.setDifficulty(difficulty);
            }
        });

        // 局势分析按钮
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzePosition();
        });

        // 全屏按钮
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupModeHandlers() {
        // 确保游戏和AI模块加载完成后再设置
        const checkAndSetup = () => {
            if (typeof game !== 'undefined' && window.AIPlayer && window.TsumegoEngine) {
                this.bindGameEvents();
            } else {
                setTimeout(checkAndSetup, 100);
            }
        };
        checkAndSetup();
    }

    bindGameEvents() {
        // 监听游戏状态变化
        const originalUpdateUI = game.updateUI;
        game.updateUI = function() {
            originalUpdateUI.call(this);
            
            // 更新按钮状态
            UIController.instance.updateControlButtons();
        };

        // 监听游戏结束
        const originalEndGame = game.endGame;
        game.endGame = function() {
            originalEndGame.call(this);
            UIController.instance.showGameResult();
        };
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // 更新按钮状态
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // 显示/隐藏相关UI元素
        this.updateModeUI(mode);

        // 设置游戏模式
        if (typeof game !== 'undefined') {
            console.log('切换游戏模式到:', mode);
            game.gameMode = mode;
            
            // 开始新游戏
            game.newGame();
            
            // 如果是AI模式，确保AI准备就绪并同步AI引擎设置
            if (mode === 'ai') {
                console.log('AI模式已激活，AI模块状态:', typeof window.AIPlayer);
                if (window.AIPlayer) {
                    console.log('AI模块已就绪');
                } else {
                    console.warn('AI模块未加载');
                }
                
                // 同步AI引擎设置到游戏实例
                game.currentAIEngine = this.currentAIEngine;
                console.log('游戏AI引擎设置为:', game.currentAIEngine);
            }
            
            // 重新绘制棋盘以应用/移除领地标记
            game.drawBoard();
        }

        // 更新状态显示
        this.updateStatusMessage(mode);
    }

    updateModeUI(mode) {
        // AI设置区域
        const aiSettings = document.querySelectorAll('.ai-only');
        aiSettings.forEach(element => {
            element.style.display = mode === 'ai' ? 'block' : 'none';
        });

        // 游戏信息面板和容器
        const gameInfo = document.querySelector('.game-info');
        const gameInfoSidebar = document.querySelector('.game-info-sidebar');
        const gameContainer = document.querySelector('.game-container');
        
        // 隐藏原来的底部信息面板，显示侧边栏
        if (gameInfo) gameInfo.style.display = 'none';
        if (gameInfoSidebar) gameInfoSidebar.style.display = 'block';
        if (gameContainer) gameContainer.style.display = 'flex';
    }

    updateStatusMessage(mode) {
        const statusElement = document.getElementById('game-status');
        if (!statusElement) return;

        switch (mode) {
            case 'pvp':
                statusElement.textContent = '双人对战模式 - 黑棋先行';
                break;
            case 'ai':
                statusElement.textContent = '人机对战模式 - 您执黑棋先行，点击棋盘开始对战';
                break;
        }
    }

    updateControlButtons() {
        if (!game) return;

        // 更新悔棋按钮状态
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.disabled = game.moveHistory.length === 0;
        }

        // 更新停一手按钮状态
        const passBtn = document.getElementById('pass-btn');
        if (passBtn) {
            passBtn.disabled = game.gameEnded;
        }
    }

    showGameResult() {
        if (!game) return;

        // 创建结果对话框
        const modal = this.createModal('游戏结束', this.getGameResultText(), [
            { text: '新游戏', primary: true, callback: () => game.newGame() },
            { text: '关闭', callback: () => this.closeModal() }
        ]);

        this.showModal(modal);
    }

    getGameResultText() {
        // 简化的游戏结果计算
        const blackTerritory = this.estimateTerritory(1);
        const whiteTerritory = this.estimateTerritory(-1);
        const komi = 6.5; // 贴目

        const blackScore = blackTerritory + game.blackCaptures;
        const whiteScore = whiteTerritory + game.whiteCaptures + komi;

        const result = blackScore > whiteScore ? '黑棋获胜' : '白棋获胜';
        const margin = Math.abs(blackScore - whiteScore).toFixed(1);

        return `
            ${result} (${margin}目)
            
            黑棋: ${blackScore.toFixed(1)}目 (领地: ${blackTerritory}, 提子: ${game.blackCaptures})
            白棋: ${whiteScore.toFixed(1)}目 (领地: ${whiteTerritory}, 提子: ${game.whiteCaptures}, 贴目: ${komi})
        `;
    }

    estimateTerritory(player) {
        // 简化的领地估算
        let territory = 0;
        const influence = this.calculateSimpleInfluence();

        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] === 0) {
                    // 空点的归属由影响力决定
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

    calculateSimpleInfluence() {
        const influence = Array(game.boardSize).fill().map(() => Array(game.boardSize).fill(0));

        for (let y = 0; y < game.boardSize; y++) {
            for (let x = 0; x < game.boardSize; x++) {
                if (game.board[y][x] !== 0) {
                    const color = game.board[y][x];
                    
                    // 简单的影响力计算
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < game.boardSize && ny >= 0 && ny < game.boardSize) {
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

    handleKeyboardShortcuts(e) {
        // 防止在输入框中触发快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch (e.key) {
            case 'n':
            case 'N':
                e.preventDefault();
                game.newGame();
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                game.pass();
                break;
            case 'u':
            case 'U':
                e.preventDefault();
                game.undo();
                break;
            case '1':
                e.preventDefault();
                this.switchMode('pvp');
                break;
            case '2':
                e.preventDefault();
                this.switchMode('ai');
                break;
            case 'F11':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'Escape':
                if (this.isFullscreen) {
                    e.preventDefault();
                    this.exitFullscreen();
                }
                break;
        }
    }

    handleResize() {
        if (game && game.canvas) {
            // 响应式调整画布大小
            const container = game.canvas.parentElement;
            let maxSize = 600; // 默认最大尺寸
            
            // 在全屏模式下允许更大的棋盘
            if (this.isFullscreen) {
                // 计算全屏可用空间
                const availableWidth = window.innerWidth - 400; // 为侧边栏和间距留出空间
                const availableHeight = window.innerHeight - 180; // 为头部和控制区域留出空间
                maxSize = Math.min(availableWidth, availableHeight, 900); // 全屏下最大900px
                
                console.log(`全屏模式棋盘调整: 可用宽度=${availableWidth}, 可用高度=${availableHeight}, 最终大小=${maxSize}`);
            }
            
            const size = Math.min(container.clientWidth - 40, maxSize);
            
            console.log(`棋盘大小调整: ${game.canvas.width}x${game.canvas.height} -> ${size}x${size}`);
            
            game.canvas.width = size;
            game.canvas.height = size;
            game.calculateCellSize();
            game.drawBoard();
        }
    }

    setupResponsiveLayout() {
        // 初始响应式设置
        this.handleResize();
        
        // 移动端适配
        if (this.isMobile()) {
            document.body.classList.add('mobile');
            this.setupMobileOptimizations();
        }
    }

    isMobile() {
        return window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);
    }

    setupMobileOptimizations() {
        // 移动端优化
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            // 可以添加移动端特定的样式或行为
        }

        // 触摸优化
        if ('ontouchstart' in window) {
            this.setupTouchOptimizations();
        }
    }

    setupTouchOptimizations() {
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // 优化触摸反馈
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('touchstart', function() {
                this.classList.add('active');
            });
            
            btn.addEventListener('touchend', function() {
                setTimeout(() => this.classList.remove('active'), 150);
            });
        });
    }

    initializeTooltips() {
        // 简单的工具提示系统
        const elements = document.querySelectorAll('[data-tooltip]');
        
        elements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.dataset.tooltip);
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip show';
        tooltip.textContent = text;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
        
        this.activeTooltip = tooltip;
    }

    hideTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.classList.remove('show');
            setTimeout(() => {
                if (this.activeTooltip && this.activeTooltip.parentNode) {
                    this.activeTooltip.parentNode.removeChild(this.activeTooltip);
                }
                this.activeTooltip = null;
            }, 300);
        }
    }

    createModal(title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal';
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <div class="modal-title">${title}</div>
            </div>
            <div class="modal-content">
                <pre style="white-space: pre-line; font-family: inherit;">${content}</pre>
            </div>
            <div class="modal-actions">
                ${actions.map(action => 
                    `<button class="modal-btn ${action.primary ? 'primary' : 'secondary'}" 
                     data-action="${action.text}">${action.text}</button>`
                ).join('')}
            </div>
        `;
        
        modal.appendChild(modalContent);
        
        // 绑定事件
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        modalContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-btn')) {
                const actionText = e.target.dataset.action;
                const action = actions.find(a => a.text === actionText);
                if (action && action.callback) {
                    action.callback();
                }
                this.closeModal();
            }
        });
        
        return modal;
    }

    showModal(modal) {
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
        this.activeModal = modal;
    }

    closeModal() {
        if (this.activeModal) {
            this.activeModal.classList.remove('show');
            setTimeout(() => {
                if (this.activeModal && this.activeModal.parentNode) {
                    this.activeModal.parentNode.removeChild(this.activeModal);
                }
                this.activeModal = null;
            }, 300);
        }
    }

    showNotification(type, title, message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
            <div style="white-space: pre-line;">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
        
        return notification;
    }

    setAIEngine(engine) {
        this.currentAIEngine = engine;
        console.log('切换AI引擎到:', engine);
        
        // 更新状态显示
        this.updateAIEngineStatus(engine);
        
        // 如果当前是AI模式，更新游戏中的AI引擎
        if (this.currentMode === 'ai' && typeof game !== 'undefined') {
            game.currentAIEngine = engine;
        }
        
        // 显示切换通知
        let engineName = '';
        switch (engine) {
            case 'local':
                engineName = '本地AI';
                break;
            case 'katago':
                engineName = 'KataGo';
                break;
            case 'online':
                engineName = '在线AI';
                break;
        }
        
        this.showNotification('info', 'AI引擎切换', `已切换到 ${engineName}`, 2000);
    }

    updateAIEngineStatus(engine) {
        // 更新AI引擎状态指示器（如果有的话）
        const statusElement = document.querySelector('.ai-status-text');
        if (statusElement) {
            statusElement.remove();
        }
        
        // 在AI引擎选择器后添加状态文本
        const aiEngineSelect = document.getElementById('ai-engine');
        if (aiEngineSelect && aiEngineSelect.parentNode) {
            const statusText = document.createElement('div');
            statusText.className = 'ai-status-text';
            
            switch (engine) {
                case 'local':
                    console.log('检查本地AI状态...');
                    console.log('window.AIPlayer存在:', !!window.AIPlayer);
                    console.log('window.AIPlayer类型:', typeof window.AIPlayer);
                    
                    if (window.AIPlayer) {
                        console.log('getBestMove方法类型:', typeof window.AIPlayer.getBestMove);
                    }
                    
                    // 检查本地AI是否真的可用
                    if (window.AIPlayer && typeof window.AIPlayer.getBestMove === 'function') {
                        statusText.textContent = '✓ 本地AI已就绪';
                        statusText.classList.add('connected');
                        console.log('本地AI状态检查：已就绪');
                    } else {
                        statusText.textContent = '等待AI模块加载...';
                        statusText.classList.add('loading');
                        console.log('本地AI状态检查：等待加载');
                        
                        // 延迟重试检测
                        setTimeout(() => {
                            console.log('重新检查AI状态...');
                            console.log('window.AIPlayer存在:', !!window.AIPlayer);
                            if (window.AIPlayer) {
                                console.log('AI实例类型:', typeof window.AIPlayer);
                                console.log('getBestMove方法:', typeof window.AIPlayer.getBestMove);
                            }
                            
                            if (window.AIPlayer && typeof window.AIPlayer.getBestMove === 'function') {
                                statusText.textContent = '✓ 本地AI已就绪';
                                statusText.className = 'ai-status-text connected';
                                console.log('延迟检查：本地AI已就绪');
                            } else {
                                statusText.textContent = '✗ 本地AI加载失败';
                                statusText.className = 'ai-status-text disconnected';
                                console.error('延迟检查：本地AI仍未加载');
                                
                                // 输出详细错误信息
                                if (!window.AIPlayer) {
                                    console.error('错误：window.AIPlayer不存在');
                                } else if (typeof window.AIPlayer.getBestMove !== 'function') {
                                    console.error('错误：getBestMove方法不是函数，类型:', typeof window.AIPlayer.getBestMove);
                                    console.error('AI实例的所有方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.AIPlayer)));
                                }
                            }
                        }, 2000);
                    }
                    break;
                case 'katago':
                    statusText.textContent = '需要配置KataGo服务器';
                    statusText.classList.add('disconnected');
                    this.checkKataGoStatus(statusText);
                    break;
                case 'online':
                    statusText.textContent = '需要网络连接';
                    statusText.classList.add('disconnected');
                    this.checkOnlineAIStatus(statusText);
                    break;
            }
            
            aiEngineSelect.parentNode.appendChild(statusText);
        }
    }

    async checkKataGoStatus(statusElement) {
        try {
            statusElement.textContent = '检查KataGo连接...';
            statusElement.className = 'ai-status-text loading';
            
            console.log('开始检查KataGo状态...');
            
            // 检查KataGo是否可用
            if (window.OpenSourceAI && await window.OpenSourceAI.checkKataGoAvailability()) {
                statusElement.textContent = '✓ KataGo已连接';
                statusElement.className = 'ai-status-text connected';
                console.log('KataGo连接成功');
            } else {
                statusElement.textContent = '✗ KataGo未连接 (确保代理服务器正常运行)';
                statusElement.className = 'ai-status-text disconnected';
                console.log('KataGo连接失败');
            }
        } catch (error) {
            console.error('检查KataGo状态时出错:', error);
            statusElement.textContent = '✗ KataGo连接错误: ' + error.message;
            statusElement.className = 'ai-status-text disconnected';
        }
    }

    async checkOnlineAIStatus(statusElement) {
        try {
            statusElement.textContent = '检查在线AI连接...';
            statusElement.className = 'ai-status-text loading';
            
            // 检查在线AI是否可用
            if (window.OpenSourceAI && await window.OpenSourceAI.checkOnlineAIServices()) {
                statusElement.textContent = '✓ 在线AI已连接';
                statusElement.className = 'ai-status-text connected';
            } else {
                statusElement.textContent = '✗ 在线AI不可用';
                statusElement.className = 'ai-status-text disconnected';
            }
        } catch (error) {
            statusElement.textContent = '✗ 检查在线AI失败';
            statusElement.className = 'ai-status-text disconnected';
        }
    }

    async analyzePosition() {
        // 分析当前局面
        if (!game || game.gameEnded) {
            this.showNotification('warning', '分析失败', '游戏尚未开始或已结束', 2000);
            return;
        }

        const analyzeBtn = document.getElementById('analyze-btn');
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = '分析中...';

        try {
            console.log('开始分析当前局面...');
            
            // 保存原始AI引擎设置
            const originalEngine = game.currentAIEngine;
            
            // 显示分析进度 - 总是优先尝试KataGo
            analyzeBtn.textContent = '检查KataGo...';
            
            // 先检查KataGo是否可用，给用户实时反馈
            const katagoAvailable = await window.OpenSourceAI.checkKataGoAvailability();
            if (katagoAvailable) {
                analyzeBtn.textContent = 'KataGo分析中...';
                this.showNotification('info', '分析引擎', '使用KataGo进行专业分析', 1500);
            } else {
                analyzeBtn.textContent = '本地分析中...';
                this.showNotification('info', '分析引擎', 'KataGo不可用，使用本地分析', 1500);
            }
            
            const analysis = await window.OpenSourceAI.analyzePosition(game);
            
            if (analysis) {
                this.displayAnalysisResult(analysis);
                console.log('局势分析完成:', analysis);
            } else {
                this.showNotification('error', '分析失败', '无法获取局势分析结果', 3000);
            }
            
            // 恢复原始AI引擎设置
            game.currentAIEngine = originalEngine;
            
        } catch (error) {
            console.error('局势分析出错:', error);
            this.showNotification('error', '分析失败', '分析过程中出现错误: ' + error.message, 3000);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '局势分析';
        }
    }

    displayAnalysisResult(analysis) {
        // 显示分析结果
        const analysisPanel = document.getElementById('position-analysis');
        const summaryEl = document.getElementById('analysis-summary');
        const detailsEl = document.getElementById('analysis-details');
        const blackWinRateEl = document.getElementById('win-rate-black');
        const whiteWinRateEl = document.getElementById('win-rate-white');
        const blackPercentEl = document.getElementById('black-win-percent');
        const whitePercentEl = document.getElementById('white-win-percent');
        const sourceEl = document.getElementById('analysis-source');

        // 更新文本内容
        summaryEl.textContent = analysis.analysis.summary;
        detailsEl.textContent = analysis.analysis.details;

        // 更新胜率条
        const blackPercent = (analysis.blackWinRate * 100);
        const whitePercent = (analysis.whiteWinRate * 100);
        
        blackWinRateEl.style.width = blackPercent + '%';
        whiteWinRateEl.style.width = whitePercent + '%';
        
        blackPercentEl.textContent = blackPercent.toFixed(1) + '%';
        whitePercentEl.textContent = whitePercent.toFixed(1) + '%';

        // 更新分析来源
        const sourceText = analysis.source === 'katago' ? 
            `KataGo分析 (置信度: ${analysis.confidence}次访问)` : 
            '本地评估';
        sourceEl.textContent = sourceText;

        // 显示分析面板
        analysisPanel.style.display = 'block';

        // 滚动到分析结果
        analysisPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // 显示成功通知
        const engineName = analysis.source === 'katago' ? 'KataGo' : '本地AI';
        this.showNotification('success', `${engineName}分析完成`, analysis.analysis.summary, 3000);
    }

    setupFullscreenListeners() {
        // 监听全屏状态变化事件
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    enterFullscreen() {
        const container = document.querySelector('.container');
        
        // 先设置背景样式，确保全屏时有正确的背景
        this.setFullscreenBackground();
        
        try {
            // 尝试使用浏览器原生全屏API
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            } else {
                // 如果浏览器不支持全屏API，使用CSS全屏模式
                this.enterCSSFullscreen();
            }
        } catch (error) {
            console.log('浏览器全屏失败，使用CSS全屏模式');
            this.enterCSSFullscreen();
        }
    }

    enterCSSFullscreen() {
        const container = document.querySelector('.container');
        container.classList.add('fullscreen-mode');
        document.documentElement.classList.add('fullscreen-active');
        document.body.classList.add('fullscreen-active');
        this.isFullscreen = true;
        this.updateFullscreenButton();
        this.handleResize();
        
        console.log('进入CSS全屏模式');
    }

    exitFullscreen() {
        try {
            // 尝试退出浏览器原生全屏
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else {
                // 如果浏览器不支持，退出CSS全屏模式
                this.exitCSSFullscreen();
            }
        } catch (error) {
            console.log('浏览器退出全屏失败，使用CSS退出');
            this.exitCSSFullscreen();
        }
    }

    exitCSSFullscreen() {
        const container = document.querySelector('.container');
        container.classList.remove('fullscreen-mode');
        document.documentElement.classList.remove('fullscreen-active');
        document.body.classList.remove('fullscreen-active');
        this.removeFullscreenBackground();
        this.isFullscreen = false;
        this.updateFullscreenButton();
        this.handleResize();
        
        console.log('退出CSS全屏模式');
    }

    handleFullscreenChange() {
        // 检查是否处于浏览器原生全屏状态
        const isNativeFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        if (isNativeFullscreen && !this.isFullscreen) {
            // 进入浏览器原生全屏
            this.isFullscreen = true;
            document.documentElement.classList.add('fullscreen-active');
            document.body.classList.add('fullscreen-active');
            this.setFullscreenBackground(); // 确保背景正确
            this.updateFullscreenButton();
            this.handleResize();
            console.log('进入浏览器原生全屏');
        } else if (!isNativeFullscreen && this.isFullscreen) {
            // 退出浏览器原生全屏
            this.exitCSSFullscreen(); // 也要移除CSS全屏类
            console.log('退出浏览器原生全屏');
        }
    }

    setFullscreenBackground() {
        // 动态设置全屏背景样式
        const background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
        
        // 设置内联样式，优先级最高
        document.documentElement.style.background = background;
        document.body.style.background = background;
        
        // 创建或更新专用的CSS规则
        let styleEl = document.getElementById('fullscreen-bg-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'fullscreen-bg-style';
            document.head.appendChild(styleEl);
        }
        
        styleEl.textContent = `
            html, body {
                background: ${background} !important;
                background-attachment: fixed !important;
            }
            :fullscreen, :-webkit-full-screen, :-moz-full-screen, :-ms-fullscreen {
                background: ${background} !important;
                background-attachment: fixed !important;
            }
            .container:fullscreen, .container:-webkit-full-screen, .container:-moz-full-screen, .container:-ms-fullscreen {
                background: ${background} !important;
                background-attachment: fixed !important;
            }
        `;
        
        console.log('已设置全屏背景样式');
    }
    
    removeFullscreenBackground() {
        // 移除内联样式
        document.documentElement.style.background = '';
        document.body.style.background = '';
        
        // 移除专用CSS规则
        const styleEl = document.getElementById('fullscreen-bg-style');
        if (styleEl) {
            styleEl.remove();
        }
        
        console.log('已移除全屏背景样式');
    }

    updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            if (this.isFullscreen) {
                fullscreenBtn.textContent = '🔳';
                fullscreenBtn.classList.add('active');
                fullscreenBtn.title = '退出全屏 (F11/Esc)';
            } else {
                fullscreenBtn.textContent = '🔲';
                fullscreenBtn.classList.remove('active');
                fullscreenBtn.title = '全屏 (F11)';
            }
        }
    }

}

// 创建全局UI控制器实例
UIController.instance = new UIController();

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!UIController.instance.isInitialized) {
        UIController.instance.init();
    }
});

// 导出给其他模块使用
window.UIController = UIController;