# 第4章：函数式编程进阶

## 📖 本章概述

函数式编程是一种强大的编程范式，强调使用纯函数、不可变数据和函数组合来构建程序。本章将深入探讨JavaScript中函数式编程的高级概念和实践技巧。

## 🎯 学习目标

完成本章学习后，你将能够：

- 深入理解高阶函数和闭包的高级用法
- 掌握柯里化和偏函数应用技术
- 运用函数组合构建复杂的数据处理管道
- 理解和应用不可变数据结构
- 初步了解Monad等函数式编程概念

## 🔧 高阶函数与闭包进阶

### 高阶函数模式

```javascript
// 函数工厂模式
function createValidator(rules) {
    return function(data) {
        const errors = [];
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            
            if (rule.required && (value === undefined || value === null)) {
                errors.push(`${field} is required`);
                continue;
            }
            
            if (value !== undefined && rule.type && typeof value !== rule.type) {
                errors.push(`${field} must be of type ${rule.type}`);
            }
            
            if (rule.min && value.length < rule.min) {
                errors.push(`${field} must be at least ${rule.min} characters`);
            }
            
            if (rule.max && value.length > rule.max) {
                errors.push(`${field} must be at most ${rule.max} characters`);
            }
            
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    };
}

// 使用示例
const userValidator = createValidator({
    username: {
        required: true,
        type: 'string',
        min: 3,
        max: 20,
        pattern: /^[a-zA-Z0-9_]+$/
    },
    email: {
        required: true,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    age: {
        required: false,
        type: 'number'
    }
});

const result = userValidator({
    username: 'john_doe',
    email: 'john@example.com',
    age: 25
});

console.log(result); // { isValid: true, errors: [] }
```

### 装饰器模式实现

```javascript
// 函数装饰器
function memoize(fn) {
    const cache = new Map();
    
    return function(...args) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            console.log('Cache hit for:', key);
            return cache.get(key);
        }
        
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

function timing(fn) {
    return function(...args) {
        const start = performance.now();
        const result = fn.apply(this, args);
        const end = performance.now();
        
        console.log(`${fn.name} executed in ${end - start}ms`);
        return result;
    };
}

function retry(maxAttempts = 3, delay = 1000) {
    return function(fn) {
        return async function(...args) {
            let lastError;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await fn.apply(this, args);
                } catch (error) {
                    lastError = error;
                    console.log(`Attempt ${attempt} failed:`, error.message);
                    
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            throw lastError;
        };
    };
}

// 组合装饰器
function compose(...decorators) {
    return function(fn) {
        return decorators.reduceRight((decorated, decorator) => {
            return decorator(decorated);
        }, fn);
    };
}

// 使用示例
const expensiveCalculation = compose(
    timing,
    memoize,
    retry(3, 500)
)(function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
});

console.log(expensiveCalculation(40));
```

## 🍛 柯里化与偏函数应用

### 柯里化实现

```javascript
// 通用柯里化函数
function curry(fn) {
    return function curried(...args) {
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        }
        
        return function(...nextArgs) {
            return curried.apply(this, args.concat(nextArgs));
        };
    };
}

// 自动柯里化装饰器
function autoCurry(fn) {
    function curried(...args) {
        if (args.length >= fn.length) {
            return fn(...args);
        }
        return (...nextArgs) => curried(...args, ...nextArgs);
    }
    
    return curried;
}

// 实用的柯里化函数
const add = curry((a, b, c) => a + b + c);
const multiply = curry((a, b) => a * b);
const filter = curry((predicate, array) => array.filter(predicate));
const map = curry((transform, array) => array.map(transform));
const reduce = curry((reducer, initial, array) => array.reduce(reducer, initial));

// 使用示例
const add5 = add(5);
const add5And3 = add5(3);
console.log(add5And3(2)); // 10

const double = multiply(2);
const numbers = [1, 2, 3, 4, 5];
console.log(numbers.map(double)); // [2, 4, 6, 8, 10]

// 函数式数据处理管道
const isEven = x => x % 2 === 0;
const square = x => x * x;
const sum = (acc, x) => acc + x;

const processNumbers = (numbers) => {
    return reduce(sum, 0)(
        map(square)(
            filter(isEven)(numbers)
        )
    );
};

console.log(processNumbers([1, 2, 3, 4, 5, 6])); // 56 (2² + 4² + 6²)
```

