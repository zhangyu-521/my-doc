# 第8章：性能优化

## 📖 本章概述

性能优化是移动应用开发的重要环节。本章将介绍 React Native 应用的性能监控、分析和优化技巧，帮助你构建流畅、高效的移动应用。

## 📊 性能监控工具

### React Native Performance Monitor

React Native 内置了性能监控工具，可以实时查看应用性能。

```typescript
// 在开发模式下启用性能监控
// 摇晃设备 -> 选择 "Perf Monitor"

// 或在代码中启用
import {NativeModules} from 'react-native';

// 显示性能监控器
NativeModules.DevSettings.setIsPerfMonitorShown(true);
```

### Flipper 性能分析

Flipper 提供了强大的性能分析功能：

1. **React DevTools** - 组件层次结构和状态检查
2. **Network Inspector** - 网络请求监控
3. **Layout Inspector** - 布局检查和调试
4. **Crash Reporter** - 崩溃报告

### 自定义性能监控

```typescript
// src/utils/performanceMonitor.ts
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  private static metrics: Map<string, number[]> = new Map();

  // 开始计时
  static startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  // 结束计时并记录
  static endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} not found`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    // 记录到指标中
    const existing = this.metrics.get(name) || [];
    existing.push(duration);
    this.metrics.set(name, existing);

    console.log(`⏱️ ${name}: ${duration}ms`);
    return duration;
  }

  // 获取平均性能
  static getAverageTime(name: string): number {
    const times = this.metrics.get(name);
    if (!times || times.length === 0) return 0;

    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  }

  // 获取所有指标
  static getAllMetrics(): Record<string, {average: number; count: number}> {
    const result: Record<string, {average: number; count: number}> = {};
    
    this.metrics.forEach((times, name) => {
      const sum = times.reduce((a, b) => a + b, 0);
      result[name] = {
        average: sum / times.length,
        count: times.length,
      };
    });

    return result;
  }

  // 清除所有指标
  static clearMetrics(): void {
    this.timers.clear();
    this.metrics.clear();
  }
}

// 装饰器用法
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      PerformanceMonitor.startTimer(name);
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        PerformanceMonitor.endTimer(name);
      }
    };

    return descriptor;
  };
}
```

## 🚀 渲染性能优化

### React.memo 优化组件重渲染

```typescript
// src/components/OptimizedListItem.tsx
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

interface ListItemProps {
  id: number;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: (id: number) => void;
}

// 使用 React.memo 避免不必要的重渲染
const OptimizedListItem = React.memo<ListItemProps>(({
  id,
  title,
  description,
  isSelected,
  onPress,
}) => {
  console.log(`渲染 ListItem ${id}`);

  const handlePress = React.useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={handlePress}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
});

