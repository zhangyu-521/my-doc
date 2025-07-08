# 第5章：元编程与反射

## 📖 本章概述

元编程是编写能够操作程序本身的程序的技术。JavaScript提供了强大的元编程能力，包括Proxy、Reflect、Symbol等API。本章将深入探讨这些技术，帮助你构建更加灵活和强大的应用。

## 🎯 学习目标

完成本章学习后，你将能够：

- 深入理解Proxy的工作原理和应用场景
- 掌握Reflect API的使用方法
- 熟练运用Symbol创建私有属性和元数据
- 实现装饰器模式和AOP编程
- 构建动态的代码生成和执行系统

## 🔍 Proxy深度应用

### Proxy基础与陷阱函数

```javascript
// 基础Proxy示例
const target = {
    name: 'John',
    age: 30
};

const handler = {
    get(target, property, receiver) {
        console.log(`Getting property: ${property}`);
        
        if (property in target) {
            return Reflect.get(target, property, receiver);
        } else {
            return `Property ${property} does not exist`;
        }
    },
    
    set(target, property, value, receiver) {
        console.log(`Setting property: ${property} = ${value}`);
        
        // 类型验证
        if (property === 'age' && typeof value !== 'number') {
            throw new TypeError('Age must be a number');
        }
        
        if (property === 'name' && typeof value !== 'string') {
            throw new TypeError('Name must be a string');
        }
        
        return Reflect.set(target, property, value, receiver);
    },
    
    has(target, property) {
        console.log(`Checking if property exists: ${property}`);
        return Reflect.has(target, property);
    },
    
    deleteProperty(target, property) {
        console.log(`Deleting property: ${property}`);
        if (property === 'name') {
            throw new Error('Cannot delete name property');
        }
        return Reflect.deleteProperty(target, property);
    },
    
    ownKeys(target) {
        console.log('Getting own keys');
        return Reflect.ownKeys(target);
    },
    
    getOwnPropertyDescriptor(target, property) {
        console.log(`Getting descriptor for: ${property}`);
        return Reflect.getOwnPropertyDescriptor(target, property);
    }
};

const proxy = new Proxy(target, handler);

// 使用示例
console.log(proxy.name);        // Getting property: name -> "John"
console.log(proxy.nonexistent); // Getting property: nonexistent -> "Property nonexistent does not exist"
proxy.age = 31;                 // Setting property: age = 31
console.log('age' in proxy);    // Checking if property exists: age -> true
```

### 高级Proxy应用

```javascript
// 1. 数据验证代理
class ValidatedObject {
    constructor(schema) {
        this.schema = schema;
        this.data = {};
        
        return new Proxy(this, {
            get(target, property) {
                if (property in target) {
                    return target[property];
                }
                return target.data[property];
            },
            
            set(target, property, value) {
                if (property in target) {
                    target[property] = value;
                    return true;
                }
                
                const validator = target.schema[property];
                if (validator && !validator(value)) {
                    throw new Error(`Invalid value for ${property}: ${value}`);
                }
                
                target.data[property] = value;
                return true;
            },
            
            has(target, property) {
                return property in target || property in target.data;
            },
            
            ownKeys(target) {
                return Object.keys(target.data);
            }
        });
    }
}

// 使用示例
const userSchema = {
    name: value => typeof value === 'string' && value.length > 0,
    age: value => typeof value === 'number' && value >= 0 && value <= 150,
    email: value => typeof value === 'string' && /\S+@\S+\.\S+/.test(value)
};

const user = new ValidatedObject(userSchema);
user.name = 'John Doe';
user.age = 30;
user.email = 'john@example.com';

console.log(user.name); // "John Doe"
// user.age = -5; // 抛出错误: Invalid value for age: -5

// 2. 数组负索引支持
function createArrayWithNegativeIndex(arr) {
    return new Proxy(arr, {
        get(target, property) {
            if (typeof property === 'string' && /^-\d+$/.test(property)) {
                const index = parseInt(property);
                return target[target.length + index];
            }
            return Reflect.get(target, property);
        },
        
        set(target, property, value) {
            if (typeof property === 'string' && /^-\d+$/.test(property)) {
                const index = parseInt(property);
                target[target.length + index] = value;
                return true;
            }
            return Reflect.set(target, property, value);
        }
    });
}

const arr = createArrayWithNegativeIndex([1, 2, 3, 4, 5]);
console.log(arr[-1]); // 5
console.log(arr[-2]); // 4
arr[-1] = 99;
console.log(arr);     // [1, 2, 3, 4, 99]

// 3. 函数调用拦截
function createCallableObject(obj) {
    return new Proxy(obj, {
        apply(target, thisArg, argumentsList) {
            console.log('Function called with arguments:', argumentsList);
            return target.call(thisArg, ...argumentsList);
        },
        
        construct(target, argumentsList) {
            console.log('Constructor called with arguments:', argumentsList);
            return new target(...argumentsList);
        }
    });
}

function Calculator(initial = 0) {
    this.value = initial;
}

Calculator.prototype.add = function(n) {
    this.value += n;
    return this;
};

const ProxiedCalculator = createCallableObject(Calculator);
const calc = new ProxiedCalculator(10); // Constructor called with arguments: [10]
calc.add(5);
console.log(calc.value); // 15
```

