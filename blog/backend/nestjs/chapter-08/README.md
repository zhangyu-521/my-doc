# 第8章：部署与优化

## 🎯 本章目标

在这一章中，我们将：
- 配置 Docker 容器化部署
- 设置 CI/CD 流水线
- 实现生产环境配置
- 进行性能优化
- 配置监控和日志
- 实现缓存策略
- 设置负载均衡和高可用

## 🐳 Docker 容器化

### 1. Dockerfile 配置

```dockerfile
# Dockerfile
# 使用多阶段构建优化镜像大小
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制构建产物和依赖
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# 创建上传目录
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "dist/main"]
```

### 2. Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 应用服务
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://nestjs:password@db:3306/blog_prod
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network

  # 数据库服务
  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=blog_prod
      - MYSQL_USER=nestjs
      - MYSQL_PASSWORD=password
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    restart: unless-stopped
    networks:
      - app-network

  # Redis 缓存服务
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

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
      - uploads:/var/www/uploads
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  db_data:
  redis_data:
  uploads:
  logs:

networks:
  app-network:
    driver: bridge
```

### 3. 开发环境 Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"  # 调试端口
    environment:
      - NODE_ENV=development
      - DATABASE_URL=mysql://nestjs:password@db:3306/blog_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
      - uploads:/app/uploads
    depends_on:
      - db
      - redis
    networks:
      - app-network

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=blog_dev
      - MYSQL_USER=nestjs
      - MYSQL_PASSWORD=password
    ports:
      - "3306:3306"
    volumes:
      - db_dev_data:/var/lib/mysql
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - app-network

volumes:
  db_dev_data:
  uploads:

networks:
  app-network:
    driver: bridge
```

### 4. 开发环境 Dockerfile

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

# 安装开发工具
RUN apk add --no-cache curl

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括开发依赖）
RUN npm install

# 生成 Prisma 客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000 9229

# 启动开发服务器
CMD ["npm", "run", "start:dev"]
```

## ⚙️ Nginx 配置

### 1. Nginx 主配置

```nginx
# docker/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基本设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 上游服务器
    upstream nestjs_backend {
        server app:3000;
        keepalive 32;
    }

    # 限流配置
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    server {
        listen 80;
        server_name localhost;

        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name localhost;

        # SSL 配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # API 路由
        location /api {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://nestjs_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        # 登录接口特殊限流
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://nestjs_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 静态文件服务
        location /uploads {
            alias /var/www/uploads;
            expires 1y;
            add_header Cache-Control "public, immutable";
            
            # 图片优化
            location ~* \.(jpg|jpeg|png|gif|webp)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
                add_header Vary Accept;
            }
        }

        # API 文档
        location /api-docs {
            proxy_pass http://nestjs_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 健康检查
        location /health {
            proxy_pass http://nestjs_backend;
            access_log off;
        }

        # 默认路由
        location / {
            return 404;
        }
    }
}
```

## 🚀 CI/CD 流水线

### 1. GitHub Actions 配置

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码质量检查
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: blog_test
          MYSQL_USER: nestjs
          MYSQL_PASSWORD: password
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Generate Prisma client
      run: npx prisma generate

    - name: Run database migrations
      run: npx prisma migrate deploy
      env:
        DATABASE_URL: mysql://nestjs:password@localhost:3306/blog_test

    - name: Lint code
      run: npm run lint

    - name: Run unit tests
      run: npm run test:cov
      env:
        DATABASE_URL: mysql://nestjs:password@localhost:3306/blog_test
        REDIS_URL: redis://localhost:6379

    - name: Run integration tests
      run: npm run test:e2e
      env:
        DATABASE_URL: mysql://nestjs:password@localhost:3306/blog_test
        REDIS_URL: redis://localhost:6379

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

  # 安全扫描
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  # 构建和推送 Docker 镜像
  build-and-push:
    needs: [lint-and-test, security-scan]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    permissions:
      contents: read
      packages: write

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  # 部署到生产环境
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USER }}
        key: ${{ secrets.PROD_SSH_KEY }}
        script: |
          cd /opt/blog-app
          docker-compose pull
          docker-compose up -d --remove-orphans
          docker system prune -f
```

