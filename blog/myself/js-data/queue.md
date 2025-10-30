# 队列
- 先进先出

``` js
const q = [];
q.push(1);      // 入队
q.push(2);
const head = q.shift(); // 出队 → 1
```

## 双端队列
``` js
const deque = [];
// 头部
deque.unshift(1);   // 前插
const left = deque.shift(); // 前出
// 尾部
deque.push(2);      // 后插
const right = deque.pop();  // 后出
```
适用于:
 - 滑动窗口最大值（LeetCode 239）
 - 回文串验证（LeetCode 680）


## 定长循环队列（手动写环形索引）
``` js
class CircularQueue {
  constructor(k) {
    this.q = new Array(k);
    this.head = 0;
    this.tail = 0;
    this.cnt = 0;
    this.cap = k;
  }
  enQueue(val) {
    if (this.isFull()) return false;
    this.q[this.tail] = val;
    this.tail = (this.tail + 1) % this.cap;
    this.cnt++;
    return true;
  }
  deQueue() {
    if (this.isEmpty()) return false;
    this.head = (this.head + 1) % this.cap;
    this.cnt--;
    return true;
  }
  Front() { return this.isEmpty() ? -1 : this.q[this.head]; }
  Rear()  { return this.isEmpty() ? -1 : this.q[(this.tail - 1 + this.cap) % this.cap]; }
  isEmpty() { return this.cnt === 0; }
  isFull()  { return this.cnt === this.cap; }
}
```

LeetCode 622
