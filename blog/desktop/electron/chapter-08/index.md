# 第8章：性能优化与安全

> 学习 Electron 应用的性能优化技巧和安全最佳实践，构建高质量的桌面应用

## 8.1 性能优化策略

Electron 应用的性能优化需要从多个维度考虑，包括启动速度、内存使用、CPU 占用和用户体验。

### 应用启动优化

```javascript
// 主进程启动优化
const { app, BrowserWindow } = require('electron')
const path = require('path')

class StartupOptimizer {
  constructor() {
    this.preloadedWindows = new Map()
    this.setupOptimizations()
  }

  setupOptimizations() {
    // 1. 禁用不必要的功能
    app.disableHardwareAcceleration() // 如果不需要硬件加速
    app.disableDomainBlockingFor3DAPIs() // 禁用 3D API 域名阻止
    
    // 2. 设置应用用户模型 ID (Windows)
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.yourcompany.yourapp')
    }

    // 3. 预加载关键资源
    app.whenReady().then(() => {
      this.preloadCriticalResources()
      this.createMainWindow()
    })
  }

  async preloadCriticalResources() {
    // 预加载字体
    await this.preloadFonts()
    
    // 预加载图片资源
    await this.preloadImages()
    
    // 预热 V8 引擎
    this.warmupV8()
  }

  async preloadFonts() {
    // 预加载自定义字体
    const fontPaths = [
      path.join(__dirname, 'assets/fonts/custom-font.woff2')
    ]
    
    // 在主进程中预加载字体文件
    for (const fontPath of fontPaths) {
      try {
        const fs = require('fs')
        await fs.promises.readFile(fontPath)
      } catch (error) {
        console.warn('字体预加载失败:', fontPath)
      }
    }
  }

  async preloadImages() {
    // 预加载关键图片
    const { nativeImage } = require('electron')
    const imagePaths = [
      path.join(__dirname, 'assets/icons/app-icon.png'),
      path.join(__dirname, 'assets/images/splash.png')
    ]
    
    for (const imagePath of imagePaths) {
      try {
        nativeImage.createFromPath(imagePath)
      } catch (error) {
        console.warn('图片预加载失败:', imagePath)
      }
    }
  }

  warmupV8() {
    // 执行一些 JavaScript 代码来预热 V8 引擎
    const warmupCode = `
      const arr = new Array(1000).fill(0).map((_, i) => i)
      const sum = arr.reduce((a, b) => a + b, 0)
      JSON.stringify({ sum, timestamp: Date.now() })
    `
    
    try {
      eval(warmupCode)
    } catch (error) {
      console.warn('V8 预热失败:', error)
    }
  }

  createMainWindow() {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // 延迟显示
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        // 性能优化选项
        backgroundThrottling: false, // 禁用后台节流
        offscreen: false, // 禁用离屏渲染
        enableWebSQL: false, // 禁用 WebSQL
        webgl: false, // 如果不需要 WebGL
        plugins: false, // 禁用插件
        experimentalFeatures: false // 禁用实验性功能
      }
    })

    // 页面准备就绪后再显示
    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
      
      // 可选：添加淡入效果
      mainWindow.setOpacity(0)
      mainWindow.show()
      
      let opacity = 0
      const fadeIn = setInterval(() => {
        opacity += 0.1
        mainWindow.setOpacity(opacity)
        if (opacity >= 1) {
          clearInterval(fadeIn)
        }
      }, 16) // 60fps
    })

    mainWindow.loadFile('index.html')
    return mainWindow
  }

  // 窗口池管理
  createWindowPool(count = 2) {
    for (let i = 0; i < count; i++) {
      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
        }
      })
      
      this.preloadedWindows.set(`pool_${i}`, window)
    }
  }

  getPooledWindow() {
    const [id, window] = this.preloadedWindows.entries().next().value
    if (window) {
      this.preloadedWindows.delete(id)
      return window
    }
    
    // 池中没有窗口时创建新的
    return this.createMainWindow()
  }
}

const startupOptimizer = new StartupOptimizer()
```

### 内存优化

