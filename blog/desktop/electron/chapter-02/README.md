# 第2章：主进程与渲染进程

> 深入理解 Electron 的双进程架构，掌握主进程和渲染进程的职责分工

## 2.1 Electron 进程模型概述

Electron 采用多进程架构，这种设计借鉴了现代浏览器的架构模式，提供了更好的稳定性和安全性。

### 为什么需要多进程架构？

1. **稳定性**：一个进程崩溃不会影响其他进程
2. **安全性**：渲染进程运行在沙箱环境中
3. **性能**：可以充分利用多核 CPU
4. **隔离性**：不同窗口之间相互独立

### 进程架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Electron 应用                        │
├─────────────────────────────────────────────────────────┤
│                   主进程 (Main Process)                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ • 应用生命周期管理                                   │ │
│  │ • 创建和管理 BrowserWindow                          │ │
│  │ • 处理系统事件                                       │ │
│  │ • 原生 API 访问                                     │ │
│  │ • IPC 通信中心                                      │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 渲染进程 (Renderer Process)              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐ │
│  │   窗口 1        │  │   窗口 2        │  │   ...    │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │          │ │
│  │ │ HTML/CSS/JS │ │  │ │ HTML/CSS/JS │ │  │          │ │
│  │ │ Web APIs    │ │  │ │ Web APIs    │ │  │          │ │
│  │ │ 部分Node.js │ │  │ │ 部分Node.js │ │  │          │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │          │ │
│  └─────────────────┘  └─────────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2.2 主进程 (Main Process)

主进程是 Electron 应用的核心，负责整个应用的生命周期管理和系统级操作。

### 主进程的职责

1. **应用生命周期管理**
   - 应用启动和退出
   - 处理应用级事件
   - 管理应用状态

2. **窗口管理**
   - 创建和销毁 BrowserWindow
   - 控制窗口属性和行为
   - 管理多窗口应用

3. **系统集成**
   - 访问原生 API
   - 处理系统通知
   - 管理菜单和托盘

4. **进程间通信**
   - 作为 IPC 通信的中心
   - 协调不同渲染进程

### 主进程示例代码

创建 `main-process-demo.js`：

```javascript
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron')
const path = require('path')

class MainProcess {
  constructor() {
    this.windows = new Set()
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    // 应用准备就绪
    app.whenReady().then(() => {
      this.createMainWindow()
      this.setupMenu()
      this.setupIPC()
    })

    // 所有窗口关闭
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    // 应用激活 (macOS)
    app.on('activate', () => {
      if (this.windows.size === 0) {
        this.createMainWindow()
      }
    })

    // 应用即将退出
    app.on('before-quit', (event) => {
      console.log('应用即将退出')
      // 可以在这里保存应用状态
    })
  }

  createMainWindow() {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    mainWindow.loadFile('index.html')
    
    // 窗口关闭时从集合中移除
    mainWindow.on('closed', () => {
      this.windows.delete(mainWindow)
    })

    this.windows.add(mainWindow)
    return mainWindow
  }

  setupMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '新建窗口',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.createMainWindow()
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  setupIPC() {
    // 处理来自渲染进程的消息
    ipcMain.handle('get-app-info', () => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch
      }
    })

    ipcMain.handle('show-message-box', async (event, options) => {
      const result = await dialog.showMessageBox(options)
      return result
    })
  }
}

// 创建主进程实例
new MainProcess()
```

## 2.3 渲染进程 (Renderer Process)

渲染进程负责显示用户界面，每个 BrowserWindow 都对应一个独立的渲染进程。

### 渲染进程的特点

1. **基于 Chromium**
   - 支持最新的 Web 标准
   - 强大的 JavaScript 引擎
   - 完整的 DOM API

2. **沙箱环境**
   - 默认运行在安全沙箱中
   - 限制对系统资源的直接访问
   - 通过 IPC 与主进程通信

3. **Web 技术栈**
   - HTML/CSS/JavaScript
   - 现代前端框架支持
   - 丰富的 Web API

### 渲染进程安全配置

```javascript
// 安全的 webPreferences 配置
const secureWebPreferences = {
  nodeIntegration: false,        // 禁用 Node.js 集成
  contextIsolation: true,        // 启用上下文隔离
  enableRemoteModule: false,     // 禁用 remote 模块
  preload: path.join(__dirname, 'preload.js'), // 使用预加载脚本
  sandbox: true                  // 启用沙箱模式（可选）
}
```

### Preload 脚本

Preload 脚本在渲染进程中运行，但在网页脚本执行之前加载，是连接主进程和渲染进程的桥梁。

创建 `preload.js`：

