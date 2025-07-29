# 第四章：插件生命周期管理

在前面的章节中，我们已经实现了基础的插件系统和钩子系统。现在我们要进一步完善插件的生命周期管理，包括依赖解析、错误处理、状态管理等高级特性。

## 插件生命周期概述

一个完整的插件生命周期包括以下阶段：

1. **注册（Register）**：插件被添加到系统中
2. **解析依赖（Resolve Dependencies）**：分析插件间的依赖关系
3. **初始化（Initialize）**：插件进行初始化设置
4. **启用（Enable）**：插件开始工作
5. **运行（Running）**：插件正常运行状态
6. **禁用（Disable）**：插件停止工作但保留状态
7. **卸载（Unload）**：插件被完全移除
8. **错误恢复（Error Recovery）**：处理插件运行时错误

## 插件状态管理

### 1. 插件状态枚举

```javascript
// plugin-state.js
const PluginState = {
  UNREGISTERED: 'unregistered',
  REGISTERED: 'registered',
  RESOLVING: 'resolving',
  RESOLVED: 'resolved',
  INITIALIZING: 'initializing',
  INITIALIZED: 'initialized',
  ENABLING: 'enabling',
  ENABLED: 'enabled',
  DISABLING: 'disabling',
  DISABLED: 'disabled',
  ERROR: 'error',
  UNLOADING: 'unloading',
  UNLOADED: 'unloaded'
};

// 状态转换规则
const StateTransitions = {
  [PluginState.UNREGISTERED]: [PluginState.REGISTERED],
  [PluginState.REGISTERED]: [PluginState.RESOLVING, PluginState.UNLOADED],
  [PluginState.RESOLVING]: [PluginState.RESOLVED, PluginState.ERROR],
  [PluginState.RESOLVED]: [PluginState.INITIALIZING, PluginState.UNLOADING],
  [PluginState.INITIALIZING]: [PluginState.INITIALIZED, PluginState.ERROR],
  [PluginState.INITIALIZED]: [PluginState.ENABLING, PluginState.UNLOADING],
  [PluginState.ENABLING]: [PluginState.ENABLED, PluginState.ERROR],
  [PluginState.ENABLED]: [PluginState.DISABLING, PluginState.ERROR, PluginState.UNLOADING],
  [PluginState.DISABLING]: [PluginState.DISABLED, PluginState.ERROR],
  [PluginState.DISABLED]: [PluginState.ENABLING, PluginState.UNLOADING],
  [PluginState.ERROR]: [PluginState.RESOLVED, PluginState.UNLOADING],
  [PluginState.UNLOADING]: [PluginState.UNLOADED],
  [PluginState.UNLOADED]: []
};

function canTransition(from, to) {
  return StateTransitions[from] && StateTransitions[from].includes(to);
}

module.exports = {
  PluginState,
  StateTransitions,
  canTransition
};
```

### 2. 增强的插件基类

