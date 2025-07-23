# 第9章：实战项目：桌面笔记应用

> 综合运用前面学到的所有知识，开发一个功能完整的桌面笔记应用

## 9.1 项目需求分析

我们将开发一个名为 "ElectronNotes" 的桌面笔记应用，具备以下功能：

### 核心功能
- ✅ 创建、编辑、删除笔记
- ✅ 笔记分类和标签管理
- ✅ 全文搜索功能
- ✅ Markdown 支持
- ✅ 文件导入导出
- ✅ 数据同步和备份

### 高级功能
- ✅ 多窗口支持
- ✅ 主题切换
- ✅ 快捷键支持
- ✅ 系统托盘集成
- ✅ 自动保存
- ✅ 版本历史

### 技术栈
- **主框架**: Electron
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **编辑器**: Monaco Editor (VS Code 编辑器)
- **数据存储**: SQLite + electron-store
- **UI 框架**: 自定义 CSS + 部分 Web Components
- **构建工具**: electron-builder

## 9.2 项目架构设计

### 目录结构

```
electron-notes/
├── src/
│   ├── main/                    # 主进程
│   │   ├── main.js             # 主进程入口
│   │   ├── menu.js             # 菜单管理
│   │   ├── window-manager.js   # 窗口管理
│   │   ├── database.js         # 数据库管理
│   │   ├── file-manager.js     # 文件管理
│   │   └── tray.js             # 系统托盘
│   ├── renderer/               # 渲染进程
│   │   ├── index.html          # 主页面
│   │   ├── css/                # 样式文件
│   │   ├── js/                 # JavaScript 文件
│   │   └── components/         # 组件
│   ├── preload/                # 预加载脚本
│   │   └── preload.js
│   └── shared/                 # 共享代码
│       ├── constants.js
│       └── utils.js
├── assets/                     # 资源文件
│   ├── icons/
│   ├── images/
│   └── fonts/
├── build/                      # 构建资源
├── dist/                       # 构建输出
├── database/                   # 数据库文件
├── package.json
├── electron-builder.config.js
└── README.md
```

### 数据模型设计

```javascript
// src/shared/models.js
class Note {
  constructor(data = {}) {
    this.id = data.id || null
    this.title = data.title || '无标题'
    this.content = data.content || ''
    this.categoryId = data.categoryId || null
    this.tags = data.tags || []
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
    this.isMarkdown = data.isMarkdown || false
    this.isFavorite = data.isFavorite || false
    this.isDeleted = data.isDeleted || false
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      categoryId: this.categoryId,
      tags: JSON.stringify(this.tags),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      isMarkdown: this.isMarkdown ? 1 : 0,
      isFavorite: this.isFavorite ? 1 : 0,
      isDeleted: this.isDeleted ? 1 : 0
    }
  }

  static fromJSON(data) {
    return new Note({
      ...data,
      tags: JSON.parse(data.tags || '[]'),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      isMarkdown: Boolean(data.isMarkdown),
      isFavorite: Boolean(data.isFavorite),
      isDeleted: Boolean(data.isDeleted)
    })
  }
}

class Category {
  constructor(data = {}) {
    this.id = data.id || null
    this.name = data.name || ''
    this.color = data.color || '#007acc'
    this.icon = data.icon || 'folder'
    this.parentId = data.parentId || null
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      icon: this.icon,
      parentId: this.parentId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    }
  }

  static fromJSON(data) {
    return new Category({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    })
  }
}

class Tag {
  constructor(data = {}) {
    this.id = data.id || null
    this.name = data.name || ''
    this.color = data.color || '#666666'
    this.createdAt = data.createdAt || new Date()
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      createdAt: this.createdAt.toISOString()
    }
  }

  static fromJSON(data) {
    return new Tag({
      ...data,
      createdAt: new Date(data.createdAt)
    })
  }
}

module.exports = { Note, Category, Tag }
```

## 9.3 主进程实现

### 主进程入口

