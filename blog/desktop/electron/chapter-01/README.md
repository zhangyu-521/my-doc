# 第1章：Electron 基础入门

> 了解 Electron 的核心概念，搭建开发环境，创建第一个桌面应用

## 1.1 什么是 Electron

Electron 是一个开源框架，允许开发者使用 Web 技术（HTML、CSS、JavaScript）来构建跨平台的桌面应用程序。它由 GitHub 开发，最初被称为 Atom Shell。

### 核心特点

- **跨平台**：一套代码可以运行在 Windows、macOS 和 Linux 上
- **Web 技术栈**：使用熟悉的前端技术开发桌面应用
- **丰富的生态**：可以使用 npm 生态系统中的所有包
- **原生能力**：提供访问操作系统原生 API 的能力

### 知名应用案例

- **VS Code** - 微软的代码编辑器
- **Discord** - 流行的语音聊天应用
- **Slack** - 团队协作工具
- **WhatsApp Desktop** - 即时通讯应用
- **Figma Desktop** - 设计工具

## 1.2 Electron 架构原理

Electron 结合了 Chromium 渲染引擎和 Node.js 运行时，让你能够使用 JavaScript 构建桌面应用。

### 核心组件

```
┌─────────────────────────────────────┐
│            Electron App             │
├─────────────────────────────────────┤
│  Main Process (Node.js Runtime)    │
│  ├─ 应用生命周期管理                │
│  ├─ 创建和管理渲染进程              │
│  └─ 原生 API 访问                   │
├─────────────────────────────────────┤
│  Renderer Process (Chromium)       │
│  ├─ HTML/CSS/JavaScript            │
│  ├─ Web APIs                       │
│  └─ 部分 Node.js APIs              │
└─────────────────────────────────────┘
```

### 进程模型

1. **主进程 (Main Process)**
   - 每个 Electron 应用只有一个主进程
   - 负责管理应用生命周期
   - 创建和控制渲染进程
   - 处理原生 API 调用

2. **渲染进程 (Renderer Process)**
   - 每个窗口对应一个渲染进程
   - 运行 Web 页面和 JavaScript 代码
   - 通过 IPC 与主进程通信

## 1.3 开发环境搭建

### 系统要求

- **Node.js** 16.0 或更高版本
- **npm** 或 **yarn** 包管理器
- **Git** 版本控制工具

### 安装 Node.js

访问 [Node.js 官网](https://nodejs.org/) 下载并安装最新的 LTS 版本。

验证安装：
```bash
node --version
npm --version
```

### 推荐开发工具

- **VS Code** - 强烈推荐，有丰富的 Electron 开发插件
- **Chrome DevTools** - 用于调试渲染进程
- **Electron DevTools** - 专门的 Electron 调试工具

## 1.4 创建第一个 Electron 应用

让我们从零开始创建一个简单的 "Hello World" 应用。

### 步骤 1：初始化项目

```bash
# 创建项目目录
mkdir my-electron-app
cd my-electron-app

# 初始化 npm 项目
npm init -y
```

### 步骤 2：安装 Electron

```bash
# 安装 Electron 作为开发依赖
npm install electron --save-dev
```

### 步骤 3：创建主进程文件

创建 `main.js` 文件：

```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')

// 创建窗口函数
function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 加载 index.html
  mainWindow.loadFile('index.html')

  // 打开开发者工具（可选）
  // mainWindow.webContents.openDevTools()
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow)

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，应用和菜单栏通常会保持活跃状态
  // 直到用户使用 Cmd + Q 明确退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时
  // 通常会重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

### 步骤 4：创建 HTML 页面

创建 `index.html` 文件：

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>我的第一个 Electron 应用</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        h1 {
            font-size: 3em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        p {
            font-size: 1.2em;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        
        .info {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px auto;
            max-width: 500px;
        }
    </style>
</head>
<body>
    <h1>🚀 Hello Electron!</h1>
    <p>欢迎来到 Electron 的世界</p>
    
    <div class="info">
        <p><strong>Node.js 版本:</strong> <span id="node-version"></span></p>
        <p><strong>Chromium 版本:</strong> <span id="chrome-version"></span></p>
        <p><strong>Electron 版本:</strong> <span id="electron-version"></span></p>
    </div>

    <script src="./renderer.js"></script>
</body>
</html>
```

### 步骤 5：创建渲染进程脚本

创建 `renderer.js` 文件：

```javascript
// 显示版本信息
document.getElementById('node-version').innerText = process.versions.node
document.getElementById('chrome-version').innerText = process.versions.chrome
document.getElementById('electron-version').innerText = process.versions.electron

// 添加一些交互功能
document.addEventListener('DOMContentLoaded', () => {
    console.log('Electron 应用已加载完成!')
    
    // 添加点击事件
    document.body.addEventListener('click', () => {
        console.log('页面被点击了!')
    })
})
```

### 步骤 6：配置 package.json

修改 `package.json` 文件：

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "description": "我的第一个 Electron 应用",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --enable-logging"
  },
  "keywords": ["electron", "desktop", "app"],
  "author": "你的名字",
  "license": "MIT",
  "devDependencies": {
    "electron": "^latest"
  }
}
```

### 步骤 7：运行应用

```bash
npm start
```

恭喜！你的第一个 Electron 应用现在应该已经运行起来了。

## 1.5 项目结构解析

```
my-electron-app/
├── package.json          # 项目配置文件
├── main.js              # 主进程入口文件
├── index.html           # 应用的 HTML 页面
├── renderer.js          # 渲染进程脚本
└── node_modules/        # 依赖包目录
```

### 文件说明

- **main.js**: 主进程的入口点，负责应用生命周期和窗口管理
- **index.html**: 应用的用户界面，在渲染进程中显示
- **renderer.js**: 渲染进程的 JavaScript 代码
- **package.json**: 定义应用元数据和依赖关系

## 1.6 常见问题和解决方案

### 问题 1：应用无法启动

**解决方案**：
- 检查 Node.js 版本是否符合要求
- 确保 package.json 中的 main 字段指向正确的文件
- 检查主进程文件中的语法错误

### 问题 2：页面显示空白

**解决方案**：
- 检查 HTML 文件路径是否正确
- 确保 webPreferences 配置正确
- 打开开发者工具查看控制台错误

### 问题 3：安全警告

**解决方案**：
- 设置适当的 Content Security Policy
- 避免在生产环境中启用 nodeIntegration
- 使用 contextIsolation 和 preload 脚本

## 1.7 下一步学习

在下一章中，我们将深入学习：
- 主进程和渲染进程的详细区别
- 进程间的通信机制
- 如何正确管理应用的生命周期

## 本章小结

通过本章学习，你应该已经：
- ✅ 理解了 Electron 的基本概念和架构
- ✅ 搭建了 Electron 开发环境
- ✅ 创建并运行了第一个 Electron 应用
- ✅ 了解了基本的项目结构

继续下一章的学习，我们将深入探讨 Electron 的进程模型！
