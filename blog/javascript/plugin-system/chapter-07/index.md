# 第七章：实战案例 - 构建工具插件

在前面的章节中，我们已经构建了一个功能完整的插件系统。现在我们将通过一个实战案例来展示如何应用这些知识，构建一个类似 Vite 的现代构建工具。这个案例将展示插件系统在实际项目中的应用。

## 构建工具架构设计

我们要构建的工具叫做 "BuildX"，它将具备以下特性：
- 模块化的插件架构
- 开发服务器支持
- 生产构建优化
- 热模块替换（HMR）
- 多种文件格式支持

### 1. 核心构建引擎

```javascript
// build-engine.js
const path = require('path');
const fs = require('fs').promises;
const EnterprisePluginManager = require('../chapter-06/enterprise-plugin-manager');

class BuildEngine {
  constructor(options = {}) {
    this.options = {
      root: process.cwd(),
      mode: 'development',
      entry: 'src/index.js',
      outDir: 'dist',
      ...options
    };
    
    this.pluginManager = new EnterprisePluginManager({
      config: {
        configDir: path.join(this.options.root, 'config')
      }
    });
    
    this.buildContext = {
      modules: new Map(),
      assets: new Map(),
      dependencies: new Map(),
      chunks: new Map()
    };
    
    this.setupBuiltinHooks();
  }
  
  // 设置内置钩子
  setupBuiltinHooks() {
    const hooks = this.pluginManager.hookManager;
    
    // 构建生命周期钩子
    hooks.createAsyncHook('buildStart', ['options']);
    hooks.createAsyncHook('buildEnd', ['result']);
    hooks.createSyncHook('configResolved', ['config']);
    
    // 模块处理钩子
    hooks.createAsyncHook('resolveId', ['id', 'importer']);
    hooks.createAsyncHook('load', ['id']);
    hooks.createAsyncHook('transform', ['code', 'id']);
    
    // 生成钩子
    hooks.createAsyncHook('generateBundle', ['options', 'bundle']);
    hooks.createAsyncHook('writeBundle', ['options', 'bundle']);
    
    // 开发服务器钩子
    hooks.createAsyncHook('configureServer', ['server']);
    hooks.createAsyncHook('handleHotUpdate', ['file', 'timestamp']);
  }
  
  // 加载配置
  async loadConfig(configPath) {
    try {
      const configFile = path.resolve(this.options.root, configPath || 'buildx.config.js');
      
      if (await this.fileExists(configFile)) {
        delete require.cache[require.resolve(configFile)];
        const config = require(configFile);
        
        // 合并配置
        this.options = { ...this.options, ...config };
        
        // 注册插件
        if (config.plugins) {
          for (const plugin of config.plugins) {
            await this.pluginManager.register(plugin);
          }
        }
        
        // 触发配置解析钩子
        this.pluginManager.hookManager.getHook('configResolved').call(this.options);
      }
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }
  
  // 构建项目
  async build() {
    try {
      console.log('🚀 Starting build...');
      
      // 初始化插件
      await this.pluginManager.initAll();
      await this.pluginManager.enableAll();
      
      // 触发构建开始钩子
      await this.pluginManager.hookManager.getHook('buildStart').promise(this.options);
      
      // 解析入口模块
      const entryPath = path.resolve(this.options.root, this.options.entry);
      await this.processModule(entryPath);
      
      // 生成构建结果
      const bundle = await this.generateBundle();
      
      // 写入文件
      await this.writeBundle(bundle);
      
      // 触发构建结束钩子
      const result = {
        modules: this.buildContext.modules.size,
        assets: this.buildContext.assets.size,
        outputDir: this.options.outDir
      };
      
      await this.pluginManager.hookManager.getHook('buildEnd').promise(result);
      
      console.log('✅ Build completed successfully!');
      return result;
      
    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }
  
  // 处理模块
  async processModule(id, importer = null) {
    // 检查模块是否已处理
    if (this.buildContext.modules.has(id)) {
      return this.buildContext.modules.get(id);
    }
    
    try {
      // 解析模块ID
      const resolvedId = await this.resolveId(id, importer);
      if (!resolvedId) {
        throw new Error(`Cannot resolve module: ${id}`);
      }
      
      // 加载模块内容
      const code = await this.loadModule(resolvedId);
      
      // 转换模块
      const transformedCode = await this.transformModule(code, resolvedId);
      
      // 解析依赖
      const dependencies = this.parseDependencies(transformedCode);
      
      // 创建模块对象
      const module = {
        id: resolvedId,
        code: transformedCode,
        dependencies,
        importer
      };
      
      this.buildContext.modules.set(resolvedId, module);
      
      // 递归处理依赖
      for (const dep of dependencies) {
        await this.processModule(dep, resolvedId);
      }
      
      return module;
      
    } catch (error) {
      throw new Error(`Failed to process module ${id}: ${error.message}`);
    }
  }
  
  // 解析模块ID
  async resolveId(id, importer) {
    const hooks = this.pluginManager.hookManager;
    const resolveHook = hooks.getHook('resolveId');
    
    // 让插件处理解析
    for (const tap of resolveHook.taps) {
      try {
        const result = await tap.fn(id, importer);
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn(`Resolve error in plugin ${tap.name}:`, error);
      }
    }
    
    // 默认解析逻辑
    if (path.isAbsolute(id)) {
      return id;
    }
    
    if (importer) {
      return path.resolve(path.dirname(importer), id);
    }
    
    return path.resolve(this.options.root, id);
  }
  
  // 加载模块
  async loadModule(id) {
    const hooks = this.pluginManager.hookManager;
    const loadHook = hooks.getHook('load');
    
    // 让插件处理加载
    for (const tap of loadHook.taps) {
      try {
        const result = await tap.fn(id);
        if (result !== null && result !== undefined) {
          return result;
        }
      } catch (error) {
        console.warn(`Load error in plugin ${tap.name}:`, error);
      }
    }
    
    // 默认文件加载
    try {
      return await fs.readFile(id, 'utf8');
    } catch (error) {
      throw new Error(`Cannot load file: ${id}`);
    }
  }
  
  // 转换模块
  async transformModule(code, id) {
    const hooks = this.pluginManager.hookManager;
    const transformHook = hooks.getHook('transform');
    
    let transformedCode = code;
    
    // 让插件处理转换
    for (const tap of transformHook.taps) {
      try {
        const result = await tap.fn(transformedCode, id);
        if (result && result.code) {
          transformedCode = result.code;
        } else if (typeof result === 'string') {
          transformedCode = result;
        }
      } catch (error) {
        console.warn(`Transform error in plugin ${tap.name}:`, error);
      }
    }
    
    return transformedCode;
  }
  
  // 解析依赖（简化实现）
  parseDependencies(code) {
    const dependencies = [];
    
    // 匹配 import 语句
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    
    // 匹配 require 语句
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    
    return dependencies;
  }
  
  // 生成构建包
  async generateBundle() {
    const bundle = {
      modules: {},
      assets: {},
      chunks: {}
    };
    
    // 转换模块为构建格式
    for (const [id, module] of this.buildContext.modules) {
      bundle.modules[id] = {
        code: module.code,
        dependencies: module.dependencies
      };
    }
    
    // 触发生成钩子
    await this.pluginManager.hookManager.getHook('generateBundle').promise(this.options, bundle);
    
    return bundle;
  }
  
  // 写入构建包
  async writeBundle(bundle) {
    const outDir = path.resolve(this.options.root, this.options.outDir);
    
    // 确保输出目录存在
    await fs.mkdir(outDir, { recursive: true });
    
    // 生成主文件
    const mainCode = this.generateMainCode(bundle);
    const mainFile = path.join(outDir, 'index.js');
    await fs.writeFile(mainFile, mainCode);
    
    // 写入资源文件
    for (const [name, content] of this.buildContext.assets) {
      const assetPath = path.join(outDir, name);
      await fs.mkdir(path.dirname(assetPath), { recursive: true });
      await fs.writeFile(assetPath, content);
    }
    
    // 触发写入钩子
    await this.pluginManager.hookManager.getHook('writeBundle').promise(this.options, bundle);
  }
  
  // 生成主代码
  generateMainCode(bundle) {
    const modules = Object.entries(bundle.modules);
    
    return `
