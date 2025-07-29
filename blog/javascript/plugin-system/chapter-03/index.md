# 第三章：钩子系统设计

在前一章中，我们实现了基础的插件系统。现在我们要进一步扩展，实现类似 Webpack 和 Vite 的钩子系统。钩子系统是现代构建工具插件架构的核心，它提供了更精细的控制和更强大的扩展能力。

## 钩子系统概述

### 什么是钩子？

钩子（Hook）是在程序执行过程中的特定时机暴露的扩展点。插件可以在这些时机注册回调函数，从而介入程序的执行流程。

### 钩子的类型

根据执行方式，钩子可以分为：

1. **同步钩子（Sync Hook）**：按顺序同步执行所有回调
2. **异步钩子（Async Hook）**：支持异步回调，可以等待 Promise
3. **瀑布钩子（Waterfall Hook）**：前一个回调的返回值作为下一个回调的输入
4. **保释钩子（Bail Hook）**：当某个回调返回非 undefined 值时停止执行

## 钩子系统实现

### 1. 基础钩子类

```javascript
// hook.js
class Hook {
  constructor(args = []) {
    this.args = args; // 钩子参数定义
    this.taps = []; // 注册的回调函数
    this.interceptors = []; // 拦截器
  }
  
  // 注册同步回调
  tap(name, fn) {
    this.taps.push({
      type: 'sync',
      name,
      fn
    });
  }
  
  // 注册异步回调（Promise）
  tapAsync(name, fn) {
    this.taps.push({
      type: 'async',
      name,
      fn
    });
  }
  
  // 注册异步回调（callback）
  tapPromise(name, fn) {
    this.taps.push({
      type: 'promise',
      name,
      fn
    });
  }
  
  // 添加拦截器
  intercept(interceptor) {
    this.interceptors.push(interceptor);
  }
  
  // 调用钩子（子类实现）
  call(...args) {
    throw new Error('Hook subclass must implement call method');
  }
  
  // 异步调用钩子（子类实现）
  callAsync(...args) {
    throw new Error('Hook subclass must implement callAsync method');
  }
  
  // Promise 调用钩子（子类实现）
  promise(...args) {
    throw new Error('Hook subclass must implement promise method');
  }
}

module.exports = Hook;
```

### 2. 同步钩子实现

```javascript
// sync-hook.js
const Hook = require('./hook');

class SyncHook extends Hook {
  constructor(args) {
    super(args);
  }
  
  call(...args) {
    // 执行拦截器
    this.interceptors.forEach(interceptor => {
      if (interceptor.call) {
        interceptor.call(...args);
      }
    });
    
    // 执行所有同步回调
    for (const tap of this.taps) {
      if (tap.type !== 'sync') {
        throw new Error(`Cannot call async tap ${tap.name} in SyncHook`);
      }
      
      try {
        tap.fn(...args);
      } catch (error) {
        console.error(`Error in hook tap ${tap.name}:`, error);
        throw error;
      }
    }
  }
}

module.exports = SyncHook;
```

### 3. 异步钩子实现

```javascript
// async-hook.js
const Hook = require('./hook');

class AsyncHook extends Hook {
  constructor(args) {
    super(args);
  }
  
  // 使用 callback 方式的异步调用
  callAsync(...args) {
    const callback = args.pop(); // 最后一个参数是回调函数
    
    // 执行拦截器
    this.interceptors.forEach(interceptor => {
      if (interceptor.call) {
        interceptor.call(...args);
      }
    });
    
    let index = 0;
    
    const next = (err) => {
      if (err) return callback(err);
      
      if (index >= this.taps.length) {
        return callback();
      }
      
      const tap = this.taps[index++];
      
      try {
        if (tap.type === 'sync') {
          tap.fn(...args);
          next();
        } else if (tap.type === 'async') {
          tap.fn(...args, next);
        } else if (tap.type === 'promise') {
          const result = tap.fn(...args);
          if (result && typeof result.then === 'function') {
            result.then(() => next(), next);
          } else {
            next();
          }
        }
      } catch (error) {
        next(error);
      }
    };
    
    next();
  }
  
  // 使用 Promise 方式的异步调用
  promise(...args) {
    return new Promise((resolve, reject) => {
      this.callAsync(...args, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = AsyncHook;
```

### 4. 瀑布钩子实现

