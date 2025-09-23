# 常用api和expo SDK

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

未完待续。。。。