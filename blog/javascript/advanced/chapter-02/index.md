# 第2章：高级异步编程

## 📖 本章概述

异步编程是现代JavaScript开发的核心技能。本章将深入探讨Promise的实现原理、async/await的底层机制、Generator函数的高级用法，以及如何优雅地处理复杂的异步场景。

## 🎯 学习目标

完成本章学习后，你将能够：

- 理解Promise的完整实现原理
- 掌握async/await的底层转换机制
- 熟练使用Generator进行异步控制
- 实现高级的异步模式和并发控制
- 优雅地处理异步错误和取消操作

## 🔄 Promise深度解析

### Promise状态机制

Promise有三种状态，状态转换是不可逆的：

```javascript
// Promise状态转换
const promise = new Promise((resolve, reject) => {
    // pending状态
    console.log('Promise创建，状态：pending');
    
    setTimeout(() => {
        if (Math.random() > 0.5) {
            resolve('成功'); // pending -> fulfilled
        } else {
            reject('失败');  // pending -> rejected
        }
    }, 1000);
});

promise
    .then(value => console.log('fulfilled:', value))
    .catch(error => console.log('rejected:', error));
```

### 手写Promise实现

```javascript
class MyPromise {
    constructor(executor) {
        this.state = 'pending';
        this.value = undefined;
        this.reason = undefined;
        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];
        
        const resolve = (value) => {
            if (this.state === 'pending') {
                this.state = 'fulfilled';
                this.value = value;
                this.onFulfilledCallbacks.forEach(fn => fn());
            }
        };
        
        const reject = (reason) => {
            if (this.state === 'pending') {
                this.state = 'rejected';
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn => fn());
            }
        };
        
        try {
            executor(resolve, reject);
        } catch (error) {
            reject(error);
        }
    }
    
    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason; };
        
        const promise2 = new MyPromise((resolve, reject) => {
            if (this.state === 'fulfilled') {
                setTimeout(() => {
                    try {
                        const x = onFulfilled(this.value);
                        this.resolvePromise(promise2, x, resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                });
            } else if (this.state === 'rejected') {
                setTimeout(() => {
                    try {
                        const x = onRejected(this.reason);
                        this.resolvePromise(promise2, x, resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                });
            } else if (this.state === 'pending') {
                this.onFulfilledCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            const x = onFulfilled(this.value);
                            this.resolvePromise(promise2, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            const x = onRejected(this.reason);
                            this.resolvePromise(promise2, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
            }
        });
        
        return promise2;
    }
    
    resolvePromise(promise2, x, resolve, reject) {
        if (promise2 === x) {
            return reject(new TypeError('循环引用'));
        }
        
        if (x instanceof MyPromise) {
            x.then(resolve, reject);
        } else {
            resolve(x);
        }
    }
    
    catch(onRejected) {
        return this.then(null, onRejected);
    }
    
    static resolve(value) {
        return new MyPromise(resolve => resolve(value));
    }
    
    static reject(reason) {
        return new MyPromise((resolve, reject) => reject(reason));
    }
    
    static all(promises) {
        return new MyPromise((resolve, reject) => {
            const results = [];
            let completedCount = 0;
            
            promises.forEach((promise, index) => {
                MyPromise.resolve(promise).then(value => {
                    results[index] = value;
                    completedCount++;
                    if (completedCount === promises.length) {
                        resolve(results);
                    }
                }, reject);
            });
        });
    }
    
    static race(promises) {
        return new MyPromise((resolve, reject) => {
            promises.forEach(promise => {
                MyPromise.resolve(promise).then(resolve, reject);
            });
        });
    }
}
```

### Promise高级用法

