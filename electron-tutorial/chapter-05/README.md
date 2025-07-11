# 第5章：菜单与快捷键

> 学会创建应用菜单、上下文菜单和全局快捷键，提升用户体验

## 5.1 应用菜单基础

应用菜单是桌面应用的重要组成部分，为用户提供了访问应用功能的标准方式。Electron 提供了强大的菜单 API 来创建原生的应用菜单。

### 菜单系统概述

```
┌─────────────────────────────────────────────────────────┐
│                    Electron 菜单系统                    │
├─────────────────────────────────────────────────────────┤
│  应用菜单 (Application Menu)                            │
│  ├─ 文件 (File)                                        │
│  ├─ 编辑 (Edit)                                        │
│  ├─ 视图 (View)                                        │
│  ├─ 窗口 (Window)                                      │
│  └─ 帮助 (Help)                                        │
├─────────────────────────────────────────────────────────┤
│  上下文菜单 (Context Menu)                              │
│  ├─ 右键菜单                                           │
│  └─ 自定义触发菜单                                      │
├─────────────────────────────────────────────────────────┤
│  系统托盘菜单 (Tray Menu)                               │
│  ├─ 托盘图标菜单                                        │
│  └─ 状态指示                                           │
└─────────────────────────────────────────────────────────┘
```

### 基本菜单创建

```javascript
const { app, BrowserWindow, Menu } = require('electron')

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            console.log('新建文件')
            createNewFile()
          }
        },
        {
          label: '打开',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            await openFile()
          }
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            saveFile()
          }
        },
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            saveAsFile()
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectall', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            showAboutDialog()
          }
        },
        {
          label: '检查更新',
          click: () => {
            checkForUpdates()
          }
        }
      ]
    }
  ]

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: `关于 ${app.getName()}` },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: `隐藏 ${app.getName()}` },
        { role: 'hideothers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: `退出 ${app.getName()}` }
      ]
    })

    // 窗口菜单
    template[4].submenu = [
      { role: 'close', label: '关闭' },
      { role: 'minimize', label: '最小化' },
      { role: 'zoom', label: '缩放' },
      { type: 'separator' },
      { role: 'front', label: '全部置于顶层' }
    ]
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 菜单功能实现
async function createNewFile() {
  // 创建新文件的逻辑
  console.log('创建新文件')
}

async function openFile() {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled) {
    console.log('打开文件:', result.filePaths[0])
  }
}

function saveFile() {
  console.log('保存文件')
}

async function saveAsFile() {
  const { dialog } = require('electron')
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled) {
    console.log('另存为:', result.filePath)
  }
}

function showAboutDialog() {
  const { dialog } = require('electron')
  dialog.showMessageBox({
    type: 'info',
    title: '关于',
    message: app.getName(),
    detail: `版本: ${app.getVersion()}\n基于 Electron ${process.versions.electron}`
  })
}

function checkForUpdates() {
  console.log('检查更新')
}

app.whenReady().then(() => {
  createMenu()
})
```

## 5.2 动态菜单管理

### 菜单状态管理

