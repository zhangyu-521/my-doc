# 第5章：网络请求与数据处理

## 📖 本章概述

在现代移动应用中，网络请求是必不可少的功能。本章将详细介绍如何在 React Native 中进行网络请求、处理响应数据、错误处理以及实现数据缓存等高级功能。

## 🌐 Fetch API 基础

React Native 内置了 Fetch API，这是进行网络请求的基础方法。

### 基本 GET 请求

```typescript
import React, {useState, useEffect} from 'react';
import {View, Text, Button, FlatList, StyleSheet, ActivityIndicator} from 'react-native';

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

const FetchExample: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: Post[] = await response.json();
      setPosts(data.slice(0, 10)); // 只取前10条
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderPost = ({item}: {item: Post}) => (
    <View style={styles.postItem}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postBody} numberOfLines={3}>
        {item.body}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>文章列表</Text>
      
      <Button title="刷新" onPress={fetchPosts} disabled={loading} />
      
      {loading && <ActivityIndicator size="large" color="#007AFF" />}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>错误: {error}</Text>
          <Button title="重试" onPress={fetchPosts} />
        </View>
      )}
      
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    flex: 1,
    marginTop: 20,
  },
  postItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  postBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  errorText: {
    color: '#d63031',
    marginBottom: 10,
  },
});

export default FetchExample;
```

### POST 请求示例

```typescript
const createPost = async (title: string, body: string) => {
  setLoading(true);
  
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        userId: 1,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newPost: Post = await response.json();
    setPosts(prevPosts => [newPost, ...prevPosts]);
    
    Alert.alert('成功', '文章创建成功');
  } catch (err) {
    Alert.alert('错误', err instanceof Error ? err.message : '创建失败');
  } finally {
    setLoading(false);
  }
};
```

## 📡 Axios 网络库

Axios 是一个功能更强大的 HTTP 客户端库，提供了更多便利功能。

### 安装和配置

```bash
npm install axios
```

```typescript
// src/services/api.ts
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    console.log('发送请求:', config.method?.toUpperCase(), config.url);
    
    // 添加认证 token
    const token = getAuthToken(); // 假设有获取 token 的函数
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    console.log('收到响应:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // 对响应错误做点什么
    console.error('请求错误:', error.message);
    
    if (error.response?.status === 401) {
      // 处理未授权错误
      handleUnauthorized();
    }
    
    return Promise.reject(error);
  }
);

// API 方法
export const postsAPI = {
  // 获取所有文章
  getPosts: () => api.get<Post[]>('/posts'),
  
  // 获取单个文章
  getPost: (id: number) => api.get<Post>(`/posts/${id}`),
  
  // 创建文章
  createPost: (data: Omit<Post, 'id'>) => api.post<Post>('/posts', data),
  
  // 更新文章
  updatePost: (id: number, data: Partial<Post>) => 
    api.put<Post>(`/posts/${id}`, data),
  
  // 删除文章
  deletePost: (id: number) => api.delete(`/posts/${id}`),
};

// 辅助函数
function getAuthToken(): string | null {
  // 从 AsyncStorage 或其他地方获取 token
  return null;
}

function handleUnauthorized() {
  // 处理未授权，比如跳转到登录页
  console.log('用户未授权，需要重新登录');
}

export default api;
```

### 使用 Axios

```typescript
import React, {useState, useEffect} from 'react';
import {View, Text, Button, Alert} from 'react-native';
import {postsAPI} from '../services/api';

const AxiosExample: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    
    try {
      const response = await postsAPI.getPosts();
      setPosts(response.data.slice(0, 10));
    } catch (error) {
      Alert.alert('错误', '获取数据失败');
      console.error('获取文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewPost = async () => {
    try {
      const response = await postsAPI.createPost({
        title: '新文章标题',
        body: '这是新文章的内容',
        userId: 1,
      });
      
      setPosts(prevPosts => [response.data, ...prevPosts]);
      Alert.alert('成功', '文章创建成功');
    } catch (error) {
      Alert.alert('错误', '创建文章失败');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <View style={{flex: 1, padding: 20}}>
      <Text style={{fontSize: 24, fontWeight: 'bold', marginBottom: 20}}>
        Axios 示例
      </Text>
      
      <Button title="获取文章" onPress={fetchPosts} disabled={loading} />
      <Button title="创建文章" onPress={createNewPost} />
      
      <Text style={{marginTop: 20}}>
        文章数量: {posts.length}
      </Text>
    </View>
  );
};

export default AxiosExample;
```

## 🔄 数据缓存策略

### 简单内存缓存

```typescript
// src/services/cache.ts
class SimpleCache {
  private cache = new Map<string, {data: any; timestamp: number; ttl: number}>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 默认5分钟
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}

export const cache = new SimpleCache();
```

### 带缓存的 API 服务