```javascript
// src/main/main.js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const WindowManager = require('./window-manager')
const MenuManager = require('./menu')
const DatabaseManager = require('./database')
const FileManager = require('./file-manager')
const TrayManager = require('./tray')

class ElectronNotesApp {
  constructor() {
    this.windowManager = null
    this.menuManager = null
    this.databaseManager = null
    this.fileManager = null
    this.trayManager = null
    
    this.setupApp()
  }

  setupApp() {
    // 设置应用 ID
    app.setAppUserModelId('com.electronotes.app')
    
    // 单实例应用
    const gotTheLock = app.requestSingleInstanceLock()
    
    if (!gotTheLock) {
      app.quit()
      return
    }

    app.on('second-instance', () => {
      // 当运行第二个实例时，聚焦到主窗口
      if (this.windowManager) {
        this.windowManager.focusMainWindow()
      }
    })

    // 应用事件
    app.whenReady().then(() => {
      this.initializeApp()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    app.on('activate', () => {
      if (this.windowManager && this.windowManager.getWindowCount() === 0) {
        this.windowManager.createMainWindow()
      }
    })

    app.on('before-quit', () => {
      this.cleanup()
    })
  }

  async initializeApp() {
    try {
      // 初始化数据库
      this.databaseManager = new DatabaseManager()
      await this.databaseManager.initialize()

      // 初始化文件管理器
      this.fileManager = new FileManager(this.databaseManager)

      // 初始化窗口管理器
      this.windowManager = new WindowManager()
      
      // 初始化菜单
      this.menuManager = new MenuManager(this.windowManager, this.fileManager)
      
      // 初始化系统托盘
      this.trayManager = new TrayManager(this.windowManager)

      // 设置 IPC 处理
      this.setupIPC()

      // 创建主窗口
      this.windowManager.createMainWindow()

      console.log('ElectronNotes 应用初始化完成')
    } catch (error) {
      console.error('应用初始化失败:', error)
      app.quit()
    }
  }

  setupIPC() {
    // 笔记相关 IPC
    ipcMain.handle('notes:getAll', () => {
      return this.databaseManager.getAllNotes()
    })

    ipcMain.handle('notes:getById', (event, id) => {
      return this.databaseManager.getNoteById(id)
    })

    ipcMain.handle('notes:create', (event, noteData) => {
      return this.databaseManager.createNote(noteData)
    })

    ipcMain.handle('notes:update', (event, id, noteData) => {
      return this.databaseManager.updateNote(id, noteData)
    })

    ipcMain.handle('notes:delete', (event, id) => {
      return this.databaseManager.deleteNote(id)
    })

    ipcMain.handle('notes:search', (event, query) => {
      return this.databaseManager.searchNotes(query)
    })

    // 分类相关 IPC
    ipcMain.handle('categories:getAll', () => {
      return this.databaseManager.getAllCategories()
    })

    ipcMain.handle('categories:create', (event, categoryData) => {
      return this.databaseManager.createCategory(categoryData)
    })

    ipcMain.handle('categories:update', (event, id, categoryData) => {
      return this.databaseManager.updateCategory(id, categoryData)
    })

    ipcMain.handle('categories:delete', (event, id) => {
      return this.databaseManager.deleteCategory(id)
    })

    // 标签相关 IPC
    ipcMain.handle('tags:getAll', () => {
      return this.databaseManager.getAllTags()
    })

    ipcMain.handle('tags:create', (event, tagData) => {
      return this.databaseManager.createTag(tagData)
    })

    // 文件相关 IPC
    ipcMain.handle('file:import', (event, filePath) => {
      return this.fileManager.importFile(filePath)
    })

    ipcMain.handle('file:export', (event, noteId, format) => {
      return this.fileManager.exportNote(noteId, format)
    })

    ipcMain.handle('file:showOpenDialog', (event, options) => {
      return this.fileManager.showOpenDialog(options)
    })

    ipcMain.handle('file:showSaveDialog', (event, options) => {
      return this.fileManager.showSaveDialog(options)
    })

    // 窗口相关 IPC
    ipcMain.handle('window:createNote', () => {
      return this.windowManager.createNoteWindow()
    })

    ipcMain.handle('window:minimize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) window.minimize()
    })

    ipcMain.handle('window:maximize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize()
        } else {
          window.maximize()
        }
      }
    })

    ipcMain.handle('window:close', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) window.close()
    })

    // 应用相关 IPC
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion()
    })

    ipcMain.handle('app:quit', () => {
      app.quit()
    })
  }

  cleanup() {
    if (this.databaseManager) {
      this.databaseManager.close()
    }
    
    if (this.trayManager) {
      this.trayManager.destroy()
    }
  }
}

// 创建应用实例
new ElectronNotesApp()
```

