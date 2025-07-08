# 第7章：原生功能集成

## 📖 本章概述

React Native 的强大之处在于能够轻松集成原生功能。本章将介绍如何使用相机、地理位置、推送通知、设备信息等原生功能，让你的应用更加丰富和实用。

## 📷 相机和相册功能

### 安装 React Native Image Picker

```bash
npm install react-native-image-picker
```

### 权限配置

**Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

**iOS (ios/YourApp/Info.plist):**
```xml
<key>NSCameraUsageDescription</key>
<string>此应用需要访问相机来拍照</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>此应用需要访问相册来选择照片</string>
```

### 相机功能实现

```typescript
// src/components/ImagePickerComponent.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  ImagePickerResponse,
  launchImageLibrary,
  launchCamera,
  MediaType,
} from 'react-native-image-picker';

const {width} = Dimensions.get('window');

interface ImagePickerComponentProps {
  onImageSelected?: (imageUri: string) => void;
}

const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({
  onImageSelected,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const showImagePicker = () => {
    Alert.alert(
      '选择图片',
      '请选择图片来源',
      [
        {text: '取消', style: 'cancel'},
        {text: '相机', onPress: openCamera},
        {text: '相册', onPress: openImageLibrary},
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchCamera(options, handleImageResponse);
  };

  const openImageLibrary = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, handleImageResponse);
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const imageUri = response.assets[0].uri;
      if (imageUri) {
        setSelectedImage(imageUri);
        onImageSelected?.(imageUri);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>图片选择器</Text>
      
      <TouchableOpacity style={styles.selectButton} onPress={showImagePicker}>
        <Text style={styles.selectButtonText}>选择图片</Text>
      </TouchableOpacity>

      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{uri: selectedImage}} style={styles.selectedImage} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.removeButtonText}>移除图片</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: width - 40,
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  removeButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ImagePickerComponent;
```

## 📍 地理位置服务

### 安装 Geolocation

```bash
npm install @react-native-community/geolocation
```

### 权限配置

**Android:**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**iOS:**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>此应用需要访问位置信息来提供基于位置的服务</string>
```

### 地理位置功能实现

```typescript
// src/components/LocationComponent.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

