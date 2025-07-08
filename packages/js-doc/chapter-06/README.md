# 第6章：模块系统深度解析

## 📖 本章概述

模块化是现代JavaScript开发的基石。本章将深入探讨各种模块系统的原理、差异和最佳实践，包括ES6模块、CommonJS、AMD、UMD等，以及动态导入、循环依赖处理等高级话题。

## 🎯 学习目标

完成本章学习后，你将能够：

- 深入理解各种模块系统的工作原理
- 掌握ES6模块与CommonJS的区别和转换
- 熟练使用动态导入和代码分割技术
- 解决循环依赖等模块化问题
- 理解模块打包和加载机制

## 📦 ES6模块系统深入

### ES6模块基础与特性

```javascript
// math.js - 导出模块
export const PI = 3.14159;
export const E = 2.71828;

export function add(a, b) {
    return a + b;
}

export function multiply(a, b) {
    return a * b;
}

// 默认导出
export default function calculate(operation, a, b) {
    switch (operation) {
        case 'add':
            return add(a, b);
        case 'multiply':
            return multiply(a, b);
        default:
            throw new Error('Unknown operation');
    }
}

// 重新导出
export { default as lodash } from 'lodash';
export * from './utils.js';
```

```javascript
// main.js - 导入模块
import calculate, { PI, E, add, multiply } from './math.js';
import * as math from './math.js';
import { add as sum } from './math.js';

console.log(PI);                    // 3.14159
console.log(calculate('add', 2, 3)); // 5
console.log(math.multiply(4, 5));   // 20
console.log(sum(1, 2));             // 3
```

### ES6模块的静态特性

```javascript
// ES6模块在编译时确定依赖关系
// 以下代码会在编译时报错，因为导入必须在顶层

function conditionalImport() {
    // ❌ 错误：不能在函数内部使用import
    // import { someFunction } from './module.js';
}

if (condition) {
    // ❌ 错误：不能在条件语句中使用import
    // import { anotherFunction } from './another-module.js';
}

// ✅ 正确：使用动态导入
async function dynamicImport() {
    if (condition) {
        const module = await import('./module.js');
        module.someFunction();
    }
}

// ES6模块的绑定是活的（live binding）
// counter.js
export let count = 0;
export function increment() {
    count++;
}
export function getCount() {
    return count;
}

// main.js
import { count, increment, getCount } from './counter.js';

console.log(count);      // 0
increment();
console.log(count);      // 1 - 绑定是活的，值会更新
console.log(getCount()); // 1
```

### 模块作用域与this绑定

```javascript
// module-scope.js
console.log(this); // undefined (严格模式)

// 模块级别的变量
let moduleVariable = 'module scope';

// 模块级别的函数
function moduleFunction() {
    console.log('Module function called');
    console.log(this); // undefined
}

// 导出的类
export class ModuleClass {
    constructor() {
        this.name = 'ModuleClass';
    }

    method() {
        console.log(this); // ModuleClass实例
    }

    arrowMethod = () => {
        console.log(this); // ModuleClass实例
    }
}

export { moduleVariable, moduleFunction };
```

## 🔄 CommonJS深度解析

### CommonJS模块机制

```javascript
// CommonJS模块实现原理
function createModuleWrapper() {
    return function(exports, require, module, __filename, __dirname) {
        // 模块代码在这里执行

        // math-commonjs.js
        const PI = 3.14159;
        const E = 2.71828;

        function add(a, b) {
            return a + b;
        }

        function multiply(a, b) {
            return a * b;
        }

        // 导出方式1：直接赋值给exports
        exports.PI = PI;
        exports.E = E;
        exports.add = add;

        // 导出方式2：赋值给module.exports
        module.exports = {
            PI,
            E,
            add,
            multiply,
            default: function calculate(operation, a, b) {
                switch (operation) {
                    case 'add':
                        return add(a, b);
                    case 'multiply':
                        return multiply(a, b);
                    default:
                        throw new Error('Unknown operation');
                }
            }
        };

        // 注意：exports和module.exports的区别
        // exports是module.exports的引用
        // 如果给module.exports重新赋值，exports就失效了
    };
}
```

### CommonJS缓存机制

