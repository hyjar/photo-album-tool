# 微信接入实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将MiMoCode摄影集排版工具接入微信个人号，用户可以通过微信好友对话与MiMoCode交互，使用全部功能。

**Architecture:** 创建Node.js后端服务，使用Wechaty库接收微信消息，通过子进程调用mi命令行工具，将结果返回给用户。采用模块化设计，包括微信机器人、MiMoCode调用、会话管理等模块。

**Tech Stack:** Node.js, Express, Wechaty, 子进程调用

---

## 文件结构

```
D:\hyjar\server\
├── index.js          # 主服务器入口
├── wechat-bot.js     # 微信机器人模块
├── mimo-runner.js    # MiMoCode调用模块
├── session-manager.js # 会话管理模块
├── config.js         # 配置文件
└── package.json      # 服务器依赖
```

---

### Task 1: 创建服务器目录和基础结构

**Covers:** [S1]

**Files:**
- Create: `D:\hyjar\server\package.json`
- Create: `D:\hyjar\server\config.js`
- Create: `D:\hyjar\server\index.js`

- [ ] **Step 1: 创建服务器目录**

```bash
mkdir D:\hyjar\server
```

- [ ] **Step 2: 创建package.json**

```json
{
  "name": "mimo-wechat-server",
  "version": "1.0.0",
  "description": "MiMoCode微信接入服务器",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "wechaty": "^1.20.2",
    "wechaty-puppet-wechat": "^1.18.4"
  }
}
```

- [ ] **Step 3: 创建config.js**

```javascript
export default {
  // 服务器配置
  port: process.env.PORT || 3001,
  
  // 微信配置
  wechat: {
    // 白名单用户（微信号）
    allowedUsers: [],
    // 是否启用图片消息
    enableImage: true,
    // 最大消息长度
    maxMessageLength: 2000
  },
  
  // MiMoCode配置
  mimo: {
    // 命令超时时间（毫秒）
    timeout: 30000,
    // 最大输出长度
    maxOutputLength: 4000
  }
};
```

- [ ] **Step 4: 创建基础服务器 index.js**

```javascript
import express from 'express';
import config from './config.js';

const app = express();
const PORT = config.port;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
```

- [ ] **Step 5: 安装依赖**

```bash
cd D:\hyjar\server && npm install
```

- [ ] **Step 6: 测试服务器启动**

```bash
cd D:\hyjar\server && npm start
```

Expected: 服务器启动成功，显示"服务器运行在端口 3001"

- [ ] **Step 7: 提交代码**

```bash
git add server/
git commit -m "feat: 创建微信接入服务器基础结构"
```

---

### Task 2: 实现MiMoCode调用模块

**Covers:** [S2]

**Files:**
- Create: `D:\hyjar\server\mimo-runner.js`

- [ ] **Step 1: 创建mimo-runner.js**

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
import config from './config.js';

const execAsync = promisify(exec);

export class MimoRunner {
  constructor() {
    this.timeout = config.mimo.timeout;
    this.maxOutputLength = config.mimo.maxOutputLength;
  }

  async executeCommand(command, args = []) {
    const fullCommand = `mi ${command} ${args.join(' ')}`;
    
    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: this.timeout,
        maxBuffer: 1024 * 1024 // 1MB
      });
      
      return {
        success: true,
        output: this.truncateOutput(stdout || stderr)
      };
    } catch (error) {
      return {
        success: false,
        output: error.message || '命令执行失败'
      };
    }
  }

  truncateOutput(output) {
    if (output.length > this.maxOutputLength) {
      return output.substring(0, this.maxOutputLength) + '\n... (输出已截断)';
    }
    return output;
  }

  async askQuestion(question) {
    return this.executeCommand('ask', [`"${question}"`]);
  }

  async reviewCode(code) {
    return this.executeCommand('review', [`"${code}"`]);
  }

  async listTasks() {
    return this.executeCommand('task', ['list']);
  }

  async createTask(summary) {
    return this.executeCommand('task', ['create', `"${summary}"`]);
  }

  async listProjects() {
    return this.executeCommand('project', ['list']);
  }
}

export default new MimoRunner();
```

- [ ] **Step 2: 测试MimoRunner**

```javascript
// 在server目录创建测试文件 test-mimo.js
import MimoRunner from './mimo-runner.js';

const runner = new MimoRunner();

async function test() {
  console.log('测试ask命令...');
  const result = await runner.askQuestion('你好');
  console.log(result);
}

