# 第6章：文件系统与对话框

> 学习文件操作、对话框使用和系统通知等原生API，实现丰富的桌面应用功能

## 6.1 文件对话框

文件对话框是桌面应用中最常用的功能之一，Electron 提供了强大的 dialog API 来创建各种类型的对话框。

### 文件选择对话框

```javascript
const { dialog, BrowserWindow } = require('electron')
const fs = require('fs').promises
const path = require('path')

class FileDialogManager {
  constructor() {
    this.setupIPC()
  }

  setupIPC() {
    const { ipcMain } = require('electron')

    // 打开文件对话框
    ipcMain.handle('show-open-dialog', async (event, options) => {
      return await this.showOpenDialog(options)
    })

    // 保存文件对话框
    ipcMain.handle('show-save-dialog', async (event, options) => {
      return await this.showSaveDialog(options)
    })

    // 选择文件夹对话框
    ipcMain.handle('show-folder-dialog', async (event, options) => {
      return await this.showFolderDialog(options)
    })
  }

  async showOpenDialog(options = {}) {
    const defaultOptions = {
      title: '选择文件',
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    }

    const mergedOptions = { ...defaultOptions, ...options }
    
    try {
      const result = await dialog.showOpenDialog(mergedOptions)
      
      if (!result.canceled && result.filePaths.length > 0) {
        return {
          success: true,
          filePaths: result.filePaths,
          filePath: result.filePaths[0] // 兼容单文件选择
        }
      }
      
      return { success: false, canceled: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async showSaveDialog(options = {}) {
    const defaultOptions = {
      title: '保存文件',
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    }

    const mergedOptions = { ...defaultOptions, ...options }
    
    try {
      const result = await dialog.showSaveDialog(mergedOptions)
      
      if (!result.canceled) {
        return {
          success: true,
          filePath: result.filePath
        }
      }
      
      return { success: false, canceled: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async showFolderDialog(options = {}) {
    const defaultOptions = {
      title: '选择文件夹',
      properties: ['openDirectory']
    }

    const mergedOptions = { ...defaultOptions, ...options }
    
    try {
      const result = await dialog.showOpenDialog(mergedOptions)
      
      if (!result.canceled && result.filePaths.length > 0) {
        return {
          success: true,
          folderPath: result.filePaths[0]
        }
      }
      
      return { success: false, canceled: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // 预定义的文件类型过滤器
  getFileFilters() {
    return {
      text: [
        { name: 'Text Files', extensions: ['txt', 'md', 'rtf'] }
      ],
      images: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] }
      ],
      documents: [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'] }
      ],
      code: [
        { name: 'Code Files', extensions: ['js', 'ts', 'html', 'css', 'json', 'xml'] }
      ],
      archives: [
        { name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz'] }
      ]
    }
  }
}

const fileDialogManager = new FileDialogManager()
```

### 高级文件对话框功能

```javascript
class AdvancedFileDialog extends FileDialogManager {
  constructor() {
    super()
    this.recentPaths = this.loadRecentPaths()
  }

  loadRecentPaths() {
    const Store = require('electron-store')
    const store = new Store()
    return store.get('recentPaths', [])
  }

  saveRecentPath(filePath) {
    const Store = require('electron-store')
    const store = new Store()
    
    // 移除重复路径
    this.recentPaths = this.recentPaths.filter(p => p !== filePath)
    
    // 添加到开头
    this.recentPaths.unshift(filePath)
    
    // 限制数量
    if (this.recentPaths.length > 10) {
      this.recentPaths = this.recentPaths.slice(0, 10)
    }
    
    store.set('recentPaths', this.recentPaths)
  }

  async showOpenDialogWithPreview(options = {}) {
    const result = await this.showOpenDialog(options)
    
    if (result.success) {
      // 保存到最近路径
      this.saveRecentPath(result.filePath)
      
      // 获取文件预览信息
      const previewInfo = await this.getFilePreview(result.filePath)
      
      return {
        ...result,
        preview: previewInfo
      }
    }
    
    return result
  }

  async getFilePreview(filePath) {
    try {
      const stats = await fs.stat(filePath)
      const ext = path.extname(filePath).toLowerCase()
      
      const preview = {
        name: path.basename(filePath),
        size: stats.size,
        modified: stats.mtime,
        type: this.getFileType(ext),
        extension: ext
      }

      // 对于文本文件，读取前几行作为预览
      if (this.isTextFile(ext)) {
        try {
          const content = await fs.readFile(filePath, 'utf8')
          preview.textPreview = content.split('\n').slice(0, 5).join('\n')
        } catch (error) {
          preview.textPreview = '无法预览文件内容'
        }
      }

      return preview
    } catch (error) {
      return { error: error.message }
    }
  }

  getFileType(extension) {
    const typeMap = {
      '.txt': 'text',
      '.md': 'markdown',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document'
    }
    
    return typeMap[extension] || 'unknown'
  }

  isTextFile(extension) {
    const textExtensions = ['.txt', '.md', '.js', '.ts', '.html', '.css', '.json', '.xml']
    return textExtensions.includes(extension)
  }

  async showSaveDialogWithTemplate(templateType, defaultName = '') {
    const templates = {
      text: {
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        defaultPath: defaultName || 'document.txt'
      },
      markdown: {
        filters: [{ name: 'Markdown Files', extensions: ['md'] }],
        defaultPath: defaultName || 'document.md'
      },
      json: {
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        defaultPath: defaultName || 'data.json'
      }
    }

    const template = templates[templateType] || templates.text
    return await this.showSaveDialog(template)
  }
}
```