```javascript
// enhanced-plugin.js
const { PluginState, canTransition } = require('./plugin-state');

class EnhancedPlugin {
  constructor(name, version = '1.0.0', options = {}) {
    this.name = name;
    this.version = version;
    this.options = options;
    this.state = PluginState.UNREGISTERED;
    this.dependencies = options.dependencies || [];
    this.optionalDependencies = options.optionalDependencies || [];
    this.context = null;
    this.error = null;
    this.metadata = {
      author: options.author || 'Unknown',
      description: options.description || '',
      homepage: options.homepage || '',
      keywords: options.keywords || []
    };
    
    // 生命周期回调
    this.lifecycleCallbacks = new Map();
  }
  
  // 状态转换
  setState(newState) {
    if (!canTransition(this.state, newState)) {
      throw new Error(`Invalid state transition from ${this.state} to ${newState}`);
    }
    
    const oldState = this.state;
    this.state = newState;
    
    // 触发状态变化回调
    this.onStateChange(oldState, newState);
    
    // 执行生命周期回调
    const callback = this.lifecycleCallbacks.get(newState);
    if (callback) {
      callback.call(this);
    }
  }
  
  // 注册生命周期回调
  onLifecycle(state, callback) {
    this.lifecycleCallbacks.set(state, callback);
  }
  
  // 状态变化回调（子类可重写）
  onStateChange(oldState, newState) {
    if (this.context) {
      this.context.log(`Plugin ${this.name} state changed: ${oldState} -> ${newState}`);
    }
  }
  
  // 检查依赖是否满足
  checkDependencies(availablePlugins) {
    const missing = [];
    const resolved = [];
    
    for (const dep of this.dependencies) {
      if (availablePlugins.has(dep)) {
        resolved.push(dep);
      } else {
        missing.push(dep);
      }
    }
    
    return { missing, resolved };
  }
  
  // 插件初始化（子类必须实现）
  async init(context) {
    throw new Error('Plugin must implement init method');
  }
  
  // 插件启用
  async enable() {
    this.onEnable();
  }
  
  // 插件禁用
  async disable() {
    this.onDisable();
  }
  
  // 插件卸载
  async unload() {
    this.onUnload();
  }
  
  // 错误处理
  handleError(error) {
    this.error = error;
    this.setState(PluginState.ERROR);
    this.onError(error);
  }
  
  // 从错误中恢复
  recover() {
    if (this.state === PluginState.ERROR) {
      this.error = null;
      this.setState(PluginState.RESOLVED);
    }
  }
  
  // 生命周期钩子（子类可重写）
  onEnable() {}
  onDisable() {}
  onUnload() {}
  onError(error) {
    if (this.context) {
      this.context.error(`Plugin ${this.name} error:`, error);
    }
  }
  
  // 获取插件信息
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      state: this.state,
      dependencies: this.dependencies,
      optionalDependencies: this.optionalDependencies,
      metadata: this.metadata,
      error: this.error
    };
  }
}

module.exports = EnhancedPlugin;
```

### 3. 依赖解析器

```javascript
// dependency-resolver.js
class DependencyResolver {
  constructor() {
    this.plugins = new Map();
    this.dependencyGraph = new Map();
  }
  
  // 添加插件到解析器
  addPlugin(plugin) {
    this.plugins.set(plugin.name, plugin);
    this.dependencyGraph.set(plugin.name, {
      dependencies: plugin.dependencies,
      dependents: []
    });
  }
  
  // 移除插件
  removePlugin(pluginName) {
    this.plugins.delete(pluginName);
    this.dependencyGraph.delete(pluginName);
    
    // 清理依赖关系
    for (const [name, info] of this.dependencyGraph) {
      info.dependents = info.dependents.filter(dep => dep !== pluginName);
    }
  }
  
  // 构建依赖图
  buildDependencyGraph() {
    // 清空现有的依赖关系
    for (const info of this.dependencyGraph.values()) {
      info.dependents = [];
    }
    
    // 重新构建依赖关系
    for (const [pluginName, plugin] of this.plugins) {
      for (const dep of plugin.dependencies) {
        if (this.dependencyGraph.has(dep)) {
          this.dependencyGraph.get(dep).dependents.push(pluginName);
        }
      }
    }
  }
  
  // 拓扑排序，获取加载顺序
  getLoadOrder() {
    this.buildDependencyGraph();
    
    const visited = new Set();
    const visiting = new Set();
    const result = [];
    
    const visit = (pluginName) => {
      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected involving ${pluginName}`);
      }
      
      if (visited.has(pluginName)) {
        return;
      }
      
      visiting.add(pluginName);
      
      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        for (const dep of plugin.dependencies) {
          if (this.plugins.has(dep)) {
            visit(dep);
          }
        }
      }
      
      visiting.delete(pluginName);
      visited.add(pluginName);
      result.push(pluginName);
    };
    
    for (const pluginName of this.plugins.keys()) {
      visit(pluginName);
    }
    
    return result;
  }
  
  // 检查依赖是否满足
  checkDependencies(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    
    const missing = [];
    const resolved = [];
    
    for (const dep of plugin.dependencies) {
      if (this.plugins.has(dep)) {
        resolved.push(dep);
      } else {
        missing.push(dep);
      }
    }
    
    return { missing, resolved };
  }
  
  // 获取插件的所有依赖（递归）
  getAllDependencies(pluginName, visited = new Set()) {
    if (visited.has(pluginName)) {
      return [];
    }
    
    visited.add(pluginName);
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return [];
    }
    
    const allDeps = [...plugin.dependencies];
    
    for (const dep of plugin.dependencies) {
      allDeps.push(...this.getAllDependencies(dep, visited));
    }
    
    return [...new Set(allDeps)];
  }
  
  // 获取依赖于指定插件的所有插件
  getDependents(pluginName) {
    const info = this.dependencyGraph.get(pluginName);
    return info ? info.dependents.slice() : [];
  }
  
  // 获取卸载顺序（依赖者先卸载）
  getUnloadOrder(pluginName) {
    const toUnload = new Set();
    const queue = [pluginName];
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (toUnload.has(current)) continue;
      
      toUnload.add(current);
      const dependents = this.getDependents(current);
      queue.push(...dependents);
    }
    
    // 按依赖关系排序，依赖者在前
    const loadOrder = this.getLoadOrder();
    return loadOrder.filter(name => toUnload.has(name)).reverse();
  }
}

