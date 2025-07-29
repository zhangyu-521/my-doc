# 第九章：调试与测试

在插件系统的开发过程中，调试和测试是确保系统稳定性和可靠性的关键环节。由于插件系统的复杂性和动态性，传统的调试和测试方法需要进行适配和扩展。本章将详细介绍插件系统的调试技巧和全面的测试策略。

## 调试策略与工具

### 1. 插件调试器

```javascript
// plugin-debugger.js
class PluginDebugger {
  constructor(pluginManager, options = {}) {
    this.pluginManager = pluginManager;
    this.options = {
      logLevel: 'debug',
      enableTracing: true,
      enableBreakpoints: true,
      maxTraceHistory: 1000,
      ...options
    };
    
    this.traceHistory = [];
    this.breakpoints = new Map();
    this.watchedVariables = new Map();
    this.debugSessions = new Map();
    this.isDebugging = false;
  }
  
  // 启用调试模式
  enable() {
    if (this.isDebugging) return;
    
    this.isDebugging = true;
    this.setupHooks();
    this.setupConsoleOverride();
    
    console.log('🐛 Plugin debugger enabled');
  }
  
  // 禁用调试模式
  disable() {
    if (!this.isDebugging) return;
    
    this.isDebugging = false;
    this.restoreConsole();
    this.clearBreakpoints();
    
    console.log('🐛 Plugin debugger disabled');
  }
  
  // 设置调试钩子
  setupHooks() {
    const hooks = this.pluginManager.hookManager;
    
    // 监听所有钩子执行
    const originalHooks = new Map();
    
    for (const [hookName, hook] of hooks.hooks) {
      originalHooks.set(hookName, hook.call);
      
      hook.call = (...args) => {
        this.traceHookCall(hookName, args);
        
        // 检查断点
        if (this.hasBreakpoint(`hook:${hookName}`)) {
          this.triggerBreakpoint(`hook:${hookName}`, { hookName, args });
        }
        
        try {
          const result = originalHooks.get(hookName).apply(hook, args);
          this.traceHookResult(hookName, result);
          return result;
        } catch (error) {
          this.traceHookError(hookName, error);
          throw error;
        }
      };
    }
  }
  
  // 设置控制台重写
  setupConsoleOverride() {
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    console.log = (...args) => {
      this.logWithContext('log', args);
      this.originalConsole.log(...args);
    };
    
    console.warn = (...args) => {
      this.logWithContext('warn', args);
      this.originalConsole.warn(...args);
    };
    
    console.error = (...args) => {
      this.logWithContext('error', args);
      this.originalConsole.error(...args);
    };
    
    console.debug = (...args) => {
      this.logWithContext('debug', args);
      if (this.options.logLevel === 'debug') {
        this.originalConsole.debug(...args);
      }
    };
  }
  
  // 恢复控制台
  restoreConsole() {
    if (this.originalConsole) {
      Object.assign(console, this.originalConsole);
    }
  }
  
  // 记录带上下文的日志
  logWithContext(level, args) {
    const context = this.getCurrentContext();
    
    this.addTrace({
      type: 'console',
      level,
      args,
      context,
      timestamp: Date.now(),
      stack: new Error().stack
    });
  }
  
  // 获取当前上下文
  getCurrentContext() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    
    // 查找插件相关的调用栈
    for (const line of lines) {
      const match = line.match(/at\s+(\w+Plugin)\.(\w+)/);
      if (match) {
        return {
          plugin: match[1],
          method: match[2],
          line: line.trim()
        };
      }
    }
    
    return { plugin: 'unknown', method: 'unknown', line: 'unknown' };
  }
  
  // 添加跟踪记录
  addTrace(trace) {
    this.traceHistory.push(trace);
    
    // 限制历史记录大小
    if (this.traceHistory.length > this.options.maxTraceHistory) {
      this.traceHistory.shift();
    }
    
    // 检查观察的变量
    this.checkWatchedVariables(trace);
  }
  
  // 跟踪钩子调用
  traceHookCall(hookName, args) {
    this.addTrace({
      type: 'hook-call',
      hookName,
      args: this.serializeArgs(args),
      timestamp: Date.now()
    });
  }
  
  // 跟踪钩子结果
  traceHookResult(hookName, result) {
    this.addTrace({
      type: 'hook-result',
      hookName,
      result: this.serializeArgs([result]),
      timestamp: Date.now()
    });
  }
  
  // 跟踪钩子错误
  traceHookError(hookName, error) {
    this.addTrace({
      type: 'hook-error',
      hookName,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: Date.now()
    });
  }
  
  // 序列化参数
  serializeArgs(args) {
    return args.map(arg => {
      try {
        if (typeof arg === 'function') {
          return `[Function: ${arg.name || 'anonymous'}]`;
        }
        if (typeof arg === 'object' && arg !== null) {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      } catch (error) {
        return '[Unserializable]';
      }
    });
  }
  
  // 设置断点
  setBreakpoint(location, condition = null) {
    this.breakpoints.set(location, {
      condition,
      hitCount: 0,
      enabled: true
    });
    
    console.log(`🔴 Breakpoint set at: ${location}`);
  }
  
  // 移除断点
  removeBreakpoint(location) {
    if (this.breakpoints.delete(location)) {
      console.log(`🟢 Breakpoint removed from: ${location}`);
    }
  }
  
  // 检查是否有断点
  hasBreakpoint(location) {
    const breakpoint = this.breakpoints.get(location);
    return breakpoint && breakpoint.enabled;
  }
  
  // 触发断点
  triggerBreakpoint(location, context) {
    const breakpoint = this.breakpoints.get(location);
    if (!breakpoint) return;
    
    breakpoint.hitCount++;
    
    // 检查条件
    if (breakpoint.condition && !this.evaluateCondition(breakpoint.condition, context)) {
      return;
    }
    
    console.log(`🛑 Breakpoint hit at: ${location}`);
    console.log('Context:', context);
    
    // 启动调试会话
    this.startDebugSession(location, context);
  }
  
  // 评估断点条件
  evaluateCondition(condition, context) {
    try {
      // 简单的条件评估（实际应该更安全）
      return new Function('context', `return ${condition}`)(context);
    } catch (error) {
      console.warn('Breakpoint condition error:', error);
      return true;
    }
  }
  
  // 启动调试会话
  startDebugSession(location, context) {
    const sessionId = this.generateId();
    
    const session = {
      id: sessionId,
      location,
      context,
      startTime: Date.now(),
      commands: []
    };
    
    this.debugSessions.set(sessionId, session);
    
    // 在实际应用中，这里应该启动交互式调试界面
    console.log(`Debug session started: ${sessionId}`);
    console.log('Available commands: continue, step, inspect, trace');
  }
  
  // 观察变量
  watchVariable(name, getter) {
    this.watchedVariables.set(name, {
      getter,
      lastValue: null,
      changeCount: 0
    });
    
    console.log(`👁️  Watching variable: ${name}`);
  }
  
  // 停止观察变量
  unwatchVariable(name) {
    if (this.watchedVariables.delete(name)) {
      console.log(`👁️  Stopped watching variable: ${name}`);
    }
  }
  
  // 检查观察的变量
  checkWatchedVariables(trace) {
    for (const [name, watcher] of this.watchedVariables) {
      try {
        const currentValue = watcher.getter();
        
        if (JSON.stringify(currentValue) !== JSON.stringify(watcher.lastValue)) {
          watcher.changeCount++;
          
          console.log(`👁️  Variable changed: ${name}`);
          console.log(`   Old value:`, watcher.lastValue);
          console.log(`   New value:`, currentValue);
          console.log(`   Change count:`, watcher.changeCount);
          
          watcher.lastValue = currentValue;
        }
      } catch (error) {
        console.warn(`Error watching variable ${name}:`, error);
      }
    }
  }
  
  // 获取调试信息
  getDebugInfo() {
    return {
      isDebugging: this.isDebugging,
      traceCount: this.traceHistory.length,
      breakpoints: Array.from(this.breakpoints.keys()),
      watchedVariables: Array.from(this.watchedVariables.keys()),
      activeSessions: this.debugSessions.size
    };
  }
  
  // 导出跟踪历史
  exportTrace(filter = {}) {
    let traces = this.traceHistory;
    
    // 应用过滤器
    if (filter.type) {
      traces = traces.filter(t => t.type === filter.type);
    }
    
    if (filter.plugin) {
      traces = traces.filter(t => t.context?.plugin === filter.plugin);
    }
    
    if (filter.since) {
      traces = traces.filter(t => t.timestamp >= filter.since);
    }
    
    return {
      traces,
      exportTime: Date.now(),
      filter,
      totalCount: this.traceHistory.length,
      filteredCount: traces.length
    };
  }
  
  // 清空断点
  clearBreakpoints() {
    this.breakpoints.clear();
    console.log('🟢 All breakpoints cleared');
  }
  
  // 生成ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = PluginDebugger;
```

