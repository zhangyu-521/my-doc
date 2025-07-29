# 第8章：多环境管理与配置

## 本章目标

- 掌握环境变量管理策略
- 学会多环境构建配置
- 了解配置文件管理最佳实践
- 实现敏感信息保护机制

## 8.1 环境变量管理

### 基础环境变量配置

#### 1. Vite环境变量
```bash
# .env - 所有环境通用
VITE_APP_TITLE=My Application
VITE_APP_VERSION=1.0.0

# .env.local - 本地环境（不提交到版本控制）
VITE_API_KEY=local-api-key
VITE_DEBUG=true

# .env.development - 开发环境
VITE_API_URL=http://localhost:8080/api
VITE_APP_ENV=development
VITE_ENABLE_MOCK=true

# .env.staging - 测试环境
VITE_API_URL=https://api-staging.example.com/api
VITE_APP_ENV=staging
VITE_ENABLE_MOCK=false

# .env.production - 生产环境
VITE_API_URL=https://api.example.com/api
VITE_APP_ENV=production
VITE_ENABLE_MOCK=false
VITE_ENABLE_ANALYTICS=true
```

#### 2. 环境变量类型定义
```typescript
// src/types/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_URL: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_ENABLE_MOCK: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_API_KEY: string;
  readonly VITE_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

#### 3. 环境配置管理
```typescript
// src/config/env.ts
interface AppConfig {
  title: string;
  version: string;
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableMock: boolean;
  enableAnalytics: boolean;
  apiKey: string;
  debug: boolean;
}

function createConfig(): AppConfig {
  const env = import.meta.env;
  
  return {
    title: env.VITE_APP_TITLE,
    version: env.VITE_APP_VERSION,
    apiUrl: env.VITE_API_URL,
    environment: env.VITE_APP_ENV,
    enableMock: env.VITE_ENABLE_MOCK === 'true',
    enableAnalytics: env.VITE_ENABLE_ANALYTICS === 'true',
    apiKey: env.VITE_API_KEY,
    debug: env.VITE_DEBUG === 'true'
  };
}

export const config = createConfig();

// 环境检查工具
export const isDevelopment = config.environment === 'development';
export const isStaging = config.environment === 'staging';
export const isProduction = config.environment === 'production';

// 调试工具
export function debugLog(...args: any[]) {
  if (config.debug) {
    console.log('[DEBUG]', ...args);
  }
}
```

### 动态配置加载

#### 1. 运行时配置
```typescript
// src/config/runtime.ts
interface RuntimeConfig {
  features: {
    newFeature: boolean;
    betaFeature: boolean;
  };
  limits: {
    maxFileSize: number;
    maxRequests: number;
  };
  theme: {
    primaryColor: string;
    darkMode: boolean;
  };
}

class ConfigManager {
  private config: RuntimeConfig | null = null;
  private listeners: Array<(config: RuntimeConfig) => void> = [];
  
  async loadConfig(): Promise<RuntimeConfig> {
    try {
      const response = await fetch('/api/config');
      this.config = await response.json();
      
      // 通知监听器
      this.listeners.forEach(listener => listener(this.config!));
      
      return this.config;
    } catch (error) {
      console.error('Failed to load runtime config:', error);
      
      // 返回默认配置
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }
  
  getConfig(): RuntimeConfig | null {
    return this.config;
  }
  
  subscribe(listener: (config: RuntimeConfig) => void) {
    this.listeners.push(listener);
    
    // 如果配置已加载，立即调用监听器
    if (this.config) {
      listener(this.config);
    }
    
    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  private getDefaultConfig(): RuntimeConfig {
    return {
      features: {
        newFeature: false,
        betaFeature: false
      },
      limits: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxRequests: 100
      },
      theme: {
        primaryColor: '#1890ff',
        darkMode: false
      }
    };
  }
}

export const configManager = new ConfigManager();
```

#### 2. React配置Hook
```typescript
// src/hooks/useConfig.ts
import { useState, useEffect } from 'react';
import { configManager, RuntimeConfig } from '@/config/runtime';

export function useConfig() {
  const [config, setConfig] = useState<RuntimeConfig | null>(
    configManager.getConfig()
  );
  const [loading, setLoading] = useState(!config);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const loadConfig = async () => {
      try {
        setLoading(true);
        const newConfig = await configManager.loadConfig();
        
        if (mounted) {
          setConfig(newConfig);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    // 订阅配置更新
    const unsubscribe = configManager.subscribe((newConfig) => {
      if (mounted) {
        setConfig(newConfig);
      }
    });
    
    // 如果配置未加载，则加载配置
    if (!config) {
      loadConfig();
    }
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  
  return { config, loading, error };
}

// 特性开关Hook
export function useFeature(featureName: keyof RuntimeConfig['features']) {
  const { config } = useConfig();
  return config?.features[featureName] ?? false;
}
```

## 8.2 多环境构建配置

### Vite多环境配置

#### 1. 环境特定配置
```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  const isDev = mode === 'development';
  const isStaging = mode === 'staging';
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react(),
      
      // 开发环境插件
      ...(isDev ? [
        // 开发专用插件
      ] : []),
      
      // 生产环境插件
      ...(isProd ? [
        // 生产专用插件
      ] : [])
    ],
    
    define: {
      __DEV__: isDev,
      __STAGING__: isStaging,
      __PROD__: isProd,
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    
    server: {
      port: isDev ? 3000 : 4000,
      proxy: isDev ? {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true
        }
      } : undefined
    },
    
    build: {
      outDir: isProd ? 'dist' : `dist-${mode}`,
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      
      rollupOptions: {
        output: {
          // 环境特定的文件命名
          chunkFileNames: isProd 
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          entryFileNames: isProd
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js'
        }
      },
      
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined
    },
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@config': resolve(__dirname, 'src/config')
      }
    }
  };
});
```

#### 2. 构建脚本配置
```json
{
  "scripts": {
    "dev": "vite --mode development",
    "dev:staging": "vite --mode staging",
    "build": "tsc && vite build --mode production",
    "build:staging": "tsc && vite build --mode staging",
    "build:dev": "tsc && vite build --mode development",
    "preview": "vite preview",
    "preview:staging": "vite preview --mode staging"
  }
}
```

### Webpack多环境配置

#### 1. 环境配置文件
```javascript
// webpack/webpack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../src')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ]
};
```

```javascript
// webpack/webpack.dev.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');