```javascript
// cache-demo.js
console.log('Module executed');

let counter = 0;

module.exports = {
    increment() {
        counter++;
    },
    getCounter() {
        return counter;
    },
    reset() {
        counter = 0;
    }
};

// main.js
const cache1 = require('./cache-demo');
const cache2 = require('./cache-demo'); // 不会重新执行模块代码

console.log(cache1 === cache2); // true - 同一个对象

cache1.increment();
console.log(cache2.getCounter()); // 1 - 共享状态

// 清除缓存（仅在Node.js中）
delete require.cache[require.resolve('./cache-demo')];
const fresh = require('./cache-demo'); // 重新执行模块代码
console.log(fresh === cache1); // false - 新的对象
```

### 手写require实现

```javascript
// 简化版require实现
class ModuleSystem {
    constructor() {
        this.cache = {};
        this.extensions = {
            '.js': this.loadJS.bind(this),
            '.json': this.loadJSON.bind(this)
        };
    }

    require(id) {
        // 解析模块路径
        const filename = this.resolveFilename(id);

        // 检查缓存
        if (this.cache[filename]) {
            return this.cache[filename].exports;
        }

        // 创建模块对象
        const module = {
            id: filename,
            filename,
            exports: {},
            loaded: false,
            children: [],
            parent: null
        };

        // 缓存模块
        this.cache[filename] = module;

        // 加载模块
        this.load(filename, module);

        // 标记为已加载
        module.loaded = true;

        return module.exports;
    }

    load(filename, module) {
        const extension = this.getExtension(filename);
        const loader = this.extensions[extension];

        if (!loader) {
            throw new Error(`Unknown file extension: ${extension}`);
        }

        loader(filename, module);
    }

    loadJS(filename, module) {
        const content = this.readFile(filename);
        const wrapper = this.wrap(content);
        const compiledWrapper = this.compile(wrapper, filename);

        const exports = module.exports;
        const require = this.createRequire(module);
        const __filename = filename;
        const __dirname = this.dirname(filename);

        compiledWrapper.call(exports, exports, require, module, __filename, __dirname);
    }

    loadJSON(filename, module) {
        const content = this.readFile(filename);
        module.exports = JSON.parse(content);
    }

    wrap(script) {
        return `(function (exports, require, module, __filename, __dirname) {\n${script}\n});`;
    }

    compile(content, filename) {
        // 在实际实现中，这里会使用V8的编译API
        return eval(content);
    }

    createRequire(module) {
        const require = (id) => {
            return this.require(id);
        };

        require.cache = this.cache;
        require.resolve = (id) => this.resolveFilename(id);

        return require;
    }

    resolveFilename(id) {
        // 简化的路径解析
        if (id.startsWith('./') || id.startsWith('../')) {
            return this.resolvePath(id);
        }
        return this.resolveNodeModule(id);
    }

    resolvePath(id) {
        // 相对路径解析逻辑
        return id;
    }

    resolveNodeModule(id) {
        // node_modules解析逻辑
        return `node_modules/${id}`;
    }

    getExtension(filename) {
        return filename.substring(filename.lastIndexOf('.'));
    }

    dirname(filename) {
        return filename.substring(0, filename.lastIndexOf('/'));
    }

    readFile(filename) {
        // 在实际实现中，这里会读取文件系统
        return `console.log('Loading ${filename}'); module.exports = { name: '${filename}' };`;
    }
}

// 使用示例
const moduleSystem = new ModuleSystem();
const myModule = moduleSystem.require('./my-module.js');
console.log(myModule);
```

## 🔀 ES6模块与CommonJS对比

### 语法差异

```javascript
// ES6 Modules
// 导出
export const value = 42;
export function func() {}
export default class MyClass {}

// 导入
import MyClass, { value, func } from './module.js';
import * as module from './module.js';

// CommonJS
// 导出
exports.value = 42;
exports.func = function() {};
module.exports = class MyClass {};

// 或者
module.exports = {
    value: 42,
    func: function() {},
    default: class MyClass {}
};

// 导入
const MyClass = require('./module.js');
const { value, func } = require('./module.js');
```

### 执行时机差异