### 可撤销代理

```javascript
// 可撤销代理示例
class SecureObject {
    constructor(data, timeout = 5000) {
        this.data = data;
        
        const { proxy, revoke } = Proxy.revocable(this.data, {
            get(target, property) {
                console.log(`Accessing property: ${property}`);
                return Reflect.get(target, property);
            },
            
            set(target, property, value) {
                console.log(`Setting property: ${property} = ${value}`);
                return Reflect.set(target, property, value);
            }
        });
        
        this.proxy = proxy;
        this.revoke = revoke;
        
        // 自动撤销
        setTimeout(() => {
            console.log('Access revoked due to timeout');
            this.revoke();
        }, timeout);
    }
    
    getProxy() {
        return this.proxy;
    }
    
    revokeAccess() {
        this.revoke();
    }
}

// 使用示例
const secureData = new SecureObject({ secret: 'confidential' }, 3000);
const proxy = secureData.getProxy();

console.log(proxy.secret); // "confidential"
proxy.newProp = 'value';

setTimeout(() => {
    try {
        console.log(proxy.secret); // 抛出错误：Cannot perform 'get' on a proxy that has been revoked
    } catch (error) {
        console.log('Access denied:', error.message);
    }
}, 4000);
```

## 🪞 Reflect API详解

### Reflect方法应用

```javascript
// Reflect API完整示例
class ReflectDemo {
    constructor() {
        this.data = {};
    }
    
    // 使用Reflect.apply
    static callMethod(obj, methodName, args) {
        const method = Reflect.get(obj, methodName);
        if (typeof method === 'function') {
            return Reflect.apply(method, obj, args);
        }
        throw new Error(`Method ${methodName} not found`);
    }
    
    // 使用Reflect.construct
    static createInstance(Constructor, args) {
        return Reflect.construct(Constructor, args);
    }
    
    // 使用Reflect.defineProperty
    defineProperty(key, value, options = {}) {
        const descriptor = {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
            ...options
        };
        
        return Reflect.defineProperty(this.data, key, descriptor);
    }
    
    // 使用Reflect.deleteProperty
    deleteProperty(key) {
        return Reflect.deleteProperty(this.data, key);
    }
    
    // 使用Reflect.get和Reflect.set
    get(key) {
        return Reflect.get(this.data, key);
    }
    
    set(key, value) {
        return Reflect.set(this.data, key, value);
    }
    
    // 使用Reflect.has
    has(key) {
        return Reflect.has(this.data, key);
    }
    
    // 使用Reflect.ownKeys
    getKeys() {
        return Reflect.ownKeys(this.data);
    }
    
    // 使用Reflect.getOwnPropertyDescriptor
    getDescriptor(key) {
        return Reflect.getOwnPropertyDescriptor(this.data, key);
    }
    
    // 使用Reflect.getPrototypeOf和Reflect.setPrototypeOf
    getPrototype() {
        return Reflect.getPrototypeOf(this.data);
    }
    
    setPrototype(proto) {
        return Reflect.setPrototypeOf(this.data, proto);
    }
    
    // 使用Reflect.isExtensible和Reflect.preventExtensions
    isExtensible() {
        return Reflect.isExtensible(this.data);
    }
    
    preventExtensions() {
        return Reflect.preventExtensions(this.data);
    }
}

// 使用示例
const demo = new ReflectDemo();

// 定义属性
demo.defineProperty('name', 'John', { writable: false });
demo.defineProperty('age', 30);

console.log(demo.get('name')); // "John"
console.log(demo.has('age'));  // true
console.log(demo.getKeys());   // ["name", "age"]

// 尝试修改只读属性
console.log(demo.set('name', 'Jane')); // false (失败)
console.log(demo.get('name'));          // "John" (未改变)

// 获取属性描述符
console.log(demo.getDescriptor('name'));
// { value: "John", writable: false, enumerable: true, configurable: true }

// 静态方法使用
class TestClass {
    constructor(value) {
        this.value = value;
    }
    
    getValue() {
        return this.value;
    }
}

const instance = ReflectDemo.createInstance(TestClass, [42]);
const result = ReflectDemo.callMethod(instance, 'getValue', []);
console.log(result); // 42
```

