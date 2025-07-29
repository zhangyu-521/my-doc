# 第八章：性能优化与最佳实践

在前面的章节中，我们构建了一个功能完整的插件系统。现在我们要关注性能优化和开发最佳实践，确保插件系统在实际应用中能够高效、稳定地运行。

## 性能优化策略

### 1. 插件加载优化

#### 懒加载机制

```javascript
// lazy-plugin-loader.js
class LazyPluginLoader {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.lazyPlugins = new Map();
    this.loadPromises = new Map();
  }
  
  // 注册懒加载插件
  registerLazy(name, loader, conditions = {}) {
    this.lazyPlugins.set(name, {
      loader,
      conditions,
      loaded: false,
      instance: null
    });
  }
  
  // 检查是否需要加载插件
  async checkAndLoad(name, context = {}) {
    const lazyPlugin = this.lazyPlugins.get(name);
    if (!lazyPlugin || lazyPlugin.loaded) {
      return lazyPlugin?.instance;
    }
    
    // 检查加载条件
    if (!this.shouldLoad(lazyPlugin.conditions, context)) {
      return null;
    }
    
    // 防止重复加载
    if (this.loadPromises.has(name)) {
      return await this.loadPromises.get(name);
    }
    
    // 开始加载
    const loadPromise = this.loadPlugin(name, lazyPlugin);
    this.loadPromises.set(name, loadPromise);
    
    try {
      const instance = await loadPromise;
      lazyPlugin.loaded = true;
      lazyPlugin.instance = instance;
      this.loadPromises.delete(name);
      return instance;
    } catch (error) {
      this.loadPromises.delete(name);
      throw error;
    }
  }
  
  // 加载插件
  async loadPlugin(name, lazyPlugin) {
    console.log(`🔄 Lazy loading plugin: ${name}`);
    
    const startTime = Date.now();
    
    try {
      // 执行加载器
      const PluginClass = await lazyPlugin.loader();
      const instance = new PluginClass();
      
      // 注册到插件管理器
      await this.pluginManager.register(instance);
      await this.pluginManager.initPlugin(instance.name);
      await this.pluginManager.enablePlugin(instance.name);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Plugin ${name} loaded in ${loadTime}ms`);
      
      return instance;
    } catch (error) {
      console.error(`❌ Failed to load plugin ${name}:`, error);
      throw error;
    }
  }
  
  // 检查是否应该加载
  shouldLoad(conditions, context) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }
    
    // 检查触发条件
    if (conditions.trigger && !context[conditions.trigger]) {
      return false;
    }
    
    // 检查环境条件
    if (conditions.env && process.env.NODE_ENV !== conditions.env) {
      return false;
    }
    
    // 检查特性标志
    if (conditions.feature && !context.features?.[conditions.feature]) {
      return false;
    }
    
    return true;
  }
  
  // 预加载插件
  async preload(names, context = {}) {
    const promises = names.map(name => this.checkAndLoad(name, context));
    return await Promise.allSettled(promises);
  }
  
  // 获取加载状态
  getLoadStatus() {
    const status = {};
    
    for (const [name, plugin] of this.lazyPlugins) {
      status[name] = {
        loaded: plugin.loaded,
        loading: this.loadPromises.has(name)
      };
    }
    
    return status;
  }
}