```javascript
// 内存监控和优化
class MemoryOptimizer {
  constructor() {
    this.memoryThreshold = 500 * 1024 * 1024 // 500MB
    this.setupMemoryMonitoring()
  }

  setupMemoryMonitoring() {
    // 定期检查内存使用
    setInterval(() => {
      this.checkMemoryUsage()
    }, 30000) // 每30秒检查一次

    // 监听内存警告
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        console.warn('内存泄漏警告:', warning.message)
        this.handleMemoryLeak()
      }
    })
  }

  checkMemoryUsage() {
    const usage = process.memoryUsage()
    const totalMemory = usage.rss + usage.heapUsed + usage.external
    
    console.log('内存使用情况:', {
      rss: this.formatBytes(usage.rss),
      heapTotal: this.formatBytes(usage.heapTotal),
      heapUsed: this.formatBytes(usage.heapUsed),
      external: this.formatBytes(usage.external),
      total: this.formatBytes(totalMemory)
    })

    if (totalMemory > this.memoryThreshold) {
      console.warn('内存使用过高，开始清理...')
      this.performMemoryCleanup()
    }
  }

  performMemoryCleanup() {
    // 1. 强制垃圾回收
    if (global.gc) {
      global.gc()
    }

    // 2. 清理不必要的缓存
    this.clearCaches()

    // 3. 关闭不活跃的窗口
    this.closeInactiveWindows()

    // 4. 清理事件监听器
    this.cleanupEventListeners()
  }

  clearCaches() {
    // 清理 Electron 缓存
    const { session } = require('electron')
    const defaultSession = session.defaultSession
    
    defaultSession.clearCache().then(() => {
      console.log('缓存已清理')
    })

    // 清理存储数据
    defaultSession.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers']
    })
  }

  closeInactiveWindows() {
    const { BrowserWindow } = require('electron')
    const windows = BrowserWindow.getAllWindows()
    
    windows.forEach(window => {
      // 关闭超过1小时未活跃的窗口
      const lastActivity = window.lastActivity || Date.now()
      const inactiveTime = Date.now() - lastActivity
      
      if (inactiveTime > 60 * 60 * 1000 && !window.isFocused()) {
        console.log('关闭不活跃窗口:', window.id)
        window.close()
      }
    })
  }

  cleanupEventListeners() {
    // 清理可能的内存泄漏
    const { ipcMain } = require('electron')
    
    // 移除过期的 IPC 监听器
    const listeners = ipcMain.eventNames()
    listeners.forEach(eventName => {
      const listenerCount = ipcMain.listenerCount(eventName)
      if (listenerCount > 10) {
        console.warn(`事件 ${eventName} 有 ${listenerCount} 个监听器，可能存在内存泄漏`)
      }
    })
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 内存使用报告
  generateMemoryReport() {
    const usage = process.memoryUsage()
    const { BrowserWindow } = require('electron')
    const windows = BrowserWindow.getAllWindows()
    
    return {
      process: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external
      },
      windows: windows.map(window => ({
        id: window.id,
        title: window.getTitle(),
        url: window.webContents.getURL(),
        memory: window.webContents.getProcessMemoryInfo ? 
                window.webContents.getProcessMemoryInfo() : null
      })),
      timestamp: Date.now()
    }
  }
}

const memoryOptimizer = new MemoryOptimizer()
```

## 8.2 渲染进程优化

### 前端性能优化

