# 第4章：状态管理

## 📖 本章概述

状态管理是 React Native 应用开发的核心概念。在这一章中，我们将深入学习如何使用 React Hooks、Context API 以及第三方状态管理库来管理应用状态。

## 🎯 React Hooks 状态管理

### useState - 本地状态管理

`useState` 是最基础的状态管理 Hook，用于管理组件内部状态。

```typescript
import React, {useState} from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';

const CounterExample: React.FC = () => {
  // 基础状态
  const [count, setCount] = useState(0);
  
  // 对象状态
  const [user, setUser] = useState({
    name: '张三',
    age: 25,
    email: 'zhang@example.com',
  });
  
  // 数组状态
  const [items, setItems] = useState<string[]>([]);
  
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  
  const updateUser = () => {
    setUser(prevUser => ({
      ...prevUser,
      age: prevUser.age + 1,
    }));
  };
  
  const addItem = () => {
    const newItem = `项目 ${items.length + 1}`;
    setItems(prevItems => [...prevItems, newItem]);
  };
  
  const removeItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>状态管理示例</Text>
      
      {/* 计数器 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>计数器: {count}</Text>
        <View style={styles.buttonRow}>
          <Button title="-" onPress={decrement} />
          <Button title="+" onPress={increment} />
        </View>
      </View>
      
      {/* 用户信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>用户信息</Text>
        <Text>姓名: {user.name}</Text>
        <Text>年龄: {user.age}</Text>
        <Text>邮箱: {user.email}</Text>
        <Button title="增加年龄" onPress={updateUser} />
      </View>
      
      {/* 列表管理 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>列表管理 ({items.length} 项)</Text>
        <Button title="添加项目" onPress={addItem} />
        {items.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text>{item}</Text>
            <Button title="删除" onPress={() => removeItem(index)} />
          </View>
        ))}
      </View>
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
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
});

export default CounterExample;
```

### useEffect - 副作用管理

`useEffect` 用于处理副作用，如数据获取、订阅、定时器等。

```typescript
import React, {useState, useEffect} from 'react';
import {View, Text, Button, StyleSheet, Alert} from 'react-native';

const EffectExample: React.FC = () => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 组件挂载时执行
  useEffect(() => {
    console.log('组件已挂载');
    
    // 清理函数（组件卸载时执行）
    return () => {
      console.log('组件将卸载');
    };
  }, []); // 空依赖数组，只在挂载和卸载时执行

  // count 变化时执行
  useEffect(() => {
    console.log('Count 变化:', count);
    
    // 设置文档标题（在 Web 中有效）
    if (count > 10) {
      Alert.alert('提示', '计数已超过 10');
    }
  }, [count]); // 依赖 count

  // 数据获取副作用
  useEffect(() => {
    let isCancelled = false;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isCancelled) {
          setData({
            id: Math.random(),
            message: '数据加载成功',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('数据加载失败:', error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // 清理函数，防止内存泄漏
    return () => {
      isCancelled = true;
    };
  }, []); // 只在组件挂载时执行

  // 定时器副作用
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('定时器执行:', new Date().toLocaleTimeString());
    }, 5000);

    // 清理定时器
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>副作用管理示例</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>计数器: {count}</Text>
        <Button title="增加" onPress={() => setCount(count + 1)} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>数据加载</Text>
        {loading ? (
          <Text>加载中...</Text>
        ) : data ? (
          <View>
            <Text>ID: {data.id}</Text>
            <Text>消息: {data.message}</Text>
            <Text>时间: {data.timestamp}</Text>
          </View>
        ) : (
          <Text>暂无数据</Text>
        )}
      </View>
    </View>
  );
};
```

### useReducer - 复杂状态管理

对于复杂的状态逻辑，`useReducer` 比 `useState` 更适合。

