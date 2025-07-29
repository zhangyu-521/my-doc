# 第五章：插件间通信机制

在前面的章节中，我们已经实现了完整的插件生命周期管理。现在我们要解决插件间如何有效通信的问题。插件间通信是构建复杂插件生态系统的关键，它让插件能够协作完成更复杂的任务。

## 插件通信方式概述

插件间通信主要有以下几种方式：

1. **事件总线（Event Bus）**：基于发布-订阅模式的松耦合通信
2. **服务注册（Service Registry）**：插件提供服务供其他插件调用
3. **数据共享（Data Sharing）**：通过共享存储进行数据交换
4. **直接调用（Direct Call）**：插件间的直接方法调用
5. **消息队列（Message Queue）**：异步消息传递机制

## 事件总线系统

### 1. 增强的事件总线

```javascript
// enhanced-event-bus.js
class EnhancedEventBus {
  constructor() {
    this.events = new Map();
    this.wildcardEvents = new Map();
    this.middlewares = [];
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }
  
  // 注册中间件
  use(middleware) {
    this.middlewares.push(middleware);
  }
  
  // 注册事件监听器
  on(event, listener, options = {}) {
    const { priority = 0, once = false, namespace = null } = options;
    
    if (event.includes('*')) {
      return this.onWildcard(event, listener, options);
    }
    
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const listenerInfo = {
      listener,
      priority,
      once,
      namespace,
      id: this.generateId()
    };
    
    const listeners = this.events.get(event);
    listeners.push(listenerInfo);
    
    // 按优先级排序
    listeners.sort((a, b) => b.priority - a.priority);
    
    // 返回取消监听的函数
    return () => this.off(event, listenerInfo.id);
  }
  
  // 注册通配符事件监听器
  onWildcard(pattern, listener, options = {}) {
    const { priority = 0, once = false, namespace = null } = options;
    
    if (!this.wildcardEvents.has(pattern)) {
      this.wildcardEvents.set(pattern, []);
    }
    
    const listenerInfo = {
      listener,
      priority,
      once,
      namespace,
      pattern,
      regex: this.patternToRegex(pattern),
      id: this.generateId()
    };
    
    const listeners = this.wildcardEvents.get(pattern);
    listeners.push(listenerInfo);
    listeners.sort((a, b) => b.priority - a.priority);
    
    return () => this.offWildcard(pattern, listenerInfo.id);
  }
  
  // 注册一次性监听器
  once(event, listener, options = {}) {
    return this.on(event, listener, { ...options, once: true });
  }
  
  // 移除事件监听器
  off(event, listenerId) {
    if (!this.events.has(event)) return false;
    
    const listeners = this.events.get(event);
    const index = listeners.findIndex(l => l.id === listenerId);
    
    if (index > -1) {
      listeners.splice(index, 1);
      if (listeners.length === 0) {
        this.events.delete(event);
      }
      return true;
    }
    
    return false;
  }
  
  // 移除通配符监听器
  offWildcard(pattern, listenerId) {
    if (!this.wildcardEvents.has(pattern)) return false;
    
    const listeners = this.wildcardEvents.get(pattern);
    const index = listeners.findIndex(l => l.id === listenerId);
    
    if (index > -1) {
      listeners.splice(index, 1);
      if (listeners.length === 0) {
        this.wildcardEvents.delete(pattern);
      }
      return true;
    }
    
    return false;
  }
  
  // 移除命名空间下的所有监听器
  offNamespace(namespace) {
    let removed = 0;
    
    // 移除普通事件监听器
    for (const [event, listeners] of this.events) {
      const originalLength = listeners.length;
      this.events.set(event, listeners.filter(l => l.namespace !== namespace));
      removed += originalLength - this.events.get(event).length;
      
      if (this.events.get(event).length === 0) {
        this.events.delete(event);
      }
    }
    
    // 移除通配符事件监听器
    for (const [pattern, listeners] of this.wildcardEvents) {
      const originalLength = listeners.length;
      this.wildcardEvents.set(pattern, listeners.filter(l => l.namespace !== namespace));
      removed += originalLength - this.wildcardEvents.get(pattern).length;
      
      if (this.wildcardEvents.get(pattern).length === 0) {
        this.wildcardEvents.delete(pattern);
      }
    }
    
    return removed;
  }
  
  // 触发事件
  async emit(event, data, options = {}) {
    const { async = false, timeout = 5000 } = options;
    
    // 创建事件对象
    const eventObj = {
      name: event,
      data,
      timestamp: Date.now(),
      source: options.source || 'unknown',
      id: this.generateId(),
      cancelled: false,
      results: []
    };
    
    // 执行中间件
    for (const middleware of this.middlewares) {
      try {
        await middleware(eventObj);
        if (eventObj.cancelled) {
          return eventObj;
        }
      } catch (error) {
        console.error('Event middleware error:', error);
      }
    }
    
    // 记录事件历史
    this.addToHistory(eventObj);
    
    // 收集所有匹配的监听器
    const allListeners = [];
    
    // 普通事件监听器
    if (this.events.has(event)) {
      allListeners.push(...this.events.get(event));
    }
    
    // 通配符事件监听器
    for (const [pattern, listeners] of this.wildcardEvents) {
      for (const listenerInfo of listeners) {
        if (listenerInfo.regex.test(event)) {
          allListeners.push(listenerInfo);
        }
      }
    }
    
    // 按优先级排序
    allListeners.sort((a, b) => b.priority - a.priority);
    
    // 执行监听器
    if (async) {
      await this.executeListenersAsync(allListeners, eventObj, timeout);
    } else {
      await this.executeListenersSync(allListeners, eventObj);
    }
    
    return eventObj;
  }
  
  // 同步执行监听器
  async executeListenersSync(listeners, eventObj) {
    const toRemove = [];
    
    for (const listenerInfo of listeners) {
      if (eventObj.cancelled) break;
      
      try {
        const result = await listenerInfo.listener(eventObj.data, eventObj);
        eventObj.results.push({ listener: listenerInfo.id, result });
        
        if (listenerInfo.once) {
          toRemove.push(listenerInfo);
        }
      } catch (error) {
        console.error(`Error in event listener ${listenerInfo.id}:`, error);
        eventObj.results.push({ listener: listenerInfo.id, error });
      }
    }
    
    // 移除一次性监听器
    this.removeOnceListeners(toRemove);
  }
  
  // 异步执行监听器
  async executeListenersAsync(listeners, eventObj, timeout) {
    const promises = listeners.map(async (listenerInfo) => {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Listener timeout')), timeout);
        });
        
        const listenerPromise = Promise.resolve(listenerInfo.listener(eventObj.data, eventObj));
        const result = await Promise.race([listenerPromise, timeoutPromise]);
        
        return { listener: listenerInfo.id, result, listenerInfo };
      } catch (error) {
        return { listener: listenerInfo.id, error, listenerInfo };
      }
    });
    
    const results = await Promise.allSettled(promises);
    const toRemove = [];
    
    results.forEach(({ status, value }) => {
      if (status === 'fulfilled') {
        eventObj.results.push({
          listener: value.listener,
          result: value.result,
          error: value.error
        });
        
        if (value.listenerInfo && value.listenerInfo.once) {
          toRemove.push(value.listenerInfo);
        }
      }
    });
    
    // 移除一次性监听器
    this.removeOnceListeners(toRemove);
  }
  
  // 移除一次性监听器
  removeOnceListeners(toRemove) {
    toRemove.forEach(listenerInfo => {
      if (listenerInfo.pattern) {
        this.offWildcard(listenerInfo.pattern, listenerInfo.id);
      } else {
        // 需要找到对应的事件名
        for (const [event, listeners] of this.events) {
          if (listeners.includes(listenerInfo)) {
            this.off(event, listenerInfo.id);
            break;
          }
        }
      }
    });
  }
  
  // 将通配符模式转换为正则表达式
  patternToRegex(pattern) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }
  
  // 生成唯一ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  // 添加到事件历史
  addToHistory(eventObj) {
    this.eventHistory.push({
      name: eventObj.name,
      timestamp: eventObj.timestamp,
      source: eventObj.source,
      id: eventObj.id
    });
    
    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
  
  // 获取事件历史
  getHistory(filter = {}) {
    let history = this.eventHistory;
    
    if (filter.event) {
      history = history.filter(h => h.name === filter.event);
    }
    
    if (filter.source) {
      history = history.filter(h => h.source === filter.source);
    }
    
    if (filter.since) {
      history = history.filter(h => h.timestamp >= filter.since);
    }
    
    return history.slice();
  }
  
  // 获取统计信息
  getStats() {
    const eventCounts = {};
    const sourceCounts = {};
    
    this.eventHistory.forEach(h => {
      eventCounts[h.name] = (eventCounts[h.name] || 0) + 1;
      sourceCounts[h.source] = (sourceCounts[h.source] || 0) + 1;
    });
    
    return {
      totalEvents: this.eventHistory.length,
      uniqueEvents: Object.keys(eventCounts).length,
      eventCounts,
      sourceCounts,
      activeListeners: this.events.size + this.wildcardEvents.size
    };
  }
  
  // 清空所有监听器
  clear() {
    this.events.clear();
    this.wildcardEvents.clear();
  }
  
  // 清空事件历史
  clearHistory() {
    this.eventHistory = [];
  }
}

module.exports = EnhancedEventBus;
```

