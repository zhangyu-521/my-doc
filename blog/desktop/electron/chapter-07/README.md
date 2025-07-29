# 第7章：应用打包与分发

> 学习使用 electron-builder 进行应用打包、代码签名和自动更新，实现专业的应用分发

## 7.1 打包工具选择

Electron 应用有多种打包工具可选，每种都有其特点和适用场景。

### 主要打包工具对比

| 工具 | 特点 | 适用场景 |
|------|------|----------|
| **electron-builder** | 功能全面，配置灵活，支持自动更新 | 推荐用于生产环境 |
| **electron-packager** | 简单轻量，配置简单 | 适合简单应用或学习 |
| **electron-forge** | 官方推荐，集成度高 | 适合新项目 |

本教程主要使用 **electron-builder**，因为它功能最全面且在生产环境中使用最广泛。

### 安装 electron-builder

```bash
# 安装 electron-builder
npm install electron-builder --save-dev

# 或者使用 yarn
yarn add electron-builder --dev
```

## 7.2 基础打包配置

### package.json 配置

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "description": "我的 Electron 应用",
  "main": "main.js",
  "homepage": "https://myapp.com",
  "author": {
    "name": "你的名字",
    "email": "your.email@example.com",
    "url": "https://yourwebsite.com"
  },
  "scripts": {
    "start": "electron .",
    "dev": "electron . --enable-logging",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "dist": "npm run build",
    "pack": "electron-builder --dir",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.yourcompany.myapp",
    "productName": "My Electron App",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer.js",
      "index.html",
      "package.json",
      "node_modules/**/*",
      "assets/**/*"
    ],
    "extraResources": [
      {
        "from": "resources/",
        "to": "resources/",
        "filter": ["**/*"]
      }
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.ico",
      "requestedExecutionLevel": "asInvoker"
    },
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.icns",
      "category": "public.app-category.productivity",
      "hardenedRuntime": true,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64"]
        },
        {
          "target": "rpm",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.png",
      "category": "Office"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "My Electron App"
    },
    "dmg": {
      "title": "My Electron App",
      "icon": "build/icon.icns",
      "background": "build/dmg-background.png",
      "contents": [
        {
          "x": 410,
          "y": 150,
          "type": "link",
          "path": "/Applications"
        },
        {
          "x": 130,
          "y": 150,
          "type": "file"
        }
      ]
    }
  },
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest"
  }
}
```

### 目录结构

```
my-electron-app/
├── build/                    # 构建资源
│   ├── icon.ico             # Windows 图标
│   ├── icon.icns            # macOS 图标
│   ├── icon.png             # Linux 图标
│   ├── dmg-background.png   # macOS DMG 背景
│   └── entitlements.mac.plist # macOS 权限文件
├── resources/               # 额外资源文件
├── src/                     # 源代码
│   ├── main.js
│   ├── preload.js
│   ├── renderer.js
│   └── index.html
├── assets/                  # 应用资源
├── dist/                    # 构建输出目录
├── package.json
└── README.md
```

## 7.3 图标和资源准备

### 图标要求

不同平台对图标有不同的要求：

**Windows (.ico)**
- 包含多种尺寸：16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256
- 格式：ICO 文件

**macOS (.icns)**
- 包含多种尺寸：16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- 格式：ICNS 文件

**Linux (.png)**
- 推荐尺寸：512x512 或 1024x1024
- 格式：PNG 文件

### 图标生成脚本

```javascript
// scripts/generate-icons.js
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

class IconGenerator {
  constructor(sourceImage) {
    this.sourceImage = sourceImage
    this.buildDir = path.join(__dirname, '..', 'build')
  }

  async generateAllIcons() {
    // 确保构建目录存在
    if (!fs.existsSync(this.buildDir)) {
      fs.mkdirSync(this.buildDir, { recursive: true })
    }

    await this.generateWindowsIcon()
    await this.generateLinuxIcon()
    console.log('图标生成完成！')
  }

  async generateWindowsIcon() {
    const sizes = [16, 24, 32, 48, 64, 128, 256]
    const iconPath = path.join(this.buildDir, 'icon.ico')
    
    // 生成不同尺寸的 PNG 文件
    const pngFiles = []
    for (const size of sizes) {
      const pngPath = path.join(this.buildDir, `icon-${size}.png`)
      await sharp(this.sourceImage)
        .resize(size, size)
        .png()
        .toFile(pngPath)
      pngFiles.push(pngPath)
    }

    // 使用 png2icons 或类似工具将 PNG 转换为 ICO
    console.log('Windows 图标文件已生成:', iconPath)
  }