```javascript
class MenuManager {
  constructor() {
    this.menuTemplate = null
    this.currentMenu = null
    this.menuState = {
      canUndo: false,
      canRedo: false,
      hasSelection: false,
      isFullscreen: false,
      recentFiles: []
    }
  }

  createMenuTemplate() {
    return [
      {
        label: '文件',
        submenu: [
          {
            label: '新建',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.handleNewFile()
          },
          {
            label: '打开',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.handleOpenFile()
          },
          {
            label: '最近打开',
            submenu: this.createRecentFilesMenu()
          },
          { type: 'separator' },
          {
            label: '保存',
            accelerator: 'CmdOrCtrl+S',
            enabled: this.menuState.hasSelection,
            click: () => this.handleSaveFile()
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          {
            label: '撤销',
            accelerator: 'CmdOrCtrl+Z',
            enabled: this.menuState.canUndo,
            click: () => this.handleUndo()
          },
          {
            label: '重做',
            accelerator: 'CmdOrCtrl+Y',
            enabled: this.menuState.canRedo,
            click: () => this.handleRedo()
          },
          { type: 'separator' },
          {
            label: '剪切',
            accelerator: 'CmdOrCtrl+X',
            enabled: this.menuState.hasSelection,
            click: () => this.handleCut()
          },
          {
            label: '复制',
            accelerator: 'CmdOrCtrl+C',
            enabled: this.menuState.hasSelection,
            click: () => this.handleCopy()
          },
          {
            label: '粘贴',
            accelerator: 'CmdOrCtrl+V',
            click: () => this.handlePaste()
          }
        ]
      },
      {
        label: '视图',
        submenu: [
          {
            label: this.menuState.isFullscreen ? '退出全屏' : '进入全屏',
            accelerator: 'F11',
            click: () => this.toggleFullscreen()
          },
          { type: 'separator' },
          {
            label: '开发者工具',
            accelerator: 'F12',
            click: () => this.toggleDevTools()
          }
        ]
      }
    ]
  }

  createRecentFilesMenu() {
    if (this.menuState.recentFiles.length === 0) {
      return [{ label: '无最近文件', enabled: false }]
    }

    return this.menuState.recentFiles.map(file => ({
      label: path.basename(file),
      click: () => this.openRecentFile(file)
    }))
  }

  updateMenuState(newState) {
    this.menuState = { ...this.menuState, ...newState }
    this.rebuildMenu()
  }

  rebuildMenu() {
    this.menuTemplate = this.createMenuTemplate()
    this.currentMenu = Menu.buildFromTemplate(this.menuTemplate)
    Menu.setApplicationMenu(this.currentMenu)
  }

  addRecentFile(filePath) {
    const recentFiles = this.menuState.recentFiles.filter(f => f !== filePath)
    recentFiles.unshift(filePath)
    
    // 限制最近文件数量
    if (recentFiles.length > 10) {
      recentFiles.pop()
    }

    this.updateMenuState({ recentFiles })
  }

  // 菜单处理函数
  handleNewFile() {
    console.log('新建文件')
    this.updateMenuState({ hasSelection: true })
  }

  async handleOpenFile() {
    const { dialog } = require('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!result.canceled) {
      const filePath = result.filePaths[0]
      this.addRecentFile(filePath)
      this.updateMenuState({ hasSelection: true })
    }
  }

  handleSaveFile() {
    console.log('保存文件')
  }

  handleUndo() {
    console.log('撤销')
    this.updateMenuState({ canUndo: false, canRedo: true })
  }

  handleRedo() {
    console.log('重做')
    this.updateMenuState({ canUndo: true, canRedo: false })
  }

  handleCut() {
    console.log('剪切')
    this.updateMenuState({ hasSelection: false })
  }

  handleCopy() {
    console.log('复制')
  }

  handlePaste() {
    console.log('粘贴')
    this.updateMenuState({ hasSelection: true })
  }

  toggleFullscreen() {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (mainWindow) {
      const isFullscreen = mainWindow.isFullScreen()
      mainWindow.setFullScreen(!isFullscreen)
      this.updateMenuState({ isFullscreen: !isFullscreen })
    }
  }

  toggleDevTools() {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools()
    }
  }

  openRecentFile(filePath) {
    console.log('打开最近文件:', filePath)
    this.addRecentFile(filePath) // 移到最前面
  }
}

// 使用菜单管理器
const menuManager = new MenuManager()

app.whenReady().then(() => {
  menuManager.rebuildMenu()
})

// 导出菜单管理器供其他模块使用
module.exports = { menuManager }
```

## 5.3 上下文菜单

### 基本上下文菜单