module.exports = (env) => {
  return merge(common, {
    mode: 'development',
    devtool: 'eval-source-map',
    
    devServer: {
      static: './dist',
      hot: true,
      port: 3000
    },
    
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('development'),
        'process.env.API_URL': JSON.stringify(env.API_URL || 'http://localhost:8080')
      })
    ]
  });
};
```

```javascript
// webpack/webpack.prod.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env) => {
  return merge(common, {
    mode: 'production',
    devtool: 'source-map',
    
    output: {
      path: path.resolve(__dirname, '../dist'),
      filename: '[name].[contenthash].js',
      clean: true
    },
    
    optimization: {
      minimizer: [new TerserPlugin()],
      splitChunks: {
        chunks: 'all'
      }
    },
    
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env.API_URL': JSON.stringify(env.API_URL)
      })
    ]
  });
};
```

## 8.3 配置文件管理

### 配置文件结构

#### 1. 分层配置管理
```typescript
// src/config/index.ts
import { config as baseConfig } from './base';
import { config as devConfig } from './development';
import { config as stagingConfig } from './staging';
import { config as prodConfig } from './production';

const configs = {
  development: devConfig,
  staging: stagingConfig,
  production: prodConfig
};

const environment = (import.meta.env.VITE_APP_ENV || 'development') as keyof typeof configs;

export const config = {
  ...baseConfig,
  ...configs[environment]
};

export * from './types';
```

```typescript
// src/config/base.ts
export const config = {
  app: {
    name: 'My Application',
    version: '1.0.0'
  },
  
  api: {
    timeout: 10000,
    retries: 3
  },
  
  ui: {
    pageSize: 20,
    debounceTime: 300
  },
  
  storage: {
    prefix: 'myapp_',
    version: 1
  }
};
```

```typescript
// src/config/development.ts
export const config = {
  api: {
    baseUrl: 'http://localhost:8080/api',
    timeout: 30000 // 开发环境更长的超时时间
  },
  
  logging: {
    level: 'debug',
    enableConsole: true
  },
  
  features: {
    enableMock: true,
    enableDebugPanel: true
  }
};
```

#### 2. 配置验证
```typescript
// src/config/validator.ts
import Joi from 'joi';

const configSchema = Joi.object({
  app: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required()
  }).required(),
  
  api: Joi.object({
    baseUrl: Joi.string().uri().required(),
    timeout: Joi.number().positive().required(),
    retries: Joi.number().min(0).required()
  }).required(),
  
  ui: Joi.object({
    pageSize: Joi.number().positive().required(),
    debounceTime: Joi.number().min(0).required()
  }).required(),
  
  logging: Joi.object({
    level: Joi.string().valid('debug', 'info', 'warn', 'error').required(),
    enableConsole: Joi.boolean().required()
  }).required()
});

export function validateConfig(config: any) {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true
  });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
  }
  
  return value;
}
```

### 配置热更新

#### 1. 配置监听器
```typescript
// src/config/watcher.ts
class ConfigWatcher {
  private listeners: Map<string, Array<(value: any) => void>> = new Map();
  private config: Record<string, any> = {};
  
  set(key: string, value: any) {
    const oldValue = this.config[key];
    this.config[key] = value;
    
    if (oldValue !== value) {
      this.notify(key, value);
    }
  }
  
  get(key: string) {
    return this.config[key];
  }
  
  subscribe(key: string, listener: (value: any) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key)!.push(listener);
    
    // 立即调用一次
    listener(this.config[key]);
    
    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }
  
  private notify(key: string, value: any) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(listener => listener(value));
    }
  }
  
  // 批量更新
  update(updates: Record<string, any>) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
}