```javascript
// 渲染进程性能优化
class RendererOptimizer {
  constructor() {
    this.setupPerformanceMonitoring()
    this.optimizeRendering()
  }

  setupPerformanceMonitoring() {
    // 监控页面性能
    window.addEventListener('load', () => {
      this.measurePerformance()
    })

    // 监控长任务
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // 超过50ms的任务
            console.warn('长任务检测:', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['longtask'] })
    }
  }

  measurePerformance() {
    const navigation = performance.getEntriesByType('navigation')[0]
    const paint = performance.getEntriesByType('paint')
    
    const metrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
    }
    
    console.log('页面性能指标:', metrics)
    
    // 发送性能数据到主进程
    window.electronAPI?.sendPerformanceMetrics?.(metrics)
  }

  optimizeRendering() {
    // 1. 虚拟滚动优化
    this.setupVirtualScrolling()
    
    // 2. 图片懒加载
    this.setupLazyLoading()
    
    // 3. 防抖和节流
    this.setupDebouncing()
    
    // 4. 内存泄漏防护
    this.setupMemoryLeakPrevention()
  }

  setupVirtualScrolling() {
    // 虚拟滚动实现
    class VirtualScroll {
      constructor(container, itemHeight, items) {
        this.container = container
        this.itemHeight = itemHeight
        this.items = items
        this.visibleStart = 0
        this.visibleEnd = 0
        this.scrollTop = 0
        
        this.init()
      }

      init() {
        this.container.style.height = `${this.items.length * this.itemHeight}px`
        this.container.style.position = 'relative'
        this.container.style.overflow = 'auto'
        
        this.container.addEventListener('scroll', this.handleScroll.bind(this))
        this.updateVisibleItems()
      }

      handleScroll() {
        this.scrollTop = this.container.scrollTop
        this.updateVisibleItems()
      }

      updateVisibleItems() {
        const containerHeight = this.container.clientHeight
        this.visibleStart = Math.floor(this.scrollTop / this.itemHeight)
        this.visibleEnd = Math.min(
          this.visibleStart + Math.ceil(containerHeight / this.itemHeight) + 1,
          this.items.length
        )
        
        this.renderVisibleItems()
      }

      renderVisibleItems() {
        // 清空容器
        this.container.innerHTML = ''
        
        // 渲染可见项
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
          const item = document.createElement('div')
          item.style.position = 'absolute'
          item.style.top = `${i * this.itemHeight}px`
          item.style.height = `${this.itemHeight}px`
          item.textContent = this.items[i]
          
          this.container.appendChild(item)
        }
      }
    }

    // 使用虚拟滚动
    const container = document.getElementById('large-list')
    if (container) {
      new VirtualScroll(container, 50, Array.from({ length: 10000 }, (_, i) => `Item ${i}`))
    }
  }

  setupLazyLoading() {
    // 图片懒加载
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.classList.remove('lazy')
          imageObserver.unobserve(img)
        }
      })
    })

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img)
    })
  }

  setupDebouncing() {
    // 防抖函数
    function debounce(func, wait) {
      let timeout
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout)
          func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
      }
    }

    // 节流函数
    function throttle(func, limit) {
      let inThrottle
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args)
          inThrottle = true
          setTimeout(() => inThrottle = false, limit)
        }
      }
    }

    // 应用到搜索输入
    const searchInput = document.getElementById('search')
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this.performSearch(e.target.value)
      }, 300))
    }

    // 应用到滚动事件
    window.addEventListener('scroll', throttle(() => {
      this.handleScroll()
    }, 16)) // 60fps
  }

  setupMemoryLeakPrevention() {
    // 清理定时器
    const timers = new Set()
    
    const originalSetTimeout = window.setTimeout
    const originalSetInterval = window.setInterval
    
    window.setTimeout = function(callback, delay) {
      const id = originalSetTimeout(callback, delay)
      timers.add(id)
      return id
    }
    
    window.setInterval = function(callback, delay) {
      const id = originalSetInterval(callback, delay)
      timers.add(id)
      return id
    }
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      timers.forEach(id => {
        clearTimeout(id)
        clearInterval(id)
      })
      timers.clear()
    })
  }

  performSearch(query) {
    // 搜索实现
    console.log('搜索:', query)
  }

  handleScroll() {
    // 滚动处理
    console.log('滚动位置:', window.scrollY)
  }
}

// 初始化渲染优化器
document.addEventListener('DOMContentLoaded', () => {
  new RendererOptimizer()
})


// 初始化渲染优化器
document.addEventListener('DOMContentLoaded', () => {
  new RendererOptimizer()
})
```

## 8.3 安全最佳实践

Electron 应用的安全性至关重要，需要从多个层面进行防护。

### 基础安全配置

