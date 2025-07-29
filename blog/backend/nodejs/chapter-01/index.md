# 第1章：Node.js基础与环境搭建

## 本章目标

- 理解Node.js的核心概念和特点
- 掌握Node.js的安装和版本管理
- 配置高效的开发环境
- 编写并运行第一个Node.js程序
- 了解Node.js的应用场景

## 1.1 Node.js简介

### 什么是Node.js？

Node.js是一个基于Chrome V8 JavaScript引擎构建的JavaScript运行时环境。它让JavaScript能够在服务器端运行，打破了JavaScript只能在浏览器中运行的限制。

### 核心特点

#### 1. 事件驱动架构
```javascript
// 事件驱动示例
const EventEmitter = require('events');
const myEmitter = new EventEmitter();

// 注册事件监听器
myEmitter.on('data', (message) => {
    console.log('接收到数据:', message);
});

// 触发事件
myEmitter.emit('data', 'Hello Node.js!');
```

#### 2. 非阻塞I/O
```javascript
const fs = require('fs');

console.log('开始读取文件...');

// 异步读取文件，不会阻塞后续代码执行
fs.readFile('example.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    console.log('文件内容:', data);
});

console.log('这行代码会立即执行，不会等待文件读取完成');
```

#### 3. 单线程事件循环
Node.js使用单线程事件循环模型，但通过libuv库实现了高并发处理能力。

### Node.js vs 传统服务器技术

| 特性 | Node.js | 传统服务器(如Apache) |
|------|---------|---------------------|
| 并发模型 | 事件驱动，单线程 | 多线程/多进程 |
| 内存占用 | 低 | 高 |
| I/O处理 | 非阻塞 | 阻塞 |
| 开发语言 | JavaScript | PHP/Java/C# |
| 学习曲线 | 前端开发者友好 | 需要学习新语言 |

## 1.2 安装与版本管理

### 官方安装方式

1. **访问官网**：https://nodejs.org
2. **选择版本**：
   - LTS版本：长期支持版本，推荐生产环境使用
   - Current版本：最新特性版本，适合学习和实验

### 使用版本管理工具（推荐）

#### Windows - nvm-windows
```bash
# 安装nvm-windows后
nvm list available          # 查看可用版本
nvm install 18.17.0         # 安装指定版本
nvm use 18.17.0            # 切换到指定版本
nvm list                   # 查看已安装版本
```

#### macOS/Linux - nvm
```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装和使用Node.js
nvm install node           # 安装最新版本
nvm install 18.17.0        # 安装指定版本
nvm use 18.17.0           # 切换版本
nvm alias default 18.17.0 # 设置默认版本
```

### 验证安装

```bash
node --version    # 查看Node.js版本
npm --version     # 查看npm版本
```

## 1.3 开发环境配置

### 推荐的开发工具

#### 1. Visual Studio Code
- **插件推荐**：
  - Node.js Extension Pack
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API测试)

#### 2. 配置代码格式化
创建 `.prettierrc` 文件：
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

创建 `.eslintrc.js` 文件：
```javascript
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn',
  },
};
```

### 项目初始化

```bash
# 创建项目目录
mkdir my-node-project
cd my-node-project

# 初始化package.json
npm init -y

# 安装开发依赖
npm install --save-dev nodemon eslint prettier

# 创建基本目录结构
mkdir src tests docs
```

### package.json配置示例

```json
{
  "name": "my-node-project",
  "version": "1.0.0",
  "description": "Node.js学习项目",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "keywords": ["nodejs", "learning"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "nodemon": "^3.0.1",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0"
  }
}
```

## 1.4 第一个Node.js程序

### Hello World示例

创建 `src/index.js`：
```javascript
// 简单的Hello World
console.log('Hello, Node.js!');

// 显示Node.js版本信息
console.log('Node.js版本:', process.version);
console.log('平台:', process.platform);
console.log('架构:', process.arch);
```

运行程序：
```bash
node src/index.js
```

### 创建简单的HTTP服务器

创建 `src/server.js`：
```javascript
const http = require('http');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 设置响应头
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
    });
    
    // 发送响应内容
    res.end(`
        <h1>欢迎来到Node.js世界！</h1>
        <p>当前时间: ${new Date().toLocaleString()}</p>
        <p>请求URL: ${req.url}</p>
        <p>请求方法: ${req.method}</p>
    `);
});

// 监听端口
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
```

运行服务器：
```bash
node src/server.js
```

在浏览器中访问 `http://localhost:3000` 查看结果。

## 1.5 Node.js应用场景

### 适合的场景

1. **Web应用开发**
   - RESTful API
   - 单页应用后端
   - 微服务架构

2. **实时应用**
   - 聊天应用
   - 在线游戏
   - 协作工具

3. **工具开发**
   - 构建工具
   - 命令行工具
   - 自动化脚本

4. **数据处理**
   - 日志分析
   - 数据转换
   - 爬虫程序

### 不适合的场景

1. **CPU密集型任务**
   - 图像/视频处理
   - 复杂数学计算
   - 机器学习训练

2. **传统企业应用**
   - 需要强类型系统
   - 复杂的业务逻辑

## 本章小结

本章我们学习了：

1. **Node.js基础概念**：事件驱动、非阻塞I/O、单线程事件循环
2. **安装配置**：官方安装、版本管理工具使用
3. **开发环境**：IDE配置、项目初始化、代码规范
4. **第一个程序**：Hello World和简单HTTP服务器
5. **应用场景**：了解Node.js的优势和局限性

## 练习题

1. 安装Node.js并验证版本
2. 创建一个显示系统信息的程序
3. 修改HTTP服务器，添加不同路由的处理
4. 配置开发环境并运行示例代码

## 下一章预告

下一章我们将深入学习Node.js的模块系统，包括CommonJS和ES Modules的使用方法和最佳实践。

---

[返回目录](../) | [下一章：模块系统深入理解](../chapter-02/)
