# 第3章：内存管理与性能优化

## 📖 本章概述

内存管理和性能优化是高级JavaScript开发者必须掌握的核心技能。本章将深入探讨JavaScript的内存管理机制、垃圾回收算法、内存泄漏的检测与预防，以及各种性能优化策略。

## 🎯 学习目标

完成本章学习后，你将能够：

- 深入理解JavaScript的内存管理机制
- 掌握各种垃圾回收算法的原理和特点
- 识别和预防常见的内存泄漏问题
- 使用性能分析工具进行性能诊断
- 实施有效的性能优化策略

## 🧠 JavaScript内存管理机制

### 内存分配模型

JavaScript运行时内存主要分为以下几个区域：

```javascript
// 内存分配示例
function memoryAllocationExample() {
    // 1. 栈内存 - 存储基本类型和引用
    let num = 42;              // 数字存储在栈中
    let str = "hello";         // 短字符串可能存储在栈中
    let bool = true;           // 布尔值存储在栈中
    
    // 2. 堆内存 - 存储对象和复杂数据结构
    let obj = { x: 1, y: 2 };  // 对象存储在堆中，栈中存储引用
    let arr = [1, 2, 3, 4, 5]; // 数组存储在堆中
    let func = function() {};   // 函数存储在堆中
    
    // 3. 字符串池 - 存储字符串常量
    let str1 = "constant";
    let str2 = "constant";     // str1和str2可能指向同一个内存地址
    
    return { obj, arr, func };
}

// 内存使用监控
function getMemoryUsage() {
    if (performance.memory) {
        return {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
        };
    }
    return 'Memory API not supported';
}

console.log('Memory usage:', getMemoryUsage());
```

### 引用计数与可达性

```javascript
// 引用计数示例
function referenceCountingExample() {
    let obj1 = { name: 'Object 1' };  // obj1引用计数: 1
    let obj2 = { name: 'Object 2' };  // obj2引用计数: 1
    
    obj1.ref = obj2;  // obj2引用计数: 2
    obj2.ref = obj1;  // obj1引用计数: 2
    
    // 循环引用问题
    obj1 = null;  // obj1引用计数: 1 (仍被obj2.ref引用)
    obj2 = null;  // obj2引用计数: 1 (仍被obj1.ref引用)
    
    // 此时两个对象互相引用，但都不可达，形成内存泄漏
    // 现代JavaScript引擎使用标记清除算法解决此问题
}

// 可达性分析
function reachabilityExample() {
    let root = {
        child1: { data: 'child1' },
        child2: { data: 'child2' }
    };
    
    root.child1.parent = root;  // 建立父子关系
    root.child2.sibling = root.child1;  // 建立兄弟关系
    
    // 从root开始，所有对象都是可达的
    // 当root = null时，所有对象都变为不可达，可以被回收
    
    return root;
}
```

## 🗑️ 垃圾回收算法详解

### 标记清除算法

```javascript
// 标记清除算法模拟
class MarkAndSweepGC {
    constructor() {
        this.objects = new Set();
        this.roots = new Set();
    }
    
    // 分配对象
    allocate(obj) {
        this.objects.add(obj);
        return obj;
    }
    
    // 添加根对象
    addRoot(obj) {
        this.roots.add(obj);
    }
    
    // 标记阶段
    mark() {
        const marked = new Set();
        const stack = [...this.roots];
        
        while (stack.length > 0) {
            const obj = stack.pop();
            if (!marked.has(obj)) {
                marked.add(obj);
                
                // 标记所有可达的子对象
                if (obj && typeof obj === 'object') {
                    Object.values(obj).forEach(value => {
                        if (this.objects.has(value)) {
                            stack.push(value);
                        }
                    });
                }
            }
        }
        
        return marked;
    }
    
    // 清除阶段
    sweep(marked) {
        const toDelete = [];
        for (const obj of this.objects) {
            if (!marked.has(obj)) {
                toDelete.push(obj);
            }
        }
        
        toDelete.forEach(obj => this.objects.delete(obj));
        return toDelete.length;
    }
    
    // 执行垃圾回收
    collect() {
        const marked = this.mark();
        const collected = this.sweep(marked);
        console.log(`Collected ${collected} objects`);
        return collected;
    }
}

// 使用示例
const gc = new MarkAndSweepGC();
const obj1 = gc.allocate({ name: 'obj1' });
const obj2 = gc.allocate({ name: 'obj2' });
const obj3 = gc.allocate({ name: 'obj3' });

obj1.ref = obj2;  // obj1 -> obj2
gc.addRoot(obj1); // obj1是根对象

gc.collect(); // obj3将被回收，因为不可达
```