const LocationComponent: React.FC = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: '位置权限',
            message: '此应用需要访问您的位置信息',
            buttonNeutral: '稍后询问',
            buttonNegative: '取消',
            buttonPositive: '确定',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS 权限在 Info.plist 中配置
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('错误', '需要位置权限才能获取当前位置');
      return;
    }

    setLoading(true);

    Geolocation.getCurrentPosition(
      (position) => {
        const {latitude, longitude, accuracy} = position.coords;
        setLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
        });
        setLoading(false);
      },
      (error) => {
        console.error('获取位置失败:', error);
        Alert.alert('错误', `获取位置失败: ${error.message}`);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const startWatchingLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('错误', '需要位置权限才能监听位置变化');
      return;
    }

    const id = Geolocation.watchPosition(
      (position) => {
        const {latitude, longitude, accuracy} = position.coords;
        setLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('监听位置失败:', error);
        Alert.alert('错误', `监听位置失败: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // 移动10米才更新
        interval: 5000, // 5秒更新一次
      }
    );

    setWatchId(id);
  };

  const stopWatchingLocation = () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>地理位置服务</Text>

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? '获取中...' : '获取当前位置'}
          onPress={getCurrentLocation}
          disabled={loading}
        />
        
        <Button
          title={watchId ? '停止监听' : '开始监听位置'}
          onPress={watchId ? stopWatchingLocation : startWatchingLocation}
          color={watchId ? '#ff4757' : '#007AFF'}
        />
      </View>

      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>位置信息:</Text>
          <Text style={styles.locationText}>
            纬度: {location.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            经度: {location.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            精度: {location.accuracy.toFixed(2)} 米
          </Text>
          <Text style={styles.locationText}>
            时间: {new Date(location.timestamp).toLocaleString()}
          </Text>
        </View>
      )}

      {watchId && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>🔴 正在监听位置变化</Text>
        </View>
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
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  locationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#ffe6e6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#d63031',
    fontWeight: 'bold',
  },
});

export default LocationComponent;
```

## 🔔 推送通知

### 安装 React Native Push Notification

```bash
npm install @react-native-push-notification/push-notification-ios
npm install react-native-push-notification
```

### 推送通知实现

```typescript
// src/services/notificationService.ts
import PushNotification from 'react-native-push-notification';
import {Platform} from 'react-native';

export class NotificationService {
  static init() {
    PushNotification.configure({
      // 当收到通知时的回调
      onNotification: function (notification) {
        console.log('收到通知:', notification);
        
        // 处理通知点击
        if (notification.userInteraction) {
          console.log('用户点击了通知');
        }
      },

      // 当注册推送通知时的回调
      onRegister: function (token) {
        console.log('推送通知 Token:', token);
      },

      // iOS 特定配置
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // 是否弹出初始通知
      popInitialNotification: true,

      // 请求权限
      requestPermissions: Platform.OS === 'ios',
    });

    // 创建默认通知频道 (Android)
    PushNotification.createChannel(
      {
        channelId: 'default-channel',
        channelName: '默认通知',
        channelDescription: '应用的默认通知频道',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`通知频道创建: ${created}`)
    );
  }

  // 发送本地通知
  static sendLocalNotification(title: string, message: string, data?: any) {
    PushNotification.localNotification({
      channelId: 'default-channel',
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  // 发送定时通知
  static scheduleNotification(
    title: string,
    message: string,
    date: Date,
    data?: any
  ) {
    PushNotification.localNotificationSchedule({
      channelId: 'default-channel',
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  // 取消所有通知
  static cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  // 获取应用图标徽章数量 (iOS)
  static getBadgeCount(callback: (count: number) => void) {
    PushNotification.getApplicationIconBadgeNumber(callback);
  }

  // 设置应用图标徽章数量 (iOS)
  static setBadgeCount(count: number) {
    PushNotification.setApplicationIconBadgeNumber(count);
  }
}
```

### 通知功能组件

```typescript
// src/components/NotificationComponent.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {NotificationService} from '../services/notificationService';

const NotificationComponent: React.FC = () => {
  const [title, setTitle] = useState('测试通知');
  const [message, setMessage] = useState('这是一条测试通知消息');
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    // 初始化通知服务
    NotificationService.init();

    // 获取当前徽章数量 (iOS)
    if (Platform.OS === 'ios') {
      NotificationService.getBadgeCount(setBadgeCount);
    }
  }, []);

  const sendImmediateNotification = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('错误', '请输入标题和消息');
      return;
    }

    NotificationService.sendLocalNotification(title, message, {
      type: 'immediate',
      timestamp: Date.now(),
    });

    Alert.alert('成功', '通知已发送');
  };

  const scheduleNotification = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('错误', '请输入标题和消息');
      return;
    }

    // 5秒后发送通知
    const scheduleDate = new Date(Date.now() + 5000);
    
    NotificationService.scheduleNotification(title, message, scheduleDate, {
      type: 'scheduled',
      timestamp: Date.now(),
    });

    Alert.alert('成功', '通知已安排在5秒后发送');
  };

  const cancelAllNotifications = () => {
    NotificationService.cancelAllNotifications();
    Alert.alert('成功', '所有通知已取消');
  };

  const updateBadge = (increment: boolean) => {
    const newCount = increment ? badgeCount + 1 : Math.max(0, badgeCount - 1);
    setBadgeCount(newCount);
    NotificationService.setBadgeCount(newCount);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>推送通知测试</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>通知标题:</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="输入通知标题"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>通知消息:</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={message}
          onChangeText={setMessage}
          placeholder="输入通知消息"
          multiline
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="立即发送通知" onPress={sendImmediateNotification} />
        <Button title="5秒后发送通知" onPress={scheduleNotification} />
        <Button
          title="取消所有通知"
          onPress={cancelAllNotifications}
          color="#ff4757"
        />
      </View>

      {Platform.OS === 'ios' && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeTitle}>应用徽章: {badgeCount}</Text>
          <View style={styles.badgeButtons}>
            <Button title="+" onPress={() => updateBadge(true)} />
            <Button title="-" onPress={() => updateBadge(false)} />
          </View>
        </View>
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
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  messageInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  badgeContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  badgeButtons: {
    flexDirection: 'row',
    gap: 20,
  },
});

export default NotificationComponent;
```

## 📱 设备信息

### 安装 React Native Device Info

```bash
npm install react-native-device-info
```

### 设备信息组件

```typescript
// src/components/DeviceInfoComponent.tsx
import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';

interface DeviceData {
  deviceId: string;
  brand: string;
  model: string;
  systemName: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  bundleId: string;
  deviceName: string;
  isEmulator: boolean;
  hasNotch: boolean;
  batteryLevel: number;
  isCharging: boolean;
  diskSpace: string;
  memoryUsage: string;
}

const DeviceInfoComponent: React.FC = () => {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      const [
        deviceId,
        brand,
        model,
        systemName,
        systemVersion,
        appVersion,
        buildNumber,
        bundleId,
        deviceName,
        isEmulator,
        hasNotch,
        batteryLevel,
        isCharging,
        totalDiskCapacity,
        usedMemory,
      ] = await Promise.all([
        DeviceInfo.getDeviceId(),
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getBundleId(),
        DeviceInfo.getDeviceName(),
        DeviceInfo.isEmulator(),
        DeviceInfo.hasNotch(),
        DeviceInfo.getBatteryLevel(),
        DeviceInfo.isBatteryCharging(),
        DeviceInfo.getTotalDiskCapacity(),
        DeviceInfo.getUsedMemory(),
      ]);

      setDeviceData({
        deviceId,
        brand,
        model,
        systemName,
        systemVersion,
        appVersion,
        buildNumber,
        bundleId,
        deviceName,
        isEmulator,
        hasNotch,
        batteryLevel: Math.round(batteryLevel * 100),
        isCharging,
        diskSpace: `${(totalDiskCapacity / (1024 * 1024 * 1024)).toFixed(1)} GB`,
        memoryUsage: `${(usedMemory / (1024 * 1024)).toFixed(0)} MB`,
      });
    } catch (error) {
      console.error('获取设备信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>加载设备信息...</Text>
      </View>
    );
  }

  if (!deviceData) {
    return (
      <View style={styles.centerContainer}>
        <Text>获取设备信息失败</Text>
      </View>
    );
  }

  const InfoItem = ({label, value}: {label: string; value: string | boolean | number}) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>设备信息</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>设备信息</Text>
        <InfoItem label="设备ID" value={deviceData.deviceId} />
        <InfoItem label="品牌" value={deviceData.brand} />
        <InfoItem label="型号" value={deviceData.model} />
        <InfoItem label="设备名称" value={deviceData.deviceName} />
        <InfoItem label="是否模拟器" value={deviceData.isEmulator ? '是' : '否'} />
        <InfoItem label="有刘海屏" value={deviceData.hasNotch ? '是' : '否'} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>系统信息</Text>
        <InfoItem label="系统名称" value={deviceData.systemName} />
        <InfoItem label="系统版本" value={deviceData.systemVersion} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>应用信息</Text>
        <InfoItem label="应用版本" value={deviceData.appVersion} />
        <InfoItem label="构建号" value={deviceData.buildNumber} />
        <InfoItem label="包名" value={deviceData.bundleId} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>硬件信息</Text>
        <InfoItem label="电池电量" value={`${deviceData.batteryLevel}%`} />
        <InfoItem label="充电状态" value={deviceData.isCharging ? '充电中' : '未充电'} />
        <InfoItem label="存储空间" value={deviceData.diskSpace} />
        <InfoItem label="内存使用" value={deviceData.memoryUsage} />
      </View>
    </ScrollView>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    margin: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#007AFF',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
});

export default DeviceInfoComponent;
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ 相机和相册功能的集成
- ✅ 地理位置服务的使用
- ✅ 推送通知的实现
- ✅ 设备信息的获取
- ✅ 权限管理的最佳实践
- ✅ 原生功能的封装和使用

## 📝 作业

1. 创建一个拍照应用，支持滤镜和编辑功能
2. 开发一个基于位置的天气应用
3. 实现一个提醒应用，支持定时通知
4. 创建一个系统信息查看器

准备好学习性能优化了吗？让我们继续[第8章：性能优化](/react-native-tutorial/chapter-08/README.md)！
