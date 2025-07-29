# 第6章：性能优化与监控

## 本章目标

- 掌握构建性能优化技巧
- 学会运行时性能优化方法
- 了解资源加载优化策略
- 建立性能监控与分析体系

## 6.1 构建性能优化

### Webpack构建优化

#### 1. 构建速度优化
```javascript
// webpack.config.js
const path = require('path');
const webpack = require('webpack');

module.exports = {
  // 缓存配置
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    buildDependencies: {
      config: [__filename]
    }
  },
  
  // 并行处理
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: require('os').cpus().length - 1
            }
          },
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true
            }
          }
        ]
      }
    ]
  },
  
  // 优化解析
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  
  // 排除不必要的模块
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    'lodash': '_'
  }
};
```

#### 2. Bundle分析与优化
```javascript
// webpack-bundle-analyzer配置
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ],
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 第三方库
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all'
        },
        
        // React相关
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          priority: 20,
          chunks: 'all'
        },
        
        // 工具库
        utils: {
          test: /[\\/]node_modules[\\/](lodash|moment|axios)[\\/]/,
          name: 'utils',
          priority: 15,
          chunks: 'all'
        }
      }
    }
  }
};
```

### Vite构建优化

#### 1. 构建配置优化
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true
    })
  ],
  
  build: {
    // 构建目标
    target: 'es2015',
    
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['antd', '@ant-design/icons'],
          'utils-vendor': ['lodash-es', 'dayjs', 'axios']
        }
      }
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // 资源内联阈值
    assetsInlineLimit: 4096,
    
    // 启用CSS代码分割
    cssCodeSplit: true
  },
  
  // 依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd'],
    exclude: ['@vite/client', '@vite/env']
  }
});
```

#### 2. 开发环境优化
```typescript
export default defineConfig({
  server: {
    // 预热常用文件
    warmup: {
      clientFiles: [
        './src/components/**/*.tsx',
        './src/pages/**/*.tsx'
      ]
    }
  },
  
  // 依赖预构建优化
  optimizeDeps: {
    force: true, // 强制重新预构建
    esbuildOptions: {
      target: 'es2020'
    }
  }
});
```

## 6.2 运行时性能优化

### React性能优化

#### 1. 组件优化
```typescript
// 使用React.memo优化组件
import React, { memo, useMemo, useCallback } from 'react';

interface UserListProps {
  users: User[];
  onUserClick: (user: User) => void;
  filter: string;
}

export const UserList = memo<UserListProps>(({ users, onUserClick, filter }) => {
  // 使用useMemo缓存计算结果
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);
  
  // 使用useCallback缓存回调函数
  const handleUserClick = useCallback((user: User) => {
    onUserClick(user);
  }, [onUserClick]);
  
  return (
    <div className="user-list">
      {filteredUsers.map(user => (
        <UserItem
          key={user.id}
          user={user}
          onClick={handleUserClick}
        />
      ))}
    </div>
  );
});