### 分代垃圾回收

```javascript
// 分代垃圾回收概念演示
class GenerationalGC {
    constructor() {
        this.youngGeneration = new Set();  // 新生代
        this.oldGeneration = new Set();    // 老生代
        this.allocationCount = new Map();  // 分配计数
    }
    
    allocate(obj) {
        // 新对象分配到新生代
        this.youngGeneration.add(obj);
        this.allocationCount.set(obj, Date.now());
        return obj;
    }
    
    // 新生代垃圾回收（频繁执行）
    minorGC() {
        console.log('执行新生代GC...');
        const survivors = new Set();
        const currentTime = Date.now();
        
        for (const obj of this.youngGeneration) {
            const age = currentTime - this.allocationCount.get(obj);
            
            // 存活时间超过阈值的对象晋升到老生代
            if (age > 1000) {  // 1秒阈值
                this.oldGeneration.add(obj);
                console.log('对象晋升到老生代:', obj);
            } else if (this.isReachable(obj)) {
                survivors.add(obj);
            }
        }
        
        this.youngGeneration = survivors;
    }
    
    // 老生代垃圾回收（较少执行）
    majorGC() {
        console.log('执行老生代GC...');
        const survivors = new Set();
        
        for (const obj of this.oldGeneration) {
            if (this.isReachable(obj)) {
                survivors.add(obj);
            }
        }
        
        this.oldGeneration = survivors;
    }
    
    isReachable(obj) {
        // 简化的可达性检查
        return Math.random() > 0.3;
    }
    
    getStats() {
        return {
            young: this.youngGeneration.size,
            old: this.oldGeneration.size,
            total: this.youngGeneration.size + this.oldGeneration.size
        };
    }
}

// 使用示例
const genGC = new GenerationalGC();

// 模拟对象分配
for (let i = 0; i < 10; i++) {
    genGC.allocate({ id: i, data: new Array(1000).fill(i) });
}

console.log('初始状态:', genGC.getStats());

setTimeout(() => {
    genGC.minorGC();
    console.log('新生代GC后:', genGC.getStats());
}, 1500);
```

## 🔍 内存泄漏检测与预防

### 常见内存泄漏模式

```javascript
// 1. 全局变量泄漏
function globalVariableLeak() {
    // 错误：意外创建全局变量
    accidentalGlobal = 'This creates a global variable';
    
    // 正确：使用严格模式和明确声明
    'use strict';
    let localVariable = 'This is properly scoped';
}

// 2. 闭包引起的内存泄漏
function closureLeak() {
    const largeData = new Array(1000000).fill('data');
    
    return function() {
        // 即使不使用largeData，闭包仍然持有引用
        console.log('Function called');
    };
}

// 优化版本
function optimizedClosure() {
    const largeData = new Array(1000000).fill('data');
    const result = largeData.reduce((sum, item) => sum + item.length, 0);
    
    // 清除大数据引用
    largeData.length = 0;
    
    return function() {
        console.log('Result:', result);
    };
}

// 3. 事件监听器泄漏
class EventListenerLeak {
    constructor() {
        this.data = new Array(100000).fill('data');
        
        // 错误：没有移除事件监听器
        document.addEventListener('click', this.handleClick.bind(this));
    }
    
    handleClick() {
        console.log('Clicked');
    }
    
    // 正确：提供清理方法
    destroy() {
        document.removeEventListener('click', this.handleClick);
        this.data = null;
    }
}

// 4. 定时器泄漏
class TimerLeak {
    constructor() {
        this.data = new Array(100000).fill('data');
        
        // 错误：定时器持有对象引用
        this.timer = setInterval(() => {
            console.log('Timer tick');
        }, 1000);
    }
    
    // 正确：清理定时器
    destroy() {
        clearInterval(this.timer);
        this.data = null;
    }
}

// 5. DOM引用泄漏
class DOMReferenceLeak {
    constructor() {
        this.elements = [];
        
        // 错误：保存DOM元素引用
        const divs = document.querySelectorAll('div');
        this.elements = Array.from(divs);
    }
    
    // 正确：及时清理DOM引用
    destroy() {
        this.elements = null;
    }
}
```