  async generateLinuxIcon() {
    const iconPath = path.join(this.buildDir, 'icon.png')
    
    await sharp(this.sourceImage)
      .resize(512, 512)
      .png()
      .toFile(iconPath)
    
    console.log('Linux 图标文件已生成:', iconPath)
  }

  async generateMacIcon() {
    // macOS 图标生成需要使用 iconutil 工具
    // 这里提供基本的 PNG 生成，实际的 ICNS 转换需要在 macOS 上进行
    const sizes = [16, 32, 64, 128, 256, 512, 1024]
    const iconsetDir = path.join(this.buildDir, 'icon.iconset')
    
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir)
    }

    for (const size of sizes) {
      const fileName = `icon_${size}x${size}.png`
      const filePath = path.join(iconsetDir, fileName)
      
      await sharp(this.sourceImage)
        .resize(size, size)
        .png()
        .toFile(filePath)
      
      // 生成 @2x 版本
      if (size <= 512) {
        const fileName2x = `icon_${size}x${size}@2x.png`
        const filePath2x = path.join(iconsetDir, fileName2x)
        
        await sharp(this.sourceImage)
          .resize(size * 2, size * 2)
          .png()
          .toFile(filePath2x)
      }
    }

    console.log('macOS 图标集已生成，请在 macOS 上运行以下命令生成 ICNS:')
    console.log(`iconutil -c icns ${iconsetDir}`)
  }
}

// 使用示例
if (require.main === module) {
  const sourceImage = process.argv[2] || 'source-icon.png'
  const generator = new IconGenerator(sourceImage)
  generator.generateAllIcons().catch(console.error)
}

module.exports = IconGenerator
```

## 7.4 高级打包配置

### 多环境配置

```javascript
// electron-builder.config.js
const config = {
  appId: 'com.yourcompany.myapp',
  productName: 'My Electron App',
  
  directories: {
    output: 'dist',
    buildResources: 'build'
  },

  files: [
    'dist-electron/**/*',
    'dist/**/*',
    'node_modules/**/*',
    'package.json'
  ],

  extraMetadata: {
    main: 'dist-electron/main.js'
  },

  // 开发环境配置
  ...(process.env.NODE_ENV === 'development' && {
    compression: 'store', // 不压缩，加快构建速度
    removePackageScripts: false
  }),

  // 生产环境配置
  ...(process.env.NODE_ENV === 'production' && {
    compression: 'maximum', // 最大压缩
    removePackageScripts: true
  }),

  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico',
    publisherName: 'Your Company Name',
    verifyUpdateCodeSignature: false
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'My Electron App',
    include: 'build/installer.nsh', // 自定义安装脚本
    script: 'build/installer.nsh'
  },

  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'build/icon.icns',
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist'
  },

  dmg: {
    title: '${productName}',
    icon: 'build/icon.icns',
    background: 'build/dmg-background.png',
    contents: [
      {
        x: 410,
        y: 150,
        type: 'link',
        path: '/Applications'
      },
      {
        x: 130,
        y: 150,
        type: 'file'
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  },

  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.png',
    category: 'Office',
    desktop: {
      Name: 'My Electron App',
      Comment: 'A great Electron application',
      Keywords: 'electron;app;productivity'
    }
  },

  // 发布配置
  publish: [
    {
      provider: 'github',
      owner: 'your-username',
      repo: 'your-repo'
    }
  ]
}

module.exports = config
```

### 自定义构建脚本

```javascript
// scripts/build.js
const builder = require('electron-builder')
const path = require('path')

class BuildManager {
  constructor() {
    this.config = require('../electron-builder.config.js')
  }

