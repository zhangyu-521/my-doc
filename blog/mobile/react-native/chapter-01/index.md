# 第1章：React Native入门

## 📖 本章概述

在这一章中，我们将从零开始了解 React Native，包括它的核心概念、优势、开发环境搭建，以及创建第一个应用。这是整个学习旅程的基础，让我们一步步来。

## 🤔 什么是 React Native？

React Native 是由 Facebook（现 Meta）开发的开源框架，让你能够使用 JavaScript 和 React 来构建原生移动应用。

### 核心特点

- **跨平台开发** - 一套代码，同时支持 iOS 和 Android
- **原生性能** - 直接调用原生 API，性能接近原生应用
- **热重载** - 代码修改后立即看到效果，提高开发效率
- **丰富生态** - 庞大的第三方库和社区支持
- **学习成本低** - 如果你会 React，很容易上手

### React Native vs 其他方案

| 特性 | React Native | Flutter | 原生开发 | Web App |
|------|-------------|---------|----------|---------|
| 开发语言 | JavaScript/TypeScript | Dart | Swift/Kotlin | HTML/CSS/JS |
| 性能 | 接近原生 | 接近原生 | 最佳 | 较差 |
| 开发效率 | 高 | 高 | 低 | 最高 |
| 学习成本 | 低（React基础） | 中等 | 高 | 最低 |
| 社区支持 | 非常好 | 好 | 好 | 好 |

## 🛠 开发环境搭建

### 系统要求

**Windows 开发者：**
- Windows 10/11
- Node.js 16+ 
- Android Studio
- JDK 11

**macOS 开发者：**
- macOS 10.15+
- Node.js 16+
- Xcode 12+
- Android Studio（可选）

### 步骤1：安装 Node.js