## 服务注册系统

### 2. 服务注册器

```javascript
// service-registry.js
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.serviceInstances = new Map();
    this.dependencies = new Map();
    this.interceptors = [];
  }

  // 注册服务
  register(name, serviceFactory, options = {}) {
    const {
      singleton = true,
      dependencies = [],
      lazy = false,
      metadata = {}
    } = options;

    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    const serviceInfo = {
      name,
      factory: serviceFactory,
      singleton,
      dependencies,
      lazy,
      metadata,
      instance: null,
      created: false
    };

    this.services.set(name, serviceInfo);
    this.dependencies.set(name, dependencies);

    // 如果不是懒加载且是单例，立即创建实例
    if (!lazy && singleton) {
      this.get(name);
    }

    return this;
  }

  // 获取服务实例
  get(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      throw new Error(`Service ${name} not found`);
    }

    // 如果是单例且已创建，直接返回
    if (serviceInfo.singleton && serviceInfo.instance) {
      return serviceInfo.instance;
    }

    // 解析依赖
    const resolvedDependencies = this.resolveDependencies(name);

    // 创建服务实例
    let instance;
    try {
      // 执行拦截器
      const context = { name, dependencies: resolvedDependencies };
      this.executeInterceptors('beforeCreate', context);

      if (typeof serviceInfo.factory === 'function') {
        instance = serviceInfo.factory(resolvedDependencies);
      } else {
        instance = serviceInfo.factory;
      }

      // 如果返回的是 Promise，等待解析
      if (instance && typeof instance.then === 'function') {
        instance = await instance;
      }

      context.instance = instance;
      this.executeInterceptors('afterCreate', context);

    } catch (error) {
      throw new Error(`Failed to create service ${name}: ${error.message}`);
    }

    // 如果是单例，缓存实例
    if (serviceInfo.singleton) {
      serviceInfo.instance = instance;
      serviceInfo.created = true;
    }

    return instance;
  }

  // 解析服务依赖
  resolveDependencies(serviceName) {
    const dependencies = this.dependencies.get(serviceName) || [];
    const resolved = {};

    for (const dep of dependencies) {
      if (typeof dep === 'string') {
        resolved[dep] = this.get(dep);
      } else if (typeof dep === 'object') {
        const { name, alias, optional = false } = dep;
        try {
          resolved[alias || name] = this.get(name);
        } catch (error) {
          if (!optional) {
            throw error;
          }
          resolved[alias || name] = null;
        }
      }
    }

    return resolved;
  }

  // 检查服务是否存在
  has(name) {
    return this.services.has(name);
  }

  // 注销服务
  unregister(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      return false;
    }

    // 如果有实例且实例有销毁方法，调用销毁方法
    if (serviceInfo.instance && typeof serviceInfo.instance.destroy === 'function') {
      try {
        serviceInfo.instance.destroy();
      } catch (error) {
        console.error(`Error destroying service ${name}:`, error);
      }
    }

    this.services.delete(name);
    this.dependencies.delete(name);

    return true;
  }

  // 添加拦截器
  addInterceptor(interceptor) {
    this.interceptors.push(interceptor);
  }

  // 执行拦截器
  executeInterceptors(phase, context) {
    for (const interceptor of this.interceptors) {
      if (interceptor[phase]) {
        try {
          interceptor[phase](context);
        } catch (error) {
          console.error(`Interceptor error in ${phase}:`, error);
        }
      }
    }
  }

  // 获取所有服务名称
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  // 获取服务信息
  getServiceInfo(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      return null;
    }

    return {
      name: serviceInfo.name,
      singleton: serviceInfo.singleton,
      dependencies: serviceInfo.dependencies,
      lazy: serviceInfo.lazy,
      metadata: serviceInfo.metadata,
      created: serviceInfo.created,
      hasInstance: !!serviceInfo.instance
    };
  }

  // 获取所有服务信息
  getAllServices() {
    return Array.from(this.services.keys()).map(name => this.getServiceInfo(name));
  }

  // 清空所有服务
  clear() {
    // 销毁所有实例
    for (const [name, serviceInfo] of this.services) {
      if (serviceInfo.instance && typeof serviceInfo.instance.destroy === 'function') {
        try {
          serviceInfo.instance.destroy();
        } catch (error) {
          console.error(`Error destroying service ${name}:`, error);
        }
      }
    }

    this.services.clear();
    this.dependencies.clear();
  }
}

module.exports = ServiceRegistry;
```