```javascript
const { Menu, MenuItem } = require('electron')

class ContextMenuManager {
  constructor() {
    this.setupContextMenus()
  }

  setupContextMenus() {
    // 监听来自渲染进程的上下文菜单请求
    ipcMain.on('show-context-menu', (event, params) => {
      this.showContextMenu(event, params)
    })
  }

  showContextMenu(event, params) {
    const { x, y, selectionText, linkURL, mediaType } = params

    let template = []

    // 根据上下文类型创建不同的菜单
    if (linkURL) {
      template = this.createLinkContextMenu(linkURL)
    } else if (mediaType === 'image') {
      template = this.createImageContextMenu(params)
    } else if (selectionText) {
      template = this.createTextContextMenu(selectionText)
    } else {
      template = this.createDefaultContextMenu()
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({
      window: BrowserWindow.fromWebContents(event.sender),
      x,
      y
    })
  }

  createLinkContextMenu(linkURL) {
    return [
      {
        label: '在浏览器中打开链接',
        click: () => {
          require('electron').shell.openExternal(linkURL)
        }
      },
      {
        label: '复制链接地址',
        click: () => {
          require('electron').clipboard.writeText(linkURL)
        }
      },
      { type: 'separator' },
      {
        label: '检查链接',
        click: () => {
          console.log('检查链接:', linkURL)
        }
      }
    ]
  }

  createImageContextMenu(params) {
    return [
      {
        label: '复制图片',
        click: () => {
          // 复制图片到剪贴板
          console.log('复制图片')
        }
      },
      {
        label: '保存图片',
        click: async () => {
          await this.saveImage(params.srcURL)
        }
      },
      { type: 'separator' },
      {
        label: '在新窗口中打开图片',
        click: () => {
          this.openImageInNewWindow(params.srcURL)
        }
      }
    ]
  }

  createTextContextMenu(selectionText) {
    return [
      {
        label: '复制',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
      },
      {
        label: '剪切',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
      },
      {
        label: '粘贴',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
      },
      { type: 'separator' },
      {
        label: '搜索选中文本',
        click: () => {
          this.searchText(selectionText)
        }
      },
      {
        label: '翻译选中文本',
        click: () => {
          this.translateText(selectionText)
        }
      }
    ]
  }

  createDefaultContextMenu() {
    return [
      {
        label: '刷新',
        accelerator: 'CmdOrCtrl+R',
        click: (menuItem, browserWindow) => {
          if (browserWindow) {
            browserWindow.reload()
          }
        }
      },
      {
        label: '返回',
        click: (menuItem, browserWindow) => {
          if (browserWindow && browserWindow.webContents.canGoBack()) {
            browserWindow.webContents.goBack()
          }
        }
      },
      {
        label: '前进',
        click: (menuItem, browserWindow) => {
          if (browserWindow && browserWindow.webContents.canGoForward()) {
            browserWindow.webContents.goForward()
          }
        }
      },
      { type: 'separator' },
      {
        label: '检查元素',
        click: (menuItem, browserWindow) => {
          if (browserWindow) {
            browserWindow.webContents.inspectElement(x, y)
          }
        }
      }
    ]
  }

  async saveImage(imageURL) {
    const { dialog } = require('electron')
    const path = require('path')
    const fs = require('fs')
    const https = require('https')

    const result = await dialog.showSaveDialog({
      defaultPath: 'image.png',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }
      ]
    })

    if (!result.canceled) {
      // 下载并保存图片
      this.downloadImage(imageURL, result.filePath)
    }
  }

  downloadImage(url, filePath) {
    // 简单的图片下载实现
    console.log(`下载图片 ${url} 到 ${filePath}`)
  }

  openImageInNewWindow(imageURL) {
    const imageWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    imageWindow.loadURL(imageURL)
  }

  searchText(text) {
    const searchURL = `https://www.google.com/search?q=${encodeURIComponent(text)}`
    require('electron').shell.openExternal(searchURL)
  }

  translateText(text) {
    const translateURL = `https://translate.google.com/?text=${encodeURIComponent(text)}`
    require('electron').shell.openExternal(translateURL)
  }
}

// 预加载脚本中的上下文菜单触发
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  showContextMenu: (params) => {
    ipcRenderer.send('show-context-menu', params)
  }
})

