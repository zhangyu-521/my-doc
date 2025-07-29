# 第2章：模块系统深入理解

## 本章目标

- 深入理解CommonJS模块系统
- 掌握ES Modules的使用方法
- 了解模块加载机制和缓存原理
- 学会使用npm进行包管理
- 掌握模块设计的最佳实践

## 2.1 CommonJS模块系统

### 基本概念

CommonJS是Node.js默认的模块系统，使用`require()`导入模块，`module.exports`或`exports`导出模块。

### 模块导出

#### 1. 使用module.exports

创建 `math.js`：
```javascript
// math.js - 数学工具模块

// 导出单个函数
function add(a, b) {
    return a + b;
}

function subtract(a, b) {
    return a - b;
}

function multiply(a, b) {
    return a * b;
}

// 导出多个函数
module.exports = {
    add,
    subtract,
    multiply,
    PI: 3.14159
};

// 或者分别导出
// module.exports.add = add;
// module.exports.subtract = subtract;
```

#### 2. 使用exports简写

创建 `utils.js`：
```javascript
// utils.js - 工具函数模块

// 直接在exports上添加属性
exports.formatDate = function(date) {
    return date.toISOString().split('T')[0];
};

exports.generateId = function() {
    return Math.random().toString(36).substr(2, 9);
};

exports.capitalize = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// 注意：不能直接赋值给exports
// exports = { ... }; // 这样是错误的！
```

#### 3. 导出类

创建 `User.js`：
```javascript
// User.js - 用户类模块

class User {
    constructor(name, email) {
        this.name = name;
        this.email = email;
        this.createdAt = new Date();
    }
    
    getInfo() {
        return {
            name: this.name,
            email: this.email,
            createdAt: this.createdAt
        };
    }
    
    updateEmail(newEmail) {
        this.email = newEmail;
    }
}

// 导出类
module.exports = User;

// 或者导出类和其他工具函数
// module.exports = {
//     User,
//     createUser: (name, email) => new User(name, email)
// };
```

### 模块导入

创建 `app.js`：
```javascript
// app.js - 主应用文件

// 导入自定义模块
const math = require('./math');
const utils = require('./utils');
const User = require('./User');

// 导入内置模块
const fs = require('fs');
const path = require('path');

// 使用导入的模块
console.log('加法结果:', math.add(5, 3));
console.log('PI值:', math.PI);

console.log('格式化日期:', utils.formatDate(new Date()));
console.log('生成ID:', utils.generateId());

const user = new User('张三', 'zhangsan@example.com');
console.log('用户信息:', user.getInfo());

// 解构导入
const { add, multiply } = require('./math');
console.log('解构使用:', add(2, 3), multiply(4, 5));
```

### 模块加载机制

#### 1. 模块查找顺序

```javascript
// require('./math') 的查找顺序：
// 1. ./math.js
// 2. ./math.json
// 3. ./math.node
// 4. ./math/index.js
// 5. ./math/package.json 中的main字段指定的文件

// require('lodash') 的查找顺序：
// 1. 当前目录的node_modules/lodash
// 2. 父目录的node_modules/lodash
// 3. 继续向上查找直到根目录
// 4. 全局node_modules目录
```

#### 2. 模块缓存机制

创建 `cache-demo.js`：
```javascript
// cache-demo.js - 演示模块缓存

console.log('模块缓存演示');

// 第一次加载
const math1 = require('./math');
console.log('第一次加载math模块');

// 第二次加载（从缓存中获取）
const math2 = require('./math');
console.log('第二次加载math模块');

// 验证是否是同一个对象
console.log('是否是同一个对象:', math1 === math2); // true

// 查看模块缓存
console.log('缓存的模块:', Object.keys(require.cache));

// 清除模块缓存
delete require.cache[require.resolve('./math')];
const math3 = require('./math');
console.log('清除缓存后重新加载:', math1 === math3); // false
```

## 2.2 ES Modules详解

### 基本语法

#### 1. 导出语法

创建 `es-math.mjs`：
```javascript
// es-math.mjs - ES模块数学工具

// 命名导出
export function add(a, b) {
    return a + b;
}

export function subtract(a, b) {
    return a - b;
}

// 导出常量
export const PI = 3.14159;

// 导出类
export class Calculator {
    constructor() {
        this.result = 0;
    }
    
    add(num) {
        this.result += num;
        return this;
    }
    
    getResult() {
        return this.result;
    }
}

// 默认导出
export default function multiply(a, b) {
    return a * b;
}

// 或者在文件末尾统一导出
// export { add, subtract, PI, Calculator };
// export { multiply as default };
```

#### 2. 导入语法

创建 `es-app.mjs`：
```javascript
// es-app.mjs - ES模块应用

// 默认导入
import multiply from './es-math.mjs';

// 命名导入
import { add, subtract, PI, Calculator } from './es-math.mjs';

// 重命名导入
import { add as sum, subtract as minus } from './es-math.mjs';

// 导入所有
import * as MathUtils from './es-math.mjs';

// 使用导入的模块
console.log('乘法:', multiply(4, 5));
console.log('加法:', add(2, 3));
console.log('PI:', PI);

const calc = new Calculator();
console.log('计算器结果:', calc.add(10).add(5).getResult());

// 使用重命名的导入
console.log('重命名使用:', sum(1, 2), minus(5, 3));

// 使用命名空间导入
console.log('命名空间使用:', MathUtils.add(7, 8));
console.log('默认导出:', MathUtils.default(3, 4));
```

### 在Node.js中使用ES Modules