### 2. 部署脚本

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 开始部署..."

# 检查环境变量
if [ -z "$ENVIRONMENT" ]; then
    echo "❌ 请设置 ENVIRONMENT 环境变量"
    exit 1
fi

# 设置变量
COMPOSE_FILE="docker-compose.yml"
if [ "$ENVIRONMENT" = "staging" ]; then
    COMPOSE_FILE="docker-compose.staging.yml"
fi

echo "📦 拉取最新镜像..."
docker-compose -f $COMPOSE_FILE pull

echo "🔄 更新服务..."
docker-compose -f $COMPOSE_FILE up -d --remove-orphans

echo "🧹 清理旧镜像..."
docker image prune -f

echo "🔍 检查服务状态..."
docker-compose -f $COMPOSE_FILE ps

echo "✅ 部署完成！"

# 健康检查
echo "🏥 执行健康检查..."
sleep 10
if curl -f http://localhost/health; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    exit 1
fi
```

### 3. 数据库迁移脚本

```bash
#!/bin/bash
# scripts/migrate.sh

set -e

echo "🗄️ 开始数据库迁移..."

# 检查数据库连接
echo "🔍 检查数据库连接..."
if ! docker-compose exec db mysqladmin ping -h localhost --silent; then
    echo "❌ 数据库连接失败"
    exit 1
fi

# 备份数据库
echo "💾 备份数据库..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec db mysqldump -u root -p$MYSQL_ROOT_PASSWORD blog_prod > backups/$BACKUP_FILE
echo "✅ 数据库备份完成: $BACKUP_FILE"

# 运行迁移
echo "🔄 运行数据库迁移..."
docker-compose exec app npx prisma migrate deploy

# 验证迁移
echo "🔍 验证迁移结果..."
docker-compose exec app npx prisma migrate status

echo "✅ 数据库迁移完成！"
```

## 🔧 生产环境配置

### 1. 生产环境变量

```bash
# .env.production
NODE_ENV=production

# 应用配置
APP_PORT=3000
APP_URL=https://api.yourdomain.com

# 数据库配置
DATABASE_URL=mysql://nestjs:${DB_PASSWORD}@db:3306/blog_prod

# Redis 配置
REDIS_URL=redis://redis:6379

# JWT 配置
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# 邮件配置
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=${MAIL_USER}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_FROM=noreply@yourdomain.com

# 文件上传配置
UPLOAD_PATH=/app/uploads
UPLOAD_MAX_SIZE=10485760

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs

# 监控配置
SENTRY_DSN=${SENTRY_DSN}
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# 缓存配置
CACHE_TTL=300
CACHE_MAX_ITEMS=1000

# 限流配置
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# CORS 配置
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true
```

### 2. 生产环境配置类

```typescript
// src/config/production.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('production', () => ({
  // 性能配置
  performance: {
    enableCompression: true,
    enableCaching: true,
    cacheMaxAge: parseInt(process.env.CACHE_MAX_AGE) || 3600,
    enableCluster: process.env.ENABLE_CLUSTER === 'true',
    workerProcesses: parseInt(process.env.WORKER_PROCESSES) || require('os').cpus().length,
  },

  // 安全配置
  security: {
    enableHelmet: true,
    enableCors: true,
    enableRateLimit: true,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15分钟
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    enableCsrf: process.env.ENABLE_CSRF === 'true',
    trustProxy: process.env.TRUST_PROXY === 'true',
  },

  // 监控配置
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableTracing: process.env.ENABLE_TRACING === 'true',
    enableHealthCheck: true,
    metricsPath: process.env.METRICS_PATH || '/metrics',
    healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: true,
    enableConsoleLogging: true,
    logFilePath: process.env.LOG_FILE_PATH || './logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
  },

  // 数据库配置
  database: {
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
    timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
    enableLogging: process.env.DB_ENABLE_LOGGING === 'true',
  },

  // 缓存配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300,
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS) || 1000,
    enableRedis: process.env.ENABLE_REDIS_CACHE === 'true',
  },
}));
```

### 3. 健康检查服务

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务健康' })
  @ApiResponse({ status: 503, description: '服务不健康' })
  @HealthCheck()
  check() {
    return this.health.check([
      // 数据库健康检查
      () => this.prismaHealth.isHealthy('database'),

      // Redis 健康检查
      () => this.redisHealth.isHealthy('redis'),

      // 内存使用检查
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),

      // 磁盘空间检查
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9,
      }),
    ]);
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: '就绪检查' })
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: '存活检查' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
```

