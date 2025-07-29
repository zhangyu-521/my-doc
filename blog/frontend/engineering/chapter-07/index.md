# 第7章：开发体验优化

## 本章目标

- 掌握热重载与快速刷新配置
- 优化开发服务器性能
- 学会使用调试工具和技巧
- 提升整体开发效率

## 7.1 热重载与快速刷新

### Vite热重载配置

#### 1. HMR基础配置
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // 启用快速刷新
      fastRefresh: true,
      // 自动JSX运行时
      jsxRuntime: 'automatic'
    })
  ],
  
  server: {
    // HMR配置
    hmr: {
      port: 24678, // HMR端口
      overlay: true // 错误覆盖层
    },
    
    // 开发服务器配置
    host: '0.0.0.0',
    port: 3000,
    open: true,
    
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // 环境变量
  define: {
    __DEV__: JSON.stringify(true),
    __VERSION__: JSON.stringify(process.env.npm_package_version)
  }
});
```

#### 2. 自定义HMR处理
```typescript
// src/utils/hmr.ts
export function setupHMR() {
  if (import.meta.hot) {
    // 接受自身更新
    import.meta.hot.accept();
    
    // 接受依赖更新
    import.meta.hot.accept('./config', (newConfig) => {
      console.log('Config updated:', newConfig);
      // 处理配置更新
    });
    
    // 处理模块销毁
    import.meta.hot.dispose((data) => {
      // 清理副作用
      console.log('Module disposing:', data);
    });
    
    // 自定义事件
    import.meta.hot.on('custom-event', (data) => {
      console.log('Custom HMR event:', data);
    });
  }
}
```

### Webpack热重载配置

#### 1. 开发服务器配置
```javascript
// webpack.dev.js
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  
  devtool: 'eval-cheap-module-source-map',
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    
    // 热重载配置
    hot: true,
    liveReload: false,
    
    // 服务器配置
    host: 'localhost',
    port: 3000,
    open: true,
    
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    },
    
    // 错误覆盖
    client: {
      overlay: {
        errors: true,
        warnings: false
      }
    },
    
    // 历史路由支持
    historyApiFallback: {
      disableDotRule: true
    }
  },
  
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development')
    })
  ]
};
```

#### 2. React热重载配置
```javascript
// babel.config.js
module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    '@babel/preset-typescript'
  ],
  
  plugins: [
    // 开发环境插件
    process.env.NODE_ENV === 'development' && [
      'react-refresh/babel'
    ]
  ].filter(Boolean)
};
```

```javascript
// webpack.dev.js
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  plugins: [
    new ReactRefreshWebpackPlugin({
      overlay: {
        entry: require.resolve('react-dev-utils/webpackHotDevClient'),
        module: require.resolve('react-dev-utils/refreshOverlayInterop'),
        sockIntegration: 'whm'
      }
    })
  ]
};
```

## 7.2 开发服务器优化

### 启动速度优化

#### 1. 依赖预构建
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    // 预构建包含的依赖
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      'lodash-es',
      'dayjs'
    ],
    
    // 排除预构建的依赖
    exclude: [
      '@vite/client',
      '@vite/env'
    ],
    
    // ESBuild选项
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'globalThis'
      }
    }
  },
  
  // 预热文件
  server: {
    warmup: {
      clientFiles: [
        './src/components/**/*.tsx',
        './src/pages/**/*.tsx',
        './src/hooks/**/*.ts'
      ]
    }
  }
});
```

#### 2. 缓存优化
```typescript
// 文件系统缓存配置
export default defineConfig({
  cacheDir: 'node_modules/.vite',
  
  build: {
    // 构建缓存
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename]
      }
    }
  }
});
```

### 开发中间件

#### 1. 自定义中间件
```typescript
// middleware/dev-middleware.ts
import type { Connect } from 'vite';

export function createDevMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    // 请求日志
    console.log(`${req.method} ${req.url}`);
    
    // 添加开发头部
    res.setHeader('X-Dev-Mode', 'true');
    
    // API模拟
    if (req.url?.startsWith('/api/mock')) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        message: 'Mock API response',
        timestamp: Date.now()
      }));
      return;
    }
    
    next();
  };
}

// vite.config.ts中使用
export default defineConfig({
  server: {
    middlewareMode: false
  },
  
  plugins: [
    {
      name: 'dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api', createDevMiddleware());
      }
    }
  ]
});
```

