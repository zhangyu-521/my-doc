# 第9章：打包与发布

## 📖 本章概述

应用开发完成后，需要打包并发布到应用商店。本章将详细介绍 Android 和 iOS 应用的打包流程、代码签名、应用商店发布以及持续集成/部署的最佳实践。

## 🤖 Android 应用打包

### 生成签名密钥

```bash
# 生成发布密钥
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 查看密钥信息
keytool -list -v -keystore my-upload-key.keystore
```

### 配置签名

**android/gradle.properties:**
```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

**android/app/build.gradle:**
```gradle
android {
    ...
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.release
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

### 构建发布版本

```bash
# 清理项目
cd android
./gradlew clean

# 构建 APK
./gradlew assembleRelease

# 构建 AAB (推荐用于 Google Play)
./gradlew bundleRelease

# 生成的文件位置
# APK: android/app/build/outputs/apk/release/app-release.apk
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

### ProGuard 配置

**android/app/proguard-rules.pro:**
```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# 保持应用类
-keep class com.yourapp.** { *; }

# 保持第三方库
-keep class io.invertase.firebase.** { *; }
-keep class com.google.firebase.** { *; }

# 移除日志
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
```

### 多渠道打包

**android/app/build.gradle:**
```gradle
android {
    ...
    flavorDimensions "version"
    productFlavors {
        development {
            dimension "version"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
            resValue "string", "app_name", "MyApp Dev"
        }
        staging {
            dimension "version"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            resValue "string", "app_name", "MyApp Staging"
        }
        production {
            dimension "version"
            resValue "string", "app_name", "MyApp"
        }
    }
}
```

## 🍎 iOS 应用打包

### Xcode 配置

1. **打开 Xcode 项目**
```bash
cd ios
open YourApp.xcworkspace
```

2. **配置 Bundle Identifier**
   - 选择项目 -> Target -> General
   - 设置唯一的 Bundle Identifier

3. **配置签名**
   - 选择 Signing & Capabilities
   - 选择开发团队
   - 配置 Provisioning Profile

### 证书和描述文件

```bash
# 安装 fastlane
gem install fastlane

# 初始化 fastlane
cd ios
fastlane init

# 自动管理证书和描述文件
fastlane match init
fastlane match development
fastlane match appstore
```

### 构建配置

**ios/YourApp/Info.plist 配置:**
```xml
<key>CFBundleDisplayName</key>
<string>$(PRODUCT_NAME)</string>
<key>CFBundleIdentifier</key>
<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
<key>CFBundleVersion</key>
<string>$(CURRENT_PROJECT_VERSION)</string>
<key>CFBundleShortVersionString</key>
<string>$(MARKETING_VERSION)</string>
```

### 构建发布版本

```bash
# 使用 React Native CLI
npx react-native run-ios --configuration Release

# 使用 Xcode 命令行
xcodebuild -workspace YourApp.xcworkspace \
           -scheme YourApp \
           -configuration Release \
           -destination generic/platform=iOS \
           -archivePath YourApp.xcarchive \
           archive

# 导出 IPA
xcodebuild -exportArchive \
           -archivePath YourApp.xcarchive \
           -exportPath ./build \
           -exportOptionsPlist ExportOptions.plist
```

**ExportOptions.plist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
```

## 🏪 应用商店发布

### Google Play Console

1. **创建应用**
   - 登录 Google Play Console
   - 创建新应用
   - 填写应用信息

2. **上传 AAB 文件**
   - 进入 Release -> Production
   - 上传 app-release.aab
   - 填写版本说明

3. **应用信息配置**
```javascript
// 应用信息示例
const appInfo = {
  title: "我的应用",
  shortDescription: "简短描述（80字符以内）",
  fullDescription: `
    详细描述应用功能和特色
    - 功能1
    - 功能2
    - 功能3
  `,
  keywords: "关键词1, 关键词2, 关键词3",
  category: "工具",
  contentRating: "适合所有人",
  privacyPolicy: "https://yourapp.com/privacy",
  website: "https://yourapp.com"
};
```

4. **截图和图标**
   - 应用图标：512x512 PNG
   - 功能图片：1024x500 PNG
   - 手机截图：至少2张，最多8张
   - 平板截图：可选

### App Store Connect

1. **创建应用记录**
   - 登录 App Store Connect
   - 选择我的 App -> 新建 App
   - 填写基本信息

2. **应用信息配置**
```swift
// App Store 信息示例
let appStoreInfo = [
    "name": "我的应用",
    "subtitle": "副标题（30字符以内）",
    "description": """
        应用的详细描述
        突出主要功能和优势
        """,
    "keywords": "关键词1,关键词2,关键词3",
    "supportURL": "https://yourapp.com/support",
    "marketingURL": "https://yourapp.com",
    "privacyPolicyURL": "https://yourapp.com/privacy"
]
```

3. **截图要求**
   - iPhone 6.7": 1290x2796 或 1284x2778
   - iPhone 6.5": 1242x2688 或 1284x2778
   - iPhone 5.5": 1242x2208
   - iPad Pro (6th Gen): 2048x2732
   - iPad Pro (2nd Gen): 2048x2732

4. **上传构建版本**
```bash
# 使用 Xcode 上传
# Product -> Archive -> Distribute App -> App Store Connect

# 或使用命令行
xcrun altool --upload-app \
             --type ios \
             --file "YourApp.ipa" \
             --username "your-apple-id" \
             --password "app-specific-password"
```

## 🔄 持续集成/部署 (CI/CD)

### GitHub Actions 配置

**.github/workflows/build-and-deploy.yml:**
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Cache Gradle
        uses: actions/cache@v3
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ runner.os }}-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
      
      - name: Make gradlew executable
        run: chmod +x ./android/gradlew
      
      - name: Build Android AAB
        run: |
          cd android
          ./gradlew bundleRelease
      
      - name: Upload AAB
        uses: actions/upload-artifact@v3
        with:
          name: app-release.aab
          path: android/app/build/outputs/bundle/release/app-release.aab

  build-ios:
    needs: test
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install CocoaPods
        run: |
          cd ios
          pod install
      
      - name: Build iOS
        run: |
          xcodebuild -workspace ios/YourApp.xcworkspace \
                     -scheme YourApp \
                     -configuration Release \
                     -destination generic/platform=iOS \
                     -archivePath YourApp.xcarchive \
                     archive
      
      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
                     -archivePath YourApp.xcarchive \
                     -exportPath ./build \
                     -exportOptionsPlist ios/ExportOptions.plist
      
      - name: Upload IPA
        uses: actions/upload-artifact@v3
        with:
          name: YourApp.ipa
          path: build/YourApp.ipa