### 窗口管理器

```javascript
// src/main/window-manager.js
const { BrowserWindow, screen } = require('electron')
const path = require('path')

class WindowManager {
  constructor() {
    this.windows = new Map()
    this.mainWindow = null
  }

  createMainWindow() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus()
      return this.mainWindow
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    
    this.mainWindow = new BrowserWindow({
      width: Math.min(1200, width - 100),
      height: Math.min(800, height - 100),
      minWidth: 800,
      minHeight: 600,
      show: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#2f3241',
        symbolColor: '#ffffff'
      },
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    })

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

    // 窗口事件
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show()
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
      this.windows.delete('main')
    })

    this.mainWindow.on('focus', () => {
      this.mainWindow.lastActivity = Date.now()
    })

    this.windows.set('main', this.mainWindow)
    return this.mainWindow
  }

  createNoteWindow(noteId = null) {
    const noteWindow = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 600,
      minHeight: 400,
      show: false,
      parent: this.mainWindow,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      }
    })

    const windowId = `note-${Date.now()}`
    
    // 加载笔记编辑页面
    const noteUrl = noteId ? 
      `file://${path.join(__dirname, '../renderer/note.html')}?id=${noteId}` :
      `file://${path.join(__dirname, '../renderer/note.html')}`
    
    noteWindow.loadURL(noteUrl)

    noteWindow.once('ready-to-show', () => {
      noteWindow.show()
    })

    noteWindow.on('closed', () => {
      this.windows.delete(windowId)
    })

    this.windows.set(windowId, noteWindow)
    return noteWindow
  }

  focusMainWindow() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.focus()
    } else {
      this.createMainWindow()
    }
  }

  getWindowCount() {
    return this.windows.size
  }

  closeAllWindows() {
    this.windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close()
      }
    })
    this.windows.clear()
  }
}

module.exports = WindowManager
```



### 数据库管理器

```javascript
// src/main/database.js
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const { app } = require('electron')
const { Note, Category, Tag } = require('../shared/models')

class DatabaseManager {
  constructor() {
    this.db = null
    this.dbPath = path.join(app.getPath('userData'), 'notes.db')
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }

