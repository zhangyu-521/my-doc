# 第3章：异步编程与事件循环

## 本章目标

- 深入理解Node.js事件循环机制
- 掌握回调函数的使用和问题
- 学会使用Promise处理异步操作
- 熟练运用async/await语法
- 了解不同异步编程模式的优缺点

## 3.1 事件循环深入解析

### 事件循环基本概念

Node.js是单线程的，但通过事件循环实现了非阻塞I/O操作。事件循环是Node.js处理异步操作的核心机制。

### 事件循环的阶段

```javascript
// event-loop-demo.js - 事件循环演示

console.log('=== 事件循环阶段演示 ===');

// 1. 同步代码（立即执行）
console.log('1. 同步代码开始');

// 2. setTimeout（Timer阶段）
setTimeout(() => {
    console.log('4. setTimeout 0ms');
}, 0);

setTimeout(() => {
    console.log('6. setTimeout 10ms');
}, 10);

// 3. setImmediate（Check阶段）
setImmediate(() => {
    console.log('5. setImmediate');
});

// 4. process.nextTick（优先级最高）
process.nextTick(() => {
    console.log('2. process.nextTick');
});

// 5. Promise（微任务队列）
Promise.resolve().then(() => {
    console.log('3. Promise.then');
});

console.log('1. 同步代码结束');

// 输出顺序：
// 1. 同步代码开始
// 1. 同步代码结束
// 2. process.nextTick
// 3. Promise.then
// 4. setTimeout 0ms
// 5. setImmediate
// 6. setTimeout 10ms
```

### 事件循环详细阶段

```javascript
// event-loop-phases.js - 事件循环各阶段详解

const fs = require('fs');

console.log('开始执行');

// Timer阶段：执行setTimeout和setInterval的回调
setTimeout(() => console.log('Timer: setTimeout'), 0);

// Pending callbacks阶段：执行延迟到下一个循环迭代的I/O回调
fs.readFile(__filename, () => {
    console.log('I/O: fs.readFile');
    
    // 在I/O回调中的定时器和setImmediate
    setTimeout(() => console.log('Timer: setTimeout in I/O'), 0);
    setImmediate(() => console.log('Check: setImmediate in I/O'));
});

// Check阶段：执行setImmediate回调
setImmediate(() => console.log('Check: setImmediate'));

// 微任务队列（在每个阶段结束后执行）
process.nextTick(() => console.log('NextTick: process.nextTick'));
Promise.resolve().then(() => console.log('Microtask: Promise.then'));

console.log('同步代码结束');
```

## 3.2 回调函数与回调地狱

### 基本回调函数

```javascript
// callback-basics.js - 回调函数基础

const fs = require('fs');

// 简单的回调函数
function readFileCallback(filename, callback) {
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, data);
    });
}

// 使用回调函数
readFileCallback('package.json', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err.message);
        return;
    }
    console.log('文件内容长度:', data.length);
});

// 错误优先的回调模式（Error-first callback）
function processData(data, callback) {
    // 模拟异步处理
    setTimeout(() => {
        try {
            const result = JSON.parse(data);
            callback(null, result); // 成功：第一个参数为null
        } catch (error) {
            callback(error); // 失败：第一个参数为错误对象
        }
    }, 100);
}
```

### 回调地狱问题