// 自定义比较函数
export const UserItem = memo<{
  user: User;
  onClick: (user: User) => void;
}>(({ user, onClick }) => {
  return (
    <div 
      className="user-item"
      onClick={() => onClick(user)}
    >
      <img src={user.avatar} alt={user.name} loading="lazy" />
      <span>{user.name}</span>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.user.id === nextProps.user.id &&
         prevProps.user.name === nextProps.user.name;
});
```

#### 2. 虚拟滚动优化
```typescript
// 虚拟滚动组件
import React, { useState, useEffect, useMemo } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) =>
            renderItem(item, visibleRange.start + index)
          )}
        </div>
      </div>
    </div>
  );
}
```

### 状态管理优化

#### 1. Redux性能优化
```typescript
// 使用RTK Query优化数据获取
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    }
  }),
  
  tagTypes: ['User'],
  
  endpoints: (builder) => ({
    getUsers: builder.query<User[], { page: number; limit: number }>({
      query: ({ page, limit }) => `users?page=${page}&limit=${limit}`,
      providesTags: ['User'],
      // 缓存配置
      keepUnusedDataFor: 60, // 60秒
    }),
    
    getUserById: builder.query<User, number>({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    updateUser: builder.mutation<User, Partial<User> & Pick<User, 'id'>>({
      query: ({ id, ...patch }) => ({
        url: `users/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
  }),
});
```

#### 2. 状态选择器优化
```typescript
// 使用reselect优化选择器
import { createSelector } from '@reduxjs/toolkit';

const selectUsers = (state: RootState) => state.users.items;
const selectFilter = (state: RootState) => state.users.filter;
const selectSortBy = (state: RootState) => state.users.sortBy;

export const selectFilteredUsers = createSelector(
  [selectUsers, selectFilter, selectSortBy],
  (users, filter, sortBy) => {
    let filtered = users;
    
    if (filter) {
      filtered = users.filter(user =>
        user.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        return a[sortBy].localeCompare(b[sortBy]);
      });
    }
    
    return filtered;
  }
);
```

## 6.3 资源加载优化

### 代码分割策略

#### 1. 路由级别分割
```typescript
// 路由懒加载
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// 懒加载页面组件
const HomePage = lazy(() => import('@/pages/Home'));
const UserPage = lazy(() => import('@/pages/User'));
const SettingsPage = lazy(() => import('@/pages/Settings'));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/users" element={<UserPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
}
```

#### 2. 组件级别分割
```typescript
// 动态导入组件
import { useState, lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('@/components/HeavyChart'));
const DataTable = lazy(() => import('@/components/DataTable'));

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('overview')}>Overview</button>
        <button onClick={() => setActiveTab('chart')}>Chart</button>
        <button onClick={() => setActiveTab('data')}>Data</button>
      </nav>
      
      <div>
        {activeTab === 'overview' && <OverviewPanel />}
        
        {activeTab === 'chart' && (
          <Suspense fallback={<div>Loading chart...</div>}>
            <HeavyChart />
          </Suspense>
        )}
        
        {activeTab === 'data' && (
          <Suspense fallback={<div>Loading data...</div>}>
            <DataTable />
          </Suspense>
        )}
      </div>
    </div>
  );
}
```

### 资源预加载

#### 1. 预加载策略
```typescript
// 资源预加载Hook
import { useEffect } from 'react';

export function usePreloadRoute(routePath: string) {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, [routePath]);
}

// 图片预加载
export function usePreloadImages(imageUrls: string[]) {
  useEffect(() => {
    const images = imageUrls.map(url => {
      const img = new Image();
      img.src = url;
      return img;
    });
    
    return () => {
      images.forEach(img => {
        img.src = '';
      });
    };
  }, [imageUrls]);
}
```

#### 2. Service Worker缓存
```javascript
// sw.js - Service Worker
const CACHE_NAME = 'app-cache-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中，返回缓存资源
        if (response) {
          return response;
        }
        
        // 网络请求
        return fetch(event.request).then((response) => {
          // 检查响应是否有效
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 克隆响应
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});
```

## 6.4 性能监控与分析

### Web Vitals监控

#### 1. 核心指标监控
```typescript
// 性能监控工具
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  
  init() {
    // 最大内容绘制
    getLCP((metric) => {
      this.recordMetric(metric);
    });
    
    // 首次输入延迟
    getFID((metric) => {
      this.recordMetric(metric);
    });
    
    // 累积布局偏移
    getCLS((metric) => {
      this.recordMetric(metric);
    });
    
    // 首次内容绘制
    getFCP((metric) => {
      this.recordMetric(metric);
    });
    
    // 首字节时间
    getTTFB((metric) => {
      this.recordMetric(metric);
    });
  }
  
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // 发送到分析服务
    this.sendToAnalytics(metric);
    
    // 本地存储
    this.storeLocally(metric);
  }
  
  private sendToAnalytics(metric: PerformanceMetric) {
    // 发送到Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        custom_parameter_1: metric.rating
      });
    }
    
    // 发送到自定义分析服务
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(console.error);
  }
  
  private storeLocally(metric: PerformanceMetric) {
    const stored = localStorage.getItem('performance-metrics');
    const metrics = stored ? JSON.parse(stored) : [];
    
    metrics.push({
      ...metric,
      timestamp: Date.now(),
      url: window.location.href
    });
    
    // 只保留最近100条记录
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
    
    localStorage.setItem('performance-metrics', JSON.stringify(metrics));
  }
  
  getMetrics() {
    return this.metrics;
  }
  
  getMetricsByName(name: string) {
    return this.metrics.filter(metric => metric.name === name);
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

#### 2. 自定义性能指标
```typescript
// 自定义性能测量
export class CustomPerformanceMonitor {
  private observer: PerformanceObserver;
  
  constructor() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.handlePerformanceEntry(entry);
      }
    });
  }
  
  init() {
    // 监控导航时间
    this.observer.observe({ entryTypes: ['navigation'] });
    
    // 监控资源加载时间
    this.observer.observe({ entryTypes: ['resource'] });
    
    // 监控用户自定义标记
    this.observer.observe({ entryTypes: ['measure'] });
  }
  
  // 标记开始时间
  markStart(name: string) {
    performance.mark(`${name}-start`);
  }
  
  // 标记结束时间并测量
  markEnd(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }
  
  // 测量组件渲染时间
  measureComponentRender(componentName: string, renderFn: () => void) {
    this.markStart(`${componentName}-render`);
    renderFn();
    this.markEnd(`${componentName}-render`);
  }
  
  private handlePerformanceEntry(entry: PerformanceEntry) {
    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      
      console.log('Navigation Timing:', {
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
        loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
        firstByte: navEntry.responseStart - navEntry.requestStart,
        domInteractive: navEntry.domInteractive - navEntry.navigationStart
      });
    }
    
    if (entry.entryType === 'resource') {
      const resourceEntry = entry as PerformanceResourceTiming;
      
      // 监控慢资源
      if (resourceEntry.duration > 1000) {
        console.warn('Slow resource:', {
          name: resourceEntry.name,
          duration: resourceEntry.duration,
          size: resourceEntry.transferSize
        });
      }
    }
    
    if (entry.entryType === 'measure') {
      console.log('Custom measure:', {
        name: entry.name,
        duration: entry.duration
      });
    }
  }
}
```

### 错误监控

#### 1. 错误边界
```typescript
// 错误边界组件
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // 发送错误到监控服务
    this.reportError(error, errorInfo);
    
    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);
  }
  
  private reportError(error: Error, errorInfo: ErrorInfo) {
    // 发送到Sentry
    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
    
    // 发送到自定义错误服务
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(console.error);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 本章小结

本章我们学习了：

1. **构建性能优化**：Webpack和Vite的构建优化配置
2. **运行时性能优化**：React组件优化和状态管理优化
3. **资源加载优化**：代码分割、预加载和缓存策略
4. **性能监控**：Web Vitals监控和自定义性能指标
5. **错误监控**：错误边界和错误上报机制

## 练习题

1. 配置Webpack构建性能优化，分析Bundle大小
2. 实现一个虚拟滚动组件优化长列表性能
3. 配置Service Worker实现资源缓存
4. 集成Web Vitals监控和错误上报

## 下一章预告

下一章我们将学习开发体验优化，包括热重载、开发服务器配置和调试工具的使用。

---

[上一章：自动化测试体系](../chapter-05/README.md) | [返回目录](../README.md) | [下一章：开发体验优化](../chapter-07/README.md)