module.exports = LazyPluginLoader;
```

#### 插件缓存系统

```javascript
// plugin-cache.js
class PluginCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.metadata = new Map();
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 3600000; // 1小时
    this.hitCount = 0;
    this.missCount = 0;
  }
  
  // 缓存插件实例
  set(key, plugin, metadata = {}) {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const cacheEntry = {
      plugin,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now()
    };
    
    this.cache.set(key, cacheEntry);
    this.metadata.set(key, metadata);
  }
  
  // 获取缓存的插件
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }
    
    // 检查TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.metadata.delete(key);
      this.missCount++;
      return null;
    }
    
    // 更新访问信息
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.hitCount++;
    
    return entry.plugin;
  }
  
  // 检查缓存是否存在
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // 检查TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.metadata.delete(key);
      return false;
    }
    
    return true;
  }
  
  // LRU淘汰策略
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metadata.delete(oldestKey);
    }
  }
  
  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    const toDelete = [];
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => {
      this.cache.delete(key);
      this.metadata.delete(key);
    });
    
    return toDelete.length;
  }
  
  // 获取缓存统计
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  // 估算内存使用
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache) {
      // 简单估算，实际应该更精确
      totalSize += key.length * 2; // 字符串大小
      totalSize += JSON.stringify(entry).length * 2; // 对象大小估算
    }
    
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }
  
  // 清空缓存
  clear() {
    this.cache.clear();
    this.metadata.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

module.exports = PluginCache;
```

### 2. 事件系统优化

#### 事件池和对象复用

```javascript
// optimized-event-system.js
class OptimizedEventSystem {
  constructor() {
    this.listeners = new Map();
    this.eventPool = [];
    this.maxPoolSize = 100;
    this.stats = {
      eventsEmitted: 0,
      listenersExecuted: 0,
      poolHits: 0,
      poolMisses: 0
    };
  }
  
  // 从对象池获取事件对象
  getEventObject() {
    if (this.eventPool.length > 0) {
      this.stats.poolHits++;
      return this.eventPool.pop();
    }
    
    this.stats.poolMisses++;
    return this.createEventObject();
  }
  
  // 创建事件对象
  createEventObject() {
    return {
      type: null,
      data: null,
      timestamp: 0,
      source: null,
      cancelled: false,
      results: [],
      
      // 重置方法
      reset() {
        this.type = null;
        this.data = null;
        this.timestamp = 0;
        this.source = null;
        this.cancelled = false;
        this.results.length = 0;
      }
    };
  }
  
  // 回收事件对象到池中
  recycleEventObject(eventObj) {
    if (this.eventPool.length < this.maxPoolSize) {
      eventObj.reset();
      this.eventPool.push(eventObj);
    }
  }
  
  // 优化的事件发射
  emit(type, data, source = null) {
    const listeners = this.listeners.get(type);
    if (!listeners || listeners.length === 0) {
      return;
    }
    
    // 从池中获取事件对象
    const eventObj = this.getEventObject();
    eventObj.type = type;
    eventObj.data = data;
    eventObj.timestamp = Date.now();
    eventObj.source = source;
    
    this.stats.eventsEmitted++;
    
    try {
      // 批量执行监听器
      this.executeBatch(listeners, eventObj);
    } finally {
      // 回收事件对象
      this.recycleEventObject(eventObj);
    }
  }
  
  // 批量执行监听器
  executeBatch(listeners, eventObj) {
    const batchSize = 10; // 每批处理10个监听器
    
    for (let i = 0; i < listeners.length; i += batchSize) {
      const batch = listeners.slice(i, i + batchSize);
      
      // 同步执行批次
      for (const listener of batch) {
        if (eventObj.cancelled) break;
        
        try {
          listener.callback(eventObj.data, eventObj);
          this.stats.listenersExecuted++;
        } catch (error) {
          console.error('Listener error:', error);
        }
      }
      
      // 让出控制权，避免阻塞
      if (i + batchSize < listeners.length) {
        setImmediate(() => {});
      }
    }
  }
  
  // 优化的监听器注册
  on(type, callback, options = {}) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    
    const listener = {
      callback,
      priority: options.priority || 0,
      once: options.once || false,
      id: this.generateId()
    };
    
    const listeners = this.listeners.get(type);
    
    // 按优先级插入（使用二分查找优化）
    this.insertByPriority(listeners, listener);
    
    return () => this.off(type, listener.id);
  }
  
  // 按优先级插入监听器
  insertByPriority(listeners, listener) {
    let left = 0;
    let right = listeners.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (listeners[mid].priority >= listener.priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    listeners.splice(left, 0, listener);
  }
  
  // 移除监听器
  off(type, listenerId) {
    const listeners = this.listeners.get(type);
    if (!listeners) return false;
    
    const index = listeners.findIndex(l => l.id === listenerId);
    if (index > -1) {
      listeners.splice(index, 1);
      
      // 如果没有监听器了，删除类型
      if (listeners.length === 0) {
        this.listeners.delete(type);
      }
      
      return true;
    }
    
    return false;
  }
  
  // 生成ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  // 获取性能统计
  getStats() {
    return {
      ...this.stats,
      poolSize: this.eventPool.length,
      maxPoolSize: this.maxPoolSize,
      poolEfficiency: this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses) * 100,
      listenerTypes: this.listeners.size,
      totalListeners: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
  
  // 清理资源
  cleanup() {
    this.listeners.clear();
    this.eventPool.length = 0;
    this.stats = {
      eventsEmitted: 0,
      listenersExecuted: 0,
      poolHits: 0,
      poolMisses: 0
    };
  }
}

module.exports = OptimizedEventSystem;
```

### 3. 内存管理优化

#### 内存监控器

```javascript
// memory-monitor.js
class MemoryMonitor {
  constructor(options = {}) {
    this.options = {
      interval: 30000, // 30秒检查一次
      threshold: 0.8, // 80%内存使用率阈值
      maxHeapSize: 1024 * 1024 * 1024, // 1GB
      ...options
    };
    
    this.monitoring = false;
    this.intervalId = null;
    this.callbacks = new Set();
    this.history = [];
    this.maxHistorySize = 100;
  }
  
  // 开始监控
  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, this.options.interval);
    
    console.log('🔍 Memory monitoring started');
  }
  
  // 停止监控
  stop() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('🛑 Memory monitoring stopped');
  }
  
  // 检查内存使用情况
  checkMemory() {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const external = memUsage.external;
    
    const usage = {
      heapUsed,
      heapTotal,
      external,
      rss: memUsage.rss,
      heapUsedMB: Math.round(heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(heapTotal / 1024 / 1024),
      heapUsagePercent: (heapUsed / heapTotal * 100).toFixed(2),
      timestamp: Date.now()
    };
    
    // 添加到历史记录
    this.addToHistory(usage);
    
    // 检查阈值
    const usagePercent = heapUsed / this.options.maxHeapSize;
    if (usagePercent > this.options.threshold) {
      this.triggerWarning(usage, usagePercent);
    }
    
    // 通知回调
    this.notifyCallbacks(usage);
  }
  
  // 添加到历史记录
  addToHistory(usage) {
    this.history.push(usage);
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  // 触发内存警告
  triggerWarning(usage, usagePercent) {
    console.warn(`⚠️  High memory usage detected: ${(usagePercent * 100).toFixed(2)}%`);
    console.warn(`   Heap used: ${usage.heapUsedMB}MB / ${Math.round(this.options.maxHeapSize / 1024 / 1024)}MB`);
    
    // 建议垃圾回收
    if (global.gc) {
      console.log('🗑️  Triggering garbage collection...');
      global.gc();
      
      // 重新检查内存
      setTimeout(() => {
        const newUsage = process.memoryUsage();
        const freed = usage.heapUsed - newUsage.heapUsed;
        console.log(`✅ GC completed, freed ${Math.round(freed / 1024 / 1024)}MB`);
      }, 100);
    }
  }
  
  // 注册回调
  onMemoryChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  
  // 通知回调
  notifyCallbacks(usage) {
    for (const callback of this.callbacks) {
      try {
        callback(usage);
      } catch (error) {
        console.error('Memory monitor callback error:', error);
      }
    }
  }
  
  // 获取内存统计
  getStats() {
    const current = process.memoryUsage();
    
    if (this.history.length === 0) {
      return {
        current: {
          heapUsedMB: Math.round(current.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(current.heapTotal / 1024 / 1024),
          heapUsagePercent: (current.heapUsed / current.heapTotal * 100).toFixed(2)
        },
        trend: 'no-data'
      };
    }
    
    const recent = this.history.slice(-10);
    const avgUsage = recent.reduce((sum, usage) => sum + usage.heapUsed, 0) / recent.length;
    const trend = current.heapUsed > avgUsage * 1.1 ? 'increasing' : 
                  current.heapUsed < avgUsage * 0.9 ? 'decreasing' : 'stable';
    
    return {
      current: {
        heapUsedMB: Math.round(current.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(current.heapTotal / 1024 / 1024),
        heapUsagePercent: (current.heapUsed / current.heapTotal * 100).toFixed(2),
        rssMB: Math.round(current.rss / 1024 / 1024),
        externalMB: Math.round(current.external / 1024 / 1024)
      },
      trend,
      history: this.history.length,
      monitoring: this.monitoring
    };
  }
  
  // 强制垃圾回收
  forceGC() {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      const freed = before.heapUsed - after.heapUsed;
      console.log(`🗑️  Manual GC: freed ${Math.round(freed / 1024 / 1024)}MB`);
      
      return {
        before: Math.round(before.heapUsed / 1024 / 1024),
        after: Math.round(after.heapUsed / 1024 / 1024),
        freed: Math.round(freed / 1024 / 1024)
      };
    } else {
      console.warn('⚠️  Garbage collection not available. Run with --expose-gc flag.');
      return null;
    }
  }
}

module.exports = MemoryMonitor;
```

## 开发最佳实践

### 1. 插件设计原则

#### 单一职责原则

```javascript
// 好的示例：职责单一的插件
class LoggerPlugin extends EnhancedPlugin {
  constructor() {
    super('logger', '1.0.0');
    this.logLevel = 'info';
  }

  async init(context) {
    this.context = context;

    // 只负责日志记录功能
    context.services.register('logger', () => ({
      debug: (msg) => this.log('debug', msg),
      info: (msg) => this.log('info', msg),
      warn: (msg) => this.log('warn', msg),
      error: (msg) => this.log('error', msg)
    }));
  }

  log(level, message) {
    if (this.shouldLog(level)) {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }
}

// 不好的示例：职责过多的插件
class MonolithPlugin extends EnhancedPlugin {
  constructor() {
    super('monolith', '1.0.0');
  }

  async init(context) {
    // 违反单一职责原则 - 做了太多事情
    this.setupLogging();
    this.setupDatabase();
    this.setupCache();
    this.setupAuth();
    this.setupNotifications();
  }

  // ... 大量不相关的方法
}
```

#### 依赖注入模式

```javascript
// dependency-injection-plugin.js
class DatabasePlugin extends EnhancedPlugin {
  constructor(options = {}) {
    super('database', '1.0.0');
    this.options = options;
  }

  async init(context) {
    this.context = context;

    // 注册数据库服务
    context.services.register('database', (deps) => {
      // 依赖注入：需要配置服务和日志服务
      const config = deps.config || this.options;
      const logger = deps.logger;

      return new DatabaseService(config, logger);
    }, {
      dependencies: ['config', 'logger']
    });
  }
}

class DatabaseService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.connection = null;
  }

  async connect() {
    this.logger?.info('Connecting to database...');
    // 连接逻辑
    this.connection = { connected: true };
    this.logger?.info('Database connected');
  }

  async query(sql) {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    this.logger?.debug(`Executing query: ${sql}`);
    // 查询逻辑
    return { results: [] };
  }
}
```

#### 错误处理最佳实践

```javascript
// error-handling-plugin.js
class RobustPlugin extends EnhancedPlugin {
  constructor() {
    super('robust', '1.0.0');
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async init(context) {
    this.context = context;

    try {
      await this.initializeWithRetry();
    } catch (error) {
      // 记录详细错误信息
      this.logError('Initialization failed', error);

      // 设置降级模式
      this.enableFallbackMode();

      // 不要重新抛出错误，让插件系统继续运行
    }
  }

  async initializeWithRetry() {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await this.doInitialize();
        return; // 成功则返回
      } catch (error) {
        this.retryCount++;

        if (i === this.maxRetries - 1) {
          throw error; // 最后一次重试失败则抛出
        }

        // 指数退避
        const delay = Math.pow(2, i) * 1000;
        await this.sleep(delay);
      }
    }
  }

  async doInitialize() {
    // 实际初始化逻辑
    // 可能会抛出异常
  }

  enableFallbackMode() {
    this.context.log('Enabling fallback mode for robust plugin');

    // 提供基本功能
    this.context.services.register('robust', () => ({
      isAvailable: () => false,
      getStatus: () => 'fallback-mode'
    }));
  }

  logError(message, error) {
    const errorInfo = {
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      plugin: this.name,
      retryCount: this.retryCount
    };

    this.context.error('Plugin error:', errorInfo);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. 性能监控和分析

#### 性能分析器

```javascript
// performance-profiler.js
class PerformanceProfiler {
  constructor() {
    this.profiles = new Map();
    this.activeProfiles = new Map();
    this.hooks = new Map();
  }

  // 开始性能分析
  start(name, metadata = {}) {
    const profile = {
      name,
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage(),
      metadata,
      children: [],
      parent: null
    };

    // 检查是否有父级分析
    const currentProfile = this.getCurrentProfile();
    if (currentProfile) {
      profile.parent = currentProfile;
      currentProfile.children.push(profile);
    }

    this.activeProfiles.set(name, profile);
    return profile;
  }

  // 结束性能分析
  end(name) {
    const profile = this.activeProfiles.get(name);
    if (!profile) {
      console.warn(`No active profile found for: ${name}`);
      return null;
    }

    profile.endTime = process.hrtime.bigint();
    profile.endMemory = process.memoryUsage();
    profile.duration = Number(profile.endTime - profile.startTime) / 1000000; // 转换为毫秒
    profile.memoryDelta = profile.endMemory.heapUsed - profile.startMemory.heapUsed;

    this.activeProfiles.delete(name);
    this.profiles.set(name, profile);

    // 触发钩子
    this.triggerHooks('profileComplete', profile);

    return profile;
  }

  // 获取当前活跃的分析
  getCurrentProfile() {
    const profiles = Array.from(this.activeProfiles.values());
    return profiles[profiles.length - 1] || null;
  }

  // 包装函数进行性能分析
  wrap(name, fn, metadata = {}) {
    return async (...args) => {
      this.start(name, metadata);

      try {
        const result = await fn(...args);
        return result;
      } finally {
        this.end(name);
      }
    };
  }

  // 分析插件方法
  profilePlugin(plugin) {
    const originalMethods = {};

    // 包装主要方法
    const methodsToProfile = ['init', 'enable', 'disable', 'destroy'];

    methodsToProfile.forEach(methodName => {
      if (typeof plugin[methodName] === 'function') {
        originalMethods[methodName] = plugin[methodName];

        plugin[methodName] = this.wrap(
          `${plugin.name}.${methodName}`,
          originalMethods[methodName].bind(plugin),
          { plugin: plugin.name, method: methodName }
        );
      }
    });

    return () => {
      // 恢复原始方法
      Object.keys(originalMethods).forEach(methodName => {
        plugin[methodName] = originalMethods[methodName];
      });
    };
  }

  // 注册钩子
  onProfileComplete(callback) {
    if (!this.hooks.has('profileComplete')) {
      this.hooks.set('profileComplete', []);
    }

    this.hooks.get('profileComplete').push(callback);
  }

  // 触发钩子
  triggerHooks(event, data) {
    const callbacks = this.hooks.get(event);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Profile hook error:', error);
      }
    });
  }

  // 生成性能报告
  generateReport() {
    const profiles = Array.from(this.profiles.values());

    // 按持续时间排序
    profiles.sort((a, b) => b.duration - a.duration);

    const report = {
      summary: {
        totalProfiles: profiles.length,
        totalDuration: profiles.reduce((sum, p) => sum + p.duration, 0),
        averageDuration: profiles.length > 0 ?
          profiles.reduce((sum, p) => sum + p.duration, 0) / profiles.length : 0,
        slowestOperation: profiles[0]?.name || 'none'
      },

      topSlowest: profiles.slice(0, 10).map(p => ({
        name: p.name,
        duration: `${p.duration.toFixed(2)}ms`,
        memoryDelta: `${Math.round(p.memoryDelta / 1024)}KB`,
        metadata: p.metadata
      })),

      byPlugin: this.groupByPlugin(profiles),

      memoryImpact: profiles
        .filter(p => Math.abs(p.memoryDelta) > 1024) // 大于1KB的内存变化
        .sort((a, b) => Math.abs(b.memoryDelta) - Math.abs(a.memoryDelta))
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          memoryDelta: `${Math.round(p.memoryDelta / 1024)}KB`,
          duration: `${p.duration.toFixed(2)}ms`
        }))
    };

    return report;
  }

  // 按插件分组
  groupByPlugin(profiles) {
    const byPlugin = {};

    profiles.forEach(profile => {
      const pluginName = profile.metadata.plugin || 'unknown';

      if (!byPlugin[pluginName]) {
        byPlugin[pluginName] = {
          totalDuration: 0,
          operationCount: 0,
          operations: []
        };
      }

      byPlugin[pluginName].totalDuration += profile.duration;
      byPlugin[pluginName].operationCount++;
      byPlugin[pluginName].operations.push({
        name: profile.name,
        duration: profile.duration,
        memoryDelta: profile.memoryDelta
      });
    });

    // 按总持续时间排序
    return Object.entries(byPlugin)
      .sort(([,a], [,b]) => b.totalDuration - a.totalDuration)
      .reduce((obj, [key, value]) => {
        obj[key] = {
          ...value,
          averageDuration: value.totalDuration / value.operationCount
        };
        return obj;
      }, {});
  }

  // 清理分析数据
  clear() {
    this.profiles.clear();
    this.activeProfiles.clear();
  }

  // 导出分析数据
  export() {
    return {
      profiles: Array.from(this.profiles.entries()),
      timestamp: Date.now(),
      report: this.generateReport()
    };
  }
}

module.exports = PerformanceProfiler;
```

### 3. 测试策略

#### 插件测试框架

```javascript
// plugin-test-framework.js
class PluginTestFramework {
  constructor() {
    this.testSuites = new Map();
    this.mockServices = new Map();
    this.testResults = [];
  }

  // 创建测试套件
  describe(pluginName, testFn) {
    const suite = new TestSuite(pluginName);
    this.testSuites.set(pluginName, suite);

    // 执行测试定义
    testFn(suite);

    return suite;
  }

  // 运行所有测试
  async runAll() {
    console.log('🧪 Running plugin tests...\n');

    const results = [];

    for (const [pluginName, suite] of this.testSuites) {
      console.log(`Testing ${pluginName}:`);
      const suiteResult = await this.runSuite(suite);
      results.push(suiteResult);

      this.printSuiteResult(suiteResult);
      console.log('');
    }

    this.printSummary(results);
    return results;
  }

  // 运行测试套件
  async runSuite(suite) {
    const result = {
      pluginName: suite.pluginName,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };

    const startTime = Date.now();

    for (const test of suite.tests) {
      const testResult = await this.runTest(test, suite);
      result.tests.push(testResult);

      if (testResult.status === 'passed') {
        result.passed++;
      } else if (testResult.status === 'failed') {
        result.failed++;
      } else {
        result.skipped++;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 运行单个测试
  async runTest(test, suite) {
    const result = {
      name: test.name,
      status: 'passed',
      error: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      // 设置测试环境
      const context = this.createTestContext(suite);

      // 运行测试
      await test.fn(context);

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 创建测试上下文
  createTestContext(suite) {
    return {
      // 模拟插件管理器
      pluginManager: this.createMockPluginManager(),

      // 模拟服务
      services: this.mockServices,

      // 断言方法
      expect: this.createExpectAPI(),

      // 模拟方法
      mock: this.createMockAPI(),

      // 测试工具
      utils: {
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        createPlugin: (name, options) => this.createTestPlugin(name, options)
      }
    };
  }

  // 创建模拟插件管理器
  createMockPluginManager() {
    return {
      plugins: new Map(),

      register: async (plugin) => {
        this.plugins.set(plugin.name, plugin);
      },

      getPlugin: (name) => {
        return this.plugins.get(name);
      },

      initPlugin: async (name) => {
        const plugin = this.plugins.get(name);
        if (plugin && plugin.init) {
          await plugin.init(this.createTestContext());
        }
      }
    };
  }

  // 创建断言API
  createExpectAPI() {
    return (actual) => ({
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },

      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },

      toThrow: async (fn) => {
        let threw = false;
        try {
          await fn();
        } catch {
          threw = true;
        }

        if (!threw) {
          throw new Error('Expected function to throw');
        }
      },

      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
      },

      toBeNull: () => {
        if (actual !== null) {
          throw new Error('Expected value to be null');
        }
      }
    });
  }

  // 创建模拟API
  createMockAPI() {
    return {
      fn: (implementation) => {
        const mockFn = implementation || (() => {});
        mockFn.calls = [];

        const wrappedFn = (...args) => {
          mockFn.calls.push(args);
          return mockFn(...args);
        };

        wrappedFn.calls = mockFn.calls;
        return wrappedFn;
      },

      service: (name, implementation) => {
        this.mockServices.set(name, implementation);
      }
    };
  }

  // 创建测试插件
  createTestPlugin(name, options = {}) {
    return {
      name,
      version: '1.0.0',
      ...options,

      init: options.init || (async () => {}),
      enable: options.enable || (async () => {}),
      disable: options.disable || (async () => {})
    };
  }

  // 打印套件结果
  printSuiteResult(result) {
    result.tests.forEach(test => {
      const status = test.status === 'passed' ? '✅' : '❌';
      const duration = `(${test.duration}ms)`;

      console.log(`  ${status} ${test.name} ${duration}`);

      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });

    const summary = `${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`;
    console.log(`  Summary: ${summary} (${result.duration}ms)`);
  }

  // 打印总结
  printSummary(results) {
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('📊 Test Summary:');
    console.log(`   Total: ${totalPassed + totalFailed + totalSkipped} tests`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Duration: ${totalDuration}ms`);

    if (totalFailed > 0) {
      console.log('\n❌ Some tests failed!');
    } else {
      console.log('\n✅ All tests passed!');
    }
  }
}