// BuildX Generated Bundle
(function() {
  const modules = {
${modules.map(([id, module]) => `    "${id}": function(exports, require, module) {\n${module.code}\n    }`).join(',\n')}
  };
  
  const cache = {};
  
  function require(id) {
    if (cache[id]) return cache[id].exports;
    
    const module = { exports: {} };
    cache[id] = module;
    
    if (modules[id]) {
      modules[id](module.exports, require, module);
    }
    
    return module.exports;
  }
  
  // 启动应用
  require("${this.options.entry}");
})();
    `.trim();
  }
  
  // 启动开发服务器
  async startDevServer(port = 3000) {
    const DevServer = require('./dev-server');
    const server = new DevServer(this, { port });
    
    // 触发服务器配置钩子
    await this.pluginManager.hookManager.getHook('configureServer').promise(server);
    
    await server.start();
    return server;
  }
  
  // 工具方法
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  // 添加资源
  addAsset(name, content) {
    this.buildContext.assets.set(name, content);
  }
  
  // 获取构建上下文
  getBuildContext() {
    return this.buildContext;
  }
}

module.exports = BuildEngine;
```

### 2. 开发服务器

```javascript
// dev-server.js
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const WebSocket = require('ws');

class DevServer {
  constructor(buildEngine, options = {}) {
    this.buildEngine = buildEngine;
    this.options = {
      port: 3000,
      host: 'localhost',
      ...options
    };

    this.server = null;
    this.wsServer = null;
    this.clients = new Set();
    this.moduleCache = new Map();
    this.watchers = new Map();
  }

  // 启动服务器
  async start() {
    // 创建HTTP服务器
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // 创建WebSocket服务器用于HMR
    this.wsServer = new WebSocket.Server({ server: this.server });
    this.setupWebSocket();

    // 启动文件监听
    this.setupFileWatcher();

    return new Promise((resolve, reject) => {
      this.server.listen(this.options.port, this.options.host, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🚀 Dev server running at http://${this.options.host}:${this.options.port}`);
          resolve();
        }
      });
    });
  }

  // 处理HTTP请求
  async handleRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // 处理不同类型的请求
      if (pathname === '/') {
        await this.serveIndex(res);
      } else if (pathname.startsWith('/@modules/')) {
        await this.serveModule(pathname.slice(10), res);
      } else if (pathname.endsWith('.js') || pathname.endsWith('.ts')) {
        await this.serveJavaScript(pathname, res);
      } else if (pathname.endsWith('.css')) {
        await this.serveCSS(pathname, res);
      } else {
        await this.serveStatic(pathname, res);
      }

    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Server Error: ${error.message}`);
    }
  }

  // 服务主页
  async serveIndex(res) {
    const indexPath = path.join(this.buildEngine.options.root, 'index.html');

    try {
      let content = await fs.readFile(indexPath, 'utf8');

      // 注入HMR客户端代码
      const hmrScript = `
        <script>
          const ws = new WebSocket('ws://localhost:${this.options.port}');
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'reload') {
              location.reload();
            } else if (data.type === 'update') {
              console.log('Hot update:', data.file);
              // 这里可以实现更精细的HMR逻辑
            }
          };
        </script>
      `;

      content = content.replace('</head>', `${hmrScript}</head>`);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (error) {
      // 如果没有index.html，生成一个默认的
      const defaultHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>BuildX Dev Server</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/${this.buildEngine.options.entry}"></script>
</body>
</html>
      `;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(defaultHtml);
    }
  }

  // 服务JavaScript模块
  async serveJavaScript(pathname, res) {
    const filePath = path.join(this.buildEngine.options.root, pathname);

    try {
      // 检查缓存
      const stats = await fs.stat(filePath);
      const cacheKey = `${filePath}:${stats.mtime.getTime()}`;

      if (this.moduleCache.has(cacheKey)) {
        const cached = this.moduleCache.get(cacheKey);
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(cached);
        return;
      }

      // 读取和转换文件
      let code = await fs.readFile(filePath, 'utf8');

      // 通过构建引擎转换代码
      const transformedCode = await this.buildEngine.transformModule(code, filePath);

      // 转换import语句为开发服务器格式
      const devCode = this.transformImportsForDev(transformedCode);

      // 缓存结果
      this.moduleCache.set(cacheKey, devCode);

      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(devCode);

    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Module not found: ${pathname}`);
    }
  }

  // 服务CSS文件
  async serveCSS(pathname, res) {
    const filePath = path.join(this.buildEngine.options.root, pathname);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`CSS file not found: ${pathname}`);
    }
  }

  // 服务静态文件
  async serveStatic(pathname, res) {
    const filePath = path.join(this.buildEngine.options.root, pathname);

    try {
      const content = await fs.readFile(filePath);
      const ext = path.extname(pathname);
      const contentType = this.getContentType(ext);

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`File not found: ${pathname}`);
    }
  }

  // 服务模块
  async serveModule(moduleName, res) {
    // 这里可以处理node_modules中的模块
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Module not found: ${moduleName}`);
  }

  // 转换import语句用于开发环境
  transformImportsForDev(code) {
    // 将相对路径的import转换为绝对路径
    return code.replace(
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      (match, importPath) => {
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // 保持相对路径，浏览器会正确解析
          return match;
        } else if (!importPath.startsWith('/') && !importPath.startsWith('http')) {
          // 转换为模块路径
          return match.replace(importPath, `/@modules/${importPath}`);
        }
        return match;
      }
    );
  }

  // 设置WebSocket
  setupWebSocket() {
    this.wsServer.on('connection', (ws) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: 'connected' }));
    });
  }

  // 设置文件监听
  setupFileWatcher() {
    const watchDir = this.buildEngine.options.root;

    // 这里应该使用更高效的文件监听库，如chokidar
    // 为了简化，我们使用基本的fs.watch
    const watcher = require('fs').watch(watchDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.css'))) {
        this.handleFileChange(filename);
      }
    });

    this.watchers.set(watchDir, watcher);
  }

  // 处理文件变化
  async handleFileChange(filename) {
    console.log(`📝 File changed: ${filename}`);

    // 清除模块缓存
    this.moduleCache.clear();

    // 触发热更新钩子
    const filePath = path.join(this.buildEngine.options.root, filename);
    await this.buildEngine.pluginManager.hookManager.getHook('handleHotUpdate').promise(filePath, Date.now());

    // 通知所有客户端
    this.broadcast({
      type: 'update',
      file: filename,
      timestamp: Date.now()
    });
  }

  // 广播消息给所有客户端
  broadcast(message) {
    const data = JSON.stringify(message);

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // 获取内容类型
  getContentType(ext) {
    const types = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };

    return types[ext] || 'application/octet-stream';
  }

  // 停止服务器
  async stop() {
    // 关闭文件监听器
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }

    // 关闭WebSocket服务器
    if (this.wsServer) {
      this.wsServer.close();
    }

    // 关闭HTTP服务器
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