### 内存泄漏检测工具

```javascript
// 内存使用监控器
class MemoryMonitor {
    constructor() {
        this.measurements = [];
        this.isMonitoring = false;
    }
    
    start(interval = 1000) {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.intervalId = setInterval(() => {
            this.measure();
        }, interval);
        
        console.log('Memory monitoring started');
    }
    
    stop() {
        if (!this.isMonitoring) return;
        
        clearInterval(this.intervalId);
        this.isMonitoring = false;
        console.log('Memory monitoring stopped');
    }
    
    measure() {
        if (!performance.memory) {
            console.warn('Performance.memory API not available');
            return;
        }
        
        const measurement = {
            timestamp: Date.now(),
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
        };
        
        this.measurements.push(measurement);
        
        // 保持最近100个测量值
        if (this.measurements.length > 100) {
            this.measurements.shift();
        }
        
        this.checkForLeaks(measurement);
    }
    
    checkForLeaks(current) {
        if (this.measurements.length < 10) return;
        
        const recent = this.measurements.slice(-10);
        const trend = this.calculateTrend(recent);
        
        if (trend > 1024 * 1024) { // 1MB增长趋势
            console.warn('Potential memory leak detected!', {
                trend: `${Math.round(trend / 1024 / 1024)}MB/measurement`,
                current: `${Math.round(current.used / 1024 / 1024)}MB`
            });
        }
    }
    
    calculateTrend(measurements) {
        if (measurements.length < 2) return 0;
        
        const first = measurements[0].used;
        const last = measurements[measurements.length - 1].used;
        
        return (last - first) / measurements.length;
    }
    
    getReport() {
        if (this.measurements.length === 0) {
            return 'No measurements available';
        }
        
        const latest = this.measurements[this.measurements.length - 1];
        const peak = Math.max(...this.measurements.map(m => m.used));
        const average = this.measurements.reduce((sum, m) => sum + m.used, 0) / this.measurements.length;
        
        return {
            current: `${Math.round(latest.used / 1024 / 1024)}MB`,
            peak: `${Math.round(peak / 1024 / 1024)}MB`,
            average: `${Math.round(average / 1024 / 1024)}MB`,
            measurements: this.measurements.length
        };
    }
}

// 使用示例
const monitor = new MemoryMonitor();
monitor.start(2000); // 每2秒测量一次

// 模拟内存泄漏
const leakyArray = [];
setInterval(() => {
    leakyArray.push(new Array(10000).fill('leak'));
}, 1000);

// 10秒后查看报告
setTimeout(() => {
    console.log('Memory Report:', monitor.getReport());
    monitor.stop();
}, 10000);
```

## ⚡ 性能优化策略

### 对象池模式

