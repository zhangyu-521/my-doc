# 第六章：高级特性实现

在前面的章节中，我们已经构建了一个功能完整的插件系统。现在我们要添加一些高级特性，让插件系统更加强大和实用，包括配置管理、条件加载、插件市场、热重载等企业级功能。

## 配置管理系统

### 1. 配置管理器

```javascript
// config-manager.js
const path = require('path');
const fs = require('fs').promises;

class ConfigManager {
  constructor(options = {}) {
    this.configDir = options.configDir || './config';
    this.defaultConfig = options.defaultConfig || {};
    this.configs = new Map();
    this.watchers = new Map();
    this.validators = new Map();
    this.transformers = new Map();
  }
  
  // 加载配置文件
  async loadConfig(name, filePath) {
    try {
      const fullPath = path.resolve(this.configDir, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      let config;
      if (filePath.endsWith('.json')) {
        config = JSON.parse(content);
      } else if (filePath.endsWith('.js')) {
        // 动态导入 JS 配置文件
        delete require.cache[require.resolve(fullPath)];
        config = require(fullPath);
      } else {
        throw new Error(`Unsupported config file format: ${filePath}`);
      }
      
      // 应用转换器
      if (this.transformers.has(name)) {
        config = this.transformers.get(name)(config);
      }
      
      // 验证配置
      if (this.validators.has(name)) {
        const isValid = this.validators.get(name)(config);
        if (!isValid) {
          throw new Error(`Invalid configuration for ${name}`);
        }
      }
      
      this.configs.set(name, config);
      
      // 通知配置变化
      this.notifyWatchers(name, config);
      
      return config;
    } catch (error) {
      throw new Error(`Failed to load config ${name}: ${error.message}`);
    }
  }
  
  // 保存配置文件
  async saveConfig(name, filePath, config) {
    try {
      const fullPath = path.resolve(this.configDir, filePath);
      
      // 确保目录存在
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      let content;
      if (filePath.endsWith('.json')) {
        content = JSON.stringify(config, null, 2);
      } else if (filePath.endsWith('.js')) {
        content = `module.exports = ${JSON.stringify(config, null, 2)};`;
      } else {
        throw new Error(`Unsupported config file format: ${filePath}`);
      }
      
      await fs.writeFile(fullPath, content, 'utf8');
      
      this.configs.set(name, config);
      this.notifyWatchers(name, config);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to save config ${name}: ${error.message}`);
    }
  }
  
  // 获取配置
  getConfig(name, key = null) {
    const config = this.configs.get(name);
    if (!config) {
      return this.defaultConfig[name] || null;
    }
    
    if (key === null) {
      return config;
    }
    
    // 支持点号路径，如 'database.host'
    return this.getNestedValue(config, key);
  }
  
  // 设置配置
  setConfig(name, key, value) {
    let config = this.configs.get(name) || {};
    
    if (typeof key === 'object') {
      // 如果 key 是对象，则替换整个配置
      config = key;
    } else {
      // 支持点号路径设置
      config = this.setNestedValue(config, key, value);
    }
    
    // 验证配置
    if (this.validators.has(name)) {
      const isValid = this.validators.get(name)(config);
      if (!isValid) {
        throw new Error(`Invalid configuration for ${name}`);
      }
    }
    
    this.configs.set(name, config);
    this.notifyWatchers(name, config);
    
    return config;
  }
  
  // 合并配置
  mergeConfig(name, updates) {
    const existing = this.configs.get(name) || {};
    const merged = this.deepMerge(existing, updates);
    
    return this.setConfig(name, merged);
  }
  
  // 监听配置变化
  watchConfig(name, callback) {
    if (!this.watchers.has(name)) {
      this.watchers.set(name, []);
    }
    
    const watcherId = this.generateId();
    this.watchers.get(name).push({ id: watcherId, callback });
    
    // 返回取消监听的函数
    return () => this.unwatchConfig(name, watcherId);
  }
  
  // 取消监听
  unwatchConfig(name, watcherId) {
    const watchers = this.watchers.get(name);
    if (!watchers) return false;
    
    const index = watchers.findIndex(w => w.id === watcherId);
    if (index > -1) {
      watchers.splice(index, 1);
      if (watchers.length === 0) {
        this.watchers.delete(name);
      }
      return true;
    }
    
    return false;
  }
  
  // 注册配置验证器
  registerValidator(name, validator) {
    this.validators.set(name, validator);
  }
  
  // 注册配置转换器
  registerTransformer(name, transformer) {
    this.transformers.set(name, transformer);
  }
  
  // 通知观察者
  notifyWatchers(name, config) {
    const watchers = this.watchers.get(name);
    if (!watchers) return;
    
    watchers.forEach(watcher => {
      try {
        watcher.callback(config, name);
      } catch (error) {
        console.error(`Error in config watcher for ${name}:`, error);
      }
    });
  }
  
  // 获取嵌套值
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  
  // 设置嵌套值
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
    return obj;
  }
  
  // 深度合并对象
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  // 生成唯一ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  // 获取所有配置名称
  getConfigNames() {
    return Array.from(this.configs.keys());
  }
  
  // 清空所有配置
  clear() {
    this.configs.clear();
    this.watchers.clear();
  }
}

