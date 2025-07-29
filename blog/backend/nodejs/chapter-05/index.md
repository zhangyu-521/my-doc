# 第5章：HTTP服务器与网络编程

## 本章目标

- 深入理解HTTP模块的使用
- 掌握创建HTTP服务器的方法
- 学会处理各种HTTP请求和响应
- 了解路由实现原理
- 掌握网络编程基础知识

## 5.1 HTTP模块深入

### 创建基本HTTP服务器

```javascript
// basic-server.js - 基本HTTP服务器

const http = require('http');
const url = require('url');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 解析URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 构建响应数据
    const responseData = {
        method: req.method,
        url: req.url,
        pathname: pathname,
        query: query,
        headers: req.headers,
        timestamp: new Date().toISOString()
    };
    
    // 发送响应
    res.statusCode = 200;
    res.end(JSON.stringify(responseData, null, 2));
});

// 监听端口
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 处理服务器错误
server.on('error', (err) => {
    console.error('服务器错误:', err);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
```

### 处理不同HTTP方法

```javascript
// http-methods.js - 处理不同HTTP方法

const http = require('http');
const url = require('url');
const querystring = require('querystring');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathname = parsedUrl.pathname;
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS预检请求
    if (method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    
    // 路由处理
    switch (method) {
        case 'GET':
            handleGet(req, res, parsedUrl);
            break;
        case 'POST':
            handlePost(req, res);
            break;
        case 'PUT':
            handlePut(req, res);
            break;
        case 'DELETE':
            handleDelete(req, res, parsedUrl);
            break;
        default:
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
});

// GET请求处理
function handleGet(req, res, parsedUrl) {
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    res.setHeader('Content-Type', 'application/json');
    
    if (pathname === '/api/users') {
        // 模拟用户列表
        const users = [
            { id: 1, name: '张三', email: 'zhangsan@example.com' },
            { id: 2, name: '李四', email: 'lisi@example.com' }
        ];
        
        res.statusCode = 200;
        res.end(JSON.stringify({ data: users, query }));
    } else if (pathname.startsWith('/api/users/')) {
        // 获取单个用户
        const userId = pathname.split('/')[3];
        const user = { id: userId, name: `用户${userId}`, email: `user${userId}@example.com` };
        
        res.statusCode = 200;
        res.end(JSON.stringify({ data: user }));
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
}

// POST请求处理
function handlePost(req, res) {
    let body = '';
    
    // 接收数据
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    // 数据接收完成
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            
            // 模拟创建用户
            const newUser = {
                id: Date.now(),
                name: data.name,
                email: data.email,
                createdAt: new Date().toISOString()
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 201;
            res.end(JSON.stringify({ 
                message: '用户创建成功', 
                data: newUser 
            }));
        } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
}

// PUT请求处理
function handlePut(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            
            // 模拟更新用户
            const updatedUser = {
                id: data.id,
                name: data.name,
                email: data.email,
                updatedAt: new Date().toISOString()
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ 
                message: '用户更新成功', 
                data: updatedUser 
            }));
        } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
}

// DELETE请求处理
function handleDelete(req, res, parsedUrl) {
    const pathname = parsedUrl.pathname;
    
    if (pathname.startsWith('/api/users/')) {
        const userId = pathname.split('/')[3];
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ 
            message: `用户 ${userId} 删除成功` 
        }));
    } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
}

server.listen(3001, () => {
    console.log('HTTP方法演示服务器运行在 http://localhost:3001');
});
```

## 5.2 请求与响应处理

### 处理请求体和文件上传