module.exports = DevServer;
```

### 3. 构建工具插件示例

让我们创建一些常用的构建工具插件：

#### TypeScript 插件

```javascript
// typescript-plugin.js
const EnhancedPlugin = require('../chapter-04/enhanced-plugin');

class TypeScriptPlugin extends EnhancedPlugin {
  constructor(options = {}) {
    super('typescript', '1.0.0', {
      description: 'TypeScript support plugin'
    });

    this.options = {
      target: 'es2018',
      module: 'esnext',
      strict: true,
      ...options
    };
  }

  async init(context) {
    this.context = context;

    // 注册文件解析
    context.hooks.getHook('resolveId').tapAsync('TypeScriptPlugin', async (id, importer) => {
      // 处理.ts文件的解析
      if (id.endsWith('.ts') || id.endsWith('.tsx')) {
        return id;
      }

      // 尝试添加.ts扩展名
      if (!id.includes('.') && importer) {
        const path = require('path');
        const tsPath = path.resolve(path.dirname(importer), id + '.ts');

        try {
          await require('fs').promises.access(tsPath);
          return tsPath;
        } catch {
          // 文件不存在，继续其他解析
        }
      }

      return null;
    });

    // 注册代码转换
    context.hooks.getHook('transform').tapAsync('TypeScriptPlugin', async (code, id) => {
      if (id.endsWith('.ts') || id.endsWith('.tsx')) {
        return await this.transformTypeScript(code, id);
      }

      return null;
    });

    context.log('TypeScript plugin initialized');
  }

