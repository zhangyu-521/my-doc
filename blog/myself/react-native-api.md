# 常用api和expo SDK

::: tip
屏幕   → PixelRatio + Dimensions + SafeArea  
平台   → Platform + DeviceInfo + Localization  
网络   → NetInfo + fetch  
存储   → AsyncStorage + FileSystem  
反馈   → Haptics + Brightness + Keyboard  
生命周期 → AppState + BackHandler + Orientation  
剪贴板 → Clipboard  
本地化 → Localization
:::

## 屏幕 & 密度（PixelRatio + Dimensions）

``` ts
import { PixelRatio, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const scale = PixelRatio.get();        // 密度因子
const onePx = 1 / scale;               // 真正 1 物理像素
const fontScale = PixelRatio.getFontScale(); // 用户字体放大比例
```
**用途**: 边框 1px、图标多倍图、字体大小自适应。



## 平台判断（Platform）
``` ts
import { Platform } from 'react-native';

Platform.OS;          // 'ios' | 'android'
Platform.Version;     // iOS 17.2 | Android API 34
Platform.isPad;       // 仅 iOS，判断 iPad
Platform.select({ ios: 'iOS值', android: 'Android值' }); // 一行分支
```
**用途**: 不同平台走不同逻辑


## 系统信息（DeviceInfo 官方子包）

``` bash
# Expo
npx expo install expo-device
# 裸 RN
npm i react-native-device-info
```

``` ts
import * as Device from 'expo-device';   // 或 import DeviceInfo from 'react-native-device-info'

Device.modelName;      // iPhone 15 | SM-G998B
Device.osVersion;      // 17.2 | 14
Device.osBuildId;      // 21F79 | TP1A.220624.014
Device.isDevice;       // true = 真机；false = 模拟器
```

**用途**: 机/模拟器判断、日志上传、性能采样。

## 网络状态（NetInfo）

``` bash
npx expo install @react-native-community/netinfo
```

``` ts
import NetInfo from '@react-native-community/netinfo';

NetInfo.fetch().then(state => {
  const { type, isConnected, isInternetReachable, details } = state;
  // type: wifi/cellular/unknown/none
  // details.ipAddress / details.ssid (iOS only)
});
```

**用途**：弱网提示、自动切换离线数据源、Wi-Fi 名称显示。


## 本地持久化（AsyncStorage）

``` bash
npx expo install @react-native-async-storage/async-storage
```

``` ts
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('@token', 'abc123');
const token = await AsyncStorage.getItem('@token');
await AsyncStorage.removeItem('@token');
```
**用途**：登录 token、主题色、引导页标记。


## 震动反馈（Haptics）
``` bash
npx expo install expo-haptics
```

``` ts
import * as Haptics from 'expo-haptics';

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // 轻点
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // 成功
```

**用途**：按钮点击、扫码成功、滑块拖动。


##  图片多倍图（PixelRatio + require）
``` ts
const scale = PixelRatio.get();
const img =
  scale >= 3 ? require('./img@3x.png') :
  scale >= 2 ? require('./img@2x.png') :
  require('./img.png');
```
**用途**：图标、启动图、Banner 高清显示。


## 安全区（SafeAreaView）
``` tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
  <YourContent />
</SafeAreaView>
```
**用途**：刘海、挖孔、Home Indicator 避让。

## 深色模式（Appearance）
``` ts
import { Appearance } from 'react-native';

const colorScheme = Appearance.getColorScheme(); // 'light' | 'dark'
Appearance.addChangeListener(({ colorScheme }) => {
  // 用户切换深色
});
```

**用途**：主题切换、StatusBar 颜色联动。

## 1px 边框（PixelRatio）
``` ts
const styles = StyleSheet.create({
  hairLine: {
    borderWidth: 1 / PixelRatio.get(), // 真实 1 物理像素
    borderColor: '#ccc',
  },
});
```
**用途**：细线、分隔线、表单下划线。

## 设备方向（Orientation）
``` bash
npx expo install expo-screen-orientation
```
``` ts
import * as Orientation from 'expo-screen-orientation';

await Orientation.lockAsync(Orientation.OrientationLock.PORTRAIT);
```

**用途**：视频播放器、扫描页强制竖屏。

## 状态栏沉浸（StatusBar）
``` tsx
import { StatusBar } from 'expo-status-bar';

<StatusBar style="dark" backgroundColor="#fff" translucent />
```

**用途**：沉浸式标题栏、深色/浅色文字。

## 文件系统（FileSystem）
``` bash
npx expo install expo-file-system
```

``` ts
import * as FileSystem from 'expo-file-system';

const uri = FileSystem.cacheDirectory + 'demo.json';
await FileSystem.writeAsStringAsync(uri, JSON.stringify({a: 1}));
const content = await FileSystem.readAsStringAsync(uri);
```

**用途**：离线缓存、大文件下载、日志落盘。


##  网络请求（fetch）本地文件
``` ts
const [{ localUri }] = await Asset.loadAsync(require('./assets/data.json'));
const res = await fetch(localUri); // file:///xxx
const data = await res.json();
```

**用途**：本地 JSON、SQLite 预置库、离线地图。


## 键盘行为（Keyboard）
``` bash
npx expo install react-native-keyboard-controller
```
``` ts
import { KeyboardController } from 'react-native-keyboard-controller';

KeyboardController.setInputMode(KeyboardController.INPUT_MODE_ADJUST_RESIZE);
```

**用途**：聊天输入框顶起、表单不被键盘遮挡。

##  返回键（BackHandler）
``` ts
import { BackHandler } from 'react-native';

BackHandler.addEventListener('hardwareBackPress', () => {
  // 自定义返回逻辑
  return true; // 阻止默认返回
});
```

**用途**：双击退出、聊天页返回拦截。

## 应用状态（AppState）
``` ts
import { AppState } from 'react-native';

AppState.addEventListener('change', (state) => {
  if (state === 'background') saveDraft();
  if (state === 'active') restoreDraft();
});
```

**用途**：切后台保存草稿、暂停视频、停止定位。

## 亮度（Brightness）
``` bash
npx expo install expo-brightness
```
``` ts
import * as Brightness from 'expo-brightness';

await Brightness.setBrightnessAsync(0.8); // 0-1
```

**用途**：阅读器、视频播放器、扫码强光。

## 剪贴板（Clipboard）
``` bash
npx expo install expo-clipboard
```
``` ts
import * as Clipboard from 'expo-clipboard';

await Clipboard.setStringAsync('hello');
const text = await Clipboard.getStringAsync();
```
**用途**：复制链接、分享口令、扫码结果。

## 本地化（Localization）
``` bash
npx expo install expo-localization
```
``` ts
import * as Localization from 'expo-localization';

const locale = Localization.locale;           // zh-CN
const locales = Localization.locales;         // 用户语言列表
const timezone = Localization.timezone;       // Asia/Shanghai
const isRTL = Localization.isRTL;             // 是否右到左
```
**用途**：多语言、时区、日期格式、RTL 布局。
