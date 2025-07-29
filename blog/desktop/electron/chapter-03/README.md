# 第3章：窗口管理与 BrowserWindow

> 掌握 BrowserWindow API，学会创建和管理各种类型的应用窗口

## 3.1 BrowserWindow 基础

BrowserWindow 是 Electron 中最重要的类之一，它代表一个应用窗口，负责创建和控制浏览器窗口。

### 基本概念

- 每个 BrowserWindow 实例代表一个应用窗口
- 每个窗口运行在独立的渲染进程中
- 窗口可以加载本地文件或远程 URL
- 支持丰富的配置选项和事件处理

### 创建基本窗口

```javascript
const { BrowserWindow } = require('electron')

function createWindow() {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    title: '我的应用窗口'
  })

  window.loadFile('index.html')
  return window
}
```

## 3.2 窗口配置选项

BrowserWindow 提供了丰富的配置选项来定制窗口的外观和行为。

### 尺寸和位置

```javascript
const window = new BrowserWindow({
  // 窗口尺寸
  width: 1200,
  height: 800,
  minWidth: 400,
  minHeight: 300,
  maxWidth: 1600,
  maxHeight: 1200,
  
  // 窗口位置
  x: 100,
  y: 100,
  center: true,  // 居中显示
  
  // 尺寸限制
  resizable: true,
  minimizable: true,
  maximizable: true,
  closable: true
})
```

### 外观定制

```javascript
const window = new BrowserWindow({
  // 标题栏
  title: '自定义标题',
  titleBarStyle: 'default', // 'default', 'hidden', 'hiddenInset'
  
  // 窗口样式
  frame: true,              // 是否显示边框
  transparent: false,       // 透明窗口
  opacity: 1.0,            // 不透明度 (macOS/Linux)
  
  // 图标
  icon: path.join(__dirname, 'assets/icon.png'),
  
  // 显示状态
  show: true,              // 创建后立即显示
  modal: false,            // 模态窗口
  alwaysOnTop: false,      // 总是置顶
  
  // 背景色
  backgroundColor: '#ffffff'
})
```

### 高级配置

```javascript
const window = new BrowserWindow({
  // Web 偏好设置
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    preload: path.join(__dirname, 'preload.js'),
    sandbox: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false
  },
  
  // 其他选项
  acceptFirstMouse: false,  // 是否接受第一次鼠标点击
  disableAutoHideCursor: false, // 禁用自动隐藏光标
  enableLargerThanScreen: false, // 允许窗口大于屏幕
  hasShadow: true,         // 窗口阴影
  thickFrame: true,        // 厚边框 (Windows)
  vibrancy: 'appearance-based', // 毛玻璃效果 (macOS)
  zoomToPageWidth: false,  // 缩放到页面宽度
  tabbingIdentifier: 'main' // 标签组标识符 (macOS)
})
```

## 3.3 窗口生命周期管理

### 窗口事件处理

```javascript
class WindowManager {
  constructor() {
    this.windows = new Map()
  }

  createWindow(id, options = {}) {
    const defaultOptions = {
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    }

    const window = new BrowserWindow({
      ...defaultOptions,
      ...options
    })

    // 设置窗口事件监听
    this.setupWindowEvents(window, id)
    
    this.windows.set(id, window)
    return window
  }

  setupWindowEvents(window, id) {
    // 窗口准备显示
    window.once('ready-to-show', () => {
      console.log(`窗口 ${id} 准备显示`)
      window.show()
    })

    // 窗口关闭
    window.on('closed', () => {
      console.log(`窗口 ${id} 已关闭`)
      this.windows.delete(id)
    })

    // 窗口最小化
    window.on('minimize', () => {
      console.log(`窗口 ${id} 已最小化`)
    })

    // 窗口最大化
    window.on('maximize', () => {
      console.log(`窗口 ${id} 已最大化`)
    })

    // 窗口恢复
    window.on('restore', () => {
      console.log(`窗口 ${id} 已恢复`)
    })

    // 窗口获得焦点
    window.on('focus', () => {
      console.log(`窗口 ${id} 获得焦点`)
    })

    // 窗口失去焦点
    window.on('blur', () => {
      console.log(`窗口 ${id} 失去焦点`)
    })

    // 窗口移动
    window.on('move', () => {
      const [x, y] = window.getPosition()
      console.log(`窗口 ${id} 移动到 (${x}, ${y})`)
    })

    // 窗口调整大小
    window.on('resize', () => {
      const [width, height] = window.getSize()
      console.log(`窗口 ${id} 调整大小为 ${width}x${height}`)
    })
  }

  getWindow(id) {
    return this.windows.get(id)
  }

  closeWindow(id) {
    const window = this.windows.get(id)
    if (window) {
      window.close()
    }
  }

  closeAllWindows() {
    this.windows.forEach(window => window.close())
  }
}

// 使用示例
const windowManager = new WindowManager()
```