test().catch(console.error);
```

```bash
cd D:\hyjar\server && node test-mimo.js
```

Expected: 返回MiMoCode的响应

- [ ] **Step 3: 提交代码**

```bash
git add server/mimo-runner.js server/test-mimo.js
git commit -m "feat: 实现MiMoCode调用模块"
```

---

### Task 3: 实现会话管理模块

**Covers:** [S3]

**Files:**
- Create: `D:\hyjar\server\session-manager.js`

- [ ] **Step 1: 创建session-manager.js**

```javascript
import config from './config.js';

export class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxHistoryLength = 20;
    this.sessionTimeout = 30 * 60 * 1000; // 30分钟
  }

  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        history: [],
        lastActivity: Date.now(),
        context: {}
      });
    }
    
    const session = this.sessions.get(userId);
    session.lastActivity = Date.now();
    return session;
  }

  addMessage(userId, role, content) {
    const session = this.getSession(userId);
    session.history.push({ role, content, timestamp: Date.now() });
    
    if (session.history.length > this.maxHistoryLength) {
      session.history.shift();
    }
  }

  getHistory(userId) {
    const session = this.getSession(userId);
    return session.history;
  }

  clearHistory(userId) {
    const session = this.getSession(userId);
    session.history = [];
  }

  setContext(userId, key, value) {
    const session = this.getSession(userId);
    session.context[key] = value;
  }

  getContext(userId, key) {
    const session = this.getSession(userId);
    return session.context[key];
  }

  isAllowedUser(userId) {
    if (config.wechat.allowedUsers.length === 0) {
      return true; // 如果白名单为空，则允许所有用户
    }
    return config.wechat.allowedUsers.includes(userId);
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, session] of this.sessions) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(userId);
      }
    }
  }
}

export default new SessionManager();
```

- [ ] **Step 2: 创建测试文件**

```javascript
// 在server目录创建测试文件 test-session.js
import SessionManager from './session-manager.js';

const manager = new SessionManager();

async function test() {
  console.log('测试会话管理...');
  
  const session = manager.getSession('test-user');
  console.log('会话:', session);
  
  manager.addMessage('test-user', 'user', '你好');
  manager.addMessage('test-user', 'assistant', '你好！有什么可以帮你的？');
  
  const history = manager.getHistory('test-user');
  console.log('历史记录:', history);
  
  console.log('是否允许用户:', manager.isAllowedUser('test-user'));
}

test().catch(console.error);
```

```bash
cd D:\hyjar\server && node test-session.js
```

Expected: 创建会话并添加消息记录

- [ ] **Step 3: 提交代码**

```bash
git add server/session-manager.js server/test-session.js
git commit -m "feat: 实现会话管理模块"
```

---

### Task 4: 实现微信机器人模块

**Covers:** [S4]

**Files:**
- Create: `D:\hyjar\server\wechat-bot.js`

- [ ] **Step 1: 创建wechat-bot.js**

```javascript
import { WechatyBuilder } from 'wechaty';
import config from './config.js';
import sessionManager from './session-manager.js';
import mimoRunner from './mimo-runner.js';

export class WechatBot {
  constructor() {
    this.bot = null;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('机器人已在运行中');
      return;
    }

    this.bot = WechatyBuilder.build({
      name: 'mimo-wechat-bot',
      puppet: 'wechaty-puppet-wechat'
    });

    this.bot.on('scan', (qrcode, status) => {
      console.log(`扫描二维码登录: ${status}`);
      console.log(`二维码链接: https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`);
    });

    this.bot.on('login', (user) => {
      console.log(`用户 ${user} 已登录`);
    });

    this.bot.on('message', async (message) => {
      await this.handleMessage(message);
    });

    this.bot.on('error', (error) => {
      console.error('机器人错误:', error);
    });