```javascript
// callback-hell.js - 回调地狱示例

const fs = require('fs');
const path = require('path');

// 回调地狱：多层嵌套的回调函数
function processFiles() {
    fs.readFile('file1.txt', 'utf8', (err1, data1) => {
        if (err1) {
            console.error('读取file1失败:', err1);
            return;
        }
        
        fs.readFile('file2.txt', 'utf8', (err2, data2) => {
            if (err2) {
                console.error('读取file2失败:', err2);
                return;
            }
            
            fs.readFile('file3.txt', 'utf8', (err3, data3) => {
                if (err3) {
                    console.error('读取file3失败:', err3);
                    return;
                }
                
                // 处理三个文件的数据
                const combinedData = data1 + data2 + data3;
                
                fs.writeFile('combined.txt', combinedData, (err4) => {
                    if (err4) {
                        console.error('写入文件失败:', err4);
                        return;
                    }
                    console.log('文件合并完成');
                });
            });
        });
    });
}

// 改进：使用命名函数减少嵌套
function readFile1() {
    fs.readFile('file1.txt', 'utf8', (err, data) => {
        if (err) return handleError(err);
        readFile2(data);
    });
}

function readFile2(data1) {
    fs.readFile('file2.txt', 'utf8', (err, data) => {
        if (err) return handleError(err);
        readFile3(data1, data);
    });
}

function readFile3(data1, data2) {
    fs.readFile('file3.txt', 'utf8', (err, data) => {
        if (err) return handleError(err);
        writeFile(data1 + data2 + data);
    });
}

function writeFile(combinedData) {
    fs.writeFile('combined.txt', combinedData, (err) => {
        if (err) return handleError(err);
        console.log('文件合并完成');
    });
}

function handleError(err) {
    console.error('操作失败:', err.message);
}
```

## 3.3 Promise详解

### Promise基础

```javascript
// promise-basics.js - Promise基础

// 创建Promise
function readFilePromise(filename) {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                reject(err); // 失败时调用reject
            } else {
                resolve(data); // 成功时调用resolve
            }
        });
    });
}

// 使用Promise
readFilePromise('package.json')
    .then(data => {
        console.log('文件读取成功，长度:', data.length);
        return JSON.parse(data); // 返回值会传递给下一个then
    })
    .then(jsonData => {
        console.log('包名:', jsonData.name);
        console.log('版本:', jsonData.version);
    })
    .catch(err => {
        console.error('操作失败:', err.message);
    })
    .finally(() => {
        console.log('Promise执行完成');
    });
```

### Promise状态和方法

```javascript
// promise-states.js - Promise状态演示

// Promise的三种状态：pending、fulfilled、rejected

// 1. 立即resolve的Promise
const resolvedPromise = Promise.resolve('成功的值');
resolvedPromise.then(value => console.log('Resolved:', value));

// 2. 立即reject的Promise
const rejectedPromise = Promise.reject(new Error('失败的原因'));
rejectedPromise.catch(err => console.log('Rejected:', err.message));

// 3. 延迟resolve的Promise
const delayedPromise = new Promise(resolve => {
    setTimeout(() => resolve('延迟的结果'), 1000);
});

// Promise.all - 等待所有Promise完成
const promise1 = Promise.resolve(1);
const promise2 = Promise.resolve(2);
const promise3 = Promise.resolve(3);

Promise.all([promise1, promise2, promise3])
    .then(values => {
        console.log('Promise.all结果:', values); // [1, 2, 3]
    });

// Promise.race - 返回最先完成的Promise
const fastPromise = new Promise(resolve => setTimeout(() => resolve('快'), 100));
const slowPromise = new Promise(resolve => setTimeout(() => resolve('慢'), 200));

Promise.race([fastPromise, slowPromise])
    .then(value => {
        console.log('Promise.race结果:', value); // '快'
    });

// Promise.allSettled - 等待所有Promise完成（不管成功失败）
const mixedPromises = [
    Promise.resolve('成功1'),
    Promise.reject('失败1'),
    Promise.resolve('成功2')
];

Promise.allSettled(mixedPromises)
    .then(results => {
        console.log('Promise.allSettled结果:');
        results.forEach((result, index) => {
            console.log(`Promise ${index}:`, result);
        });
    });
```

### 解决回调地狱