```

### Fastlane 自动化

**Fastfile:**
```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "YourApp.xcodeproj")
    build_app(workspace: "YourApp.xcworkspace", scheme: "YourApp")
    upload_to_testflight
  end

  desc "Build and upload to App Store"
  lane :release do
    increment_build_number(xcodeproj: "YourApp.xcodeproj")
    build_app(workspace: "YourApp.xcworkspace", scheme: "YourApp")
    upload_to_app_store
  end
end

platform :android do
  desc "Build and upload to Google Play Console"
  lane :beta do
    gradle(task: "bundleRelease")
    upload_to_play_store(track: "internal")
  end

  desc "Build and upload to Google Play Store"
  lane :release do
    gradle(task: "bundleRelease")
    upload_to_play_store
  end
end
```

## 📊 发布后监控

### 崩溃报告集成

```bash
# 安装 Crashlytics
npm install @react-native-firebase/app @react-native-firebase/crashlytics
```

```typescript
// src/services/crashReporting.ts
import crashlytics from '@react-native-firebase/crashlytics';

export class CrashReportingService {
  static init() {
    // 在生产环境中启用崩溃报告
    if (!__DEV__) {
      crashlytics().setCrashlyticsCollectionEnabled(true);
    }
  }

  static logError(error: Error, context?: Record<string, any>) {
    if (__DEV__) {
      console.error('Error:', error, context);
      return;
    }

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        crashlytics().setAttribute(key, String(value));
      });
    }

    crashlytics().recordError(error);
  }

  static setUserId(userId: string) {
    crashlytics().setUserId(userId);
  }

  static log(message: string) {
    crashlytics().log(message);
  }
}
```

### 性能监控

```typescript
// src/services/analytics.ts
import analytics from '@react-native-firebase/analytics';
import perf from '@react-native-firebase/perf';