  async buildForPlatform(platform, arch = 'x64') {
    const targets = new Map()
    
    switch (platform) {
      case 'win':
        targets.set(builder.Platform.WINDOWS, new Map([
          [builder.Arch.x64, ['nsis', 'portable']]
        ]))
        break
      case 'mac':
        targets.set(builder.Platform.MAC, new Map([
          [builder.Arch.x64, ['dmg']],
          [builder.Arch.arm64, ['dmg']]
        ]))
        break
      case 'linux':
        targets.set(builder.Platform.LINUX, new Map([
          [builder.Arch.x64, ['AppImage', 'deb']]
        ]))
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    try {
      console.log(`开始构建 ${platform} 平台...`)
      
      const result = await builder.build({
        targets,
        config: this.config,
        publish: 'never' // 不自动发布
      })

      console.log(`${platform} 平台构建完成:`, result)
      return result
    } catch (error) {
      console.error(`${platform} 平台构建失败:`, error)
      throw error
    }
  }

  async buildAll() {
    const platforms = ['win', 'mac', 'linux']
    const results = {}

    for (const platform of platforms) {
      try {
        results[platform] = await this.buildForPlatform(platform)
      } catch (error) {
        results[platform] = { error: error.message }
      }
    }

    return results
  }

  async buildCurrent() {
    const platform = process.platform
    const platformMap = {
      'win32': 'win',
      'darwin': 'mac',
      'linux': 'linux'
    }

    const targetPlatform = platformMap[platform]
    if (!targetPlatform) {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    return await this.buildForPlatform(targetPlatform)
  }
}

// 命令行使用
if (require.main === module) {
  const buildManager = new BuildManager()
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    buildManager.buildCurrent().catch(console.error)
  } else {
    const platform = args[0]
    buildManager.buildForPlatform(platform).catch(console.error)
  }
}

module.exports = BuildManager
```

## 7.5 代码签名

代码签名是确保应用安全性和用户信任的重要步骤。

### Windows 代码签名

```javascript
// Windows 代码签名配置
const winConfig = {
  win: {
    certificateFile: 'path/to/certificate.p12',
    certificatePassword: process.env.CSC_KEY_PASSWORD,
    // 或者使用证书存储
    certificateSubjectName: 'Your Company Name',
    certificateSha1: 'certificate-thumbprint',
    
    // 时间戳服务器
    timeStampServer: 'http://timestamp.digicert.com',
    
    // 签名算法
    signingHashAlgorithms: ['sha256'],
    
    // 额外的签名参数
    signDlls: true
  }
}
```

### macOS 代码签名

```javascript
// macOS 代码签名配置
const macConfig = {
  mac: {
    // 开发者 ID
    identity: 'Developer ID Application: Your Name (TEAM_ID)',
    
    // 权限文件
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    
    // 强化运行时
    hardenedRuntime: true,
    
    // 公证
    notarize: {
      teamId: 'YOUR_TEAM_ID'
    }
  }
}
```

### 权限文件示例

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```

```

## 7.6 自动更新

自动更新是现代桌面应用的重要功能，让用户能够及时获得最新版本。

### 自动更新配置

```javascript
// 主进程中的自动更新管理
const { autoUpdater } = require('electron-updater')
const { app, dialog, BrowserWindow } = require('electron')

class AutoUpdateManager {
  constructor() {
    this.setupAutoUpdater()
    this.setupIPC()
  }

  setupAutoUpdater() {
    // 配置更新服务器
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'your-username',
      repo: 'your-repo',
      private: false
    })

    // 或者使用自定义服务器
    // autoUpdater.setFeedURL({
    //   provider: 'generic',
    //   url: 'https://your-update-server.com/updates'
    // })

    // 设置更新检查间隔（毫秒）
    autoUpdater.autoDownload = false // 不自动下载
    autoUpdater.autoInstallOnAppQuit = true