// 渲染进程中监听右键事件
// renderer.js
document.addEventListener('contextmenu', (event) => {
  event.preventDefault()
  
  const params = {
    x: event.clientX,
    y: event.clientY,
    selectionText: window.getSelection().toString(),
    linkURL: event.target.href || '',
    mediaType: event.target.tagName.toLowerCase() === 'img' ? 'image' : '',
    srcURL: event.target.src || ''
  }

  window.electronAPI.showContextMenu(params)
})

const contextMenuManager = new ContextMenuManager()
```

const contextMenuManager = new ContextMenuManager()
```

## 5.4 全局快捷键

全局快捷键允许应用在后台时也能响应键盘组合键，提供快速访问功能的能力。

### 基本全局快捷键

```javascript
const { app, globalShortcut, BrowserWindow } = require('electron')

class GlobalShortcutManager {
  constructor() {
    this.shortcuts = new Map()
    this.setupGlobalShortcuts()
  }

  setupGlobalShortcuts() {
    app.whenReady().then(() => {
      this.registerShortcuts()
    })

    app.on('will-quit', () => {
      this.unregisterAllShortcuts()
    })
  }

  registerShortcuts() {
    // 显示/隐藏主窗口
    this.registerShortcut('CommandOrControl+Shift+H', () => {
      this.toggleMainWindow()
    })

    // 快速新建窗口
    this.registerShortcut('CommandOrControl+Shift+N', () => {
      this.createQuickWindow()
    })

    // 全局搜索
    this.registerShortcut('CommandOrControl+Shift+F', () => {
      this.showGlobalSearch()
    })

    // 截图功能
    this.registerShortcut('CommandOrControl+Shift+S', () => {
      this.takeScreenshot()
    })

    // 切换开发者工具
    this.registerShortcut('CommandOrControl+Shift+I', () => {
      this.toggleDevTools()
    })
  }

  registerShortcut(accelerator, callback) {
    const success = globalShortcut.register(accelerator, callback)

    if (success) {
      this.shortcuts.set(accelerator, callback)
      console.log(`全局快捷键 ${accelerator} 注册成功`)
    } else {
      console.error(`全局快捷键 ${accelerator} 注册失败`)
    }
  }

  unregisterShortcut(accelerator) {
    globalShortcut.unregister(accelerator)
    this.shortcuts.delete(accelerator)
    console.log(`全局快捷键 ${accelerator} 已注销`)
  }

  unregisterAllShortcuts() {
    globalShortcut.unregisterAll()
    this.shortcuts.clear()
    console.log('所有全局快捷键已注销')
  }

  isRegistered(accelerator) {
    return globalShortcut.isRegistered(accelerator)
  }

  // 快捷键功能实现
  toggleMainWindow() {
    const mainWindow = BrowserWindow.getAllWindows()[0]

    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  }

  createQuickWindow() {
    const quickWindow = new BrowserWindow({
      width: 400,
      height: 300,
      alwaysOnTop: true,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    quickWindow.loadFile('quick-window.html')
  }

  showGlobalSearch() {
    // 创建全局搜索窗口
    const searchWindow = new BrowserWindow({
      width: 600,
      height: 400,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'search-preload.js')
      }
    })

    searchWindow.loadFile('global-search.html')

    // 失去焦点时自动关闭
    searchWindow.on('blur', () => {
      searchWindow.close()
    })
  }

  async takeScreenshot() {
    const { screen, nativeImage } = require('electron')
    const { dialog } = require('electron')

    try {
      // 获取屏幕截图
      const displays = screen.getAllDisplays()
      const primaryDisplay = displays[0]

      // 这里需要使用第三方库或原生API来截图
      console.log('截图功能需要额外实现')

    } catch (error) {
      console.error('截图失败:', error)
    }
  }

  toggleDevTools() {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools()
    }
  }
}

const globalShortcutManager = new GlobalShortcutManager()
```

### 动态快捷键管理

