在 React 中，**Hooks** 是一个强大的特性，它允许你在不使用 class 组件的情况下，使用状态（state）和其他 React 特性。自从 React 16.8 推出以来，Hooks 已成为编写函数式组件的标准方式。下面，我们详细介绍几个最常用的 Hooks 及其用法和参数。

-----

### 1\. `useState`：管理状态

`useState` 是最基础的 Hook，用于在函数式组件中添加可变的状态。当状态改变时，组件会自动重新渲染。

**用法：**

```jsx
import React, { useState } from 'react';

const [state, setState] = useState(initialState);
```

**参数与返回值：**

  * **参数 `initialState`：** 状态的初始值。它只在组件的**首次渲染**时生效。如果传入一个函数，该函数只会执行一次以计算初始值，这对于初始值计算量大的场景很有用。
  * **返回值：** 一个包含两个元素的数组。
      * **`state`：** 当前的状态值。
      * **`setState`：** 一个更新状态的函数。调用这个函数后，React 会重新渲染组件。

**示例：**

```jsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>点击了 {count} 次</p>
      <button onClick={() => setCount(count + 1)}>
        点击
      </button>
    </div>
  );
}
```

-----

### 2\. `useEffect`：处理副作用

`useEffect` 用于处理组件的**副作用**（Side Effects），例如数据获取、订阅事件、手动操作 DOM 等。它会在组件渲染后执行。

**用法：**

```jsx
import React, { useEffect } from 'react';

useEffect(() => {
  // 副作用代码
  return () => {
    // 可选：清理函数，在组件卸载或下次执行前调用
  };
}, [dependencies]);
```

**参数与返回值：**

  * **第一个参数（回调函数）：** 包含副作用逻辑的函数。该函数可以返回一个**清理函数**。
  * **第二个参数（依赖项数组）：** 一个可选数组，包含 `useEffect` 依赖的值。
      * **不传依赖项：** 每次渲染后都会执行。
      * **传入空数组 `[]`：** 只在组件**首次挂载**时执行一次，通常用于数据获取或订阅。
      * **传入依赖项数组 `[dep1, dep2]`：** 在首次挂载时执行，并且在依赖项中的**任何一个值发生变化**时再次执行。

**示例：**

```jsx
import React, { useState, useEffect } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // 在组件首次挂载时执行，模拟数据获取
    fetch('https://api.example.com/data')
      .then(res => res.json())
      .then(result => setData(result));
  }, []); // 空数组，只执行一次

  return (
    <div>
      {data ? <p>数据已加载</p> : <p>加载中...</p>}
    </div>
  );
}
```

-----

### 3\. `useRef`：保存可变值

`useRef` 主要用于在组件的整个生命周期中**保存一个可变的值**，且该值的变化**不会引起组件重新渲染**。它常用于获取 DOM 元素引用或在多次渲染之间共享数据。

**用法：**

```jsx
import React, { useRef } from 'react';

const refContainer = useRef(initialValue);
```

**参数与返回值：**

  * **参数 `initialValue`：** `current` 属性的初始值。
  * **返回值：** 一个普通 JavaScript 对象，其属性 `current` 可被修改。

**示例：**

```jsx
import React, { useRef } from 'react';

function TextInputWithFocusButton() {
  const inputEl = useRef(null);

  const onButtonClick = () => {
    // `current` 指向已挂载到 DOM 上的输入框
    inputEl.current.focus();
  };

  return (
    <>
      <input ref={inputEl} type="text" />
      <button onClick={onButtonClick}>
        点击输入框
      </button>
    </>
  );
}
```

-----

### 4\. `useMemo`：性能优化

`useMemo` 用于**记忆**一个计算结果。它会缓存函数执行的结果，只有当依赖项发生变化时，才会重新计算。这能有效避免在每次渲染时都进行重复的、耗时的计算。

**用法：**

```jsx
import React, { useMemo } from 'react';

const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
```

**参数与返回值：**

  * **第一个参数（创建函数）：** 一个返回计算结果的函数。
  * **第二个参数（依赖项数组）：** 包含依赖值的数组。如果依赖项没有变化，`useMemo` 会直接返回上一次的缓存结果。
  * **返回值：** 记忆化的计算结果。

