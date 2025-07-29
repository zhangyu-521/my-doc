# 第2章：核心组件与布局

## 📖 本章概述

在这一章中，我们将深入学习 React Native 的核心组件和布局系统。这些是构建移动应用界面的基础，掌握它们对后续开发至关重要。

## 🧱 基础组件

### View - 容器组件

`View` 是最基础的组件，类似于 HTML 中的 `div`，用作其他组件的容器。

```typescript
import React from 'react';
import {View, StyleSheet} from 'react-native';

const ViewExample: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.box1} />
      <View style={styles.box2} />
      <View style={styles.box3} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  box1: {
    width: 100,
    height: 100,
    backgroundColor: '#ff6b6b',
    marginBottom: 10,
  },
  box2: {
    width: 150,
    height: 100,
    backgroundColor: '#4ecdc4',
    marginBottom: 10,
  },
  box3: {
    width: 120,
    height: 100,
    backgroundColor: '#45b7d1',
  },
});
```

### Text - 文本组件

`Text` 组件用于显示文本，支持嵌套和样式设置。

```typescript
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const TextExample: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* 基础文本 */}
      <Text style={styles.title}>这是标题</Text>
      
      {/* 嵌套文本 */}
      <Text style={styles.paragraph}>
        这是一段普通文本，
        <Text style={styles.bold}>这部分是粗体</Text>
        ，这里还有
        <Text style={styles.italic}>斜体文本</Text>
        。
      </Text>
      
      {/* 可选择文本 */}
      <Text selectable style={styles.selectable}>
        这段文本可以被选择和复制
      </Text>
      
      {/* 限制行数 */}
      <Text numberOfLines={2} style={styles.multiline}>
        这是一段很长的文本，用来演示如何限制显示行数。
        当文本超过指定行数时，会自动截断并显示省略号。
        这样可以保持界面的整洁。
      </Text>
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
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 15,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  italic: {
    fontStyle: 'italic',
    color: '#007AFF',
  },
  selectable: {
    fontSize: 14,
    color: '#999',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  multiline: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
});
```

### Image - 图片组件

`Image` 组件用于显示图片，支持本地图片和网络图片。

```typescript
import React from 'react';
import {View, Image, StyleSheet, Dimensions} from 'react-native';

const {width} = Dimensions.get('window');

const ImageExample: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* 本地图片 */}
      <Image
        source={require('./assets/local-image.png')}
        style={styles.localImage}
      />
      
      {/* 网络图片 */}
      <Image
        source={{
          uri: 'https://picsum.photos/300/200',
        }}
        style={styles.networkImage}
        resizeMode="cover"
      />
      
      {/* 带加载指示器的网络图片 */}
      <Image
        source={{
          uri: 'https://picsum.photos/300/150',
        }}
        style={styles.imageWithIndicator}
        loadingIndicatorSource={require('./assets/loading.gif')}
        onLoad={() => console.log('图片加载完成')}
        onError={() => console.log('图片加载失败')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  localImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  networkImage: {
    width: width - 40,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  imageWithIndicator: {
    width: width - 40,
    height: 150,
    borderRadius: 10,
  },
});
```

## 🎯 交互组件

### Button - 按钮组件

React Native 提供了基础的 `Button` 组件，但通常我们使用 `TouchableOpacity` 来创建自定义按钮。

```typescript
import React from 'react';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet,
  Alert,
} from 'react-native';

const ButtonExample: React.FC = () => {
  const handlePress = (buttonName: string) => {
    Alert.alert('按钮点击', `你点击了${buttonName}按钮`);
  };

  return (
    <View style={styles.container}>
      {/* 基础按钮 */}
      <Button
        title="基础按钮"
        onPress={() => handlePress('基础')}
        color="#007AFF"
      />
      
      {/* TouchableOpacity 自定义按钮 */}
      <TouchableOpacity
        style={styles.customButton}
        onPress={() => handlePress('自定义')}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>自定义按钮</Text>
      </TouchableOpacity>
      
      {/* TouchableHighlight 按钮 */}
      <TouchableHighlight
        style={styles.highlightButton}
        onPress={() => handlePress('高亮')}
        underlayColor="#0056b3"
      >
        <Text style={styles.buttonText}>高亮按钮</Text>
      </TouchableHighlight>
      
      {/* 禁用状态按钮 */}
      <TouchableOpacity
        style={[styles.customButton, styles.disabledButton]}
        disabled={true}
      >
        <Text style={[styles.buttonText, styles.disabledText]}>
          禁用按钮
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  customButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  highlightButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    color: '#999',
  },
});
```

