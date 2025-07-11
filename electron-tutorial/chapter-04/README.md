# 第4章：进程间通信(IPC)

> 掌握 Electron 中主进程与渲染进程之间的通信机制，实现数据交换和功能调用

## 4.1 IPC 通信概述

进程间通信(Inter-Process Communication, IPC)是 Electron 应用的核心机制，它允许主进程和渲染进程之间安全地交换数据和调用功能。

### 为什么需要 IPC？

1. **安全性**：渲染进程运行在沙箱环境中，无法直接访问 Node.js API
2. **架构分离**：主进程负责系统级操作，渲染进程负责 UI 展示
3. **数据同步**：多个窗口之间需要共享数据和状态
4. **功能调用**：渲染进程需要调用主进程的原生功能

### IPC 通信模式

```
┌─────────────────────────────────────────────────────────┐
│                    IPC 通信架构                          │
├─────────────────────────────────────────────────────────┤
│  主进程 (Main Process)                                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ipcMain                                             │ │
│  │ ├─ handle() - 处理异步请求                          │ │
│  │ ├─ on() - 监听消息                                  │ │
│  │ └─ send() - 发送消息到渲染进程                      │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  渲染进程 (Renderer Process)                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ipcRenderer (通过 preload 脚本暴露)                 │ │
│  │ ├─ invoke() - 发送异步请求                          │ │
│  │ ├─ send() - 发送消息                                │ │
│  │ └─ on() - 监听消息                                  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 4.2 基础 IPC 通信

### 异步请求-响应模式

这是最常用的 IPC 通信模式，适用于需要返回值的操作。

**主进程代码 (main.js)**：
```javascript
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// 处理异步请求
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-system-info', async () => {
  const os = require('os')
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length
  }
})

ipcMain.handle('calculate-sum', async (event, numbers) => {
  // 模拟异步计算
  await new Promise(resolve => setTimeout(resolve, 100))
  return numbers.reduce((sum, num) => sum + num, 0)
})

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)
```

**预加载脚本 (preload.js)**：
```javascript
const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 获取系统信息
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // 计算数组和
  calculateSum: (numbers) => ipcRenderer.invoke('calculate-sum', numbers)
})
```

**渲染进程代码 (renderer.js)**：
```javascript
class IPCDemo {
  constructor() {
    this.init()
  }

  async init() {
    await this.loadAppInfo()
    this.setupEventListeners()
  }

  async loadAppInfo() {
    try {
      // 获取应用版本
      const version = await window.electronAPI.getAppVersion()
      document.getElementById('app-version').textContent = version

      // 获取系统信息
      const systemInfo = await window.electronAPI.getSystemInfo()
      this.displaySystemInfo(systemInfo)
    } catch (error) {
      console.error('获取应用信息失败:', error)
    }
  }

  displaySystemInfo(info) {
    const container = document.getElementById('system-info')
    container.innerHTML = `
      <h3>系统信息</h3>
      <p><strong>平台:</strong> ${info.platform}</p>
      <p><strong>架构:</strong> ${info.arch}</p>
      <p><strong>Node.js:</strong> ${info.nodeVersion}</p>
      <p><strong>CPU 核心:</strong> ${info.cpus}</p>
      <p><strong>总内存:</strong> ${(info.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB</p>
      <p><strong>可用内存:</strong> ${(info.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB</p>
    `
  }

  setupEventListeners() {
    const calculateBtn = document.getElementById('calculate-btn')
    calculateBtn.addEventListener('click', this.handleCalculate.bind(this))
  }

  async handleCalculate() {
    const input = document.getElementById('numbers-input')
    const numbers = input.value.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n))
    
    if (numbers.length === 0) {
      alert('请输入有效的数字，用逗号分隔')
      return
    }

    try {
      const sum = await window.electronAPI.calculateSum(numbers)
      document.getElementById('result').textContent = `计算结果: ${sum}`
    } catch (error) {
      console.error('计算失败:', error)
      alert('计算失败')
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new IPCDemo()
})
```

## 4.3 单向消息传递

### 渲染进程到主进程

**主进程代码**：
```javascript
// 监听来自渲染进程的消息
ipcMain.on('user-action', (event, data) => {
  console.log('用户操作:', data)
  
  // 可以根据消息类型执行不同操作
  switch (data.type) {
    case 'save-file':
      handleSaveFile(data.content)
      break
    case 'open-external':
      require('electron').shell.openExternal(data.url)
      break
    case 'show-notification':
      showNotification(data.title, data.body)
      break
  }
})