#### 2. Mock数据服务
```typescript
// plugins/mock-plugin.ts
import type { Plugin } from 'vite';
import { createMockServer } from './mock-server';

export function mockPlugin(): Plugin {
  return {
    name: 'mock-plugin',
    
    configureServer(server) {
      const mockServer = createMockServer();
      
      server.middlewares.use('/api', (req, res, next) => {
        const mockResponse = mockServer.handle(req.url, req.method);
        
        if (mockResponse) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(mockResponse));
        } else {
          next();
        }
      });
    }
  };
}

// mock-server.ts
interface MockRoute {
  path: string;
  method: string;
  response: any;
  delay?: number;
}

export class MockServer {
  private routes: MockRoute[] = [
    {
      path: '/users',
      method: 'GET',
      response: {
        code: 200,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
      }
    },
    
    {
      path: '/users/:id',
      method: 'GET',
      response: (params: any) => ({
        code: 200,
        data: { id: params.id, name: 'User Name', email: 'user@example.com' }
      })
    }
  ];
  
  handle(url: string, method: string) {
    const route = this.routes.find(r => 
      r.method === method && this.matchPath(r.path, url)
    );
    
    if (route) {
      const params = this.extractParams(route.path, url);
      
      return typeof route.response === 'function' 
        ? route.response(params)
        : route.response;
    }
    
    return null;
  }
  
  private matchPath(pattern: string, url: string): boolean {
    const patternParts = pattern.split('/');
    const urlParts = url.split('/');
    
    if (patternParts.length !== urlParts.length) {
      return false;
    }
    
    return patternParts.every((part, index) => 
      part.startsWith(':') || part === urlParts[index]
    );
  }
  
  private extractParams(pattern: string, url: string): Record<string, string> {
    const patternParts = pattern.split('/');
    const urlParts = url.split('/');
    const params: Record<string, string> = {};
    
    patternParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = urlParts[index];
      }
    });
    
    return params;
  }
}

export function createMockServer() {
  return new MockServer();
}
```

## 7.3 调试工具与技巧

### 浏览器调试

#### 1. React DevTools集成
```typescript
// src/utils/devtools.ts
export function setupDevTools() {
  if (process.env.NODE_ENV === 'development') {
    // React DevTools
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected');
    }
    
    // Redux DevTools
    if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
      console.log('Redux DevTools detected');
    }
    
    // 性能监控
    if ('performance' in window) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart);
      });
    }
  }
}
```

#### 2. 自定义调试面板
```typescript
// src/components/DevPanel.tsx
import React, { useState, useEffect } from 'react';

interface DevPanelProps {
  show?: boolean;
}

export const DevPanel: React.FC<DevPanelProps> = ({ show = process.env.NODE_ENV === 'development' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    if (!show) return;
    
    // 拦截console.log
    const originalLog = console.log;
    console.log = (...args) => {
      setLogs(prev => [...prev.slice(-99), args.join(' ')]);
      originalLog(...args);
    };
    
    return () => {
      console.log = originalLog;
    };
  }, [show]);
  
  if (!show) return null;
  
  return (
    <>
      <button
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 9999,
          padding: '8px 12px',
          background: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        🛠️ Dev
      </button>
      
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 50,
            right: 10,
            width: 400,
            height: 300,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            zIndex: 9998,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
            <strong>开发面板</strong>
            <button
              style={{ float: 'right', border: 'none', background: 'none' }}
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div style={{ height: 250, overflow: 'auto', padding: '10px' }}>
            <h4>Console Logs:</h4>
            {logs.map((log, index) => (
              <div key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
```

### 源码映射配置

#### 1. 开发环境源码映射
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true, // 生产环境也可以启用
  },
  
  // 开发环境源码映射
  css: {
    devSourcemap: true
  }
});
```

#### 2. 错误堆栈增强
```typescript
// src/utils/error-handler.ts
export function enhanceErrorStack(error: Error): Error {
  if (process.env.NODE_ENV === 'development') {
    // 添加更多上下文信息
    const enhancedStack = error.stack + '\n\nAdditional Context:\n' +
      `URL: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `Timestamp: ${new Date().toISOString()}`;
    
    error.stack = enhancedStack;
  }
  
  return error;
}

// 全局错误处理
window.addEventListener('error', (event) => {
  const enhancedError = enhanceErrorStack(event.error);
  console.error('Global error:', enhancedError);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
```

## 7.4 开发效率工具

### 代码生成工具

#### 1. 组件生成器
```javascript
// scripts/generate-component.js
const fs = require('fs');
const path = require('path');

function generateComponent(name, options = {}) {
  const { withStyles = true, withTest = true, withStory = false } = options;
  
  const componentDir = path.join('src/components', name);
  
  // 创建目录
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
  }
  
  // 组件文件
  const componentContent = `import React from 'react';
${withStyles ? `import './${name}.css';` : ''}

interface ${name}Props {
  children?: React.ReactNode;
}

export const ${name}: React.FC<${name}Props> = ({ children }) => {
  return (
    <div className="${name.toLowerCase()}">
      {children}
    </div>
  );
};

export default ${name};
`;
  
  fs.writeFileSync(path.join(componentDir, `${name}.tsx`), componentContent);
  
  // 样式文件
  if (withStyles) {
    const styleContent = `.${name.toLowerCase()} {
  /* Add your styles here */
}
`;
    fs.writeFileSync(path.join(componentDir, `${name}.css`), styleContent);
  }
  
  // 测试文件
  if (withTest) {
    const testContent = `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders correctly', () => {
    render(<${name}>Test content</${name}>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});
`;
    fs.writeFileSync(path.join(componentDir, `${name}.test.tsx`), testContent);
  }
  
  // Storybook文件
  if (withStory) {
    const storyContent = `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default ${name}',
  },
};
`;
    fs.writeFileSync(path.join(componentDir, `${name}.stories.tsx`), storyContent);
  }
  
  // 导出文件
  const indexContent = `export { ${name} } from './${name}';