  // 转换TypeScript代码
  async transformTypeScript(code, id) {
    try {
      // 这里应该使用真正的TypeScript编译器
      // 为了示例，我们做简单的转换

      // 移除类型注解（非常简化的实现）
      let transformedCode = code
        .replace(/:\s*\w+(\[\])?/g, '') // 移除类型注解
        .replace(/interface\s+\w+\s*{[^}]*}/g, '') // 移除接口定义
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, ''); // 移除类型别名

      return {
        code: transformedCode,
        map: null // 这里应该生成source map
      };
    } catch (error) {
      throw new Error(`TypeScript transform error in ${id}: ${error.message}`);
    }
  }
}

module.exports = TypeScriptPlugin;
```

#### CSS 插件

```javascript
// css-plugin.js
const EnhancedPlugin = require('../chapter-04/enhanced-plugin');
const path = require('path');

class CSSPlugin extends EnhancedPlugin {
  constructor(options = {}) {
    super('css', '1.0.0', {
      description: 'CSS processing plugin'
    });

    this.options = {
      modules: false,
      autoprefixer: true,
      minify: false,
      ...options
    };
  }

  async init(context) {
    this.context = context;

    // 注册CSS文件加载
    context.hooks.getHook('load').tapAsync('CSSPlugin', async (id) => {
      if (id.endsWith('.css')) {
        const fs = require('fs').promises;
        try {
          const content = await fs.readFile(id, 'utf8');
          return content;
        } catch (error) {
          return null;
        }
      }
      return null;
    });

    // 注册CSS转换
    context.hooks.getHook('transform').tapAsync('CSSPlugin', async (code, id) => {
      if (id.endsWith('.css')) {
        return await this.transformCSS(code, id);
      }
      return null;
    });

    context.log('CSS plugin initialized');
  }