### 4. Prisma 健康检查指示器

```typescript
// src/health/prisma-health.indicator.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Prisma check failed', this.getStatus(key, false));
    }
  }
}
```

### 5. Redis 健康检查指示器

```typescript
// src/health/redis-health.indicator.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    super();
    this.redis = new Redis(this.configService.get('redis.url'));
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false));
    }
  }
}
```

## ⚡ 性能优化

### 1. 缓存策略实现

```typescript
// src/cache/redis-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis(this.configService.get('redis.url'), {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }
}
```

### 2. 数据库查询优化

```typescript
// src/common/decorators/cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

export const CacheResult = (key: string, ttl: number = 300) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyName, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyName, descriptor);
  };
};
```

```typescript
// src/common/interceptors/cache-result.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator';

@Injectable()
export class CacheResultInterceptor implements NestInterceptor {
  constructor(
    private cacheService: RedisCacheService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    const cacheTTL = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const fullCacheKey = this.generateCacheKey(cacheKey, request);

    // 尝试从缓存获取
    const cachedResult = await this.cacheService.get(fullCacheKey);
    if (cachedResult) {
      return of(cachedResult);
    }

    // 执行原方法并缓存结果
    return next.handle().pipe(
      tap(async (result) => {
        await this.cacheService.set(fullCacheKey, result, cacheTTL);
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const { method, url, query, params, user } = request;
    const userId = user?.id || 'anonymous';
    const queryString = JSON.stringify(query);
    const paramsString = JSON.stringify(params);
    return `${baseKey}:${method}:${url}:${userId}:${queryString}:${paramsString}`;
  }
}
```

### 3. 数据库连接池优化

```typescript
// src/prisma/prisma.service.ts (优化版本)
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('database.url'),
        },
      },
      log: configService.get('database.enableLogging')
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });

    // 查询性能监控
    this.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();

      const duration = after - before;
      if (duration > 1000) { // 超过1秒的慢查询
        this.logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
      }

      return result;
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // 批量操作优化
  async batchCreate<T>(model: string, data: any[]): Promise<T[]> {
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResult = await (this as any)[model].createMany({
        data: batch,
        skipDuplicates: true,
      });
      results.push(batchResult);
    }

    return results;
  }

  // 事务优化
  async executeTransaction<T>(operations: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(operations, {
      maxWait: 5000, // 最大等待时间
      timeout: 10000, // 事务超时时间
    });
  }
}
```

### 4. 响应压缩和静态资源优化

```typescript
// src/main.ts (生产环境优化)
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as compression from 'compression';
import helmet from 'helmet';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // 安全中间件
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // 启用压缩
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // 只压缩大于1KB的响应
  }));

  // CORS 配置
  app.enableCors({
    origin: configService.get('cors.origin'),
    credentials: configService.get('cors.credentials'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 信任代理
  if (configService.get('production.security.trustProxy')) {
    app.set('trust proxy', 1);
  }

  // Swagger 配置（仅在非生产环境）
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NestJS 博客 API')
      .setDescription('API 文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  const port = configService.get('app.port');
  await app.listen(port, '0.0.0.0');

  logger.log(`应用运行在端口 ${port}`);
  logger.log(`环境: ${process.env.NODE_ENV}`);
  logger.log(`内存使用: ${JSON.stringify(process.memoryUsage())}`);
}

bootstrap().catch((error) => {
  console.error('应用启动失败:', error);
  process.exit(1);
});
```