```javascript
// 安全的 BrowserWindow 配置
const { BrowserWindow } = require('electron')
const path = require('path')

class SecurityManager {
  constructor() {
    this.setupSecureDefaults()
  }

  createSecureWindow(options = {}) {
    const secureDefaults = {
      webPreferences: {
        // 核心安全设置
        nodeIntegration: false,           // 禁用 Node.js 集成
        contextIsolation: true,           // 启用上下文隔离
        enableRemoteModule: false,        // 禁用 remote 模块
        allowRunningInsecureContent: false, // 禁止运行不安全内容
        experimentalFeatures: false,      // 禁用实验性功能

        // 沙箱模式
        sandbox: true,                    // 启用沙箱
        preload: path.join(__dirname, 'secure-preload.js'),

        // 网络安全
        webSecurity: true,                // 启用 Web 安全
        allowRunningInsecureContent: false,

        // 其他安全选项
        plugins: false,                   // 禁用插件
        webgl: false,                     // 禁用 WebGL (如果不需要)
        enableWebSQL: false,              // 禁用 WebSQL

        // 权限控制
        permissions: ['notifications'],   // 明确指定允许的权限
      },

      // 窗口安全选项
      show: false,                        // 延迟显示
      titleBarStyle: 'default',          // 使用默认标题栏
    }

    const mergedOptions = this.deepMerge(secureDefaults, options)
    const window = new BrowserWindow(mergedOptions)

    this.setupWindowSecurity(window)
    return window
  }

  setupWindowSecurity(window) {
    // 1. 阻止新窗口创建
    window.webContents.setWindowOpenHandler(({ url }) => {
      // 只允许特定域名的窗口
      const allowedDomains = ['https://yourdomain.com']
      const urlObj = new URL(url)

      if (allowedDomains.includes(urlObj.origin)) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true
            }
          }
        }
      }

      return { action: 'deny' }
    })

    // 2. 阻止导航到外部 URL
    window.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl)

      // 只允许本地文件和特定域名
      if (parsedUrl.protocol !== 'file:' &&
          !this.isAllowedDomain(parsedUrl.origin)) {
        event.preventDefault()
        console.warn('阻止导航到:', navigationUrl)
      }
    })

    // 3. 阻止下载
    window.webContents.session.on('will-download', (event, item, webContents) => {
      // 检查下载文件类型和来源
      const allowedExtensions = ['.txt', '.json', '.csv']
      const fileExtension = path.extname(item.getFilename())

      if (!allowedExtensions.includes(fileExtension)) {
        event.preventDefault()
        console.warn('阻止下载文件:', item.getFilename())
      }
    })

    // 4. 内容安全策略
    window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https:; " +
            "font-src 'self'; " +
            "object-src 'none'; " +
            "media-src 'self'; " +
            "frame-src 'none';"
          ]
        }
      })
    })
  }

  isAllowedDomain(origin) {
    const allowedDomains = [
      'https://yourdomain.com',
      'https://api.yourdomain.com'
    ]
    return allowedDomains.includes(origin)
  }

  setupSecureDefaults() {
    const { app, session } = require('electron')

    // 应用级安全设置
    app.on('web-contents-created', (event, contents) => {
      // 阻止权限请求
      contents.on('permission-request-handled', (event, permission, granted) => {
        console.log(`权限请求: ${permission}, 授权: ${granted}`)
      })

      // 阻止证书错误
      contents.on('certificate-error', (event, url, error, certificate, callback) => {
        event.preventDefault()
        callback(false) // 拒绝不安全的证书
      })
    })

    // 会话安全设置
    app.whenReady().then(() => {
      const defaultSession = session.defaultSession

      // 设置权限处理
      defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['notifications', 'clipboard-read']
        callback(allowedPermissions.includes(permission))
      })

      // 设置权限检查处理
      defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        const allowedPermissions = ['notifications', 'clipboard-read']
        return allowedPermissions.includes(permission)
      })
    })
  }

  deepMerge(target, source) {
    const output = Object.assign({}, target)
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] })
          else
            output[key] = this.deepMerge(target[key], source[key])
        } else {
          Object.assign(output, { [key]: source[key] })
        }
      })
    }
    return output
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item)
  }
}

const securityManager = new SecurityManager()
```

### 安全的 Preload 脚本