```javascript
// promise-solution.js - 使用Promise解决回调地狱

const fs = require('fs').promises; // 使用Promise版本的fs

// 使用Promise链解决回调地狱
function processFilesWithPromise() {
    let data1, data2, data3;
    
    return fs.readFile('file1.txt', 'utf8')
        .then(data => {
            data1 = data;
            return fs.readFile('file2.txt', 'utf8');
        })
        .then(data => {
            data2 = data;
            return fs.readFile('file3.txt', 'utf8');
        })
        .then(data => {
            data3 = data;
            const combinedData = data1 + data2 + data3;
            return fs.writeFile('combined.txt', combinedData);
        })
        .then(() => {
            console.log('文件合并完成');
        })
        .catch(err => {
            console.error('操作失败:', err.message);
        });
}

// 更优雅的方式：使用Promise.all并行读取
function processFilesParallel() {
    const filePromises = [
        fs.readFile('file1.txt', 'utf8'),
        fs.readFile('file2.txt', 'utf8'),
        fs.readFile('file3.txt', 'utf8')
    ];
    
    return Promise.all(filePromises)
        .then(dataArray => {
            const combinedData = dataArray.join('');
            return fs.writeFile('combined.txt', combinedData);
        })
        .then(() => {
            console.log('文件合并完成（并行版本）');
        })
        .catch(err => {
            console.error('操作失败:', err.message);
        });
}
```

## 3.4 async/await语法糖

### 基本用法

```javascript
// async-await-basics.js - async/await基础

const fs = require('fs').promises;

// async函数总是返回Promise
async function readFileAsync(filename) {
    try {
        const data = await fs.readFile(filename, 'utf8');
        return data;
    } catch (error) {
        console.error('读取文件失败:', error.message);
        throw error; // 重新抛出错误
    }
}

// 使用async/await
async function main() {
    try {
        const content = await readFileAsync('package.json');
        const jsonData = JSON.parse(content);
        
        console.log('包名:', jsonData.name);
        console.log('版本:', jsonData.version);
    } catch (error) {
        console.error('主函数执行失败:', error.message);
    }
}

main();

// 在普通函数中使用async/await
function processData() {
    return readFileAsync('package.json')
        .then(data => JSON.parse(data))
        .then(jsonData => {
            console.log('处理完成:', jsonData.name);
            return jsonData;
        });
}
```

### 错误处理

```javascript
// async-error-handling.js - async/await错误处理

async function handleErrors() {
    // 方法1：try-catch处理
    try {
        const data = await fs.readFile('nonexistent.txt', 'utf8');
        console.log(data);
    } catch (error) {
        console.error('方法1 - 捕获错误:', error.message);
    }
    
    // 方法2：使用.catch()
    const result = await fs.readFile('nonexistent.txt', 'utf8')
        .catch(error => {
            console.error('方法2 - 捕获错误:', error.message);
            return '默认内容'; // 返回默认值
        });
    
    console.log('结果:', result);
    
    // 方法3：包装函数处理错误
    const [error, data] = await to(fs.readFile('nonexistent.txt', 'utf8'));
    if (error) {
        console.error('方法3 - 捕获错误:', error.message);
    } else {
        console.log('数据:', data);
    }
}

// 工具函数：将Promise转换为[error, data]格式
function to(promise) {
    return promise
        .then(data => [null, data])
        .catch(error => [error, null]);
}
```

### 并行和串行执行