        console.log('数据库连接成功:', this.dbPath)
        this.createTables().then(resolve).catch(reject)
      })
    })
  }

  async createTables() {
    const tables = [
      // 分类表
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#007acc',
        icon TEXT DEFAULT 'folder',
        parentId INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (parentId) REFERENCES categories (id)
      )`,

      // 标签表
      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#666666',
        createdAt TEXT NOT NULL
      )`,

      // 笔记表
      `CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        categoryId INTEGER,
        tags TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isMarkdown INTEGER DEFAULT 0,
        isFavorite INTEGER DEFAULT 0,
        isDeleted INTEGER DEFAULT 0,
        FOREIGN KEY (categoryId) REFERENCES categories (id)
      )`,

      // 笔记版本历史表
      `CREATE TABLE IF NOT EXISTS note_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        noteId INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        version INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (noteId) REFERENCES notes (id)
      )`
    ]

    for (const sql of tables) {
      await this.run(sql)
    }

    // 创建索引
    await this.createIndexes()

    // 插入默认数据
    await this.insertDefaultData()
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)',
      'CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(categoryId)',
      'CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(createdAt)',
      'CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updatedAt)',
      'CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(isDeleted)',
      'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parentId)',
      'CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(noteId)'
    ]

    for (const sql of indexes) {
      await this.run(sql)
    }
  }

  async insertDefaultData() {
    // 检查是否已有数据
    const categoryCount = await this.get('SELECT COUNT(*) as count FROM categories')

    if (categoryCount.count === 0) {
      // 插入默认分类
      const defaultCategories = [
        { name: '工作', color: '#007acc', icon: 'briefcase' },
        { name: '个人', color: '#28a745', icon: 'user' },
        { name: '学习', color: '#ffc107', icon: 'book' },
        { name: '想法', color: '#dc3545', icon: 'lightbulb' }
      ]

      for (const category of defaultCategories) {
        await this.createCategory(category)
      }

      // 插入欢迎笔记
      const welcomeNote = {
        title: '欢迎使用 ElectronNotes',
        content: `# 欢迎使用 ElectronNotes

这是一个功能强大的桌面笔记应用，支持以下特性：

## 主要功能
- ✅ Markdown 编辑支持
- ✅ 分类和标签管理
- ✅ 全文搜索
- ✅ 文件导入导出
- ✅ 多窗口编辑

## 快捷键
- \`Ctrl+N\`: 新建笔记
- \`Ctrl+S\`: 保存笔记
- \`Ctrl+F\`: 搜索笔记
- \`Ctrl+,\`: 打开设置

开始创建你的第一个笔记吧！`,
        categoryId: 1,
        isMarkdown: true
      }

      await this.createNote(welcomeNote)
    }
  }

  // 基础数据库操作方法
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID, changes: this.changes })
        }
      })
    })
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // 笔记相关方法
  async getAllNotes(includeDeleted = false) {
    const sql = includeDeleted ?
      'SELECT * FROM notes ORDER BY updatedAt DESC' :
      'SELECT * FROM notes WHERE isDeleted = 0 ORDER BY updatedAt DESC'

    const rows = await this.all(sql)
    return rows.map(row => Note.fromJSON(row))
  }

  async getNoteById(id) {
    const row = await this.get('SELECT * FROM notes WHERE id = ?', [id])
    return row ? Note.fromJSON(row) : null
  }

  async createNote(noteData) {
    const note = new Note(noteData)
    note.updatedAt = new Date()

    const result = await this.run(
      `INSERT INTO notes (title, content, categoryId, tags, createdAt, updatedAt, isMarkdown, isFavorite, isDeleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.title,
        note.content,
        note.categoryId,
        JSON.stringify(note.tags),
        note.createdAt.toISOString(),
        note.updatedAt.toISOString(),
        note.isMarkdown ? 1 : 0,
        note.isFavorite ? 1 : 0,
        note.isDeleted ? 1 : 0
      ]
    )

    note.id = result.id

    // 创建版本历史
    await this.createNoteVersion(note.id, note.title, note.content, 1)

    return note
  }

  async updateNote(id, noteData) {
    const existingNote = await this.getNoteById(id)
    if (!existingNote) {
      throw new Error('笔记不存在')
    }

    const updatedNote = new Note({ ...existingNote, ...noteData })
    updatedNote.id = id
    updatedNote.updatedAt = new Date()

    await this.run(
      `UPDATE notes SET title = ?, content = ?, categoryId = ?, tags = ?,
       updatedAt = ?, isMarkdown = ?, isFavorite = ? WHERE id = ?`,
      [
        updatedNote.title,
        updatedNote.content,
        updatedNote.categoryId,
        JSON.stringify(updatedNote.tags),
        updatedNote.updatedAt.toISOString(),
        updatedNote.isMarkdown ? 1 : 0,
        updatedNote.isFavorite ? 1 : 0,
        id
      ]
    )

    // 创建新版本历史
    const versions = await this.getNoteVersions(id)
    const nextVersion = versions.length + 1
    await this.createNoteVersion(id, updatedNote.title, updatedNote.content, nextVersion)

    return updatedNote
  }

  async deleteNote(id) {
    // 软删除
    await this.run('UPDATE notes SET isDeleted = 1, updatedAt = ? WHERE id = ?',
      [new Date().toISOString(), id])
    return true
  }

  async searchNotes(query) {
    const sql = `
      SELECT * FROM notes
      WHERE isDeleted = 0 AND (title LIKE ? OR content LIKE ?)
      ORDER BY updatedAt DESC
    `
    const searchTerm = `%${query}%`
    const rows = await this.all(sql, [searchTerm, searchTerm])
    return rows.map(row => Note.fromJSON(row))
  }

  // 分类相关方法
  async getAllCategories() {
    const rows = await this.all('SELECT * FROM categories ORDER BY name')
    return rows.map(row => Category.fromJSON(row))
  }

  async createCategory(categoryData) {
    const category = new Category(categoryData)

    const result = await this.run(
      'INSERT INTO categories (name, color, icon, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [
        category.name,
        category.color,
        category.icon,
        category.parentId,
        category.createdAt.toISOString(),
        category.updatedAt.toISOString()
      ]
    )

    category.id = result.id
    return category
  }

  async updateCategory(id, categoryData) {
    const category = new Category(categoryData)
    category.updatedAt = new Date()

    await this.run(
      'UPDATE categories SET name = ?, color = ?, icon = ?, parentId = ?, updatedAt = ? WHERE id = ?',
      [category.name, category.color, category.icon, category.parentId, category.updatedAt.toISOString(), id]
    )

    return { ...category, id }
  }

  async deleteCategory(id) {
    // 检查是否有笔记使用此分类
    const noteCount = await this.get('SELECT COUNT(*) as count FROM notes WHERE categoryId = ? AND isDeleted = 0', [id])

    if (noteCount.count > 0) {
      throw new Error('无法删除包含笔记的分类')
    }

    await this.run('DELETE FROM categories WHERE id = ?', [id])
    return true
  }

  // 标签相关方法
  async getAllTags() {
    const rows = await this.all('SELECT * FROM tags ORDER BY name')
    return rows.map(row => Tag.fromJSON(row))
  }

  async createTag(tagData) {
    const tag = new Tag(tagData)

    const result = await this.run(
      'INSERT INTO tags (name, color, createdAt) VALUES (?, ?, ?)',
      [tag.name, tag.color, tag.createdAt.toISOString()]
    )

    tag.id = result.id
    return tag
  }

  // 版本历史相关方法
  async createNoteVersion(noteId, title, content, version) {
    await this.run(
      'INSERT INTO note_versions (noteId, title, content, version, createdAt) VALUES (?, ?, ?, ?, ?)',
      [noteId, title, content, version, new Date().toISOString()]
    )
  }

  async getNoteVersions(noteId) {
    return await this.all(
      'SELECT * FROM note_versions WHERE noteId = ? ORDER BY version DESC',
      [noteId]
    )
  }

  // 统计信息
  async getStatistics() {
    const totalNotes = await this.get('SELECT COUNT(*) as count FROM notes WHERE isDeleted = 0')
    const totalCategories = await this.get('SELECT COUNT(*) as count FROM categories')
    const totalTags = await this.get('SELECT COUNT(*) as count FROM tags')
    const favoriteNotes = await this.get('SELECT COUNT(*) as count FROM notes WHERE isFavorite = 1 AND isDeleted = 0')

    return {
      totalNotes: totalNotes.count,
      totalCategories: totalCategories.count,
      totalTags: totalTags.count,
      favoriteNotes: favoriteNotes.count
    }
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('关闭数据库时出错:', err)
        } else {
          console.log('数据库连接已关闭')
        }
      })
    }
  }
}

module.exports = DatabaseManager
```

## 9.4 渲染进程实现

### 主页面 HTML

```html
<!-- src/renderer/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ElectronNotes</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/components.css">
</head>
<body>
    <div id="app">
        <!-- 标题栏 -->
        <div class="titlebar">
            <div class="titlebar-drag-region">
                <div class="titlebar-title">ElectronNotes</div>
            </div>
            <div class="titlebar-controls">
                <button class="titlebar-button" id="minimize-btn">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <rect x="0" y="5" width="12" height="2"/>
                    </svg>
                </button>
                <button class="titlebar-button" id="maximize-btn">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor"/>
                    </svg>
                </button>
                <button class="titlebar-button close" id="close-btn">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M0,0 L12,12 M12,0 L0,12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- 主要内容区域 -->
        <div class="main-container">
            <!-- 侧边栏 -->
            <div class="sidebar">
                <!-- 搜索栏 -->
                <div class="search-container">
                    <input type="text" id="search-input" placeholder="搜索笔记..." class="search-input">
                    <button id="search-btn" class="search-btn">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor"/>
                            <path d="m11 11 5 5" stroke="currentColor"/>
                        </svg>
                    </button>
                </div>

                <!-- 快速操作 -->
                <div class="quick-actions">
                    <button id="new-note-btn" class="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M8 0v16M0 8h16" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        新建笔记
                    </button>
                </div>

                <!-- 分类列表 -->
                <div class="categories-section">
                    <h3 class="section-title">分类</h3>
                    <div id="categories-list" class="categories-list">
                        <!-- 分类项将通过 JavaScript 动态生成 -->
                    </div>
                    <button id="add-category-btn" class="add-btn">+ 添加分类</button>
                </div>

                <!-- 标签列表 -->
                <div class="tags-section">
                    <h3 class="section-title">标签</h3>
                    <div id="tags-list" class="tags-list">
                        <!-- 标签项将通过 JavaScript 动态生成 -->
                    </div>
                </div>
            </div>

            <!-- 笔记列表 -->
            <div class="notes-panel">
                <div class="notes-header">
                    <h2 id="notes-title">所有笔记</h2>
                    <div class="notes-actions">
                        <button id="sort-btn" class="icon-btn" title="排序">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M3 3h10M3 8h7M3 13h4" stroke="currentColor"/>
                            </svg>
                        </button>
                        <button id="view-mode-btn" class="icon-btn" title="视图模式">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <rect x="1" y="1" width="6" height="6"/>
                                <rect x="9" y="1" width="6" height="6"/>
                                <rect x="1" y="9" width="6" height="6"/>
                                <rect x="9" y="9" width="6" height="6"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="notes-list" class="notes-list">
                    <!-- 笔记项将通过 JavaScript 动态生成 -->
                </div>
            </div>

            <!-- 笔记编辑器 -->
            <div class="editor-panel">
                <div class="editor-header">
                    <input type="text" id="note-title" placeholder="笔记标题..." class="note-title-input">
                    <div class="editor-actions">
                        <button id="markdown-toggle" class="icon-btn" title="Markdown 模式">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M2 2h12v12H2z" fill="none" stroke="currentColor"/>
                                <path d="M5 5v6M8 5v6M11 5v6" stroke="currentColor"/>
                            </svg>
                        </button>
                        <button id="favorite-btn" class="icon-btn" title="收藏">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M8 1l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="none" stroke="currentColor"/>
                            </svg>
                        </button>
                        <button id="save-btn" class="btn btn-primary">保存</button>
                    </div>
                </div>
                <div class="editor-container">
                    <div id="editor" class="editor"></div>
                    <div id="preview" class="preview hidden"></div>
                </div>
            </div>
        </div>

        <!-- 状态栏 -->
        <div class="statusbar">
            <div class="statusbar-left">
                <span id="notes-count">0 个笔记</span>
            </div>
            <div class="statusbar-right">
                <span id="current-time"></span>
            </div>
        </div>
    </div>

    <!-- 模态对话框 -->
    <div id="modal-overlay" class="modal-overlay hidden">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modal-title">标题</h3>
                <button id="modal-close" class="modal-close">×</button>
            </div>
            <div class="modal-body" id="modal-body">
                <!-- 模态内容 -->
            </div>
            <div class="modal-footer">
                <button id="modal-cancel" class="btn btn-secondary">取消</button>
                <button id="modal-confirm" class="btn btn-primary">确定</button>
            </div>
        </div>
    </div>

    <script src="js/app.js"></script>
</body>
</html>
```

## 本章小结

通过本章学习，你应该已经：
- ✅ 了解了完整项目的需求分析方法
- ✅ 掌握了项目架构设计的思路
- ✅ 学会了数据模型的设计
- ✅ 实现了主进程的核心功能
- ✅ 掌握了窗口管理的最佳实践
- ✅ 实现了完整的数据库管理系统
- ✅ 创建了主页面的 HTML 结构

在接下来的内容中，我们将继续实现 CSS 样式、JavaScript 逻辑和完整的用户交互功能！