### 5. 集群模式配置

```typescript
// src/cluster.ts
import cluster from 'cluster';
import * as os from 'os';
import { Logger } from '@nestjs/common';

const logger = new Logger('Cluster');
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  logger.log(`Master process ${process.pid} is running`);
  logger.log(`Starting ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.log('Starting a new worker...');
    cluster.fork();
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    logger.log('Master received SIGTERM, shutting down gracefully');

    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }

    setTimeout(() => {
      logger.log('Forcing shutdown');
      process.exit(0);
    }, 10000);
  });

} else {
  // Worker process
  require('./main');
  logger.log(`Worker ${process.pid} started`);
}
```

### 6. 内存和性能监控

```typescript
// src/monitoring/performance.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as os from 'os';

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  @Cron(CronExpression.EVERY_MINUTE)
  logSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const systemLoad = os.loadavg();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();

    const metrics = {
      timestamp: new Date().toISOString(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      system: {
        loadAverage: systemLoad,
        freeMemory: Math.round(freeMemory / 1024 / 1024), // MB
        totalMemory: Math.round(totalMemory / 1024 / 1024), // MB
        memoryUsagePercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
      },
      uptime: process.uptime(),
    };

    // 记录警告级别的指标
    if (metrics.memory.heapUsed > 500) { // 超过500MB
      this.logger.warn(`High memory usage: ${metrics.memory.heapUsed}MB`);
    }

    if (metrics.system.memoryUsagePercent > 80) { // 系统内存使用超过80%
      this.logger.warn(`High system memory usage: ${metrics.system.memoryUsagePercent}%`);
    }

    if (metrics.system.loadAverage[0] > os.cpus().length) { // 负载超过CPU核心数
      this.logger.warn(`High system load: ${metrics.system.loadAverage[0]}`);
    }

    // 在开发环境下记录详细指标
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug('System metrics:', JSON.stringify(metrics, null, 2));
    }
  }

  getMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: memoryUsage,
      cpu: cpuUsage,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}