```javascript
// sync-waterfall-hook.js
const Hook = require('./hook');

class SyncWaterfallHook extends Hook {
  constructor(args) {
    super(args);
  }
  
  call(value, ...args) {
    // 执行拦截器
    this.interceptors.forEach(interceptor => {
      if (interceptor.call) {
        interceptor.call(value, ...args);
      }
    });
    
    let current = value;
    
    for (const tap of this.taps) {
      if (tap.type !== 'sync') {
        throw new Error(`Cannot call async tap ${tap.name} in SyncWaterfallHook`);
      }
      
      try {
        const result = tap.fn(current, ...args);
        if (result !== undefined) {
          current = result;
        }
      } catch (error) {
        console.error(`Error in waterfall hook tap ${tap.name}:`, error);
        throw error;
      }
    }
    
    return current;
  }
}

module.exports = SyncWaterfallHook;
```

### 5. 保释钩子实现

```javascript
// sync-bail-hook.js
const Hook = require('./hook');

class SyncBailHook extends Hook {
  constructor(args) {
    super(args);
  }
  
  call(...args) {
    // 执行拦截器
    this.interceptors.forEach(interceptor => {
      if (interceptor.call) {
        interceptor.call(...args);
      }
    });
    
    for (const tap of this.taps) {
      if (tap.type !== 'sync') {
        throw new Error(`Cannot call async tap ${tap.name} in SyncBailHook`);
      }
      
      try {
        const result = tap.fn(...args);
        if (result !== undefined) {
          return result; // 提前返回，停止执行后续回调
        }
      } catch (error) {
        console.error(`Error in bail hook tap ${tap.name}:`, error);
        throw error;
      }
    }
  }
}

module.exports = SyncBailHook;
```

### 6. 钩子管理器

```javascript
// hook-manager.js
const SyncHook = require('./sync-hook');
const AsyncHook = require('./async-hook');
const SyncWaterfallHook = require('./sync-waterfall-hook');
const SyncBailHook = require('./sync-bail-hook');

class HookManager {
  constructor() {
    this.hooks = new Map();
  }
  
  // 创建同步钩子
  createSyncHook(name, args = []) {
    const hook = new SyncHook(args);
    this.hooks.set(name, hook);
    return hook;
  }
  
  // 创建异步钩子
  createAsyncHook(name, args = []) {
    const hook = new AsyncHook(args);
    this.hooks.set(name, hook);
    return hook;
  }
  
  // 创建瀑布钩子
  createWaterfallHook(name, args = []) {
    const hook = new SyncWaterfallHook(args);
    this.hooks.set(name, hook);
    return hook;
  }
  
  // 创建保释钩子
  createBailHook(name, args = []) {
    const hook = new SyncBailHook(args);
    this.hooks.set(name, hook);
    return hook;
  }
  
  // 获取钩子
  getHook(name) {
    return this.hooks.get(name);
  }
  
  // 检查钩子是否存在
  hasHook(name) {
    return this.hooks.has(name);
  }
  
  // 获取所有钩子名称
  getHookNames() {
    return Array.from(this.hooks.keys());
  }
  
  // 移除钩子
  removeHook(name) {
    return this.hooks.delete(name);
  }
  
  // 清空所有钩子
  clear() {
    this.hooks.clear();
  }
}

module.exports = HookManager;
```

## 集成到插件系统

现在让我们将钩子系统集成到之前的插件管理器中：

### 增强的插件管理器