module.exports = DependencyResolver;
```

### 4. 生命周期管理器

```javascript
// lifecycle-manager.js
const { PluginState } = require('./plugin-state');
const DependencyResolver = require('./dependency-resolver');

class LifecycleManager {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.dependencyResolver = new DependencyResolver();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  // 注册插件
  async registerPlugin(plugin) {
    try {
      plugin.setState(PluginState.REGISTERED);
      this.dependencyResolver.addPlugin(plugin);

      // 触发注册钩子
      await this.pluginManager.hookManager.getHook('beforeRegister').promise(plugin);

      plugin.setState(PluginState.RESOLVING);

      // 检查依赖
      const depCheck = this.dependencyResolver.checkDependencies(plugin.name);
      if (depCheck.missing.length > 0) {
        throw new Error(`Missing dependencies: ${depCheck.missing.join(', ')}`);
      }

      plugin.setState(PluginState.RESOLVED);

      await this.pluginManager.hookManager.getHook('afterRegister').promise(plugin);

      return true;
    } catch (error) {
      plugin.handleError(error);
      throw error;
    }
  }

  // 初始化插件
  async initializePlugin(plugin) {
    if (plugin.state !== PluginState.RESOLVED) {
      throw new Error(`Plugin ${plugin.name} is not in resolved state`);
    }

    try {
      plugin.setState(PluginState.INITIALIZING);

      await this.pluginManager.hookManager.getHook('beforeInit').promise(plugin);

      // 确保依赖插件已初始化
      await this.ensureDependenciesInitialized(plugin);

      // 初始化插件
      await plugin.init(this.pluginManager.context);
      plugin.context = this.pluginManager.context;

      plugin.setState(PluginState.INITIALIZED);

      await this.pluginManager.hookManager.getHook('afterInit').promise(plugin);

      // 重置重试计数
      this.retryAttempts.delete(plugin.name);

      return true;
    } catch (error) {
      plugin.handleError(error);
      await this.handleInitError(plugin, error);
      throw error;
    }
  }