#### 方法1：使用.mjs扩展名
```bash
node es-app.mjs
```

#### 方法2：在package.json中设置type
```json
{
  "name": "es-modules-demo",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js"
}
```

设置后，所有.js文件都会被当作ES模块处理。

### 动态导入

创建 `dynamic-import.mjs`：
```javascript
// dynamic-import.mjs - 动态导入示例

async function loadMathModule() {
    try {
        // 动态导入
        const mathModule = await import('./es-math.mjs');
        
        console.log('动态导入成功');
        console.log('加法结果:', mathModule.add(10, 20));
        console.log('默认导出:', mathModule.default(6, 7));
        
        return mathModule;
    } catch (error) {
        console.error('导入失败:', error);
    }
}

// 条件导入
async function conditionalImport(useAdvanced) {
    if (useAdvanced) {
        const advancedMath = await import('./advanced-math.mjs');
        return advancedMath;
    } else {
        const basicMath = await import('./es-math.mjs');
        return basicMath;
    }
}

// 使用动态导入
loadMathModule().then(module => {
    console.log('模块加载完成');
});
```

## 2.3 CommonJS vs ES Modules

### 主要区别

| 特性 | CommonJS | ES Modules |
|------|----------|------------|
| 语法 | require/module.exports | import/export |
| 加载时机 | 运行时 | 编译时 |
| 加载方式 | 同步 | 异步 |
| 循环依赖 | 支持 | 更好的支持 |
| Tree Shaking | 不支持 | 支持 |
| 顶层await | 不支持 | 支持 |

### 互操作性

创建 `interop-demo.js`：
```javascript
// interop-demo.js - 互操作演示

// 在CommonJS中使用ES模块（需要动态导入）
async function useESModule() {
    const { add } = await import('./es-math.mjs');
    console.log('在CommonJS中使用ES模块:', add(1, 2));
}

useESModule();

// 导出给ES模块使用
module.exports = {
    commonjsFunction: () => 'Hello from CommonJS'
};
```

创建 `interop-es.mjs`：
```javascript
// interop-es.mjs - ES模块中使用CommonJS

// 导入CommonJS模块
import commonjsModule from './interop-demo.js';

console.log('ES模块中使用CommonJS:', commonjsModule.commonjsFunction());
```

## 2.4 npm包管理

### package.json详解

```json
{
  "name": "my-awesome-package",
  "version": "1.0.0",
  "description": "一个很棒的Node.js包",
  "main": "index.js",
  "type": "commonjs",
  "engines": {
    "node": ">=14.0.0"
  },
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "build": "webpack --mode production"
  },
  "keywords": ["nodejs", "utility", "helper"],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "~4.17.21"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0"
  },
  "peerDependencies": {
    "react": ">=16.0.0"
  }
}
```

### 版本管理

```bash
# 安装依赖
npm install express              # 最新版本
npm install express@4.18.2       # 指定版本
npm install express@^4.18.0      # 兼容版本
npm install express@~4.18.0      # 补丁版本

# 开发依赖
npm install --save-dev jest      # 开发时依赖
npm install --global nodemon     # 全局安装

# 更新和删除
npm update express               # 更新包
npm uninstall express            # 删除包
```

### 创建自己的包

创建 `my-utils/index.js`：
```javascript
// my-utils/index.js - 自定义工具包

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day);
}

/**
 * 深度克隆对象
 * @param {any} obj - 要克隆的对象
 * @returns {any} 克隆后的对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    
    return cloned;
}

module.exports = {
    formatDate,
    deepClone
};
```

创建 `my-utils/package.json`：
```json
{
  "name": "my-awesome-utils",
  "version": "1.0.0",
  "description": "个人工具函数库",
  "main": "index.js",
  "keywords": ["utils", "helpers", "tools"],
  "author": "Your Name",
  "license": "MIT"
}
```

## 2.5 模块设计最佳实践

### 1. 单一职责原则

```javascript
// 好的做法：每个模块只负责一个功能
// user-validator.js
exports.validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

exports.validatePassword = (password) => {
    return password.length >= 8;
};

// user-service.js
const validator = require('./user-validator');

exports.createUser = (userData) => {
    if (!validator.validateEmail(userData.email)) {
        throw new Error('Invalid email');
    }
    // 创建用户逻辑
};
```

### 2. 明确的接口设计

```javascript
// 好的做法：清晰的API设计
// database.js
class Database {
    constructor(config) {
        this.config = config;
        this.connection = null;
    }
    
    async connect() {
        // 连接逻辑
    }
    
    async query(sql, params) {
        // 查询逻辑
    }
    
    async close() {
        // 关闭连接
    }
}

module.exports = Database;
```

### 3. 错误处理

```javascript
// error-handler.js
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { AppError };
```

## 本章小结

本章我们深入学习了：

1. **CommonJS模块系统**：require/module.exports语法和使用方法
2. **ES Modules**：import/export语法和现代模块系统
3. **模块加载机制**：查找顺序、缓存机制和互操作性
4. **npm包管理**：package.json配置、版本管理和包发布
5. **最佳实践**：模块设计原则和代码组织方法

## 练习题

1. 创建一个工具模块，包含字符串处理函数
2. 使用ES Modules重写CommonJS模块
3. 实现一个简单的配置管理模块
4. 创建并发布一个npm包

## 下一章预告

下一章我们将学习Node.js的核心特性——异步编程与事件循环，深入理解JavaScript的异步执行机制。

---

[上一章：Node.js基础与环境搭建](../chapter-01/) | [返回目录](../) | [下一章：异步编程与事件循环](../chapter-03/)