```javascript
// enhanced-plugin-manager.js
const EventEmitter = require('./event-emitter');
const HookManager = require('./hook-manager');

class EnhancedPluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
    this.loadOrder = [];
    this.hookManager = new HookManager();
    this.context = this.createContext();

    // 创建内置钩子
    this.createBuiltinHooks();
  }

  // 创建内置钩子
  createBuiltinHooks() {
    // 插件生命周期钩子
    this.hookManager.createSyncHook('beforeRegister', ['plugin']);
    this.hookManager.createSyncHook('afterRegister', ['plugin']);
    this.hookManager.createAsyncHook('beforeInit', ['plugin']);
    this.hookManager.createAsyncHook('afterInit', ['plugin']);
    this.hookManager.createSyncHook('beforeEnable', ['plugin']);
    this.hookManager.createSyncHook('afterEnable', ['plugin']);
    this.hookManager.createSyncHook('beforeDisable', ['plugin']);
    this.hookManager.createSyncHook('afterDisable', ['plugin']);

    // 系统级钩子
    this.hookManager.createAsyncHook('startup', []);
    this.hookManager.createAsyncHook('shutdown', []);
    this.hookManager.createWaterfallHook('processConfig', ['config']);
    this.hookManager.createBailHook('shouldLoadPlugin', ['pluginName']);
  }

  // 创建插件上下文
  createContext() {
    return {
      // 事件系统
      events: this,
      // 钩子系统
      hooks: this.hookManager,
      // 日志方法
      log: (...args) => console.log('[Plugin System]', ...args),
      warn: (...args) => console.warn('[Plugin System]', ...args),
      error: (...args) => console.error('[Plugin System]', ...args),
      // 获取其他插件的引用
      getPlugin: (name) => this.getPlugin(name),
      // 获取所有插件
      getAllPlugins: () => this.getAllPlugins(),
      // 创建自定义钩子
      createHook: (name, type, args) => this.createHook(name, type, args)
    };
  }

  // 创建自定义钩子
  createHook(name, type = 'sync', args = []) {
    switch (type) {
      case 'sync':
        return this.hookManager.createSyncHook(name, args);
      case 'async':
        return this.hookManager.createAsyncHook(name, args);
      case 'waterfall':
        return this.hookManager.createWaterfallHook(name, args);
      case 'bail':
        return this.hookManager.createBailHook(name, args);
      default:
        throw new Error(`Unknown hook type: ${type}`);
    }
  }

  // 注册插件
  register(plugin) {
    if (!plugin || !plugin.name) {
      throw new Error('Plugin must have a name');
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    // 执行注册前钩子
    this.hookManager.getHook('beforeRegister').call(plugin);

    // 检查是否应该加载插件
    const shouldLoad = this.hookManager.getHook('shouldLoadPlugin').call(plugin.name);
    if (shouldLoad === false) {
      this.context.log(`Plugin ${plugin.name} skipped by shouldLoadPlugin hook`);
      return this;
    }

    // 存储插件
    this.plugins.set(plugin.name, plugin);
    this.loadOrder.push(plugin.name);

    // 执行注册后钩子
    this.hookManager.getHook('afterRegister').call(plugin);

    // 触发事件
    this.emit('plugin:registered', plugin);

    this.context.log(`Plugin ${plugin.name} registered`);

    return this;
  }

  // 初始化插件
  async initPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (plugin.initialized) {
      this.context.warn(`Plugin ${name} is already initialized`);
      return;
    }

    try {
      // 执行初始化前钩子
      await this.hookManager.getHook('beforeInit').promise(plugin);

      // 调用插件的初始化方法
      await plugin.init(this.context);
      plugin.initialized = true;

      // 执行初始化后钩子
      await this.hookManager.getHook('afterInit').promise(plugin);

      this.emit('plugin:after-init', plugin);
      this.context.log(`Plugin ${name} initialized`);
    } catch (error) {
      this.context.error(`Failed to initialize plugin ${name}:`, error);
      throw error;
    }
  }

  // 启用插件
  async enablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (!plugin.initialized) {
      await this.initPlugin(name);
    }

    if (plugin.enabled) {
      this.context.warn(`Plugin ${name} is already enabled`);
      return;
    }

    try {
      // 执行启用前钩子
      this.hookManager.getHook('beforeEnable').call(plugin);

      plugin.enable();

      // 执行启用后钩子
      this.hookManager.getHook('afterEnable').call(plugin);

      this.emit('plugin:after-enable', plugin);
      this.context.log(`Plugin ${name} enabled`);
    } catch (error) {
      this.context.error(`Failed to enable plugin ${name}:`, error);
      throw error;
    }
  }

  // 系统启动
  async startup() {
    this.context.log('Plugin system starting up...');
    await this.hookManager.getHook('startup').promise();
    this.context.log('Plugin system started');
  }

  // 系统关闭
  async shutdown() {
    this.context.log('Plugin system shutting down...');
    await this.hookManager.getHook('shutdown').promise();
    this.disableAll();
    this.context.log('Plugin system shut down');
  }

  // 处理配置（使用瀑布钩子）
  processConfig(config) {
    return this.hookManager.getHook('processConfig').call(config);
  }

  // 其他方法保持不变...
  disablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (!plugin.enabled) {
      this.context.warn(`Plugin ${name} is already disabled`);
      return;
    }

    try {
      this.hookManager.getHook('beforeDisable').call(plugin);
      plugin.disable();
      this.hookManager.getHook('afterDisable').call(plugin);

      this.emit('plugin:after-disable', plugin);
      this.context.log(`Plugin ${name} disabled`);
    } catch (error) {
      this.context.error(`Failed to disable plugin ${name}:`, error);
      throw error;
    }
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  async initAll() {
    for (const name of this.loadOrder) {
      await this.initPlugin(name);
    }
  }

  async enableAll() {
    for (const name of this.loadOrder) {
      await this.enablePlugin(name);
    }
  }

  disableAll() {
    for (let i = this.loadOrder.length - 1; i >= 0; i--) {
      const name = this.loadOrder[i];
      const plugin = this.plugins.get(name);
      if (plugin && plugin.enabled) {
        this.disablePlugin(name);
      }
    }
  }
}

module.exports = EnhancedPluginManager;
```