```typescript
// src/services/cachedAPI.ts
import {postsAPI} from './api';
import {cache} from './cache';

export const cachedPostsAPI = {
  async getPosts(useCache: boolean = true): Promise<Post[]> {
    const cacheKey = 'posts_list';
    
    if (useCache) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log('使用缓存数据');
        return cachedData;
      }
    }
    
    console.log('从网络获取数据');
    const response = await postsAPI.getPosts();
    const data = response.data;
    
    // 缓存数据
    cache.set(cacheKey, data, 5 * 60 * 1000); // 5分钟
    
    return data;
  },

  async getPost(id: number, useCache: boolean = true): Promise<Post> {
    const cacheKey = `post_${id}`;
    
    if (useCache) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    const response = await postsAPI.getPost(id);
    const data = response.data;
    
    cache.set(cacheKey, data, 10 * 60 * 1000); // 10分钟
    
    return data;
  },
};
```

## 🔄 自定义 Hook 封装

### useAPI Hook

```typescript
// src/hooks/useAPI.ts
import {useState, useEffect, useCallback} from 'react';

interface UseAPIOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useAPI<T>(
  apiFunction: () => Promise<T>,
  options: UseAPIOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [apiFunction, options]);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute, options.immediate]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
```

### 使用自定义 Hook

```typescript
import React from 'react';
import {View, Text, Button, FlatList} from 'react-native';
import {useAPI} from '../hooks/useAPI';
import {cachedPostsAPI} from '../services/cachedAPI';

const APIHookExample: React.FC = () => {
  const {
    data: posts,
    loading,
    error,
    execute: refetch,
  } = useAPI(
    () => cachedPostsAPI.getPosts(),
    {
      onSuccess: (data) => console.log('获取到', data.length, '篇文章'),
      onError: (error) => console.error('获取失败:', error.message),
    }
  );

  const renderPost = ({item}: {item: Post}) => (
    <View style={{padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee'}}>
      <Text style={{fontWeight: 'bold'}}>{item.title}</Text>
      <Text numberOfLines={2}>{item.body}</Text>
    </View>
  );

  return (
    <View style={{flex: 1, padding: 20}}>
      <Text style={{fontSize: 24, fontWeight: 'bold', marginBottom: 20}}>
        API Hook 示例
      </Text>
      
      <Button title="刷新" onPress={refetch} disabled={loading} />
      
      {loading && <Text>加载中...</Text>}
      {error && <Text style={{color: 'red'}}>错误: {error.message}</Text>}
      
      {posts && (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id.toString()}
          style={{marginTop: 20}}
        />
      )}
    </View>
  );
};

export default APIHookExample;
```

## 📱 实际应用示例

### 新闻应用

```typescript
// src/screens/NewsScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useAPI} from '../hooks/useAPI';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  publishedAt: string;
  source: string;
}

// 模拟新闻 API
const fetchNews = async (): Promise<NewsItem[]> => {
  // 实际应用中这里会调用真实的新闻 API
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return Array.from({length: 20}, (_, i) => ({
    id: `news_${i}`,
    title: `新闻标题 ${i + 1}`,
    description: `这是第 ${i + 1} 条新闻的描述内容，包含了重要的信息。`,
    imageUrl: `https://picsum.photos/300/200?random=${i}`,
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    source: `新闻源 ${i % 3 + 1}`,
  }));
};

const NewsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  
  const {data: news, loading, error, execute} = useAPI(fetchNews);

  const onRefresh = async () => {
    setRefreshing(true);
    await execute();
    setRefreshing(false);
  };

  const renderNewsItem = ({item}: {item: NewsItem}) => (
    <TouchableOpacity style={styles.newsItem}>
      <Image source={{uri: item.imageUrl}} style={styles.newsImage} />
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.newsDescription} numberOfLines={3}>
          {item.description}
        </Text>
        <View style={styles.newsFooter}>
          <Text style={styles.newsSource}>{item.source}</Text>
          <Text style={styles.newsTime}>
            {new Date(item.publishedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !news) {
    return (
      <View style={styles.centerContainer}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>加载失败: {error.message}</Text>
        <TouchableOpacity onPress={execute} style={styles.retryButton}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={news}
        renderItem={renderNewsItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newsItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  newsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  newsTime: {
    fontSize: 12,
    color: '#999',
  },
  errorText: {
    color: '#d63031',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NewsScreen;
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ Fetch API 的基本使用方法
- ✅ Axios 库的配置和高级功能
- ✅ 请求和响应拦截器的使用
- ✅ 数据缓存策略的实现
- ✅ 自定义 Hook 封装网络请求
- ✅ 错误处理和重试机制
- ✅ 实际新闻应用的完整实现

## 📝 作业

1. 创建一个天气应用，集成真实的天气 API
2. 实现一个带有搜索功能的用户列表
3. 开发一个支持离线缓存的文章阅读应用
4. 添加请求重试和超时处理机制

准备好学习本地存储了吗？让我们继续[第6章：本地存储](/react-native-tutorial/chapter-06/README.md)！