## 6.2 文件系统操作

### 基础文件操作

```javascript
const fs = require('fs').promises
const path = require('path')

class FileSystemManager {
  constructor() {
    this.setupIPC()
  }

  setupIPC() {
    const { ipcMain } = require('electron')

    ipcMain.handle('read-file', async (event, filePath) => {
      return await this.readFile(filePath)
    })

    ipcMain.handle('write-file', async (event, filePath, content) => {
      return await this.writeFile(filePath, content)
    })

    ipcMain.handle('delete-file', async (event, filePath) => {
      return await this.deleteFile(filePath)
    })

    ipcMain.handle('copy-file', async (event, sourcePath, targetPath) => {
      return await this.copyFile(sourcePath, targetPath)
    })

    ipcMain.handle('move-file', async (event, sourcePath, targetPath) => {
      return await this.moveFile(sourcePath, targetPath)
    })

    ipcMain.handle('get-file-info', async (event, filePath) => {
      return await this.getFileInfo(filePath)
    })

    ipcMain.handle('list-directory', async (event, dirPath) => {
      return await this.listDirectory(dirPath)
    })
  }

  async readFile(filePath, encoding = 'utf8') {
    try {
      const content = await fs.readFile(filePath, encoding)
      return { success: true, content }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async writeFile(filePath, content, encoding = 'utf8') {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      
      await fs.writeFile(filePath, content, encoding)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async copyFile(sourcePath, targetPath) {
    try {
      // 确保目标目录存在
      const targetDir = path.dirname(targetPath)
      await fs.mkdir(targetDir, { recursive: true })
      
      await fs.copyFile(sourcePath, targetPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async moveFile(sourcePath, targetPath) {
    try {
      // 确保目标目录存在
      const targetDir = path.dirname(targetPath)
      await fs.mkdir(targetDir, { recursive: true })
      
      await fs.rename(sourcePath, targetPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath)
      
      return {
        success: true,
        info: {
          name: path.basename(filePath),
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          permissions: stats.mode
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async listDirectory(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      const fileList = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(dirPath, item.name)
          const stats = await fs.stat(itemPath)
          
          return {
            name: item.name,
            path: itemPath,
            isFile: item.isFile(),
            isDirectory: item.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          }
        })
      )
      
      return { success: true, files: fileList }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

const fileSystemManager = new FileSystemManager()
```

### 文件监听和变化检测