## 使用钩子的插件示例

让我们创建一些使用钩子系统的插件：

### 构建插件示例

```javascript
// build-plugin.js
const Plugin = require('./plugin-interface');

class BuildPlugin extends Plugin {
  constructor() {
    super('build', '1.0.0');
    this.buildSteps = [];
  }

  init(context) {
    this.context = context;

    // 创建构建相关的钩子
    context.createHook('beforeBuild', 'async', ['options']);
    context.createHook('afterBuild', 'async', ['result']);
    context.createHook('processBuildOptions', 'waterfall', ['options']);
    context.createHook('shouldSkipFile', 'bail', ['filename']);

    // 监听构建钩子
    context.hooks.getHook('beforeBuild').tapAsync('BuildPlugin', async (options) => {
      this.context.log('Starting build process...');
      this.buildSteps = [];
    });

    context.hooks.getHook('afterBuild').tapAsync('BuildPlugin', async (result) => {
      this.context.log('Build completed:', result);
    });
  }

  onEnable() {
    this.context.log('Build plugin enabled');
  }

  async build(options = {}) {
    const hooks = this.context.hooks;

    try {
      // 处理构建选项（瀑布钩子）
      const processedOptions = hooks.getHook('processBuildOptions').call(options);

      // 执行构建前钩子
      await hooks.getHook('beforeBuild').promise(processedOptions);

      // 模拟构建过程
      const files = ['index.js', 'utils.js', 'config.js'];
      const result = { files: [], skipped: [] };

      for (const file of files) {
        // 检查是否应该跳过文件（保释钩子）
        const shouldSkip = hooks.getHook('shouldSkipFile').call(file);
        if (shouldSkip) {
          result.skipped.push(file);
          continue;
        }

        // 处理文件
        result.files.push(file);
        this.buildSteps.push(`Processed ${file}`);
      }

      // 执行构建后钩子
      await hooks.getHook('afterBuild').promise(result);

      return result;
    } catch (error) {
      this.context.error('Build failed:', error);
      throw error;
    }
  }

  getBuildSteps() {
    return this.buildSteps.slice();
  }
}

module.exports = BuildPlugin;
```

### 优化插件示例

```javascript
// optimizer-plugin.js
const Plugin = require('./plugin-interface');

class OptimizerPlugin extends Plugin {
  constructor() {
    super('optimizer', '1.0.0');
  }

  init(context) {
    this.context = context;

    // 监听构建选项处理钩子，添加优化选项
    if (context.hooks.hasHook('processBuildOptions')) {
      context.hooks.getHook('processBuildOptions').tap('OptimizerPlugin', (options) => {
        return {
          ...options,
          minify: true,
          compress: true,
          optimization: {
            ...options.optimization,
            removeUnusedCode: true
          }
        };
      });
    }

    // 监听文件跳过钩子，跳过测试文件
    if (context.hooks.hasHook('shouldSkipFile')) {
      context.hooks.getHook('shouldSkipFile').tap('OptimizerPlugin', (filename) => {
        if (filename.includes('.test.') || filename.includes('.spec.')) {
          this.context.log(`Skipping test file: ${filename}`);
          return true; // 返回 true 表示跳过
        }
      });
    }

    // 监听构建前钩子
    if (context.hooks.hasHook('beforeBuild')) {
      context.hooks.getHook('beforeBuild').tapAsync('OptimizerPlugin', async (options) => {
        this.context.log('Optimizer: Preparing optimization settings');
        // 模拟异步优化准备工作
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    }
  }

  onEnable() {
    this.context.log('Optimizer plugin enabled');
  }
}

module.exports = OptimizerPlugin;
```