module.exports = ConfigManager;
```

### 2. 条件加载系统

```javascript
// conditional-loader.js
class ConditionalLoader {
  constructor() {
    this.conditions = new Map();
    this.evaluators = new Map();
    this.context = {};
  }
  
  // 注册条件评估器
  registerEvaluator(name, evaluator) {
    this.evaluators.set(name, evaluator);
  }
  
  // 设置上下文
  setContext(context) {
    this.context = { ...this.context, ...context };
  }
  
  // 注册插件加载条件
  registerCondition(pluginName, condition) {
    this.conditions.set(pluginName, condition);
  }
  
  // 评估是否应该加载插件
  shouldLoadPlugin(pluginName) {
    const condition = this.conditions.get(pluginName);
    if (!condition) {
      return true; // 没有条件则默认加载
    }
    
    return this.evaluateCondition(condition);
  }
  
  // 评估条件
  evaluateCondition(condition) {
    if (typeof condition === 'boolean') {
      return condition;
    }
    
    if (typeof condition === 'function') {
      return condition(this.context);
    }
    
    if (typeof condition === 'object') {
      return this.evaluateComplexCondition(condition);
    }
    
    return true;
  }
  
  // 评估复杂条件
  evaluateComplexCondition(condition) {
    const { type, ...params } = condition;
    
    switch (type) {
      case 'and':
        return params.conditions.every(c => this.evaluateCondition(c));
        
      case 'or':
        return params.conditions.some(c => this.evaluateCondition(c));
        
      case 'not':
        return !this.evaluateCondition(params.condition);
        
      case 'env':
        return this.evaluateEnvironmentCondition(params);
        
      case 'config':
        return this.evaluateConfigCondition(params);
        
      case 'feature':
        return this.evaluateFeatureCondition(params);
        
      case 'custom':
        return this.evaluateCustomCondition(params);
        
      default:
        console.warn(`Unknown condition type: ${type}`);
        return true;
    }
  }
  
  // 评估环境条件
  evaluateEnvironmentCondition(params) {
    const { variable, value, operator = 'equals' } = params;
    const envValue = process.env[variable];
    
    switch (operator) {
      case 'equals':
        return envValue === value;
      case 'not_equals':
        return envValue !== value;
      case 'contains':
        return envValue && envValue.includes(value);
      case 'exists':
        return envValue !== undefined;
      case 'not_exists':
        return envValue === undefined;
      default:
        return false;
    }
  }
  
  // 评估配置条件
  evaluateConfigCondition(params) {
    const { key, value, operator = 'equals' } = params;
    const configValue = this.getContextValue(key);
    
    switch (operator) {
      case 'equals':
        return configValue === value;
      case 'not_equals':
        return configValue !== value;
      case 'greater_than':
        return configValue > value;
      case 'less_than':
        return configValue < value;
      case 'contains':
        return Array.isArray(configValue) && configValue.includes(value);
      default:
        return false;
    }
  }
  
  // 评估特性条件
  evaluateFeatureCondition(params) {
    const { feature, enabled = true } = params;
    const features = this.context.features || {};
    return Boolean(features[feature]) === enabled;
  }
  
  // 评估自定义条件
  evaluateCustomCondition(params) {
    const { evaluator, ...args } = params;
    const evaluatorFn = this.evaluators.get(evaluator);
    
    if (!evaluatorFn) {
      console.warn(`Custom evaluator not found: ${evaluator}`);
      return true;
    }
    
    return evaluatorFn(args, this.context);
  }
  
  // 获取上下文值
  getContextValue(key) {
    return key.split('.').reduce((obj, k) => obj && obj[k], this.context);
  }
  
  // 获取所有条件
  getAllConditions() {
    return Object.fromEntries(this.conditions);
  }
  
  // 清空条件
  clear() {
    this.conditions.clear();
  }
}

module.exports = ConditionalLoader;
```

### 3. 插件市场系统

```javascript
// plugin-marketplace.js
const EventEmitter = require('events');