```javascript
const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // 显示消息框
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // 监听主进程消息
  onMessage: (callback) => {
    ipcRenderer.on('main-message', (event, data) => callback(data))
  },
  
  // 发送消息到主进程
  sendMessage: (message) => {
    ipcRenderer.send('renderer-message', message)
  }
})

// 在页面加载完成后执行
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script loaded')
})
```

### 渲染进程示例

创建 `renderer.js`：

```javascript
class RendererProcess {
  constructor() {
    this.init()
  }

  async init() {
    await this.loadAppInfo()
    this.setupEventListeners()
  }

  async loadAppInfo() {
    try {
      const appInfo = await window.electronAPI.getAppInfo()
      this.displayAppInfo(appInfo)
    } catch (error) {
      console.error('获取应用信息失败:', error)
    }
  }

  displayAppInfo(info) {
    const container = document.getElementById('app-info')
    if (container) {
      container.innerHTML = `
        <h3>应用信息</h3>
        <p><strong>名称:</strong> ${info.name}</p>
        <p><strong>版本:</strong> ${info.version}</p>
        <p><strong>平台:</strong> ${info.platform}</p>
        <p><strong>架构:</strong> ${info.arch}</p>
      `
    }
  }

  setupEventListeners() {
    // 按钮点击事件
    const messageBtn = document.getElementById('show-message')
    if (messageBtn) {
      messageBtn.addEventListener('click', this.showMessage.bind(this))
    }

    // 监听主进程消息
    window.electronAPI.onMessage((data) => {
      console.log('收到主进程消息:', data)
    })
  }

  async showMessage() {
    const options = {
      type: 'info',
      title: '来自渲染进程的消息',
      message: '这是一个来自渲染进程的消息框',
      buttons: ['确定', '取消']
    }

    try {
      const result = await window.electronAPI.showMessageBox(options)
      console.log('用户选择:', result.response)
    } catch (error) {
      console.error('显示消息框失败:', error)
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new RendererProcess()
})
```

## 2.4 进程生命周期管理

### 主进程生命周期

```javascript
const { app } = require('electron')

// 应用事件监听
app.on('ready', () => {
  console.log('应用已准备就绪')
})

app.on('window-all-closed', () => {
  console.log('所有窗口已关闭')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  console.log('应用即将退出')
  // 可以调用 event.preventDefault() 阻止退出
})

app.on('will-quit', (event) => {
  console.log('应用将要退出')
  // 最后的清理机会
})

app.on('activate', () => {
  console.log('应用被激活 (macOS)')
})
```

### 渲染进程生命周期

```javascript
// 页面加载事件
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 内容已加载')
})

window.addEventListener('load', () => {
  console.log('页面完全加载')
})

window.addEventListener('beforeunload', (event) => {
  console.log('页面即将卸载')
  // 可以显示确认对话框
  event.returnValue = '确定要离开吗？'
})

window.addEventListener('unload', () => {
  console.log('页面正在卸载')
})
```

## 2.5 进程间的数据共享

### 共享数据的方式

1. **IPC 通信** (推荐)
2. **文件系统**
3. **数据库**
4. **内存映射文件**

### 最佳实践

```javascript
// 主进程中的数据管理
class DataManager {
  constructor() {
    this.appData = {
      settings: {},
      userPreferences: {},
      cache: new Map()
    }
  }

  getData(key) {
    return this.appData[key]
  }

  setData(key, value) {
    this.appData[key] = value
    // 通知所有渲染进程数据更新
    this.notifyRenderers('data-updated', { key, value })
  }

  notifyRenderers(channel, data) {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(channel, data)
    })
  }
}
```

## 2.6 调试技巧

### 主进程调试

```bash
# 启用主进程调试
electron --inspect=5858 .

# 或者在代码中添加
process.debugPort = 5858
```

### 渲染进程调试

```javascript
// 在主进程中打开开发者工具
mainWindow.webContents.openDevTools()

// 或者使用快捷键 F12
```

### 日志管理

```javascript
// 主进程日志
const log = require('electron-log')
log.info('这是一条信息日志')
log.error('这是一条错误日志')

// 渲染进程日志
console.log('渲染进程日志')
```

## 2.7 性能优化建议

1. **合理使用进程**
   - 避免创建过多窗口
   - 及时关闭不需要的窗口

2. **内存管理**
   - 监控内存使用情况
   - 及时清理不需要的数据

3. **IPC 优化**
   - 减少不必要的通信
   - 使用批量操作

## 本章小结

通过本章学习，你应该已经：
- ✅ 理解了 Electron 的双进程架构
- ✅ 掌握了主进程和渲染进程的职责分工
- ✅ 学会了使用 Preload 脚本进行安全通信
- ✅ 了解了进程生命周期管理
- ✅ 掌握了基本的调试技巧

在下一章中，我们将深入学习 BrowserWindow API 和窗口管理技巧！