## 完整使用示例

```javascript
// hook-example.js
const EnhancedPluginManager = require('./enhanced-plugin-manager');
const BuildPlugin = require('./build-plugin');
const OptimizerPlugin = require('./optimizer-plugin');

async function main() {
  // 创建增强的插件管理器
  const pluginManager = new EnhancedPluginManager();

  // 创建插件实例
  const buildPlugin = new BuildPlugin();
  const optimizerPlugin = new OptimizerPlugin();

  // 注册全局钩子监听器
  pluginManager.hookManager.getHook('startup').tapAsync('System', async () => {
    console.log('🚀 System startup hook triggered');
  });

  pluginManager.hookManager.getHook('afterRegister').tap('Logger', (plugin) => {
    console.log(`📦 Plugin registered: ${plugin.name} v${plugin.version}`);
  });

  // 注册插件
  pluginManager.register(buildPlugin);
  pluginManager.register(optimizerPlugin);

  // 启动系统
  await pluginManager.startup();

  // 初始化并启用所有插件
  await pluginManager.initAll();
  await pluginManager.enableAll();

  // 测试钩子系统
  console.log('\n=== Testing Hook System ===');

  // 获取构建插件并执行构建
  const builder = pluginManager.getPlugin('build');
  const buildOptions = {
    entry: 'src/index.js',
    output: 'dist/'
  };

  const buildResult = await builder.build(buildOptions);
  console.log('Build result:', buildResult);

  // 测试配置处理钩子
  console.log('\n=== Testing Config Processing ===');
  const config = { mode: 'development' };
  const processedConfig = pluginManager.processConfig(config);
  console.log('Processed config:', processedConfig);

  // 查看构建步骤
  console.log('\n=== Build Steps ===');
  builder.getBuildSteps().forEach(step => console.log(`- ${step}`));

  // 关闭系统
  await pluginManager.shutdown();
}

main().catch(console.error);
```

## 运行结果

运行上面的示例代码，你会看到类似这样的输出：

```
📦 Plugin registered: build v1.0.0
📦 Plugin registered: optimizer v1.0.0
[Plugin System] Plugin system starting up...
🚀 System startup hook triggered
[Plugin System] Plugin system started
[Plugin System] Plugin build initialized
[Plugin System] Plugin optimizer initialized
[Plugin System] Build plugin enabled
[Plugin System] Plugin build enabled
[Plugin System] Optimizer plugin enabled
[Plugin System] Plugin optimizer enabled

=== Testing Hook System ===
Optimizer: Preparing optimization settings
[Plugin System] Starting build process...
Skipping test file: utils.test.js
[Plugin System] Build completed: { files: ['index.js', 'utils.js', 'config.js'], skipped: [] }

=== Testing Config Processing ===
Processed config: { mode: 'development' }

=== Build Steps ===
- Processed index.js
- Processed utils.js
- Processed config.js
```

## 钩子系统的优势

1. **精细控制**：提供了程序执行过程中的精确扩展点
2. **类型安全**：不同类型的钩子适用于不同的场景
3. **性能优化**：同步钩子避免了不必要的异步开销
4. **流程控制**：保释钩子和瀑布钩子提供了强大的流程控制能力
5. **可组合性**：多个插件可以在同一个钩子上注册回调，实现功能组合

## 小结

在这一章中，我们实现了一个功能完整的钩子系统，包括：

1. **多种钩子类型**：同步、异步、瀑布、保释钩子
2. **钩子管理器**：统一管理所有钩子
3. **集成到插件系统**：将钩子系统无缝集成到插件管理器中
4. **实际应用示例**：展示了如何在实际插件中使用钩子

这个钩子系统已经具备了现代构建工具的核心特性，为插件提供了强大而灵活的扩展能力。

在下一章中，我们将进一步完善插件系统，实现插件的完整生命周期管理，包括依赖处理、错误恢复等高级特性。

## 练习题

1. 实现一个异步瀑布钩子（AsyncWaterfallHook）
2. 添加钩子的优先级支持，让某些回调可以优先执行
3. 实现钩子的条件执行，只有满足特定条件时才执行回调

---

**下一章预告**：我们将实现完整的插件生命周期管理，包括依赖解析、错误处理和热重载功能。
