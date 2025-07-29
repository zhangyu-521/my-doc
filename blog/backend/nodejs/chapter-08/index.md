# 第8章：认证授权与安全

## 本章目标

- 掌握JWT认证机制的实现
- 学会会话管理和状态维护
- 了解密码加密和验证最佳实践
- 掌握HTTPS配置和SSL证书使用
- 学习常见安全漏洞的防护方法

## 8.1 JWT认证机制

### JWT基础概念

JWT（JSON Web Token）是一种开放标准，用于在各方之间安全地传输信息。

```javascript
// auth/jwt.js - JWT工具类

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTAuth {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex');
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
        this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    }
    
    // 生成访问令牌
    generateAccessToken(payload) {
        return jwt.sign(payload, this.accessTokenSecret, {
            expiresIn: this.accessTokenExpiry,
            issuer: 'nodejs-tutorial',
            audience: 'nodejs-tutorial-users'
        });
    }
    
    // 生成刷新令牌
    generateRefreshToken(payload) {
        return jwt.sign(payload, this.refreshTokenSecret, {
            expiresIn: this.refreshTokenExpiry,
            issuer: 'nodejs-tutorial',
            audience: 'nodejs-tutorial-users'
        });
    }
    
    // 验证访问令牌
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.accessTokenSecret, {
                issuer: 'nodejs-tutorial',
                audience: 'nodejs-tutorial-users'
            });
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }
    
    // 验证刷新令牌
    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, this.refreshTokenSecret, {
                issuer: 'nodejs-tutorial',
                audience: 'nodejs-tutorial-users'
            });
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    
    // 生成令牌对
    generateTokenPair(payload) {
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);
        
        return {
            accessToken,
            refreshToken,
            expiresIn: this.accessTokenExpiry
        };
    }
    
    // 从请求头提取令牌
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        
        return authHeader.substring(7);
    }
}

module.exports = new JWTAuth();
```

### 认证中间件

```javascript
// middleware/auth.js - 认证中间件

const jwtAuth = require('../auth/jwt');
const prisma = require('../lib/prisma');

// 认证中间件
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = jwtAuth.extractTokenFromHeader(authHeader);
        
        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
        }
        
        const decoded = jwtAuth.verifyAccessToken(token);
        
        // 验证用户是否仍然存在且状态正常
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                role: true
            }
        });
        
        if (!user) {
            return res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        if (user.status !== 'ACTIVE') {
            return res.status(401).json({
                error: 'User account is not active',
                code: 'USER_INACTIVE'
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({
            error: 'Invalid access token',
            code: 'TOKEN_INVALID'
        });
    }
}

// 可选认证中间件
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = jwtAuth.extractTokenFromHeader(authHeader);
        
        if (token) {
            const decoded = jwtAuth.verifyAccessToken(token);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    role: true
                }
            });
            
            if (user && user.status === 'ACTIVE') {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // 可选认证失败时不阻止请求继续
        next();
    }
}

// 权限检查中间件
function authorize(roles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: req.user.role
            });
        }
        
        next();
    };
}

module.exports = {
    authenticate,
    optionalAuth,
    authorize
};
```

### 认证控制器

