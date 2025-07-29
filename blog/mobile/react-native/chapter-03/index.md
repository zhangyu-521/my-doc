# 第3章：导航与路由

## 📖 本章概述

导航是移动应用的核心功能之一。在这一章中，我们将学习如何使用 React Navigation 来实现各种导航模式，包括堆栈导航、标签导航、抽屉导航等。

## 🚀 React Navigation 简介

React Navigation 是 React Native 生态系统中最流行的导航库，提供了原生般的导航体验。

### 主要特性

- **原生性能** - 使用原生导航组件
- **可定制性** - 高度可定制的界面和行为
- **类型安全** - 完整的 TypeScript 支持
- **多种导航模式** - 支持各种常见的导航模式
- **深度链接** - 支持深度链接和 URL 路由

### 核心概念

- **Navigator** - 导航器，管理一组路由
- **Screen** - 屏幕，应用中的一个页面
- **Route** - 路由，包含屏幕信息和参数
- **Navigation** - 导航对象，用于控制导航行为

## 📦 安装和配置

### 安装依赖

```bash
# 安装核心库
npm install @react-navigation/native

# 安装依赖库
npm install react-native-screens react-native-safe-area-context

# iOS 额外步骤
cd ios && pod install

# 安装导航器
npm install @react-navigation/stack
npm install @react-navigation/bottom-tabs
npm install @react-navigation/drawer
```

### 基础配置

```typescript
// App.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import DetailsScreen from './src/screens/DetailsScreen';

// 定义路由参数类型
export type RootStackParamList = {
  Home: undefined;
  Details: {itemId: number; title: string};
};

const Stack = createStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

## 📚 Stack Navigator - 堆栈导航

堆栈导航是最常见的导航模式，类似于网页的前进后退。

### 基本使用

```typescript
// src/screens/HomeScreen.tsx
import React from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>首页</Text>
      <Button
        title="查看详情"
        onPress={() =>
          navigation.navigate('Details', {
            itemId: 86,
            title: '商品详情',
          })
        }
      />
      <Button
        title="推入新页面"
        onPress={() => navigation.push('Details', {itemId: 87, title: '新商品'})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default HomeScreen;
```

```typescript
// src/screens/DetailsScreen.tsx
import React from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../App';

type DetailsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Details'
>;

type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;

interface Props {
  navigation: DetailsScreenNavigationProp;
  route: DetailsScreenRouteProp;
}

const DetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const {itemId, title} = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.itemId}>商品ID: {itemId}</Text>
      
      <Button title="返回" onPress={() => navigation.goBack()} />
      <Button
        title="返回首页"
        onPress={() => navigation.navigate('Home')}
      />
      <Button
        title="替换当前页面"
        onPress={() =>
          navigation.replace('Home')
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  itemId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
});