export class AnalyticsService {
  static async logEvent(eventName: string, parameters?: Record<string, any>) {
    if (__DEV__) {
      console.log('Analytics Event:', eventName, parameters);
      return;
    }

    await analytics().logEvent(eventName, parameters);
  }

  static async setUserProperty(name: string, value: string) {
    await analytics().setUserProperty(name, value);
  }

  static async startTrace(traceName: string) {
    const trace = perf().startTrace(traceName);
    return trace;
  }
}
```

## 🔧 版本管理

### 自动版本号管理

**package.json scripts:**
```json
{
  "scripts": {
    "version:patch": "npm version patch && npm run version:sync",
    "version:minor": "npm version minor && npm run version:sync",
    "version:major": "npm version major && npm run version:sync",
    "version:sync": "node scripts/sync-version.js"
  }
}
```

**scripts/sync-version.js:**
```javascript
const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
const version = packageJson.version;

// 更新 Android 版本
const androidBuildGradle = path.join(__dirname, '../android/app/build.gradle');
let androidContent = fs.readFileSync(androidBuildGradle, 'utf8');
androidContent = androidContent.replace(
  /versionName ".*"/,
  `versionName "${version}"`
);
fs.writeFileSync(androidBuildGradle, androidContent);

// 更新 iOS 版本
const iosPlist = path.join(__dirname, '../ios/YourApp/Info.plist');
let iosContent = fs.readFileSync(iosPlist, 'utf8');
iosContent = iosContent.replace(
  /<key>CFBundleShortVersionString<\/key>\s*<string>.*<\/string>/,
  `<key>CFBundleShortVersionString</key>\n\t<string>${version}</string>`
);
fs.writeFileSync(iosPlist, iosContent);

console.log(`版本已更新到 ${version}`);
```

## 🎉 本章小结

在这一章中，我们学习了：

- ✅ Android 应用的签名和打包流程
- ✅ iOS 应用的证书配置和构建
- ✅ Google Play 和 App Store 的发布流程
- ✅ CI/CD 自动化部署配置
- ✅ 发布后的监控和分析
- ✅ 版本管理的最佳实践

## 📝 作业

1. 配置完整的 Android 签名和打包流程
2. 设置 iOS 证书和描述文件
3. 创建 CI/CD 流水线自动构建和部署
4. 集成崩溃报告和性能监控

## 🎊 教程总结

恭喜你完成了 React Native 完整教程！通过这9个章节的学习，你已经掌握了：

- **基础知识**：React Native 环境搭建和核心概念
- **UI 开发**：组件使用和布局设计
- **导航系统**：多种导航模式的实现
- **状态管理**：从本地状态到全局状态的管理
- **网络通信**：API 调用和数据处理
- **数据存储**：本地存储和数据库操作
- **原生集成**：相机、定位、通知等原生功能
- **性能优化**：应用性能监控和优化技巧
- **发布部署**：完整的打包和发布流程

现在你已经具备了开发完整 React Native 应用的能力。继续实践，不断学习新技术，成为优秀的移动应用开发者！

## 🔗 进阶学习资源

- [React Native 官方文档](https://reactnative.dev/)
- [React Navigation 文档](https://reactnavigation.org/)
- [React Native 社区](https://github.com/react-native-community)
- [Awesome React Native](https://github.com/jondot/awesome-react-native)

祝你在 React Native 开发路上越走越远！🚀