```javascript
// Promise.allSettled实现
Promise.myAllSettled = function(promises) {
    return Promise.all(
        promises.map(promise =>
            Promise.resolve(promise)
                .then(value => ({ status: 'fulfilled', value }))
                .catch(reason => ({ status: 'rejected', reason }))
        )
    );
};

// 使用示例
const promises = [
    Promise.resolve(1),
    Promise.reject('error'),
    Promise.resolve(3)
];

Promise.myAllSettled(promises).then(results => {
    console.log(results);
    // [
    //   { status: 'fulfilled', value: 1 },
    //   { status: 'rejected', reason: 'error' },
    //   { status: 'fulfilled', value: 3 }
    // ]
});
```

## 🔄 async/await深度解析

### async/await转换原理

async/await本质上是Generator + Promise的语法糖：

```javascript
// async/await代码
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// 等价的Generator实现
function* fetchDataGenerator() {
    try {
        const response = yield fetch('/api/data');
        const data = yield response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// 自动执行器
function runGenerator(generatorFn) {
    return new Promise((resolve, reject) => {
        const generator = generatorFn();
        
        function step(nextFn) {
            let next;
            try {
                next = nextFn();
            } catch (error) {
                return reject(error);
            }
            
            if (next.done) {
                return resolve(next.value);
            }
            
            Promise.resolve(next.value).then(
                value => step(() => generator.next(value)),
                error => step(() => generator.throw(error))
            );
        }
        
        step(() => generator.next());
    });
}

// 使用
runGenerator(fetchDataGenerator).then(data => console.log(data));
```

### 错误处理最佳实践

```javascript
// 统一错误处理
class AsyncErrorHandler {
    static async safeExecute(asyncFn, fallback = null) {
        try {
            return await asyncFn();
        } catch (error) {
            console.error('Async operation failed:', error);
            return fallback;
        }
    }
    
    static async retry(asyncFn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await asyncFn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
}

// 使用示例
async function unreliableAPI() {
    if (Math.random() < 0.7) {
        throw new Error('API调用失败');
    }
    return { data: 'success' };
}

// 安全执行
const result = await AsyncErrorHandler.safeExecute(
    unreliableAPI,
    { data: 'fallback' }
);

// 重试机制
const retryResult = await AsyncErrorHandler.retry(unreliableAPI, 3, 500);
```

## ⚡ Generator高级应用

### Generator基础与迭代器协议

```javascript
// Generator函数基础
function* numberGenerator() {
    let index = 0;
    while (true) {
        yield index++;
    }
}

const gen = numberGenerator();
console.log(gen.next()); // { value: 0, done: false }
console.log(gen.next()); // { value: 1, done: false }

// 双向通信
function* twoWayGenerator() {
    const input1 = yield 'First yield';
    console.log('Received:', input1);
    
    const input2 = yield 'Second yield';
    console.log('Received:', input2);
    
    return 'Generator finished';
}

const twoWayGen = twoWayGenerator();
console.log(twoWayGen.next());        // { value: 'First yield', done: false }
console.log(twoWayGen.next('Hello')); // { value: 'Second yield', done: false }
console.log(twoWayGen.next('World')); // { value: 'Generator finished', done: true }
```

### 异步Generator

```javascript
// 异步Generator
async function* asyncDataStream() {
    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        yield `Data chunk ${i}`;
    }
}

// 使用for-await-of消费异步Generator
async function consumeAsyncStream() {
    for await (const chunk of asyncDataStream()) {
        console.log('Received:', chunk);
    }
}

consumeAsyncStream();
```

### Generator实现协程