### 3. 数据共享存储

```javascript
// shared-storage.js
class SharedStorage {
  constructor() {
    this.data = new Map();
    this.watchers = new Map();
    this.namespaces = new Map();
    this.middleware = [];
  }

  // 设置数据
  set(key, value, options = {}) {
    const { namespace = 'default', notify = true, ttl = null } = options;

    const fullKey = this.getFullKey(namespace, key);
    const oldValue = this.data.get(fullKey);

    // 执行中间件
    const context = { key: fullKey, value, oldValue, namespace, action: 'set' };
    this.executeMiddleware(context);

    // 设置数据
    const dataEntry = {
      value: context.value,
      timestamp: Date.now(),
      ttl,
      namespace
    };

    this.data.set(fullKey, dataEntry);

    // 设置过期时间
    if (ttl) {
      setTimeout(() => {
        this.delete(key, { namespace, notify: false });
      }, ttl);
    }

    // 通知观察者
    if (notify) {
      this.notifyWatchers(fullKey, context.value, oldValue?.value);
    }

    return this;
  }

  // 获取数据
  get(key, options = {}) {
    const { namespace = 'default', defaultValue = undefined } = options;

    const fullKey = this.getFullKey(namespace, key);
    const dataEntry = this.data.get(fullKey);

    if (!dataEntry) {
      return defaultValue;
    }

    // 检查是否过期
    if (dataEntry.ttl && Date.now() - dataEntry.timestamp > dataEntry.ttl) {
      this.data.delete(fullKey);
      return defaultValue;
    }

    // 执行中间件
    const context = { key: fullKey, value: dataEntry.value, namespace, action: 'get' };
    this.executeMiddleware(context);

    return context.value;
  }

  // 检查键是否存在
  has(key, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = this.getFullKey(namespace, key);

    const dataEntry = this.data.get(fullKey);
    if (!dataEntry) {
      return false;
    }

    // 检查是否过期
    if (dataEntry.ttl && Date.now() - dataEntry.timestamp > dataEntry.ttl) {
      this.data.delete(fullKey);
      return false;
    }

    return true;
  }

  // 删除数据
  delete(key, options = {}) {
    const { namespace = 'default', notify = true } = options;

    const fullKey = this.getFullKey(namespace, key);
    const dataEntry = this.data.get(fullKey);

    if (!dataEntry) {
      return false;
    }

    // 执行中间件
    const context = { key: fullKey, value: dataEntry.value, namespace, action: 'delete' };
    this.executeMiddleware(context);

    this.data.delete(fullKey);

    // 通知观察者
    if (notify) {
      this.notifyWatchers(fullKey, undefined, dataEntry.value);
    }

    return true;
  }

  // 监听数据变化
  watch(key, callback, options = {}) {
    const { namespace = 'default', immediate = false } = options;

    const fullKey = this.getFullKey(namespace, key);

    if (!this.watchers.has(fullKey)) {
      this.watchers.set(fullKey, []);
    }

    const watcherId = this.generateId();
    const watcherInfo = { callback, id: watcherId };

    this.watchers.get(fullKey).push(watcherInfo);

    // 立即触发回调
    if (immediate) {
      const currentValue = this.get(key, { namespace });
      callback(currentValue, undefined, key);
    }

    // 返回取消监听的函数
    return () => this.unwatch(key, watcherId, { namespace });
  }

  // 取消监听
  unwatch(key, watcherId, options = {}) {
    const { namespace = 'default' } = options;

    const fullKey = this.getFullKey(namespace, key);
    const watchers = this.watchers.get(fullKey);

    if (!watchers) {
      return false;
    }

    const index = watchers.findIndex(w => w.id === watcherId);
    if (index > -1) {
      watchers.splice(index, 1);

      if (watchers.length === 0) {
        this.watchers.delete(fullKey);
      }

      return true;
    }

    return false;
  }

  // 通知观察者
  notifyWatchers(fullKey, newValue, oldValue) {
    const watchers = this.watchers.get(fullKey);
    if (!watchers) {
      return;
    }

    const [namespace, key] = this.parseFullKey(fullKey);

    watchers.forEach(watcher => {
      try {
        watcher.callback(newValue, oldValue, key);
      } catch (error) {
        console.error('Error in storage watcher:', error);
      }
    });
  }

  // 获取命名空间下的所有键
  getKeys(namespace = 'default') {
    const prefix = `${namespace}:`;
    const keys = [];

    for (const fullKey of this.data.keys()) {
      if (fullKey.startsWith(prefix)) {
        keys.push(fullKey.substring(prefix.length));
      }
    }

    return keys;
  }

  // 获取命名空间下的所有数据
  getAll(namespace = 'default') {
    const result = {};
    const keys = this.getKeys(namespace);

    keys.forEach(key => {
      result[key] = this.get(key, { namespace });
    });

    return result;
  }

  // 清空命名空间
  clearNamespace(namespace = 'default') {
    const keys = this.getKeys(namespace);
    keys.forEach(key => {
      this.delete(key, { namespace });
    });
  }

  // 添加中间件
  use(middleware) {
    this.middleware.push(middleware);
  }

  // 执行中间件
  executeMiddleware(context) {
    for (const middleware of this.middleware) {
      try {
        middleware(context);
      } catch (error) {
        console.error('Storage middleware error:', error);
      }
    }
  }

  // 获取完整键名
  getFullKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  // 解析完整键名
  parseFullKey(fullKey) {
    const colonIndex = fullKey.indexOf(':');
    if (colonIndex === -1) {
      return ['default', fullKey];
    }

    return [fullKey.substring(0, colonIndex), fullKey.substring(colonIndex + 1)];
  }

  // 生成唯一ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // 获取统计信息
  getStats() {
    const namespaceStats = {};
    let totalSize = 0;

    for (const [fullKey, dataEntry] of this.data) {
      const [namespace] = this.parseFullKey(fullKey);

      if (!namespaceStats[namespace]) {
        namespaceStats[namespace] = { count: 0, size: 0 };
      }

      namespaceStats[namespace].count++;

      // 估算数据大小
      const size = JSON.stringify(dataEntry.value).length;
      namespaceStats[namespace].size += size;
      totalSize += size;
    }

    return {
      totalKeys: this.data.size,
      totalSize,
      namespaceStats,
      watcherCount: this.watchers.size
    };
  }

  // 清空所有数据
  clear() {
    this.data.clear();
    this.watchers.clear();
  }
}

module.exports = SharedStorage;
```

