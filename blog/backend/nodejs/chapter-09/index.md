# 第9章：测试与部署

## 本章目标

- 掌握单元测试和集成测试的编写
- 学会使用Jest测试框架
- 了解性能监控和优化方法
- 掌握Docker容器化部署
- 学习生产环境配置和CI/CD流程

## 9.1 单元测试与集成测试

### Jest测试框架配置

```javascript
// jest.config.js - Jest配置文件

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/config/**',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 10000,
    verbose: true
};
```

### 测试环境设置

```javascript
// tests/setup.js - 测试环境设置

const { PrismaClient } = require('@prisma/client');

// 创建测试数据库客户端
global.prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.TEST_DATABASE_URL
        }
    }
});

// 测试前清理数据库
beforeEach(async () => {
    await global.prisma.comment.deleteMany();
    await global.prisma.post.deleteMany();
    await global.prisma.user.deleteMany();
});

// 测试后关闭数据库连接
afterAll(async () => {
    await global.prisma.$disconnect();
});

// 全局测试工具函数
global.createTestUser = async (userData = {}) => {
    const bcrypt = require('bcrypt');
    
    const defaultUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        status: 'ACTIVE'
    };
    
    return await global.prisma.user.create({
        data: { ...defaultUser, ...userData }
    });
};

global.createTestPost = async (postData = {}, authorId) => {
    const defaultPost = {
        title: 'Test Post',
        content: 'This is a test post content',
        excerpt: 'Test excerpt',
        status: 'PUBLISHED',
        authorId: authorId || (await createTestUser()).id
    };
    
    return await global.prisma.post.create({
        data: { ...defaultPost, ...postData }
    });
};
```

### 单元测试示例

```javascript
// tests/unit/services/UserService.test.js - 用户服务单元测试

const UserService = require('../../../src/services/UserService');
const bcrypt = require('bcrypt');

describe('UserService', () => {
    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            };
            
            const user = await UserService.createUser(userData);
            
            expect(user).toHaveProperty('id');
            expect(user.name).toBe(userData.name);
            expect(user.email).toBe(userData.email);
            expect(user).not.toHaveProperty('password');
            expect(user.status).toBe('ACTIVE');
        });
        
        it('should throw error if email already exists', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            };
            
            // 创建第一个用户
            await UserService.createUser(userData);
            
            // 尝试创建相同邮箱的用户
            await expect(UserService.createUser(userData))
                .rejects
                .toThrow('邮箱已被使用');
        });
        
        it('should hash password correctly', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            };
            
            await UserService.createUser(userData);
            
            const userInDb = await global.prisma.user.findUnique({
                where: { email: userData.email }
            });
            
            expect(userInDb.password).not.toBe(userData.password);
            
            const isPasswordValid = await bcrypt.compare(
                userData.password,
                userInDb.password
            );
            expect(isPasswordValid).toBe(true);
        });
    });
    
    describe('getUserById', () => {
        it('should return user with posts and stats', async () => {
            const testUser = await createTestUser();
            await createTestPost({}, testUser.id);
            await createTestPost({}, testUser.id);
            
            const user = await UserService.getUserById(testUser.id);
            
            expect(user).toHaveProperty('id', testUser.id);
            expect(user).toHaveProperty('posts');
            expect(user).toHaveProperty('_count');
            expect(user._count.posts).toBe(2);
            expect(user).not.toHaveProperty('password');
        });
        
        it('should throw error if user not found', async () => {
            await expect(UserService.getUserById(999))
                .rejects
                .toThrow('用户不存在');
        });
    });
    
    describe('authenticateUser', () => {
        it('should authenticate user with correct credentials', async () => {
            const password = 'password123';
            const testUser = await createTestUser({
                email: 'auth@example.com',
                password: await bcrypt.hash(password, 10)
            });
            
            const user = await UserService.authenticateUser('auth@example.com', password);
            
            expect(user).toHaveProperty('id', testUser.id);
            expect(user).not.toHaveProperty('password');
        });
        
        it('should throw error with incorrect password', async () => {
            const testUser = await createTestUser({
                email: 'auth@example.com'
            });
            
            await expect(UserService.authenticateUser('auth@example.com', 'wrongpassword'))
                .rejects
                .toThrow('密码错误');
        });
        
        it('should throw error if user not found', async () => {
            await expect(UserService.authenticateUser('nonexistent@example.com', 'password'))
                .rejects
                .toThrow('用户不存在');
        });
    });
});
```