  // 启用插件
  async enablePlugin(plugin) {
    if (plugin.state !== PluginState.INITIALIZED && plugin.state !== PluginState.DISABLED) {
      throw new Error(`Plugin ${plugin.name} cannot be enabled from state ${plugin.state}`);
    }

    try {
      plugin.setState(PluginState.ENABLING);

      await this.pluginManager.hookManager.getHook('beforeEnable').promise(plugin);

      // 确保依赖插件已启用
      await this.ensureDependenciesEnabled(plugin);

      // 启用插件
      await plugin.enable();

      plugin.setState(PluginState.ENABLED);

      await this.pluginManager.hookManager.getHook('afterEnable').promise(plugin);

      return true;
    } catch (error) {
      plugin.handleError(error);
      throw error;
    }
  }

  // 禁用插件
  async disablePlugin(plugin) {
    if (plugin.state !== PluginState.ENABLED) {
      throw new Error(`Plugin ${plugin.name} is not enabled`);
    }

    try {
      plugin.setState(PluginState.DISABLING);

      await this.pluginManager.hookManager.getHook('beforeDisable').promise(plugin);

      // 先禁用依赖于此插件的其他插件
      await this.disableDependents(plugin);

      // 禁用插件
      await plugin.disable();

      plugin.setState(PluginState.DISABLED);

      await this.pluginManager.hookManager.getHook('afterDisable').promise(plugin);

      return true;
    } catch (error) {
      plugin.handleError(error);
      throw error;
    }
  }

  // 卸载插件
  async unloadPlugin(plugin) {
    try {
      // 如果插件已启用，先禁用
      if (plugin.state === PluginState.ENABLED) {
        await this.disablePlugin(plugin);
      }

      plugin.setState(PluginState.UNLOADING);

      await this.pluginManager.hookManager.getHook('beforeUnload').promise(plugin);

      // 卸载插件
      await plugin.unload();

      // 从依赖解析器中移除
      this.dependencyResolver.removePlugin(plugin.name);

      plugin.setState(PluginState.UNLOADED);

      await this.pluginManager.hookManager.getHook('afterUnload').promise(plugin);

      return true;
    } catch (error) {
      plugin.handleError(error);
      throw error;
    }
  }

  // 确保依赖插件已初始化
  async ensureDependenciesInitialized(plugin) {
    for (const depName of plugin.dependencies) {
      const depPlugin = this.pluginManager.getPlugin(depName);
      if (!depPlugin) {
        throw new Error(`Dependency ${depName} not found`);
      }

      if (depPlugin.state === PluginState.RESOLVED) {
        await this.initializePlugin(depPlugin);
      } else if (depPlugin.state !== PluginState.INITIALIZED &&
                 depPlugin.state !== PluginState.ENABLED) {
        throw new Error(`Dependency ${depName} is not initialized`);
      }
    }
  }

  // 确保依赖插件已启用
  async ensureDependenciesEnabled(plugin) {
    for (const depName of plugin.dependencies) {
      const depPlugin = this.pluginManager.getPlugin(depName);
      if (!depPlugin) {
        throw new Error(`Dependency ${depName} not found`);
      }

      if (depPlugin.state === PluginState.INITIALIZED ||
          depPlugin.state === PluginState.DISABLED) {
        await this.enablePlugin(depPlugin);
      } else if (depPlugin.state !== PluginState.ENABLED) {
        throw new Error(`Dependency ${depName} is not enabled`);
      }
    }
  }

  // 禁用依赖于指定插件的其他插件
  async disableDependents(plugin) {
    const dependents = this.dependencyResolver.getDependents(plugin.name);

    for (const depName of dependents) {
      const depPlugin = this.pluginManager.getPlugin(depName);
      if (depPlugin && depPlugin.state === PluginState.ENABLED) {
        await this.disablePlugin(depPlugin);
      }
    }
  }

  // 处理初始化错误
  async handleInitError(plugin, error) {
    const retries = this.retryAttempts.get(plugin.name) || 0;

    if (retries < this.maxRetries) {
      this.retryAttempts.set(plugin.name, retries + 1);

      // 等待一段时间后重试
      setTimeout(async () => {
        try {
          plugin.recover();
          await this.initializePlugin(plugin);
        } catch (retryError) {
          // 重试失败，保持错误状态
        }
      }, 1000 * Math.pow(2, retries)); // 指数退避
    }
  }