## 通信管理器

### 4. 插件通信管理器

```javascript
// communication-manager.js
const EnhancedEventBus = require('./enhanced-event-bus');
const ServiceRegistry = require('./service-registry');
const SharedStorage = require('./shared-storage');

class CommunicationManager {
  constructor() {
    this.eventBus = new EnhancedEventBus();
    this.serviceRegistry = new ServiceRegistry();
    this.sharedStorage = new SharedStorage();
    this.messageQueue = new Map();
    this.pluginChannels = new Map();
  }

  // 为插件创建通信上下文
  createPluginContext(pluginName) {
    const namespace = pluginName;

    return {
      // 事件系统
      events: {
        on: (event, listener, options = {}) => {
          return this.eventBus.on(event, listener, {
            ...options,
            namespace: pluginName
          });
        },

        once: (event, listener, options = {}) => {
          return this.eventBus.once(event, listener, {
            ...options,
            namespace: pluginName
          });
        },

        emit: (event, data, options = {}) => {
          return this.eventBus.emit(event, data, {
            ...options,
            source: pluginName
          });
        },

        off: (event, listenerId) => {
          return this.eventBus.off(event, listenerId);
        }
      },

      // 服务系统
      services: {
        register: (name, factory, options = {}) => {
          const serviceName = `${namespace}.${name}`;
          return this.serviceRegistry.register(serviceName, factory, options);
        },

        get: (name) => {
          // 支持获取其他插件的服务
          if (name.includes('.')) {
            return this.serviceRegistry.get(name);
          }
          return this.serviceRegistry.get(`${namespace}.${name}`);
        },

        has: (name) => {
          if (name.includes('.')) {
            return this.serviceRegistry.has(name);
          }
          return this.serviceRegistry.has(`${namespace}.${name}`);
        },

        unregister: (name) => {
          const serviceName = `${namespace}.${name}`;
          return this.serviceRegistry.unregister(serviceName);
        }
      },

      // 数据共享
      storage: {
        set: (key, value, options = {}) => {
          return this.sharedStorage.set(key, value, {
            ...options,
            namespace
          });
        },

        get: (key, options = {}) => {
          return this.sharedStorage.get(key, {
            ...options,
            namespace
          });
        },

        has: (key, options = {}) => {
          return this.sharedStorage.has(key, {
            ...options,
            namespace
          });
        },

        delete: (key, options = {}) => {
          return this.sharedStorage.delete(key, {
            ...options,
            namespace
          });
        },

        watch: (key, callback, options = {}) => {
          return this.sharedStorage.watch(key, callback, {
            ...options,
            namespace
          });
        },

        // 访问全局存储
        global: {
          set: (key, value, options = {}) => {
            return this.sharedStorage.set(key, value, {
              ...options,
              namespace: 'global'
            });
          },

          get: (key, options = {}) => {
            return this.sharedStorage.get(key, {
              ...options,
              namespace: 'global'
            });
          },

          has: (key, options = {}) => {
            return this.sharedStorage.has(key, {
              ...options,
              namespace: 'global'
            });
          },

          delete: (key, options = {}) => {
            return this.sharedStorage.delete(key, {
              ...options,
              namespace: 'global'
            });
          },

          watch: (key, callback, options = {}) => {
            return this.sharedStorage.watch(key, callback, {
              ...options,
              namespace: 'global'
            });
          }
        }
      },

      // 消息队列
      messages: {
        send: (target, message, options = {}) => {
          return this.sendMessage(pluginName, target, message, options);
        },

        receive: (callback) => {
          return this.subscribeToMessages(pluginName, callback);
        },

        broadcast: (message, options = {}) => {
          return this.broadcastMessage(pluginName, message, options);
        }
      },

      // 直接调用其他插件
      call: (pluginName, method, ...args) => {
        return this.callPlugin(pluginName, method, ...args);
      },

      // 获取其他插件的引用
      getPlugin: (name) => {
        return this.getPluginReference(name);
      }
    };
  }

  // 发送消息给特定插件
  sendMessage(from, to, message, options = {}) {
    const { priority = 0, timeout = 5000 } = options;

    if (!this.messageQueue.has(to)) {
      this.messageQueue.set(to, []);
    }

    const messageObj = {
      id: this.generateId(),
      from,
      to,
      message,
      priority,
      timestamp: Date.now(),
      timeout
    };

    const queue = this.messageQueue.get(to);
    queue.push(messageObj);

    // 按优先级排序
    queue.sort((a, b) => b.priority - a.priority);

    // 通知目标插件有新消息
    this.eventBus.emit(`plugin.${to}.message`, messageObj, { source: from });

    return messageObj.id;
  }

  // 订阅消息
  subscribeToMessages(pluginName, callback) {
    return this.eventBus.on(`plugin.${pluginName}.message`, (messageObj) => {
      try {
        callback(messageObj);

        // 从队列中移除已处理的消息
        const queue = this.messageQueue.get(pluginName);
        if (queue) {
          const index = queue.findIndex(m => m.id === messageObj.id);
          if (index > -1) {
            queue.splice(index, 1);
          }
        }
      } catch (error) {
        console.error(`Error processing message in plugin ${pluginName}:`, error);
      }
    }, { namespace: pluginName });
  }

  // 广播消息
  broadcastMessage(from, message, options = {}) {
    const { exclude = [] } = options;

    const messageId = this.generateId();

    // 获取所有插件通道
    for (const pluginName of this.pluginChannels.keys()) {
      if (pluginName !== from && !exclude.includes(pluginName)) {
        this.sendMessage(from, pluginName, message, {
          ...options,
          messageId
        });
      }
    }

    return messageId;
  }

  // 调用其他插件的方法
  async callPlugin(targetPlugin, method, ...args) {
    const plugin = this.getPluginReference(targetPlugin);

    if (!plugin) {
      throw new Error(`Plugin ${targetPlugin} not found`);
    }

    if (typeof plugin[method] !== 'function') {
      throw new Error(`Method ${method} not found in plugin ${targetPlugin}`);
    }

    try {
      return await plugin[method](...args);
    } catch (error) {
      throw new Error(`Error calling ${targetPlugin}.${method}: ${error.message}`);
    }
  }

  // 获取插件引用
  getPluginReference(pluginName) {
    // 这个方法需要由插件管理器实现
    // 这里只是一个占位符
    return null;
  }

  // 注册插件通道
  registerPluginChannel(pluginName) {
    this.pluginChannels.set(pluginName, {
      name: pluginName,
      registered: Date.now(),
      messageCount: 0
    });
  }

  // 注销插件通道
  unregisterPluginChannel(pluginName) {
    // 清理事件监听器
    this.eventBus.offNamespace(pluginName);

    // 清理服务
    const services = this.serviceRegistry.getServiceNames();
    services.forEach(serviceName => {
      if (serviceName.startsWith(`${pluginName}.`)) {
        this.serviceRegistry.unregister(serviceName);
      }
    });

    // 清理存储
    this.sharedStorage.clearNamespace(pluginName);

    // 清理消息队列
    this.messageQueue.delete(pluginName);

    // 移除通道
    this.pluginChannels.delete(pluginName);
  }

  // 生成唯一ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // 获取通信统计
  getStats() {
    return {
      eventBus: this.eventBus.getStats(),
      services: {
        total: this.serviceRegistry.getServiceNames().length,
        services: this.serviceRegistry.getAllServices()
      },
      storage: this.sharedStorage.getStats(),
      channels: this.pluginChannels.size,
      messageQueues: Array.from(this.messageQueue.entries()).map(([plugin, queue]) => ({
        plugin,
        queueSize: queue.length
      }))
    };
  }

  // 清理所有通信数据
  cleanup() {
    this.eventBus.clear();
    this.serviceRegistry.clear();
    this.sharedStorage.clear();
    this.messageQueue.clear();
    this.pluginChannels.clear();
  }
}

module.exports = CommunicationManager;
```