## 3.4 多窗口应用

### 窗口类型和用途

```javascript
class MultiWindowApp {
  constructor() {
    this.mainWindow = null
    this.settingsWindow = null
    this.aboutWindow = null
  }

  // 主窗口
  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: '主窗口',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    this.mainWindow.loadFile('main.html')
    
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    return this.mainWindow
  }

  // 设置窗口
  createSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.focus()
      return this.settingsWindow
    }

    this.settingsWindow = new BrowserWindow({
      width: 600,
      height: 400,
      title: '设置',
      parent: this.mainWindow,  // 设置父窗口
      modal: true,              // 模态窗口
      resizable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    this.settingsWindow.loadFile('settings.html')
    
    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null
    })

    return this.settingsWindow
  }

  // 关于窗口
  createAboutWindow() {
    if (this.aboutWindow) {
      this.aboutWindow.focus()
      return this.aboutWindow
    }

    this.aboutWindow = new BrowserWindow({
      width: 400,
      height: 300,
      title: '关于',
      parent: this.mainWindow,
      modal: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    this.aboutWindow.loadFile('about.html')
    
    this.aboutWindow.on('closed', () => {
      this.aboutWindow = null
    })

    return this.aboutWindow
  }

  // 子窗口
  createChildWindow(parentWindow) {
    const childWindow = new BrowserWindow({
      width: 400,
      height: 300,
      parent: parentWindow,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    childWindow.loadFile('child.html')
    return childWindow
  }
}
```

### 窗口间通信

```javascript
// 主进程中的窗口通信管理
class WindowCommunication {
  constructor() {
    this.windows = new Map()
    this.setupIPC()
  }

  setupIPC() {
    // 窗口间消息转发
    ipcMain.on('window-message', (event, data) => {
      const { targetWindow, message } = data
      const target = this.windows.get(targetWindow)
      
      if (target) {
        target.webContents.send('window-message', message)
      }
    })

    // 广播消息到所有窗口
    ipcMain.on('broadcast-message', (event, message) => {
      this.windows.forEach(window => {
        window.webContents.send('broadcast-message', message)
      })
    })
  }

  registerWindow(id, window) {
    this.windows.set(id, window)
  }

  unregisterWindow(id) {
    this.windows.delete(id)
  }
}
```

## 3.5 窗口状态管理

### 保存和恢复窗口状态

```javascript
const Store = require('electron-store')
const store = new Store()

class WindowStateManager {
  constructor(windowId, defaultState = {}) {
    this.windowId = windowId
    this.defaultState = {
      width: 800,
      height: 600,
      x: undefined,
      y: undefined,
      isMaximized: false,
      isMinimized: false,
      ...defaultState
    }
  }

  // 获取保存的窗口状态
  getState() {
    const savedState = store.get(`windowState.${this.windowId}`)
    return { ...this.defaultState, ...savedState }
  }

  // 保存窗口状态
  saveState(window) {
    const bounds = window.getBounds()
    const state = {
      ...bounds,
      isMaximized: window.isMaximized(),
      isMinimized: window.isMinimized()
    }
    
    store.set(`windowState.${this.windowId}`, state)
  }

  // 应用状态到窗口
  applyState(window) {
    const state = this.getState()
    
    // 设置窗口位置和大小
    window.setBounds({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height
    })

    // 恢复最大化状态
    if (state.isMaximized) {
      window.maximize()
    }
  }

  // 监听窗口状态变化
  watchState(window) {
    const saveState = () => this.saveState(window)
    
    window.on('resize', saveState)
    window.on('move', saveState)
    window.on('maximize', saveState)
    window.on('unmaximize', saveState)
    window.on('minimize', saveState)
    window.on('restore', saveState)
  }
}

// 使用示例
function createWindowWithState() {
  const stateManager = new WindowStateManager('main')
  const state = stateManager.getState()

  const window = new BrowserWindow({
    ...state,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 应用保存的状态
  stateManager.applyState(window)
  
  // 监听状态变化
  stateManager.watchState(window)

  window.once('ready-to-show', () => {
    window.show()
  })

  return window
}
```