// 自定义比较函数
const OptimizedListItemWithCustomComparison = React.memo<ListItemProps>(
  ({id, title, description, isSelected, onPress}) => {
    // 组件实现...
    return null;
  },
  (prevProps, nextProps) => {
    // 自定义比较逻辑
    return (
      prevProps.id === nextProps.id &&
      prevProps.title === nextProps.title &&
      prevProps.description === nextProps.description &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selected: {
    backgroundColor: '#e3f2fd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});

export default OptimizedListItem;
```

### useCallback 和 useMemo 优化

```typescript
// src/components/OptimizedList.tsx
import React, {useState, useCallback, useMemo} from 'react';
import {FlatList, View, TextInput, StyleSheet} from 'react-native';
import OptimizedListItem from './OptimizedListItem';

interface ListItem {
  id: number;
  title: string;
  description: string;
}

const OptimizedList: React.FC = () => {
  const [items, setItems] = useState<ListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');

  // 使用 useCallback 缓存函数
  const handleItemPress = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 使用 useMemo 缓存计算结果
  const filteredItems = useMemo(() => {
    if (!searchText) return items;
    
    return items.filter(item =>
      item.title.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [items, searchText]);

  // 使用 useCallback 缓存渲染函数
  const renderItem = useCallback(({item}: {item: ListItem}) => (
    <OptimizedListItem
      id={item.id}
      title={item.title}
      description={item.description}
      isSelected={selectedIds.has(item.id)}
      onPress={handleItemPress}
    />
  ), [selectedIds, handleItemPress]);

  // 使用 useCallback 缓存 keyExtractor
  const keyExtractor = useCallback((item: ListItem) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="搜索..."
      />
      
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        // 性能优化配置
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 70, // 假设每个项目高度为70
          offset: 70 * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 10,
  },
});

export default OptimizedList;
```

## 📱 内存管理

### 内存泄漏检测和预防

```typescript
// src/hooks/useMemoryOptimization.ts
import {useEffect, useRef} from 'react';

export function useMemoryOptimization() {
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const listenersRef = useRef<(() => void)[]>([]);

  // 添加定时器
  const addTimer = (timer: NodeJS.Timeout) => {
    timersRef.current.push(timer);
  };

  // 添加监听器清理函数
  const addListener = (cleanup: () => void) => {
    listenersRef.current.push(cleanup);
  };

  // 组件卸载时清理所有资源
  useEffect(() => {
    return () => {
      // 清理定时器
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];

      // 清理监听器
      listenersRef.current.forEach(cleanup => cleanup());
      listenersRef.current = [];
    };
  }, []);

  return {addTimer, addListener};
}

// 使用示例
const ExampleComponent: React.FC = () => {
  const {addTimer, addListener} = useMemoryOptimization();

  useEffect(() => {
    // 添加定时器
    const timer = setTimeout(() => {
      console.log('定时器执行');
    }, 5000);
    addTimer(timer);

    // 添加事件监听器
    const subscription = someEventEmitter.addListener('event', handler);
    addListener(() => subscription.remove());
  }, [addTimer, addListener]);

  return null;
};
```

### 图片内存优化

```typescript
// src/components/OptimizedImage.tsx
import React, {useState} from 'react';
import {Image, View, StyleSheet, Dimensions} from 'react-native';

const {width: screenWidth} = Dimensions.get('window');

interface OptimizedImageProps {
  uri: string;
  width?: number;
  height?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  width = screenWidth,
  height = 200,
  resizeMode = 'cover',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[styles.container, {width, height}]}>
      <Image
        source={{uri}}
        style={[styles.image, {width, height}]}
        resizeMode={resizeMode}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        // 内存优化配置
        cache="force-cache"
        // 对于大图片，可以设置较小的缓存策略
        {...(width > 500 && {cache: 'reload'})}
      />
      
      {loading && (
        <View style={styles.placeholder}>
          {/* 加载占位符 */}
        </View>
      )}
      
      {error && (
        <View style={styles.errorPlaceholder}>
          {/* 错误占位符 */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
  },
  image: {
    position: 'absolute',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
  },
});

export default OptimizedImage;
```

## ⚡ 启动时间优化

### 延迟加载组件

```typescript
// src/components/LazyComponent.tsx
import React, {Suspense, lazy} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';

// 懒加载组件
const HeavyComponent = lazy(() => import('./HeavyComponent'));

const LazyLoadingExample: React.FC = () => {
  return (
    <View>
      <Text>这是立即加载的内容</Text>
      
      <Suspense
        fallback={
          <View style={{padding: 20, alignItems: 'center'}}>
            <ActivityIndicator size="large" />
            <Text>加载中...</Text>
          </View>
        }
      >
        <HeavyComponent />
      </Suspense>
    </View>
  );
};

export default LazyLoadingExample;
```

### 代码分割和动态导入

```typescript
// src/utils/dynamicImport.ts
export async function loadComponentDynamically<T>(
  importFunction: () => Promise<{default: T}>
): Promise<T> {
  try {
    const module = await importFunction();
    return module.default;
  } catch (error) {
    console.error('动态导入失败:', error);
    throw error;
  }
}

// 使用示例
const DynamicComponentLoader: React.FC = () => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);

  const loadComponent = async () => {
    setLoading(true);
    try {
      const LoadedComponent = await loadComponentDynamically(
        () => import('./SomeHeavyComponent')
      );
      setComponent(() => LoadedComponent);
    } catch (error) {
      console.error('加载组件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {!Component && (
        <Button title="加载组件" onPress={loadComponent} disabled={loading} />
      )}
      
      {loading && <ActivityIndicator />}
      
      {Component && <Component />}
    </View>
  );
};
```

## 📦 包大小优化

### Bundle 分析

```bash
# 分析 Android bundle
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android-bundle.js \
  --assets-dest android-assets

# 使用 bundle-analyzer 分析
npm install -g react-native-bundle-visualizer
npx react-native-bundle-visualizer
```

### 减少包大小的策略

```typescript
// 1. 按需导入
// ❌ 不好的做法
import * as _ from 'lodash';

// ✅ 好的做法
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// 2. 移除未使用的代码
// 使用 ESLint 规则检测未使用的导入
// eslint-disable-next-line no-unused-vars

// 3. 优化图片资源
// 使用 WebP 格式
// 压缩图片
// 使用矢量图标

// 4. 代码压缩配置
// metro.config.js
module.exports = {
  transformer: {
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  },
};
```

## 🔧 性能最佳实践

### 列表性能优化

```typescript
// src/components/HighPerformanceList.tsx
import React, {useMemo, useCallback} from 'react';
import {FlatList, View, Text, StyleSheet} from 'react-native';

interface ListData {
  id: string;
  title: string;
  subtitle: string;
}

const HighPerformanceList: React.FC<{data: ListData[]}> = ({data}) => {
  // 使用 getItemLayout 提高滚动性能
  const getItemLayout = useCallback(
    (data: ListData[] | null | undefined, index: number) => ({
      length: 80, // 固定高度
      offset: 80 * index,
      index,
    }),
    []
  );

  // 优化的渲染函数
  const renderItem = useCallback(({item}: {item: ListData}) => (
    <ListItem item={item} />
  ), []);

  // 键提取器
  const keyExtractor = useCallback((item: ListData) => item.id, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      // 性能优化配置
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={15}
      windowSize={10}
      // 避免重新创建样式对象
      contentContainerStyle={styles.listContainer}
    />
  );
};

// 优化的列表项组件
const ListItem = React.memo<{item: ListData}>(({item}) => (
  <View style={styles.itemContainer}>
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.subtitle}>{item.subtitle}</Text>
  </View>
));

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 10,
  },
  itemContainer: {
    height: 80,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default HighPerformanceList;
```

### 网络请求优化

```typescript
// src/services/optimizedAPI.ts
class OptimizedAPIService {
  private cache = new Map<string, {data: any; timestamp: number}>();
  private pendingRequests = new Map<string, Promise<any>>();

  async get<T>(url: string, options: {
    cache?: boolean;
    cacheTTL?: number;
    timeout?: number;
  } = {}): Promise<T> {
    const {cache = true, cacheTTL = 5 * 60 * 1000, timeout = 10000} = options;
    
    // 检查缓存
    if (cache) {
      const cached = this.cache.get(url);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url);
    }

    // 创建请求
    const request = this.makeRequest<T>(url, timeout);
    this.pendingRequests.set(url, request);

    try {
      const data = await request;
      
      // 缓存结果
      if (cache) {
        this.cache.set(url, {data, timestamp: Date.now()});
      }
      
      return data;
    } finally {
      this.pendingRequests.delete(url);
    }
  }

  private async makeRequest<T>(url: string, timeout: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const optimizedAPI = new OptimizedAPIService();
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ 性能监控工具的使用
- ✅ 渲染性能优化技巧
- ✅ 内存管理和泄漏预防
- ✅ 启动时间优化方法
- ✅ 包大小优化策略
- ✅ 列表和网络请求优化
- ✅ 性能最佳实践

## 📝 作业

1. 使用性能监控工具分析现有应用的性能瓶颈
2. 优化一个包含大量数据的列表组件
3. 实现图片懒加载和缓存机制
4. 分析并优化应用的启动时间

准备好学习应用打包和发布了吗？让我们继续[第9章：打包与发布](/blog/mobile/react-native/chapter-09/)！
