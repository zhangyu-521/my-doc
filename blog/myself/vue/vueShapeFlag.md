# vue中对节点的标记ShapeFlags
在vue中，为了方便对节点进行判断，vue定义了枚举类型ShapeFlags，用于标记节点的类型。

``` js
enum ShapeFlags { // 对元素形状的判断
  ELEMENT = 1, // 1 元素
  FUNCTIONAL_COMPONENT = 1 << 1, // 2 函数式组件
  STATEFUL_COMPONENT = 1 << 2, //  4 状态组件
  TEXT_CHILDREN = 1 << 3, // 8 文本子节点
  ARRAY_CHILDREN = 1 << 4, // 16 数组子节点
  SLOTS_CHILDREN = 1 << 5, // 32 插槽子节点
  TELEPORT = 1 << 6, // 64 表示 VNode 是一个 <Teleport> 节点，用于在 DOM 中的其他位置渲染内容
  SUSPENSE = 1 << 7, // 128 表示 VNode 是一个 <Suspense> 节点，用于异步组件的懒加载
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // 256 表示 VNode 的组件应该被保持活跃状态（用于 <KeepAlive>）
  COMPONENT_KEPT_ALIVE = 1 << 9,    // 512 表示 VNode 的组件已经被保持活跃状态（用于 <KeepAlive>）
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT, // 6 表示 VNode 是一个组件（可以是函数式组件或有状态组件）。
}

````

## 位运算

在计算机中，数字是以二进制形式存储的。eg:
-  1 = 0001
-  2 = 0010
-  4 = 0100
-  8 = 1000

每个 `ShapeFlags` 标志的值都是通过位移操作`（<<）`生成的，这样可以确保每个标志的值在二进制表示中只有一个位是 1，其余位都是 0。eg：
- `ELEMENT = 1` 的二进制表示为 0001
- `FUNCTIONAL_COMPONENT = 1 << 1` 的二进制表示为 0010
- `STATEFUL_COMPONENT = 1 << 2` 的二进制表示为 0100
- `TEXT_CHILDREN = 1 << 3` 的二进制表示为 1000
- `ARRAY_CHILDREN = 1 << 4` 的二进制表示为 10000

## 按位或来组合标志
`|` 运算符的作用是将两个数字的二进制表示逐位进行逻辑或运算。如果两个位中至少有一个是` 1`，结果就是 `1`；否则是 `0`

假设我们有一个 VNode，它既是函数式组件，又有状态组件的特征。我们可以这样组合标志：
``` typeScript
vnode.shapeFlag |= ShapeFlags.FUNCTIONAL_COMPONENT | ShapeFlags.STATEFUL_COMPONENT;
```

在二进制表示中：
- `FUNCTIONAL_COMPONENT = 0010`
- `STATEFUL_COMPONENT = 0100`

按位或运算后：
```
0010
0100
----
0110
```

结果是 `0110`，即十进制的 `6`。因此，`vnode.shapeFlag `的值会变成 `6`

***这就表示该组件是 函数式组件，又是状态组件***

## 按位与来判断标志
`&` 运算符的作用是将两个数字的二进制表示逐位进行逻辑与运算。只有当两个位都是 `1` 时，结果才是 `1`；否则是 `0`。

假设我们有一个 `VNode`，它的 `shapeFlag` 值是 `6`（二进制表示为 0110）。我们想检查它是否是一个函数式组件：

``` js
if (vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT) {
  console.log('这是一个函数式组件');
}
```
在二进制表示中：
- `vnode.shapeFlag = 0110`
- `FUNCTIONAL_COMPONENT = 0010`

按位与运算后：
```
0110
0010
----
0010
```

结果是 `0010`，即十进制的 `2`。因此，`vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT` 的值是 `2`，表示该节点是一个函数式组件。

## 清除标志
如果需要清除某个标志，可以使用按位与运算符 `&` 和按位取反运算符 `~`。例如，清除 `FUNCTIONAL_COMPONENT` 标志：

``` js
vnode.shapeFlag &= ~ShapeFlags.FUNCTIONAL_COMPONENT;
```
在二进制表示中：
- `vnode.shapeFlag = 0110`
- `~FUNCTIONAL_COMPONENT = 1101` （取反）

按位与运算后：
```
0110
1101
----
0100
```

结果是 `0100`，即十进制的 `4`。因此，`vnode.shapeFlag` 的值会变成 `4`，表示该节点是一个状态组件，但不再是函数式组件。

## 总结
通过使用位运算符，我们可以高效地组合和判断节点的类型。这种方法不仅简洁，而且性能优越，因为位运算在计算机中是非常快速的。
我们就可以吸取这种标志发方式，来运用到权限设计等地方。
