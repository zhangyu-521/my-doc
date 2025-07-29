# 第二章：简单插件系统实现

在这一章中，我们将从零开始实现一个最基础的插件系统。通过实际编码，你将深入理解插件系统的核心机制。

## 设计目标

我们要实现的插件系统应该具备以下基本功能：
- 插件注册和管理
- 插件生命周期控制
- 简单的事件钩子系统
- 插件间的基本通信

## 核心架构设计

### 1. 插件接口定义

首先定义插件的基本接口：

```javascript
// plugin-interface.js
class Plugin {
  constructor(name, version = '1.0.0') {
    this.name = name;
    this.version = version;
    this.enabled = false;
  }
  
  // 插件初始化方法，子类必须实现
  init(context) {
    throw new Error('Plugin must implement init method');
  }
  
  // 插件启用方法
  enable() {
    this.enabled = true;
    this.onEnable();
  }
  
  // 插件禁用方法
  disable() {
    this.enabled = false;
    this.onDisable();
  }
  
  // 生命周期钩子 - 启用时调用
  onEnable() {
    // 子类可以重写此方法
  }
  
  // 生命周期钩子 - 禁用时调用
  onDisable() {
    // 子类可以重写此方法
  }
  
  // 插件销毁方法
  destroy() {
    this.disable();
    this.onDestroy();
  }
  
  // 生命周期钩子 - 销毁时调用
  onDestroy() {
    // 子类可以重写此方法
  }
}

module.exports = Plugin;
```

### 2. 事件系统实现

实现一个简单的事件系统来支持插件间通信：

```javascript
// event-emitter.js
class EventEmitter {
  constructor() {
    this.events = new Map();
  }
  
  // 注册事件监听器
  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
    
    // 返回取消监听的函数
    return () => this.off(event, listener);
  }
  
  // 注册一次性事件监听器
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }
  
  // 移除事件监听器
  off(event, listener) {
    if (!this.events.has(event)) return;
    
    const listeners = this.events.get(event);
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    
    // 如果没有监听器了，删除事件
    if (listeners.length === 0) {
      this.events.delete(event);
    }
  }
  
  // 触发事件
  emit(event, ...args) {
    if (!this.events.has(event)) return false;
    
    const listeners = this.events.get(event).slice(); // 复制数组避免修改问题
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    
    return true;
  }
  
  // 获取事件的监听器数量
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }
  
  // 获取所有事件名
  eventNames() {
    return Array.from(this.events.keys());
  }
}

module.exports = EventEmitter;
```

### 3. 插件管理器实现

核心的插件管理器，负责插件的注册、加载和管理：