class TestSuite {
  constructor(pluginName) {
    this.pluginName = pluginName;
    this.tests = [];
    this.beforeEachFn = null;
    this.afterEachFn = null;
  }

  // 添加测试
  it(name, testFn) {
    this.tests.push({ name, fn: testFn });
  }

  // 设置前置操作
  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  // 设置后置操作
  afterEach(fn) {
    this.afterEachFn = fn;
  }
}

module.exports = PluginTestFramework;
```

## 综合优化示例

让我们创建一个集成了所有优化技术的插件管理器：

### 优化版插件管理器

```javascript
// optimized-plugin-manager.js
const EnterprisePluginManager = require('../chapter-06/enterprise-plugin-manager');
const LazyPluginLoader = require('./lazy-plugin-loader');
const PluginCache = require('./plugin-cache');
const OptimizedEventSystem = require('./optimized-event-system');
const MemoryMonitor = require('./memory-monitor');
const PerformanceProfiler = require('./performance-profiler');

class OptimizedPluginManager extends EnterprisePluginManager {
  constructor(options = {}) {
    super(options);

    // 初始化优化组件
    this.lazyLoader = new LazyPluginLoader(this);
    this.cache = new PluginCache(options.cache);
    this.optimizedEvents = new OptimizedEventSystem();
    this.memoryMonitor = new MemoryMonitor(options.memory);
    this.profiler = new PerformanceProfiler();

    // 替换事件系统
    this.replaceEventSystem();

    // 启用性能监控
    this.enablePerformanceMonitoring();

    // 启用内存监控
    this.memoryMonitor.start();

    // 设置清理定时器
    this.setupCleanupTimer();
  }

