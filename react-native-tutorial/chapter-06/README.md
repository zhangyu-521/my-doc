# 第6章：本地存储

## 📖 本章概述

本地存储是移动应用的重要功能，用于保存用户数据、应用设置、缓存等。本章将介绍 React Native 中的各种存储方案，包括 AsyncStorage、安全存储、SQLite 数据库等。

## 💾 AsyncStorage - 异步存储

AsyncStorage 是 React Native 中最常用的本地存储方案，提供了简单的键值对存储。

### 安装和基本使用

```bash
npm install @react-native-async-storage/async-storage
```

```typescript
// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  // 存储字符串
  static async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('存储字符串失败:', error);
      throw error;
    }
  }

  // 获取字符串
  static async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('获取字符串失败:', error);
      return null;
    }
  }

  // 存储对象
  static async setObject(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('存储对象失败:', error);
      throw error;
    }
  }

  // 获取对象
  static async getObject<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('获取对象失败:', error);
      return null;
    }
  }

  // 删除数据
  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('删除数据失败:', error);
      throw error;
    }
  }

  // 清空所有数据
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('清空数据失败:', error);
      throw error;
    }
  }

  // 获取所有键
  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('获取所有键失败:', error);
      return [];
    }
  }

  // 批量操作
  static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('批量存储失败:', error);
      throw error;
    }
  }

  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('批量获取失败:', error);
      return [];
    }
  }
}
```

### 实际使用示例

```typescript
// src/screens/SettingsScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Switch,
  Button,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import {StorageService} from '../services/storage';

interface UserSettings {
  username: string;
  notifications: boolean;
  theme: 'light' | 'dark';
  language: 'zh' | 'en';
}

const defaultSettings: UserSettings = {
  username: '',
  notifications: true,
  theme: 'light',
  language: 'zh',
};

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await StorageService.getObject<UserSettings>('userSettings');
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      Alert.alert('错误', '加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存设置
  const saveSettings = async () => {
    try {
      await StorageService.setObject('userSettings', settings);
      Alert.alert('成功', '设置已保存');
    } catch (error) {
      Alert.alert('错误', '保存设置失败');
    }
  };

  // 重置设置
  const resetSettings = async () => {
    Alert.alert(
      '确认重置',
      '确定要重置所有设置吗？',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '确定',
          onPress: async () => {
            try {
              await StorageService.remove('userSettings');
              setSettings(defaultSettings);
              Alert.alert('成功', '设置已重置');
            } catch (error) {
              Alert.alert('错误', '重置设置失败');
            }
          },
        },
      ]
    );
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({...prev, [key]: value}));
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>应用设置</Text>

      {/* 用户名设置 */}
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>用户名</Text>
        <TextInput
          style={styles.textInput}
          value={settings.username}
          onChangeText={(value) => updateSetting('username', value)}
          placeholder="请输入用户名"
        />
      </View>

      {/* 通知设置 */}
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>推送通知</Text>
        <Switch
          value={settings.notifications}
          onValueChange={(value) => updateSetting('notifications', value)}
        />
      </View>

      {/* 主题设置 */}
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>主题</Text>
        <View style={styles.buttonGroup}>
          <Button
            title="浅色"
            onPress={() => updateSetting('theme', 'light')}
            color={settings.theme === 'light' ? '#007AFF' : '#999'}
          />
          <Button
            title="深色"
            onPress={() => updateSetting('theme', 'dark')}
            color={settings.theme === 'dark' ? '#007AFF' : '#999'}
          />
        </View>
      </View>

      {/* 语言设置 */}
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>语言</Text>
        <View style={styles.buttonGroup}>
          <Button
            title="中文"
            onPress={() => updateSetting('language', 'zh')}
            color={settings.language === 'zh' ? '#007AFF' : '#999'}
          />
          <Button
            title="English"
            onPress={() => updateSetting('language', 'en')}
            color={settings.language === 'en' ? '#007AFF' : '#999'}
          />
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={styles.actionButtons}>
        <Button title="保存设置" onPress={saveSettings} />
        <Button title="重置设置" onPress={resetSettings} color="#ff4757" />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButtons: {
    marginTop: 30,
    gap: 15,
  },
});

export default SettingsScreen;
```

## 🔐 安全存储

