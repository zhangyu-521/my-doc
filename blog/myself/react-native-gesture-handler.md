# react-native-gesture-handler
- react-native-gesture-handler 是处理手势的react-native库



| 手势             | API 名称                 | 一句话用途             | 示例        |
| -------------- | ---------------------- | ----------------- | --------- |
| **Pan**        | `Gesture.Pan()`        | 拖动、滑动、速度追踪        | 拖拽排序、右滑返回 |
| **Tap**        | `Gesture.Tap()`        | 单击、双击、长按          | 双击放大、长按菜单 |
| **Pinch**      | `Gesture.Pinch()`      | 双指缩放              | 图片/地图缩放   |
| **Rotation**   | `Gesture.Rotation()`   | 双指旋转              | 图片旋转裁剪    |
| **Fling**      | `Gesture.Fling()`      | 快速抛滑              | 抛卡片、甩一甩   |
| **LongPress**  | `Gesture.LongPress()`  | 长按计时              | 语音按钮      |
| **ForceTouch** | `Gesture.ForceTouch()` | 3D Touch 力度       | 压感画笔      |
| **Native**     | `Gesture.Native()`     | 与原生 ScrollView 共存 | 嵌套滚动、下拉刷新 |

## PanGesture（拖动/滑动）

``` tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const translateX = useSharedValue(0);
const pan = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX; // 实时位移
  })
  .onEnd((e) => {
    if (e.translationX > 120) translateX.value = withSpring(300); // 过半屏松手
    else translateX.value = withSpring(0);
  });

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }],
}));

<GestureDetector gesture={pan}>
  <Animated.View style={[style, styles.card]} />
</GestureDetector>
```

## TapGesture（单击/双击/长按）
``` tsx
const tap = Gesture.Tap()
  .numberOfTaps(2) // 双击
  .onEnd(() => {
    runOnJS(handleDoubleTap)(); // 回到 JS 线程
  });

<GestureDetector gesture={tap}>
  <Animated.View><Text>双击我</Text></Animated.View>
</GestureDetector>
```

## LongPressGesture（长按）

``` tsx
const longPress = Gesture.LongPress()
  .minDuration(800)
  .onEnd(() => runOnJS(startRecord)());

<GestureDetector gesture={longPress}>
  <Animated.View><Text>长按录音</Text></Animated.View>
</GestureDetector>
```

## PinchGesture（双指缩放）

``` tsx
const scale = useSharedValue(1);
const pinch = Gesture.Pinch()
  .onUpdate((e) => {
    scale.value = e.scale; // 实时缩放比
  })
  .onEnd(() => {
    scale.value = withSpring(Math.min(Math.max(scale.value, 0.5), 3));
  });

const style = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

<GestureDetector gesture={pinch}>
  <Animated.Image source={img} style={[style, { width: 300, height: 300 }]} />
</GestureDetector>
```
## RotationGesture（双指旋转）

``` tsx
const rotation = useSharedValue(0);
const rotate = Gesture.Rotation()
  .onUpdate((e) => {
    rotation.value = e.rotation; // 弧度
  })
  .onEnd(() => {
    rotation.value = withSpring(rotation.value % (2 * Math.PI));
  });

const style = useAnimatedStyle(() => ({
  transform: [{ rotate: `${rotation.value}rad` }],
}));

<GestureDetector gesture={rotate}>
  <Animated.View style={[style, styles.box]} />
</GestureDetector>
```

## FlingGesture（快速抛滑）

``` tsx
const fling = Gesture.Fling()
  .direction(Directions.RIGHT)
  .onEnd(() => {
    translateX.value = withSpring(width); // 抛出屏幕
  });

<GestureDetector gesture={fling}>
  <Animated.View style={[style, styles.card]} />
</GestureDetector>
```


## ForceTouch（3D Touch/力度）
``` tsx
const force = Gesture.ForceTouch()
  .onUpdate((e) => {
    force.value = e.force; // 0-1
  })
  .onEnd(() => {
    force.value = withTiming(0);
  });

const style = useAnimatedStyle(() => ({
  transform: [{ scale: 1 + force.value * 0.3 }],
}));

<GestureDetector gesture={force}>
  <Animated.View style={[style, styles.circle]} />
</GestureDetector>
```

## 组合 & 并发（多手势共存）
``` tsx
const simultaneous = Gesture.Simultaneous(
  Gesture.Pan(),
  Gesture.Pinch(),
  Gesture.Rotation()
);

<GestureDetector gesture={simultaneous}>
  <Animated.View style={[panStyle, pinchStyle, rotateStyle]} />
</GestureDetector>
```

## 性能优化

| 技巧                | 代码                                                                   |
| ----------------- | -------------------------------------------------------------------- |
| **避免 JS 线程**      | `runOnJS()` 只在必要时用                                                   |
| **用 SharedValue** | `const x = useSharedValue(0);` 替代 `useState`                         |
| **分离耗时计算**        | `useAnimatedReaction(() => x.value, (cur) => runOnJS(update)(cur));` |
| **60 fps 监控**     | `useFrameCallback((f) => console.log(f.timeSincePreviousFrame));`    |


## 与 ScrollView 共存（Native 模式）

``` tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScrollView } from 'react-native-gesture-handler';

<GestureHandlerRootView style={{ flex: 1 }}>
  <ScrollView>
    {/* 嵌套 Pan 不会冲突 */}
  </ScrollView>
</GestureHandlerRootView>
```