```javascript
// secure-preload.js - 安全的预加载脚本
const { contextBridge, ipcRenderer } = require('electron')

// 输入验证函数
function validateInput(input, type, maxLength = 1000) {
  if (typeof input !== type) {
    throw new Error(`Invalid input type. Expected ${type}, got ${typeof input}`)
  }

  if (type === 'string' && input.length > maxLength) {
    throw new Error(`Input too long. Maximum length is ${maxLength}`)
  }

  return true
}

// 安全的 API 暴露
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作 - 带输入验证
  readFile: async (filePath) => {
    validateInput(filePath, 'string', 500)
    return ipcRenderer.invoke('secure-read-file', filePath)
  },

  writeFile: async (filePath, content) => {
    validateInput(filePath, 'string', 500)
    validateInput(content, 'string', 1000000) // 1MB 限制
    return ipcRenderer.invoke('secure-write-file', filePath, content)
  },

  // 系统信息 - 只读访问
  getSystemInfo: () => {
    return ipcRenderer.invoke('get-system-info')
  },

  // 通知 - 带内容过滤
  showNotification: (title, body) => {
    validateInput(title, 'string', 100)
    validateInput(body, 'string', 500)

    // 过滤 HTML 标签
    const cleanTitle = title.replace(/<[^>]*>/g, '')
    const cleanBody = body.replace(/<[^>]*>/g, '')

    return ipcRenderer.invoke('show-notification', cleanTitle, cleanBody)
  },

  // 事件监听 - 限制事件类型
  on: (channel, callback) => {
    const allowedChannels = ['app-update', 'system-notification', 'file-changed']

    if (!allowedChannels.includes(channel)) {
      throw new Error(`Channel ${channel} is not allowed`)
    }

    ipcRenderer.on(channel, (event, ...args) => {
      callback(...args)
    })
  },

  // 移除监听器
  removeAllListeners: (channel) => {
    const allowedChannels = ['app-update', 'system-notification', 'file-changed']

    if (!allowedChannels.includes(channel)) {
      throw new Error(`Channel ${channel} is not allowed`)
    }

    ipcRenderer.removeAllListeners(channel)
  }
})

// 安全检查
window.addEventListener('DOMContentLoaded', () => {
  // 检查是否在安全环境中
  if (window.location.protocol !== 'file:') {
    console.warn('应用未在安全的 file:// 协议下运行')
  }

  // 禁用开发者工具快捷键（生产环境）
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('keydown', (e) => {
      // 禁用 F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault()
        return false
      }
    })

    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      return false
    })
  }
})
```

### 数据加密和存储安全

```javascript
// 数据安全管理
const crypto = require('crypto')
const { safeStorage } = require('electron')

class DataSecurityManager {
  constructor() {
    this.algorithm = 'aes-256-gcm'
    this.keyLength = 32
    this.ivLength = 16
    this.tagLength = 16
  }

  // 生成安全的随机密钥
  generateKey() {
    return crypto.randomBytes(this.keyLength)
  }

  // 加密数据
  encrypt(data, key) {
    try {
      const iv = crypto.randomBytes(this.ivLength)
      const cipher = crypto.createCipher(this.algorithm, key, iv)

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const tag = cipher.getAuthTag()

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      }
    } catch (error) {
      throw new Error(`加密失败: ${error.message}`)
    }
  }

  // 解密数据
  decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, tag } = encryptedData
      const decipher = crypto.createDecipher(this.algorithm, key, Buffer.from(iv, 'hex'))

      decipher.setAuthTag(Buffer.from(tag, 'hex'))

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return JSON.parse(decrypted)
    } catch (error) {
      throw new Error(`解密失败: ${error.message}`)
    }
  }

  // 使用 Electron 的 safeStorage
  encryptWithSafeStorage(data) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统不支持安全存储')
    }

    const buffer = Buffer.from(JSON.stringify(data), 'utf8')
    return safeStorage.encryptString(buffer.toString())
  }

  decryptWithSafeStorage(encryptedData) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统不支持安全存储')
    }

    const decrypted = safeStorage.decryptString(encryptedData)
    return JSON.parse(decrypted)
  }

  // 安全存储敏感数据
  secureStore(key, data) {
    try {
      const Store = require('electron-store')
      const store = new Store({
        encryptionKey: 'your-encryption-key', // 在生产环境中使用更安全的密钥管理
        serialize: (value) => {
          return this.encryptWithSafeStorage(value)
        },
        deserialize: (value) => {
          return this.decryptWithSafeStorage(value)
        }
      })

      store.set(key, data)
      return true
    } catch (error) {
      console.error('安全存储失败:', error)
      return false
    }
  }

  // 安全读取敏感数据
  secureRetrieve(key) {
    try {
      const Store = require('electron-store')
      const store = new Store({
        encryptionKey: 'your-encryption-key',
        serialize: (value) => {
          return this.encryptWithSafeStorage(value)
        },
        deserialize: (value) => {
          return this.decryptWithSafeStorage(value)
        }
      })

      return store.get(key)
    } catch (error) {
      console.error('安全读取失败:', error)
      return null
    }
  }

  // 密码哈希
  hashPassword(password, salt) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex')
    }

    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    return {
      hash: hash.toString('hex'),
      salt: salt
    }
  }

  // 验证密码
  verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    return hash === verifyHash.toString('hex')
  }

  // 生成安全的随机令牌
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex')
  }

  // 安全删除敏感数据
  secureDelete(key) {
    try {
      const Store = require('electron-store')
      const store = new Store()

      // 覆写数据
      store.set(key, crypto.randomBytes(1024).toString('hex'))

      // 删除数据
      store.delete(key)

      return true
    } catch (error) {
      console.error('安全删除失败:', error)
      return false
    }
  }
}

const dataSecurityManager = new DataSecurityManager()
```