对于敏感数据（如密码、token 等），需要使用更安全的存储方案。

### React Native Keychain

```bash
npm install react-native-keychain
```

```typescript
// src/services/secureStorage.ts
import * as Keychain from 'react-native-keychain';

export class SecureStorageService {
  // 存储用户凭据
  static async setCredentials(username: string, password: string): Promise<boolean> {
    try {
      await Keychain.setCredentials(username, password);
      return true;
    } catch (error) {
      console.error('存储凭据失败:', error);
      return false;
    }
  }

  // 获取用户凭据
  static async getCredentials(): Promise<{username: string; password: string} | null> {
    try {
      const credentials = await Keychain.getCredentials();
      if (credentials) {
        return {
          username: credentials.username,
          password: credentials.password,
        };
      }
      return null;
    } catch (error) {
      console.error('获取凭据失败:', error);
      return null;
    }
  }

  // 删除凭据
  static async removeCredentials(): Promise<boolean> {
    try {
      await Keychain.resetCredentials();
      return true;
    } catch (error) {
      console.error('删除凭据失败:', error);
      return false;
    }
  }

  // 存储通用安全数据
  static async setSecureData(key: string, value: string): Promise<boolean> {
    try {
      await Keychain.setCredentials(key, value, {
        service: key,
      });
      return true;
    } catch (error) {
      console.error('存储安全数据失败:', error);
      return false;
    }
  }

  // 获取通用安全数据
  static async getSecureData(key: string): Promise<string | null> {
    try {
      const result = await Keychain.getCredentials({
        service: key,
      });
      return result ? result.password : null;
    } catch (error) {
      console.error('获取安全数据失败:', error);
      return null;
    }
  }

  // 删除通用安全数据
  static async removeSecureData(key: string): Promise<boolean> {
    try {
      await Keychain.resetCredentials({
        service: key,
      });
      return true;
    } catch (error) {
      console.error('删除安全数据失败:', error);
      return false;
    }
  }
}
```

## 🗄️ SQLite 数据库

对于复杂的数据存储需求，SQLite 是一个很好的选择。

### 安装 React Native SQLite Storage

```bash
npm install react-native-sqlite-storage
```

```typescript
// src/services/database.ts
import SQLite from 'react-native-sqlite-storage';

// 启用调试
SQLite.DEBUG(true);
SQLite.enablePromise(true);

export interface User {
  id?: number;
  name: string;
  email: string;
  age: number;
  createdAt?: string;
}

export class DatabaseService {
  private static db: SQLite.SQLiteDatabase;

  // 初始化数据库
  static async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'MyApp.db',
        location: 'default',
      });

      await this.createTables();
      console.log('数据库初始化成功');
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  // 创建表
  private static async createTables(): Promise<void> {
    const createUserTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.executeSql(createUserTable);
  }

  // 插入用户
  static async insertUser(user: Omit<User, 'id' | 'createdAt'>): Promise<number> {
    try {
      const result = await this.db.executeSql(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        [user.name, user.email, user.age]
      );
      return result[0].insertId;
    } catch (error) {
      console.error('插入用户失败:', error);
      throw error;
    }
  }

  // 获取所有用户
  static async getAllUsers(): Promise<User[]> {
    try {
      const result = await this.db.executeSql('SELECT * FROM users ORDER BY created_at DESC');
      const users: User[] = [];
      
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        users.push({
          id: row.id,
          name: row.name,
          email: row.email,
          age: row.age,
          createdAt: row.created_at,
        });
      }
      
      return users;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  // 根据ID获取用户
  static async getUserById(id: number): Promise<User | null> {
    try {
      const result = await this.db.executeSql('SELECT * FROM users WHERE id = ?', [id]);
      
      if (result[0].rows.length > 0) {
        const row = result[0].rows.item(0);
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          age: row.age,
          createdAt: row.created_at,
        };
      }
      
      return null;
    } catch (error) {
      console.error('获取用户失败:', error);
      throw error;
    }
  }

  // 更新用户
  static async updateUser(id: number, user: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<boolean> {
    try {
      const fields = Object.keys(user).map(key => `${key} = ?`).join(', ');
      const values = Object.values(user);
      
      const result = await this.db.executeSql(
        `UPDATE users SET ${fields} WHERE id = ?`,
        [...values, id]
      );
      
      return result[0].rowsAffected > 0;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  // 删除用户
  static async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await this.db.executeSql('DELETE FROM users WHERE id = ?', [id]);
      return result[0].rowsAffected > 0;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  // 搜索用户
  static async searchUsers(keyword: string): Promise<User[]> {
    try {
      const result = await this.db.executeSql(
        'SELECT * FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC',
        [`%${keyword}%`, `%${keyword}%`]
      );
      
      const users: User[] = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        users.push({
          id: row.id,
          name: row.name,
          email: row.email,
          age: row.age,
          createdAt: row.created_at,
        });
      }
      
      return users;
    } catch (error) {
      console.error('搜索用户失败:', error);
      throw error;
    }
  }

  // 关闭数据库
  static async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }
}
```