### TextInput - 输入框组件

`TextInput` 用于文本输入，支持多种输入类型和验证。

```typescript
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const TextInputExample: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>用户信息表单</Text>
      
      {/* 基础输入框 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>姓名</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="请输入姓名"
          placeholderTextColor="#999"
        />
      </View>
      
      {/* 邮箱输入框 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>邮箱</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="请输入邮箱"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      
      {/* 密码输入框 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>密码</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="请输入密码"
          placeholderTextColor="#999"
          secureTextEntry={true}
          autoCapitalize="none"
        />
      </View>
      
      {/* 多行输入框 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>个人描述</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="请输入个人描述"
          placeholderTextColor="#999"
          multiline={true}
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </KeyboardAvoidingView>
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
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});
```

## 📋 列表组件

### ScrollView - 滚动视图

`ScrollView` 用于创建可滚动的内容区域。

```typescript
import React from 'react';
import {ScrollView, View, Text, StyleSheet} from 'react-native';

const ScrollViewExample: React.FC = () => {
  const items = Array.from({length: 20}, (_, i) => `项目 ${i + 1}`);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      <Text style={styles.title}>滚动视图示例</Text>
      
      {items.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>已到达底部</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 20,
  },
  item: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
});
```

### FlatList - 高性能列表

`FlatList` 是处理大量数据的高性能列表组件。

```typescript
import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';

interface ListItem {
  id: string;
  title: string;
  description: string;
}

const FlatListExample: React.FC = () => {
  const [data, setData] = useState<ListItem[]>(
    Array.from({length: 50}, (_, i) => ({
      id: i.toString(),
      title: `标题 ${i + 1}`,
      description: `这是第 ${i + 1} 项的描述内容`,
    }))
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // 模拟网络请求
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const renderItem = ({item}: {item: ListItem}) => (
    <TouchableOpacity style={styles.item}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>列表头部</Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>列表底部</Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      ItemSeparatorComponent={renderSeparator}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 10,
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
});
```

## 📐 Flexbox 布局系统

React Native 使用 Flexbox 作为主要的布局系统，但与 CSS 有一些差异。

### 基本概念

```typescript
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const FlexboxBasics: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* 主轴方向 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>flexDirection: 'row'</Text>
        <View style={styles.rowContainer}>
          <View style={[styles.box, {backgroundColor: '#ff6b6b'}]} />
          <View style={[styles.box, {backgroundColor: '#4ecdc4'}]} />
          <View style={[styles.box, {backgroundColor: '#45b7d1'}]} />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>flexDirection: 'column'</Text>
        <View style={styles.columnContainer}>
          <View style={[styles.box, {backgroundColor: '#ff6b6b'}]} />
          <View style={[styles.box, {backgroundColor: '#4ecdc4'}]} />
          <View style={[styles.box, {backgroundColor: '#45b7d1'}]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  rowContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  columnContainer: {
    flexDirection: 'column',
    height: 200,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  box: {
    width: 50,
    height: 50,
    margin: 5,
  },
});
```

### 对齐方式

