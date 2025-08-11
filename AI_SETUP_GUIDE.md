# 围棋AI增强指南

本项目现在支持多种AI引擎，从内置的战术AI到专业的开源围棋AI。

## 🎯 AI功能层次

### 1. 内置增强AI（已完成）
- ✅ 基本战术识别（提子、打吃、逃跑）
- ✅ 形状判断（好形、坏形识别）
- ✅ 开局定式库
- ✅ Minimax搜索算法
- ✅ 三种难度级别

### 2. 开源AI集成（可选）
- 🔥 KataGo集成（世界冠军级别）
- 🌐 在线AI服务
- 📡 代理服务器支持

## 🚀 快速开始

### 使用内置AI（推荐新手）
无需额外配置，直接使用！内置AI已大幅改进：

1. 打开 `index.html`
2. 选择"人机对战"模式
3. 设置AI难度
4. 开始对弈

**内置AI特点：**
- 简单模式：快速响应，适合初学者
- 中等模式：基础战术，适合业余棋手
- 困难模式：深度搜索，挑战性较高

## 🏆 使用专业AI（KataGo）

KataGo是目前最强的开源围棋AI，棋力超过职业九段。

### 安装KataGo

#### Windows/Mac/Linux:
```bash
# 1. 下载KataGo
wget https://github.com/lightvector/KataGo/releases/latest/download/katago-v1.x.x-xxx.zip

# 2. 下载神经网络权重
wget https://media.githubusercontent.com/media/lightvector/KataGo/master/g170/neuralnets/g170-b6c96-s175395328-d26788732.bin.gz

# 3. 解压并配置
unzip katago-*.zip
```

#### 使用Docker（推荐）:
```bash
docker pull katago/katago:latest
docker run -p 5000:5000 katago/katago:latest
```

### 启动代理服务器

```bash
# 修改配置文件中的路径
nano server/katago-proxy.py

# 安装依赖
pip install flask flask-cors

# 启动服务器
python server/katago-proxy.py
```

### 配置路径

编辑 `server/katago-proxy.py`:

```python
# 修改这些路径指向你的KataGo安装
KATAGO_PATH = "/path/to/katago"
MODEL_PATH = "/path/to/g170-b6c96-s175395328-d26788732.bin.gz"
CONFIG_PATH = "/path/to/gtp_example.cfg"
```

## 🌐 在线AI服务

如果不想本地安装，可以使用在线AI服务：

### 公开API（示例）
- [KataGo Online](https://katago-online.herokuapp.com) 
- [OGS AI](https://online-go.com/api)
- [Fox AI API](https://www.foxwq.com)

### 自定义API
在 `js/ai-integration.js` 中修改API端点：

```javascript
const response = await fetch('你的AI服务API', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        board: boardData,
        toMove: gameState.currentPlayer === 1 ? 'B' : 'W'
    })
});
```

## 📊 AI性能对比

| AI类型 | 棋力估计 | 响应时间 | 特点 |
|--------|----------|----------|------|
| 内置简单 | 15级 | <100ms | 快速，适合练习基础 |
| 内置中等 | 10级 | <500ms | 平衡，适合业余棋手 |
| 内置困难 | 5级 | <2s | 挑战性，深度搜索 |
| KataGo | 职业9段+ | 1-10s | 世界冠军级别 |

## 🛠️ 故障排除

### AI不响应
1. 检查浏览器控制台错误
2. 确认AI引擎是否正确加载
3. 重新刷新页面

### KataGo连接失败
1. 确认代理服务器运行中
2. 检查端口5000是否开放
3. 验证KataGo路径配置

### 性能优化
1. 降低AI难度设置
2. 使用较小的棋盘尺寸
3. 减少搜索深度

## 🎮 游戏功能

- **双人对战**：本地对弈
- **人机对战**：与AI对弈，支持多种AI引擎
- **死活题**：练习围棋死活
- **棋盘大小**：9x9, 13x13, 19x19
- **实时分析**：领地估算和势力显示

## 📈 AI改进说明

### v2.0 改进内容：
1. **战术识别**：
   - 提子检测
   - 打吃识别  
   - 逃跑算法
   - 防守策略

2. **形状判断**：
   - 好形识别（飞、跳、连接）
   - 坏形避免（空三角、重复）
   - 连接性分析

3. **开局改进**：
   - 真实的围棋开局点
   - 简单定式库
   - 布局策略

4. **搜索优化**：
   - Alpha-Beta剪枝
   - 启发式排序
   - 深度限制

## 🔧 开发者指南

### 添加新的AI引擎
1. 在 `ai-integration.js` 中添加新引擎类
2. 实现 `getBestMove()` 方法
3. 添加可用性检测
4. 更新引擎选择逻辑

### 自定义评估函数
修改 `ai.js` 中的 `evaluatePosition()` 方法来调整AI的评估标准。

### 调试AI行为
启用控制台日志来观察AI的思考过程：
```javascript
console.log('AI选择着法:', move, '评分:', score);
```

## 📝 许可证

本项目采用MIT许可证。KataGo和其他第三方AI引擎保持其原有许可证。

---

**享受围棋对弈！** 🥳