```

## 📊 监控和日志系统

### 1. Prometheus 指标收集

```typescript
// src/monitoring/prometheus.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  private readonly activeConnections = new Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
  });

  private readonly databaseConnections = new Gauge({
    name: 'database_connections',
    help: 'Number of database connections',
  });

  private readonly cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  });

  private readonly cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  });

  constructor() {
    // 注册默认指标
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.databaseConnections);
    register.registerMetric(this.cacheHits);
    register.registerMetric(this.cacheMisses);
  }

  incrementHttpRequests(method: string, route: string, statusCode: number) {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
  }

  observeHttpRequestDuration(method: string, route: string, duration: number) {
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  incrementCacheHits(cacheType: string) {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  incrementCacheMisses(cacheType: string) {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  getMetrics() {
    return register.metrics();
  }
}
```

### 2. 监控中间件

```typescript
// src/common/middleware/monitoring.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrometheusService } from '../../monitoring/prometheus.service';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(private prometheusService: PrometheusService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;

      this.prometheusService.incrementHttpRequests(
        req.method,
        route,
        res.statusCode,
      );

      this.prometheusService.observeHttpRequestDuration(
        req.method,
        route,
        duration,
      );
    });

    next();
  }
}
```

### 3. 结构化日志服务

```typescript
// src/logging/winston-logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    this.createLogger();
  }

  private createLogger() {
    const logLevel = this.configService.get('logging.level');
    const logPath = this.configService.get('logging.logFilePath');
    const maxFiles = this.configService.get('logging.maxFiles');
    const maxSize = this.configService.get('logging.maxSize');

    const transports: winston.transport[] = [];

    // 控制台输出
    if (this.configService.get('logging.enableConsoleLogging')) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, trace }) => {
              return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
            }),
          ),
        }),
      );
    }

    // 文件输出
    if (this.configService.get('logging.enableFileLogging')) {
      // 错误日志
      transports.push(
        new DailyRotateFile({
          filename: `${logPath}/error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles,
          maxSize,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      // 应用日志
      transports.push(
        new DailyRotateFile({
          filename: `${logPath}/app-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxFiles,
          maxSize,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      // 访问日志
      transports.push(
        new DailyRotateFile({
          filename: `${logPath}/access-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          maxFiles,
          maxSize,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

### 4. 错误追踪服务 (Sentry)

```typescript
// src/monitoring/sentry.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

@Injectable()
export class SentryService {
  constructor(private configService: ConfigService) {
    this.initSentry();
  }

  private initSentry() {
    const dsn = this.configService.get('sentry.dsn');
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      integrations: [
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      beforeSend(event) {
        // 过滤敏感信息
        if (event.request?.data) {
          delete event.request.data.password;
          delete event.request.data.token;
        }
        return event;
      },
    });
  }

  captureException(error: Error, context?: any) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }

  setUser(user: { id: string; email?: string; username?: string }) {
    Sentry.setUser(user);
  }

  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }
}
```

### 5. 全局异常过滤器 (增强版)

```typescript
// src/common/filters/all-exceptions.filter.ts (增强版)
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { SentryService } from '../../monitoring/sentry.service';
import { WinstonLoggerService } from '../../logging/winston-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private sentryService: SentryService,
    private winstonLogger: WinstonLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    // HTTP 异常处理
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        code = (exceptionResponse as any).code || 'HTTP_ERROR';
      }
    }
    // Prisma 错误处理
    else if (exception instanceof PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      code = prismaError.code;
    }
    // 其他错误
    else if (exception instanceof Error) {
      message = exception.message;
      code = 'UNKNOWN_ERROR';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // 记录错误日志
    const logContext = {
      statusCode: status,
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.id,
    };

    if (status >= 500) {
      this.winstonLogger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        'AllExceptionsFilter',
      );

      // 发送到 Sentry
      this.sentryService.captureException(
        exception instanceof Error ? exception : new Error(String(exception)),
        logContext,
      );
    } else {
      this.winstonLogger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
        'AllExceptionsFilter',
      );
    }

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(error: PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: '数据已存在',
          code: 'DUPLICATE_ERROR',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: '记录不存在',
          code: 'NOT_FOUND',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: '外键约束失败',
          code: 'FOREIGN_KEY_ERROR',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '数据库操作失败',
          code: 'DATABASE_ERROR',
        };
    }
  }
}
```

### 6. 监控仪表板配置

```yaml
# docker/grafana/dashboard.json
{
  "dashboard": {
    "id": null,
    "title": "NestJS 应用监控",
    "tags": ["nestjs", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "HTTP 请求总数",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "请求/秒"
          }
        ]
      },
      {
        "id": 2,
        "title": "HTTP 请求延迟",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "内存使用情况",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes",
            "legendFormat": "RSS Memory"
          },
          {
            "expr": "nodejs_heap_size_used_bytes",
            "legendFormat": "Heap Used"
          }
        ]
      },
      {
        "id": 4,
        "title": "数据库连接",
        "type": "stat",
        "targets": [
          {
            "expr": "database_connections",
            "legendFormat": "连接数"
          }
        ]
      },
      {
        "id": 5,
        "title": "缓存命中率",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) * 100",
            "legendFormat": "命中率 %"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

## 🚀 完整部署流程

### 1. 生产环境部署脚本