  // 批量操作
  async initializeAll() {
    const loadOrder = this.dependencyResolver.getLoadOrder();

    for (const pluginName of loadOrder) {
      const plugin = this.pluginManager.getPlugin(pluginName);
      if (plugin && plugin.state === PluginState.RESOLVED) {
        try {
          await this.initializePlugin(plugin);
        } catch (error) {
          // 记录错误但继续处理其他插件
          console.error(`Failed to initialize plugin ${pluginName}:`, error);
        }
      }
    }
  }

  async enableAll() {
    const loadOrder = this.dependencyResolver.getLoadOrder();

    for (const pluginName of loadOrder) {
      const plugin = this.pluginManager.getPlugin(pluginName);
      if (plugin && plugin.state === PluginState.INITIALIZED) {
        try {
          await this.enablePlugin(plugin);
        } catch (error) {
          console.error(`Failed to enable plugin ${pluginName}:`, error);
        }
      }
    }
  }

  async disableAll() {
    const loadOrder = this.dependencyResolver.getLoadOrder().reverse();

    for (const pluginName of loadOrder) {
      const plugin = this.pluginManager.getPlugin(pluginName);
      if (plugin && plugin.state === PluginState.ENABLED) {
        try {
          await this.disablePlugin(plugin);
        } catch (error) {
          console.error(`Failed to disable plugin ${pluginName}:`, error);
        }
      }
    }
  }

  // 获取系统状态
  getSystemStatus() {
    const plugins = Array.from(this.pluginManager.plugins.values());
    const stateCount = {};

    // 统计各状态的插件数量
    for (const state of Object.values(PluginState)) {
      stateCount[state] = 0;
    }

    plugins.forEach(plugin => {
      stateCount[plugin.state]++;
    });

    return {
      total: plugins.length,
      stateCount,
      loadOrder: this.dependencyResolver.getLoadOrder(),
      plugins: plugins.map(p => p.getInfo())
    };
  }
}

module.exports = LifecycleManager;
```

## 使用示例

让我们创建一些带有依赖关系的插件来测试生命周期管理：

### 示例插件

```javascript
// database-plugin.js
const EnhancedPlugin = require('./enhanced-plugin');
const { PluginState } = require('./plugin-state');

class DatabasePlugin extends EnhancedPlugin {
  constructor() {
    super('database', '1.0.0', {
      description: 'Database connection plugin',
      author: 'System'
    });

    this.connection = null;
  }

  async init(context) {
    this.context = context;
    context.log('Initializing database connection...');

    // 模拟数据库连接初始化
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connection = { connected: true };

    context.log('Database connection initialized');
  }

  async enable() {
    this.context.log('Database plugin enabled');
    await super.enable();
  }

  async disable() {
    this.context.log('Database plugin disabled');
    await super.disable();
  }

  async unload() {
    if (this.connection) {
      this.connection.connected = false;
      this.connection = null;
    }
    this.context.log('Database connection closed');
    await super.unload();
  }

  query(sql) {
    if (!this.connection || !this.connection.connected) {
      throw new Error('Database not connected');
    }
    return `Result for: ${sql}`;
  }
}

// auth-plugin.js
class AuthPlugin extends EnhancedPlugin {
  constructor() {
    super('auth', '1.0.0', {
      dependencies: ['database'],
      description: 'Authentication plugin',
      author: 'System'
    });

    this.users = new Map();
  }

  async init(context) {
    this.context = context;
    context.log('Initializing auth system...');

    // 获取数据库插件
    this.dbPlugin = context.getPlugin('database');
    if (!this.dbPlugin) {
      throw new Error('Database plugin not found');
    }

    // 模拟从数据库加载用户
    await new Promise(resolve => setTimeout(resolve, 50));
    this.users.set('admin', { password: 'admin123', role: 'admin' });

    context.log('Auth system initialized');
  }