```javascript
class DynamicShortcutManager {
  constructor() {
    this.userShortcuts = new Map()
    this.loadUserShortcuts()
  }

  loadUserShortcuts() {
    // 从配置文件加载用户自定义快捷键
    const Store = require('electron-store')
    const store = new Store()

    const savedShortcuts = store.get('userShortcuts', {})

    Object.entries(savedShortcuts).forEach(([action, accelerator]) => {
      this.setUserShortcut(action, accelerator)
    })
  }

  saveUserShortcuts() {
    const Store = require('electron-store')
    const store = new Store()

    const shortcuts = {}
    this.userShortcuts.forEach((accelerator, action) => {
      shortcuts[action] = accelerator
    })

    store.set('userShortcuts', shortcuts)
  }

  setUserShortcut(action, accelerator) {
    // 先注销旧的快捷键
    const oldAccelerator = this.userShortcuts.get(action)
    if (oldAccelerator) {
      globalShortcut.unregister(oldAccelerator)
    }

    // 注册新的快捷键
    const success = globalShortcut.register(accelerator, () => {
      this.executeAction(action)
    })

    if (success) {
      this.userShortcuts.set(action, accelerator)
      this.saveUserShortcuts()
      return true
    } else {
      console.error(`快捷键 ${accelerator} 注册失败`)
      return false
    }
  }

  removeUserShortcut(action) {
    const accelerator = this.userShortcuts.get(action)
    if (accelerator) {
      globalShortcut.unregister(accelerator)
      this.userShortcuts.delete(action)
      this.saveUserShortcuts()
    }
  }

  executeAction(action) {
    switch (action) {
      case 'toggle-window':
        this.toggleMainWindow()
        break
      case 'new-note':
        this.createNewNote()
        break
      case 'quick-capture':
        this.quickCapture()
        break
      default:
        console.log(`执行自定义动作: ${action}`)
    }
  }

  // 提供给设置界面的API
  getAvailableActions() {
    return [
      { id: 'toggle-window', name: '显示/隐藏窗口' },
      { id: 'new-note', name: '新建笔记' },
      { id: 'quick-capture', name: '快速捕获' },
      { id: 'global-search', name: '全局搜索' }
    ]
  }

  getUserShortcuts() {
    const shortcuts = {}
    this.userShortcuts.forEach((accelerator, action) => {
      shortcuts[action] = accelerator
    })
    return shortcuts
  }

  validateShortcut(accelerator) {
    // 检查快捷键格式是否正确
    try {
      const testSuccess = globalShortcut.register(accelerator, () => {})
      if (testSuccess) {
        globalShortcut.unregister(accelerator)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }
}
```

## 5.5 系统托盘

系统托盘为应用提供了在系统通知区域显示图标和菜单的能力。

### 基本托盘功能

```javascript
const { app, Tray, Menu, nativeImage } = require('electron')
const path = require('path')

class TrayManager {
  constructor() {
    this.tray = null
    this.createTray()
  }

  createTray() {
    // 创建托盘图标
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png')
    const trayIcon = nativeImage.createFromPath(iconPath)

    // 调整图标大小 (macOS 需要16x16)
    if (process.platform === 'darwin') {
      trayIcon.setTemplateImage(true)
    }

    this.tray = new Tray(trayIcon)

    this.setupTrayMenu()
    this.setupTrayEvents()
  }

  setupTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.showMainWindow()
        }
      },
      {
        label: '新建笔记',
        click: () => {
          this.createNewNote()
        }
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => {
          this.showSettings()
        }
      },
      {
        label: '关于',
        click: () => {
          this.showAbout()
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
    this.tray.setToolTip('我的 Electron 应用')
  }

  setupTrayEvents() {
    // 单击托盘图标
    this.tray.on('click', () => {
      this.toggleMainWindow()
    })

    // 双击托盘图标
    this.tray.on('double-click', () => {
      this.showMainWindow()
    })

    // 右键点击 (Windows)
    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu()
    })
  }

  updateTrayIcon(iconName) {
    const iconPath = path.join(__dirname, 'assets', `${iconName}.png`)
    const newIcon = nativeImage.createFromPath(iconPath)

    if (process.platform === 'darwin') {
      newIcon.setTemplateImage(true)
    }

    this.tray.setImage(newIcon)
  }

  updateTrayTitle(title) {
    if (process.platform === 'darwin') {
      this.tray.setTitle(title)
    }
  }

  showNotification(title, body) {
    this.tray.displayBalloon({
      icon: this.tray.getImage(),
      title: title,
      content: body
    })
  }

  // 托盘菜单功能
  showMainWindow() {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
    }
  }

  toggleMainWindow() {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide()
      } else {
        this.showMainWindow()
      }
    }
  }

  createNewNote() {
    console.log('从托盘创建新笔记')
  }

  showSettings() {
    console.log('显示设置窗口')
  }

  showAbout() {
    console.log('显示关于对话框')
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}

// 使用托盘管理器
let trayManager

app.whenReady().then(() => {
  trayManager = new TrayManager()
})

app.on('before-quit', () => {
  if (trayManager) {
    trayManager.destroy()
  }
})
```