```javascript
// request-handling.js - 请求处理详解

const http = require('http');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // 需要安装: npm install uuid

// 解析multipart/form-data的简单实现
function parseMultipart(body, boundary) {
    const parts = body.split(`--${boundary}`);
    const files = [];
    const fields = {};
    
    for (let part of parts) {
        if (part.includes('Content-Disposition')) {
            const lines = part.split('\r\n');
            const dispositionLine = lines.find(line => line.includes('Content-Disposition'));
            
            if (dispositionLine.includes('filename=')) {
                // 文件上传
                const nameMatch = dispositionLine.match(/name="([^"]+)"/);
                const filenameMatch = dispositionLine.match(/filename="([^"]+)"/);
                
                if (nameMatch && filenameMatch) {
                    const fieldName = nameMatch[1];
                    const filename = filenameMatch[1];
                    
                    // 找到文件内容开始位置
                    const contentStart = part.indexOf('\r\n\r\n') + 4;
                    const content = part.substring(contentStart, part.length - 2);
                    
                    files.push({
                        fieldName,
                        filename,
                        content: Buffer.from(content, 'binary')
                    });
                }
            } else {
                // 普通字段
                const nameMatch = dispositionLine.match(/name="([^"]+)"/);
                if (nameMatch) {
                    const fieldName = nameMatch[1];
                    const contentStart = part.indexOf('\r\n\r\n') + 4;
                    const content = part.substring(contentStart, part.length - 2);
                    fields[fieldName] = content;
                }
            }
        }
    }
    
    return { fields, files };
}

const server = http.createServer((req, res) => {
    const contentType = req.headers['content-type'] || '';
    
    if (req.method === 'POST' && req.url === '/upload') {
        let body = [];
        
        req.on('data', chunk => {
            body.push(chunk);
        });
        
        req.on('end', () => {
            const buffer = Buffer.concat(body);
            
            if (contentType.includes('multipart/form-data')) {
                // 处理文件上传
                const boundary = contentType.split('boundary=')[1];
                const { fields, files } = parseMultipart(buffer.toString('binary'), boundary);
                
                // 保存上传的文件
                const uploadDir = './uploads';
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir);
                }
                
                const savedFiles = files.map(file => {
                    const filename = `${uuidv4()}-${file.filename}`;
                    const filepath = path.join(uploadDir, filename);
                    
                    fs.writeFileSync(filepath, file.content);
                    
                    return {
                        originalName: file.filename,
                        savedName: filename,
                        size: file.content.length,
                        path: filepath
                    };
                });
                
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                    message: '文件上传成功',
                    fields,
                    files: savedFiles
                }));
            } else if (contentType.includes('application/json')) {
                // 处理JSON数据
                try {
                    const data = JSON.parse(buffer.toString());
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                        message: '数据接收成功',
                        data
                    }));
                } catch (error) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            } else {
                // 处理其他类型数据
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                    message: '数据接收成功',
                    contentType,
                    size: buffer.length
                }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/') {
        // 返回上传表单
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>文件上传测试</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h1>文件上传测试</h1>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <div>
                    <label>姓名: <input type="text" name="name" required></label>
                </div>
                <div>
                    <label>邮箱: <input type="email" name="email" required></label>
                </div>
                <div>
                    <label>文件: <input type="file" name="file" required></label>
                </div>
                <div>
                    <button type="submit">上传</button>
                </div>
            </form>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        res.end(html);
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

server.listen(3002, () => {
    console.log('文件上传服务器运行在 http://localhost:3002');
});
```

### 响应不同类型的内容

```javascript
// response-types.js - 不同类型的响应

const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    const url = req.url;
    
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (url === '/json') {
        // JSON响应
        const data = {
            message: 'Hello JSON',
            timestamp: new Date().toISOString(),
            data: [1, 2, 3, 4, 5]
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(data));
        
    } else if (url === '/html') {
        // HTML响应
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Node.js HTML Response</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h1>Hello HTML</h1>
            <p>当前时间: ${new Date().toLocaleString()}</p>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        res.end(html);
        
    } else if (url === '/xml') {
        // XML响应
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <response>
            <message>Hello XML</message>
            <timestamp>${new Date().toISOString()}</timestamp>
        </response>`;
        
        res.setHeader('Content-Type', 'application/xml');
        res.statusCode = 200;
        res.end(xml);
        
    } else if (url === '/stream') {
        // 流式响应
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 200;
        
        let counter = 0;
        const interval = setInterval(() => {
            res.write(`数据块 ${counter++}\n`);
            
            if (counter > 10) {
                clearInterval(interval);
                res.end('流式响应结束\n');
            }
        }, 500);
        
    } else if (url === '/download') {
        // 文件下载
        const filename = 'example.txt';
        const content = '这是一个下载文件的示例内容\n包含多行文本\n用于演示文件下载功能';
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.statusCode = 200;
        res.end(content);
        
    } else if (url === '/redirect') {
        // 重定向
        res.statusCode = 302;
        res.setHeader('Location', '/html');
        res.end();
        
    } else if (url === '/error') {
        // 错误响应
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Internal Server Error',
            message: '这是一个模拟的服务器错误'
        }));
        
    } else {
        // 404响应
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Not Found',
            availableEndpoints: [
                '/json',
                '/html', 
                '/xml',
                '/stream',
                '/download',
                '/redirect',
                '/error'
            ]
        }));
    }
});