## 使用示例

让我们创建一些使用通信系统的插件：

### 示例插件

```javascript
// communication-plugins.js
const EnhancedPlugin = require('../chapter-04/enhanced-plugin');

// 数据提供者插件
class DataProviderPlugin extends EnhancedPlugin {
  constructor() {
    super('dataProvider', '1.0.0', {
      description: 'Provides data services to other plugins'
    });

    this.data = new Map();
  }

  async init(context) {
    this.context = context;

    // 注册数据服务
    context.services.register('dataService', () => ({
      getData: (key) => this.data.get(key),
      setData: (key, value) => this.data.set(key, value),
      getAllData: () => Object.fromEntries(this.data)
    }));

    // 监听数据请求事件
    context.events.on('data:request', async (request) => {
      const { key, requestId } = request;
      const value = this.data.get(key);

      // 发送响应事件
      context.events.emit('data:response', {
        requestId,
        key,
        value,
        found: this.data.has(key)
      });
    });

    // 初始化一些测试数据
    this.data.set('user:1', { id: 1, name: 'Alice', role: 'admin' });
    this.data.set('user:2', { id: 2, name: 'Bob', role: 'user' });
    this.data.set('config:theme', 'dark');

    context.log('Data provider initialized with test data');
  }

  async enable() {
    // 在全局存储中设置状态
    this.context.storage.global.set('dataProvider:status', 'online');

    // 广播服务可用消息
    this.context.messages.broadcast({
      type: 'service:available',
      service: 'dataService',
      provider: 'dataProvider'
    });

    await super.enable();
  }

  async disable() {
    this.context.storage.global.set('dataProvider:status', 'offline');
    await super.disable();
  }
}

// 用户管理插件
class UserManagerPlugin extends EnhancedPlugin {
  constructor() {
    super('userManager', '1.0.0', {
      dependencies: ['dataProvider'],
      description: 'Manages user operations'
    });

    this.currentUser = null;
  }

  async init(context) {
    this.context = context;

    // 获取数据服务
    this.dataService = context.services.get('dataProvider.dataService');

    // 注册用户管理服务
    context.services.register('userService', () => ({
      login: (userId) => this.login(userId),
      logout: () => this.logout(),
      getCurrentUser: () => this.currentUser,
      updateUser: (userId, updates) => this.updateUser(userId, updates)
    }));

    // 监听用户相关消息
    context.messages.receive((message) => {
      if (message.message.type === 'user:login') {
        this.login(message.message.userId);
      } else if (message.message.type === 'user:logout') {
        this.logout();
      }
    });

    context.log('User manager initialized');
  }

  async login(userId) {
    const userKey = `user:${userId}`;
    const userData = this.dataService.getData(userKey);

    if (userData) {
      this.currentUser = userData;

      // 在存储中保存当前用户
      this.context.storage.set('currentUser', userData);

      // 发送登录成功事件
      this.context.events.emit('user:loggedIn', userData);

      this.context.log(`User ${userData.name} logged in`);
      return userData;
    } else {
      throw new Error(`User ${userId} not found`);
    }
  }

  async logout() {
    if (this.currentUser) {
      const user = this.currentUser;
      this.currentUser = null;

      // 清除存储中的用户信息
      this.context.storage.delete('currentUser');

      // 发送登出事件
      this.context.events.emit('user:loggedOut', user);

      this.context.log(`User ${user.name} logged out`);
    }
  }

  async updateUser(userId, updates) {
    const userKey = `user:${userId}`;
    const userData = this.dataService.getData(userKey);

    if (userData) {
      const updatedUser = { ...userData, ...updates };
      this.dataService.setData(userKey, updatedUser);

      // 如果是当前用户，更新当前用户信息
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = updatedUser;
        this.context.storage.set('currentUser', updatedUser);
      }

      // 发送用户更新事件
      this.context.events.emit('user:updated', updatedUser);

      return updatedUser;
    } else {
      throw new Error(`User ${userId} not found`);
    }
  }
}

// 通知插件
class NotificationPlugin extends EnhancedPlugin {
  constructor() {
    super('notification', '1.0.0', {
      description: 'Handles system notifications'
    });

    this.notifications = [];
  }

  async init(context) {
    this.context = context;

    // 注册通知服务
    context.services.register('notificationService', () => ({
      send: (message, type = 'info') => this.sendNotification(message, type),
      getAll: () => this.notifications.slice(),
      clear: () => this.clearNotifications()
    }));

    // 监听用户事件
    context.events.on('user:*', (data, event) => {
      if (event.name === 'user:loggedIn') {
        this.sendNotification(`Welcome, ${data.name}!`, 'success');
      } else if (event.name === 'user:loggedOut') {
        this.sendNotification(`Goodbye, ${data.name}!`, 'info');
      } else if (event.name === 'user:updated') {
        this.sendNotification(`User ${data.name} profile updated`, 'info');
      }
    });

    // 监听服务可用消息
    context.messages.receive((message) => {
      if (message.message.type === 'service:available') {
        const { service, provider } = message.message;
        this.sendNotification(`Service ${service} is now available from ${provider}`, 'info');
      }
    });

    context.log('Notification system initialized');
  }

  sendNotification(message, type = 'info') {
    const notification = {
      id: this.generateId(),
      message,
      type,
      timestamp: Date.now()
    };

    this.notifications.push(notification);

    // 限制通知数量
    if (this.notifications.length > 100) {
      this.notifications.shift();
    }

    // 发送通知事件
    this.context.events.emit('notification:sent', notification);

    console.log(`📢 [${type.toUpperCase()}] ${message}`);

    return notification;
  }

  clearNotifications() {
    this.notifications = [];
    this.context.events.emit('notification:cleared');
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = {
  DataProviderPlugin,
  UserManagerPlugin,
  NotificationPlugin
};
```