### 偏函数应用

```javascript
// 偏函数应用实现
function partial(fn, ...presetArgs) {
    return function(...laterArgs) {
        return fn(...presetArgs, ...laterArgs);
    };
}

// 占位符支持的偏函数
const _ = Symbol('placeholder');

function partialWithPlaceholders(fn, ...args) {
    return function(...laterArgs) {
        const finalArgs = [];
        let laterIndex = 0;
        
        for (let i = 0; i < args.length; i++) {
            if (args[i] === _) {
                finalArgs[i] = laterArgs[laterIndex++];
            } else {
                finalArgs[i] = args[i];
            }
        }
        
        // 添加剩余参数
        while (laterIndex < laterArgs.length) {
            finalArgs.push(laterArgs[laterIndex++]);
        }
        
        return fn(...finalArgs);
    };
}

// 使用示例
function greet(greeting, name, punctuation) {
    return `${greeting}, ${name}${punctuation}`;
}

const sayHello = partial(greet, 'Hello');
const sayHelloToJohn = partial(sayHello, 'John');
console.log(sayHelloToJohn('!')); // "Hello, John!"

// 使用占位符
const greetJohn = partialWithPlaceholders(greet, _, 'John', '!');
console.log(greetJohn('Hi')); // "Hi, John!"
console.log(greetJohn('Hey')); // "Hey, John!"
```

## 🔗 函数组合与管道

### 函数组合实现

```javascript
// 基础组合函数
function compose(...fns) {
    return function(value) {
        return fns.reduceRight((acc, fn) => fn(acc), value);
    };
}

// 管道函数（从左到右）
function pipe(...fns) {
    return function(value) {
        return fns.reduce((acc, fn) => fn(acc), value);
    };
}

// 异步组合
function composeAsync(...fns) {
    return function(value) {
        return fns.reduceRight(async (acc, fn) => {
            const resolved = await acc;
            return fn(resolved);
        }, Promise.resolve(value));
    };
}

// 异步管道
function pipeAsync(...fns) {
    return function(value) {
        return fns.reduce(async (acc, fn) => {
            const resolved = await acc;
            return fn(resolved);
        }, Promise.resolve(value));
    };
}

// 使用示例
const addOne = x => x + 1;
const double = x => x * 2;
const square = x => x * x;

// 组合：从右到左执行
const composedFn = compose(square, double, addOne);
console.log(composedFn(3)); // square(double(addOne(3))) = square(8) = 64

// 管道：从左到右执行
const pipedFn = pipe(addOne, double, square);
console.log(pipedFn(3)); // square(double(addOne(3))) = square(8) = 64

// 异步处理示例
const fetchUser = async (id) => ({ id, name: `User${id}` });
const addTimestamp = async (user) => ({ ...user, timestamp: Date.now() });
const saveToCache = async (user) => {
    console.log('Saving to cache:', user);
    return user;
};

const processUser = pipeAsync(fetchUser, addTimestamp, saveToCache);
processUser(123).then(console.log);
```

### 高级组合模式

```javascript
// 条件组合
function when(predicate, fn) {
    return function(value) {
        return predicate(value) ? fn(value) : value;
    };
}

function unless(predicate, fn) {
    return when(value => !predicate(value), fn);
}

// 分支组合
function branch(predicate, onTrue, onFalse = x => x) {
    return function(value) {
        return predicate(value) ? onTrue(value) : onFalse(value);
    };
}

// 并行组合
function parallel(...fns) {
    return function(value) {
        return fns.map(fn => fn(value));
    };
}

// 使用示例
const isPositive = x => x > 0;
const isEven = x => x % 2 === 0;
const negate = x => -x;
const half = x => x / 2;

const processNumber = pipe(
    when(isPositive, double),
    unless(isEven, addOne),
    branch(x => x > 10, half, square)
);

console.log(processNumber(3)); // 3 -> 6 -> 7 -> 49
console.log(processNumber(-2)); // -2 -> -2 -> -1 -> 1

// 并行处理
const analyzeNumber = parallel(
    x => ({ isPositive: x > 0 }),
    x => ({ isEven: x % 2 === 0 }),
    x => ({ absolute: Math.abs(x) })
);

console.log(analyzeNumber(-4));
// [{ isPositive: false }, { isEven: true }, { absolute: 4 }]
```