```javascript
const chokidar = require('chokidar')

class FileWatcher {
  constructor() {
    this.watchers = new Map()
    this.setupIPC()
  }

  setupIPC() {
    const { ipcMain } = require('electron')

    ipcMain.handle('start-watching', async (event, path, options) => {
      return this.startWatching(path, options, event.sender)
    })

    ipcMain.handle('stop-watching', async (event, watcherId) => {
      return this.stopWatching(watcherId)
    })

    ipcMain.handle('get-watchers', async (event) => {
      return this.getWatchers()
    })
  }

  startWatching(watchPath, options = {}, sender) {
    const watcherId = `watcher_${Date.now()}_${Math.random()}`
    
    const defaultOptions = {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true
    }

    const mergedOptions = { ...defaultOptions, ...options }
    
    try {
      const watcher = chokidar.watch(watchPath, mergedOptions)
      
      // 设置事件监听
      watcher
        .on('add', (filePath) => {
          sender.send('file-watcher-event', {
            watcherId,
            type: 'add',
            path: filePath
          })
        })
        .on('change', (filePath) => {
          sender.send('file-watcher-event', {
            watcherId,
            type: 'change',
            path: filePath
          })
        })
        .on('unlink', (filePath) => {
          sender.send('file-watcher-event', {
            watcherId,
            type: 'unlink',
            path: filePath
          })
        })
        .on('addDir', (dirPath) => {
          sender.send('file-watcher-event', {
            watcherId,
            type: 'addDir',
            path: dirPath
          })
        })
        .on('unlinkDir', (dirPath) => {
          sender.send('file-watcher-event', {
            watcherId,
            type: 'unlinkDir',
            path: dirPath
          })
        })
        .on('error', (error) => {
          sender.send('file-watcher-event', {
            watcherId,
            type: 'error',
            error: error.message
          })
        })

      this.watchers.set(watcherId, {
        watcher,
        path: watchPath,
        options: mergedOptions,
        sender
      })

      return { success: true, watcherId }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  stopWatching(watcherId) {
    const watcherInfo = this.watchers.get(watcherId)
    
    if (watcherInfo) {
      watcherInfo.watcher.close()
      this.watchers.delete(watcherId)
      return { success: true }
    }
    
    return { success: false, error: 'Watcher not found' }
  }

  getWatchers() {
    const watchers = []
    
    this.watchers.forEach((info, id) => {
      watchers.push({
        id,
        path: info.path,
        options: info.options
      })
    })
    
    return { success: true, watchers }
  }

  stopAllWatchers() {
    this.watchers.forEach((info) => {
      info.watcher.close()
    })
    this.watchers.clear()
  }
}

const fileWatcher = new FileWatcher()

// 应用退出时清理所有监听器
app.on('before-quit', () => {
  fileWatcher.stopAllWatchers()
})
```

const fileWatcher = new FileWatcher()

// 应用退出时清理所有监听器
app.on('before-quit', () => {
  fileWatcher.stopAllWatchers()
})
```

## 6.3 系统通知

系统通知为应用提供了与用户交互的重要方式，即使应用在后台运行也能及时通知用户。

### 基础通知功能

```javascript
const { Notification, nativeImage } = require('electron')
const path = require('path')

class NotificationManager {
  constructor() {
    this.setupIPC()
    this.notificationQueue = []
    this.isProcessing = false
  }

  setupIPC() {
    const { ipcMain } = require('electron')

    ipcMain.handle('show-notification', async (event, options) => {
      return this.showNotification(options)
    })

    ipcMain.handle('check-notification-permission', async () => {
      return this.checkPermission()
    })

    ipcMain.handle('request-notification-permission', async () => {
      return this.requestPermission()
    })
  }

  checkPermission() {
    if (process.platform === 'win32') {
      // Windows 通常默认允许通知
      return { granted: true }
    }

    // macOS 和 Linux 需要检查权限
    return { granted: Notification.isSupported() }
  }

  async requestPermission() {
    if (!Notification.isSupported()) {
      return { granted: false, reason: 'Notifications not supported' }
    }

    // 在某些平台上可能需要额外的权限请求
    return { granted: true }
  }

  async showNotification(options = {}) {
    if (!Notification.isSupported()) {
      return { success: false, error: 'Notifications not supported' }
    }

    const defaultOptions = {
      title: '通知',
      body: '',
      icon: null,
      silent: false,
      urgency: 'normal', // 'normal', 'critical', 'low'
      timeoutType: 'default', // 'default', 'never'
      actions: []
    }

    const mergedOptions = { ...defaultOptions, ...options }

    try {
      // 处理图标
      if (mergedOptions.icon) {
        if (typeof mergedOptions.icon === 'string') {
          mergedOptions.icon = nativeImage.createFromPath(mergedOptions.icon)
        }
      } else {
        // 使用默认应用图标
        const iconPath = path.join(__dirname, 'assets', 'notification-icon.png')
        mergedOptions.icon = nativeImage.createFromPath(iconPath)
      }

      const notification = new Notification(mergedOptions)

      // 设置事件监听
      this.setupNotificationEvents(notification, options)

      notification.show()

      return { success: true, notification }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  setupNotificationEvents(notification, options) {
    notification.on('show', () => {
      console.log('通知已显示')
      if (options.onShow) options.onShow()
    })

    notification.on('click', () => {
      console.log('通知被点击')
      if (options.onClick) options.onClick()

      // 默认行为：显示主窗口
      this.showMainWindow()
    })

    notification.on('close', () => {
      console.log('通知已关闭')
      if (options.onClose) options.onClose()
    })

    notification.on('reply', (event, reply) => {
      console.log('通知回复:', reply)
      if (options.onReply) options.onReply(reply)
    })

    notification.on('action', (event, index) => {
      console.log('通知动作:', index)
      if (options.onAction) options.onAction(index)
    })
  }

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

  // 预定义的通知类型
  showInfoNotification(title, body, options = {}) {
    return this.showNotification({
      title,
      body,
      urgency: 'normal',
      ...options
    })
  }

  showWarningNotification(title, body, options = {}) {
    return this.showNotification({
      title,
      body,
      urgency: 'critical',
      icon: path.join(__dirname, 'assets', 'warning-icon.png'),
      ...options
    })
  }

  showErrorNotification(title, body, options = {}) {
    return this.showNotification({
      title,
      body,
      urgency: 'critical',
      icon: path.join(__dirname, 'assets', 'error-icon.png'),
      ...options
    })
  }

  showSuccessNotification(title, body, options = {}) {
    return this.showNotification({
      title,
      body,
      urgency: 'normal',
      icon: path.join(__dirname, 'assets', 'success-icon.png'),
      ...options
    })
  }
}

const notificationManager = new NotificationManager()
```

### 高级通知功能

```javascript
class AdvancedNotificationManager extends NotificationManager {
  constructor() {
    super()
    this.notificationHistory = []
    this.maxHistorySize = 100
  }

  async showNotification(options = {}) {
    const result = await super.showNotification(options)

    if (result.success) {
      // 添加到历史记录
      this.addToHistory({
        id: Date.now(),
        timestamp: new Date(),
        title: options.title,
        body: options.body,
        type: options.type || 'info'
      })
    }

    return result
  }

  addToHistory(notification) {
    this.notificationHistory.unshift(notification)

    // 限制历史记录大小
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize)
    }
  }