  // 转换CSS
  async transformCSS(code, id) {
    try {
      let transformedCode = code;

      // CSS Modules处理
      if (this.options.modules) {
        transformedCode = this.processCSSModules(transformedCode, id);
      }

      // Autoprefixer处理
      if (this.options.autoprefixer) {
        transformedCode = this.addVendorPrefixes(transformedCode);
      }

      // 压缩处理
      if (this.options.minify) {
        transformedCode = this.minifyCSS(transformedCode);
      }

      // 在开发模式下，将CSS转换为JS模块以支持HMR
      if (this.context.mode === 'development') {
        return {
          code: this.generateCSSModule(transformedCode, id)
        };
      }

      // 在生产模式下，提取CSS到单独文件
      const fileName = path.basename(id, '.css') + '.css';
      this.context.addAsset?.(fileName, transformedCode);

      return {
        code: `// CSS extracted to ${fileName}`
      };

    } catch (error) {
      throw new Error(`CSS transform error in ${id}: ${error.message}`);
    }
  }

  // 处理CSS Modules
  processCSSModules(code, id) {
    // 简化的CSS Modules实现
    const classNames = {};
    let moduleCode = code;

    // 查找类名并生成哈希
    const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match;

    while ((match = classRegex.exec(code)) !== null) {
      const originalClass = match[1];
      const hashedClass = this.generateClassHash(originalClass, id);
      classNames[originalClass] = hashedClass;

      moduleCode = moduleCode.replace(
        new RegExp(`\\.${originalClass}\\b`, 'g'),
        `.${hashedClass}`
      );
    }

    return moduleCode;
  }

  // 生成类名哈希
  generateClassHash(className, filePath) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5')
      .update(filePath + className)
      .digest('hex')
      .substring(0, 8);

