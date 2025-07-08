# 第8章：设计模式在JavaScript中的应用

## 📖 本章概述

设计模式是软件开发中经过验证的解决方案模板。本章将探讨经典设计模式在现代JavaScript中的实现和应用，包括创建型、结构型、行为型模式，以及函数式编程中的设计模式。

## 🎯 学习目标

完成本章学习后，你将能够：

- 理解并实现经典的23种设计模式
- 掌握JavaScript特有的设计模式应用
- 运用函数式编程中的设计模式
- 在实际项目中选择合适的设计模式
- 识别和重构代码中的反模式

## 🏗️ 创建型模式

### 单例模式 (Singleton)

```javascript
// 传统单例模式
class Singleton {
    constructor() {
        if (Singleton.instance) {
            return Singleton.instance;
        }
        
        this.data = {};
        Singleton.instance = this;
        return this;
    }
    
    setData(key, value) {
        this.data[key] = value;
    }
    
    getData(key) {
        return this.data[key];
    }
}

// 现代JavaScript单例模式
const createSingleton = (function() {
    let instance;
    
    return function(Constructor) {
        return function(...args) {
            if (!instance) {
                instance = new Constructor(...args);
            }
            return instance;
        };
    };
})();

// 使用闭包的单例模式
const DatabaseConnection = (function() {
    let instance;
    let isConnected = false;
    
    function createConnection() {
        return {
            connect() {
                if (!isConnected) {
                    console.log('Connecting to database...');
                    isConnected = true;
                }
                return this;
            },
            
            disconnect() {
                if (isConnected) {
                    console.log('Disconnecting from database...');
                    isConnected = false;
                }
                return this;
            },
            
            query(sql) {
                if (!isConnected) {
                    throw new Error('Database not connected');
                }
                console.log(`Executing query: ${sql}`);
                return { results: [] };
            },
            
            isConnected() {
                return isConnected;
            }
        };
    }
    
    return {
        getInstance() {
            if (!instance) {
                instance = createConnection();
            }
            return instance;
        }
    };
})();

// 使用示例
const db1 = DatabaseConnection.getInstance();
const db2 = DatabaseConnection.getInstance();
console.log(db1 === db2); // true

db1.connect().query('SELECT * FROM users');

// ES6模块单例
// config.js
class Config {
    constructor() {
        this.settings = {
            apiUrl: 'https://api.example.com',
            timeout: 5000,
            retries: 3
        };
    }
    
    get(key) {
        return this.settings[key];
    }
    
    set(key, value) {
        this.settings[key] = value;
    }
    
    getAll() {
        return { ...this.settings };
    }
}

export default new Config(); // 模块级单例
```

### 工厂模式 (Factory)

```javascript
// 简单工厂模式
class UserFactory {
    static createUser(type, data) {
        switch (type) {
            case 'admin':
                return new AdminUser(data);
            case 'regular':
                return new RegularUser(data);
            case 'guest':
                return new GuestUser(data);
            default:
                throw new Error(`Unknown user type: ${type}`);
        }
    }
}

class AdminUser {
    constructor(data) {
        this.name = data.name;
        this.email = data.email;
        this.permissions = ['read', 'write', 'delete', 'admin'];
    }
    
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }
}

class RegularUser {
    constructor(data) {
        this.name = data.name;
        this.email = data.email;
        this.permissions = ['read', 'write'];
    }
    
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }
}

class GuestUser {
    constructor(data) {
        this.name = data.name || 'Guest';
        this.email = data.email || '';
        this.permissions = ['read'];
    }
    
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }
}

// 抽象工厂模式
class UIComponentFactory {
    createButton() {
        throw new Error('createButton method must be implemented');
    }
    
    createInput() {
        throw new Error('createInput method must be implemented');
    }
    
    createModal() {
        throw new Error('createModal method must be implemented');
    }
}

class MaterialUIFactory extends UIComponentFactory {
    createButton() {
        return new MaterialButton();
    }
    
    createInput() {
        return new MaterialInput();
    }
    
    createModal() {
        return new MaterialModal();
    }
}

class BootstrapUIFactory extends UIComponentFactory {
    createButton() {
        return new BootstrapButton();
    }
    
    createInput() {
        return new BootstrapInput();
    }
    
    createModal() {
        return new BootstrapModal();
    }
}

// 组件实现
class MaterialButton {
    render() {
        return '<button class="mdc-button">Material Button</button>';
    }
}

class BootstrapButton {
    render() {
        return '<button class="btn btn-primary">Bootstrap Button</button>';
    }
}

// 使用示例
function createUI(theme) {
    let factory;
    
    switch (theme) {
        case 'material':
            factory = new MaterialUIFactory();
            break;
        case 'bootstrap':
            factory = new BootstrapUIFactory();
            break;
        default:
            throw new Error(`Unknown theme: ${theme}`);
    }
    
    return {
        button: factory.createButton(),
        input: factory.createInput(),
        modal: factory.createModal()
    };
}

const materialUI = createUI('material');
console.log(materialUI.button.render());

// 函数式工厂模式
const createValidator = (rules) => {
    return (data) => {
        const errors = [];
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            
            if (rule.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }
            
            if (value !== undefined && rule.type && typeof value !== rule.type) {
                errors.push(`${field} must be of type ${rule.type}`);
            }
            
            if (rule.minLength && value.length < rule.minLength) {
                errors.push(`${field} must be at least ${rule.minLength} characters`);
            }
            
            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push(`${field} must be at most ${rule.maxLength} characters`);
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
};

// 使用函数式工厂
const userValidator = createValidator({
    username: {
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/
    },
    email: {
        required: true,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
});

const result = userValidator({
    username: 'john_doe',
    email: 'john@example.com'
});
```