## 3.6 特殊窗口类型

### 无边框窗口

```javascript
const framelessWindow = new BrowserWindow({
  width: 800,
  height: 600,
  frame: false,  // 无边框
  titleBarStyle: 'hidden',
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
})

// 自定义拖拽区域 (在 CSS 中)
/*
.titlebar {
  -webkit-app-region: drag;
  height: 30px;
  background: #333;
}

.titlebar button {
  -webkit-app-region: no-drag;
}
*/
```

### 透明窗口

```javascript
const transparentWindow = new BrowserWindow({
  width: 800,
  height: 600,
  transparent: true,
  frame: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
})

// 设置透明背景 (在 CSS 中)
/*
body {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
}
*/
```

### 工具窗口

```javascript
const toolWindow = new BrowserWindow({
  width: 300,
  height: 200,
  type: 'toolbar',  // 工具窗口类型
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
})
```

## 3.7 窗口性能优化

### 延迟显示

```javascript
const window = new BrowserWindow({
  show: false,  // 创建时不显示
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
})

// 页面准备好后再显示
window.once('ready-to-show', () => {
  window.show()
})
```

### 预加载优化

```javascript
// 预创建隐藏窗口
class WindowPool {
  constructor() {
    this.pool = []
    this.preloadCount = 2
    this.preloadWindows()
  }

  preloadWindows() {
    for (let i = 0; i < this.preloadCount; i++) {
      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })
      this.pool.push(window)
    }
  }

  getWindow() {
    if (this.pool.length > 0) {
      const window = this.pool.pop()
      // 补充池中的窗口
      this.preloadWindows()
      return window
    }
    
    // 池中没有窗口时创建新的
    return new BrowserWindow({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })
  }
}
```

### 内存管理

```javascript
// 及时清理不需要的窗口
function cleanupWindow(window) {
  if (window && !window.isDestroyed()) {
    window.removeAllListeners()
    window.close()
  }
}

// 监控内存使用
function monitorMemory() {
  const memoryUsage = process.memoryUsage()
  console.log('内存使用情况:', {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
  })
}
```

## 3.8 常见问题和解决方案

### 问题 1：窗口闪烁

**原因**：窗口创建后立即显示，但内容还未加载完成

**解决方案**：
```javascript
const window = new BrowserWindow({
  show: false,
  backgroundColor: '#ffffff'  // 设置背景色
})

window.once('ready-to-show', () => {
  window.show()
})
```

### 问题 2：窗口位置不正确

**原因**：多显示器环境下窗口位置计算错误

**解决方案**：
```javascript
const { screen } = require('electron')

function createWindowOnPrimaryDisplay() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  const window = new BrowserWindow({
    x: Math.floor((width - 800) / 2),
    y: Math.floor((height - 600) / 2),
    width: 800,
    height: 600
  })

  return window
}
```

### 问题 3：窗口无法关闭

**原因**：事件监听器阻止了窗口关闭

**解决方案**：
```javascript
window.on('close', (event) => {
  // 检查是否有未保存的数据
  if (hasUnsavedData()) {
    event.preventDefault()
    // 显示确认对话框
    showSaveDialog().then((result) => {
      if (result.confirmed) {
        window.destroy()
      }
    })
  }
})
```

## 本章小结

通过本章学习，你应该已经：
- ✅ 掌握了 BrowserWindow 的基本用法和配置选项
- ✅ 学会了窗口生命周期管理和事件处理
- ✅ 了解了多窗口应用的开发模式
- ✅ 掌握了窗口状态的保存和恢复
- ✅ 学会了创建特殊类型的窗口
- ✅ 了解了窗口性能优化技巧
- ✅ 掌握了常见问题的解决方案

在下一章中，我们将学习进程间通信(IPC)，这是 Electron 应用开发的核心技能！