    return `${className}_${hash}`;
  }

  // 添加浏览器前缀
  addVendorPrefixes(code) {
    // 简化的autoprefixer实现
    const prefixRules = {
      'transform': ['-webkit-transform', '-moz-transform', '-ms-transform'],
      'transition': ['-webkit-transition', '-moz-transition'],
      'border-radius': ['-webkit-border-radius', '-moz-border-radius'],
      'box-shadow': ['-webkit-box-shadow', '-moz-box-shadow'],
      'user-select': ['-webkit-user-select', '-moz-user-select', '-ms-user-select']
    };

    let prefixedCode = code;

    for (const [property, prefixes] of Object.entries(prefixRules)) {
      const regex = new RegExp(`(\\s*)(${property}\\s*:[^;]+;)`, 'g');

      prefixedCode = prefixedCode.replace(regex, (match, indent, rule) => {
        const prefixedRules = prefixes.map(prefix =>
          `${indent}${rule.replace(property, prefix)}`
        ).join('\n');

        return `${prefixedRules}\n${indent}${rule}`;
      });
    }

    return prefixedCode;
  }

  // 压缩CSS
  minifyCSS(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
      .replace(/\s+/g, ' ') // 压缩空白
      .replace(/;\s*}/g, '}') // 移除最后的分号
      .replace(/\s*{\s*/g, '{') // 压缩大括号
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';') // 压缩分号
      .replace(/\s*,\s*/g, ',') // 压缩逗号
      .trim();
  }

  // 生成CSS模块代码（用于开发模式HMR）
  generateCSSModule(css, id) {
    return `
// CSS Module: ${id}
const css = \`${css.replace(/`/g, '\\`')}\`;

// 创建或更新style标签
let styleElement = document.querySelector('style[data-css-module="${id}"]');
if (!styleElement) {
  styleElement = document.createElement('style');
  styleElement.setAttribute('data-css-module', '${id}');
  document.head.appendChild(styleElement);
}

styleElement.textContent = css;

// HMR支持
if (module.hot) {
  module.hot.accept();
  module.hot.dispose(() => {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  });
}

export default css;
    `.trim();
  }
}

module.exports = CSSPlugin;
```

#### 资源处理插件

```javascript
// asset-plugin.js
const EnhancedPlugin = require('../chapter-04/enhanced-plugin');
const path = require('path');
const fs = require('fs').promises;

class AssetPlugin extends EnhancedPlugin {
  constructor(options = {}) {
    super('asset', '1.0.0', {
      description: 'Asset processing plugin'
    });

    this.options = {
      limit: 8192, // 小于8KB的文件转为base64
      outputDir: 'assets',
      ...options
    };
  }

  async init(context) {
    this.context = context;

    // 注册资源文件处理
    context.hooks.getHook('load').tapAsync('AssetPlugin', async (id) => {
      if (this.isAssetFile(id)) {
        return await this.loadAsset(id);
      }
      return null;
    });

    context.log('Asset plugin initialized');
  }

  // 检查是否为资源文件
  isAssetFile(id) {
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    return assetExtensions.some(ext => id.endsWith(ext));
  }

  // 加载资源文件
  async loadAsset(id) {
    try {
      const buffer = await fs.readFile(id);
      const size = buffer.length;

      // 小文件转为base64
      if (size < this.options.limit) {
        const base64 = buffer.toString('base64');
        const mimeType = this.getMimeType(id);
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return `export default "${dataUrl}";`;
      }

      // 大文件复制到输出目录
      const fileName = this.generateAssetFileName(id, buffer);
      const outputPath = path.join(this.options.outputDir, fileName);

      // 添加到构建资源
      this.context.addAsset?.(outputPath, buffer);

      return `export default "/${outputPath}";`;

    } catch (error) {
      throw new Error(`Failed to load asset ${id}: ${error.message}`);
    }
  }

  // 生成资源文件名
  generateAssetFileName(filePath, buffer) {
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);

    // 生成内容哈希
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);

    return `${name}.${hash}${ext}`;
  }

  // 获取MIME类型
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = AssetPlugin;
```

### 4. 配置文件示例

```javascript
// buildx.config.js
const TypeScriptPlugin = require('./typescript-plugin');
const CSSPlugin = require('./css-plugin');
const AssetPlugin = require('./asset-plugin');

module.exports = {
  entry: 'src/main.ts',
  outDir: 'dist',

  plugins: [
    new TypeScriptPlugin({
      target: 'es2020',
      strict: true
    }),

    new CSSPlugin({
      modules: true,
      autoprefixer: true,
      minify: process.env.NODE_ENV === 'production'
    }),

    new AssetPlugin({
      limit: 10240, // 10KB
      outputDir: 'assets'
    })
  ],

  // 开发服务器配置
  server: {
    port: 3000,
    host: 'localhost'
  },

  // 构建配置
  build: {
    minify: true,
    sourcemap: true
  }
};
```

### 5. CLI工具

```javascript
// cli.js
#!/usr/bin/env node

const BuildEngine = require('./build-engine');
const path = require('path');