  async enable() {
    this.context.log('Auth plugin enabled');
    await super.enable();
  }

  authenticate(username, password) {
    const user = this.users.get(username);
    return user && user.password === password;
  }
}

// api-plugin.js
class ApiPlugin extends EnhancedPlugin {
  constructor() {
    super('api', '1.0.0', {
      dependencies: ['database', 'auth'],
      description: 'API server plugin',
      author: 'System'
    });

    this.server = null;
  }

  async init(context) {
    this.context = context;
    context.log('Initializing API server...');

    // 获取依赖插件
    this.dbPlugin = context.getPlugin('database');
    this.authPlugin = context.getPlugin('auth');

    if (!this.dbPlugin || !this.authPlugin) {
      throw new Error('Required dependencies not found');
    }

    // 模拟服务器初始化
    await new Promise(resolve => setTimeout(resolve, 100));
    this.server = { running: false, port: 3000 };

    context.log('API server initialized');
  }

  async enable() {
    this.server.running = true;
    this.context.log('API server started on port', this.server.port);
    await super.enable();
  }

  async disable() {
    this.server.running = false;
    this.context.log('API server stopped');
    await super.disable();
  }

  async unload() {
    this.server = null;
    this.context.log('API server unloaded');
    await super.unload();
  }
}

module.exports = { DatabasePlugin, AuthPlugin, ApiPlugin };
```

### 完整的生命周期管理器集成

```javascript
// advanced-plugin-manager.js
const EnhancedPluginManager = require('./enhanced-plugin-manager');
const LifecycleManager = require('./lifecycle-manager');

class AdvancedPluginManager extends EnhancedPluginManager {
  constructor() {
    super();
    this.lifecycleManager = new LifecycleManager(this);

    // 创建生命周期相关的钩子
    this.createLifecycleHooks();
  }

  createLifecycleHooks() {
    this.hookManager.createAsyncHook('beforeUnload', ['plugin']);
    this.hookManager.createAsyncHook('afterUnload', ['plugin']);
    this.hookManager.createSyncHook('stateChange', ['plugin', 'oldState', 'newState']);
  }