```bash
#!/bin/bash
# scripts/production-deploy.sh

set -e

echo "🚀 开始生产环境部署..."

# 检查必要的环境变量
required_vars=("JWT_SECRET" "JWT_REFRESH_SECRET" "DB_PASSWORD" "MAIL_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 环境变量 $var 未设置"
        exit 1
    fi
done

# 创建必要的目录
echo "📁 创建目录结构..."
mkdir -p /opt/blog-app/{logs,uploads,backups,ssl}
mkdir -p /opt/blog-app/docker/{nginx,mysql}

# 设置权限
chown -R 1001:1001 /opt/blog-app/uploads
chown -R 1001:1001 /opt/blog-app/logs

# 复制配置文件
echo "📋 复制配置文件..."
cp docker/nginx/nginx.conf /opt/blog-app/docker/nginx/
cp docker/mysql/init.sql /opt/blog-app/docker/mysql/
cp .env.production /opt/blog-app/.env

# 生成 SSL 证书（如果不存在）
if [ ! -f "/opt/blog-app/ssl/cert.pem" ]; then
    echo "🔐 生成 SSL 证书..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /opt/blog-app/ssl/key.pem \
        -out /opt/blog-app/ssl/cert.pem \
        -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
fi

# 拉取最新镜像
echo "📦 拉取 Docker 镜像..."
cd /opt/blog-app
docker-compose pull

# 数据库备份
if docker-compose ps db | grep -q "Up"; then
    echo "💾 备份数据库..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T db mysqldump -u root -p$MYSQL_ROOT_PASSWORD blog_prod > backups/$BACKUP_FILE
    echo "✅ 数据库备份完成: $BACKUP_FILE"
fi

# 启动服务
echo "🔄 启动服务..."
docker-compose up -d --remove-orphans

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
docker-compose exec app npx prisma migrate deploy

# 健康检查
echo "🏥 执行健康检查..."
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost/health; then
        echo "✅ 健康检查通过"
        break
    else
        echo "⏳ 健康检查失败，重试 $attempt/$max_attempts"
        sleep 10
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ 健康检查失败，部署可能有问题"
    exit 1
fi

# 清理旧镜像
echo "🧹 清理旧镜像..."
docker image prune -f

echo "✅ 生产环境部署完成！"
echo "🌐 应用访问地址: https://localhost"
echo "📊 监控地址: https://localhost/metrics"
echo "📚 API 文档: https://localhost/api-docs"
```

### 2. 监控部署脚本

```bash
#!/bin/bash
# scripts/monitoring-deploy.sh

set -e

echo "📊 部署监控系统..."

# 创建监控目录
mkdir -p /opt/monitoring/{prometheus,grafana,alertmanager}

# Prometheus 配置
cat > /opt/monitoring/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'nestjs-app'
    static_configs:
      - targets: ['app:9090']
    scrape_interval: 5s
    metrics_path: /metrics

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'mysql-exporter'
    static_configs:
      - targets: ['mysql-exporter:9104']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
EOF

# 告警规则
cat > /opt/monitoring/prometheus/alert_rules.yml << EOF
groups:
  - name: nestjs-app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ \$value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ \$value }} seconds"

      - alert: HighMemoryUsage
        expr: (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ \$value | humanizePercentage }}"

      - alert: DatabaseConnectionsHigh
        expr: database_connections > 8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database connections: {{ \$value }}"
EOF

# 启动监控服务
docker-compose -f docker-compose.monitoring.yml up -d

echo "✅ 监控系统部署完成！"
echo "📊 Prometheus: http://localhost:9090"
echo "📈 Grafana: http://localhost:3001 (admin/admin)"
```

### 3. 监控 Docker Compose

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - /opt/monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - /opt/monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - /opt/monitoring/alertmanager:/etc/alertmanager
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

  mysql-exporter:
    image: prom/mysqld-exporter:latest
    container_name: mysql-exporter
    ports:
      - "9104:9104"
    environment:
      - DATA_SOURCE_NAME=nestjs:password@(db:3306)/blog_prod
    networks:
      - monitoring
      - app-network

  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
    networks:
      - monitoring
      - app-network

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
  app-network:
    external: true
```

### 4. 自动化运维脚本

```bash
#!/bin/bash
# scripts/maintenance.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/opt/blog-app"

# 日志清理
cleanup_logs() {
    echo "🧹 清理旧日志..."
    find $APP_DIR/logs -name "*.log" -mtime +30 -delete
    echo "✅ 日志清理完成"
}

# 数据库备份
backup_database() {
    echo "💾 备份数据库..."
    BACKUP_FILE="$APP_DIR/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose -f $APP_DIR/docker-compose.yml exec -T db \
        mysqldump -u root -p$MYSQL_ROOT_PASSWORD blog_prod > $BACKUP_FILE

    # 压缩备份文件
    gzip $BACKUP_FILE

    # 删除30天前的备份
    find $APP_DIR/backups -name "*.sql.gz" -mtime +30 -delete

    echo "✅ 数据库备份完成: $BACKUP_FILE.gz"
}

