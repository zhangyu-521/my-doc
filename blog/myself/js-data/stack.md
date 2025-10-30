# 栈

- 后进先出
- js中没有栈的数据结构，可以使用数组模拟
- 栈在js中的应用
  - 函数调用栈
  - 递归
  - 表达式求值与语法解析

## 实现栈

``` js
const stack = []
stack.push(1) // 入栈
stack.pop() // 出栈
```
## 使用类封装栈
``` js
class Stack {
    #stack = []
    constructor(arr = []) {
        this.#stack = arr
    }

    push(val) {
        this.#stack.push(val)
        return this.#stack
    }

    pop() {
        return this.#stack.pop()
    }

    size() {
        return this.#stack.length
    }

    clear() {
        this.#stack = []
    }

    shift() {
        this.#stack.shift()
    }
}
```

## 使用栈模拟浏览器的前进和后退

``` js
class TabStack {
    #currentTab = '默认'
    #backStack = new Stack()
    #forWardStack = new Stack()
    #maxStack = 10

    // 只读状态
    get current() { return this.#currentTab }
    get canGoBack() { return this.#backStack.size() !== 0; }
    get canGoForward() { return this.#forWardStack.size() !== 0; }

    clickLink(val) {
        if (val === this.#currentTab) return;
        if (this.#backStack.size() === this.#maxStack) this.#backStack.shift()
        this.#backStack.push(this.#currentTab)
        this.#currentTab = val
        this.#forWardStack.clear()
    }

    forward() {
        if (this.#forWardStack.size() == 0) return false
        this.#backStack.push(this.#currentTab)
        this.#currentTab = this.#forWardStack.pop()
        return true
    }

    back() {
        if (this.#backStack.size() == 0) return false
        this.#forWardStack.push(this.#currentTab)
        this.#currentTab = this.#backStack.pop()
        return true
    }
}
```

## leetCode经典算法
- 有效的括号（20）
- 最小栈（155）
- 每日温度（739）
- 逆波兰表达式求值（150）