### 2. 日志系统增强

```javascript
// enhanced-logger.js
class EnhancedLogger {
  constructor(options = {}) {
    this.options = {
      level: 'info',
      format: 'text',
      outputs: ['console'],
      includeStack: false,
      includeContext: true,
      maxLogSize: 1000,
      ...options
    };
    
    this.logs = [];
    this.contexts = new Map();
    this.filters = [];
    this.formatters = new Map();
    
    this.setupFormatters();
  }
  
  // 设置格式化器
  setupFormatters() {
    this.formatters.set('text', this.formatText.bind(this));
    this.formatters.set('json', this.formatJSON.bind(this));
    this.formatters.set('structured', this.formatStructured.bind(this));
  }
  
  // 创建日志条目
  createLogEntry(level, message, meta = {}) {
    const entry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message,
      meta,
      context: this.getCurrentContext(),
      stack: this.options.includeStack ? new Error().stack : null
    };
    
    // 添加到历史
    this.logs.push(entry);
    
    // 限制日志大小
    if (this.logs.length > this.options.maxLogSize) {
      this.logs.shift();
    }
    
    return entry;
  }
  
  // 获取当前上下文
  getCurrentContext() {
    if (!this.options.includeContext) return null;
    
    const stack = new Error().stack;
    const lines = stack.split('\n');
    
    // 查找调用者信息
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/at\s+(?:(\w+)\.)?(\w+)\s+\(([^)]+)\)/);
      
      if (match) {
        return {
          class: match[1] || null,
          method: match[2],
          location: match[3]
        };
      }
    }
    
    return null;
  }
  
  // 记录日志
  log(level, message, meta = {}) {
    // 检查日志级别
    if (!this.shouldLog(level)) return;
    
    const entry = this.createLogEntry(level, message, meta);
    
    // 应用过滤器
    if (!this.passesFilters(entry)) return;
    
    // 输出日志
    this.output(entry);
  }
  
  // 检查是否应该记录
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.options.level);
    const messageIndex = levels.indexOf(level);
    
    return messageIndex >= currentIndex;
  }
  
  // 检查过滤器
  passesFilters(entry) {
    return this.filters.every(filter => filter(entry));
  }
  
  // 输出日志
  output(entry) {
    const formatter = this.formatters.get(this.options.format);
    const formatted = formatter ? formatter(entry) : this.formatText(entry);
    
    this.options.outputs.forEach(output => {
      switch (output) {
        case 'console':
          this.outputToConsole(entry.level, formatted);
          break;
        case 'file':
          this.outputToFile(formatted);
          break;
        case 'memory':
          // 已经存储在 this.logs 中
          break;
      }
    });
  }
  
  // 输出到控制台
  outputToConsole(level, message) {
    const colors = {
      debug: '\x1b[36m', // 青色
      info: '\x1b[32m',  // 绿色
      warn: '\x1b[33m',  // 黄色
      error: '\x1b[31m'  // 红色
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(`${color}${message}${reset}`);
  }
  
  // 输出到文件
  outputToFile(message) {
    // 实际应该使用文件系统
    console.log(`[FILE] ${message}`);
  }
  
  // 文本格式化
  formatText(entry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? 
      `[${entry.context.class || 'Global'}.${entry.context.method}]` : '';
    
    let message = `${timestamp} ${level} ${context} ${entry.message}`;
    
    if (Object.keys(entry.meta).length > 0) {
      message += ` ${JSON.stringify(entry.meta)}`;
    }
    
    return message;
  }
  
  // JSON格式化
  formatJSON(entry) {
    return JSON.stringify(entry);
  }
  
  // 结构化格式化
  formatStructured(entry) {
    const lines = [
      `┌─ ${entry.level.toUpperCase()} [${new Date(entry.timestamp).toISOString()}]`,
      `├─ Message: ${entry.message}`
    ];
    
    if (entry.context) {
      lines.push(`├─ Context: ${entry.context.class || 'Global'}.${entry.context.method}`);
    }
    
    if (Object.keys(entry.meta).length > 0) {
      lines.push(`├─ Meta: ${JSON.stringify(entry.meta, null, 2).replace(/\n/g, '\n│  ')}`);
    }
    
    lines.push('└─');
    
    return lines.join('\n');
  }
  
  // 便捷方法
  debug(message, meta) { this.log('debug', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  error(message, meta) { this.log('error', message, meta); }
  
  // 添加过滤器
  addFilter(filter) {
    this.filters.push(filter);
  }
  
  // 移除过滤器
  removeFilter(filter) {
    const index = this.filters.indexOf(filter);
    if (index > -1) {
      this.filters.splice(index, 1);
    }
  }
  
  // 搜索日志
  search(query) {
    const results = this.logs.filter(entry => {
      if (typeof query === 'string') {
        return entry.message.includes(query) || 
               JSON.stringify(entry.meta).includes(query);
      }
      
      if (typeof query === 'object') {
        return Object.entries(query).every(([key, value]) => {
          if (key === 'level') return entry.level === value;
          if (key === 'since') return entry.timestamp >= value;
          if (key === 'until') return entry.timestamp <= value;
          if (key === 'context') return entry.context?.class === value;
          return true;
        });
      }
      
      return false;
    });
    
    return results;
  }
  
  // 获取统计信息
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byContext: {},
      timeRange: null
    };
    
    if (this.logs.length > 0) {
      stats.timeRange = {
        start: this.logs[0].timestamp,
        end: this.logs[this.logs.length - 1].timestamp
      };
      
      this.logs.forEach(entry => {
        // 按级别统计
        stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
        
        // 按上下文统计
        if (entry.context) {
          const contextKey = `${entry.context.class || 'Global'}.${entry.context.method}`;
          stats.byContext[contextKey] = (stats.byContext[contextKey] || 0) + 1;
        }
      });
    }
    
    return stats;
  }
  
  // 清空日志
  clear() {
    this.logs = [];
  }
  
  // 导出日志
  export(format = 'json') {
    const formatter = this.formatters.get(format);
    
    if (format === 'json') {
      return {
        logs: this.logs,
        stats: this.getStats(),
        exportTime: Date.now()
      };
    }
    
    return this.logs.map(entry => formatter ? formatter(entry) : this.formatText(entry));
  }
  
  // 生成ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = EnhancedLogger;
```