export default DetailsScreen;
```

### 自定义导航栏

```typescript
// 在 Stack.Navigator 中配置
<Stack.Navigator
  initialRouteName="Home"
  screenOptions={{
    headerStyle: {
      backgroundColor: '#007AFF',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  }}
>
  <Stack.Screen
    name="Home"
    component={HomeScreen}
    options={{
      title: '我的首页',
      headerRight: () => (
        <Button
          onPress={() => alert('设置')}
          title="设置"
          color="#fff"
        />
      ),
    }}
  />
  <Stack.Screen
    name="Details"
    component={DetailsScreen}
    options={({route}) => ({
      title: route.params.title,
      headerBackTitle: '返回',
    })}
  />
</Stack.Navigator>
```

### 导航方法详解

```typescript
// 基本导航方法
navigation.navigate('ScreenName', params); // 导航到指定屏幕
navigation.push('ScreenName', params);     // 推入新屏幕到堆栈
navigation.goBack();                       // 返回上一屏幕
navigation.popToTop();                     // 返回到堆栈顶部
navigation.replace('ScreenName', params);  // 替换当前屏幕

// 高级导航方法
navigation.reset({
  index: 0,
  routes: [{name: 'Home'}],
}); // 重置导航堆栈

navigation.dispatch(
  CommonActions.reset({
    index: 1,
    routes: [
      {name: 'Home'},
      {name: 'Profile'},
    ],
  })
); // 使用 dispatch 重置
```

## 📱 Tab Navigator - 标签导航

标签导航通常用于应用的主要导航结构。

### 底部标签导航

```typescript
// App.tsx - 底部标签导航
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName: string;

            switch (route.name) {
              case 'Home':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Search':
                iconName = focused ? 'search' : 'search-outline';
                break;
              case 'Profile':
                iconName = focused ? 'person' : 'person-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'circle';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: '首页',
            tabBarBadge: 3, // 显示徽章
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            tabBarLabel: '搜索',
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: '我的',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: '设置',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

### 顶部标签导航

```typescript
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';

const TopTab = createMaterialTopTabNavigator();

function TopTabNavigator() {
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarIndicatorStyle: {
          backgroundColor: '#007AFF',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
        },
        tabBarScrollEnabled: true,
      }}
    >
      <TopTab.Screen name="推荐" component={RecommendScreen} />
      <TopTab.Screen name="关注" component={FollowScreen} />
      <TopTab.Screen name="热门" component={HotScreen} />
      <TopTab.Screen name="最新" component={LatestScreen} />
    </TopTab.Navigator>
  );
}
```

## 🗂 Drawer Navigator - 抽屉导航

抽屉导航提供了侧边栏菜单功能。

```typescript
import {createDrawerNavigator} from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#f8f9fa',
          width: 280,
        },
        drawerActiveTintColor: '#007AFF',
        drawerInactiveTintColor: '#666',
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          drawerLabel: '首页',
          drawerIcon: ({color, size}) => (
            <Icon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerLabel: '个人资料',
          drawerIcon: ({color, size}) => (
            <Icon name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerLabel: '设置',
          drawerIcon: ({color, size}) => (
            <Icon name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
```

### 自定义抽屉内容

```typescript
import {DrawerContentScrollView, DrawerItem} from '@react-navigation/drawer';

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Image
          source={{uri: 'https://picsum.photos/80/80'}}
          style={styles.avatar}
        />
        <Text style={styles.userName}>张小明</Text>
        <Text style={styles.userEmail}>zhang@example.com</Text>
      </View>
      
      <DrawerItem
        label="首页"
        onPress={() => props.navigation.navigate('Home')}
        icon={({color, size}) => (
          <Icon name="home-outline" color={color} size={size} />
        )}
      />
      <DrawerItem
        label="个人资料"
        onPress={() => props.navigation.navigate('Profile')}
        icon={({color, size}) => (
          <Icon name="person-outline" color={color} size={size} />
        )}
      />
      <DrawerItem
        label="设置"
        onPress={() => props.navigation.navigate('Settings')}
        icon={({color, size}) => (
          <Icon name="settings-outline" color={color} size={size} />
        )}
      />
      
      <View style={styles.drawerFooter}>
        <DrawerItem
          label="退出登录"
          onPress={() => {
            // 处理退出登录
          }}
          icon={({color, size}) => (
            <Icon name="log-out-outline" color={color} size={size} />
          )}
          labelStyle={{color: '#ff4757'}}
        />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#e0e0e0',
  },
  drawerFooter: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
});
```

## 🔗 嵌套导航

在实际应用中，我们经常需要组合多种导航模式。

### 标签导航 + 堆栈导航

```typescript
// App.tsx - 嵌套导航示例
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';

// 导入屏幕组件
import HomeScreen from './src/screens/HomeScreen';
import DetailsScreen from './src/screens/DetailsScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

// 类型定义
export type HomeStackParamList = {
  HomeMain: undefined;
  Details: {itemId: number; title: string};
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
};

export type TabParamList = {
  HomeStack: undefined;
  Search: undefined;
  ProfileStack: undefined;
};

// 创建导航器
const HomeStack = createStackNavigator<HomeStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// 首页堆栈导航
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{title: '首页'}}
      />
      <HomeStack.Screen
        name="Details"
        component={DetailsScreen}
        options={({route}) => ({title: route.params.title})}
      />
    </HomeStack.Navigator>
  );
}

// 个人资料堆栈导航
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{title: '个人资料'}}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{title: '编辑资料'}}
      />
    </ProfileStack.Navigator>
  );
}

// 主应用导航
function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName: string;

            switch (route.name) {
              case 'HomeStack':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Search':
                iconName = focused ? 'search' : 'search-outline';
                break;
              case 'ProfileStack':
                iconName = focused ? 'person' : 'person-outline';
                break;
              default:
                iconName = 'circle';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerShown: false, // 隐藏标签导航的头部，使用堆栈导航的头部
        })}
      >
        <Tab.Screen
          name="HomeStack"
          component={HomeStackNavigator}
          options={{tabBarLabel: '首页'}}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{tabBarLabel: '搜索'}}
        />
        <Tab.Screen
          name="ProfileStack"
          component={ProfileStackNavigator}
          options={{tabBarLabel: '我的'}}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

### 抽屉导航 + 标签导航

```typescript
function DrawerWithTabsNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          drawerLabel: '主页',
          title: '我的应用',
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerLabel: '设置',
          title: '设置',
        }}
      />
    </Drawer.Navigator>
  );
}
```

## 🎯 导航状态管理

### 获取导航状态

```typescript
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';

const MyScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // 监听屏幕焦点变化
  useFocusEffect(
    React.useCallback(() => {
      console.log('屏幕获得焦点');

      return () => {
        console.log('屏幕失去焦点');
      };
    }, [])
  );

  // 监听导航状态变化
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      console.log('导航状态变化:', e.data.state);
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View>
      <Text>当前路由: {route.name}</Text>
    </View>
  );
};
```

### 导航守卫

```typescript
// 创建一个带有导航守卫的屏幕
function ProtectedScreen({navigation}: any) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    // 检查用户是否已登录
    checkAuthStatus().then(setIsAuthenticated);
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      // 如果未登录，重定向到登录页面
      navigation.replace('Login');
    }
  }, [isAuthenticated, navigation]);

  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  return <ActualScreen />;
}
```

## 🔗 深度链接

深度链接允许用户通过 URL 直接访问应用的特定页面。

### 配置深度链接

```typescript
// App.tsx
const linking = {
  prefixes: ['myapp://'],
  config: {
    screens: {
      Home: 'home',
      Profile: 'profile',
      Details: 'details/:itemId',
      Settings: {
        path: 'settings',
        screens: {
          General: 'general',
          Privacy: 'privacy',
        },
      },
    },
  },
};

function App() {
  return (
    <NavigationContainer linking={linking}>
      {/* 导航器配置 */}
    </NavigationContainer>
  );
}
```

### 处理深度链接

```typescript
import {Linking} from 'react-native';

// 在组件中处理深度链接
const handleDeepLink = (url: string) => {
  // 解析 URL 并导航到相应页面
  if (url.includes('details/')) {
    const itemId = url.split('details/')[1];
    navigation.navigate('Details', {itemId: parseInt(itemId)});
  }
};

React.useEffect(() => {
  // 监听深度链接
  const subscription = Linking.addEventListener('url', ({url}) => {
    handleDeepLink(url);
  });

  // 检查应用启动时的 URL
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url);
    }
  });

  return () => subscription?.remove();
}, []);
```

## 🎨 导航动画

### 自定义过渡动画

```typescript
import {CardStyleInterpolators, TransitionPresets} from '@react-navigation/stack';

<Stack.Navigator
  screenOptions={{
    // 使用预设动画
    ...TransitionPresets.SlideFromRightIOS,
    // 或自定义动画
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    // 自定义过渡时间
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 300,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 300,
        },
      },
    },
  }}
>
  {/* 屏幕配置 */}
</Stack.Navigator>
```

### 手势导航

```typescript
<Stack.Navigator
  screenOptions={{
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    cardOverlayEnabled: true,
    cardShadowEnabled: true,
  }}
>
  {/* 屏幕配置 */}
</Stack.Navigator>
```

## 🎯 实践项目：完整的导航应用

让我们创建一个包含多种导航模式的完整应用：

```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';

// 导入屏幕
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DetailsScreen from '../screens/DetailsScreen';

// 类型定义
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Details: {itemId: number; title: string};
};

export type MainTabParamList = {
  HomeStack: undefined;
  Search: undefined;
  Profile: undefined;
};

export type RootDrawerParamList = {
  MainTabs: undefined;
  Settings: undefined;
};

// 创建导航器
const AuthStack = createStackNavigator<AuthStackParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootDrawer = createDrawerNavigator<RootDrawerParamList>();

// 认证导航
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// 首页堆栈导航
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{title: '首页'}}
      />
      <HomeStack.Screen
        name="Details"
        component={DetailsScreen}
        options={({route}) => ({title: route.params.title})}
      />
    </HomeStack.Navigator>
  );
}

// 主标签导航
function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'HomeStack':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <MainTab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{tabBarLabel: '首页'}}
      />
      <MainTab.Screen
        name="Search"
        component={SearchScreen}
        options={{tabBarLabel: '搜索'}}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: '我的'}}
      />
    </MainTab.Navigator>
  );
}

// 根抽屉导航
function RootDrawerNavigator() {
  return (
    <RootDrawer.Navigator>
      <RootDrawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          drawerLabel: '主页',
          title: '我的应用',
        }}
      />
      <RootDrawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerLabel: '设置',
          title: '设置',
        }}
      />
    </RootDrawer.Navigator>
  );
}

// 主应用导航
export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  // 检查认证状态
  React.useEffect(() => {
    // 这里应该检查实际的认证状态
    // 例如检查 AsyncStorage 中的 token
    checkAuthStatus().then(setIsAuthenticated);
  }, []);

  return (
    <NavigationContainer>
      {isAuthenticated ? <RootDrawerNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// 模拟认证检查
async function checkAuthStatus(): Promise<boolean> {
  // 实际应用中应该检查存储的认证信息
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 1000);
  });
}
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ React Navigation 的安装和基础配置
- ✅ Stack Navigator 堆栈导航的使用
- ✅ Tab Navigator 标签导航的实现
- ✅ Drawer Navigator 抽屉导航的配置
- ✅ 嵌套导航的组合使用
- ✅ 导航状态管理和生命周期
- ✅ 深度链接的配置和处理
- ✅ 导航动画的自定义
- ✅ 完整导航应用的架构设计

## 📝 作业

1. 创建一个包含登录、主页、详情页的完整导航流程
2. 实现一个带有底部标签和侧边抽屉的复合导航
3. 添加深度链接支持，允许通过 URL 直接访问特定页面
4. 自定义导航动画，实现独特的页面切换效果

准备好学习状态管理了吗？让我们继续[第4章：状态管理](/blog/mobile/react-native/chapter-04/)！
```