```javascript
// 对象池实现
class ObjectPool {
    constructor(createFn, resetFn, maxSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        this.pool = [];
        this.created = 0;
        this.reused = 0;
    }
    
    acquire() {
        let obj;
        
        if (this.pool.length > 0) {
            obj = this.pool.pop();
            this.reused++;
        } else {
            obj = this.createFn();
            this.created++;
        }
        
        return obj;
    }
    
    release(obj) {
        if (this.pool.length < this.maxSize) {
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
    
    getStats() {
        return {
            poolSize: this.pool.length,
            created: this.created,
            reused: this.reused,
            reuseRate: this.reused / (this.created + this.reused)
        };
    }
}

// 使用示例：粒子系统
class Particle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 1.0;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 1.0;
    }
}

const particlePool = new ObjectPool(
    () => new Particle(),
    (particle) => particle.reset(),
    1000
);

// 粒子系统
class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    emit(x, y) {
        const particle = particlePool.acquire();
        particle.x = x;
        particle.y = y;
        particle.vx = (Math.random() - 0.5) * 100;
        particle.vy = (Math.random() - 0.5) * 100;
        this.particles.push(particle);
    }
    
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(dt);
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                particlePool.release(particle);
            }
        }
    }
}
```

### 防抖和节流优化

```javascript
// 高级防抖实现
function advancedDebounce(func, delay, options = {}) {
    let timeoutId;
    let lastCallTime;
    let lastInvokeTime = 0;
    let leadingInvoked = false;
    
    const {
        leading = false,
        trailing = true,
        maxWait = null
    } = options;
    
    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;
        
        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        return func.apply(thisArg, args);
    }
    
    function leadingEdge(time) {
        lastInvokeTime = time;
        timeoutId = setTimeout(timerExpired, delay);
        return leading ? invokeFunc(time) : undefined;
    }
    
    function remainingWait(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = delay - timeSinceLastCall;
        
        return maxWait !== null
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
    }
    
    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        
        return (lastCallTime === undefined || 
                timeSinceLastCall >= delay ||
                timeSinceLastCall < 0 ||
                (maxWait !== null && timeSinceLastInvoke >= maxWait));
    }
    
    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        timeoutId = setTimeout(timerExpired, remainingWait(time));
    }
    
    function trailingEdge(time) {
        timeoutId = undefined;
        
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return undefined;
    }
    
    let lastArgs, lastThis;
    
    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;
        
        if (isInvoking) {
            if (timeoutId === undefined) {
                return leadingEdge(lastCallTime);
            }
            if (maxWait !== null) {
                timeoutId = setTimeout(timerExpired, delay);
                return invokeFunc(lastCallTime);
            }
        }
        if (timeoutId === undefined) {
            timeoutId = setTimeout(timerExpired, delay);
        }
        return undefined;
    }
    
    debounced.cancel = function() {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timeoutId = undefined;
    };
    
    debounced.flush = function() {
        return timeoutId === undefined ? undefined : trailingEdge(Date.now());
    };
    
    return debounced;
}

// 使用示例
const expensiveOperation = (query) => {
    console.log('Searching for:', query);
    // 模拟API调用
};

const debouncedSearch = advancedDebounce(expensiveOperation, 300, {
    leading: false,
    trailing: true,
    maxWait: 1000
});

// 搜索输入处理
document.getElementById('search')?.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
});
```

## 📝 本章小结

本章深入探讨了JavaScript内存管理和性能优化的核心概念：

1. **内存管理机制**：理解栈、堆、字符串池的作用
2. **垃圾回收算法**：掌握标记清除、分代回收等算法
3. **内存泄漏防护**：识别和预防常见的内存泄漏模式
4. **性能优化策略**：对象池、防抖节流等优化技术

这些知识将帮助你：
- 编写内存友好的代码
- 及时发现和解决内存问题
- 提升应用的整体性能
- 创建更稳定的长期运行应用

## 🚀 下一章预告

下一章我们将学习**函数式编程进阶**，探讨高阶函数、柯里化、函数组合等函数式编程的高级概念。

---

**继续学习：[第4章：函数式编程进阶](../chapter-04/)**