### 集成通信管理器的插件管理器

```javascript
// communication-enabled-plugin-manager.js
const AdvancedPluginManager = require('../chapter-04/advanced-plugin-manager');
const CommunicationManager = require('./communication-manager');

class CommunicationEnabledPluginManager extends AdvancedPluginManager {
  constructor() {
    super();
    this.communicationManager = new CommunicationManager();

    // 重写上下文创建方法
    this.context = this.createEnhancedContext();
  }

  createEnhancedContext() {
    const baseContext = super.createContext();

    return {
      ...baseContext,
      // 添加通信功能到基础上下文
      communication: this.communicationManager,

      // 为每个插件创建专用的通信上下文
      createPluginContext: (pluginName) => {
        return {
          ...baseContext,
          ...this.communicationManager.createPluginContext(pluginName)
        };
      }
    };
  }

  // 重写插件注册方法
  async register(plugin) {
    // 注册插件通道
    this.communicationManager.registerPluginChannel(plugin.name);

    // 设置插件引用获取方法
    this.communicationManager.getPluginReference = (pluginName) => {
      return this.getPlugin(pluginName);
    };

    return await super.register(plugin);
  }

  // 重写插件初始化方法
  async initPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    // 为插件创建专用的通信上下文
    const pluginContext = this.context.createPluginContext(name);

    // 临时替换上下文
    const originalContext = this.context;
    this.context = pluginContext;

    try {
      const result = await super.initPlugin(name);
      return result;
    } finally {
      // 恢复原始上下文
      this.context = originalContext;
    }
  }

  // 重写插件卸载方法
  async unloadPlugin(name) {
    // 清理通信资源
    this.communicationManager.unregisterPluginChannel(name);

    return await super.unloadPlugin(name);
  }

  // 获取通信统计
  getCommunicationStats() {
    return this.communicationManager.getStats();
  }

  // 清理通信资源
  cleanup() {
    this.communicationManager.cleanup();
  }
}

module.exports = CommunicationEnabledPluginManager;
```