### 集成测试示例

```javascript
// tests/integration/auth.test.js - 认证集成测试

const request = require('supertest');
const app = require('../../src/app');

describe('Authentication Integration Tests', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const userData = {
                name: 'Integration Test User',
                email: 'integration@example.com',
                password: 'password123'
            };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            expect(response.body).toHaveProperty('message', 'User registered successfully');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('tokens');
            expect(response.body.user.email).toBe(userData.email);
            expect(response.body.tokens).toHaveProperty('accessToken');
            expect(response.body.tokens).toHaveProperty('refreshToken');
        });
        
        it('should return validation errors for invalid data', async () => {
            const invalidData = {
                name: '',
                email: 'invalid-email',
                password: '123'
            };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);
            
            expect(response.body).toHaveProperty('error', 'Validation failed');
            expect(response.body).toHaveProperty('details');
            expect(Array.isArray(response.body.details)).toBe(true);
        });
    });
    
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // 创建测试用户
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Login Test User',
                    email: 'login@example.com',
                    password: 'password123'
                });
        });
        
        it('should login with correct credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123'
                })
                .expect(200);
            
            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('tokens');
        });
        
        it('should reject incorrect credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                })
                .expect(401);
            
            expect(response.body).toHaveProperty('error', 'Invalid credentials');
        });
    });
    
    describe('Protected Routes', () => {
        let accessToken;
        
        beforeEach(async () => {
            // 注册并获取token
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Protected Test User',
                    email: 'protected@example.com',
                    password: 'password123'
                });
            
            accessToken = response.body.tokens.accessToken;
        });
        
        it('should access protected route with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe('protected@example.com');
        });
        
        it('should reject access without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);
            
            expect(response.body).toHaveProperty('error', 'Access token required');
        });
        
        it('should reject access with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            
            expect(response.body).toHaveProperty('error', 'Invalid access token');
        });
    });
});
```

## 9.2 性能监控与优化

### 性能监控中间件

```javascript
// middleware/performance.js - 性能监控中间件

const os = require('os');
const process = require('process');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            totalResponseTime: 0,
            errors: 0,
            activeConnections: 0
        };
        
        this.startTime = Date.now();
    }
    
    // 请求监控中间件
    requestMonitor() {
        return (req, res, next) => {
            const startTime = Date.now();
            this.metrics.requests++;
            this.metrics.activeConnections++;
            
            // 监听响应结束
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.metrics.totalResponseTime += responseTime;
                this.metrics.activeConnections--;
                
                if (res.statusCode >= 400) {
                    this.metrics.errors++;
                }
                
                // 记录慢请求
                if (responseTime > 1000) {
                    console.warn(`Slow request: ${req.method} ${req.url} - ${responseTime}ms`);
                }
            });
            
            next();
        };
    }
    
    // 获取系统指标
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            system: {
                uptime: process.uptime(),
                loadAverage: os.loadavg(),
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                cpuCount: os.cpus().length
            },
            process: {
                pid: process.pid,
                memory: {
                    rss: memUsage.rss,
                    heapTotal: memUsage.heapTotal,
                    heapUsed: memUsage.heapUsed,
                    external: memUsage.external
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                }
            }
        };
    }
    
    // 获取应用指标
    getAppMetrics() {
        const uptime = Date.now() - this.startTime;
        const avgResponseTime = this.metrics.requests > 0 
            ? this.metrics.totalResponseTime / this.metrics.requests 
            : 0;
        
        return {
            uptime,
            requests: {
                total: this.metrics.requests,
                errors: this.metrics.errors,
                errorRate: this.metrics.requests > 0 
                    ? (this.metrics.errors / this.metrics.requests) * 100 
                    : 0,
                averageResponseTime: avgResponseTime,
                activeConnections: this.metrics.activeConnections
            }
        };
    }
    
    // 获取完整指标
    getAllMetrics() {
        return {
            timestamp: new Date().toISOString(),
            system: this.getSystemMetrics(),
            application: this.getAppMetrics()
        };
    }
    
    // 健康检查
    healthCheck() {
        const metrics = this.getAllMetrics();
        const memoryUsagePercent = (metrics.system.process.memory.heapUsed / metrics.system.process.memory.heapTotal) * 100;
        const errorRate = metrics.application.requests.errorRate;
        
        const status = {
            status: 'healthy',
            checks: {
                memory: memoryUsagePercent < 90 ? 'healthy' : 'unhealthy',
                errorRate: errorRate < 5 ? 'healthy' : 'unhealthy',
                responseTime: metrics.application.requests.averageResponseTime < 1000 ? 'healthy' : 'unhealthy'
            }
        };
        
        if (Object.values(status.checks).includes('unhealthy')) {
            status.status = 'unhealthy';
        }
        
        return {
            ...status,
            metrics
        };
    }
}

module.exports = PerformanceMonitor;
```