### 使用 SQLite 数据库

```typescript
// src/screens/UserManagementScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {DatabaseService, User} from '../services/database';

const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    age: '',
  });

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try {
      await DatabaseService.init();
      await loadUsers();
    } catch (error) {
      Alert.alert('错误', '数据库初始化失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const userList = await DatabaseService.getAllUsers();
      setUsers(userList);
    } catch (error) {
      Alert.alert('错误', '加载用户列表失败');
    }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.age) {
      Alert.alert('错误', '请填写完整信息');
      return;
    }

    try {
      await DatabaseService.insertUser({
        name: newUser.name,
        email: newUser.email,
        age: parseInt(newUser.age),
      });
      
      setNewUser({name: '', email: '', age: ''});
      setShowAddForm(false);
      await loadUsers();
      Alert.alert('成功', '用户添加成功');
    } catch (error) {
      Alert.alert('错误', '添加用户失败');
    }
  };

  const deleteUser = async (id: number) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个用户吗？',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteUser(id);
              await loadUsers();
              Alert.alert('成功', '用户删除成功');
            } catch (error) {
              Alert.alert('错误', '删除用户失败');
            }
          },
        },
      ]
    );
  };

  const searchUsers = async () => {
    if (!searchKeyword.trim()) {
      await loadUsers();
      return;
    }

    try {
      const searchResults = await DatabaseService.searchUsers(searchKeyword);
      setUsers(searchResults);
    } catch (error) {
      Alert.alert('错误', '搜索失败');
    }
  };

  const renderUser = ({item}: {item: User}) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userAge}>年龄: {item.age}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteUser(item.id!)}
      >
        <Text style={styles.deleteButtonText}>删除</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>初始化数据库...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>用户管理</Text>

      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          placeholder="搜索用户..."
        />
        <Button title="搜索" onPress={searchUsers} />
      </View>

      {/* 添加用户按钮 */}
      <Button
        title={showAddForm ? '取消添加' : '添加用户'}
        onPress={() => setShowAddForm(!showAddForm)}
      />

      {/* 添加用户表单 */}
      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            value={newUser.name}
            onChangeText={(text) => setNewUser({...newUser, name: text})}
            placeholder="姓名"
          />
          <TextInput
            style={styles.input}
            value={newUser.email}
            onChangeText={(text) => setNewUser({...newUser, email: text})}
            placeholder="邮箱"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            value={newUser.age}
            onChangeText={(text) => setNewUser({...newUser, age: text})}
            placeholder="年龄"
            keyboardType="numeric"
          />
          <Button title="添加" onPress={addUser} />
        </View>
      )}

      {/* 用户列表 */}
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id!.toString()}
        style={styles.userList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>暂无用户数据</Text>
        }
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
  },
  addForm: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  userList: {
    flex: 1,
    marginTop: 15,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userAge: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 50,
  },
});

export default UserManagementScreen;
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ AsyncStorage 的基本使用和封装
- ✅ 安全存储敏感数据的方法
- ✅ SQLite 数据库的集成和使用
- ✅ 不同存储方案的适用场景
- ✅ 数据持久化的最佳实践

## 📝 作业

1. 创建一个笔记应用，支持本地存储和搜索
2. 实现用户登录状态的持久化存储
3. 开发一个离线优先的待办事项应用
4. 添加数据备份和恢复功能

准备好学习原生功能了吗？让我们继续[第7章：原生功能集成](/react-native-tutorial/chapter-07/README.md)！