### 动态托盘状态

```javascript
class DynamicTrayManager extends TrayManager {
  constructor() {
    super()
    this.status = 'idle'
    this.unreadCount = 0
  }

  setStatus(status) {
    this.status = status
    this.updateTrayAppearance()
  }

  setUnreadCount(count) {
    this.unreadCount = count
    this.updateTrayAppearance()
  }

  updateTrayAppearance() {
    // 根据状态更新图标
    let iconName = 'tray-icon'

    switch (this.status) {
      case 'busy':
        iconName = 'tray-icon-busy'
        break
      case 'away':
        iconName = 'tray-icon-away'
        break
      case 'offline':
        iconName = 'tray-icon-offline'
        break
      default:
        iconName = 'tray-icon'
    }

    this.updateTrayIcon(iconName)

    // 更新标题显示未读数量
    if (this.unreadCount > 0) {
      this.updateTrayTitle(`(${this.unreadCount})`)
      this.tray.setToolTip(`我的应用 - ${this.unreadCount} 条未读消息`)
    } else {
      this.updateTrayTitle('')
      this.tray.setToolTip('我的应用')
    }

    // 更新菜单
    this.updateTrayMenu()
  }

  updateTrayMenu() {
    const template = [
      {
        label: '显示主窗口',
        click: () => this.showMainWindow()
      }
    ]

    // 根据未读数量添加菜单项
    if (this.unreadCount > 0) {
      template.push({
        label: `查看 ${this.unreadCount} 条未读消息`,
        click: () => this.showUnreadMessages()
      })
      template.push({ type: 'separator' })
    }

    // 状态切换菜单
    template.push({
      label: '状态',
      submenu: [
        {
          label: '在线',
          type: 'radio',
          checked: this.status === 'idle',
          click: () => this.setStatus('idle')
        },
        {
          label: '忙碌',
          type: 'radio',
          checked: this.status === 'busy',
          click: () => this.setStatus('busy')
        },
        {
          label: '离开',
          type: 'radio',
          checked: this.status === 'away',
          click: () => this.setStatus('away')
        },
        {
          label: '离线',
          type: 'radio',
          checked: this.status === 'offline',
          click: () => this.setStatus('offline')
        }
      ]
    })

    template.push(
      { type: 'separator' },
      {
        label: '设置',
        click: () => this.showSettings()
      },
      {
        label: '退出',
        click: () => app.quit()
      }
    )

    const contextMenu = Menu.buildFromTemplate(template)
    this.tray.setContextMenu(contextMenu)
  }

  showUnreadMessages() {
    console.log('显示未读消息')
    this.setUnreadCount(0) // 清除未读数量
  }
}
```

## 本章小结

通过本章学习，你应该已经：
- ✅ 掌握了应用菜单的创建和配置
- ✅ 学会了动态菜单管理和状态更新
- ✅ 了解了上下文菜单的实现方法
- ✅ 掌握了跨平台菜单的处理技巧
- ✅ 学会了全局快捷键的注册和管理
- ✅ 了解了系统托盘的创建和动态更新
- ✅ 掌握了用户自定义快捷键的实现

在下一章中，我们将学习文件系统操作和对话框的使用！