### 建造者模式 (Builder)

```javascript
// 传统建造者模式
class QueryBuilder {
    constructor() {
        this.query = {
            select: [],
            from: '',
            where: [],
            orderBy: [],
            limit: null,
            offset: null
        };
    }
    
    select(...fields) {
        this.query.select.push(...fields);
        return this;
    }
    
    from(table) {
        this.query.from = table;
        return this;
    }
    
    where(condition) {
        this.query.where.push(condition);
        return this;
    }
    
    orderBy(field, direction = 'ASC') {
        this.query.orderBy.push(`${field} ${direction}`);
        return this;
    }
    
    limit(count) {
        this.query.limit = count;
        return this;
    }
    
    offset(count) {
        this.query.offset = count;
        return this;
    }
    
    build() {
        let sql = `SELECT ${this.query.select.join(', ')} FROM ${this.query.from}`;
        
        if (this.query.where.length > 0) {
            sql += ` WHERE ${this.query.where.join(' AND ')}`;
        }
        
        if (this.query.orderBy.length > 0) {
            sql += ` ORDER BY ${this.query.orderBy.join(', ')}`;
        }
        
        if (this.query.limit !== null) {
            sql += ` LIMIT ${this.query.limit}`;
        }
        
        if (this.query.offset !== null) {
            sql += ` OFFSET ${this.query.offset}`;
        }
        
        return sql;
    }
    
    reset() {
        this.query = {
            select: [],
            from: '',
            where: [],
            orderBy: [],
            limit: null,
            offset: null
        };
        return this;
    }
}

// 使用示例
const query = new QueryBuilder()
    .select('id', 'name', 'email')
    .from('users')
    .where('age > 18')
    .where('status = "active"')
    .orderBy('name', 'ASC')
    .limit(10)
    .offset(20)
    .build();

console.log(query);
// SELECT id, name, email FROM users WHERE age > 18 AND status = "active" ORDER BY name ASC LIMIT 10 OFFSET 20

// HTTP请求建造者
class RequestBuilder {
    constructor() {
        this.config = {
            method: 'GET',
            url: '',
            headers: {},
            params: {},
            data: null,
            timeout: 5000
        };
    }
    
    method(method) {
        this.config.method = method.toUpperCase();
        return this;
    }
    
    url(url) {
        this.config.url = url;
        return this;
    }
    
    header(key, value) {
        this.config.headers[key] = value;
        return this;
    }
    
    headers(headers) {
        Object.assign(this.config.headers, headers);
        return this;
    }
    
    param(key, value) {
        this.config.params[key] = value;
        return this;
    }
    
    params(params) {
        Object.assign(this.config.params, params);
        return this;
    }
    
    data(data) {
        this.config.data = data;
        return this;
    }
    
    timeout(ms) {
        this.config.timeout = ms;
        return this;
    }
    
    json(data) {
        this.config.data = JSON.stringify(data);
        this.config.headers['Content-Type'] = 'application/json';
        return this;
    }
    
    auth(token) {
        this.config.headers['Authorization'] = `Bearer ${token}`;
        return this;
    }
    
    async send() {
        const url = new URL(this.config.url);
        Object.keys(this.config.params).forEach(key => {
            url.searchParams.append(key, this.config.params[key]);
        });
        
        const options = {
            method: this.config.method,
            headers: this.config.headers,
            body: this.config.data
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        options.signal = controller.signal;
        
        try {
            const response = await fetch(url.toString(), options);
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}

// 使用示例
const response = await new RequestBuilder()
    .method('POST')
    .url('https://api.example.com/users')
    .auth('your-token-here')
    .json({ name: 'John', email: 'john@example.com' })
    .timeout(10000)
    .send();

// 函数式建造者模式
const createRequestBuilder = () => {
    let config = {
        method: 'GET',
        url: '',
        headers: {},
        params: {},
        data: null,
        timeout: 5000
    };
    
    const builder = {
        method: (method) => {
            config.method = method.toUpperCase();
            return builder;
        },
        
        url: (url) => {
            config.url = url;
            return builder;
        },
        
        header: (key, value) => {
            config.headers[key] = value;
            return builder;
        },
        
        json: (data) => {
            config.data = JSON.stringify(data);
            config.headers['Content-Type'] = 'application/json';
            return builder;
        },
        
        build: () => ({ ...config }),
        
        send: async () => {
            // 发送请求的实现
            return fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.data
            });
        }
    };
    
    return builder;
};

// 使用函数式建造者
const request = createRequestBuilder()
    .method('POST')
    .url('/api/users')
    .json({ name: 'Jane' })
    .build();
```