```javascript
// 使用Generator实现简单的协程调度器
class TaskScheduler {
    constructor() {
        this.tasks = [];
        this.running = false;
    }
    
    addTask(generatorFn) {
        this.tasks.push(generatorFn());
    }
    
    async run() {
        if (this.running) return;
        this.running = true;
        
        while (this.tasks.length > 0) {
            const activeTasks = [...this.tasks];
            this.tasks = [];
            
            for (const task of activeTasks) {
                const { value, done } = task.next();
                
                if (!done) {
                    if (value instanceof Promise) {
                        await value;
                    }
                    this.tasks.push(task);
                }
            }
            
            // 让出控制权
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        this.running = false;
    }
}

// 使用示例
function* task1() {
    console.log('Task 1 - Step 1');
    yield new Promise(resolve => setTimeout(resolve, 100));
    console.log('Task 1 - Step 2');
    yield;
    console.log('Task 1 - Step 3');
}

function* task2() {
    console.log('Task 2 - Step 1');
    yield;
    console.log('Task 2 - Step 2');
    yield new Promise(resolve => setTimeout(resolve, 50));
    console.log('Task 2 - Step 3');
}

const scheduler = new TaskScheduler();
scheduler.addTask(task1);
scheduler.addTask(task2);
scheduler.run();
```

## 🚦 并发控制与限流

### 并发限制器

```javascript
class ConcurrencyLimiter {
    constructor(limit) {
        this.limit = limit;
        this.running = 0;
        this.queue = [];
    }
    
    async execute(asyncFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                asyncFn,
                resolve,
                reject
            });
            this.process();
        });
    }
    
    async process() {
        if (this.running >= this.limit || this.queue.length === 0) {
            return;
        }
        
        this.running++;
        const { asyncFn, resolve, reject } = this.queue.shift();
        
        try {
            const result = await asyncFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process();
        }
    }
}

// 使用示例
const limiter = new ConcurrencyLimiter(3);

const tasks = Array.from({ length: 10 }, (_, i) => 
    () => new Promise(resolve => {
        console.log(`Task ${i} started`);
        setTimeout(() => {
            console.log(`Task ${i} completed`);
            resolve(i);
        }, Math.random() * 2000);
    })
);

// 并发执行，但最多同时3个
Promise.all(tasks.map(task => limiter.execute(task)))
    .then(results => console.log('All tasks completed:', results));
```

### 请求去重与缓存

```javascript
class RequestDeduplicator {
    constructor() {
        this.cache = new Map();
        this.pending = new Map();
    }
    
    async request(key, requestFn, ttl = 60000) {
        // 检查缓存
        if (this.cache.has(key)) {
            const { data, timestamp } = this.cache.get(key);
            if (Date.now() - timestamp < ttl) {
                return data;
            }
            this.cache.delete(key);
        }
        
        // 检查是否有相同请求正在进行
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }
        
        // 发起新请求
        const promise = requestFn()
            .then(data => {
                this.cache.set(key, { data, timestamp: Date.now() });
                this.pending.delete(key);
                return data;
            })
            .catch(error => {
                this.pending.delete(key);
                throw error;
            });
        
        this.pending.set(key, promise);
        return promise;
    }
}

// 使用示例
const deduplicator = new RequestDeduplicator();

async function fetchUserData(userId) {
    return deduplicator.request(
        `user:${userId}`,
        () => fetch(`/api/users/${userId}`).then(res => res.json()),
        30000 // 30秒缓存
    );
}

// 多次调用相同用户ID，只会发起一次请求
Promise.all([
    fetchUserData(1),
    fetchUserData(1),
    fetchUserData(1)
]).then(results => console.log(results));
```

## 📝 本章小结

本章深入探讨了JavaScript异步编程的高级技术：

1. **Promise原理**：理解状态机制和链式调用的实现
2. **async/await**：掌握其Generator + Promise的本质
3. **Generator应用**：实现协程、异步迭代等高级模式
4. **并发控制**：限流、去重、缓存等实用技术

这些技术将帮助你：
- 编写更优雅的异步代码
- 处理复杂的并发场景
- 优化应用性能和用户体验
- 避免常见的异步编程陷阱

## 🚀 下一章预告

下一章我们将学习**内存管理与性能优化**，深入了解垃圾回收机制、内存泄漏检测和性能分析工具的使用。

---

**继续学习：[第3章：内存管理与性能优化](../chapter-03/)**