# 系统资源检查
check_resources() {
    echo "🔍 检查系统资源..."

    # 磁盘空间检查
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        echo "⚠️  磁盘使用率过高: ${DISK_USAGE}%"
    fi

    # 内存使用检查
    MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $MEMORY_USAGE -gt 80 ]; then
        echo "⚠️  内存使用率过高: ${MEMORY_USAGE}%"
    fi

    # Docker 容器状态检查
    UNHEALTHY_CONTAINERS=$(docker ps --filter "health=unhealthy" -q | wc -l)
    if [ $UNHEALTHY_CONTAINERS -gt 0 ]; then
        echo "⚠️  发现 $UNHEALTHY_CONTAINERS 个不健康的容器"
        docker ps --filter "health=unhealthy"
    fi

    echo "✅ 系统资源检查完成"
}

# 性能优化
optimize_performance() {
    echo "⚡ 执行性能优化..."

    # 清理 Docker 系统
    docker system prune -f

    # 重启应用（如果内存使用过高）
    MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $MEMORY_USAGE -gt 90 ]; then
        echo "🔄 内存使用过高，重启应用..."
        docker-compose -f $APP_DIR/docker-compose.yml restart app
    fi

    echo "✅ 性能优化完成"
}

# 安全更新检查
security_updates() {
    echo "🔒 检查安全更新..."

    # 更新系统包
    apt update && apt list --upgradable | grep -i security

    # 检查 Docker 镜像更新
    docker-compose -f $APP_DIR/docker-compose.yml pull

    echo "✅ 安全更新检查完成"
}

# 主函数
main() {
    case "$1" in
        "logs")
            cleanup_logs
            ;;
        "backup")
            backup_database
            ;;
        "check")
            check_resources
            ;;
        "optimize")
            optimize_performance
            ;;
        "security")
            security_updates
            ;;
        "all")
            cleanup_logs
            backup_database
            check_resources
            optimize_performance
            ;;
        *)
            echo "使用方法: $0 {logs|backup|check|optimize|security|all}"
            exit 1
            ;;
    esac
}

main "$@"
```

### 5. Crontab 定时任务

```bash
# 添加到 crontab
# crontab -e

# 每天凌晨2点备份数据库
0 2 * * * /opt/blog-app/scripts/maintenance.sh backup

# 每天凌晨3点清理日志
0 3 * * * /opt/blog-app/scripts/maintenance.sh logs

# 每小时检查系统资源
0 * * * * /opt/blog-app/scripts/maintenance.sh check

# 每周日凌晨4点执行完整维护
0 4 * * 0 /opt/blog-app/scripts/maintenance.sh all

# 每天检查安全更新
0 6 * * * /opt/blog-app/scripts/maintenance.sh security
```

## 🎉 小结

在本章中，我们完成了：

### ✅ 容器化部署
- Docker 多阶段构建优化
- Docker Compose 生产环境配置
- Nginx 反向代理和负载均衡
- SSL/TLS 安全配置

### ✅ CI/CD 流水线
- GitHub Actions 自动化部署
- 代码质量检查和测试
- 安全扫描和漏洞检测
- 自动化部署脚本

### ✅ 性能优化
- Redis 缓存策略
- 数据库连接池优化
- 响应压缩和静态资源优化
- 集群模式配置

### ✅ 监控和日志
- Prometheus 指标收集
- Grafana 可视化监控
- 结构化日志记录
- Sentry 错误追踪

### ✅ 运维自动化
- 健康检查和自愈机制
- 自动化备份和恢复
- 系统资源监控
- 定时维护任务

这套完整的部署和运维方案确保了应用在生产环境中的高可用性、高性能和可维护性。

在下一章中，我们将对整个项目进行总结，并提供扩展建议和最佳实践。