## 9.3 Docker部署

### Dockerfile

```dockerfile
# Dockerfile - 多阶段构建

# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 生成Prisma客户端
RUN npx prisma generate

# 运行阶段
FROM node:18-alpine AS runner

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY . .

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["npm", "start"]
```

### Docker Compose配置

```yaml
# docker-compose.yml - 完整的应用栈

version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://user:password@db:3306/nodejs_tutorial
      - JWT_ACCESS_SECRET=your-access-secret
      - JWT_REFRESH_SECRET=your-refresh-secret
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=nodejs_tutorial
      - MYSQL_USER=user
      - MYSQL_PASSWORD=password
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  db_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 生产环境配置

```javascript
// config/production.js - 生产环境配置

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0'
    },
    
    database: {
        url: process.env.DATABASE_URL,
        pool: {
            min: 2,
            max: 10,
            acquire: 30000,
            idle: 10000
        },
        logging: false
    },
    
    redis: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
    },
    
    security: {
        jwt: {
            accessSecret: process.env.JWT_ACCESS_SECRET,
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            accessExpiry: '15m',
            refreshExpiry: '7d'
        },
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
            credentials: true
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            max: 100
        }
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        transports: [
            {
                type: 'file',
                filename: 'logs/app.log',
                maxsize: 10485760, // 10MB
                maxFiles: 5
            },
            {
                type: 'console',
                colorize: false
            }
        ]
    },
    
    monitoring: {
        enabled: true,
        metricsPath: '/metrics',
        healthPath: '/health'
    }
};
```

## 9.4 CI/CD流程

### GitHub Actions配置

```yaml
# .github/workflows/ci-cd.yml - CI/CD流程

name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm test
      env:
        TEST_DATABASE_URL: mysql://root:rootpassword@localhost:3306/test_db
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myapp/nodejs-tutorial:latest
          myapp/nodejs-tutorial:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/nodejs-tutorial
          docker-compose pull
          docker-compose up -d
          docker system prune -f
```

## 本章小结

本章我们深入学习了：

1. **测试框架**：Jest配置、单元测试和集成测试
2. **性能监控**：指标收集、健康检查和性能优化
3. **Docker部署**：容器化、多服务编排和生产配置
4. **CI/CD流程**：自动化测试、构建和部署

## 练习题

1. 编写完整的API测试套件
2. 实现性能基准测试
3. 配置监控和告警系统
4. 设置蓝绿部署策略

## 教程总结

通过本教程的学习，您已经掌握了：

- Node.js核心概念和异步编程
- 模块系统和包管理
- 文件系统和流操作
- HTTP服务器和Express框架
- 数据库集成和ORM使用
- 认证授权和安全防护
- 测试和生产环境部署

继续实践和探索，您将成为一名优秀的Node.js开发者！

---

[上一章：认证授权与安全](../chapter-08/) | [返回目录](../)