```javascript
// controllers/AuthController.js - 认证控制器

const bcrypt = require('bcrypt');
const jwtAuth = require('../auth/jwt');
const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');

class AuthController {
    // 用户注册
    static async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { name, email, password } = req.body;
            
            // 检查邮箱是否已存在
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            
            if (existingUser) {
                return res.status(409).json({
                    error: 'Email already registered',
                    code: 'EMAIL_EXISTS'
                });
            }
            
            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 12);
            
            // 创建用户
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    createdAt: true
                }
            });
            
            // 生成令牌
            const tokens = jwtAuth.generateTokenPair({
                userId: user.id,
                email: user.email,
                role: 'USER'
            });
            
            res.status(201).json({
                message: 'User registered successfully',
                user,
                tokens
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                error: 'Registration failed',
                message: error.message
            });
        }
    }
    
    // 用户登录
    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { email, password } = req.body;
            
            // 查找用户
            const user = await prisma.user.findUnique({
                where: { email }
            });
            
            if (!user) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }
            
            // 验证密码
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }
            
            // 检查用户状态
            if (user.status !== 'ACTIVE') {
                return res.status(401).json({
                    error: 'Account is not active',
                    code: 'ACCOUNT_INACTIVE'
                });
            }
            
            // 生成令牌
            const tokens = jwtAuth.generateTokenPair({
                userId: user.id,
                email: user.email,
                role: user.role || 'USER'
            });
            
            // 更新最后登录时间
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });
            
            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                message: 'Login successful',
                user: userWithoutPassword,
                tokens
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                error: 'Login failed',
                message: error.message
            });
        }
    }
    
    // 刷新令牌
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({
                    error: 'Refresh token required',
                    code: 'REFRESH_TOKEN_MISSING'
                });
            }
            
            const decoded = jwtAuth.verifyRefreshToken(refreshToken);
            
            // 验证用户
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    status: true,
                    role: true
                }
            });
            
            if (!user || user.status !== 'ACTIVE') {
                return res.status(401).json({
                    error: 'Invalid refresh token',
                    code: 'INVALID_REFRESH_TOKEN'
                });
            }
            
            // 生成新的令牌对
            const tokens = jwtAuth.generateTokenPair({
                userId: user.id,
                email: user.email,
                role: user.role || 'USER'
            });
            
            res.json({
                message: 'Token refreshed successfully',
                tokens
            });
        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
    }
    
    // 获取当前用户信息
    static async me(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    status: true,
                    role: true,
                    createdAt: true,
                    lastLoginAt: true,
                    profile: true
                }
            });
            
            res.json({
                user
            });
        } catch (error) {
            console.error('Get user info error:', error);
            res.status(500).json({
                error: 'Failed to get user information',
                message: error.message
            });
        }
    }
    
    // 修改密码
    static async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { currentPassword, newPassword } = req.body;
            
            // 获取用户当前密码
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });
            
            // 验证当前密码
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    error: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
            }
            
            // 加密新密码
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);
            
            // 更新密码
            await prisma.user.update({
                where: { id: req.user.id },
                data: { password: hashedNewPassword }
            });
            
            res.json({
                message: 'Password changed successfully'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                error: 'Failed to change password',
                message: error.message
            });
        }
    }
    
    // 登出（可选：如果使用令牌黑名单）
    static async logout(req, res) {
        try {
            // 在实际应用中，可以将令牌加入黑名单
            // 这里只是返回成功消息
            res.json({
                message: 'Logout successful'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                error: 'Logout failed',
                message: error.message
            });
        }
    }
}

module.exports = AuthController;
```

## 8.2 安全最佳实践

### 密码安全

```javascript
// utils/password.js - 密码安全工具

const bcrypt = require('bcrypt');
const crypto = require('crypto');

class PasswordSecurity {
    // 密码强度检查
    static checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            noCommonPatterns: !this.hasCommonPatterns(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        let strength = 'weak';
        if (score >= 5) strength = 'strong';
        else if (score >= 3) strength = 'medium';
        
        return {
            score,
            strength,
            checks,
            suggestions: this.getPasswordSuggestions(checks)
        };
    }
    
    // 检查常见模式
    static hasCommonPatterns(password) {
        const commonPatterns = [
            /123456/,
            /password/i,
            /qwerty/i,
            /abc123/i,
            /admin/i
        ];
        
        return commonPatterns.some(pattern => pattern.test(password));
    }
    
    // 获取密码建议
    static getPasswordSuggestions(checks) {
        const suggestions = [];
        
        if (!checks.length) suggestions.push('使用至少8个字符');
        if (!checks.lowercase) suggestions.push('包含小写字母');
        if (!checks.uppercase) suggestions.push('包含大写字母');
        if (!checks.numbers) suggestions.push('包含数字');
        if (!checks.symbols) suggestions.push('包含特殊字符');
        if (!checks.noCommonPatterns) suggestions.push('避免使用常见密码模式');
        
        return suggestions;
    }
    
    // 生成安全密码
    static generateSecurePassword(length = 12) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*(),.?":{}|<>';
        
        const allChars = lowercase + uppercase + numbers + symbols;
        let password = '';
        
        // 确保包含每种类型的字符
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        // 填充剩余长度
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        // 打乱字符顺序
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    
    // 安全哈希密码
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }
    
    // 验证密码
    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }
}

module.exports = PasswordSecurity;
```