访问 [Node.js 官网](https://nodejs.org/) 下载并安装 LTS 版本。

```bash
# 验证安装
node --version
npm --version
```

### 步骤2：安装开发工具

**选择开发方式：**

1. **Expo CLI** - 适合初学者，快速开始
2. **React Native CLI** - 完整的原生开发体验

我们推荐从 Expo 开始，然后逐步过渡到 React Native CLI。

```bash
# 安装 Expo CLI
npm install -g @expo/cli

# 或安装 React Native CLI
npm install -g react-native-cli
```

### 步骤3：Android 开发环境（Windows/macOS）

1. **下载 Android Studio**
   - 访问 [Android Studio 官网](https://developer.android.com/studio)
   - 下载并安装最新版本

2. **配置 Android SDK**
   ```bash
   # 设置环境变量（Windows）
   ANDROID_HOME=C:\Users\你的用户名\AppData\Local\Android\Sdk
   
   # 设置环境变量（macOS/Linux）
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **创建虚拟设备**
   - 打开 Android Studio
   - 点击 "AVD Manager"
   - 创建一个新的虚拟设备

### 步骤4：iOS 开发环境（仅 macOS）

1. **安装 Xcode**
   - 从 App Store 安装 Xcode
   - 安装 Xcode Command Line Tools
   ```bash
   xcode-select --install
   ```

2. **安装 CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

## 🚀 创建第一个应用

### 使用 Expo 创建项目

```bash
# 创建新项目
npx create-expo-app MyFirstApp

# 进入项目目录
cd MyFirstApp

# 启动开发服务器
npx expo start
```

### 使用 React Native CLI 创建项目

```bash
# 创建新项目
npx react-native init MyFirstApp

# 进入项目目录
cd MyFirstApp

# 启动 Metro 服务器
npx react-native start

# 在新终端中运行应用
npx react-native run-android
# 或
npx react-native run-ios
```

## 📁 项目结构详解

让我们看看一个典型的 React Native 项目结构：

```
MyFirstApp/
├── android/                 # Android 原生代码
├── ios/                     # iOS 原生代码
├── node_modules/            # 依赖包
├── src/                     # 源代码目录（推荐）
│   ├── components/          # 可复用组件
│   ├── screens/             # 页面组件
│   ├── navigation/          # 导航配置
│   ├── services/            # API 服务
│   ├── utils/               # 工具函数
│   └── types/               # TypeScript 类型定义
├── App.tsx                  # 应用入口文件
├── index.js                 # 注册入口
├── package.json             # 项目配置
├── metro.config.js          # Metro 打包配置
└── babel.config.js          # Babel 配置
```

### 核心文件说明

**App.tsx** - 应用的根组件
```typescript
import React from 'react';
import {SafeAreaView, Text, StyleSheet} from 'react-native';

function App(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Hello React Native!</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default App;
```

**index.js** - 应用注册入口
```javascript
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

## 🔧 调试工具

### 1. React Native Debugger

强大的调试工具，集成了 Redux DevTools 和 React DevTools。

```bash
# 安装
npm install -g react-native-debugger
```

### 2. Flipper

Facebook 开发的移动应用调试平台。

- 网络请求监控
- 布局检查器
- 日志查看
- 性能分析

### 3. Chrome DevTools

在 Chrome 中调试 JavaScript 代码。

```bash
# 启用远程调试
# 在模拟器中按 Ctrl+M (Android) 或 Cmd+D (iOS)
# 选择 "Debug JS Remotely"
```

### 4. 常用调试命令

```bash
# 重新加载应用
# Android: 双击 R 键
# iOS: Cmd+R

# 打开开发者菜单
# Android: Ctrl+M 或摇晃设备
# iOS: Cmd+D 或摇晃设备

# 查看日志
npx react-native log-android
npx react-native log-ios
```

## 💡 开发技巧

### 1. 热重载 vs 快速刷新

- **热重载** - 保持应用状态，只更新修改的组件
- **快速刷新** - 更智能的热重载，自动处理错误

### 2. 代码组织建议

```typescript
// 推荐的组件结构
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

// 类型定义
interface Props {
  title: string;
  onPress?: () => void;
}

// 组件实现
const MyComponent: React.FC<Props> = ({title, onPress}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

// 样式定义
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MyComponent;
```

### 3. 性能优化提示

- 使用 `React.memo` 避免不必要的重渲染
- 合理使用 `useCallback` 和 `useMemo`
- 避免在 render 中创建新对象
- 使用 `FlatList` 而不是 `ScrollView` 处理长列表

## 🎯 实践练习

### 练习1：修改欢迎页面

修改 `App.tsx`，创建一个个人介绍页面：

```typescript
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';

function App(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <Image
            source={{
              uri: 'https://via.placeholder.com/100x100.png?text=Avatar',
            }}
            style={styles.avatar}
          />
          <Text style={styles.name}>张三</Text>
          <Text style={styles.title}>前端开发工程师</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于我</Text>
          <Text style={styles.description}>
            热爱技术的前端开发者，专注于 React Native 移动应用开发。
            喜欢学习新技术，分享开发经验。
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>技能</Text>
          <Text style={styles.skill}>• React Native</Text>
          <Text style={styles.skill}>• TypeScript</Text>
          <Text style={styles.skill}>• React</Text>
          <Text style={styles.skill}>• Node.js</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  skill: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default App;
```

### 练习2：添加交互功能

在上面的基础上，添加一个按钮来切换主题：

```typescript
import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

function App(): JSX.Element {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const themeStyles = isDarkMode ? darkStyles : lightStyles;
  
  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, themeStyles.text]}>
          React Native 入门
        </Text>
        <TouchableOpacity 
          style={[styles.button, themeStyles.button]} 
          onPress={toggleTheme}
        >
          <Text style={[styles.buttonText, themeStyles.buttonText]}>
            切换到{isDarkMode ? '浅色' : '深色'}主题
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  text: {
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
  },
  text: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#333',
    borderColor: '#666',
  },
  buttonText: {
    color: '#fff',
  },
});

export default App;
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ React Native 的基本概念和优势
- ✅ 开发环境的搭建（Windows/macOS）
- ✅ 创建第一个 React Native 应用
- ✅ 项目结构和核心文件的作用
- ✅ 调试工具的使用
- ✅ 基本的开发技巧和最佳实践

## 🔗 相关资源

- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- [Expo 文档](https://docs.expo.dev/)
- [React Native 环境搭建](https://reactnative.dev/docs/environment-setup)

## 📝 作业

1. 完成上面的两个练习
2. 尝试修改样式，创建自己的个人介绍页面
3. 探索 React Native 官方文档，了解更多组件

## 🚨 常见问题解决

### 问题1：Metro 服务器启动失败

**错误信息：**
```
Error: ENOSPC: System limit for number of file watchers reached
```

**解决方案：**
```bash
# Linux/macOS
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 或临时解决
echo 524288 | sudo tee -a /proc/sys/fs/inotify/max_user_watches
```

### 问题2：Android 模拟器连接失败

**解决步骤：**
1. 确保 Android Studio 中的虚拟设备正在运行
2. 检查 ADB 连接：
```bash
adb devices
```
3. 重启 ADB 服务：
```bash
adb kill-server
adb start-server
```

### 问题3：iOS 模拟器白屏

**解决方案：**
```bash
# 清理项目
cd ios
rm -rf build
cd ..
npx react-native clean

# 重新安装 pods
cd ios
pod install
cd ..

# 重新运行
npx react-native run-ios
```

### 问题4：依赖安装失败

**解决方案：**
```bash
# 清理缓存
npm cache clean --force
# 或
yarn cache clean

# 删除 node_modules 重新安装
rm -rf node_modules
npm install
# 或
yarn install
```

## 🔍 深入理解

### React Native 架构

React Native 采用了独特的架构设计：

1. **JavaScript 线程** - 运行你的应用逻辑
2. **原生线程** - 处理 UI 渲染和原生功能
3. **Bridge** - 连接 JavaScript 和原生代码

```
┌─────────────────┐    Bridge    ┌─────────────────┐
│   JavaScript    │ ←──────────→ │   Native Code   │
│   (React)       │              │   (iOS/Android) │
└─────────────────┘              └─────────────────┘
```

### 组件生命周期

React Native 组件遵循 React 的生命周期：

```typescript
import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';

const LifecycleExample: React.FC = () => {
  const [count, setCount] = useState(0);

  // 组件挂载时执行
  useEffect(() => {
    console.log('Component mounted');

    // 清理函数（组件卸载时执行）
    return () => {
      console.log('Component unmounted');
    };
  }, []);

  // count 变化时执行
  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  return (
    <View>
      <Text>Count: {count}</Text>
    </View>
  );
};
```

### 性能考虑

React Native 的性能优化要点：

1. **避免不必要的重渲染**
```typescript
// 使用 React.memo
const OptimizedComponent = React.memo(({data}) => {
  return <Text>{data.title}</Text>;
});

// 使用 useCallback
const handlePress = useCallback(() => {
  // 处理点击
}, [dependency]);
```

2. **合理使用状态**
```typescript
// 避免在 render 中创建对象
const BadExample = () => {
  return <View style={{flex: 1}} />; // 每次都创建新对象
};

// 推荐做法
const styles = StyleSheet.create({
  container: {flex: 1},
});

const GoodExample = () => {
  return <View style={styles.container} />;
};
```

## 🎨 样式系统预览

React Native 使用类似 CSS 的样式系统，但有一些重要区别：

### 基本样式

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,                    // 类似 CSS flex: 1
    backgroundColor: '#f0f0f0', // 驼峰命名
    paddingHorizontal: 20,      // 水平内边距
    paddingVertical: 10,        // 垂直内边距
  },
  text: {
    fontSize: 16,               // 不需要单位
    fontWeight: 'bold',         // 字符串值
    color: '#333333',           // 颜色值
    textAlign: 'center',        // 文本对齐
  },
});
```

### 布局系统

React Native 默认使用 Flexbox 布局：

```typescript
const layoutStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',       // 水平排列
    justifyContent: 'space-between', // 主轴对齐
    alignItems: 'center',       // 交叉轴对齐
  },
  column: {
    flexDirection: 'column',    // 垂直排列（默认）
    flex: 1,                    // 占满可用空间
  },
});
```

## 📱 平台差异

React Native 允许你为不同平台编写特定代码：

### 平台检测

```typescript
import {Platform} from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
});

// 或使用 Platform.select
const platformStyles = StyleSheet.create({
  text: {
    ...Platform.select({
      ios: {
        fontFamily: 'Helvetica',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
});
```

### 平台特定文件

你可以创建平台特定的文件：

```
components/
├── Button.ios.tsx      # iOS 专用
├── Button.android.tsx  # Android 专用
└── Button.tsx          # 通用版本
```

## 🎯 进阶练习

### 练习3：创建一个简单的计数器应用

```typescript
import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

const CounterApp: React.FC = () => {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => {
    Alert.alert(
      '重置确认',
      '确定要重置计数器吗？',
      [
        {text: '取消', style: 'cancel'},
        {text: '确定', onPress: () => setCount(0)},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>计数器应用</Text>
        <Text style={styles.counter}>{count}</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={decrement}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>重置</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={increment}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.info}>
          {count === 0 && '开始计数吧！'}
          {count > 0 && `已增加 ${count} 次`}
          {count < 0 && `已减少 ${Math.abs(count)} 次`}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  counter: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    marginHorizontal: 10,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  info: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CounterApp;
```

准备好了吗？让我们继续学习[第2章：核心组件与布局](/react-native-tutorial/chapter-02/README.md)！