```javascript
// plugin-manager.js
const EventEmitter = require('./event-emitter');

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
    this.loadOrder = [];
    this.context = this.createContext();
  }
  
  // 创建插件上下文
  createContext() {
    return {
      // 事件系统
      events: this,
      // 日志方法
      log: (...args) => console.log('[Plugin System]', ...args),
      warn: (...args) => console.warn('[Plugin System]', ...args),
      error: (...args) => console.error('[Plugin System]', ...args),
      // 获取其他插件的引用
      getPlugin: (name) => this.getPlugin(name),
      // 获取所有插件
      getAllPlugins: () => this.getAllPlugins()
    };
  }
  
  // 注册插件
  register(plugin) {
    if (!plugin || !plugin.name) {
      throw new Error('Plugin must have a name');
    }
    
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }
    
    // 存储插件
    this.plugins.set(plugin.name, plugin);
    this.loadOrder.push(plugin.name);
    
    // 触发插件注册事件
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
      // 触发初始化前事件
      this.emit('plugin:before-init', plugin);
      
      // 调用插件的初始化方法
      await plugin.init(this.context);
      plugin.initialized = true;
      
      // 触发初始化后事件
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
      // 触发启用前事件
      this.emit('plugin:before-enable', plugin);
      
      plugin.enable();
      
      // 触发启用后事件
      this.emit('plugin:after-enable', plugin);
      
      this.context.log(`Plugin ${name} enabled`);
    } catch (error) {
      this.context.error(`Failed to enable plugin ${name}:`, error);
      throw error;
    }
  }
  
  // 禁用插件
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
      // 触发禁用前事件
      this.emit('plugin:before-disable', plugin);
      
      plugin.disable();
      
      // 触发禁用后事件
      this.emit('plugin:after-disable', plugin);
      
      this.context.log(`Plugin ${name} disabled`);
    } catch (error) {
      this.context.error(`Failed to disable plugin ${name}:`, error);
      throw error;
    }
  }
  
  // 卸载插件
  unregister(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }
    
    // 先禁用插件
    if (plugin.enabled) {
      this.disablePlugin(name);
    }
    
    try {
      // 触发卸载前事件
      this.emit('plugin:before-unregister', plugin);
      
      // 销毁插件
      plugin.destroy();
      
      // 从管理器中移除
      this.plugins.delete(name);
      const index = this.loadOrder.indexOf(name);
      if (index > -1) {
        this.loadOrder.splice(index, 1);
      }
      
      // 触发卸载后事件
      this.emit('plugin:after-unregister', plugin);
      
      this.context.log(`Plugin ${name} unregistered`);
    } catch (error) {
      this.context.error(`Failed to unregister plugin ${name}:`, error);
      throw error;
    }
  }
  
  // 获取插件
  getPlugin(name) {
    return this.plugins.get(name);
  }
  
  // 获取所有插件
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }
  
  // 获取已启用的插件
  getEnabledPlugins() {
    return this.getAllPlugins().filter(plugin => plugin.enabled);
  }
  
  // 初始化所有插件
  async initAll() {
    for (const name of this.loadOrder) {
      await this.initPlugin(name);
    }
  }
  
  // 启用所有插件
  async enableAll() {
    for (const name of this.loadOrder) {
      await this.enablePlugin(name);
    }
  }
  
  // 禁用所有插件
  disableAll() {
    // 按相反顺序禁用
    for (let i = this.loadOrder.length - 1; i >= 0; i--) {
      const name = this.loadOrder[i];
      const plugin = this.plugins.get(name);
      if (plugin && plugin.enabled) {
        this.disablePlugin(name);
      }
    }
  }
  
  // 获取插件系统状态
  getStatus() {
    const plugins = this.getAllPlugins();
    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.enabled).length,
      disabled: plugins.filter(p => !p.enabled).length,
      plugins: plugins.map(p => ({
        name: p.name,
        version: p.version,
        enabled: p.enabled,
        initialized: p.initialized
      }))
    };
  }
}

module.exports = PluginManager;
```

## 使用示例

让我们创建一些示例插件来测试我们的插件系统：

### 示例插件1：日志插件

```javascript
// logger-plugin.js
const Plugin = require('./plugin-interface');

class LoggerPlugin extends Plugin {
  constructor() {
    super('logger', '1.0.0');
    this.logs = [];
  }

  init(context) {
    this.context = context;

    // 监听所有插件事件并记录日志
    context.events.on('plugin:registered', (plugin) => {
      this.log(`Plugin registered: ${plugin.name}`);
    });

    context.events.on('plugin:after-enable', (plugin) => {
      this.log(`Plugin enabled: ${plugin.name}`);
    });

    context.events.on('plugin:after-disable', (plugin) => {
      this.log(`Plugin disabled: ${plugin.name}`);
    });
  }

  onEnable() {
    this.log('Logger plugin enabled');
  }

  onDisable() {
    this.log('Logger plugin disabled');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  getLogs() {
    return this.logs.slice(); // 返回副本
  }

  clearLogs() {
    this.logs = [];
  }
}

module.exports = LoggerPlugin;
```

### 示例插件2：计数器插件