```typescript
const AlignmentExample: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* justifyContent 示例 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>justifyContent</Text>

        <Text style={styles.subTitle}>flex-start</Text>
        <View style={[styles.demoContainer, {justifyContent: 'flex-start'}]}>
          <View style={styles.smallBox} />
          <View style={styles.smallBox} />
          <View style={styles.smallBox} />
        </View>

        <Text style={styles.subTitle}>center</Text>
        <View style={[styles.demoContainer, {justifyContent: 'center'}]}>
          <View style={styles.smallBox} />
          <View style={styles.smallBox} />
          <View style={styles.smallBox} />
        </View>

        <Text style={styles.subTitle}>space-between</Text>
        <View style={[styles.demoContainer, {justifyContent: 'space-between'}]}>
          <View style={styles.smallBox} />
          <View style={styles.smallBox} />
          <View style={styles.smallBox} />
        </View>
      </View>

      {/* alignItems 示例 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>alignItems</Text>

        <Text style={styles.subTitle}>flex-start</Text>
        <View style={[styles.demoContainer, {alignItems: 'flex-start'}]}>
          <View style={[styles.smallBox, {height: 30}]} />
          <View style={[styles.smallBox, {height: 50}]} />
          <View style={[styles.smallBox, {height: 40}]} />
        </View>

        <Text style={styles.subTitle}>center</Text>
        <View style={[styles.demoContainer, {alignItems: 'center'}]}>
          <View style={[styles.smallBox, {height: 30}]} />
          <View style={[styles.smallBox, {height: 50}]} />
          <View style={[styles.smallBox, {height: 40}]} />
        </View>
      </View>
    </View>
  );
};

const alignmentStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#666',
  },
  demoContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#f0f0f0',
    marginBottom: 10,
    padding: 5,
  },
  smallBox: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    margin: 2,
  },
});
```

### Flex 属性

```typescript
const FlexPropertiesExample: React.FC = () => {
  return (
    <View style={flexStyles.container}>
      <Text style={flexStyles.title}>Flex 属性示例</Text>

      {/* flex: 1 示例 */}
      <View style={flexStyles.section}>
        <Text style={flexStyles.sectionTitle}>flex: 1</Text>
        <View style={flexStyles.flexContainer}>
          <View style={[flexStyles.flexBox, {flex: 1, backgroundColor: '#ff6b6b'}]}>
            <Text style={flexStyles.boxText}>flex: 1</Text>
          </View>
          <View style={[flexStyles.flexBox, {flex: 1, backgroundColor: '#4ecdc4'}]}>
            <Text style={flexStyles.boxText}>flex: 1</Text>
          </View>
        </View>
      </View>

      {/* 不同 flex 值 */}
      <View style={flexStyles.section}>
        <Text style={flexStyles.sectionTitle}>不同 flex 值</Text>
        <View style={flexStyles.flexContainer}>
          <View style={[flexStyles.flexBox, {flex: 1, backgroundColor: '#ff6b6b'}]}>
            <Text style={flexStyles.boxText}>flex: 1</Text>
          </View>
          <View style={[flexStyles.flexBox, {flex: 2, backgroundColor: '#4ecdc4'}]}>
            <Text style={flexStyles.boxText}>flex: 2</Text>
          </View>
          <View style={[flexStyles.flexBox, {flex: 1, backgroundColor: '#45b7d1'}]}>
            <Text style={flexStyles.boxText}>flex: 1</Text>
          </View>
        </View>
      </View>

      {/* flexGrow, flexShrink, flexBasis */}
      <View style={flexStyles.section}>
        <Text style={flexStyles.sectionTitle}>flexGrow & flexShrink</Text>
        <View style={flexStyles.flexContainer}>
          <View style={[flexStyles.flexBox, {
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 100,
            backgroundColor: '#ff6b6b'
          }]}>
            <Text style={flexStyles.boxText}>grow: 1</Text>
          </View>
          <View style={[flexStyles.flexBox, {
            flexGrow: 2,
            flexShrink: 1,
            flexBasis: 100,
            backgroundColor: '#4ecdc4'
          }]}>
            <Text style={flexStyles.boxText}>grow: 2</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const flexStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  flexContainer: {
    flexDirection: 'row',
    height: 80,
    backgroundColor: '#f8f8f8',
    padding: 5,
  },
  flexBox: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 5,
  },
  boxText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
```

## 🎨 样式系统深入

### 样式继承和组合