```javascript
// ES6模块：编译时静态分析
// hoisting-es6.js
console.log('Before import');
import { value } from './exported.js'; // 提升到顶部
console.log('After import', value);

// exported.js
console.log('Exported module executing');
export const value = 'exported value';

// 执行顺序：
// 1. "Exported module executing"
// 2. "Before import"
// 3. "After import exported value"

// CommonJS：运行时动态加载
// hoisting-commonjs.js
console.log('Before require');
const { value } = require('./exported-cjs.js'); // 运行时执行
console.log('After require', value);

// exported-cjs.js
console.log('CommonJS module executing');
exports.value = 'exported value';

// 执行顺序：
// 1. "Before require"
// 2. "CommonJS module executing"
// 3. "After require exported value"
```

### 互操作性

```javascript
// ES6模块导入CommonJS
// commonjs-module.js (CommonJS)
module.exports = {
    name: 'CommonJS Module',
    version: '1.0.0'
};

// es6-module.js (ES6)
import cjsModule from './commonjs-module.js';
// 或者
import * as cjsModule from './commonjs-module.js';

console.log(cjsModule.name); // "CommonJS Module"

// CommonJS导入ES6模块（需要动态导入）
// main.cjs
async function loadES6Module() {
    const es6Module = await import('./es6-module.js');
    console.log(es6Module.default);
}

loadES6Module();

// 或者使用createRequire（Node.js）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cjsModule = require('./commonjs-module.js');
```

## 🚀 动态导入与代码分割

### 动态导入基础

```javascript
// 基础动态导入
async function loadModule() {
    try {
        const module = await import('./dynamic-module.js');
        console.log(module.default);
        module.namedExport();
    } catch (error) {
        console.error('Failed to load module:', error);
    }
}

// 条件导入
async function conditionalImport(condition) {
    if (condition) {
        const { heavyFunction } = await import('./heavy-module.js');
        return heavyFunction();
    } else {
        const { lightFunction } = await import('./light-module.js');
        return lightFunction();
    }
}

// 动态导入工厂
class ModuleLoader {
    constructor() {
        this.cache = new Map();
    }

    async load(modulePath) {
        if (this.cache.has(modulePath)) {
            return this.cache.get(modulePath);
        }

        try {
            const module = await import(modulePath);
            this.cache.set(modulePath, module);
            return module;
        } catch (error) {
            console.error(`Failed to load module ${modulePath}:`, error);
            throw error;
        }
    }

    async loadWithRetry(modulePath, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.load(modulePath);
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    preload(modulePaths) {
        return Promise.all(
            modulePaths.map(path => this.load(path))
        );
    }

    clear() {
        this.cache.clear();
    }
}

// 使用示例
const loader = new ModuleLoader();

// 预加载模块
await loader.preload([
    './module1.js',
    './module2.js',
    './module3.js'
]);

// 使用缓存的模块
const module1 = await loader.load('./module1.js');
```

### 代码分割策略

```javascript
// 路由级别的代码分割
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
    }

    // 注册路由
    register(path, moduleLoader) {
        this.routes.set(path, moduleLoader);
    }

    // 导航到路由
    async navigate(path) {
        const moduleLoader = this.routes.get(path);
        if (!moduleLoader) {
            throw new Error(`Route ${path} not found`);
        }

        try {
            // 显示加载状态
            this.showLoading();

            // 动态加载路由模块
            const module = await moduleLoader();

            // 清理当前路由
            if (this.currentRoute) {
                this.currentRoute.cleanup?.();
            }

            // 初始化新路由
            this.currentRoute = new module.default();
            this.currentRoute.render();

            this.hideLoading();
        } catch (error) {
            this.showError(error);
        }
    }

    showLoading() {
        console.log('Loading...');
    }

    hideLoading() {
        console.log('Loading complete');
    }

    showError(error) {
        console.error('Navigation error:', error);
    }
}

// 使用示例
const router = new Router();

// 注册路由
router.register('/home', () => import('./pages/home.js'));
router.register('/about', () => import('./pages/about.js'));
router.register('/contact', () => import('./pages/contact.js'));

// 导航
router.navigate('/home');

// 功能级别的代码分割
class FeatureLoader {
    constructor() {
        this.features = new Map();
    }

    async loadFeature(featureName) {
        if (this.features.has(featureName)) {
            return this.features.get(featureName);
        }

        let module;
        switch (featureName) {
            case 'chart':
                module = await import('./features/chart.js');
                break;
            case 'editor':
                module = await import('./features/editor.js');
                break;
            case 'calendar':
                module = await import('./features/calendar.js');
                break;
            default:
                throw new Error(`Unknown feature: ${featureName}`);
        }

        const feature = new module.default();
        this.features.set(featureName, feature);
        return feature;
    }

    async enableFeature(featureName, container) {
        const feature = await this.loadFeature(featureName);
        feature.mount(container);
        return feature;
    }
}

// 使用示例
const featureLoader = new FeatureLoader();

document.getElementById('load-chart').addEventListener('click', async () => {
    const chart = await featureLoader.enableFeature('chart', '#chart-container');
    chart.render();
});
```