  getNotificationHistory() {
    return this.notificationHistory
  }

  clearNotificationHistory() {
    this.notificationHistory = []
  }

  // 批量通知
  async showBatchNotifications(notifications, delay = 1000) {
    for (let i = 0; i < notifications.length; i++) {
      await this.showNotification(notifications[i])

      // 延迟显示下一个通知
      if (i < notifications.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // 进度通知
  showProgressNotification(title, initialProgress = 0) {
    const progressId = Date.now()

    const updateProgress = (progress, body = '') => {
      const progressBar = '█'.repeat(Math.floor(progress / 5)) +
                         '░'.repeat(20 - Math.floor(progress / 5))

      this.showNotification({
        title,
        body: `${body}\n[${progressBar}] ${progress}%`,
        silent: true,
        timeoutType: 'never'
      })
    }

    updateProgress(initialProgress)

    return {
      update: updateProgress,
      complete: (body = '完成') => {
        this.showSuccessNotification(title, body)
      }
    }
  }

  // 定时通知
  scheduleNotification(options, delay) {
    return setTimeout(() => {
      this.showNotification(options)
    }, delay)
  }

  // 重复通知
  scheduleRepeatingNotification(options, interval) {
    return setInterval(() => {
      this.showNotification(options)
    }, interval)
  }
}
```

## 6.4 剪贴板操作

```javascript
const { clipboard, nativeImage } = require('electron')

class ClipboardManager {
  constructor() {
    this.setupIPC()
    this.clipboardHistory = []
    this.maxHistorySize = 50
    this.startWatching()
  }

  setupIPC() {
    const { ipcMain } = require('electron')

    ipcMain.handle('clipboard-read-text', () => {
      return this.readText()
    })

    ipcMain.handle('clipboard-write-text', (event, text) => {
      return this.writeText(text)
    })

    ipcMain.handle('clipboard-read-image', () => {
      return this.readImage()
    })

    ipcMain.handle('clipboard-write-image', (event, imagePath) => {
      return this.writeImage(imagePath)
    })

    ipcMain.handle('clipboard-get-history', () => {
      return this.getHistory()
    })

    ipcMain.handle('clipboard-clear-history', () => {
      return this.clearHistory()
    })
  }

  readText() {
    try {
      const text = clipboard.readText()
      return { success: true, text }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  writeText(text) {
    try {
      clipboard.writeText(text)
      this.addToHistory({ type: 'text', content: text })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  readImage() {
    try {
      const image = clipboard.readImage()
      if (image.isEmpty()) {
        return { success: false, error: 'No image in clipboard' }
      }

      return {
        success: true,
        image: {
          dataURL: image.toDataURL(),
          size: image.getSize()
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  writeImage(imagePath) {
    try {
      const image = nativeImage.createFromPath(imagePath)
      clipboard.writeImage(image)
      this.addToHistory({ type: 'image', content: imagePath })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  readHTML() {
    try {
      const html = clipboard.readHTML()
      return { success: true, html }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  writeHTML(html, text = '') {
    try {
      clipboard.writeHTML(html, text)
      this.addToHistory({ type: 'html', content: html, text })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  readRTF() {
    try {
      const rtf = clipboard.readRTF()
      return { success: true, rtf }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  writeRTF(rtf) {
    try {
      clipboard.writeRTF(rtf)
      this.addToHistory({ type: 'rtf', content: rtf })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  clear() {
    try {
      clipboard.clear()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  addToHistory(item) {
    const historyItem = {
      id: Date.now(),
      timestamp: new Date(),
      ...item
    }

    // 避免重复项
    const isDuplicate = this.clipboardHistory.some(existing =>
      existing.type === item.type && existing.content === item.content
    )

    if (!isDuplicate) {
      this.clipboardHistory.unshift(historyItem)

      // 限制历史记录大小
      if (this.clipboardHistory.length > this.maxHistorySize) {
        this.clipboardHistory = this.clipboardHistory.slice(0, this.maxHistorySize)
      }
    }
  }

  getHistory() {
    return { success: true, history: this.clipboardHistory }
  }

  clearHistory() {
    this.clipboardHistory = []
    return { success: true }
  }

  startWatching() {
    let lastText = clipboard.readText()

    setInterval(() => {
      const currentText = clipboard.readText()
      if (currentText !== lastText && currentText.length > 0) {
        this.addToHistory({ type: 'text', content: currentText })
        lastText = currentText

        // 通知渲染进程剪贴板变化
        BrowserWindow.getAllWindows().forEach(window => {
          window.webContents.send('clipboard-changed', {
            type: 'text',
            content: currentText
          })
        })
      }
    }, 1000)
  }
}

const clipboardManager = new ClipboardManager()
```

## 6.5 系统信息获取

```javascript
const os = require('os')
const { screen, powerMonitor, systemPreferences } = require('electron')

class SystemInfoManager {
  constructor() {
    this.setupIPC()
  }

  setupIPC() {
    const { ipcMain } = require('electron')

    ipcMain.handle('get-system-info', () => {
      return this.getSystemInfo()
    })

    ipcMain.handle('get-display-info', () => {
      return this.getDisplayInfo()
    })

    ipcMain.handle('get-power-info', () => {
      return this.getPowerInfo()
    })

    ipcMain.handle('get-network-info', () => {
      return this.getNetworkInfo()
    })
  }

  getSystemInfo() {
    try {
      return {
        success: true,
        info: {
          platform: process.platform,
          arch: process.arch,
          version: os.release(),
          hostname: os.hostname(),
          uptime: os.uptime(),
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          cpus: os.cpus(),
          networkInterfaces: os.networkInterfaces(),
          userInfo: os.userInfo(),
          homeDir: os.homedir(),
          tmpDir: os.tmpdir()
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  getDisplayInfo() {
    try {
      const displays = screen.getAllDisplays()
      const primaryDisplay = screen.getPrimaryDisplay()

      return {
        success: true,
        info: {
          displays: displays.map(display => ({
            id: display.id,
            bounds: display.bounds,
            workArea: display.workArea,
            scaleFactor: display.scaleFactor,
            rotation: display.rotation,
            internal: display.internal
          })),
          primaryDisplay: {
            id: primaryDisplay.id,
            bounds: primaryDisplay.bounds,
            workArea: primaryDisplay.workArea,
            scaleFactor: primaryDisplay.scaleFactor
          }
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  getPowerInfo() {
    try {
      return {
        success: true,
        info: {
          onBattery: powerMonitor.isOnBattery(),
          systemIdleState: powerMonitor.getSystemIdleState(60),
          systemIdleTime: powerMonitor.getSystemIdleTime()
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getNetworkInfo() {
    try {
      const online = await this.checkInternetConnection()

      return {
        success: true,
        info: {
          online,
          interfaces: os.networkInterfaces()
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async checkInternetConnection() {
    return new Promise((resolve) => {
      const { net } = require('electron')
      const request = net.request('https://www.google.com')

      request.on('response', () => {
        resolve(true)
      })

      request.on('error', () => {
        resolve(false)
      })

      request.setTimeout(5000, () => {
        resolve(false)
      })

      request.end()
    })
  }
}

const systemInfoManager = new SystemInfoManager()
```

## 本章小结

通过本章学习，你应该已经：
- ✅ 掌握了各种文件对话框的使用方法
- ✅ 学会了基础的文件系统操作
- ✅ 了解了文件监听和变化检测
- ✅ 掌握了文件预览和信息获取
- ✅ 学会了系统通知的创建和管理
- ✅ 掌握了剪贴板操作和历史记录
- ✅ 了解了系统信息的获取方法

在下一章中，我们将学习应用打包与分发的相关知识！