### 3. 错误追踪系统

```javascript
// error-tracker.js
class ErrorTracker {
  constructor(options = {}) {
    this.options = {
      captureUnhandled: true,
      captureRejections: true,
      maxErrors: 500,
      enableSourceMap: false,
      ...options
    };

    this.errors = [];
    this.errorCounts = new Map();
    this.errorPatterns = new Map();
    this.handlers = new Set();

    if (this.options.captureUnhandled) {
      this.setupGlobalHandlers();
    }
  }

  // 设置全局错误处理器
  setupGlobalHandlers() {
    // 捕获未处理的异常
    process.on('uncaughtException', (error) => {
      this.captureError(error, {
        type: 'uncaughtException',
        fatal: true
      });
    });

    // 捕获未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.captureError(reason, {
        type: 'unhandledRejection',
        promise: promise.toString(),
        fatal: false
      });
    });
  }

  // 捕获错误
  captureError(error, context = {}) {
    const errorEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      message: error.message || String(error),
      stack: error.stack || new Error().stack,
      type: error.constructor.name,
      context,
      fingerprint: this.generateFingerprint(error),
      count: 1
    };

    // 检查是否是重复错误
    const existing = this.findSimilarError(errorEntry);
    if (existing) {
      existing.count++;
      existing.lastSeen = errorEntry.timestamp;
      this.updateErrorCount(existing.fingerprint);
      return existing;
    }

    // 添加新错误
    this.errors.push(errorEntry);
    this.updateErrorCount(errorEntry.fingerprint);

    // 限制错误数量
    if (this.errors.length > this.options.maxErrors) {
      this.errors.shift();
    }

    // 通知处理器
    this.notifyHandlers(errorEntry);

    return errorEntry;
  }

  // 生成错误指纹
  generateFingerprint(error) {
    const crypto = require('crypto');

    // 使用错误消息和堆栈的前几行生成指纹
    const stackLines = (error.stack || '').split('\n').slice(0, 3);
    const content = error.message + stackLines.join('\n');

    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  // 查找相似错误
  findSimilarError(errorEntry) {
    return this.errors.find(existing =>
      existing.fingerprint === errorEntry.fingerprint
    );
  }

  // 更新错误计数
  updateErrorCount(fingerprint) {
    const count = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, count + 1);
  }

  // 通知处理器
  notifyHandlers(errorEntry) {
    for (const handler of this.handlers) {
      try {
        handler(errorEntry);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }
  }

  // 添加错误处理器
  addHandler(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // 包装函数以捕获错误
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error, {
          ...context,
          function: fn.name,
          arguments: args.length
        });
        throw error;
      }
    };
  }

  // 包装插件方法
  wrapPlugin(plugin) {
    const originalMethods = {};
    const methodsToWrap = ['init', 'enable', 'disable', 'destroy'];

    methodsToWrap.forEach(methodName => {
      if (typeof plugin[methodName] === 'function') {
        originalMethods[methodName] = plugin[methodName];

        plugin[methodName] = this.wrap(
          originalMethods[methodName].bind(plugin),
          {
            plugin: plugin.name,
            method: methodName
          }
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

  // 获取错误统计
  getStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const recentErrors = this.errors.filter(e => now - e.timestamp < oneHour);
    const todayErrors = this.errors.filter(e => now - e.timestamp < oneDay);

    // 按类型分组
    const byType = {};
    this.errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + error.count;
    });

    // 最频繁的错误
    const topErrors = [...this.errors]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(error => ({
        fingerprint: error.fingerprint,
        message: error.message,
        count: error.count,
        type: error.type
      }));

    return {
      total: this.errors.length,
      totalOccurrences: this.errors.reduce((sum, e) => sum + e.count, 0),
      recentCount: recentErrors.length,
      todayCount: todayErrors.length,
      byType,
      topErrors,
      uniqueFingerprints: this.errorCounts.size
    };
  }

  // 搜索错误
  search(query) {
    return this.errors.filter(error => {
      if (typeof query === 'string') {
        return error.message.includes(query) ||
               error.stack.includes(query);
      }

      if (typeof query === 'object') {
        return Object.entries(query).every(([key, value]) => {
          switch (key) {
            case 'type':
              return error.type === value;
            case 'plugin':
              return error.context.plugin === value;
            case 'since':
              return error.timestamp >= value;
            case 'fingerprint':
              return error.fingerprint === value;
            default:
              return true;
          }
        });
      }

      return false;
    });
  }

  // 获取错误详情
  getErrorDetails(fingerprint) {
    const errors = this.errors.filter(e => e.fingerprint === fingerprint);
    if (errors.length === 0) return null;

    const first = errors[0];
    const last = errors[errors.length - 1];

    return {
      fingerprint,
      message: first.message,
      type: first.type,
      stack: first.stack,
      firstSeen: first.timestamp,
      lastSeen: last.timestamp,
      count: errors.reduce((sum, e) => sum + e.count, 0),
      contexts: errors.map(e => e.context)
    };
  }

  // 标记错误为已解决
  markResolved(fingerprint) {
    this.errors.forEach(error => {
      if (error.fingerprint === fingerprint) {
        error.resolved = true;
        error.resolvedAt = Date.now();
      }
    });
  }

  // 清理旧错误
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7天
    const cutoff = Date.now() - maxAge;
    const before = this.errors.length;

    this.errors = this.errors.filter(error => error.timestamp > cutoff);

    const removed = before - this.errors.length;
    console.log(`🧹 Cleaned up ${removed} old errors`);

    return removed;
  }

  // 导出错误报告
  exportReport() {
    return {
      summary: this.getStats(),
      errors: this.errors.map(error => ({
        ...error,
        stack: error.stack.split('\n').slice(0, 10) // 限制堆栈深度
      })),
      exportTime: Date.now()
    };
  }

  // 生成ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = ErrorTracker;
```