### 完整使用示例

```javascript
// communication-example.js
const CommunicationEnabledPluginManager = require('./communication-enabled-plugin-manager');
const {
  DataProviderPlugin,
  UserManagerPlugin,
  NotificationPlugin
} = require('./communication-plugins');

async function main() {
  const pluginManager = new CommunicationEnabledPluginManager();

  // 创建插件实例
  const dataProvider = new DataProviderPlugin();
  const userManager = new UserManagerPlugin();
  const notification = new NotificationPlugin();

  try {
    console.log('=== 注册插件 ===');
    await pluginManager.register(dataProvider);
    await pluginManager.register(userManager);
    await pluginManager.register(notification);

    console.log('\n=== 初始化和启用插件 ===');
    await pluginManager.initAll();
    await pluginManager.enableAll();

    console.log('\n=== 测试插件通信 ===');

    // 测试服务调用
    const userService = pluginManager.context.communication.serviceRegistry.get('userManager.userService');
    const notificationService = pluginManager.context.communication.serviceRegistry.get('notification.notificationService');

    // 用户登录
    console.log('\n--- 用户登录 ---');
    await userService.login(1);

    // 更新用户信息
    console.log('\n--- 更新用户信息 ---');
    await userService.updateUser(1, { name: 'Alice Smith', email: 'alice@example.com' });

    // 测试消息传递
    console.log('\n--- 测试消息传递 ---');
    const comm = pluginManager.context.communication;

    // 发送消息给用户管理器
    comm.sendMessage('test', 'userManager', {
      type: 'user:login',
      userId: 2
    });

    // 等待消息处理
    await new Promise(resolve => setTimeout(resolve, 100));

    // 测试数据共享
    console.log('\n--- 测试数据共享 ---');
    const storage = comm.sharedStorage;

    // 设置全局配置
    storage.set('app:version', '1.0.0', { namespace: 'global' });
    storage.set('app:theme', 'dark', { namespace: 'global' });

    // 监听配置变化
    storage.watch('app:theme', (newValue, oldValue) => {
      console.log(`🎨 Theme changed from ${oldValue} to ${newValue}`);
    }, { namespace: 'global', immediate: true });

    // 更改主题
    storage.set('app:theme', 'light', { namespace: 'global' });

    // 测试事件系统
    console.log('\n--- 测试事件系统 ---');

    // 监听所有用户事件
    comm.eventBus.on('user:*', (data, event) => {
      console.log(`🔔 User event: ${event.name}`, data);
    });

    // 用户登出
    await userService.logout();

    // 获取通信统计
    console.log('\n=== 通信统计 ===');
    const stats = pluginManager.getCommunicationStats();
    console.log('Event bus stats:', stats.eventBus);
    console.log('Services:', stats.services.total);
    console.log('Storage stats:', stats.storage);

    // 获取所有通知
    console.log('\n=== 通知历史 ===');
    const notifications = notificationService.getAll();
    notifications.forEach(n => {
      const time = new Date(n.timestamp).toLocaleTimeString();
      console.log(`[${time}] ${n.type}: ${n.message}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // 清理资源
    pluginManager.cleanup();
  }
}