## 🔣 Symbol高级用法

### Symbol基础与内置Symbol

```javascript
// Symbol基础用法
const sym1 = Symbol('description');
const sym2 = Symbol('description');
console.log(sym1 === sym2); // false - 每个Symbol都是唯一的

// 全局Symbol注册表
const globalSym1 = Symbol.for('global-key');
const globalSym2 = Symbol.for('global-key');
console.log(globalSym1 === globalSym2); // true

console.log(Symbol.keyFor(globalSym1)); // "global-key"

// 内置Symbol使用
class CustomIterable {
    constructor(data) {
        this.data = data;
    }
    
    // Symbol.iterator - 使对象可迭代
    [Symbol.iterator]() {
        let index = 0;
        const data = this.data;
        
        return {
            next() {
                if (index < data.length) {
                    return { value: data[index++], done: false };
                } else {
                    return { done: true };
                }
            }
        };
    }
    
    // Symbol.toStringTag - 自定义toString行为
    get [Symbol.toStringTag]() {
        return 'CustomIterable';
    }
    
    // Symbol.toPrimitive - 自定义类型转换
    [Symbol.toPrimitive](hint) {
        switch (hint) {
            case 'number':
                return this.data.length;
            case 'string':
                return this.data.join(', ');
            default:
                return this.data.length;
        }
    }
    
    // Symbol.hasInstance - 自定义instanceof行为
    static [Symbol.hasInstance](instance) {
        return Array.isArray(instance.data);
    }
}

const iterable = new CustomIterable([1, 2, 3, 4, 5]);

// 使用迭代器
for (const value of iterable) {
    console.log(value); // 1, 2, 3, 4, 5
}

// 使用toStringTag
console.log(Object.prototype.toString.call(iterable)); // "[object CustomIterable]"

// 使用toPrimitive
console.log(+iterable);        // 5 (数字转换)
console.log(`${iterable}`);    // "1, 2, 3, 4, 5" (字符串转换)

// 使用hasInstance
console.log(iterable instanceof CustomIterable); // true
```

### Symbol实现私有属性

```javascript
// 使用Symbol实现私有属性
const _private = Symbol('private');
const _secret = Symbol('secret');

class SecureClass {
    constructor(publicValue, privateValue) {
        this.public = publicValue;
        this[_private] = privateValue;
        this[_secret] = 'top secret';
    }
    
    getPrivate() {
        return this[_private];
    }
    
    setPrivate(value) {
        this[_private] = value;
    }
    
    // 静态方法访问私有属性
    static getSecret(instance) {
        return instance[_secret];
    }
}

const instance = new SecureClass('public data', 'private data');

console.log(instance.public);        // "public data"
console.log(instance.getPrivate());  // "private data"
console.log(instance[_private]);     // "private data" (如果有Symbol引用)

// 无法通过常规方式访问
console.log(Object.keys(instance));           // ["public"]
console.log(Object.getOwnPropertyNames(instance)); // ["public"]

// 但可以通过Symbol方式访问
console.log(Object.getOwnPropertySymbols(instance)); // [Symbol(private), Symbol(secret)]

// 元数据存储
const metadata = Symbol('metadata');

class MetadataClass {
    constructor() {
        this[metadata] = {
            created: new Date(),
            version: '1.0.0',
            author: 'Developer'
        };
    }
    
    getMetadata() {
        return this[metadata];
    }
    
    updateMetadata(updates) {
        this[metadata] = { ...this[metadata], ...updates };
    }
}

const metaInstance = new MetadataClass();
console.log(metaInstance.getMetadata());
// { created: Date, version: "1.0.0", author: "Developer" }
```

## 🎭 装饰器模式实现

### 类装饰器