## 测试策略

### 4. 集成测试框架

```javascript
// integration-test-framework.js
class IntegrationTestFramework {
  constructor() {
    this.testSuites = new Map();
    this.fixtures = new Map();
    this.mocks = new Map();
    this.testEnvironments = new Map();
  }

  // 创建测试环境
  createEnvironment(name, setup) {
    this.testEnvironments.set(name, setup);
  }

  // 注册测试夹具
  registerFixture(name, fixture) {
    this.fixtures.set(name, fixture);
  }

  // 创建集成测试套件
  describe(suiteName, testFn) {
    const suite = new IntegrationTestSuite(suiteName, this);
    this.testSuites.set(suiteName, suite);

    testFn(suite);
    return suite;
  }

  // 运行所有集成测试
  async runAll(environment = 'default') {
    console.log(`🧪 Running integration tests in ${environment} environment...\n`);

    // 设置测试环境
    const envSetup = this.testEnvironments.get(environment);
    let envContext = {};

    if (envSetup) {
      envContext = await envSetup();
    }

    const results = [];

    for (const [suiteName, suite] of this.testSuites) {
      console.log(`Testing ${suiteName}:`);
      const suiteResult = await this.runSuite(suite, envContext);
      results.push(suiteResult);

      this.printSuiteResult(suiteResult);
      console.log('');
    }

    // 清理环境
    if (envContext.cleanup) {
      await envContext.cleanup();
    }

    this.printSummary(results);
    return results;
  }

  // 运行测试套件
  async runSuite(suite, envContext) {
    const result = {
      suiteName: suite.name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };

    const startTime = Date.now();

    // 运行套件设置
    if (suite.setupFn) {
      await suite.setupFn(envContext);
    }

    try {
      for (const test of suite.tests) {
        const testResult = await this.runIntegrationTest(test, suite, envContext);
        result.tests.push(testResult);

        if (testResult.status === 'passed') {
          result.passed++;
        } else if (testResult.status === 'failed') {
          result.failed++;
        } else {
          result.skipped++;
        }
      }
    } finally {
      // 运行套件清理
      if (suite.teardownFn) {
        await suite.teardownFn(envContext);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 运行集成测试
  async runIntegrationTest(test, suite, envContext) {
    const result = {
      name: test.name,
      status: 'passed',
      error: null,
      duration: 0,
      artifacts: []
    };

    const startTime = Date.now();

    try {
      // 创建测试上下文
      const testContext = this.createIntegrationContext(suite, envContext);

      // 运行测试前设置
      if (suite.beforeEachFn) {
        await suite.beforeEachFn(testContext);
      }

      // 运行测试
      await test.fn(testContext);

      // 收集测试产物
      result.artifacts = testContext.artifacts || [];

    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error.message,
        stack: error.stack
      };
    } finally {
      // 运行测试后清理
      if (suite.afterEachFn) {
        try {
          await suite.afterEachFn();
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 创建集成测试上下文
  createIntegrationContext(suite, envContext) {
    return {
      // 环境上下文
      ...envContext,

      // 夹具
      fixtures: this.fixtures,

      // 断言
      assert: this.createAssertAPI(),

      // 等待工具
      wait: {
        forCondition: this.waitForCondition.bind(this),
        forTime: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        forEvent: this.waitForEvent.bind(this)
      },

      // 产物收集
      artifacts: [],
      addArtifact: function(name, data) {
        this.artifacts.push({ name, data, timestamp: Date.now() });
      },

      // 模拟工具
      mock: this.createMockAPI(),

      // 插件管理器工厂
      createPluginManager: this.createTestPluginManager.bind(this)
    };
  }

  // 创建断言API
  createAssertAPI() {
    return {
      equal: (actual, expected, message) => {
        if (actual !== expected) {
          throw new Error(message || `Expected ${actual} to equal ${expected}`);
        }
      },

      deepEqual: (actual, expected, message) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(message || `Expected ${JSON.stringify(actual)} to deep equal ${JSON.stringify(expected)}`);
        }
      },

      throws: async (fn, message) => {
        let threw = false;
        try {
          await fn();
        } catch {
          threw = true;
        }

        if (!threw) {
          throw new Error(message || 'Expected function to throw');
        }
      },

      eventually: async (fn, timeout = 5000, message) => {
        const start = Date.now();

        while (Date.now() - start < timeout) {
          try {
            await fn();
            return; // 成功
          } catch (error) {
            if (Date.now() - start >= timeout) {
              throw new Error(message || `Condition not met within ${timeout}ms: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    };
  }

  // 等待条件
  async waitForCondition(condition, timeout = 5000, interval = 100) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  // 等待事件
  async waitForEvent(emitter, event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${event} not emitted within ${timeout}ms`));
      }, timeout);

      emitter.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  // 创建模拟API
  createMockAPI() {
    return {
      service: (name, implementation) => {
        this.mocks.set(name, implementation);
      },

      plugin: (name, methods = {}) => {
        return {
          name,
          version: '1.0.0-test',
          ...methods
        };
      },

      clear: () => {
        this.mocks.clear();
      }
    };
  }

  // 创建测试插件管理器
  createTestPluginManager(options = {}) {
    const OptimizedPluginManager = require('../chapter-08/optimized-plugin-manager');

    return new OptimizedPluginManager({
      ...options,
      // 测试环境配置
      cache: { maxSize: 10, ttl: 60000 },
      memory: { threshold: 0.9, interval: 60000 }
    });
  }

  // 打印套件结果
  printSuiteResult(result) {
    result.tests.forEach(test => {
      const status = test.status === 'passed' ? '✅' : '❌';
      const duration = `(${test.duration}ms)`;

      console.log(`  ${status} ${test.name} ${duration}`);

      if (test.error) {
        console.log(`     Error: ${test.error.message}`);
      }

      if (test.artifacts.length > 0) {
        console.log(`     Artifacts: ${test.artifacts.length}`);
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

    console.log('📊 Integration Test Summary:');
    console.log(`   Total: ${totalPassed + totalFailed + totalSkipped} tests`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Duration: ${totalDuration}ms`);

    if (totalFailed > 0) {
      console.log('\n❌ Some integration tests failed!');
    } else {
      console.log('\n✅ All integration tests passed!');
    }
  }
}