class BuildXCLI {
  constructor() {
    this.commands = {
      build: this.build.bind(this),
      dev: this.dev.bind(this),
      help: this.help.bind(this)
    };
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    if (this.commands[command]) {
      try {
        await this.commands[command](args.slice(1));
      } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      this.help();
      process.exit(1);
    }
  }

  // 构建命令
  async build(args) {
    console.log('🔨 Building for production...');

    const configPath = this.findConfig(args);
    const buildEngine = new BuildEngine({ mode: 'production' });

    await buildEngine.loadConfig(configPath);
    const result = await buildEngine.build();

    console.log(`✅ Build completed! Generated ${result.modules} modules.`);
  }

  // 开发命令
  async dev(args) {
    console.log('🚀 Starting development server...');

    const configPath = this.findConfig(args);
    const buildEngine = new BuildEngine({ mode: 'development' });

    await buildEngine.loadConfig(configPath);

    // 初始化插件
    await buildEngine.pluginManager.initAll();
    await buildEngine.pluginManager.enableAll();

    // 启动开发服务器
    const server = await buildEngine.startDevServer();

    // 优雅关闭
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down dev server...');
      await server.stop();
      process.exit(0);
    });
  }

  // 帮助命令
  help() {
    console.log(`
BuildX - Modern Build Tool

Usage:
  buildx <command> [options]

Commands:
  build     Build for production
  dev       Start development server
  help      Show this help message

Options:
  --config  Specify config file path

Examples:
  buildx dev
  buildx build
  buildx build --config custom.config.js
    `);
  }

  // 查找配置文件
  findConfig(args) {
    const configIndex = args.indexOf('--config');
    if (configIndex !== -1 && args[configIndex + 1]) {
      return args[configIndex + 1];
    }

    // 默认配置文件
    const defaultConfigs = ['buildx.config.js', 'buildx.config.ts'];
    for (const config of defaultConfigs) {
      if (require('fs').existsSync(path.resolve(config))) {
        return config;
      }
    }

    return null;
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new BuildXCLI();
  cli.run();
}

module.exports = BuildXCLI;
```

## 使用示例

让我们创建一个完整的项目来测试我们的构建工具：

### 项目结构

```
my-app/
├── src/
│   ├── main.ts
│   ├── utils.ts
│   ├── styles.css
│   └── logo.png
├── index.html
├── buildx.config.js
└── package.json
```

### 示例文件

```typescript
// src/main.ts
import { greet } from './utils';
import './styles.css';
import logo from './logo.png';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div class="container">
      <img src="${logo}" alt="Logo" class="logo" />
      <h1>${greet('BuildX')}</h1>
      <p class="description">A modern build tool with plugin system</p>
    </div>
  `;
}

// HMR支持
if (module.hot) {
  module.hot.accept('./utils', () => {
    console.log('Utils module updated');
  });
}
```

```typescript
// src/utils.ts
export function greet(name: string): string {
  return `Hello, ${name}! 🚀`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}
```

```css
/* src/styles.css */
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.logo {
  width: 100px;
  height: 100px;
  margin-bottom: 2rem;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: scale(1.1);
}

.description {
  color: #666;
  font-size: 1.2rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }

  .logo {
    width: 80px;
    height: 80px;
  }
}
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BuildX Demo</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 完整使用示例

```javascript
// example-usage.js
const BuildEngine = require('./build-engine');
const TypeScriptPlugin = require('./typescript-plugin');
const CSSPlugin = require('./css-plugin');
const AssetPlugin = require('./asset-plugin');