```javascript
// 类装饰器实现
function logged(target) {
    const originalMethods = {};
    
    // 获取所有方法
    const prototype = target.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype)
        .filter(name => name !== 'constructor' && typeof prototype[name] === 'function');
    
    methodNames.forEach(methodName => {
        const originalMethod = prototype[methodName];
        originalMethods[methodName] = originalMethod;
        
        prototype[methodName] = function(...args) {
            console.log(`Calling ${target.name}.${methodName} with args:`, args);
            const result = originalMethod.apply(this, args);
            console.log(`${target.name}.${methodName} returned:`, result);
            return result;
        };
    });
    
    return target;
}

function singleton(target) {
    let instance = null;
    
    return class extends target {
        constructor(...args) {
            if (instance) {
                return instance;
            }
            super(...args);
            instance = this;
        }
    };
}

// 使用装饰器
@logged
@singleton
class Calculator {
    constructor() {
        this.value = 0;
    }
    
    add(n) {
        this.value += n;
        return this.value;
    }
    
    multiply(n) {
        this.value *= n;
        return this.value;
    }
}

// 由于装饰器语法还在提案阶段，手动应用装饰器
const DecoratedCalculator = singleton(logged(Calculator));

const calc1 = new DecoratedCalculator();
const calc2 = new DecoratedCalculator();

console.log(calc1 === calc2); // true (单例模式)

calc1.add(5);      // 日志输出
calc1.multiply(3); // 日志输出
```

### 方法装饰器

```javascript
// 方法装饰器实现
function memoize(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map();
    
    descriptor.value = function(...args) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            console.log(`Cache hit for ${propertyKey}(${key})`);
            return cache.get(key);
        }
        
        const result = originalMethod.apply(this, args);
        cache.set(key, result);
        console.log(`Cache miss for ${propertyKey}(${key}), result cached`);
        return result;
    };
    
    return descriptor;
}

function timeout(ms) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            return Promise.race([
                originalMethod.apply(this, args),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`${propertyKey} timed out after ${ms}ms`)), ms);
                })
            ]);
        };
        
        return descriptor;
    };
}

function validate(schema) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = function(...args) {
            // 验证参数
            for (let i = 0; i < schema.length; i++) {
                const validator = schema[i];
                const arg = args[i];
                
                if (validator && !validator(arg)) {
                    throw new Error(`Invalid argument ${i} for ${propertyKey}: ${arg}`);
                }
            }
            
            return originalMethod.apply(this, args);
        };
        
        return descriptor;
    };
}

// 手动应用装饰器的类
class MathUtils {
    @memoize
    fibonacci(n) {
        if (n <= 1) return n;
        return this.fibonacci(n - 1) + this.fibonacci(n - 2);
    }
    
    @timeout(2000)
    async slowOperation() {
        return new Promise(resolve => {
            setTimeout(() => resolve('completed'), 1000);
        });
    }
    
    @validate([
        x => typeof x === 'number',
        y => typeof y === 'number'
    ])
    divide(x, y) {
        if (y === 0) throw new Error('Division by zero');
        return x / y;
    }
}

// 手动应用装饰器
const mathUtils = new MathUtils();

// 应用memoize装饰器
const fibDescriptor = Object.getOwnPropertyDescriptor(MathUtils.prototype, 'fibonacci');
memoize(MathUtils.prototype, 'fibonacci', fibDescriptor);

// 应用validate装饰器
const divideDescriptor = Object.getOwnPropertyDescriptor(MathUtils.prototype, 'divide');
validate([
    x => typeof x === 'number',
    y => typeof y === 'number'
])(MathUtils.prototype, 'divide', divideDescriptor);

// 测试
console.log(mathUtils.fibonacci(10)); // 计算并缓存
console.log(mathUtils.fibonacci(10)); // 从缓存获取

try {
    mathUtils.divide('10', 5); // 抛出验证错误
} catch (error) {
    console.log(error.message);
}

console.log(mathUtils.divide(10, 5)); // 2
```

## 🔧 动态代码生成

### 函数工厂

