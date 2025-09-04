# React Native 常用元素

### 核心组件（Core Components）

以下是 React Native 开发者经常使用的几个核心组件，它们构成了应用界面的基础。

#### 1. `<View>`
`<View>` 是最基础的 UI 组件，类似于网页中的 `<div>`。它是一个容器，用于包裹其他组件，并支持 **Flexbox** 布局、样式和触摸处理。

**常用属性：**
* **`style`**: 用于定义组件的样式，例如 `flexDirection`, `backgroundColor`, `padding` 等。它接受一个样式对象或样式对象的数组。
* **`onLayout`**: 当组件的布局（大小和位置）发生变化时调用。
* **`pointerEvents`**: 控制视图是否响应触摸事件。例如，`none` 会使它成为非可触摸区域。
* **`testID`**: 用于自动化测试，给组件一个唯一的标识符。

#### 2. `<Text>`
`<Text>` 用于显示文本。所有的文本内容都必须被 `<Text>` 组件包裹。

**常用属性：**
* **`style`**: 定义文本的样式，例如 `fontSize`, `color`, `fontWeight`。
* **`numberOfLines`**: 限制文本显示的行数。当文本超出指定行数时，会以省略号（`...`）结尾。
* **`ellipsizeMode`**: 当 `numberOfLines` 生效时，指定省略号的显示位置。可选值有 `head`, `middle`, `tail` 和 `clip`。
* **`onPress`**: 当用户点击文本时调用。

#### 3. `<Image>`
`<Image>` 用于在应用中显示图片。

**常用属性：**
* **`source`**: 指定图片的来源。可以是本地图片（`require('./path/to/image.png')`）或网络图片（`{uri: 'http://...'}`）。
* **`style`**: 设置图片的尺寸（`width`, `height`）以及其他样式。
* **`resizeMode`**: 当图片的尺寸与组件尺寸不匹配时，控制图片的缩放方式。常用值有 `cover`（保持宽高比，裁剪以填满）、`contain`（保持宽高比，完整显示）和 `stretch`（拉伸以填满）。
* **`onLoad`**: 图片加载完成时调用。
* **`onError`**: 图片加载失败时调用。

#### 4. `<TextInput>`
`<TextInput>` 用于让用户输入文本，是表单输入的核心组件。

**常用属性：**
* **`value`**: 输入框中显示的文本值。
* **`onChangeText`**: 当文本改变时调用，参数是改变后的文本。
* **`placeholder`**: 当输入框为空时显示的提示文本。
* **`keyboardType`**: 指定弹出的键盘类型，例如 `default`, `numeric`, `email-address` 等。
* **`autoFocus`**: 设置组件挂载后是否自动获得焦点。
* **`secureTextEntry`**: 设置为 `true` 时，输入内容将以点或星号显示，常用于密码输入。
* **`multiline`**: 设置为 `true` 时，允许输入多行文本。

#### 5. `<ScrollView>`
`<ScrollView>` 是一个可滚动的容器，如果内容超出了容器的高度，用户可以通过滚动来查看所有内容。

**常用属性：**
* **`horizontal`**: 设置为 `true` 时，允许水平滚动。默认为 `false`（垂直滚动）。
* **`showsVerticalScrollIndicator`**: 控制是否显示垂直滚动条。
* **`showsHorizontalScrollIndicator`**: 控制是否显示水平滚动条。
* **`onScroll`**: 用户滚动时持续调用。
* **`keyboardDismissMode`**: 决定当用户拖动滚动视图时键盘如何消失。常用值有 `none`, `on-drag`。

#### 6. `<FlatList>`
`<FlatList>` 是一个高效的列表组件，专为显示大量数据而设计。它只渲染屏幕上可见的元素，以优化性能。

**常用属性：**
* **`data`**: 包含要渲染的数据的数组。
* **`renderItem`**: 一个函数，接受单个数据项并返回一个 React 元素。这是渲染列表项的核心。
* **`keyExtractor`**: 一个函数，为列表中的每个数据项生成一个唯一的 key，以帮助 React 优化渲染。
* **`ListHeaderComponent`**: 在列表的顶部渲染的组件。
* **`ListFooterComponent`**: 在列表的底部渲染的组件。
* **`onRefresh`**: 下拉刷新时调用。
* **`refreshing`**: 一个布尔值，指示列表当前是否处于刷新状态。

---

### 触摸和手势（Touchables）

这些组件用于响应用户的触摸事件，将静态内容变为可交互的元素。

#### 1. `<Pressable>`
`<Pressable>` 是一个现代化的、通用性更强的触摸组件。它提供了对不同触摸状态的细粒度控制。

**常用属性：**
* **`onPress`**: 当用户松开手指时调用。
* **`onPressIn`**: 当用户按下时调用。
* **`onPressOut`**: 当用户松开时调用。
* **`onLongPress`**: 当用户长按时调用。
* **`style`**: 可以是一个函数，根据触摸状态（`{ pressed }`）返回不同的样式。这使得实现按下时的样式变化变得非常简单。

#### 2. `<TouchableOpacity>`
`<TouchableOpacity>` 在按下时会降低其包裹内容的透明度，从而提供视觉反馈。

**常用属性：**
* **`onPress`**: 当用户点击时调用。
* **`activeOpacity`**: 按下时的透明度值。