```javascript
// counter-plugin.js
const Plugin = require('./plugin-interface');

class CounterPlugin extends Plugin {
  constructor() {
    super('counter', '1.0.0');
    this.count = 0;
  }

  init(context) {
    this.context = context;

    // 提供计数器API
    context.events.on('counter:increment', () => {
      this.increment();
    });

    context.events.on('counter:decrement', () => {
      this.decrement();
    });

    context.events.on('counter:reset', () => {
      this.reset();
    });
  }

  onEnable() {
    this.context.log('Counter plugin enabled, current count:', this.count);
  }

  increment() {
    this.count++;
    this.context.events.emit('counter:changed', this.count);
    return this.count;
  }

  decrement() {
    this.count--;
    this.context.events.emit('counter:changed', this.count);
    return this.count;
  }

  reset() {
    const oldCount = this.count;
    this.count = 0;
    this.context.events.emit('counter:reset', oldCount);
    this.context.events.emit('counter:changed', this.count);
    return this.count;
  }

  getCount() {
    return this.count;
  }
}

module.exports = CounterPlugin;
```

### 完整使用示例

```javascript
// example.js
const PluginManager = require('./plugin-manager');
const LoggerPlugin = require('./logger-plugin');
const CounterPlugin = require('./counter-plugin');

async function main() {
  // 创建插件管理器
  const pluginManager = new PluginManager();

  // 创建插件实例
  const loggerPlugin = new LoggerPlugin();
  const counterPlugin = new CounterPlugin();

  // 注册插件
  pluginManager.register(loggerPlugin);
  pluginManager.register(counterPlugin);

  // 监听计数器变化事件
  pluginManager.on('counter:changed', (count) => {
    console.log(`Counter changed to: ${count}`);
  });

  // 初始化并启用所有插件
  await pluginManager.initAll();
  await pluginManager.enableAll();

  // 测试插件功能
  console.log('\n=== Testing Plugin System ===');

  // 使用计数器插件
  pluginManager.emit('counter:increment');
  pluginManager.emit('counter:increment');
  pluginManager.emit('counter:decrement');

  // 获取计数器值
  const counter = pluginManager.getPlugin('counter');
  console.log('Current count:', counter.getCount());

  // 重置计数器
  pluginManager.emit('counter:reset');

  // 查看系统状态
  console.log('\n=== Plugin System Status ===');
  console.log(pluginManager.getStatus());

  // 查看日志
  console.log('\n=== Logger Plugin Logs ===');
  const logger = pluginManager.getPlugin('logger');
  logger.getLogs().forEach(log => console.log(log));

  // 禁用插件
  pluginManager.disablePlugin('counter');

  // 最终状态
  console.log('\n=== Final Status ===');
  console.log(pluginManager.getStatus());
}

main().catch(console.error);
```

## 运行结果

当你运行上面的示例代码时，你会看到类似这样的输出：

```
[Plugin System] Plugin logger registered
[Plugin System] Plugin counter registered
[Plugin System] Plugin logger initialized
[Plugin System] Plugin counter initialized
[Plugin System] Plugin logger enabled
[Plugin System] Plugin counter enabled

=== Testing Plugin System ===
Counter changed to: 1
Counter changed to: 2
Counter changed to: 1
Current count: 1
Counter changed to: 0
```

## 小结

在这一章中，我们实现了一个基础但功能完整的插件系统，包括：

1. **插件接口定义**：标准化的插件基类
2. **事件系统**：支持插件间通信的事件机制
3. **插件管理器**：负责插件生命周期管理的核心组件
4. **实际示例**：展示了如何创建和使用插件

这个基础插件系统已经具备了：
- 插件注册和管理
- 生命周期控制（初始化、启用、禁用、销毁）
- 事件驱动的通信机制
- 错误处理和日志记录

在下一章中，我们将进一步扩展这个系统，实现更强大的钩子系统，支持同步和异步钩子，让插件系统更加灵活和强大。

## 练习题

1. 尝试创建一个配置管理插件，可以存储和读取配置信息
2. 实现插件的依赖关系管理，确保依赖插件先于被依赖插件加载
3. 添加插件的热重载功能，支持在运行时更新插件

---

**下一章预告**：我们将实现类似 Webpack/Vite 的钩子系统，支持更复杂的插件交互模式。