## 🏛️ 结构型模式

### 适配器模式 (Adapter)

```javascript
// 第三方库适配器
class LegacyPrinter {
    print(text) {
        console.log(`Legacy Printer: ${text}`);
    }
}

class ModernPrinter {
    printDocument(document) {
        console.log(`Modern Printer: ${document.content}`);
    }
}

// 适配器类
class PrinterAdapter {
    constructor(printer) {
        this.printer = printer;
    }
    
    print(text) {
        if (this.printer instanceof LegacyPrinter) {
            this.printer.print(text);
        } else if (this.printer instanceof ModernPrinter) {
            this.printer.printDocument({ content: text });
        }
    }
}

// 使用示例
const legacyPrinter = new PrinterAdapter(new LegacyPrinter());
const modernPrinter = new PrinterAdapter(new ModernPrinter());

legacyPrinter.print('Hello World'); // Legacy Printer: Hello World
modernPrinter.print('Hello World'); // Modern Printer: Hello World

// API适配器
class APIAdapter {
    constructor(apiVersion) {
        this.apiVersion = apiVersion;
    }
    
    async getUser(id) {
        if (this.apiVersion === 'v1') {
            const response = await fetch(`/api/v1/user/${id}`);
            const data = await response.json();
            
            // 适配v1格式到统一格式
            return {
                id: data.user_id,
                name: data.full_name,
                email: data.email_address,
                createdAt: new Date(data.created_timestamp)
            };
        } else if (this.apiVersion === 'v2') {
            const response = await fetch(`/api/v2/users/${id}`);
            const data = await response.json();
            
            // v2已经是期望的格式
            return {
                id: data.id,
                name: data.name,
                email: data.email,
                createdAt: new Date(data.createdAt)
            };
        }
    }
}

// 数据库适配器
class DatabaseAdapter {
    constructor(database) {
        this.database = database;
    }
    
    async find(table, conditions) {
        if (this.database.type === 'mongodb') {
            return await this.database.collection(table).find(conditions).toArray();
        } else if (this.database.type === 'mysql') {
            const whereClause = Object.entries(conditions)
                .map(([key, value]) => `${key} = '${value}'`)
                .join(' AND ');
            
            return await this.database.query(`SELECT * FROM ${table} WHERE ${whereClause}`);
        } else if (this.database.type === 'redis') {
            // Redis适配逻辑
            const key = `${table}:${JSON.stringify(conditions)}`;
            const result = await this.database.get(key);
            return result ? JSON.parse(result) : null;
        }
    }
}
```

### 装饰器模式 (Decorator)

```javascript
// 基础组件
class Coffee {
    cost() {
        return 2;
    }
    
    description() {
        return 'Simple coffee';
    }
}

// 装饰器基类
class CoffeeDecorator {
    constructor(coffee) {
        this.coffee = coffee;
    }
    
    cost() {
        return this.coffee.cost();
    }
    
    description() {
        return this.coffee.description();
    }
}

// 具体装饰器
class MilkDecorator extends CoffeeDecorator {
    cost() {
        return this.coffee.cost() + 0.5;
    }
    
    description() {
        return this.coffee.description() + ', milk';
    }
}

class SugarDecorator extends CoffeeDecorator {
    cost() {
        return this.coffee.cost() + 0.2;
    }
    
    description() {
        return this.coffee.description() + ', sugar';
    }
}

class WhipDecorator extends CoffeeDecorator {
    cost() {
        return this.coffee.cost() + 0.7;
    }
    
    description() {
        return this.coffee.description() + ', whip';
    }
}

// 使用示例
let coffee = new Coffee();
console.log(`${coffee.description()} - $${coffee.cost()}`);

coffee = new MilkDecorator(coffee);
console.log(`${coffee.description()} - $${coffee.cost()}`);

coffee = new SugarDecorator(coffee);
console.log(`${coffee.description()} - $${coffee.cost()}`);

coffee = new WhipDecorator(coffee);
console.log(`${coffee.description()} - $${coffee.cost()}`);
// Simple coffee, milk, sugar, whip - $3.4

// 函数装饰器
function withLogging(fn) {
    return function(...args) {
        console.log(`Calling ${fn.name} with args:`, args);
        const result = fn.apply(this, args);
        console.log(`${fn.name} returned:`, result);
        return result;
    };
}

function withTiming(fn) {
    return function(...args) {
        const start = performance.now();
        const result = fn.apply(this, args);
        const end = performance.now();
        console.log(`${fn.name} took ${end - start}ms`);
        return result;
    };
}

function withCaching(fn) {
    const cache = new Map();
    
    return function(...args) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            console.log(`Cache hit for ${fn.name}`);
            return cache.get(key);
        }
        
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
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
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

const decoratedFibonacci = compose(
    withLogging,
    withTiming,
    withCaching
)(fibonacci);

console.log(decoratedFibonacci(10));
```