```typescript
const StyleExample: React.FC = () => {
  return (
    <View style={styleExampleStyles.container}>
      {/* 基础样式 */}
      <Text style={styleExampleStyles.baseText}>基础文本样式</Text>

      {/* 样式组合 */}
      <Text style={[styleExampleStyles.baseText, styleExampleStyles.largeText]}>
        组合样式：基础 + 大字体
      </Text>

      {/* 条件样式 */}
      <Text style={[
        styleExampleStyles.baseText,
        true && styleExampleStyles.successText
      ]}>
        条件样式：成功状态
      </Text>

      {/* 动态样式 */}
      <View style={[
        styleExampleStyles.box,
        {backgroundColor: '#' + Math.floor(Math.random()*16777215).toString(16)}
      ]}>
        <Text style={styleExampleStyles.boxText}>动态背景色</Text>
      </View>
    </View>
  );
};

const styleExampleStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  baseText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  largeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  successText: {
    color: '#28a745',
    fontWeight: '500',
  },
  box: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 20,
  },
  boxText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

### 响应式设计

```typescript
import {Dimensions, PixelRatio} from 'react-native';

const {width, height} = Dimensions.get('window');
const scale = width / 375; // 基于 iPhone X 的设计稿

// 响应式字体大小
const normalize = (size: number) => {
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const ResponsiveExample: React.FC = () => {
  const isTablet = width >= 768;

  return (
    <View style={responsiveStyles.container}>
      <Text style={[
        responsiveStyles.title,
        {fontSize: normalize(isTablet ? 28 : 24)}
      ]}>
        响应式标题
      </Text>

      <View style={[
        responsiveStyles.content,
        {
          flexDirection: isTablet ? 'row' : 'column',
          padding: isTablet ? 30 : 20,
        }
      ]}>
        <View style={[
          responsiveStyles.card,
          {
            width: isTablet ? '48%' : '100%',
            marginBottom: isTablet ? 0 : 20,
          }
        ]}>
          <Text style={responsiveStyles.cardText}>卡片 1</Text>
        </View>

        <View style={[
          responsiveStyles.card,
          {
            width: isTablet ? '48%' : '100%',
            marginLeft: isTablet ? '4%' : 0,
          }
        ]}>
          <Text style={responsiveStyles.cardText}>卡片 2</Text>
        </View>
      </View>
    </View>
  );
};

const responsiveStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150,
  },
  cardText: {
    fontSize: normalize(16),
    color: '#333',
    fontWeight: '500',
  },
});
```

## 🎯 实践项目：个人资料卡片

让我们创建一个完整的个人资料卡片组件，综合运用本章学到的知识：

```typescript
import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';

const {width} = Dimensions.get('window');

interface Skill {
  name: string;
  level: number;
}

interface ProfileData {
  name: string;
  title: string;
  avatar: string;
  bio: string;
  location: string;
  email: string;
  skills: Skill[];
  stats: {
    projects: number;
    followers: number;
    following: number;
  };
}

const ProfileCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'about' | 'skills'>('about');

  const profileData: ProfileData = {
    name: '张小明',
    title: 'React Native 开发工程师',
    avatar: 'https://picsum.photos/150/150?random=1',
    bio: '热爱技术的移动应用开发者，专注于 React Native 和跨平台开发。喜欢分享技术经验，持续学习新技术。',
    location: '北京，中国',
    email: 'zhangxiaoming@example.com',
    skills: [
      {name: 'React Native', level: 90},
      {name: 'TypeScript', level: 85},
      {name: 'React', level: 88},
      {name: 'Node.js', level: 75},
      {name: 'Flutter', level: 60},
    ],
    stats: {
      projects: 24,
      followers: 1205,
      following: 186,
    },
  };

  const renderSkillBar = (skill: Skill) => (
    <View key={skill.name} style={profileStyles.skillItem}>
      <View style={profileStyles.skillHeader}>
        <Text style={profileStyles.skillName}>{skill.name}</Text>
        <Text style={profileStyles.skillLevel}>{skill.level}%</Text>
      </View>
      <View style={profileStyles.skillBarContainer}>
        <View
          style={[
            profileStyles.skillBar,
            {width: `${skill.level}%`}
          ]}
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={profileStyles.container}>
      {/* 头部信息 */}
      <View style={profileStyles.header}>
        <Image source={{uri: profileData.avatar}} style={profileStyles.avatar} />
        <Text style={profileStyles.name}>{profileData.name}</Text>
        <Text style={profileStyles.title}>{profileData.title}</Text>
        <Text style={profileStyles.location}>{profileData.location}</Text>
      </View>

      {/* 统计信息 */}
      <View style={profileStyles.statsContainer}>
        <View style={profileStyles.statItem}>
          <Text style={profileStyles.statNumber}>{profileData.stats.projects}</Text>
          <Text style={profileStyles.statLabel}>项目</Text>
        </View>
        <View style={profileStyles.statDivider} />
        <View style={profileStyles.statItem}>
          <Text style={profileStyles.statNumber}>{profileData.stats.followers}</Text>
          <Text style={profileStyles.statLabel}>关注者</Text>
        </View>
        <View style={profileStyles.statDivider} />
        <View style={profileStyles.statItem}>
          <Text style={profileStyles.statNumber}>{profileData.stats.following}</Text>
          <Text style={profileStyles.statLabel}>关注中</Text>
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={profileStyles.actionContainer}>
        <TouchableOpacity style={profileStyles.primaryButton}>
          <Text style={profileStyles.primaryButtonText}>关注</Text>
        </TouchableOpacity>
        <TouchableOpacity style={profileStyles.secondaryButton}>
          <Text style={profileStyles.secondaryButtonText}>消息</Text>
        </TouchableOpacity>
      </View>

      {/* 标签页 */}
      <View style={profileStyles.tabContainer}>
        <TouchableOpacity
          style={[
            profileStyles.tab,
            activeTab === 'about' && profileStyles.activeTab
          ]}
          onPress={() => setActiveTab('about')}
        >
          <Text style={[
            profileStyles.tabText,
            activeTab === 'about' && profileStyles.activeTabText
          ]}>
            关于
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            profileStyles.tab,
            activeTab === 'skills' && profileStyles.activeTab
          ]}
          onPress={() => setActiveTab('skills')}
        >
          <Text style={[
            profileStyles.tabText,
            activeTab === 'skills' && profileStyles.activeTabText
          ]}>
            技能
          </Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <View style={profileStyles.content}>
        {activeTab === 'about' ? (
          <View>
            <Text style={profileStyles.sectionTitle}>个人简介</Text>
            <Text style={profileStyles.bio}>{profileData.bio}</Text>

            <Text style={profileStyles.sectionTitle}>联系方式</Text>
            <Text style={profileStyles.contactInfo}>📧 {profileData.email}</Text>
            <Text style={profileStyles.contactInfo}>📍 {profileData.location}</Text>
          </View>
        ) : (
          <View>
            <Text style={profileStyles.sectionTitle}>技能水平</Text>
            {profileData.skills.map(renderSkillBar)}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f8f9fa',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#fff',
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
    marginBottom: 5,
  },
  location: {
    fontSize: 14,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 25,
  },
  contactInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  skillItem: {
    marginBottom: 20,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  skillLevel: {
    fontSize: 12,
    color: '#666',
  },
  skillBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
});

export default ProfileCard;
```

## 🎉 本章小结

在这一章中，我们深入学习了：

- ✅ React Native 的核心组件（View、Text、Image、Button 等）
- ✅ 交互组件的使用（TouchableOpacity、TextInput）
- ✅ 列表组件（ScrollView、FlatList）的高效使用
- ✅ Flexbox 布局系统的完整掌握
- ✅ 样式系统的高级技巧
- ✅ 响应式设计的实现方法
- ✅ 综合实践项目的开发

## 📝 作业

1. 完成个人资料卡片项目，并添加更多功能
2. 尝试创建一个简单的商品列表页面
3. 实践不同的布局方式，理解 Flexbox 的各种属性

准备好学习导航了吗？让我们继续[第3章：导航与路由](/react-native-tutorial/chapter-03/README.md)！
```