  // 替换事件系统
  replaceEventSystem() {
    // 保存原有监听器
    const originalListeners = this.listeners || new Map();

    // 迁移到优化的事件系统
    for (const [event, listeners] of originalListeners) {
      listeners.forEach(listener => {
        this.optimizedEvents.on(event, listener.callback, {
          priority: listener.priority || 0,
          once: listener.once || false
        });
      });
    }

    // 替换事件方法
    this.on = this.optimizedEvents.on.bind(this.optimizedEvents);
    this.emit = this.optimizedEvents.emit.bind(this.optimizedEvents);
    this.off = this.optimizedEvents.off.bind(this.optimizedEvents);
  }

  // 启用性能监控
  enablePerformanceMonitoring() {
    // 监控插件生命周期方法
    this.profiler.onProfileComplete((profile) => {
      if (profile.duration > 1000) { // 超过1秒的操作
        console.warn(`⚠️  Slow operation detected: ${profile.name} (${profile.duration.toFixed(2)}ms)`);
      }
    });

    // 监控内存使用
    this.memoryMonitor.onMemoryChange((usage) => {
      if (parseFloat(usage.heapUsagePercent) > 80) {
        console.warn(`⚠️  High memory usage: ${usage.heapUsagePercent}%`);

        // 触发缓存清理
        this.cache.cleanup();
      }
    });
  }