class IntegrationTestSuite {
  constructor(name, framework) {
    this.name = name;
    this.framework = framework;
    this.tests = [];
    this.setupFn = null;
    this.teardownFn = null;
    this.beforeEachFn = null;
    this.afterEachFn = null;
  }

  // 添加测试
  it(name, testFn) {
    this.tests.push({ name, fn: testFn });
  }

  // 设置套件
  setup(fn) {
    this.setupFn = fn;
  }

  // 清理套件
  teardown(fn) {
    this.teardownFn = fn;
  }

  // 每个测试前执行
  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  // 每个测试后执行
  afterEach(fn) {
    this.afterEachFn = fn;
  }
}

module.exports = IntegrationTestFramework;
```

## 实际应用示例

让我们创建一个完整的调试和测试示例：

### 调试示例

```javascript
// debug-example.js
const OptimizedPluginManager = require('../chapter-08/optimized-plugin-manager');
const PluginDebugger = require('./plugin-debugger');
const EnhancedLogger = require('./enhanced-logger');
const ErrorTracker = require('./error-tracker');

// 创建一个有问题的插件用于调试
class BuggyPlugin {
  constructor() {
    this.name = 'buggy';
    this.version = '1.0.0';
    this.counter = 0;
  }

  async init(context) {
    this.context = context;

    // 故意引入一个bug
    if (Math.random() < 0.3) {
      throw new Error('Random initialization error');
    }

    // 注册一个有问题的服务
    context.services.register('buggyService', () => ({
      doSomething: () => this.doSomething(),
      getCounter: () => this.counter
    }));

    context.log('Buggy plugin initialized');
  }