### 安全中间件

```javascript
// middleware/security.js - 安全中间件

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss');

// 速率限制
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: message,
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: message,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.round(windowMs / 1000)
            });
        }
    });
};

// 通用速率限制
const generalLimiter = createRateLimit(
    15 * 60 * 1000, // 15分钟
    100, // 最多100个请求
    'Too many requests from this IP'
);

// 认证相关的严格限制
const authLimiter = createRateLimit(
    15 * 60 * 1000, // 15分钟
    5, // 最多5次尝试
    'Too many authentication attempts'
);

// CORS配置
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// XSS防护
const xssProtection = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key]);
            }
        });
    }
    next();
};

// 输入验证
const validateInput = (req, res, next) => {
    // 检查请求体大小
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (contentLength > maxSize) {
        return res.status(413).json({
            error: 'Request entity too large',
            code: 'PAYLOAD_TOO_LARGE'
        });
    }
    
    next();
};

// 安全头设置
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
});

module.exports = {
    generalLimiter,
    authLimiter,
    corsOptions,
    xssProtection,
    validateInput,
    securityHeaders
};
```

## 8.3 HTTPS配置

### SSL证书配置

```javascript
// server-https.js - HTTPS服务器配置

const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();

// 基本中间件
app.use(express.json());

// 强制HTTPS重定向中间件
const forceHTTPS = (req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
    next();
};

// 在生产环境中使用HTTPS重定向
if (process.env.NODE_ENV === 'production') {
    app.use(forceHTTPS);
}

// SSL证书配置
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'private-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'certificate.pem')),
    // 如果有中间证书
    // ca: fs.readFileSync(path.join(__dirname, 'ssl', 'ca-bundle.pem'))
};

// 基本路由
app.get('/', (req, res) => {
    res.json({
        message: 'HTTPS Server is running',
        secure: req.secure,
        protocol: req.protocol
    });
});

// 创建HTTPS服务器
const httpsServer = https.createServer(sslOptions, app);

// 创建HTTP服务器（用于重定向）
const httpApp = express();
httpApp.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
});
const httpServer = http.createServer(httpApp);

// 启动服务器
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const HTTP_PORT = process.env.HTTP_PORT || 80;

httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running on port ${HTTP_PORT} (redirecting to HTTPS)`);
});

module.exports = { app, httpsServer, httpServer };
```

## 本章小结

本章我们深入学习了：

1. **JWT认证**：令牌生成、验证和刷新机制
2. **认证中间件**：用户认证和权限控制
3. **密码安全**：加密、强度检查和安全存储
4. **安全防护**：XSS、CSRF、速率限制等
5. **HTTPS配置**：SSL证书和安全传输

## 练习题

1. 实现基于角色的权限控制系统
2. 添加双因素认证功能
3. 实现OAuth2.0第三方登录
4. 创建安全审计日志系统

## 下一章预告

下一章我们将学习测试与部署，了解如何编写测试、性能优化和生产环境部署。

---

[上一章：数据库集成与ORM](../chapter-07/) | [返回目录](../) | [下一章：测试与部署](../chapter-09/)
