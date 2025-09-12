::: v-pre


# Expo Router 使用文档

Expo Router 是一个基于文件系统的路由解决方案，它让你的应用导航变得像创建文件和文件夹一样简单。它为 React Native 和 Web 平台提供了统一的、声明式的导航方式，灵感来源于 Next.js。



## 核心概念

### 1. 文件系统路由

你不需要手动配置路由。只需在 `app/` 目录下创建文件和文件夹，每个文件都会自动成为一个可导航的路由。

| 文件路径 | 对应的路由 |
| :--- | :--- |
| `app/index.js` | `/` (主页) |
| `app/profile.js` | `/profile` |
| `app/settings/account.js` | `/settings/account` |

### 2. 动态路由

使用方括号 `[]` 定义动态参数。

| 文件路径 | 对应的路由 |
| :--- | :--- |
| `app/user/[id].js` | `/user/123` |
| `app/post/[slug].js` | `/post/my-first-post` |

### 3. 布局（Layout）

使用 `_layout.js` 文件来定义父级路由的共享布局，例如导航栏或底部标签栏。

| 文件路径 | 作用 |
| :--- | :--- |
| `app/_layout.js` | 顶级布局，影响所有路由 |
| `app/(tabs)/_layout.js` | 为 `(tabs)` 目录下的所有路由创建标签导航 |



## 常用 API 和组件

### 1. `<Link />` 组件

`<Link />` 是一个用于在应用内导航的组件，类似于网页中的 `<a>` 标签。

#### 属性

  * **`href` (required)**: 导航目标路径。可以是字符串，也可以是包含 `pathname` 和 `params` 的对象。
      * **字符串**：`href="/profile"`
      * **对象**：`href={{ pathname: "/user/[id]", params: { id: "123" } }}`
  * **`replace`**: 如果设置为 `true`，新路由会替换当前路由在导航历史中的位置，而不是推入一个新的路由。
  * **`asChild`**: 允许你将 `Link` 的功能应用于其子组件，例如一个自定义按钮。

#### 示例
``` jsx
import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';

// 简单导航
<Link href="/about">Go to About</Link>

// 动态路由导航
<Link href={{ pathname: "/user/[id]", params: { id: "123" } }}>
  Go to User 123
</Link>

// 将功能应用于自定义按钮
<Link href="/settings" asChild>
  <Pressable>
    <Text>Settings</Text>
  </Pressable>
</Link>
```


### 2. `useRouter()` Hook

`useRouter()` 是一个 Hook，用于通过编程方式进行导航，常用于按钮点击事件或表单提交后

#### 方法
- `replace(href)`: 替换当前路由
- `push(href)`: 推入一个新的路由到导航栈。
- `back()`: 返回上一个路由。
- `canGoBack()`: 返回一个布尔值，表示是否可以返回。
- `setParams(params)`: 更新当前路由的参数。

#### 示例

```jsx
import { useRouter } from 'expo-router';
import { Button } from 'react-native';

export default function Profile() {
  const router = useRouter();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleGoToSettings = () => {
    router.push('/settings');
  };

  return (
    <>
      <Button title="Go Back" onPress={handleGoBack} />
      <Button title="Go to Settings" onPress={handleGoToSettings} />
    </>
  );
}
```



### 3. `useLocalSearchParams()` Hook

`useLocalSearchParams()` 用于获取当前路由中的动态参数。

#### 示例

**`app/post/[slug].js`**

```jsx
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

export default function PostDetail() {
  const { slug } = useLocalSearchParams();

  return (
    <Text>Post: {slug}</Text>
  );
}
```



### 4. `<Stack />` 组件

`<Stack />` 是一个导航容器，用于管理堆栈式导航。通常在 `_layout.js` 文件中使用。

#### 属性

  * **`screenOptions`**: 应用于该堆栈中所有屏幕的默认选项。
  * **`children`**: 包含 `Stack.Screen` 组件。

#### `<Stack.Screen />` 属性

  * **`name` (required)**: 屏幕文件名，不含文件扩展名。
  * **`options`**: 覆盖父级 `screenOptions` 的特定屏幕选项。
      * **`title`**: 导航栏的标题。
      * **`headerShown`**: 是否显示导航栏。
      * **`presentation`**: 定义屏幕的呈现方式，如 `modal`、`card`。
      * **`headerRight`**: 自定义导航栏右侧的内容。

#### 示例

**`app/_layout.js`**

```jsx
import { Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerRight: () => (
            <Pressable>
              <Text>Edit</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="(modals)/info"
        options={{
          presentation: 'modal',
          title: 'Info',
        }}
      />
    </Stack>
  );
}
```



### 5. `<Tabs />` 组件

`<Tabs />` 是一个导航容器，用于管理底部标签导航。通常在分组目录的 `_layout.js` 中使用。

#### 属性

  * **`screenOptions`**: 应用于所有标签页的默认选项。
  * **`children`**: 包含 `Tabs.Screen` 组件。

#### `<Tabs.Screen />` 属性

  * **`name` (required)**: 标签页文件名。
  * **`options`**: 特定标签页的选项。
      * **`title`**: 标签页的标题。
      * **`tabBarIcon`**: 定义标签页图标。
      * **`headerShown`**: 是否显示导航栏。

#### 示例

**`app/(tabs)/_layout.js`**

```jsx
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabRoutesLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cog" color={color} size={26} />
          ),
        }}
      />
    </Tabs>
  );
}
:::