```javascript
// async-parallel-serial.js - 并行和串行执行

// 串行执行（一个接一个）
async function serialExecution() {
    console.time('串行执行');
    
    const data1 = await fs.readFile('file1.txt', 'utf8');
    const data2 = await fs.readFile('file2.txt', 'utf8');
    const data3 = await fs.readFile('file3.txt', 'utf8');
    
    console.timeEnd('串行执行');
    return [data1, data2, data3];
}

// 并行执行（同时开始）
async function parallelExecution() {
    console.time('并行执行');
    
    const [data1, data2, data3] = await Promise.all([
        fs.readFile('file1.txt', 'utf8'),
        fs.readFile('file2.txt', 'utf8'),
        fs.readFile('file3.txt', 'utf8')
    ]);
    
    console.timeEnd('并行执行');
    return [data1, data2, data3];
}

// 混合执行：部分串行，部分并行
async function mixedExecution() {
    // 先并行读取两个文件
    const [data1, data2] = await Promise.all([
        fs.readFile('file1.txt', 'utf8'),
        fs.readFile('file2.txt', 'utf8')
    ]);
    
    // 基于前面的结果，串行处理第三个文件
    const combinedData = data1 + data2;
    const data3 = await fs.readFile('file3.txt', 'utf8');
    
    return combinedData + data3;
}

// 使用for await...of处理异步迭代
async function processFilesSequentially(filenames) {
    const results = [];
    
    for (const filename of filenames) {
        try {
            const data = await fs.readFile(filename, 'utf8');
            results.push(data);
            console.log(`处理完成: ${filename}`);
        } catch (error) {
            console.error(`处理失败 ${filename}:`, error.message);
        }
    }
    
    return results;
}
```

## 3.5 异步编程模式对比

### 性能对比示例

```javascript
// performance-comparison.js - 异步编程模式性能对比

const fs = require('fs');
const fsPromises = require('fs').promises;

// 1. 回调函数版本
function callbackVersion(callback) {
    const startTime = Date.now();
    let completed = 0;
    const results = [];
    
    for (let i = 0; i < 3; i++) {
        fs.readFile(`file${i + 1}.txt`, 'utf8', (err, data) => {
            if (err) {
                callback(err);
                return;
            }
            
            results[i] = data;
            completed++;
            
            if (completed === 3) {
                const endTime = Date.now();
                console.log(`回调版本耗时: ${endTime - startTime}ms`);
                callback(null, results);
            }
        });
    }
}

// 2. Promise版本
function promiseVersion() {
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 3; i++) {
        promises.push(fsPromises.readFile(`file${i + 1}.txt`, 'utf8'));
    }
    
    return Promise.all(promises)
        .then(results => {
            const endTime = Date.now();
            console.log(`Promise版本耗时: ${endTime - startTime}ms`);
            return results;
        });
}

// 3. async/await版本
async function asyncAwaitVersion() {
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 3; i++) {
        promises.push(fsPromises.readFile(`file${i + 1}.txt`, 'utf8'));
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    console.log(`async/await版本耗时: ${endTime - startTime}ms`);
    
    return results;
}

// 运行对比测试
async function runComparison() {
    console.log('开始性能对比测试...\n');
    
    // 回调版本
    callbackVersion((err, results) => {
        if (err) {
            console.error('回调版本失败:', err);
        } else {
            console.log('回调版本完成\n');
        }
    });
    
    // Promise版本
    try {
        await promiseVersion();
        console.log('Promise版本完成\n');
    } catch (error) {
        console.error('Promise版本失败:', error);
    }
    
    // async/await版本
    try {
        await asyncAwaitVersion();
        console.log('async/await版本完成\n');
    } catch (error) {
        console.error('async/await版本失败:', error);
    }
}
```

## 本章小结

本章我们深入学习了：

1. **事件循环机制**：理解Node.js的异步执行原理
2. **回调函数**：传统异步编程方式和回调地狱问题
3. **Promise**：现代异步编程解决方案
4. **async/await**：更优雅的异步编程语法
5. **性能对比**：不同异步编程模式的优缺点

## 练习题

1. 实现一个支持重试机制的异步函数
2. 创建一个Promise版本的setTimeout
3. 使用async/await重写复杂的Promise链
4. 实现一个异步任务队列管理器

## 下一章预告

下一章我们将学习Node.js的文件系统操作和流处理，了解如何高效地处理文件和数据流。

---

[上一章：模块系统深入理解](../chapter-02/) | [返回目录](../) | [下一章：文件系统与流操作](../chapter-04/)