  doSomething() {
    this.counter++;

    // 另一个随机bug
    if (this.counter > 5 && Math.random() < 0.5) {
      throw new Error(`Counter overflow at ${this.counter}`);
    }

    return `Did something ${this.counter} times`;
  }

  async enable() {
    // 模拟异步操作中的错误
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.counter > 3) {
      throw new Error('Cannot enable when counter > 3');
    }

    this.context.log('Buggy plugin enabled');
  }
}

async function runDebugExample() {
  console.log('🐛 Running debug example...\n');

  // 创建增强的日志器
  const logger = new EnhancedLogger({
    level: 'debug',
    format: 'structured',
    includeContext: true,
    includeStack: false
  });

  // 创建错误追踪器
  const errorTracker = new ErrorTracker({
    captureUnhandled: true,
    captureRejections: true
  });

  // 创建插件管理器
  const pluginManager = new OptimizedPluginManager();

  // 创建调试器
  const debugger = new PluginDebugger(pluginManager, {
    logLevel: 'debug',
    enableTracing: true,
    enableBreakpoints: true
  });

  try {
    // 启用调试
    debugger.enable();

    // 设置错误处理器
    errorTracker.addHandler((error) => {
      logger.error('Captured error', {
        fingerprint: error.fingerprint,
        type: error.type,
        context: error.context
      });
    });

    // 设置断点
    debugger.setBreakpoint('hook:beforeInit');
    debugger.setBreakpoint('plugin:buggy:init');

    // 观察变量
    debugger.watchVariable('pluginCount', () => pluginManager.plugins.size);

    console.log('🔧 Setting up plugins with debugging...');

    // 注册多个插件，包括有问题的插件
    const plugins = [
      new BuggyPlugin(),
      new BuggyPlugin(), // 第二个实例
    ];

    for (const plugin of plugins) {
      try {
        // 包装插件以捕获错误
        errorTracker.wrapPlugin(plugin);

        await pluginManager.register(plugin);
        logger.info('Plugin registered', { plugin: plugin.name });

      } catch (error) {
        logger.error('Plugin registration failed', {
          plugin: plugin.name,
          error: error.message
        });
      }
    }

    console.log('\n🚀 Initializing plugins...');

    // 尝试初始化插件
    for (const pluginName of pluginManager.plugins.keys()) {
      try {
        await pluginManager.initPlugin(pluginName);
        logger.info('Plugin initialized', { plugin: pluginName });
      } catch (error) {
        logger.error('Plugin initialization failed', {
          plugin: pluginName,
          error: error.message
        });
      }
    }

    console.log('\n⚡ Enabling plugins...');

    // 尝试启用插件
    for (const pluginName of pluginManager.plugins.keys()) {
      try {
        await pluginManager.enablePlugin(pluginName);
        logger.info('Plugin enabled', { plugin: pluginName });
      } catch (error) {
        logger.error('Plugin enable failed', {
          plugin: pluginName,
          error: error.message
        });
      }
    }

    console.log('\n🧪 Testing plugin functionality...');

    // 测试插件功能
    for (let i = 0; i < 10; i++) {
      try {
        const service = pluginManager.context.communication.serviceRegistry.get('buggy.buggyService');
        if (service) {
          const result = service.doSomething();
          logger.debug('Service call result', { result, iteration: i });
        }
      } catch (error) {
        logger.warn('Service call failed', {
          iteration: i,
          error: error.message
        });
      }

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Debug Information:');
    console.log('='.repeat(50));

    // 显示调试信息
    const debugInfo = debugger.getDebugInfo();
    console.log('Debugger status:', debugInfo);

    // 显示错误统计
    const errorStats = errorTracker.getStats();
    console.log('\nError statistics:', errorStats);

    // 显示日志统计
    const logStats = logger.getStats();
    console.log('\nLog statistics:', logStats);

    // 导出跟踪信息
    console.log('\n📋 Trace Export:');
    const traceExport = debugger.exportTrace({
      type: 'hook-call',
      since: Date.now() - 60000 // 最近1分钟
    });

    console.log(`Exported ${traceExport.filteredCount} traces out of ${traceExport.totalCount}`);

    // 搜索特定错误
    console.log('\n🔍 Error Search:');
    const buggyErrors = errorTracker.search({ plugin: 'buggy' });
    console.log(`Found ${buggyErrors.length} errors from buggy plugin`);

    buggyErrors.forEach(error => {
      console.log(`  - ${error.message} (${error.count} times)`);
    });

  } catch (error) {
    console.error('❌ Debug example error:', error);
  } finally {
    // 清理
    debugger.disable();
    await pluginManager.cleanup();
  }
}

// 运行调试示例
if (require.main === module) {
  runDebugExample().catch(console.error);
}

module.exports = { runDebugExample };
```

### 集成测试示例

```javascript
// integration-test-example.js
const IntegrationTestFramework = require('./integration-test-framework');
const OptimizedPluginManager = require('../chapter-08/optimized-plugin-manager');

// 测试插件
class TestPlugin {
  constructor(name, options = {}) {
    this.name = name;
    this.version = '1.0.0';
    this.options = options;
    this.initialized = false;
    this.enabled = false;
  }

  async init(context) {
    if (this.options.initDelay) {
      await new Promise(resolve => setTimeout(resolve, this.options.initDelay));
    }

    if (this.options.shouldFailInit) {
      throw new Error(`Init failed for ${this.name}`);
    }

    this.context = context;
    this.initialized = true;

    // 注册服务
    context.services.register('testService', () => ({
      getName: () => this.name,
      getStatus: () => ({ initialized: this.initialized, enabled: this.enabled })
    }));
  }

  async enable() {
    if (!this.initialized) {
      throw new Error('Plugin not initialized');
    }

    if (this.options.shouldFailEnable) {
      throw new Error(`Enable failed for ${this.name}`);
    }

    this.enabled = true;
  }

  async disable() {
    this.enabled = false;
  }
}

async function runIntegrationTests() {
  const framework = new IntegrationTestFramework();

  // 创建测试环境
  framework.createEnvironment('default', async () => {
    const pluginManager = new OptimizedPluginManager({
      cache: { maxSize: 10, ttl: 60000 },
      memory: { threshold: 0.9, interval: 60000 }
    });

    return {
      pluginManager,
      cleanup: async () => {
        await pluginManager.cleanup();
      }
    };
  });

  // 注册测试夹具
  framework.registerFixture('basicPlugin', () => new TestPlugin('basic'));
  framework.registerFixture('slowPlugin', () => new TestPlugin('slow', { initDelay: 500 }));
  framework.registerFixture('faultyPlugin', () => new TestPlugin('faulty', { shouldFailInit: true }));

  // 插件注册测试
  framework.describe('Plugin Registration', (suite) => {
    suite.it('should register a basic plugin', async (context) => {
      const plugin = context.fixtures.get('basicPlugin')();
      await context.pluginManager.register(plugin);

      const registered = context.pluginManager.getPlugin('basic');
      context.assert.equal(registered.name, 'basic');
    });

    suite.it('should handle duplicate registration', async (context) => {
      const plugin1 = context.fixtures.get('basicPlugin')();
      const plugin2 = context.fixtures.get('basicPlugin')();

      await context.pluginManager.register(plugin1);

      await context.assert.throws(async () => {
        await context.pluginManager.register(plugin2);
      }, 'Should throw on duplicate registration');
    });

    suite.it('should register multiple plugins', async (context) => {
      const plugins = [
        context.fixtures.get('basicPlugin')(),
        new TestPlugin('another')
      ];

      for (const plugin of plugins) {
        await context.pluginManager.register(plugin);
      }

      context.assert.equal(context.pluginManager.plugins.size, 2);
    });
  });

  // 插件生命周期测试
  framework.describe('Plugin Lifecycle', (suite) => {
    let pluginManager;

    suite.setup(async (context) => {
      pluginManager = context.pluginManager;
    });

    suite.beforeEach(async (context) => {
      // 为每个测试准备新的插件
      const plugin = context.fixtures.get('basicPlugin')();
      await pluginManager.register(plugin);
      context.testPlugin = plugin;
    });

    suite.it('should initialize plugin', async (context) => {
      await pluginManager.initPlugin('basic');

      const plugin = pluginManager.getPlugin('basic');
      context.assert.equal(plugin.initialized, true);
    });

    suite.it('should enable initialized plugin', async (context) => {
      await pluginManager.initPlugin('basic');
      await pluginManager.enablePlugin('basic');

      const plugin = pluginManager.getPlugin('basic');
      context.assert.equal(plugin.enabled, true);
    });

    suite.it('should handle initialization failure', async (context) => {
      const faultyPlugin = context.fixtures.get('faultyPlugin')();
      await pluginManager.register(faultyPlugin);

      await context.assert.throws(async () => {
        await pluginManager.initPlugin('faulty');
      }, 'Should throw on init failure');
    });

    suite.it('should handle slow initialization', async (context) => {
      const slowPlugin = context.fixtures.get('slowPlugin')();
      await pluginManager.register(slowPlugin);

      const startTime = Date.now();
      await pluginManager.initPlugin('slow');
      const duration = Date.now() - startTime;

      context.assert.equal(duration >= 500, true, 'Should take at least 500ms');

      const plugin = pluginManager.getPlugin('slow');
      context.assert.equal(plugin.initialized, true);
    });
  });

  // 插件通信测试
  framework.describe('Plugin Communication', (suite) => {
    suite.setup(async (context) => {
      // 注册两个插件用于通信测试
      const plugin1 = new TestPlugin('sender');
      const plugin2 = new TestPlugin('receiver');

      await context.pluginManager.register(plugin1);
      await context.pluginManager.register(plugin2);

      await context.pluginManager.initAll();
      await context.pluginManager.enableAll();
    });

    suite.it('should allow service communication', async (context) => {
      const senderService = context.pluginManager.context.communication.serviceRegistry.get('sender.testService');
      const receiverService = context.pluginManager.context.communication.serviceRegistry.get('receiver.testService');

      context.assert.equal(senderService.getName(), 'sender');
      context.assert.equal(receiverService.getName(), 'receiver');
    });

    suite.it('should support event communication', async (context) => {
      let receivedEvent = null;

      // 设置事件监听
      context.pluginManager.on('test-event', (data) => {
        receivedEvent = data;
      });

      // 发送事件
      context.pluginManager.emit('test-event', { message: 'Hello from test' });

      // 等待事件处理
      await context.wait.forCondition(() => receivedEvent !== null, 1000);

      context.assert.equal(receivedEvent.message, 'Hello from test');
    });

    suite.it('should handle plugin dependencies', async (context) => {
      // 这个测试需要更复杂的依赖插件设置
      // 为了简化，我们只测试基本的依赖检查

      const plugin = context.pluginManager.getPlugin('sender');
      context.assert.equal(plugin !== null, true, 'Sender plugin should exist');

      const receiverPlugin = context.pluginManager.getPlugin('receiver');
      context.assert.equal(receiverPlugin !== null, true, 'Receiver plugin should exist');
    });
  });

  // 性能测试
  framework.describe('Performance Tests', (suite) => {
    suite.it('should handle bulk plugin registration', async (context) => {
      const pluginCount = 50;
      const plugins = [];

      // 创建大量插件
      for (let i = 0; i < pluginCount; i++) {
        plugins.push(new TestPlugin(`bulk-${i}`));
      }

      const startTime = Date.now();

      // 批量注册
      for (const plugin of plugins) {
        await context.pluginManager.register(plugin);
      }

      const registrationTime = Date.now() - startTime;

      // 批量初始化
      const initStartTime = Date.now();
      await context.pluginManager.initAll();
      const initTime = Date.now() - initStartTime;

      // 批量启用
      const enableStartTime = Date.now();
      await context.pluginManager.enableAll();
      const enableTime = Date.now() - enableStartTime;

      context.addArtifact('performance-metrics', {
        pluginCount,
        registrationTime,
        initTime,
        enableTime,
        avgRegistrationTime: registrationTime / pluginCount,
        avgInitTime: initTime / pluginCount,
        avgEnableTime: enableTime / pluginCount
      });

      // 验证所有插件都已注册
      context.assert.equal(context.pluginManager.plugins.size, pluginCount);

      // 性能断言（这些值可能需要根据实际环境调整）
      context.assert.equal(registrationTime < 5000, true, 'Registration should complete within 5 seconds');
      context.assert.equal(initTime < 10000, true, 'Initialization should complete within 10 seconds');
    });

    suite.it('should handle concurrent operations', async (context) => {
      const concurrentCount = 10;
      const plugins = [];

      for (let i = 0; i < concurrentCount; i++) {
        plugins.push(new TestPlugin(`concurrent-${i}`));
      }

      // 并发注册
      const registrationPromises = plugins.map(plugin =>
        context.pluginManager.register(plugin)
      );

      await Promise.all(registrationPromises);

      // 验证所有插件都已注册
      context.assert.equal(context.pluginManager.plugins.size, concurrentCount);

      // 并发初始化
      const initPromises = plugins.map(plugin =>
        context.pluginManager.initPlugin(plugin.name)
      );

      await Promise.all(initPromises);

      // 验证所有插件都已初始化
      plugins.forEach(plugin => {
        context.assert.equal(plugin.initialized, true);
      });
    });
  });

  // 运行所有测试
  return await framework.runAll('default');
}

// 运行集成测试
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

module.exports = { runIntegrationTests };
```

### 综合示例

```javascript
// comprehensive-test-example.js
const { runDebugExample } = require('./debug-example');
const { runIntegrationTests } = require('./integration-test-example');

async function runComprehensiveTests() {
  console.log('🧪 Running comprehensive plugin system tests...\n');

  try {
    // 运行调试示例
    console.log('='.repeat(60));
    console.log('🐛 DEBUG EXAMPLE');
    console.log('='.repeat(60));

    await runDebugExample();

    console.log('\n' + '='.repeat(60));
    console.log('🧪 INTEGRATION TESTS');
    console.log('='.repeat(60));

    // 运行集成测试
    const testResults = await runIntegrationTests();

    // 分析测试结果
    const totalTests = testResults.reduce((sum, suite) =>
      sum + suite.passed + suite.failed + suite.skipped, 0);
    const totalPassed = testResults.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = testResults.reduce((sum, suite) => sum + suite.failed, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(60));

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! Plugin system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the results above.');
    }

  } catch (error) {
    console.error('❌ Comprehensive test error:', error);
    process.exit(1);
  }
}