server.listen(3003, () => {
    console.log('响应类型演示服务器运行在 http://localhost:3003');
    console.log('可用端点:');
    console.log('- http://localhost:3003/json');
    console.log('- http://localhost:3003/html');
    console.log('- http://localhost:3003/xml');
    console.log('- http://localhost:3003/stream');
    console.log('- http://localhost:3003/download');
    console.log('- http://localhost:3003/redirect');
    console.log('- http://localhost:3003/error');
});
```

## 5.3 路由实现

### 简单路由系统

```javascript
// simple-router.js - 简单路由系统

const http = require('http');
const url = require('url');

class SimpleRouter {
    constructor() {
        this.routes = {
            GET: {},
            POST: {},
            PUT: {},
            DELETE: {}
        };
    }
    
    // 添加路由
    get(path, handler) {
        this.routes.GET[path] = handler;
    }
    
    post(path, handler) {
        this.routes.POST[path] = handler;
    }
    
    put(path, handler) {
        this.routes.PUT[path] = handler;
    }
    
    delete(path, handler) {
        this.routes.DELETE[path] = handler;
    }
    
    // 处理请求
    handle(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const method = req.method;
        const pathname = parsedUrl.pathname;
        
        // 查找精确匹配的路由
        if (this.routes[method] && this.routes[method][pathname]) {
            this.routes[method][pathname](req, res);
            return;
        }
        
        // 查找参数路由
        const paramRoute = this.findParamRoute(method, pathname);
        if (paramRoute) {
            req.params = paramRoute.params;
            paramRoute.handler(req, res);
            return;
        }
        
        // 404处理
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Route not found' }));
    }
    
    // 查找参数路由
    findParamRoute(method, pathname) {
        if (!this.routes[method]) return null;
        
        const pathSegments = pathname.split('/').filter(s => s);
        
        for (const route in this.routes[method]) {
            const routeSegments = route.split('/').filter(s => s);
            
            if (routeSegments.length !== pathSegments.length) continue;
            
            const params = {};
            let match = true;
            
            for (let i = 0; i < routeSegments.length; i++) {
                if (routeSegments[i].startsWith(':')) {
                    // 参数段
                    const paramName = routeSegments[i].substring(1);
                    params[paramName] = pathSegments[i];
                } else if (routeSegments[i] !== pathSegments[i]) {
                    // 不匹配
                    match = false;
                    break;
                }
            }
            
            if (match) {
                return {
                    handler: this.routes[method][route],
                    params
                };
            }
        }
        
        return null;
    }
}

// 创建路由器
const router = new SimpleRouter();

// 定义路由
router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Welcome to Simple Router' }));
});

router.get('/users', (req, res) => {
    const users = [
        { id: 1, name: '张三' },
        { id: 2, name: '李四' }
    ];
    
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: users }));
});

router.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    const user = { id: userId, name: `用户${userId}` };
    
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: user }));
});

router.post('/users', (req, res) => {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const userData = JSON.parse(body);
            const newUser = {
                id: Date.now(),
                ...userData,
                createdAt: new Date().toISOString()
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 201;
            res.end(JSON.stringify({ data: newUser }));
        } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
});

// 创建服务器
const server = http.createServer((req, res) => {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    
    router.handle(req, res);
});

server.listen(3004, () => {
    console.log('简单路由服务器运行在 http://localhost:3004');
});
```

## 本章小结

本章我们深入学习了：

1. **HTTP模块基础**：创建服务器、处理请求响应
2. **HTTP方法处理**：GET、POST、PUT、DELETE等方法的处理
3. **请求处理**：解析请求体、处理文件上传
4. **响应类型**：JSON、HTML、XML、流式响应等
5. **路由系统**：实现简单的路由匹配和参数提取

## 练习题

1. 实现一个支持中间件的路由系统
2. 创建一个文件服务器，支持静态文件访问
3. 实现一个简单的RESTful API
4. 添加请求日志和错误处理中间件

## 下一章预告

下一章我们将学习Express框架，了解如何使用这个流行的Web框架来简化Node.js Web开发。

---

[上一章：文件系统与流操作](../chapter-04/) | [返回目录](../) | [下一章：Express框架深度应用](../chapter-06/)