```typescript
import React, {useReducer} from 'react';
import {View, Text, Button, TextInput, StyleSheet} from 'react-native';

// 定义状态类型
interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// 定义动作类型
type TodoAction =
  | {type: 'ADD_TODO'; payload: string}
  | {type: 'TOGGLE_TODO'; payload: number}
  | {type: 'DELETE_TODO'; payload: number}
  | {type: 'SET_FILTER'; payload: 'all' | 'active' | 'completed'}
  | {type: 'CLEAR_COMPLETED'};

// 初始状态
const initialState: TodoState = {
  todos: [],
  filter: 'all',
};

// Reducer 函数
function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: Date.now(),
            text: action.payload,
            completed: false,
          },
        ],
      };
    
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? {...todo, completed: !todo.completed}
            : todo
        ),
      };
    
    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload),
      };
    
    case 'SET_FILTER':
      return {
        ...state,
        filter: action.payload,
      };
    
    case 'CLEAR_COMPLETED':
      return {
        ...state,
        todos: state.todos.filter(todo => !todo.completed),
      };
    
    default:
      return state;
  }
}

const TodoApp: React.FC = () => {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  const [inputText, setInputText] = React.useState('');

  const addTodo = () => {
    if (inputText.trim()) {
      dispatch({type: 'ADD_TODO', payload: inputText.trim()});
      setInputText('');
    }
  };

  const filteredTodos = state.todos.filter(todo => {
    switch (state.filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo 应用</Text>
      
      {/* 添加待办事项 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入待办事项"
          onSubmitEditing={addTodo}
        />
        <Button title="添加" onPress={addTodo} />
      </View>
      
      {/* 过滤器 */}
      <View style={styles.filterContainer}>
        <Button
          title="全部"
          onPress={() => dispatch({type: 'SET_FILTER', payload: 'all'})}
        />
        <Button
          title="进行中"
          onPress={() => dispatch({type: 'SET_FILTER', payload: 'active'})}
        />
        <Button
          title="已完成"
          onPress={() => dispatch({type: 'SET_FILTER', payload: 'completed'})}
        />
      </View>
      
      {/* 待办事项列表 */}
      <View style={styles.todoList}>
        {filteredTodos.map(todo => (
          <View key={todo.id} style={styles.todoItem}>
            <Text
              style={[
                styles.todoText,
                todo.completed && styles.completedText,
              ]}
            >
              {todo.text}
            </Text>
            <View style={styles.todoActions}>
              <Button
                title={todo.completed ? '取消' : '完成'}
                onPress={() => dispatch({type: 'TOGGLE_TODO', payload: todo.id})}
              />
              <Button
                title="删除"
                onPress={() => dispatch({type: 'DELETE_TODO', payload: todo.id})}
                color="#ff4757"
              />
            </View>
          </View>
        ))}
      </View>
      
      {/* 清理已完成 */}
      {state.todos.some(todo => todo.completed) && (
        <Button
          title="清理已完成"
          onPress={() => dispatch({type: 'CLEAR_COMPLETED'})}
          color="#ff6b6b"
        />
      )}
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
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  todoList: {
    flex: 1,
  },
  todoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  todoText: {
    flex: 1,
    fontSize: 16,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  todoActions: {
    flexDirection: 'row',
    gap: 10,
  },
});

export default TodoApp;
```

## 🌐 Context API - 全局状态管理

Context API 允许我们在组件树中共享状态，避免 prop drilling。

### 创建 Context