## 🔄 循环依赖处理

### 循环依赖问题

```javascript
// a.js
import { b } from './b.js';

export const a = 'a';

console.log('In a.js, b is:', b); // undefined (因为b.js还没完全加载)

export function getB() {
    return b; // 这个函数调用时b已经定义了
}

// b.js
import { a } from './a.js';

export const b = 'b';

console.log('In b.js, a is:', a); // 'a' (因为a.js的导出已经提升)

// main.js
import { a, getB } from './a.js';
import { b } from './b.js';

console.log('a:', a); // 'a'
console.log('b:', b); // 'b'
console.log('getB():', getB()); // 'b'
```

### 循环依赖解决方案

```javascript
// 解决方案1：延迟导入
// user.js
let Post; // 延迟导入

export class User {
    constructor(name) {
        this.name = name;
        this.posts = [];
    }

    async addPost(title, content) {
        // 延迟导入，避免循环依赖
        if (!Post) {
            const module = await import('./post.js');
            Post = module.Post;
        }

        const post = new Post(title, content, this);
        this.posts.push(post);
        return post;
    }
}

// post.js
let User; // 延迟导入

export class Post {
    constructor(title, content, author) {
        this.title = title;
        this.content = content;
        this.author = author;
    }

    async getAuthorInfo() {
        if (!User) {
            const module = await import('./user.js');
            User = module.User;
        }

        return {
            name: this.author.name,
            postCount: this.author.posts.length
        };
    }
}

// 解决方案2：依赖注入
// services.js
export class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.factories = new Map();
    }

    register(name, factory) {
        this.factories.set(name, factory);
    }

    get(name) {
        if (this.services.has(name)) {
            return this.services.get(name);
        }

        const factory = this.factories.get(name);
        if (!factory) {
            throw new Error(`Service ${name} not found`);
        }

        const service = factory(this);
        this.services.set(name, service);
        return service;
    }
}

// user-service.js
export function createUserService(container) {
    return {
        createUser(name) {
            return {
                name,
                posts: [],
                addPost(title, content) {
                    const postService = container.get('postService');
                    return postService.createPost(title, content, this);
                }
            };
        }
    };
}

// post-service.js
export function createPostService(container) {
    return {
        createPost(title, content, author) {
            return {
                title,
                content,
                author,
                getAuthorInfo() {
                    const userService = container.get('userService');
                    return userService.getUserInfo(author);
                }
            };
        }
    };
}

// main.js
import { ServiceContainer } from './services.js';
import { createUserService } from './user-service.js';
import { createPostService } from './post-service.js';

const container = new ServiceContainer();
container.register('userService', createUserService);
container.register('postService', createPostService);

const userService = container.get('userService');
const user = userService.createUser('John');
const post = user.addPost('Hello', 'World');
```

## 📝 本章小结

本章深入探讨了JavaScript模块系统的核心概念：

1. **ES6模块**：静态分析、活绑定、严格模式等特性
2. **CommonJS**：动态加载、缓存机制、运行时特性
3. **模块对比**：语法、执行时机、互操作性差异
4. **动态导入**：代码分割、按需加载、性能优化
5. **循环依赖**：问题识别和多种解决方案

这些知识将帮助你：
- 选择合适的模块系统
- 优化应用的加载性能
- 解决复杂的模块依赖问题
- 构建可维护的大型应用

## 🚀 下一章预告

下一章我们将学习**TypeScript高级特性**，探讨泛型、条件类型、映射类型等高级类型系统。

---

**继续学习：[第7章：TypeScript高级特性](../chapter-07/)**