    await this.bot.start();
    this.isRunning = true;
    console.log('微信机器人已启动');
  }

  async stop() {
    if (this.bot) {
      await this.bot.stop();
      this.isRunning = false;
      console.log('微信机器人已停止');
    }
  }

  async handleMessage(message) {
    try {
      // 忽略自己发送的消息
      if (message.self()) return;

      const contact = message.talker();
      const userId = contact.id;
      const room = message.room();

      // 忽略群消息
      if (room) return;

      // 检查用户权限
      if (!sessionManager.isAllowedUser(userId)) {
        await message.say('抱歉，您没有使用权限。');
        return;
      }

      const text = message.text().trim();
      
      // 处理命令
      if (text.startsWith('/')) {
        await this.handleCommand(userId, text);
        return;
      }

      // 处理普通消息
      await this.handleChat(userId, text);

    } catch (error) {
      console.error('处理消息失败:', error);
      await message.say('处理消息时出错，请稍后重试。');
    }
  }

  async handleCommand(userId, command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    let response = '';

    switch (cmd) {
      case '/help':
        response = this.getHelpText();
        break;

      case '/ask':
        if (!args) {
          response = '请输入问题，例如: /ask 什么是摄影集？';
        } else {
          const result = await mimoRunner.askQuestion(args);
          response = result.output;
        }
        break;

      case '/code':
        if (!args) {
          response = '请输入要审查的代码，例如: /code function hello() {}';
        } else {
          const result = await mimoRunner.reviewCode(args);
          response = result.output;
        }
        break;

      case '/task':
        const taskResult = await mimoRunner.listTasks();
        response = taskResult.output;
        break;

      case '/project':
        const projectResult = await mimoRunner.listProjects();
        response = projectResult.output;
        break;

      case '/clear':
        sessionManager.clearHistory(userId);
        response = '对话历史已清空。';
        break;

      default:
        response = `未知命令: ${cmd}\n输入 /help 查看可用命令。`;
    }

    sessionManager.addMessage(userId, 'user', command);
    sessionManager.addMessage(userId, 'assistant', response);

    await this.sendReply(userId, response);
  }

  async handleChat(userId, text) {
    sessionManager.addMessage(userId, 'user', text);
    
    const result = await mimoRunner.askQuestion(text);
    const response = result.output;
    
    sessionManager.addMessage(userId, 'assistant', response);
    
    await this.sendReply(userId, response);
  }

  async sendReply(userId, text) {
    const contact = await this.bot.Contact.find({ id: userId });
    if (contact) {
      await contact.say(text);
    }
  }

  getHelpText() {
    return `
📋 MiMoCode 摄影集工具 - 命令列表

/help          - 显示此帮助信息
/ask <问题>    - 向MiMoCode提问
/code <代码>   - 审查代码
/task          - 查看任务列表
/project       - 查看项目列表
/clear         - 清空对话历史

💬 也可以直接发送消息与MiMoCode对话
    `.trim();
  }
}

export default new WechatBot();
```

- [ ] **Step 2: 创建测试文件**

```javascript
// 在server目录创建测试文件 test-bot.js
import WechatBot from './wechat-bot.js';

async function test() {
  console.log('测试微信机器人...');
  console.log('注意: 需要手动扫码登录');
  
  try {
    await WechatBot.start();
    console.log('机器人启动成功，请扫描二维码');
  } catch (error) {
    console.error('启动失败:', error);
  }
}

test().catch(console.error);
```

- [ ] **Step 3: 提交代码**

```bash
git add server/wechat-bot.js server/test-bot.js
git commit -m "feat: 实现微信机器人模块"
```

---

### Task 5: 完善主服务器

**Covers:** [S5]

**Files:**
- Modify: `D:\hyjar\server\index.js`

- [ ] **Step 1: 更新index.js**

```javascript
import express from 'express';
import config from './config.js';
import wechatBot from './wechat-bot.js';
import sessionManager from './session-manager.js';

const app = express();
const PORT = config.port;

app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    botRunning: wechatBot.isRunning
  });
});

// 获取会话信息
app.get('/session/:userId', (req, res) => {
  const session = sessionManager.getSession(req.params.userId);
  res.json(session);
});

// 启动服务器和机器人
async function startServer() {
  try {
    // 启动微信机器人
    await wechatBot.start();
    
    // 定期清理会话
    setInterval(() => {
      sessionManager.cleanup();
    }, 5 * 60 * 1000); // 每5分钟清理一次
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
    
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭...');
  await wechatBot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('正在关闭...');
  await wechatBot.stop();
  process.exit(0);
});

startServer();
```

- [ ] **Step 2: 更新package.json脚本**

```json
{
  "name": "mimo-wechat-server",
  "version": "1.0.0",
  "description": "MiMoCode微信接入服务器",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "node test-mimo.js && node test-session.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "wechaty": "^1.20.2",
    "wechaty-puppet-wechat": "^1.18.4"
  }
}
```

- [ ] **Step 3: 提交代码**

```bash
git add server/index.js server/package.json
git commit -m "feat: 完善主服务器和启动逻辑"
```

---

### Task 6: 创建使用文档

**Covers:** [S6]

**Files:**
- Create: `D:\hyjar\server\README.md`

- [ ] **Step 1: 创建README.md**

```markdown
# MiMoCode 微信接入服务器