## 🔒 不可变数据结构

### 不可变操作实现

```javascript
// 不可变数组操作
const ImmutableArray = {
    push: (arr, ...items) => [...arr, ...items],
    pop: (arr) => arr.slice(0, -1),
    shift: (arr) => arr.slice(1),
    unshift: (arr, ...items) => [...items, ...arr],
    splice: (arr, start, deleteCount = 0, ...items) => [
        ...arr.slice(0, start),
        ...items,
        ...arr.slice(start + deleteCount)
    ],
    update: (arr, index, value) => [
        ...arr.slice(0, index),
        value,
        ...arr.slice(index + 1)
    ],
    remove: (arr, index) => [
        ...arr.slice(0, index),
        ...arr.slice(index + 1)
    ]
};

// 不可变对象操作
const ImmutableObject = {
    set: (obj, key, value) => ({ ...obj, [key]: value }),
    delete: (obj, key) => {
        const { [key]: deleted, ...rest } = obj;
        return rest;
    },
    merge: (obj, updates) => ({ ...obj, ...updates }),
    update: (obj, key, updater) => ({
        ...obj,
        [key]: updater(obj[key])
    }),
    setIn: (obj, path, value) => {
        if (path.length === 0) return value;
        if (path.length === 1) return { ...obj, [path[0]]: value };
        
        const [head, ...tail] = path;
        return {
            ...obj,
            [head]: ImmutableObject.setIn(obj[head] || {}, tail, value)
        };
    },
    getIn: (obj, path) => {
        return path.reduce((current, key) => current?.[key], obj);
    }
};

// 使用示例
const originalArray = [1, 2, 3, 4, 5];
const newArray = ImmutableArray.update(originalArray, 2, 99);
console.log(originalArray); // [1, 2, 3, 4, 5] - 未改变
console.log(newArray);      // [1, 2, 99, 4, 5] - 新数组

const originalObject = {
    user: {
        name: 'John',
        profile: {
            age: 30,
            city: 'New York'
        }
    }
};

const updatedObject = ImmutableObject.setIn(
    originalObject,
    ['user', 'profile', 'age'],
    31
);

console.log(originalObject.user.profile.age); // 30 - 未改变
console.log(updatedObject.user.profile.age);  // 31 - 新值
```

### 结构共享优化

```javascript
// 简单的结构共享实现
class ImmutableList {
    constructor(items = []) {
        this.items = items;
        this.length = items.length;
    }
    
    push(item) {
        return new ImmutableList([...this.items, item]);
    }
    
    pop() {
        if (this.length === 0) return this;
        return new ImmutableList(this.items.slice(0, -1));
    }
    
    get(index) {
        return this.items[index];
    }
    
    set(index, value) {
        if (index < 0 || index >= this.length) {
            throw new Error('Index out of bounds');
        }
        
        const newItems = [...this.items];
        newItems[index] = value;
        return new ImmutableList(newItems);
    }
    
    map(fn) {
        return new ImmutableList(this.items.map(fn));
    }
    
    filter(predicate) {
        return new ImmutableList(this.items.filter(predicate));
    }
    
    reduce(reducer, initial) {
        return this.items.reduce(reducer, initial);
    }
    
    toArray() {
        return [...this.items];
    }
    
    [Symbol.iterator]() {
        return this.items[Symbol.iterator]();
    }
}

// 使用示例
const list1 = new ImmutableList([1, 2, 3]);
const list2 = list1.push(4);
const list3 = list2.map(x => x * 2);

console.log(list1.toArray()); // [1, 2, 3]
console.log(list2.toArray()); // [1, 2, 3, 4]
console.log(list3.toArray()); // [2, 4, 6, 8]

// 链式操作
const result = new ImmutableList([1, 2, 3, 4, 5])
    .filter(x => x % 2 === 0)
    .map(x => x * x)
    .reduce((sum, x) => sum + x, 0);

console.log(result); // 20 (2² + 4²)
```

## 🧩 Monad概念入门

### Maybe Monad实现