  // 重写注册方法
  async register(plugin) {
    try {
      await this.lifecycleManager.registerPlugin(plugin);
      this.plugins.set(plugin.name, plugin);

      // 监听插件状态变化
      plugin.onStateChange = (oldState, newState) => {
        this.hookManager.getHook('stateChange').call(plugin, oldState, newState);
      };

      this.emit('plugin:registered', plugin);
      this.context.log(`Plugin ${plugin.name} registered successfully`);

      return this;
    } catch (error) {
      this.context.error(`Failed to register plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  // 重写初始化方法
  async initPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    return await this.lifecycleManager.initializePlugin(plugin);
  }

  // 重写启用方法
  async enablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    return await this.lifecycleManager.enablePlugin(plugin);
  }

  // 重写禁用方法
  async disablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    return await this.lifecycleManager.disablePlugin(plugin);
  }

  // 卸载插件
  async unloadPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    await this.lifecycleManager.unloadPlugin(plugin);
    this.plugins.delete(name);

    this.emit('plugin:unloaded', plugin);
    return true;
  }

  // 批量操作
  async initAll() {
    return await this.lifecycleManager.initializeAll();
  }

  async enableAll() {
    return await this.lifecycleManager.enableAll();
  }

  async disableAll() {
    return await this.lifecycleManager.disableAll();
  }

  // 获取系统状态
  getSystemStatus() {
    return this.lifecycleManager.getSystemStatus();
  }

  // 错误恢复
  async recoverPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (plugin.state === 'error') {
      plugin.recover();
      try {
        await this.initPlugin(name);
        await this.enablePlugin(name);
        return true;
      } catch (error) {
        this.context.error(`Failed to recover plugin ${name}:`, error);
        return false;
      }
    }

    return true;
  }
}

module.exports = AdvancedPluginManager;
```

### 使用示例

```javascript
// lifecycle-example.js
const AdvancedPluginManager = require('./advanced-plugin-manager');
const { DatabasePlugin, AuthPlugin, ApiPlugin } = require('./example-plugins');

async function main() {
  const pluginManager = new AdvancedPluginManager();

  // 创建插件实例
  const dbPlugin = new DatabasePlugin();
  const authPlugin = new AuthPlugin();
  const apiPlugin = new ApiPlugin();

  // 监听状态变化
  pluginManager.hookManager.getHook('stateChange').tap('Logger', (plugin, oldState, newState) => {
    console.log(`🔄 ${plugin.name}: ${oldState} -> ${newState}`);
  });

  try {
    console.log('=== 注册插件 ===');
    await pluginManager.register(dbPlugin);
    await pluginManager.register(authPlugin);
    await pluginManager.register(apiPlugin);

    console.log('\n=== 系统状态 ===');
    console.log(pluginManager.getSystemStatus());

    console.log('\n=== 初始化所有插件 ===');
    await pluginManager.initAll();

    console.log('\n=== 启用所有插件 ===');
    await pluginManager.enableAll();

    console.log('\n=== 测试插件功能 ===');
    // 测试数据库查询
    const dbResult = dbPlugin.query('SELECT * FROM users');
    console.log('Database query result:', dbResult);

    // 测试认证
    const authResult = authPlugin.authenticate('admin', 'admin123');
    console.log('Authentication result:', authResult);

    console.log('\n=== 禁用 API 插件 ===');
    await pluginManager.disablePlugin('api');

    console.log('\n=== 最终状态 ===');
    const finalStatus = pluginManager.getSystemStatus();
    console.log('State counts:', finalStatus.stateCount);
    console.log('Load order:', finalStatus.loadOrder);

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
```

## 运行结果

运行上面的示例代码，你会看到类似这样的输出：

```
=== 注册插件 ===
🔄 database: unregistered -> registered
🔄 database: registered -> resolving
🔄 database: resolving -> resolved
🔄 auth: unregistered -> registered
🔄 auth: registered -> resolving
🔄 auth: resolving -> resolved
🔄 api: unregistered -> registered
🔄 api: registered -> resolving
🔄 api: resolving -> resolved

=== 初始化所有插件 ===
🔄 database: resolved -> initializing
Initializing database connection...
Database connection initialized
🔄 database: resolved -> initialized
🔄 auth: resolved -> initializing
Initializing auth system...
Auth system initialized
🔄 auth: resolved -> initialized

=== 启用所有插件 ===
Database plugin enabled
🔄 database: initialized -> enabled
Auth plugin enabled
🔄 auth: initialized -> enabled
API server started on port 3000
🔄 api: initialized -> enabled
```

## 小结

在这一章中，我们实现了完整的插件生命周期管理系统，包括：

1. **状态管理**：定义了插件的各种状态和状态转换规则
2. **依赖解析**：实现了插件依赖关系的分析和拓扑排序
3. **生命周期管理**：提供了插件从注册到卸载的完整生命周期控制
4. **错误处理**：包含了错误恢复和重试机制
5. **批量操作**：支持批量初始化、启用、禁用插件

这个生命周期管理系统已经具备了企业级插件系统的核心特性，能够处理复杂的插件依赖关系和各种异常情况。

在下一章中，我们将实现插件间的通信机制，包括事件总线、数据共享和服务注册等功能。

## 练习题

1. 实现插件的热重载功能，支持在运行时更新插件
2. 添加插件版本兼容性检查，确保依赖版本匹配
3. 实现插件的条件加载，根据环境或配置决定是否加载插件

---

**下一章预告**：我们将实现插件间的通信机制，让插件能够更好地协作和数据共享。