export const configWatcher = new ConfigWatcher();
```

#### 2. React配置Hook
```typescript
// src/hooks/useConfigValue.ts
import { useState, useEffect } from 'react';
import { configWatcher } from '@/config/watcher';

export function useConfigValue<T>(key: string, defaultValue?: T): T {
  const [value, setValue] = useState<T>(
    configWatcher.get(key) ?? defaultValue
  );
  
  useEffect(() => {
    const unsubscribe = configWatcher.subscribe(key, setValue);
    return unsubscribe;
  }, [key]);
  
  return value;
}

// 使用示例
export function MyComponent() {
  const apiUrl = useConfigValue('api.baseUrl', 'http://localhost:8080');
  const pageSize = useConfigValue('ui.pageSize', 20);
  
  return (
    <div>
      <p>API URL: {apiUrl}</p>
      <p>Page Size: {pageSize}</p>
    </div>
  );
}
```

## 8.4 敏感信息保护

### 环境变量安全

#### 1. 敏感信息分离
```bash
# .env.example - 提交到版本控制的模板文件
VITE_APP_TITLE=My Application
VITE_API_URL=https://api.example.com
VITE_APP_ENV=production

# 敏感信息占位符
VITE_API_KEY=your-api-key-here
VITE_SECRET_KEY=your-secret-key-here
```

```bash
# .env.local - 本地敏感信息（不提交到版本控制）
VITE_API_KEY=real-api-key-value
VITE_SECRET_KEY=real-secret-key-value
```

#### 2. 运行时密钥管理
```typescript
// src/utils/secrets.ts
class SecretManager {
  private secrets: Map<string, string> = new Map();
  private initialized = false;
  
  async initialize() {
    if (this.initialized) return;
    
    try {
      // 从安全端点获取密钥
      const response = await fetch('/api/secrets', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const secrets = await response.json();
        Object.entries(secrets).forEach(([key, value]) => {
          this.secrets.set(key, value as string);
        });
      }
    } catch (error) {
      console.error('Failed to load secrets:', error);
    }
    
    this.initialized = true;
  }
  
  get(key: string): string | undefined {
    return this.secrets.get(key);
  }
  
  has(key: string): boolean {
    return this.secrets.has(key);
  }
  
  // 安全清理
  clear() {
    this.secrets.clear();
    this.initialized = false;
  }
}

export const secretManager = new SecretManager();
```

### 构建时安全处理

#### 1. 敏感信息过滤
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // 过滤敏感环境变量
  const safeEnv = Object.keys(env).reduce((acc, key) => {
    // 只包含以VITE_开头的非敏感变量
    if (key.startsWith('VITE_') && !key.includes('SECRET') && !key.includes('KEY')) {
      acc[key] = env[key];
    }
    return acc;
  }, {} as Record<string, string>);
  
  return {
    define: {
      // 只暴露安全的环境变量
      ...Object.keys(safeEnv).reduce((acc, key) => {
        acc[`import.meta.env.${key}`] = JSON.stringify(safeEnv[key]);
        return acc;
      }, {} as Record<string, string>)
    }
  };
});
```

#### 2. 构建产物检查
```javascript
// scripts/check-secrets.js
const fs = require('fs');
const path = require('path');

const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /password/i,
  /token/i,
  /private[_-]?key/i
];

function checkFileForSecrets(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];
  
  SENSITIVE_PATTERNS.forEach(pattern => {
    const matches = content.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      findings.push(...matches);
    }
  });
  
  return findings;
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  const issues = [];
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      issues.push(...scanDirectory(filePath));
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      const secrets = checkFileForSecrets(filePath);
      if (secrets.length > 0) {
        issues.push({
          file: filePath,
          secrets
        });
      }
    }
  });
  
  return issues;
}

// 检查构建产物
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  const issues = scanDirectory(distDir);
  
  if (issues.length > 0) {
    console.error('🚨 Potential secrets found in build output:');
    issues.forEach(issue => {
      console.error(`  ${issue.file}:`);
      issue.secrets.forEach(secret => {
        console.error(`    - ${secret}`);
      });
    });
    process.exit(1);
  } else {
    console.log('✅ No secrets found in build output');
  }
} else {
  console.log('⚠️  Build directory not found');
}
```

## 本章小结

本章我们学习了：

1. **环境变量管理**：基础配置、类型定义和动态加载
2. **多环境构建**：Vite和Webpack的环境特定配置
3. **配置文件管理**：分层配置、验证和热更新
4. **敏感信息保护**：安全存储、过滤和构建检查

## 练习题

1. 配置一个完整的多环境构建系统
2. 实现动态配置加载和热更新机制
3. 创建配置验证和敏感信息检查工具
4. 设计一个安全的密钥管理方案

## 下一章预告

下一章我们将学习CI/CD与自动化部署，包括GitHub Actions工作流、自动化构建测试和多环境部署策略。

---

[上一章：开发体验优化](../chapter-07/README.md) | [返回目录](../README.md) | [下一章：CI/CD与自动化部署](../chapter-09/README.md)