将MiMoCode摄影集排版工具接入微信个人号，通过微信好友对话与MiMoCode交互。

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置

编辑 `config.js` 文件：

```javascript
export default {
  port: 3001,
  wechat: {
    // 设置允许使用的微信用户ID（留空则允许所有用户）
    allowedUsers: [],
    enableImage: true,
    maxMessageLength: 2000
  },
  mimo: {
    timeout: 30000,
    maxOutputLength: 4000
  }
};
```

### 3. 启动服务器

```bash
npm start
```

### 4. 扫码登录

启动后会显示二维码链接，用微信扫描即可登录。

## 功能说明

### 命令列表

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助信息 |
| `/ask <问题>` | 向MiMoCode提问 |
| `/code <代码>` | 审查代码 |
| `/task` | 查看任务列表 |
| `/project` | 查看项目列表 |
| `/clear` | 清空对话历史 |

### 直接对话

也可以直接发送消息与MiMoCode对话，系统会自动处理。

## 配置说明

### 用户白名单

在 `config.js` 中设置 `allowedUsers` 数组，包含允许使用的微信用户ID。

如果留空，则允许所有用户使用。

### 安全设置

- 命令执行超时：30秒
- 输出长度限制：4000字符
- 会话超时：30分钟

## 开发说明

### 测试

```bash
# 测试MiMoCode调用
npm run test-mimo

# 测试会话管理
npm run test-session

# 测试微信机器人（需要扫码）
npm run test-bot
```

### 架构

```
server/
├── index.js          # 主服务器入口
├── wechat-bot.js     # 微信机器人模块
├── mimo-runner.js    # MiMoCode调用模块
├── session-manager.js # 会话管理模块
├── config.js         # 配置文件
└── package.json      # 服务器依赖
```

## 常见问题

### Q: 无法登录微信

A: 确保微信账号正常，网络连接稳定。如果多次失败，尝试重启服务器。

### Q: 命令执行超时

A: 检查MiMoCode命令行工具是否正确安装，尝试增加 `config.js` 中的 `timeout` 值。

### Q: 如何限制用户访问

A: 在 `config.js` 的 `allowedUsers` 数组中添加允许的微信用户ID。

## 部署建议

1. 使用PM2或类似工具进行进程管理
2. 配置反向代理（Nginx）
3. 启用HTTPS
4. 定期备份会话数据

## 许可证

MIT License
```

- [ ] **Step 2: 提交代码**

```bash
git add server/README.md
git commit -m "docs: 添加微信接入服务器使用文档"
```

---

### Task 7: 集成到主项目

**Covers:** [S7]

**Files:**
- Modify: `D:\hyjar\package.json`

- [ ] **Step 1: 更新主项目package.json**

```json
{
  "name": "photo-album-tool",
  "version": "1.0.0",
  "description": "本地摄影集自动排版与导出工具",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "server": "cd server && npm start",
    "server:dev": "cd server && npm run dev"
  },
  "dependencies": {
    "exifr": "^7.1.3",
    "jspdf": "^4.2.1",
    "puppeteer-core": "^25.1.0"
  },
  "devDependencies": {
    "vite": "^8.0.16"
  }
}
```

- [ ] **Step 2: 更新.gitignore**

```
# 添加到.gitignore
node_modules/
dist/
*.pdf
*.crdownload
server/node_modules/
```

- [ ] **Step 3: 提交代码**

```bash
git add package.json .gitignore
git commit -m "feat: 集成微信服务器到主项目"
```

---

## 执行说明

1. **顺序执行**：按照Task 1-7的顺序执行
2. **测试验证**：每个Task完成后进行测试
3. **提交代码**：每个Task完成后提交代码
4. **错误处理**：遇到问题及时记录并解决

## 验证清单

- [ ] 服务器可以正常启动
- [ ] MiMoCode调用模块工作正常
- [ ] 会话管理模块工作正常
- [ ] 微信机器人可以扫码登录
- [ ] 可以接收和发送消息
- [ ] 命令系统工作正常
- [ ] 文档完整准确