    this.setupUpdateEvents()
  }

  setupUpdateEvents() {
    // 检查更新时
    autoUpdater.on('checking-for-update', () => {
      console.log('正在检查更新...')
      this.sendToRenderer('update-checking')
    })

    // 发现可用更新
    autoUpdater.on('update-available', (info) => {
      console.log('发现可用更新:', info)
      this.sendToRenderer('update-available', info)
      this.showUpdateDialog(info)
    })

    // 没有可用更新
    autoUpdater.on('update-not-available', (info) => {
      console.log('当前已是最新版本')
      this.sendToRenderer('update-not-available', info)
    })

    // 下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`下载进度: ${progressObj.percent}%`)
      this.sendToRenderer('update-download-progress', progressObj)
    })

    // 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      console.log('更新下载完成')
      this.sendToRenderer('update-downloaded', info)
      this.showInstallDialog()
    })

    // 更新错误
    autoUpdater.on('error', (error) => {
      console.error('更新错误:', error)
      this.sendToRenderer('update-error', error.message)
    })
  }

  setupIPC() {
    const { ipcMain } = require('electron')

    ipcMain.handle('check-for-updates', () => {
      return this.checkForUpdates()
    })

    ipcMain.handle('download-update', () => {
      return this.downloadUpdate()
    })

    ipcMain.handle('install-update', () => {
      return this.installUpdate()
    })

    ipcMain.handle('get-app-version', () => {
      return app.getVersion()
    })
  }

  async checkForUpdates() {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  installUpdate() {
    autoUpdater.quitAndInstall()
  }

  sendToRenderer(channel, data) {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send(channel, data)
    }
  }

  async showUpdateDialog(updateInfo) {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${updateInfo.version}`,
      detail: updateInfo.releaseNotes || '点击下载按钮开始下载更新',
      buttons: ['下载更新', '稍后提醒', '跳过此版本'],
      defaultId: 0,
      cancelId: 1
    })

    switch (result.response) {
      case 0: // 下载更新
        this.downloadUpdate()
        break
      case 1: // 稍后提醒
        // 设置稍后提醒
        setTimeout(() => {
          this.checkForUpdates()
        }, 60 * 60 * 1000) // 1小时后再次检查
        break
      case 2: // 跳过此版本
        // 记录跳过的版本
        this.skipVersion(updateInfo.version)
        break
    }
  }

  async showInstallDialog() {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: '更新已下载',
      message: '更新已下载完成',
      detail: '点击"立即安装"重启应用并安装更新，或选择"稍后安装"在下次启动时安装',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      this.installUpdate()
    }
  }

  skipVersion(version) {
    const Store = require('electron-store')
    const store = new Store()
    store.set('skippedVersion', version)
  }

  isVersionSkipped(version) {
    const Store = require('electron-store')
    const store = new Store()
    return store.get('skippedVersion') === version
  }
}

// 使用自动更新管理器
const autoUpdateManager = new AutoUpdateManager()

// 应用准备就绪后检查更新
app.whenReady().then(() => {
  // 延迟检查更新，避免影响应用启动
  setTimeout(() => {
    autoUpdateManager.checkForUpdates()
  }, 5000)
})
```

### 渲染进程中的更新 UI

```javascript
// renderer/update-manager.js
class UpdateUI {
  constructor() {
    this.setupUpdateListeners()
    this.createUpdateUI()
  }

  setupUpdateListeners() {
    // 监听更新事件
    window.electronAPI.onUpdateChecking(() => {
      this.showUpdateStatus('正在检查更新...')
    })

    window.electronAPI.onUpdateAvailable((info) => {
      this.showUpdateAvailable(info)
    })

    window.electronAPI.onUpdateNotAvailable(() => {
      this.showUpdateStatus('当前已是最新版本')
    })

    window.electronAPI.onUpdateDownloadProgress((progress) => {
      this.updateDownloadProgress(progress)
    })

    window.electronAPI.onUpdateDownloaded(() => {
      this.showUpdateReady()
    })

    window.electronAPI.onUpdateError((error) => {
      this.showUpdateError(error)
    })
  }

  createUpdateUI() {
    const updateContainer = document.createElement('div')
    updateContainer.id = 'update-container'
    updateContainer.className = 'update-container hidden'

    updateContainer.innerHTML = `
      <div class="update-content">
        <div class="update-icon">🔄</div>
        <div class="update-title">应用更新</div>
        <div class="update-message" id="update-message"></div>
        <div class="update-progress" id="update-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <div class="progress-text" id="progress-text"></div>
        </div>
        <div class="update-actions" id="update-actions">
          <button id="check-update-btn" class="btn btn-primary">检查更新</button>
          <button id="download-update-btn" class="btn btn-success hidden">下载更新</button>
          <button id="install-update-btn" class="btn btn-warning hidden">安装更新</button>
          <button id="close-update-btn" class="btn btn-secondary">关闭</button>
        </div>
      </div>
    `

    document.body.appendChild(updateContainer)
    this.setupUpdateActions()
  }

  setupUpdateActions() {
    document.getElementById('check-update-btn').addEventListener('click', () => {
      window.electronAPI.checkForUpdates()
    })

    document.getElementById('download-update-btn').addEventListener('click', () => {
      window.electronAPI.downloadUpdate()
    })

    document.getElementById('install-update-btn').addEventListener('click', () => {
      window.electronAPI.installUpdate()
    })

    document.getElementById('close-update-btn').addEventListener('click', () => {
      this.hideUpdateUI()
    })
  }

  showUpdateUI() {
    document.getElementById('update-container').classList.remove('hidden')
  }

  hideUpdateUI() {
    document.getElementById('update-container').classList.add('hidden')
  }

  showUpdateStatus(message) {
    this.showUpdateUI()
    document.getElementById('update-message').textContent = message
    document.getElementById('update-progress').classList.add('hidden')
    document.getElementById('download-update-btn').classList.add('hidden')
    document.getElementById('install-update-btn').classList.add('hidden')
  }

  showUpdateAvailable(info) {
    this.showUpdateUI()
    document.getElementById('update-message').textContent =
      `发现新版本 ${info.version}`
    document.getElementById('download-update-btn').classList.remove('hidden')
  }

  updateDownloadProgress(progress) {
    document.getElementById('update-progress').classList.remove('hidden')
    document.getElementById('progress-fill').style.width = `${progress.percent}%`
    document.getElementById('progress-text').textContent =
      `${Math.round(progress.percent)}% (${this.formatBytes(progress.transferred)}/${this.formatBytes(progress.total)})`
  }

  showUpdateReady() {
    document.getElementById('update-message').textContent = '更新已下载完成'
    document.getElementById('update-progress').classList.add('hidden')
    document.getElementById('download-update-btn').classList.add('hidden')
    document.getElementById('install-update-btn').classList.remove('hidden')
  }

  showUpdateError(error) {
    this.showUpdateUI()
    document.getElementById('update-message').textContent = `更新失败: ${error}`
    document.getElementById('update-progress').classList.add('hidden')
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// 初始化更新 UI
document.addEventListener('DOMContentLoaded', () => {
  new UpdateUI()
})
```

## 7.7 发布和分发

### GitHub Releases 发布

```javascript
// scripts/publish.js
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class PublishManager {
  constructor() {
    this.packageJson = require('../package.json')
    this.version = this.packageJson.version
  }

  async publishToGitHub() {
    try {
      // 1. 构建应用
      console.log('开始构建应用...')
      execSync('npm run build', { stdio: 'inherit' })

      // 2. 创建 Git 标签
      console.log(`创建版本标签 v${this.version}...`)
      execSync(`git tag v${this.version}`)
      execSync(`git push origin v${this.version}`)

      // 3. 发布到 GitHub
      console.log('发布到 GitHub Releases...')
      execSync('npm run publish', { stdio: 'inherit' })

      console.log('发布完成！')
    } catch (error) {
      console.error('发布失败:', error.message)
      throw error
    }
  }

  async publishToCustomServer() {
    // 自定义服务器发布逻辑
    const distPath = path.join(__dirname, '..', 'dist')
    const files = fs.readdirSync(distPath)

    for (const file of files) {
      if (file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.AppImage')) {
        console.log(`上传文件: ${file}`)
        // 实现文件上传逻辑
        await this.uploadFile(path.join(distPath, file))
      }
    }
  }

  async uploadFile(filePath) {
    // 实现文件上传到自定义服务器的逻辑
    console.log(`上传文件: ${filePath}`)
  }

  generateReleaseNotes() {
    // 生成发布说明
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md')
    if (fs.existsSync(changelogPath)) {
      const changelog = fs.readFileSync(changelogPath, 'utf8')
      // 解析 changelog 获取当前版本的更新内容
      return this.parseChangelog(changelog, this.version)
    }
    return `版本 ${this.version} 发布`
  }

  parseChangelog(changelog, version) {
    const lines = changelog.split('\n')
    const versionLine = lines.findIndex(line => line.includes(version))

    if (versionLine === -1) return `版本 ${version} 发布`

    const nextVersionLine = lines.findIndex((line, index) =>
      index > versionLine && line.startsWith('##')
    )

    const endLine = nextVersionLine === -1 ? lines.length : nextVersionLine
    return lines.slice(versionLine + 1, endLine).join('\n').trim()
  }
}

// 使用发布管理器
if (require.main === module) {
  const publishManager = new PublishManager()
  publishManager.publishToGitHub().catch(console.error)
}
```

### 自动化 CI/CD 配置

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        CSC_LINK: ${{ secrets.CSC_LINK }}
        CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APPLE_ID_PASS: ${{ secrets.APPLE_ID_PASS }}

    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: ${{ matrix.os }}-build
        path: dist/

    - name: Release
      uses: softprops/action-gh-release@v1
      if: startsWith(github.ref, 'refs/tags/')
      with:
        files: dist/*
        draft: false
        prerelease: false
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 本章小结

通过本章学习，你应该已经：
- ✅ 了解了不同打包工具的特点和选择
- ✅ 掌握了 electron-builder 的基础配置
- ✅ 学会了准备应用图标和资源文件
- ✅ 了解了高级打包配置和多环境支持
- ✅ 掌握了代码签名的基本概念和配置
- ✅ 学会了实现自动更新功能
- ✅ 了解了应用发布和分发的流程
- ✅ 掌握了 CI/CD 自动化构建和发布

在下一章中，我们将学习性能优化和安全最佳实践！