**示例：**

```jsx
import React, { useState, useMemo } from 'react';

function ExpensiveCalculation() {
  const [count, setCount] = useState(0);

  // 模拟一个耗时计算，只有当 count 变化时才重新计算
  const expensiveResult = useMemo(() => {
    console.log('正在进行昂贵的计算...');
    // 这里执行复杂的计算
    return count * 2;
  }, [count]);

  return (
    <div>
      <p>计数: {count}</p>
      <p>计算结果: {expensiveResult}</p>
      <button onClick={() => setCount(count + 1)}>
        增加计数
      </button>
    </div>
  );
}
```

当然，`useCallback` 是另一个重要的性能优化 Hook。它与 `useMemo` 类似，但它**记忆的是函数本身**，而不是函数的返回值。这在将函数作为 `props` 传递给子组件时尤其有用，可以防止子组件进行不必要的重新渲染。

-----

### 5\. `useCallback`：记忆函数

`useCallback` 返回一个**记忆化的回调函数**。只有当它的依赖项发生变化时，它才会返回一个新的函数。这对于将回调函数传递给使用 `React.memo` 优化的子组件非常重要。

**用法：**

```jsx
import React, { useCallback } from 'react';

const memoizedCallback = useCallback(
  () => {
    // 函数体
  },
  [dependencies],
);
```

**参数与返回值：**

  * **第一个参数（回调函数）：** 需要被记忆的函数。
  * **第二个参数（依赖项数组）：** 包含依赖值的数组。当依赖项中的任何一个值改变时，`useCallback` 才会返回一个新的函数实例。
  * **返回值：** 记忆化的回调函数。

**示例：**

```jsx
import React, { useState, useCallback, memo } from 'react';

// 使用 React.memo 优化子组件，只有当 props 改变时才会重新渲染
const Button = memo(({ onClick, children }) => {
  console.log('Button 组件重新渲染');
  return <button onClick={onClick}>{children}</button>;
});

function ParentComponent() {
  const [count, setCount] = useState(0);

  // 没有使用 useCallback，每次 ParentComponent 渲染，handleClick 都会是一个新函数
  // const handleClick = () => {
  //   console.log(`你点击了 ${count} 次`);
  //   setCount(count + 1);
  // };

  // 使用 useCallback 记忆函数，只有当 count 变化时，才会创建新的函数实例
  const handleClick = useCallback(() => {
    console.log(`你点击了 ${count} 次`);
    setCount(count + 1);
  }, [count]); // 依赖项为 count

  return (
    <div>
      <p>父组件计数: {count}</p>
      <Button onClick={handleClick}>点击我</Button>
    </div>
  );
}
```

在上面的例子中，如果注释掉 `useCallback`，每次 `ParentComponent` 渲染时（例如，当 `count` 改变时），`handleClick` 都会被重新创建。由于 `Button` 组件的 `onClick` prop 接收到了一个新函数，`memo` 会认为 `props` 发生了变化，从而导致 `Button` 组件不必要的重新渲染。

通过使用 `useCallback`，我们确保 `handleClick` 函数的引用只有在 `count` 改变时才会更新。这样，当父组件因为其他原因重新渲染时（例如有其他状态改变），`Button` 组件的 `onClick` prop 仍然是同一个函数，`memo` 就会阻止 `Button` 重新渲染，从而实现性能优化。

### 总结

| Hook          | 用途         | 记忆/缓存内容  | 触发重新创建/计算的条件 | 典型应用场景                 |
| ------------- | ------------ | -------------- | ----------------------- | ---------------------------- |
| `useState`    | 管理状态     | 状态值         | 调用 `setState`         | 任何需要管理状态的场景       |
| `useEffect`   | 处理副作用   | -              | 依赖项改变或每次渲染    | 数据获取、订阅、操作 DOM     |
| `useRef`      | 保存可变值   | `current` 属性 | -                       | 获取 DOM、保存定时器 ID      |
| `useMemo`     | 记忆计算结果 | 计算结果       | 依赖项改变              | 昂贵计算的性能优化           |
| `useCallback` | 记忆函数     | 函数实例       | 依赖项改变              | 传递函数给子组件进行性能优化 |