export type { ${name}Props } from './${name}';
`;
  fs.writeFileSync(path.join(componentDir, 'index.ts'), indexContent);
  
  console.log(`✅ Component ${name} generated successfully!`);
}

// 命令行使用
const componentName = process.argv[2];
const options = {
  withStyles: !process.argv.includes('--no-styles'),
  withTest: !process.argv.includes('--no-test'),
  withStory: process.argv.includes('--with-story')
};

if (componentName) {
  generateComponent(componentName, options);
} else {
  console.log('Usage: node scripts/generate-component.js ComponentName [--no-styles] [--no-test] [--with-story]');
}
```

#### 2. API生成器
```javascript
// scripts/generate-api.js
const fs = require('fs');
const path = require('path');

function generateAPI(entityName) {
  const apiDir = path.join('src/api');
  const entityLower = entityName.toLowerCase();
  const entityPlural = entityLower + 's';
  
  const apiContent = `import { ApiResponse, PaginationParams } from '@/types/api';

export interface ${entityName} {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ${entityName}CreateInput {
  name: string;
}

export interface ${entityName}UpdateInput {
  name?: string;
}

export interface ${entityName}ListParams extends PaginationParams {
  search?: string;
  sortBy?: keyof ${entityName};
  sortOrder?: 'asc' | 'desc';
}

class ${entityName}API {
  private baseURL = '/api/${entityPlural}';
  
  async getList(params: ${entityName}ListParams): Promise<ApiResponse<${entityName}[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    
    const response = await fetch(\`\${this.baseURL}?\${searchParams}\`);
    return response.json();
  }
  
  async getById(id: number): Promise<ApiResponse<${entityName}>> {
    const response = await fetch(\`\${this.baseURL}/\${id}\`);
    return response.json();
  }
  
  async create(data: ${entityName}CreateInput): Promise<ApiResponse<${entityName}>> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
  
  async update(id: number, data: ${entityName}UpdateInput): Promise<ApiResponse<${entityName}>> {
    const response = await fetch(\`\${this.baseURL}/\${id}\`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
  
  async delete(id: number): Promise<ApiResponse<void>> {
    const response = await fetch(\`\${this.baseURL}/\${id}\`, {
      method: 'DELETE',
    });
    return response.json();
  }
}

export const ${entityLower}API = new ${entityName}API();
`;
  
  fs.writeFileSync(path.join(apiDir, `${entityLower}.ts`), apiContent);
  
  // 生成React Query hooks
  const hooksContent = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${entityLower}API, ${entityName}, ${entityName}CreateInput, ${entityName}UpdateInput, ${entityName}ListParams } from '@/api/${entityLower}';

export function use${entityName}List(params: ${entityName}ListParams) {
  return useQuery({
    queryKey: ['${entityPlural}', params],
    queryFn: () => ${entityLower}API.getList(params),
  });
}

export function use${entityName}(id: number) {
  return useQuery({
    queryKey: ['${entityPlural}', id],
    queryFn: () => ${entityLower}API.getById(id),
    enabled: !!id,
  });
}

export function useCreate${entityName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ${entityName}CreateInput) => ${entityLower}API.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entityPlural}'] });
    },
  });
}

export function useUpdate${entityName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ${entityName}UpdateInput }) => 
      ${entityLower}API.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['${entityPlural}'] });
      queryClient.invalidateQueries({ queryKey: ['${entityPlural}', id] });
    },
  });
}

export function useDelete${entityName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => ${entityLower}API.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entityPlural}'] });
    },
  });
}
`;
  
  const hooksDir = path.join('src/hooks');
  fs.writeFileSync(path.join(hooksDir, `use${entityName}.ts`), hooksContent);
  
  console.log(`✅ API for ${entityName} generated successfully!`);
}

const entityName = process.argv[2];
if (entityName) {
  generateAPI(entityName);
} else {
  console.log('Usage: node scripts/generate-api.js EntityName');
}
```

### 开发工作流优化

#### 1. 自动化脚本
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "generate:component": "node scripts/generate-component.js",
    "generate:api": "node scripts/generate-api.js",
    "clean": "rimraf dist",
    "analyze": "npm run build && npx vite-bundle-analyzer dist/stats.html"
  }
}
```

## 本章小结

本章我们学习了：

1. **热重载配置**：Vite和Webpack的HMR配置和自定义处理
2. **开发服务器优化**：启动速度优化和自定义中间件
3. **调试工具**：浏览器调试、源码映射和错误处理
4. **效率工具**：代码生成器和自动化脚本

## 练习题

1. 配置一个完整的Vite开发环境，包含HMR和代理
2. 创建一个自定义的Mock数据服务
3. 实现一个组件和API的代码生成器
4. 配置开发调试面板和错误监控

## 下一章预告

下一章我们将学习多环境管理与配置，包括环境变量管理、多环境构建配置和敏感信息保护。

---

[上一章：性能优化与监控](../chapter-06/) | [返回目录](../) | [下一章：多环境管理与配置](../chapter-08/)