// 运行综合测试
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests };
```

## 小结

在这一章中，我们深入探讨了插件系统的调试和测试策略：

### 调试工具和技术
1. **插件调试器**：提供断点、变量观察、调用跟踪等功能
2. **增强日志系统**：支持多种格式、过滤、搜索和统计
3. **错误追踪系统**：自动捕获、分类和分析错误

### 测试策略
1. **单元测试**：测试单个插件的功能
2. **集成测试**：测试插件间的交互和系统整体功能
3. **性能测试**：验证系统在负载下的表现
4. **错误处理测试**：确保系统能优雅处理异常情况

### 关键收获
- **全面的调试支持**：帮助开发者快速定位和解决问题
- **自动化测试**：确保系统的稳定性和可靠性
- **性能监控**：及时发现性能瓶颈
- **错误追踪**：系统化地管理和解决错误

这些调试和测试工具为插件系统提供了强大的质量保证，确保系统在各种情况下都能稳定运行。

在下一章中，我们将总结整个插件系统教程，并展望未来的发展方向。

## 练习题

1. 实现一个可视化的插件调试界面
2. 创建一个自动化的性能回归测试套件
3. 设计一个插件兼容性测试框架

---

**下一章预告**：我们将总结整个教程，回顾关键概念，并探讨插件系统的未来发展趋势。