  // 设置清理定时器
  setupCleanupTimer() {
    // 每5分钟清理一次
    this.cleanupTimer = setInterval(() => {
      this.performMaintenance();
    }, 5 * 60 * 1000);
  }

  // 执行维护任务
  performMaintenance() {
    console.log('🧹 Performing maintenance...');

    // 清理缓存
    const cleanedCache = this.cache.cleanup();

    // 清理事件池
    if (this.optimizedEvents.eventPool.length > 50) {
      this.optimizedEvents.eventPool.length = 25; // 保留一半
    }

    // 强制垃圾回收（如果可用）
    if (global.gc && Math.random() < 0.1) { // 10%的概率
      this.memoryMonitor.forceGC();
    }

    console.log(`✅ Maintenance completed. Cleaned ${cleanedCache} cache entries.`);
  }

  // 重写插件注册方法，添加缓存和性能监控
  async register(plugin, options = {}) {
    const cacheKey = `plugin:${plugin.name}:${plugin.version}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && !options.forceReload) {
      console.log(`📦 Loading plugin ${plugin.name} from cache`);
      return cached;
    }

    // 性能分析
    this.profiler.start(`register:${plugin.name}`, {
      plugin: plugin.name,
      version: plugin.version
    });

    try {
      // 检查是否应该懒加载
      if (options.lazy) {
        this.lazyLoader.registerLazy(plugin.name, () => plugin, options.lazyConditions);
        return this;
      }

      // 包装插件方法进行性能监控
      const restoreProfiler = this.profiler.profilePlugin(plugin);

      // 调用父类方法
      const result = await super.register(plugin, options);

      // 缓存结果
      this.cache.set(cacheKey, result, {
        plugin: plugin.name,
        version: plugin.version,
        registeredAt: Date.now()
      });

      return result;

    } finally {
      this.profiler.end(`register:${plugin.name}`);
    }
  }

  // 重写插件初始化方法
  async initPlugin(name) {
    // 检查懒加载
    const lazyPlugin = await this.lazyLoader.checkAndLoad(name, {
      trigger: 'init',
      features: this.configManager.getConfig('features', {})
    });

    if (lazyPlugin) {
      return lazyPlugin;
    }

    // 性能分析
    this.profiler.start(`init:${name}`, { plugin: name });

    try {
      return await super.initPlugin(name);
    } finally {
      this.profiler.end(`init:${name}`);
    }
  }

  // 批量操作优化
  async initAll() {
    console.log('🚀 Initializing all plugins with optimization...');

    const plugins = Array.from(this.plugins.keys());
    const batchSize = 5; // 每批处理5个插件

    for (let i = 0; i < plugins.length; i += batchSize) {
      const batch = plugins.slice(i, i + batchSize);

      // 并行初始化批次
      const promises = batch.map(name => this.initPlugin(name).catch(error => {
        console.error(`Failed to init plugin ${name}:`, error);
        return null;
      }));

      await Promise.all(promises);

      // 让出控制权
      await new Promise(resolve => setImmediate(resolve));
    }

    console.log('✅ All plugins initialized');
  }

  // 获取优化统计信息
  getOptimizationStats() {
    return {
      cache: this.cache.getStats(),
      events: this.optimizedEvents.getStats(),
      memory: this.memoryMonitor.getStats(),
      performance: this.profiler.generateReport(),
      lazyLoading: this.lazyLoader.getLoadStatus()
    };
  }

  // 生成性能报告
  generatePerformanceReport() {
    const stats = this.getOptimizationStats();

    console.log('\n📊 Performance Report:');
    console.log('='.repeat(50));

    // 缓存统计
    console.log(`\n🗄️  Cache Statistics:`);
    console.log(`   Hit Rate: ${stats.cache.hitRate}`);
    console.log(`   Size: ${stats.cache.size}/${stats.cache.maxSize}`);
    console.log(`   Memory Usage: ${stats.cache.memoryUsage}`);

    // 事件统计
    console.log(`\n📡 Event System:`);
    console.log(`   Events Emitted: ${stats.events.eventsEmitted}`);
    console.log(`   Listeners Executed: ${stats.events.listenersExecuted}`);
    console.log(`   Pool Efficiency: ${stats.events.poolEfficiency.toFixed(2)}%`);

    // 内存统计
    console.log(`\n💾 Memory Usage:`);
    console.log(`   Heap Used: ${stats.memory.current.heapUsedMB}MB`);
    console.log(`   Heap Usage: ${stats.memory.current.heapUsagePercent}%`);
    console.log(`   Trend: ${stats.memory.trend}`);

    // 性能统计
    console.log(`\n⚡ Performance:`);
    console.log(`   Total Operations: ${stats.performance.summary.totalProfiles}`);
    console.log(`   Average Duration: ${stats.performance.summary.averageDuration.toFixed(2)}ms`);
    console.log(`   Slowest Operation: ${stats.performance.summary.slowestOperation}`);

    // 懒加载统计
    const lazyStats = Object.values(stats.lazyLoading);
    const loadedCount = lazyStats.filter(s => s.loaded).length;
    console.log(`\n🔄 Lazy Loading:`);
    console.log(`   Registered: ${lazyStats.length}`);
    console.log(`   Loaded: ${loadedCount}`);
    console.log(`   Loading: ${lazyStats.filter(s => s.loading).length}`);

    console.log('='.repeat(50));

    return stats;
  }

  // 清理资源
  async cleanup() {
    console.log('🧹 Cleaning up optimized plugin manager...');

    // 停止定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // 停止内存监控
    this.memoryMonitor.stop();

    // 清理缓存
    this.cache.clear();

    // 清理事件系统
    this.optimizedEvents.cleanup();

    // 清理性能分析器
    this.profiler.clear();

    // 调用父类清理
    await super.cleanup();

    console.log('✅ Cleanup completed');
  }
}

module.exports = OptimizedPluginManager;
```

### 使用示例

```javascript
// optimization-example.js
const OptimizedPluginManager = require('./optimized-plugin-manager');
const PluginTestFramework = require('./plugin-test-framework');

// 创建测试插件
class TestPlugin {
  constructor(name, delay = 0) {
    this.name = name;
    this.version = '1.0.0';
    this.delay = delay;
  }

  async init(context) {
    // 模拟初始化延迟
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    context.log(`${this.name} initialized`);
  }

  async enable() {
    console.log(`${this.name} enabled`);
  }
}

async function runOptimizationExample() {
  console.log('🚀 Running optimization example...\n');

  // 创建优化的插件管理器
  const pluginManager = new OptimizedPluginManager({
    cache: {
      maxSize: 50,
      ttl: 300000 // 5分钟
    },
    memory: {
      threshold: 0.7, // 70%阈值
      interval: 10000 // 10秒检查
    }
  });

  try {
    // 注册多个插件
    console.log('📦 Registering plugins...');

    // 普通插件
    await pluginManager.register(new TestPlugin('fast-plugin', 100));
    await pluginManager.register(new TestPlugin('medium-plugin', 500));

    // 懒加载插件
    await pluginManager.register(new TestPlugin('slow-plugin', 2000), {
      lazy: true,
      lazyConditions: {
        trigger: 'heavy-operation',
        feature: 'advanced-features'
      }
    });

    // 缓存测试 - 重复注册相同插件
    await pluginManager.register(new TestPlugin('fast-plugin', 100));

    console.log('\n⚡ Initializing plugins...');
    await pluginManager.initAll();

    console.log('\n🔄 Enabling plugins...');
    await pluginManager.enableAll();

    // 测试事件系统性能
    console.log('\n📡 Testing event system performance...');
    const eventCount = 1000;

    pluginManager.on('test-event', (data) => {
      // 模拟事件处理
    });

    const startTime = Date.now();
    for (let i = 0; i < eventCount; i++) {
      pluginManager.emit('test-event', { index: i });
    }
    const eventTime = Date.now() - startTime;

    console.log(`   Emitted ${eventCount} events in ${eventTime}ms`);

    // 触发懒加载
    console.log('\n🔄 Triggering lazy loading...');
    await pluginManager.lazyLoader.checkAndLoad('slow-plugin', {
      trigger: 'heavy-operation',
      features: { 'advanced-features': true }
    });

    // 生成性能报告
    console.log('\n📊 Generating performance report...');
    pluginManager.generatePerformanceReport();

    // 运行插件测试
    console.log('\n🧪 Running plugin tests...');
    const testFramework = new PluginTestFramework();

    testFramework.describe('fast-plugin', (suite) => {
      suite.it('should initialize quickly', async (context) => {
        const plugin = context.utils.createPlugin('test-fast', { delay: 50 });
        const start = Date.now();
        await plugin.init(context);
        const duration = Date.now() - start;

        context.expect(duration).toBe(duration < 100);
      });

      suite.it('should be enabled', async (context) => {
        const plugin = context.pluginManager.getPlugin('fast-plugin');
        context.expect(plugin).toBeDefined();
      });
    });

    await testFramework.runAll();

    // 保持运行一段时间以观察内存监控
    console.log('\n⏱️  Running for 30 seconds to demonstrate monitoring...');
    console.log('   (Watch for memory warnings and maintenance messages)');

    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pluginManager.cleanup();
  }
}

// 运行示例
if (require.main === module) {
  runOptimizationExample().catch(console.error);
}

module.exports = { runOptimizationExample };
```

## 小结

在这一章中，我们深入探讨了插件系统的性能优化和开发最佳实践：

### 性能优化技术
1. **懒加载机制**：按需加载插件，减少启动时间
2. **缓存系统**：缓存插件实例和计算结果
3. **事件系统优化**：对象池、批量处理、优先级队列
4. **内存管理**：监控、清理、垃圾回收

### 开发最佳实践
1. **设计原则**：单一职责、依赖注入、错误处理
2. **性能监控**：分析器、统计、报告
3. **测试策略**：单元测试、集成测试、性能测试

### 关键收获
- **性能优化是持续过程**：需要监控、分析、改进
- **平衡功能与性能**：不要过度优化，关注关键路径
- **测试驱动开发**：确保优化不破坏功能
- **监控和可观测性**：及时发现和解决问题

这些优化技术和最佳实践能够显著提升插件系统的性能和稳定性，让它能够在生产环境中高效运行。

在下一章中，我们将讨论插件系统的调试和测试策略。

## 练习题

1. 实现一个插件的A/B测试系统，支持灰度发布
2. 创建一个插件性能基准测试套件
3. 设计一个插件系统的监控仪表板

---

**下一章预告**：我们将探讨插件系统的调试技巧和全面的测试策略。