```typescript
// src/contexts/AppContext.tsx
import React, {createContext, useContext, useReducer, ReactNode} from 'react';

// 定义应用状态
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  language: 'zh' | 'en';
  notifications: Notification[];
}

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

// 定义动作类型
type AppAction =
  | {type: 'SET_USER'; payload: User | null}
  | {type: 'SET_THEME'; payload: 'light' | 'dark'}
  | {type: 'SET_LANGUAGE'; payload: 'zh' | 'en'}
  | {type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'>}
  | {type: 'REMOVE_NOTIFICATION'; payload: number};

// 初始状态
const initialState: AppState = {
  user: null,
  theme: 'light',
  language: 'zh',
  notifications: [],
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {...state, user: action.payload};
    
    case 'SET_THEME':
      return {...state, theme: action.payload};
    
    case 'SET_LANGUAGE':
      return {...state, language: action.payload};
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: Date.now(),
            timestamp: new Date(),
          },
        ],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        ),
      };
    
    default:
      return state;
  }
}

// 创建 Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider 组件
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({children}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{state, dispatch}}>
      {children}
    </AppContext.Provider>
  );
};

// 自定义 Hook
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// 便捷的 Hooks
export const useUser = () => {
  const {state, dispatch} = useAppContext();
  
  const setUser = (user: User | null) => {
    dispatch({type: 'SET_USER', payload: user});
  };
  
  return {user: state.user, setUser};
};

export const useTheme = () => {
  const {state, dispatch} = useAppContext();
  
  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({type: 'SET_THEME', payload: theme});
  };
  
  return {theme: state.theme, setTheme};
};

export const useNotifications = () => {
  const {state, dispatch} = useAppContext();
  
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    dispatch({type: 'ADD_NOTIFICATION', payload: notification});
  };
  
  const removeNotification = (id: number) => {
    dispatch({type: 'REMOVE_NOTIFICATION', payload: id});
  };
  
  return {
    notifications: state.notifications,
    addNotification,
    removeNotification,
  };
};
```

### 使用 Context

```typescript
// App.tsx
import React from 'react';
import {AppProvider} from './src/contexts/AppContext';
import MainApp from './src/components/MainApp';

function App(): JSX.Element {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
```

```typescript
// src/components/UserProfile.tsx
import React from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import {useUser, useTheme, useNotifications} from '../contexts/AppContext';

const UserProfile: React.FC = () => {
  const {user, setUser} = useUser();
  const {theme, setTheme} = useTheme();
  const {addNotification} = useNotifications();

  const login = () => {
    const newUser = {
      id: 1,
      name: '张三',
      email: 'zhang@example.com',
    };
    setUser(newUser);
    addNotification({
      message: '登录成功',
      type: 'success',
    });
  };

  const logout = () => {
    setUser(null);
    addNotification({
      message: '已退出登录',
      type: 'info',
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <View style={[
      styles.container,
      {backgroundColor: theme === 'light' ? '#fff' : '#333'}
    ]}>
      <Text style={[
        styles.title,
        {color: theme === 'light' ? '#333' : '#fff'}
      ]}>
        用户资料
      </Text>
      
      {user ? (
        <View>
          <Text style={[
            styles.userInfo,
            {color: theme === 'light' ? '#666' : '#ccc'}
          ]}>
            姓名: {user.name}
          </Text>
          <Text style={[
            styles.userInfo,
            {color: theme === 'light' ? '#666' : '#ccc'}
          ]}>
            邮箱: {user.email}
          </Text>
          <Button title="退出登录" onPress={logout} />
        </View>
      ) : (
        <Button title="登录" onPress={login} />
      )}
      
      <Button
        title={`切换到${theme === 'light' ? '深色' : '浅色'}主题`}
        onPress={toggleTheme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default UserProfile;
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ useState 进行本地状态管理
- ✅ useEffect 处理副作用
- ✅ useReducer 管理复杂状态逻辑
- ✅ Context API 实现全局状态共享
- ✅ 自定义 Hooks 封装状态逻辑
- ✅ 实际项目中的状态管理最佳实践

## 📝 作业

1. 创建一个购物车应用，使用 useReducer 管理商品状态
2. 实现一个主题切换功能，使用 Context API 全局管理
3. 开发一个通知系统，支持添加、删除和自动消失功能

准备好学习网络请求了吗？让我们继续[第5章：网络请求与数据处理](/blog/mobile/react-native/chapter-05/)！