```javascript
// 动态函数生成
class FunctionFactory {
    static createGetter(propertyName) {
        return new Function('obj', `return obj.${propertyName};`);
    }
    
    static createSetter(propertyName) {
        return new Function('obj', 'value', `obj.${propertyName} = value;`);
    }
    
    static createValidator(rules) {
        const conditions = Object.entries(rules).map(([field, rule]) => {
            const checks = [];
            
            if (rule.required) {
                checks.push(`(obj.${field} !== undefined && obj.${field} !== null)`);
            }
            
            if (rule.type) {
                checks.push(`typeof obj.${field} === '${rule.type}'`);
            }
            
            if (rule.min !== undefined) {
                checks.push(`obj.${field} >= ${rule.min}`);
            }
            
            if (rule.max !== undefined) {
                checks.push(`obj.${field} <= ${rule.max}`);
            }
            
            return checks.length > 0 ? `(${checks.join(' && ')})` : 'true';
        }).join(' && ');
        
        return new Function('obj', `return ${conditions};`);
    }
    
    static createMapper(mapping) {
        const assignments = Object.entries(mapping)
            .map(([target, source]) => `result.${target} = obj.${source};`)
            .join('\n    ');
        
        const code = `
            const result = {};
            ${assignments}
            return result;
        `;
        
        return new Function('obj', code);
    }
}

// 使用示例
const getName = FunctionFactory.createGetter('name');
const setAge = FunctionFactory.createSetter('age');

const person = { name: 'John', age: 30 };
console.log(getName(person)); // "John"
setAge(person, 31);
console.log(person.age);      // 31

// 动态验证器
const userValidator = FunctionFactory.createValidator({
    name: { required: true, type: 'string' },
    age: { required: true, type: 'number', min: 0, max: 150 },
    email: { required: false, type: 'string' }
});

console.log(userValidator({ name: 'John', age: 30 })); // true
console.log(userValidator({ name: 'John', age: -5 })); // false

// 动态映射器
const userMapper = FunctionFactory.createMapper({
    fullName: 'name',
    years: 'age',
    contact: 'email'
});

const mapped = userMapper({ name: 'John Doe', age: 30, email: 'john@example.com' });
console.log(mapped); // { fullName: "John Doe", years: 30, contact: "john@example.com" }
```

### 模板引擎

```javascript
// 简单的模板引擎
class TemplateEngine {
    constructor() {
        this.cache = new Map();
    }
    
    compile(template) {
        if (this.cache.has(template)) {
            return this.cache.get(template);
        }
        
        // 解析模板中的表达式
        const code = template
            .replace(/\{\{(.+?)\}\}/g, '${$1}')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
        
        const func = new Function('data', `
            with (data) {
                return \`${code}\`;
            }
        `);
        
        this.cache.set(template, func);
        return func;
    }
    
    render(template, data) {
        const compiled = this.compile(template);
        return compiled(data);
    }
    
    // 支持条件和循环的高级模板
    compileAdvanced(template) {
        if (this.cache.has(template)) {
            return this.cache.get(template);
        }
        
        let code = template;
        
        // 处理条件语句 {{#if condition}}...{{/if}}
        code = code.replace(/\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g, 
            '${($1) ? `$2` : ""}');
        
        // 处理循环语句 {{#each array}}...{{/each}}
        code = code.replace(/\{\{#each\s+(.+?)\}\}([\s\S]*?)\{\{\/each\}\}/g, 
            '${($1).map(item => `$2`).join("")}');
        
        // 处理普通变量
        code = code.replace(/\{\{(.+?)\}\}/g, '${$1}');
        
        const func = new Function('data', `
            with (data) {
                return \`${code}\`;
            }
        `);
        
        this.cache.set(template, func);
        return func;
    }
    
    renderAdvanced(template, data) {
        const compiled = this.compileAdvanced(template);
        return compiled(data);
    }
}

// 使用示例
const engine = new TemplateEngine();

// 基础模板
const basicTemplate = 'Hello, {{name}}! You are {{age}} years old.';
const basicResult = engine.render(basicTemplate, { name: 'John', age: 30 });
console.log(basicResult); // "Hello, John! You are 30 years old."

// 高级模板
const advancedTemplate = `
<div>
    <h1>{{title}}</h1>
    {{#if showUsers}}
        <ul>
            {{#each users}}
                <li>{{item.name}} - {{item.email}}</li>
            {{/each}}
        </ul>
    {{/if}}
</div>
`;

const advancedData = {
    title: 'User List',
    showUsers: true,
    users: [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
    ]
};

const advancedResult = engine.renderAdvanced(advancedTemplate, advancedData);
console.log(advancedResult);
```

## 📝 本章小结

本章深入探讨了JavaScript元编程的核心技术：

1. **Proxy**：强大的对象拦截和自定义操作
2. **Reflect**：标准化的对象操作API
3. **Symbol**：唯一标识符和元数据存储
4. **装饰器**：优雅的横切关注点处理
5. **动态代码生成**：运行时创建和执行代码

这些技术将帮助你：
- 构建更加灵活和可扩展的框架
- 实现AOP和横切关注点
- 创建DSL和模板引擎
- 提供更好的开发者体验

## 🚀 下一章预告

下一章我们将学习**模块系统深度解析**，探讨ES6模块、CommonJS、动态导入等模块化技术。

---

**继续学习：[第6章：模块系统深度解析](../chapter-06/)**