function handleSaveFile(content) {
  const { dialog } = require('electron')
  const fs = require('fs')
  
  dialog.showSaveDialog({
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  }).then(result => {
    if (!result.canceled) {
      fs.writeFileSync(result.filePath, content)
    }
  })
}

function showNotification(title, body) {
  const { Notification } = require('electron')
  new Notification({ title, body }).show()
}
```

**预加载脚本**：
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送用户操作消息
  sendUserAction: (data) => ipcRenderer.send('user-action', data),
  
  // 保存文件
  saveFile: (content) => ipcRenderer.send('user-action', {
    type: 'save-file',
    content
  }),
  
  // 打开外部链接
  openExternal: (url) => ipcRenderer.send('user-action', {
    type: 'open-external',
    url
  }),
  
  // 显示通知
  showNotification: (title, body) => ipcRenderer.send('user-action', {
    type: 'show-notification',
    title,
    body
  })
})
```

### 主进程到渲染进程

**主进程代码**：
```javascript
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
}

// 发送消息到渲染进程
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

// 定时发送状态更新
setInterval(() => {
  sendToRenderer('status-update', {
    timestamp: Date.now(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  })
}, 5000)

// 监听系统事件并通知渲染进程
const { powerMonitor } = require('electron')

powerMonitor.on('suspend', () => {
  sendToRenderer('system-event', { type: 'suspend' })
})

powerMonitor.on('resume', () => {
  sendToRenderer('system-event', { type: 'resume' })
})
```