class PluginMarketplace extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registries = new Map();
    this.cache = new Map();
    this.downloadDir = options.downloadDir || './plugins';
    this.cacheTimeout = options.cacheTimeout || 3600000; // 1小时
  }
  
  // 注册插件仓库
  registerRegistry(name, registry) {
    this.registries.set(name, {
      ...registry,
      name,
      lastSync: 0
    });
  }
  
  // 搜索插件
  async searchPlugins(query, options = {}) {
    const { registry = null, category = null, limit = 50 } = options;
    
    let results = [];
    const registriesToSearch = registry ? [registry] : Array.from(this.registries.keys());
    
    for (const registryName of registriesToSearch) {
      try {
        const registryResults = await this.searchInRegistry(registryName, query, { category, limit });
        results = results.concat(registryResults.map(r => ({ ...r, registry: registryName })));
      } catch (error) {
        console.error(`Error searching in registry ${registryName}:`, error);
      }
    }
    
    // 去重和排序
    const uniqueResults = this.deduplicateResults(results);
    return this.sortResults(uniqueResults, query);
  }
  
  // 在特定仓库中搜索
  async searchInRegistry(registryName, query, options = {}) {
    const registry = this.registries.get(registryName);
    if (!registry) {
      throw new Error(`Registry ${registryName} not found`);
    }
    
    // 检查缓存
    const cacheKey = `search:${registryName}:${query}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // 调用仓库的搜索API
    let results;
    if (registry.searchFunction) {
      results = await registry.searchFunction(query, options);
    } else if (registry.apiUrl) {
      results = await this.searchViaAPI(registry, query, options);
    } else {
      throw new Error(`Registry ${registryName} has no search method`);
    }
    
    // 缓存结果
    this.cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });
    
    return results;
  }
  
  // 通过API搜索
  async searchViaAPI(registry, query, options) {
    const url = new URL(registry.apiUrl + '/search');
    url.searchParams.set('q', query);
    
    if (options.category) {
      url.searchParams.set('category', options.category);
    }
    
    if (options.limit) {
      url.searchParams.set('limit', options.limit.toString());
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.plugins || [];
  }
  
  // 获取插件详细信息
  async getPluginInfo(pluginId, registry = null) {
    if (registry) {
      return await this.getPluginInfoFromRegistry(pluginId, registry);
    }
    
    // 在所有仓库中查找
    for (const registryName of this.registries.keys()) {
      try {
        const info = await this.getPluginInfoFromRegistry(pluginId, registryName);
        if (info) {
          return { ...info, registry: registryName };
        }
      } catch (error) {
        // 继续在其他仓库中查找
      }
    }
    
    throw new Error(`Plugin ${pluginId} not found in any registry`);
  }
  
  // 从特定仓库获取插件信息
  async getPluginInfoFromRegistry(pluginId, registryName) {
    const registry = this.registries.get(registryName);
    if (!registry) {
      throw new Error(`Registry ${registryName} not found`);
    }
    
    // 检查缓存
    const cacheKey = `info:${registryName}:${pluginId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    let info;
    if (registry.getInfoFunction) {
      info = await registry.getInfoFunction(pluginId);
    } else if (registry.apiUrl) {
      const response = await fetch(`${registry.apiUrl}/plugins/${pluginId}`);
      if (!response.ok) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
      info = await response.json();
    } else {
      throw new Error(`Registry ${registryName} has no info method`);
    }
    
    // 缓存结果
    this.cache.set(cacheKey, {
      data: info,
      timestamp: Date.now()
    });
    
    return info;
  }
  
  // 下载插件
  async downloadPlugin(pluginId, version = 'latest', registry = null) {
    const pluginInfo = await this.getPluginInfo(pluginId, registry);
    const targetRegistry = registry || pluginInfo.registry;
    
    this.emit('download:start', { pluginId, version, registry: targetRegistry });
    
    try {
      const downloadUrl = await this.getDownloadUrl(pluginId, version, targetRegistry);
      const filePath = await this.downloadFile(downloadUrl, pluginId, version);
      
      this.emit('download:complete', { pluginId, version, filePath });
      
      return {
        pluginId,
        version,
        filePath,
        info: pluginInfo
      };
    } catch (error) {
      this.emit('download:error', { pluginId, version, error });
      throw error;
    }
  }
  
  // 获取下载URL
  async getDownloadUrl(pluginId, version, registryName) {
    const registry = this.registries.get(registryName);
    
    if (registry.getDownloadUrlFunction) {
      return await registry.getDownloadUrlFunction(pluginId, version);
    } else if (registry.apiUrl) {
      const response = await fetch(`${registry.apiUrl}/plugins/${pluginId}/download?version=${version}`);
      const data = await response.json();
      return data.downloadUrl;
    } else {
      throw new Error(`Registry ${registryName} has no download method`);
    }
  }
  
  // 下载文件
  async downloadFile(url, pluginId, version) {
    // 这里应该实现实际的文件下载逻辑
    // 为了示例，我们只是模拟下载过程
    
    const fileName = `${pluginId}-${version}.zip`;
    const filePath = path.join(this.downloadDir, fileName);
    
    // 模拟下载进度
    for (let i = 0; i <= 100; i += 10) {
      this.emit('download:progress', { pluginId, version, progress: i });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return filePath;
  }
  
  // 去重结果
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = `${result.id}:${result.version}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  // 排序结果
  sortResults(results, query) {
    return results.sort((a, b) => {
      // 按相关性排序（简单的字符串匹配）
      const aRelevance = this.calculateRelevance(a, query);
      const bRelevance = this.calculateRelevance(b, query);
      
      if (aRelevance !== bRelevance) {
        return bRelevance - aRelevance;
      }
      
      // 按下载量排序
      return (b.downloads || 0) - (a.downloads || 0);
    });
  }
  
  // 计算相关性
  calculateRelevance(plugin, query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    if (plugin.name && plugin.name.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    if (plugin.description && plugin.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    if (plugin.keywords && plugin.keywords.some(k => k.toLowerCase().includes(queryLower))) {
      score += 3;
    }
    
    return score;
  }
  
  // 清空缓存
  clearCache() {
    this.cache.clear();
  }
  
  // 获取统计信息
  getStats() {
    return {
      registries: this.registries.size,
      cacheSize: this.cache.size,
      registryList: Array.from(this.registries.keys())
    };
  }
}

module.exports = PluginMarketplace;
```

### 4. 热重载系统

```javascript
// hot-reload-manager.js
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class HotReloadManager extends EventEmitter {
  constructor(pluginManager, options = {}) {
    super();
    this.pluginManager = pluginManager;
    this.watchedFiles = new Map();
    this.watchers = new Map();
    this.reloadQueue = [];
    this.isReloading = false;
    this.options = {
      watchDelay: 1000,
      maxRetries: 3,
      ...options
    };
  }

  // 启用热重载
  enable() {
    this.emit('hot-reload:enabled');
  }

  // 禁用热重载
  disable() {
    this.stopWatching();
    this.emit('hot-reload:disabled');
  }

  // 监听插件文件变化
  watchPlugin(pluginName, filePaths) {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }

    filePaths.forEach(filePath => {
      const absolutePath = path.resolve(filePath);

      // 检查文件是否存在
      if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found for watching: ${absolutePath}`);
        return;
      }

      // 如果已经在监听，先停止
      if (this.watchers.has(absolutePath)) {
        this.watchers.get(absolutePath).close();
      }

      // 创建文件监听器
      const watcher = fs.watch(absolutePath, { persistent: false }, (eventType) => {
        if (eventType === 'change') {
          this.scheduleReload(pluginName, absolutePath);
        }
      });

      this.watchers.set(absolutePath, watcher);
      this.watchedFiles.set(absolutePath, pluginName);

      this.emit('file:watched', { pluginName, filePath: absolutePath });
    });
  }

  // 停止监听插件
  unwatchPlugin(pluginName) {
    const filesToUnwatch = [];

    for (const [filePath, watchedPluginName] of this.watchedFiles) {
      if (watchedPluginName === pluginName) {
        filesToUnwatch.push(filePath);
      }
    }

    filesToUnwatch.forEach(filePath => {
      const watcher = this.watchers.get(filePath);
      if (watcher) {
        watcher.close();
        this.watchers.delete(filePath);
      }
      this.watchedFiles.delete(filePath);
    });

    this.emit('plugin:unwatched', { pluginName });
  }

  // 停止所有监听
  stopWatching() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }

    this.watchers.clear();
    this.watchedFiles.clear();
  }

  // 安排重载
  scheduleReload(pluginName, filePath) {
    // 防抖处理
    const existingIndex = this.reloadQueue.findIndex(item => item.pluginName === pluginName);
    if (existingIndex > -1) {
      clearTimeout(this.reloadQueue[existingIndex].timeoutId);
      this.reloadQueue.splice(existingIndex, 1);
    }

    const timeoutId = setTimeout(() => {
      this.executeReload(pluginName, filePath);
    }, this.options.watchDelay);

    this.reloadQueue.push({
      pluginName,
      filePath,
      timeoutId,
      timestamp: Date.now()
    });

    this.emit('reload:scheduled', { pluginName, filePath });
  }

  // 执行重载
  async executeReload(pluginName, filePath) {
    if (this.isReloading) {
      // 如果正在重载，延迟执行
      setTimeout(() => this.executeReload(pluginName, filePath), 100);
      return;
    }

    this.isReloading = true;

    try {
      this.emit('reload:start', { pluginName, filePath });

      const plugin = this.pluginManager.getPlugin(pluginName);
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} not found`);
      }

      // 保存插件状态
      const wasEnabled = plugin.state === 'enabled';
      const pluginConfig = this.pluginManager.getPluginConfig?.(pluginName);

      // 禁用插件
      if (wasEnabled) {
        await this.pluginManager.disablePlugin(pluginName);
      }

      // 清除模块缓存
      this.clearModuleCache(filePath);

      // 重新加载插件
      const newPluginClass = this.loadPluginClass(filePath);
      const newPlugin = new newPluginClass();

      // 替换插件实例
      await this.replacePlugin(pluginName, newPlugin, pluginConfig);

      // 如果之前是启用状态，重新启用
      if (wasEnabled) {
        await this.pluginManager.enablePlugin(pluginName);
      }

      this.emit('reload:success', { pluginName, filePath });

    } catch (error) {
      this.emit('reload:error', { pluginName, filePath, error });
      console.error(`Hot reload failed for plugin ${pluginName}:`, error);

      // 尝试恢复
      await this.attemptRecovery(pluginName);
    } finally {
      this.isReloading = false;
    }
  }

  // 清除模块缓存
  clearModuleCache(filePath) {
    const absolutePath = path.resolve(filePath);

    // 删除主模块缓存
    delete require.cache[absolutePath];

    // 删除相关依赖的缓存
    const moduleDir = path.dirname(absolutePath);
    Object.keys(require.cache).forEach(cachedPath => {
      if (cachedPath.startsWith(moduleDir)) {
        delete require.cache[cachedPath];
      }
    });
  }

  // 加载插件类
  loadPluginClass(filePath) {
    try {
      const pluginModule = require(path.resolve(filePath));

      // 支持不同的导出方式
      if (typeof pluginModule === 'function') {
        return pluginModule;
      } else if (pluginModule.default && typeof pluginModule.default === 'function') {
        return pluginModule.default;
      } else if (pluginModule.Plugin && typeof pluginModule.Plugin === 'function') {
        return pluginModule.Plugin;
      } else {
        throw new Error('Plugin class not found in module');
      }
    } catch (error) {
      throw new Error(`Failed to load plugin class: ${error.message}`);
    }
  }

  // 替换插件实例
  async replacePlugin(pluginName, newPlugin, config) {
    // 卸载旧插件
    await this.pluginManager.unloadPlugin(pluginName);

    // 注册新插件
    await this.pluginManager.register(newPlugin);

    // 恢复配置
    if (config && this.pluginManager.setPluginConfig) {
      this.pluginManager.setPluginConfig(pluginName, config);
    }

    // 初始化新插件
    await this.pluginManager.initPlugin(pluginName);
  }

  // 尝试恢复
  async attemptRecovery(pluginName) {
    try {
      // 尝试重新启用插件
      const plugin = this.pluginManager.getPlugin(pluginName);
      if (plugin && plugin.state === 'error') {
        await plugin.recover();
        await this.pluginManager.enablePlugin(pluginName);
        this.emit('recovery:success', { pluginName });
      }
    } catch (error) {
      this.emit('recovery:failed', { pluginName, error });
    }
  }

  // 手动重载插件
  async reloadPlugin(pluginName) {
    const filePaths = [];

    for (const [filePath, watchedPluginName] of this.watchedFiles) {
      if (watchedPluginName === pluginName) {
        filePaths.push(filePath);
      }
    }

    if (filePaths.length === 0) {
      throw new Error(`No watched files found for plugin ${pluginName}`);
    }

    // 使用第一个文件路径进行重载
    await this.executeReload(pluginName, filePaths[0]);
  }

  // 获取监听状态
  getWatchStatus() {
    const status = {};

    for (const [filePath, pluginName] of this.watchedFiles) {
      if (!status[pluginName]) {
        status[pluginName] = [];
      }
      status[pluginName].push(filePath);
    }

    return {
      watchedPlugins: Object.keys(status).length,
      watchedFiles: this.watchedFiles.size,
      details: status,
      isReloading: this.isReloading,
      queueSize: this.reloadQueue.length
    };
  }
}

module.exports = HotReloadManager;
```

## 集成高级特性的插件管理器

```javascript
// enterprise-plugin-manager.js
const CommunicationEnabledPluginManager = require('../chapter-05/communication-enabled-plugin-manager');
const ConfigManager = require('./config-manager');
const ConditionalLoader = require('./conditional-loader');
const PluginMarketplace = require('./plugin-marketplace');
const HotReloadManager = require('./hot-reload-manager');

class EnterprisePluginManager extends CommunicationEnabledPluginManager {
  constructor(options = {}) {
    super();

    // 初始化高级特性
    this.configManager = new ConfigManager(options.config);
    this.conditionalLoader = new ConditionalLoader();
    this.marketplace = new PluginMarketplace(options.marketplace);
    this.hotReloadManager = new HotReloadManager(this, options.hotReload);

    // 插件配置存储
    this.pluginConfigs = new Map();

    // 设置条件加载上下文
    this.updateConditionalContext();

    // 监听配置变化
    this.setupConfigWatchers();
  }

  // 更新条件加载上下文
  updateConditionalContext() {
    this.conditionalLoader.setContext({
      environment: process.env.NODE_ENV || 'development',
      platform: process.platform,
      features: this.configManager.getConfig('features', {}) || {},
      config: this.getAllConfigs()
    });
  }

  // 设置配置监听器
  setupConfigWatchers() {
    // 监听特性配置变化
    this.configManager.watchConfig('features', () => {
      this.updateConditionalContext();
    });

    // 监听插件配置变化
    this.configManager.watchConfig('plugins', (config) => {
      this.handlePluginConfigChange(config);
    });
  }

  // 处理插件配置变化
  async handlePluginConfigChange(config) {
    for (const [pluginName, pluginConfig] of Object.entries(config)) {
      const plugin = this.getPlugin(pluginName);
      if (plugin && plugin.onConfigChange) {
        try {
          await plugin.onConfigChange(pluginConfig);
        } catch (error) {
          console.error(`Error applying config change to plugin ${pluginName}:`, error);
        }
      }
    }
  }

  // 重写插件注册方法，添加条件检查
  async register(plugin, options = {}) {
    // 检查加载条件
    if (!this.conditionalLoader.shouldLoadPlugin(plugin.name)) {
      this.context.log(`Plugin ${plugin.name} skipped due to loading conditions`);
      return this;
    }

    // 加载插件配置
    await this.loadPluginConfig(plugin.name);

    // 注册热重载
    if (options.watchFiles && this.hotReloadManager) {
      this.hotReloadManager.watchPlugin(plugin.name, options.watchFiles);
    }

    return await super.register(plugin);
  }

  // 加载插件配置
  async loadPluginConfig(pluginName) {
    try {
      const configPath = `plugins/${pluginName}.json`;
      const config = await this.configManager.loadConfig(pluginName, configPath);
      this.pluginConfigs.set(pluginName, config);
    } catch (error) {
      // 配置文件不存在或加载失败，使用默认配置
      this.pluginConfigs.set(pluginName, {});
    }
  }

  // 获取插件配置
  getPluginConfig(pluginName) {
    return this.pluginConfigs.get(pluginName) || {};
  }

  // 设置插件配置
  async setPluginConfig(pluginName, config) {
    this.pluginConfigs.set(pluginName, config);

    // 保存到文件
    const configPath = `plugins/${pluginName}.json`;
    await this.configManager.saveConfig(pluginName, configPath, config);

    // 通知插件配置变化
    const plugin = this.getPlugin(pluginName);
    if (plugin && plugin.onConfigChange) {
      await plugin.onConfigChange(config);
    }
  }

  // 从市场安装插件
  async installFromMarketplace(pluginId, version = 'latest', registry = null) {
    try {
      // 下载插件
      const downloadResult = await this.marketplace.downloadPlugin(pluginId, version, registry);

      // 解压和安装插件（这里简化处理）
      const pluginPath = await this.extractPlugin(downloadResult.filePath);

      // 加载插件类
      const PluginClass = require(pluginPath);
      const plugin = new PluginClass();

      // 注册插件
      await this.register(plugin, {
        watchFiles: [pluginPath],
        fromMarketplace: true,
        marketplaceInfo: downloadResult.info
      });

      return plugin;
    } catch (error) {
      throw new Error(`Failed to install plugin ${pluginId}: ${error.message}`);
    }
  }

  // 解压插件（简化实现）
  async extractPlugin(filePath) {
    // 这里应该实现实际的解压逻辑
    // 为了示例，我们假设直接返回插件文件路径
    return filePath.replace('.zip', '.js');
  }

  // 设置加载条件
  setLoadingCondition(pluginName, condition) {
    this.conditionalLoader.registerCondition(pluginName, condition);
  }

  // 启用热重载
  enableHotReload() {
    this.hotReloadManager.enable();
  }

  // 禁用热重载
  disableHotReload() {
    this.hotReloadManager.disable();
  }

  // 获取所有配置
  getAllConfigs() {
    const configs = {};
    for (const name of this.configManager.getConfigNames()) {
      configs[name] = this.configManager.getConfig(name);
    }
    return configs;
  }

  // 获取系统状态（扩展版本）
  getSystemStatus() {
    const baseStatus = super.getSystemStatus();

    return {
      ...baseStatus,
      config: {
        loadedConfigs: this.configManager.getConfigNames().length,
        pluginConfigs: this.pluginConfigs.size
      },
      conditionalLoader: {
        conditions: Object.keys(this.conditionalLoader.getAllConditions()).length
      },
      marketplace: this.marketplace.getStats(),
      hotReload: this.hotReloadManager.getWatchStatus()
    };
  }

  // 清理资源
  async cleanup() {
    this.hotReloadManager.disable();
    this.configManager.clear();
    this.conditionalLoader.clear();
    this.marketplace.clearCache();

    await super.cleanup();
  }
}

module.exports = EnterprisePluginManager;
```

## 使用示例

让我们创建一个完整的示例来展示这些高级特性：

### 配置文件示例

```json
// config/features.json
{
  "hotReload": true,
  "marketplace": true,
  "analytics": false,
  "debugMode": true
}
```

```json
// config/plugins/logger.json
{
  "level": "info",
  "format": "json",
  "outputs": ["console", "file"],
  "file": {
    "path": "./logs/app.log",
    "maxSize": "10MB",
    "maxFiles": 5
  }
}
```

### 示例插件

```javascript
// advanced-logger-plugin.js
const EnhancedPlugin = require('../chapter-04/enhanced-plugin');

class AdvancedLoggerPlugin extends EnhancedPlugin {
  constructor() {
    super('logger', '2.0.0', {
      description: 'Advanced logging plugin with configuration support'
    });

    this.config = {};
    this.loggers = new Map();
  }

  async init(context) {
    this.context = context;

    // 获取插件配置
    this.config = context.getPluginConfig?.(this.name) || {
      level: 'info',
      format: 'text',
      outputs: ['console']
    };

    // 初始化日志器
    this.initializeLoggers();

    // 注册日志服务
    context.services.register('logService', () => ({
      log: (level, message, meta) => this.log(level, message, meta),
      createLogger: (name) => this.createLogger(name),
      setLevel: (level) => this.setLevel(level)
    }));

    context.log('Advanced logger initialized with config:', this.config);
  }

  // 配置变化处理
  async onConfigChange(newConfig) {
    this.context.log('Logger config changed:', newConfig);
    this.config = { ...this.config, ...newConfig };
    this.initializeLoggers();
  }

  // 初始化日志器
  initializeLoggers() {
    // 根据配置初始化不同的日志输出
    this.loggers.clear();

    if (this.config.outputs.includes('console')) {
      this.loggers.set('console', {
        write: (message) => console.log(message)
      });
    }

    if (this.config.outputs.includes('file')) {
      this.loggers.set('file', {
        write: (message) => {
          // 这里应该实现文件写入逻辑
          console.log(`[FILE] ${message}`);
        }
      });
    }
  }

  // 记录日志
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.formatMessage(level, message, meta);

    for (const logger of this.loggers.values()) {
      logger.write(logEntry);
    }
  }

  // 检查是否应该记录日志
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  // 格式化消息
  formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();

    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        meta,
        plugin: this.name
      });
    } else {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }
  }

  // 创建命名日志器
  createLogger(name) {
    return {
      debug: (message, meta) => this.log('debug', `[${name}] ${message}`, meta),
      info: (message, meta) => this.log('info', `[${name}] ${message}`, meta),
      warn: (message, meta) => this.log('warn', `[${name}] ${message}`, meta),
      error: (message, meta) => this.log('error', `[${name}] ${message}`, meta)
    };
  }

  // 设置日志级别
  setLevel(level) {
    this.config.level = level;
    this.context.log(`Log level changed to: ${level}`);
  }
}

module.exports = AdvancedLoggerPlugin;
```

### 完整使用示例

```javascript
// enterprise-example.js
const EnterprisePluginManager = require('./enterprise-plugin-manager');
const AdvancedLoggerPlugin = require('./advanced-logger-plugin');

async function main() {
  const pluginManager = new EnterprisePluginManager({
    config: {
      configDir: './config'
    },
    marketplace: {
      downloadDir: './downloaded-plugins'
    },
    hotReload: {
      watchDelay: 500
    }
  });

  try {
    console.log('=== 加载系统配置 ===');

    // 加载特性配置
    await pluginManager.configManager.loadConfig('features', 'features.json');

    // 设置条件加载规则
    pluginManager.setLoadingCondition('analytics', {
      type: 'and',
      conditions: [
        { type: 'feature', feature: 'analytics', enabled: true },
        { type: 'env', variable: 'NODE_ENV', value: 'production' }
      ]
    });

    pluginManager.setLoadingCondition('debugger', {
      type: 'config',
      key: 'features.debugMode',
      value: true
    });

    console.log('\n=== 注册插件 ===');

    // 注册插件（带热重载支持）
    const loggerPlugin = new AdvancedLoggerPlugin();
    await pluginManager.register(loggerPlugin, {
      watchFiles: ['./advanced-logger-plugin.js']
    });

    // 启用热重载
    pluginManager.enableHotReload();

    console.log('\n=== 初始化和启用插件 ===');
    await pluginManager.initAll();
    await pluginManager.enableAll();

    console.log('\n=== 测试配置管理 ===');

    // 获取日志服务
    const logService = pluginManager.context.communication.serviceRegistry.get('logger.logService');

    // 测试日志功能
    logService.log('info', 'System started successfully');
    logService.log('debug', 'Debug information', { userId: 123 });

    // 动态更改插件配置
    console.log('\n--- 更改日志配置 ---');
    await pluginManager.setPluginConfig('logger', {
      level: 'debug',
      format: 'json',
      outputs: ['console', 'file']
    });

    // 测试配置变化后的日志
    logService.log('debug', 'This should now be visible');

    console.log('\n=== 测试插件市场 ===');

    // 注册一个模拟的插件仓库
    pluginManager.marketplace.registerRegistry('official', {
      apiUrl: 'https://api.example.com/plugins',
      searchFunction: async (query) => {
        // 模拟搜索结果
        return [
          {
            id: 'cache-plugin',
            name: 'Cache Plugin',
            version: '1.0.0',
            description: 'High-performance caching plugin',
            downloads: 1500,
            keywords: ['cache', 'performance']
          }
        ];
      }
    });

    // 搜索插件
    const searchResults = await pluginManager.marketplace.searchPlugins('cache');
    console.log('Search results:', searchResults);

    console.log('\n=== 系统状态 ===');
    const status = pluginManager.getSystemStatus();
    console.log('Plugin count:', status.total);
    console.log('Config status:', status.config);
    console.log('Hot reload status:', status.hotReload);
    console.log('Marketplace stats:', status.marketplace);

    console.log('\n=== 测试热重载 ===');
    console.log('Hot reload is enabled. Try modifying the plugin file to see hot reload in action.');

    // 监听热重载事件
    pluginManager.hotReloadManager.on('reload:success', ({ pluginName }) => {
      console.log(`🔥 Plugin ${pluginName} hot reloaded successfully!`);
    });

    pluginManager.hotReloadManager.on('reload:error', ({ pluginName, error }) => {
      console.error(`❌ Hot reload failed for ${pluginName}:`, error.message);
    });

    // 保持程序运行以测试热重载
    console.log('\nPress Ctrl+C to exit...');
    process.on('SIGINT', async () => {
      console.log('\n=== 清理资源 ===');
      await pluginManager.cleanup();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    await pluginManager.cleanup();
  }
}

main().catch(console.error);
```

## 运行结果

运行上面的示例代码，你会看到类似这样的输出：

```
=== 加载系统配置 ===

=== 注册插件 ===
🔄 logger: unregistered -> registered
📦 Plugin registered: logger v2.0.0

=== 初始化和启用插件 ===
Advanced logger initialized with config: { level: 'info', format: 'json', outputs: ['console', 'file'] }
🔄 logger: resolved -> initialized
Advanced logger enabled
🔄 logger: initialized -> enabled

=== 测试配置管理 ===
{"timestamp":"2024-01-15T10:30:00.000Z","level":"info","message":"System started successfully","meta":{},"plugin":"logger"}

--- 更改日志配置 ---
Logger config changed: { level: 'debug', format: 'json', outputs: ['console', 'file'] }
{"timestamp":"2024-01-15T10:30:01.000Z","level":"debug","message":"This should now be visible","meta":{},"plugin":"logger"}

=== 测试插件市场 ===
Search results: [
  {
    id: 'cache-plugin',
    name: 'Cache Plugin',
    version: '1.0.0',
    description: 'High-performance caching plugin',
    downloads: 1500,
    keywords: ['cache', 'performance'],
    registry: 'official'
  }
]

=== 系统状态 ===
Plugin count: 1
Config status: { loadedConfigs: 2, pluginConfigs: 1 }
Hot reload status: { watchedPlugins: 1, watchedFiles: 1, isReloading: false }
Marketplace stats: { registries: 1, cacheSize: 1, registryList: ['official'] }
```

## 小结

在这一章中，我们实现了插件系统的高级特性，包括：

1. **配置管理系统**：支持动态配置加载、验证、转换和监听
2. **条件加载系统**：根据环境、配置、特性等条件决定插件加载
3. **插件市场系统**：支持插件搜索、下载和安装
4. **热重载系统**：支持插件的热更新，提高开发效率
5. **企业级插件管理器**：集成所有高级特性的完整解决方案

这些高级特性让插件系统具备了企业级应用的能力：
- 灵活的配置管理
- 智能的条件加载
- 丰富的插件生态
- 高效的开发体验

在下一章中，我们将通过一个实战案例来展示如何构建一个类似 Vite 的构建工具插件系统。

## 练习题

1. 实现插件的版本管理和兼容性检查功能
2. 添加插件的性能监控和分析功能
3. 实现插件的A/B测试功能，支持灰度发布

---

**下一章预告**：我们将通过构建一个完整的构建工具来展示插件系统的实际应用。