### 网络安全

```javascript
// 网络安全管理
class NetworkSecurityManager {
  constructor() {
    this.allowedHosts = [
      'api.yourdomain.com',
      'cdn.yourdomain.com'
    ]
    this.setupNetworkSecurity()
  }

  setupNetworkSecurity() {
    const { session } = require('electron')

    // 设置网络请求过滤
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url)

      // 检查是否为允许的主机
      if (this.isAllowedHost(url.hostname)) {
        callback({ cancel: false })
      } else {
        console.warn('阻止网络请求:', details.url)
        callback({ cancel: true })
      }
    })

    // 设置请求头
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = {
        ...details.requestHeaders,
        'User-Agent': 'YourApp/1.0.0', // 自定义 User-Agent
        'X-Requested-With': 'YourApp'   // 添加自定义头
      }

      // 移除可能泄露信息的头
      delete headers['Referer']

      callback({ requestHeaders: headers })
    })
  }

  isAllowedHost(hostname) {
    return this.allowedHosts.includes(hostname) ||
           hostname === 'localhost' ||
           hostname === '127.0.0.1'
  }

  // 安全的 HTTP 请求
  async secureRequest(url, options = {}) {
    const urlObj = new URL(url)

    // 检查协议
    if (urlObj.protocol !== 'https:' && urlObj.hostname !== 'localhost') {
      throw new Error('只允许 HTTPS 请求')
    }

    // 检查主机
    if (!this.isAllowedHost(urlObj.hostname)) {
      throw new Error(`不允许的主机: ${urlObj.hostname}`)
    }

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'YourApp/1.0.0'
      },
      timeout: 10000 // 10秒超时
    }

    const mergedOptions = { ...defaultOptions, ...options }

    try {
      const { net } = require('electron')
      const request = net.request({
        url,
        ...mergedOptions
      })

      return new Promise((resolve, reject) => {
        let responseData = ''

        request.on('response', (response) => {
          response.on('data', (chunk) => {
            responseData += chunk
          })

          response.on('end', () => {
            try {
              const data = JSON.parse(responseData)
              resolve(data)
            } catch (error) {
              reject(new Error('响应解析失败'))
            }
          })
        })

        request.on('error', (error) => {
          reject(error)
        })

        // 设置超时
        setTimeout(() => {
          request.abort()
          reject(new Error('请求超时'))
        }, mergedOptions.timeout)

        if (mergedOptions.body) {
          request.write(JSON.stringify(mergedOptions.body))
        }

        request.end()
      })
    } catch (error) {
      throw new Error(`网络请求失败: ${error.message}`)
    }
  }

  // 验证 SSL 证书
  validateCertificate(certificate) {
    // 实现证书验证逻辑
    const validIssuers = [
      'Let\'s Encrypt',
      'DigiCert',
      'GlobalSign'
    ]

    return validIssuers.some(issuer =>
      certificate.issuerName.includes(issuer)
    )
  }
}

const networkSecurityManager = new NetworkSecurityManager()
```

## 本章小结

通过本章学习，你应该已经：
- ✅ 掌握了应用启动优化的技巧
- ✅ 学会了内存监控和优化方法
- ✅ 了解了渲染进程的性能优化策略
- ✅ 掌握了虚拟滚动和懒加载等技术
- ✅ 学会了 Electron 应用的安全配置
- ✅ 了解了数据加密和安全存储
- ✅ 掌握了网络安全最佳实践
- ✅ 学会了防范常见的安全威胁

在下一章中，我们将通过一个完整的实战项目来综合运用所学知识！