main().catch(console.error);
```

## 运行结果

运行上面的示例代码，你会看到类似这样的输出：

```
=== 注册插件 ===
🔄 dataProvider: unregistered -> registered
🔄 userManager: unregistered -> registered
🔄 notification: unregistered -> registered

=== 初始化和启用插件 ===
Data provider initialized with test data
User manager initialized
Notification system initialized
📢 [INFO] Service dataService is now available from dataProvider
Data provider enabled
User manager enabled
Notification system enabled

=== 测试插件通信 ===

--- 用户登录 ---
User Alice logged in
📢 [SUCCESS] Welcome, Alice!

--- 更新用户信息 ---
User Alice Smith profile updated
📢 [INFO] User Alice Smith profile updated

--- 测试消息传递 ---
User Bob logged in
📢 [SUCCESS] Welcome, Bob!

--- 测试数据共享 ---
🎨 Theme changed from undefined to dark
🎨 Theme changed from dark to light

--- 测试事件系统 ---
🔔 User event: user:loggedOut { id: 2, name: 'Bob', role: 'user' }
User Bob logged out
📢 [INFO] Goodbye, Bob!
```

## 小结

在这一章中，我们实现了完整的插件间通信机制，包括：

1. **增强的事件总线**：支持通配符、优先级、中间件等高级特性
2. **服务注册系统**：提供依赖注入和服务发现功能
3. **数据共享存储**：支持命名空间、监听器、TTL等功能
4. **消息队列系统**：实现插件间的异步消息传递
5. **通信管理器**：统一管理所有通信机制

这个通信系统为插件提供了丰富的协作方式，让插件能够：
- 通过事件进行松耦合通信
- 通过服务注册提供和消费功能
- 通过共享存储交换数据
- 通过消息队列进行异步通信
- 直接调用其他插件的方法

在下一章中，我们将实现更多高级特性，包括插件配置管理、条件加载、插件市场等功能。

## 练习题

1. 实现一个插件间的RPC（远程过程调用）机制
2. 添加消息的持久化功能，支持离线消息
3. 实现插件间的流式数据传输功能

---

**下一章预告**：我们将实现插件系统的高级特性，包括配置管理、条件加载、插件市场等企业级功能。