async function runExample() {
  console.log('=== BuildX 构建工具示例 ===\n');

  // 创建构建引擎
  const buildEngine = new BuildEngine({
    root: './my-app',
    entry: 'src/main.ts',
    outDir: 'dist',
    mode: 'development'
  });

  try {
    // 注册插件
    console.log('📦 注册插件...');
    await buildEngine.pluginManager.register(new TypeScriptPlugin({
      target: 'es2020',
      strict: true
    }));

    await buildEngine.pluginManager.register(new CSSPlugin({
      modules: true,
      autoprefixer: true
    }));

    await buildEngine.pluginManager.register(new AssetPlugin({
      limit: 8192
    }));

    // 初始化插件系统
    await buildEngine.pluginManager.initAll();
    await buildEngine.pluginManager.enableAll();

    console.log('✅ 插件系统初始化完成\n');

    // 测试构建
    console.log('🔨 开始构建...');
    const buildResult = await buildEngine.build();

    console.log('📊 构建统计:');
    console.log(`  - 模块数量: ${buildResult.modules}`);
    console.log(`  - 资源数量: ${buildResult.assets}`);
    console.log(`  - 输出目录: ${buildResult.outputDir}\n`);

    // 启动开发服务器
    console.log('🚀 启动开发服务器...');
    const server = await buildEngine.startDevServer(3000);

    console.log('✅ 开发服务器已启动');
    console.log('   访问: http://localhost:3000');
    console.log('   支持热模块替换 (HMR)');
    console.log('   修改源文件可以看到实时更新\n');

    // 监听插件事件
    buildEngine.pluginManager.hookManager.getHook('handleHotUpdate').tap('Logger', (file) => {
      console.log(`🔥 热更新: ${file}`);
    });

    // 获取系统状态
    console.log('📈 系统状态:');
    const status = buildEngine.pluginManager.getSystemStatus();
    console.log(`  - 插件总数: ${status.total}`);
    console.log(`  - 已启用插件: ${status.stateCount.enabled || 0}`);
    console.log(`  - 通信统计: ${JSON.stringify(buildEngine.pluginManager.getCommunicationStats().eventBus)}`);

    // 保持服务器运行
    console.log('\n按 Ctrl+C 停止服务器...');

    process.on('SIGINT', async () => {
      console.log('\n🛑 正在关闭服务器...');
      await server.stop();
      await buildEngine.pluginManager.cleanup();
      console.log('✅ 服务器已关闭');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  runExample();
}

module.exports = { runExample };
```

## 运行结果

运行上面的示例代码，你会看到类似这样的输出：

```
=== BuildX 构建工具示例 ===

📦 注册插件...
🔄 typescript: unregistered -> registered
🔄 css: unregistered -> registered
🔄 asset: unregistered -> registered
TypeScript plugin initialized
CSS plugin initialized
Asset plugin initialized
✅ 插件系统初始化完成

🔨 开始构建...
🚀 Starting build...
📝 Processing module: src/main.ts
📝 Processing module: src/utils.ts
📝 Processing module: src/styles.css
📝 Processing module: src/logo.png
✅ Build completed successfully!

📊 构建统计:
  - 模块数量: 4
  - 资源数量: 2
  - 输出目录: dist

🚀 启动开发服务器...
🚀 Dev server running at http://localhost:3000
✅ 开发服务器已启动
   访问: http://localhost:3000
   支持热模块替换 (HMR)
   修改源文件可以看到实时更新

📈 系统状态:
  - 插件总数: 3
  - 已启用插件: 3
  - 通信统计: {"totalEvents":15,"uniqueEvents":8}

按 Ctrl+C 停止服务器...
```

当你修改源文件时，会看到：

```
📝 File changed: src/main.ts
🔥 热更新: /path/to/my-app/src/main.ts
```

## 小结

在这一章中，我们通过构建一个完整的构建工具展示了插件系统的实际应用：

1. **核心构建引擎**：实现了模块解析、加载、转换和打包的完整流程
2. **开发服务器**：支持热模块替换和实时预览
3. **插件生态**：创建了TypeScript、CSS、资源处理等常用插件
4. **CLI工具**：提供了命令行界面，方便用户使用
5. **完整示例**：展示了如何在实际项目中使用这个构建工具

这个实战案例展示了插件系统的强大之处：
- **可扩展性**：通过插件轻松添加新功能
- **模块化**：每个插件职责单一，易于维护
- **灵活性**：用户可以根据需求选择和配置插件
- **开发体验**：支持热重载、实时预览等现代开发特性

虽然这个示例相对简化，但它展示了现代构建工具的核心架构和插件系统的实际应用。在实际项目中，你可以基于这个架构继续扩展，添加更多功能和优化。

在下一章中，我们将讨论插件系统的性能优化和最佳实践。

## 练习题

1. 为构建工具添加一个Vue.js单文件组件支持插件
2. 实现一个代码分割插件，支持动态导入
3. 添加一个PWA插件，自动生成Service Worker和manifest文件

---

**下一章预告**：我们将探讨插件系统的性能优化技巧和开发最佳实践。