### 外观模式 (Facade)

```javascript
// 复杂的子系统
class AudioSystem {
    turnOn() {
        console.log('Audio system is on');
    }
    
    setVolume(volume) {
        console.log(`Audio volume set to ${volume}`);
    }
    
    turnOff() {
        console.log('Audio system is off');
    }
}

class VideoSystem {
    turnOn() {
        console.log('Video system is on');
    }
    
    setResolution(resolution) {
        console.log(`Video resolution set to ${resolution}`);
    }
    
    turnOff() {
        console.log('Video system is off');
    }
}

class LightingSystem {
    turnOn() {
        console.log('Lights are on');
    }
    
    setBrightness(brightness) {
        console.log(`Light brightness set to ${brightness}%`);
    }
    
    turnOff() {
        console.log('Lights are off');
    }
}

// 外观类
class HomeTheaterFacade {
    constructor() {
        this.audio = new AudioSystem();
        this.video = new VideoSystem();
        this.lighting = new LightingSystem();
    }
    
    watchMovie() {
        console.log('Getting ready to watch a movie...');
        this.lighting.turnOn();
        this.lighting.setBrightness(10);
        this.audio.turnOn();
        this.audio.setVolume(50);
        this.video.turnOn();
        this.video.setResolution('1080p');
        console.log('Movie is ready!');
    }
    
    endMovie() {
        console.log('Shutting down movie theater...');
        this.video.turnOff();
        this.audio.turnOff();
        this.lighting.turnOff();
        console.log('Movie theater is shut down');
    }
    
    listenToMusic() {
        console.log('Getting ready to listen to music...');
        this.lighting.turnOn();
        this.lighting.setBrightness(30);
        this.audio.turnOn();
        this.audio.setVolume(70);
        console.log('Music is ready!');
    }
}

// 使用示例
const homeTheater = new HomeTheaterFacade();
homeTheater.watchMovie();
// homeTheater.endMovie();

// API外观模式
class APIFacade {
    constructor() {
        this.userService = new UserService();
        this.orderService = new OrderService();
        this.paymentService = new PaymentService();
        this.notificationService = new NotificationService();
    }
    
    async createOrder(userId, items, paymentInfo) {
        try {
            // 1. 验证用户
            const user = await this.userService.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // 2. 创建订单
            const order = await this.orderService.createOrder(userId, items);
            
            // 3. 处理支付
            const payment = await this.paymentService.processPayment(
                order.id, 
                order.total, 
                paymentInfo
            );
            
            // 4. 更新订单状态
            await this.orderService.updateOrderStatus(order.id, 'paid');
            
            // 5. 发送通知
            await this.notificationService.sendOrderConfirmation(user.email, order);
            
            return {
                success: true,
                order,
                payment
            };
        } catch (error) {
            console.error('Order creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 使用外观
const api = new APIFacade();
const result = await api.createOrder(123, [
    { id: 1, quantity: 2 },
    { id: 2, quantity: 1 }
], {
    cardNumber: '1234-5678-9012-3456',
    expiryDate: '12/25',
    cvv: '123'
});
```

## 📝 本章小结

本章深入探讨了设计模式在JavaScript中的应用：

1. **创建型模式**：单例、工厂、建造者等对象创建模式
2. **结构型模式**：适配器、装饰器、外观等结构组织模式
3. **现代实现**：结合ES6+特性的模式实现
4. **函数式模式**：利用JavaScript函数特性的设计模式

这些模式将帮助你：
- 编写更加结构化和可维护的代码
- 解决常见的设计问题
- 提高代码的复用性和扩展性
- 建立良好的架构基础

## 🚀 下一章预告

下一章我们将学习**现代JavaScript工具链**，探讨Webpack、Vite、Babel、ESLint等工具的深度配置和优化。

---

**继续学习：[第9章：现代JavaScript工具链](../chapter-09/README.md)**