```javascript
// Maybe Monad - 处理可能为空的值
class Maybe {
    constructor(value) {
        this.value = value;
    }
    
    static of(value) {
        return new Maybe(value);
    }
    
    static nothing() {
        return new Maybe(null);
    }
    
    isNothing() {
        return this.value === null || this.value === undefined;
    }
    
    map(fn) {
        return this.isNothing() ? Maybe.nothing() : Maybe.of(fn(this.value));
    }
    
    flatMap(fn) {
        return this.isNothing() ? Maybe.nothing() : fn(this.value);
    }
    
    filter(predicate) {
        return this.isNothing() || !predicate(this.value) 
            ? Maybe.nothing() 
            : this;
    }
    
    getOrElse(defaultValue) {
        return this.isNothing() ? defaultValue : this.value;
    }
    
    toString() {
        return this.isNothing() ? 'Maybe.Nothing' : `Maybe.Just(${this.value})`;
    }
}

// 使用示例
const user = {
    name: 'John',
    address: {
        street: '123 Main St',
        city: 'New York'
    }
};

// 安全的属性访问
function safeGet(obj, path) {
    return path.reduce((maybe, key) => {
        return maybe.flatMap(value => 
            value && typeof value === 'object' && key in value
                ? Maybe.of(value[key])
                : Maybe.nothing()
        );
    }, Maybe.of(obj));
}

const cityMaybe = safeGet(user, ['address', 'city']);
console.log(cityMaybe.getOrElse('Unknown')); // "New York"

const zipMaybe = safeGet(user, ['address', 'zip']);
console.log(zipMaybe.getOrElse('Unknown')); // "Unknown"

// 链式操作
const result = Maybe.of('  hello world  ')
    .map(s => s.trim())
    .map(s => s.toUpperCase())
    .filter(s => s.length > 5)
    .map(s => `Result: ${s}`)
    .getOrElse('No result');

console.log(result); // "Result: HELLO WORLD"
```

### Either Monad实现

```javascript
// Either Monad - 处理可能失败的操作
class Either {
    constructor(value, isRight = true) {
        this.value = value;
        this.isRight = isRight;
    }
    
    static right(value) {
        return new Either(value, true);
    }
    
    static left(value) {
        return new Either(value, false);
    }
    
    map(fn) {
        return this.isRight ? Either.right(fn(this.value)) : this;
    }
    
    flatMap(fn) {
        return this.isRight ? fn(this.value) : this;
    }
    
    mapLeft(fn) {
        return this.isRight ? this : Either.left(fn(this.value));
    }
    
    fold(leftFn, rightFn) {
        return this.isRight ? rightFn(this.value) : leftFn(this.value);
    }
    
    getOrElse(defaultValue) {
        return this.isRight ? this.value : defaultValue;
    }
    
    toString() {
        return this.isRight 
            ? `Either.Right(${this.value})` 
            : `Either.Left(${this.value})`;
    }
}

// 使用示例
function divide(a, b) {
    return b === 0 
        ? Either.left('Division by zero') 
        : Either.right(a / b);
}

function sqrt(x) {
    return x < 0 
        ? Either.left('Square root of negative number') 
        : Either.right(Math.sqrt(x));
}

// 链式计算
const calculation = divide(16, 4)
    .flatMap(result => sqrt(result))
    .map(result => result * 2);

console.log(calculation.toString()); // "Either.Right(4)"

const failedCalculation = divide(16, 0)
    .flatMap(result => sqrt(result))
    .map(result => result * 2);

console.log(failedCalculation.toString()); // "Either.Left(Division by zero)"

// 错误处理
const result = calculation.fold(
    error => `Error: ${error}`,
    value => `Success: ${value}`
);

console.log(result); // "Success: 4"
```

## 📝 本章小结

本章深入探讨了JavaScript函数式编程的高级概念：

1. **高阶函数**：函数工厂、装饰器等高级模式
2. **柯里化**：函数参数的部分应用和组合
3. **函数组合**：构建复杂的数据处理管道
4. **不可变性**：安全的数据操作和结构共享
5. **Monad**：优雅的错误处理和空值处理

这些技术将帮助你：
- 编写更加模块化和可复用的代码
- 减少副作用和状态管理复杂性
- 构建更加健壮的错误处理机制
- 提高代码的可测试性和可维护性

## 🚀 下一章预告

下一章我们将学习**元编程与反射**，探讨Proxy、Reflect、Symbol等JavaScript元编程技术。

---

**继续学习：[第5章：元编程与反射](../chapter-05/README.md)**