**预加载脚本**：
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // 监听状态更新
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data))
  },
  
  // 监听系统事件
  onSystemEvent: (callback) => {
    ipcRenderer.on('system-event', (event, data) => callback(data))
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
```

**渲染进程代码**：
```javascript
class StatusMonitor {
  constructor() {
    this.setupListeners()
  }

  setupListeners() {
    // 监听状态更新
    window.electronAPI.onStatusUpdate((data) => {
      this.updateStatus(data)
    })

    // 监听系统事件
    window.electronAPI.onSystemEvent((event) => {
      this.handleSystemEvent(event)
    })
  }

  updateStatus(data) {
    const statusElement = document.getElementById('status')
    statusElement.innerHTML = `
      <p><strong>时间:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
      <p><strong>内存使用:</strong> ${Math.round(data.memory.heapUsed / 1024 / 1024)} MB</p>
      <p><strong>运行时间:</strong> ${Math.round(data.uptime)} 秒</p>
    `
  }

  handleSystemEvent(event) {
    const message = event.type === 'suspend' ? '系统即将休眠' : '系统已恢复'
    this.showMessage(message)
  }

  showMessage(message) {
    const messageElement = document.getElementById('messages')
    const p = document.createElement('p')
    p.textContent = `${new Date().toLocaleTimeString()}: ${message}`
    messageElement.appendChild(p)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StatusMonitor()
})
```

## 4.4 高级 IPC 模式

### 错误处理

```javascript
// 主进程 - 带错误处理的 IPC
ipcMain.handle('risky-operation', async (event, data) => {
  try {
    // 模拟可能失败的操作
    if (Math.random() < 0.3) {
      throw new Error('操作失败')
    }
    
    return { success: true, result: '操作成功' }
  } catch (error) {
    // 返回错误信息而不是抛出异常
    return { 
      success: false, 
      error: error.message,
      code: 'OPERATION_FAILED'
    }
  }
})

// 渲染进程 - 处理错误响应
async function performRiskyOperation() {
  try {
    const response = await window.electronAPI.performRiskyOperation()
    
    if (response.success) {
      console.log('操作成功:', response.result)
    } else {
      console.error('操作失败:', response.error)
      // 根据错误代码执行不同的处理逻辑
      switch (response.code) {
        case 'OPERATION_FAILED':
          showErrorMessage('操作失败，请重试')
          break
        default:
          showErrorMessage('未知错误')
      }
    }
  } catch (error) {
    console.error('IPC 调用失败:', error)
  }
}
```

### 进度回调

```javascript
// 主进程 - 支持进度回调的长时间操作
ipcMain.handle('long-operation', async (event, data) => {
  const total = 100
  
  for (let i = 0; i <= total; i++) {
    // 模拟耗时操作
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 发送进度更新
    event.sender.send('operation-progress', {
      current: i,
      total: total,
      percentage: Math.round((i / total) * 100)
    })
  }
  
  return { completed: true, result: '操作完成' }
})

// 预加载脚本
contextBridge.exposeInMainWorld('electronAPI', {
  startLongOperation: (data) => ipcRenderer.invoke('long-operation', data),
  onOperationProgress: (callback) => {
    ipcRenderer.on('operation-progress', (event, progress) => callback(progress))
  }
})

// 渲染进程 - 显示进度
class ProgressDemo {
  constructor() {
    this.setupProgressListener()
  }

  setupProgressListener() {
    window.electronAPI.onOperationProgress((progress) => {
      this.updateProgress(progress)
    })
  }

  async startOperation() {
    const progressBar = document.getElementById('progress-bar')
    const progressText = document.getElementById('progress-text')
    
    progressBar.style.display = 'block'
    
    try {
      const result = await window.electronAPI.startLongOperation({})
      console.log('操作完成:', result)
      progressText.textContent = '操作完成！'
    } catch (error) {
      console.error('操作失败:', error)
      progressText.textContent = '操作失败'
    }
  }

  updateProgress(progress) {
    const progressBar = document.getElementById('progress-bar')
    const progressText = document.getElementById('progress-text')
    
    progressBar.value = progress.percentage
    progressText.textContent = `进度: ${progress.current}/${progress.total} (${progress.percentage}%)`
  }
}
```

### 数据流管理

```javascript
// 主进程 - 数据流管理器
class DataStreamManager {
  constructor() {
    this.streams = new Map()
    this.setupIPC()
  }

  setupIPC() {
    ipcMain.handle('create-stream', (event, streamId) => {
      const stream = {
        id: streamId,
        data: [],
        subscribers: new Set([event.sender])
      }
      this.streams.set(streamId, stream)
      return { success: true, streamId }
    })

    ipcMain.handle('subscribe-stream', (event, streamId) => {
      const stream = this.streams.get(streamId)
      if (stream) {
        stream.subscribers.add(event.sender)
        return { success: true }
      }
      return { success: false, error: 'Stream not found' }
    })

    ipcMain.on('stream-data', (event, { streamId, data }) => {
      this.pushData(streamId, data)
    })
  }

  pushData(streamId, data) {
    const stream = this.streams.get(streamId)
    if (stream) {
      stream.data.push({ timestamp: Date.now(), data })

      // 通知所有订阅者
      stream.subscribers.forEach(subscriber => {
        if (!subscriber.isDestroyed()) {
          subscriber.send('stream-update', { streamId, data })
        }
      })
    }
  }
}

new DataStreamManager()
```

## 4.5 IPC 安全最佳实践

### 输入验证

```javascript
// 主进程 - 输入验证
const Joi = require('joi')

const schemas = {
  userProfile: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    email: Joi.string().email().required(),
    age: Joi.number().integer().min(0).max(150)
  }),

  fileOperation: Joi.object({
    path: Joi.string().required(),
    operation: Joi.string().valid('read', 'write', 'delete').required(),
    content: Joi.string().when('operation', {
      is: 'write',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  })
}

ipcMain.handle('update-user-profile', async (event, data) => {
  try {
    // 验证输入数据
    const { error, value } = schemas.userProfile.validate(data)
    if (error) {
      return { success: false, error: error.details[0].message }
    }

    // 处理验证后的数据
    const result = await updateUserProfile(value)
    return { success: true, result }
  } catch (err) {
    return { success: false, error: err.message }
  }
})
```

### 权限控制

```javascript
// 主进程 - 权限控制系统
class PermissionManager {
  constructor() {
    this.permissions = new Map()
  }

  setPermissions(windowId, permissions) {
    this.permissions.set(windowId, new Set(permissions))
  }

  hasPermission(windowId, permission) {
    const perms = this.permissions.get(windowId)
    return perms && perms.has(permission)
  }

  checkPermission(event, permission) {
    const windowId = event.sender.id
    if (!this.hasPermission(windowId, permission)) {
      throw new Error(`Permission denied: ${permission}`)
    }
  }
}

const permissionManager = new PermissionManager()

// 设置窗口权限
function createWindow(permissions = []) {
  const window = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  permissionManager.setPermissions(window.webContents.id, permissions)
  return window
}

// 需要权限的 IPC 处理器
ipcMain.handle('read-sensitive-data', async (event) => {
  try {
    permissionManager.checkPermission(event, 'read-sensitive')
    return await readSensitiveData()
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```

## 4.6 性能优化

### 批量操作

```javascript
// 主进程 - 批量处理
class BatchProcessor {
  constructor() {
    this.batches = new Map()
    this.batchTimeout = 100 // 100ms
  }

  addToBatch(batchId, item) {
    if (!this.batches.has(batchId)) {
      this.batches.set(batchId, {
        items: [],
        timeout: null
      })
    }

    const batch = this.batches.get(batchId)
    batch.items.push(item)

    // 重置定时器
    if (batch.timeout) {
      clearTimeout(batch.timeout)
    }

    batch.timeout = setTimeout(() => {
      this.processBatch(batchId)
    }, this.batchTimeout)
  }

  async processBatch(batchId) {
    const batch = this.batches.get(batchId)
    if (!batch || batch.items.length === 0) return

    try {
      const results = await this.processItems(batch.items)
      // 通知结果
      batch.items.forEach((item, index) => {
        if (item.sender && !item.sender.isDestroyed()) {
          item.sender.send('batch-result', {
            id: item.id,
            result: results[index]
          })
        }
      })
    } catch (error) {
      console.error('批量处理失败:', error)
    } finally {
      this.batches.delete(batchId)
    }
  }

  async processItems(items) {
    // 批量处理逻辑
    return items.map(item => ({ processed: true, data: item.data }))
  }
}

const batchProcessor = new BatchProcessor()

ipcMain.on('add-to-batch', (event, { batchId, id, data }) => {
  batchProcessor.addToBatch(batchId, {
    id,
    data,
    sender: event.sender
  })
})
```

### 缓存机制

```javascript
// 主进程 - 智能缓存
class IPCCache {
  constructor() {
    this.cache = new Map()
    this.ttl = new Map() // Time To Live
    this.defaultTTL = 5 * 60 * 1000 // 5分钟
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value)
    this.ttl.set(key, Date.now() + ttl)
  }

  get(key) {
    if (this.isExpired(key)) {
      this.delete(key)
      return null
    }
    return this.cache.get(key)
  }

  isExpired(key) {
    const expireTime = this.ttl.get(key)
    return expireTime && Date.now() > expireTime
  }

  delete(key) {
    this.cache.delete(key)
    this.ttl.delete(key)
  }

  clear() {
    this.cache.clear()
    this.ttl.clear()
  }
}

const ipcCache = new IPCCache()

ipcMain.handle('get-cached-data', async (event, key) => {
  // 先检查缓存
  let data = ipcCache.get(key)

  if (!data) {
    // 缓存未命中，获取数据
    data = await fetchExpensiveData(key)
    ipcCache.set(key, data)
  }

  return data
})
```

## 4.7 调试和监控

### IPC 调试工具

```javascript
// 主进程 - IPC 调试器
class IPCDebugger {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'development'
    this.logs = []
    this.maxLogs = 1000
  }

  log(type, channel, data, sender) {
    if (!this.enabled) return

    const logEntry = {
      timestamp: Date.now(),
      type,
      channel,
      data: JSON.stringify(data),
      senderId: sender ? sender.id : null
    }

    this.logs.push(logEntry)

    // 保持日志数量限制
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    console.log(`[IPC ${type}] ${channel}:`, data)
  }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }
}

const ipcDebugger = new IPCDebugger()

// 包装原始的 IPC 方法
const originalHandle = ipcMain.handle
const originalOn = ipcMain.on

ipcMain.handle = function(channel, listener) {
  return originalHandle.call(this, channel, async (event, ...args) => {
    ipcDebugger.log('HANDLE', channel, args, event.sender)
    const result = await listener(event, ...args)
    ipcDebugger.log('HANDLE_RESULT', channel, result, event.sender)
    return result
  })
}

ipcMain.on = function(channel, listener) {
  return originalOn.call(this, channel, (event, ...args) => {
    ipcDebugger.log('ON', channel, args, event.sender)
    return listener(event, ...args)
  })
}

// 提供调试信息的 IPC 接口
ipcMain.handle('get-ipc-logs', () => {
  return ipcDebugger.getLogs()
})
```

## 本章小结

通过本章学习，你应该已经：
- ✅ 理解了 IPC 通信的基本概念和重要性
- ✅ 掌握了异步请求-响应模式的使用
- ✅ 学会了单向消息传递的实现
- ✅ 了解了高级 IPC 模式和错误处理
- ✅ 掌握了进度回调的实现方法
- ✅ 学会了数据流管理和批量处理
- ✅ 了解了 IPC 安全最佳实践
- ✅ 掌握了性能优化和调试技巧

在下一章中，我们将学习如何创建应用菜单和快捷键！
