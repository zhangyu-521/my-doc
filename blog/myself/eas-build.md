# eas build的背后

## 前置输入

- app.json（图标、权限、包名、plugins）
- package.json（依赖）
- index.js 或 App.js（入口）
- eas.json（构建配置）
- 本地无需 Android SDK，只有 Node + Git + EAS CLI


## 构建流程
``` bash
eas build -p android --profile preview
```

1. EAS CLI 先调 `npx expo-modules-autolinking`，生成 `android/expo-module-autolinking-config.json`（要编哪些 native 模块）。
2. 把 `.gitignore` 之外的文件打成 `tarball（11` MB 左右），边压缩边流式上传
3. 在云端执行 `npm i` 和 `npx expo prebuild --platform android --skip-dependency-update`，下载依赖，生成android目录
   - android/ 目录（build.gradle, MainActivity.java, AndroidManifest.xml ...）
   - 图标、启动图被拷贝到 res/mipmap-*/ic_launcher.png、res/drawable/splash_background.xml
   - AndroidManifest.xml 里已经注入你在 app.json 写的权限与 android:package="com.xxx"
4. 安装原生依赖 （Gradle）
            ``` bash
            cd android
            ./gradlew :app:assembleRelease \
            -DversionCode=1 \
            -DversionName=1.0.0
            ```
    - 每个 expo-* 插件对应的 aar 会被 Maven 下载（或本地 local-maven-repo 构建）；
    - 如果 app.json 里开了 newArchEnabled: true，Gradle 会额外把 Fabric/TurboModules 的 codegen 文件生成出来（build/generated/source/codegen）。
5. 生成离线 JS Bundle（Metro 打包）
``` bash
# react-native原生项目
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# expo项目
npx expo export:embed \
  --platform android \
  --dev false \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
```

6. Java/Kotlin 编译 + DEX + 签名
``` bash
./gradlew :app:assembleRelease
```
   - .java/.kt → .class
   - R8/ProGuard 混淆（缩小体积）
   - .class → .dex
   - 把 index.android.bundle、资源、so 库、DEX 打成一个 unsigned APK
   - 用你在 eas credentials 里上传的 release.keystore 签名 → app-release.apk

7. 上传产物: 签名完毕把 APK 推到 Google Cloud Storage 私有桶，返回 下载 URL。


``` txt
你的电脑        EAS Cloud Build 容器
├─ eas build        →  上传 tarball
│                    ├─ npm ci
│                    ├─ expo prebuild   ← 生成 android/
│                    ├─ ./gradlew bundleReleaseJsAndAssets ← 离线 bundle
│                    ├─ ./gradlew assembleRelease ← 编译+签名
│                    └─ 上传 APK 到 GCS
← 返回下载链接
```

::: tip
1. Expo 项目入口：node_modules/expo/AppEntry.js
2. export:embed 把 JS 业务 + 资源 → assets/index.android.bundle + res/drawable-* / font / raw
3. index.android.bundle就是IIFE格式的js代码
4. 通过 Hermes 将 index.android.bundle 转换成字节码（这个阶段是打包apk生成的）
5. hermesc 只做“编译加速 + 包体瘦身”，没有它 Metro 的 IIFE 同样能生成 APK；
::: 


``` txt 
时间点①  Metro 后
└─ assets/index.android.bundle           （IIFE 文本）

时间点②  Gradle 后
└─ build/intermediates/hermes/release/index.android.bundle.hbc   （字节码）
└─ apk内部
   ├─ assets/index.android.bundle        （IIFE，备用）
   └─ res/raw/index.android.bundle.hbc   或 直接嵌入 so 区域（字节码，优先）
```

| 步骤             | 谁来干                                            | 产物放在哪里                                                       | 运行时加载路径         |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------ | --------------- |
| ① Metro 出 IIFE | `export:embed`                                 | `assets/index.android.bundle`                                | **备用入口**        |
| ② Hermes 编译    | Gradle `compile*HermesBytecode`                | `build/intermediates/hermes/release/*.hbc`                   | **不是 assets**   |
| ③ 合并 & 打包      | Gradle `mergeReleaseAssets` / `packageRelease` | **APK 内部** `res/raw/index.android.bundle.hbc` 或 **嵌入 so 区域** | **Hermes 真正读取** |


## 运行时

把 JS 里的 <View>、<Text> 映射成真正的 android.view.View”不是在 Metro 打包时完成，也不是在 hermesc 编译字节码时完成，而是 APK 启动后、在设备上运行时由 React-Native 框架层逐步完成的。整个流程分三步：JS 创建虚拟节点 → C++ 生成指令 → Java 实例化原生 View。

``` txt
APK 启动
   ├─ Java: ReactInstanceManager → 加载字节码
   ├─ C++: 创建 RootView → UIManager/Fabric
   ├─ JS: 执行 App.js → 返回 ReactElement 树
   │        ↓（运行期）
   C++: 把 ReactElement → ShadowNode → 指令列表
   │        ↓（JNI）
   Java: ViewManager 根据指令 → new TextView / LinearLayout ...
   └─ 屏幕出现真实像素
```