# 第6章：Express框架深度应用

## 本章目标

- 掌握Express框架的核心概念
- 深入理解中间件机制
- 学会使用Express路由系统
- 了解模板引擎的集成和使用
- 掌握错误处理和实际项目开发

## 6.1 Express核心概念

### Express简介与安装

Express是Node.js最流行的Web应用框架，提供了丰富的功能来构建Web应用和API。

```bash
# 创建新项目
mkdir express-demo
cd express-demo
npm init -y

# 安装Express
npm install express

# 安装开发依赖
npm install --save-dev nodemon
```

### 基本Express应用

```javascript
// app.js - 基本Express应用

const express = require('express');
const app = express();

// 基本路由
app.get('/', (req, res) => {
    res.send('Hello Express!');
});

app.get('/api/users', (req, res) => {
    const users = [
        { id: 1, name: '张三', email: 'zhangsan@example.com' },
        { id: 2, name: '李四', email: 'lisi@example.com' }
    ];
    res.json(users);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Express服务器运行在端口 ${PORT}`);
});

module.exports = app;
```

### Express应用结构

```javascript
// server.js - 服务器入口文件

const express = require('express');
const path = require('path');

const app = express();

// 应用配置
app.set('port', process.env.PORT || 3000);
app.set('env', process.env.NODE_ENV || 'development');

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 路由
app.get('/', (req, res) => {
    res.json({
        message: 'Express应用运行中',
        environment: app.get('env'),
        port: app.get('port')
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: app.get('env') === 'development' ? err.message : 'Internal Server Error'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

const server = app.listen(app.get('port'), () => {
    console.log(`Express服务器运行在端口 ${app.get('port')}`);
    console.log(`环境: ${app.get('env')}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

module.exports = app;
```

## 6.2 中间件机制

### 中间件基础

```javascript
// middleware-basics.js - 中间件基础

const express = require('express');
const app = express();

// 1. 应用级中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next(); // 调用next()继续执行下一个中间件
});

// 2. 路径特定中间件
app.use('/api', (req, res, next) => {
    console.log('API路径中间件');
    req.startTime = Date.now();
    next();
});

// 3. 路由级中间件
const router = express.Router();

router.use((req, res, next) => {
    console.log('路由级中间件');
    next();
});

router.get('/users', (req, res) => {
    const responseTime = Date.now() - req.startTime;
    res.json({
        message: '用户列表',
        responseTime: `${responseTime}ms`
    });
});

app.use('/api', router);

// 4. 错误处理中间件
app.use((err, req, res, next) => {
    console.error('错误中间件:', err.message);
    res.status(500).json({ error: err.message });
});

app.listen(3001, () => {
    console.log('中间件演示服务器运行在端口 3001');
});
```

### 自定义中间件

```javascript
// custom-middleware.js - 自定义中间件

const express = require('express');
const app = express();

// 1. 日志中间件
function logger(options = {}) {
    const format = options.format || 'combined';
    
    return (req, res, next) => {
        const start = Date.now();
        
        // 监听响应结束事件
        res.on('finish', () => {
            const duration = Date.now() - start;
            const log = {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            };
            
            if (format === 'json') {
                console.log(JSON.stringify(log));
            } else {
                console.log(`${log.timestamp} ${log.method} ${log.url} ${log.status} ${log.duration}`);
            }
        });
        
        next();
    };
}

// 2. 认证中间件
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // 简单的token验证（实际应用中应该使用JWT等）
    if (token === 'Bearer valid-token') {
        req.user = { id: 1, name: '张三' };
        next();
    } else {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// 3. 权限检查中间件
function authorize(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // 简单的角色检查
        const userRole = req.user.role || 'user';
        if (roles.includes(userRole)) {
            next();
        } else {
            res.status(403).json({ error: 'Insufficient permissions' });
        }
    };
}

// 4. 请求验证中间件
function validateRequest(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }
        next();
    };
}

// 5. 缓存中间件
const cache = new Map();

function cacheMiddleware(duration = 300000) { // 默认5分钟
    return (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        
        const key = req.originalUrl;
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < duration) {
            console.log('从缓存返回:', key);
            return res.json(cached.data);
        }
        
        // 重写res.json方法以缓存响应
        const originalJson = res.json;
        res.json = function(data) {
            cache.set(key, {
                data,
                timestamp: Date.now()
            });
            originalJson.call(this, data);
        };
        
        next();
    };
}

// 使用中间件
app.use(logger({ format: 'json' }));
app.use(express.json());

// 公开路由
app.get('/', (req, res) => {
    res.json({ message: '欢迎使用API' });
});

// 需要认证的路由
app.get('/profile', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// 需要管理员权限的路由
app.get('/admin', authenticate, authorize(['admin']), (req, res) => {
    res.json({ message: '管理员面板' });
});

// 带缓存的路由
app.get('/data', cacheMiddleware(60000), (req, res) => {
    // 模拟耗时操作
    setTimeout(() => {
        res.json({
            data: '这是一些数据',
            timestamp: new Date().toISOString()
        });
    }, 1000);
});

app.listen(3002, () => {
    console.log('自定义中间件演示服务器运行在端口 3002');
});
```

## 6.3 路由系统

### 基本路由

```javascript
// routes-basic.js - 基本路由

const express = require('express');
const app = express();

app.use(express.json());

// 1. 基本HTTP方法路由
app.get('/users', (req, res) => {
    res.json({ message: 'GET /users' });
});

app.post('/users', (req, res) => {
    res.json({ message: 'POST /users', data: req.body });
});

app.put('/users/:id', (req, res) => {
    res.json({ 
        message: 'PUT /users/:id', 
        id: req.params.id, 
        data: req.body 
    });
});

app.delete('/users/:id', (req, res) => {
    res.json({ message: 'DELETE /users/:id', id: req.params.id });
});

// 2. 路由参数
app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    res.json({ userId: id });
});

// 多个参数
app.get('/users/:userId/posts/:postId', (req, res) => {
    const { userId, postId } = req.params;
    res.json({ userId, postId });
});

// 可选参数
app.get('/posts/:year/:month?', (req, res) => {
    const { year, month } = req.params;
    res.json({ year, month: month || 'all' });
});

// 3. 查询参数
app.get('/search', (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;
    res.json({
        query: q,
        page: parseInt(page),
        limit: parseInt(limit)
    });
});

// 4. 路由模式匹配
app.get('/files/*', (req, res) => {
    const filePath = req.params[0];
    res.json({ filePath });
});

// 正则表达式路由
app.get(/.*fly$/, (req, res) => {
    res.json({ message: '以fly结尾的路径' });
});

app.listen(3003, () => {
    console.log('基本路由演示服务器运行在端口 3003');
});
```

### 路由模块化

```javascript
// routes/users.js - 用户路由模块

const express = require('express');
const router = express.Router();

// 模拟数据
let users = [
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' }
];

// 路由级中间件
router.use((req, res, next) => {
    console.log('用户路由中间件');
    next();
});

// 获取所有用户
router.get('/', (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.json({
        data: paginatedUsers,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: users.length,
            totalPages: Math.ceil(users.length / limit)
        }
    });
});

// 获取单个用户
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const user = users.find(u => u.id === id);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ data: user });
});

// 创建用户
router.post('/', (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ 
            error: 'Name and email are required' 
        });
    }
    
    const newUser = {
        id: users.length + 1,
        name,
        email,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    res.status(201).json({ data: newUser });
});

// 更新用户
router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const { name, email } = req.body;
    users[userIndex] = {
        ...users[userIndex],
        name: name || users[userIndex].name,
        email: email || users[userIndex].email,
        updatedAt: new Date().toISOString()
    };
    
    res.json({ data: users[userIndex] });
});

// 删除用户
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const deletedUser = users.splice(userIndex, 1)[0];
    res.json({ 
        message: 'User deleted successfully',
        data: deletedUser 
    });
});

module.exports = router;
```

```javascript
// routes/posts.js - 文章路由模块

const express = require('express');
const router = express.Router();

let posts = [
    { id: 1, title: '第一篇文章', content: '内容1', authorId: 1 },
    { id: 2, title: '第二篇文章', content: '内容2', authorId: 2 }
];

// 获取所有文章
router.get('/', (req, res) => {
    const { authorId } = req.query;
    
    let filteredPosts = posts;
    if (authorId) {
        filteredPosts = posts.filter(p => p.authorId === parseInt(authorId));
    }
    
    res.json({ data: filteredPosts });
});

// 获取单篇文章
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const post = posts.find(p => p.id === id);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ data: post });
});

// 创建文章
router.post('/', (req, res) => {
    const { title, content, authorId } = req.body;
    
    if (!title || !content || !authorId) {
        return res.status(400).json({ 
            error: 'Title, content, and authorId are required' 
        });
    }
    
    const newPost = {
        id: posts.length + 1,
        title,
        content,
        authorId: parseInt(authorId),
        createdAt: new Date().toISOString()
    };
    
    posts.push(newPost);
    res.status(201).json({ data: newPost });
});

module.exports = router;
```

```javascript
// app-modular.js - 模块化应用

const express = require('express');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);

// 根路由
app.get('/', (req, res) => {
    res.json({
        message: '模块化Express应用',
        endpoints: {
            users: '/api/users',
            posts: '/api/posts'
        }
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

const PORT = 3004;
app.listen(PORT, () => {
    console.log(`模块化Express应用运行在端口 ${PORT}`);
});

module.exports = app;
```

## 本章小结

本章我们深入学习了：

1. **Express核心概念**：应用结构、配置和基本使用
2. **中间件机制**：应用级、路由级和自定义中间件
3. **路由系统**：基本路由、参数处理和模块化组织
4. **实际应用**：构建RESTful API和错误处理

## 练习题

1. 创建一个完整的博客API，包含用户、文章和评论功能
2. 实现一个文件上传和管理系统
3. 添加API文档和版本控制
4. 实现请求限流和安全中间件

## 下一章预告

下一章我们将学习数据库集成与ORM，了解如何在Express应用中使用数据库和Prisma ORM。

---

[上一章：HTTP服务器与网络编程](../chapter-05/README.md) | [返回目录](../README.md) | [下一章：数据库集成与ORM](../chapter-07/README.md)
