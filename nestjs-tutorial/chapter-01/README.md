# 第1章：项目初始化与环境配置

## 🎯 本章目标

在这一章中，我们将：
- 创建一个全新的 NestJS 项目
- 安装和配置必要的依赖包
- 设置环境变量和配置文件
- 规划项目的目录结构

## 📋 前置要求

确保你的开发环境已安装：
- Node.js 18.x 或更高版本
- npm 或 yarn 包管理器
- MySQL 8.0 数据库
- 代码编辑器（推荐 VS Code）

## 🚀 创建 NestJS 项目

### 1. 安装 NestJS CLI

首先，我们需要全局安装 NestJS CLI 工具：

```bash
# 使用 npm 安装
npm install -g @nestjs/cli

# 或使用 yarn 安装
yarn global add @nestjs/cli

# 验证安装
nest --version
```

### 2. 创建新项目

使用 CLI 创建一个新的 NestJS 项目：

```bash
# 创建项目
nest new blog-system

# 进入项目目录
cd blog-system

# 启动开发服务器测试
npm run start:dev
```

访问 `http://localhost:3000`，如果看到 "Hello World!" 说明项目创建成功。

## 📦 安装依赖包

### 1. 核心依赖

安装项目所需的核心依赖包：

```bash
# 配置管理
npm install @nestjs/config

# JWT 认证
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install -D @types/passport-jwt @types/passport-local

# API 文档
npm install @nestjs/swagger

# 限流保护
npm install @nestjs/throttler

# 缓存
npm install @nestjs/cache-manager cache-manager

# 任务调度
npm install @nestjs/schedule
```

### 2. 数据库相关

安装 Prisma ORM 和 MySQL 相关包：

```bash
# Prisma ORM
npm install prisma @prisma/client
npm install -D prisma

# MySQL 驱动
npm install mysql2
```

### 3. 工具库

安装常用的工具库：

```bash
# 密码加密
npm install bcrypt
npm install -D @types/bcrypt

# 数据验证
npm install class-validator class-transformer

# UUID 生成
npm install uuid
npm install -D @types/uuid

# 日期处理
npm install dayjs
```

### 4. 测试相关

安装测试相关的依赖：

```bash
# 测试工具
npm install -D supertest @types/supertest

# 测试数据库
npm install -D @types/jest
```

## ⚙️ 环境配置

### 1. 创建环境变量文件

在项目根目录创建环境变量文件：

```bash
# 创建环境变量文件
touch .env .env.example
```

### 2. 配置 .env 文件

```bash
# .env
# 应用配置
NODE_ENV=development
PORT=3000
APP_NAME=Blog System

# 数据库配置
DATABASE_URL="mysql://username:password@localhost:3306/blog_system"

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# 限流配置
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# 缓存配置
CACHE_TTL=300
CACHE_MAX=100

# CORS 配置
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Swagger 配置
SWAGGER_TITLE=Blog System API
SWAGGER_DESCRIPTION=A comprehensive blog system API built with NestJS
SWAGGER_VERSION=1.0.0
SWAGGER_PATH=api-docs

# 文件上传配置
UPLOAD_MAX_FILE_SIZE=5242880
UPLOAD_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp
UPLOAD_DEST=./uploads

# 邮件配置（可选）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### 3. 配置 .env.example 文件

```bash
# .env.example
NODE_ENV=development
PORT=3000
APP_NAME=Blog System

DATABASE_URL="mysql://username:password@localhost:3306/blog_system"

JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

THROTTLE_TTL=60
THROTTLE_LIMIT=10

CACHE_TTL=300
CACHE_MAX=100

CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

SWAGGER_TITLE=Blog System API
SWAGGER_DESCRIPTION=A comprehensive blog system API built with NestJS
SWAGGER_VERSION=1.0.0
SWAGGER_PATH=api-docs

UPLOAD_MAX_FILE_SIZE=5242880
UPLOAD_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp
UPLOAD_DEST=./uploads

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

## 📁 项目结构规划

让我们规划一下项目的目录结构：

```
src/
├── common/                 # 公共组件
│   ├── decorators/        # 自定义装饰器
│   ├── filters/           # 异常过滤器
│   ├── guards/            # 守卫
│   ├── interceptors/      # 拦截器
│   ├── middleware/        # 中间件
│   ├── pipes/             # 管道
│   └── utils/             # 工具函数
├── config/                # 配置文件
├── modules/               # 业务模块
│   ├── auth/             # 认证模块
│   ├── users/            # 用户模块
│   ├── articles/         # 文章模块
│   ├── categories/       # 分类模块
│   ├── tags/             # 标签模块
│   └── comments/         # 评论模块
├── prisma/               # 数据库相关
│   ├── migrations/       # 迁移文件
│   └── schema.prisma     # 数据库模式
├── uploads/              # 文件上传目录
├── app.module.ts         # 根模块
└── main.ts              # 应用入口
```

## 🔧 创建配置文件

### 1. 创建配置模块

创建一个统一的配置管理模块：

```typescript
// src/config/configuration.ts
export default () => ({
  // 应用配置
  app: {
    name: process.env.APP_NAME || 'Blog System',
    port: parseInt(process.env.PORT, 10) || 3000,
    environment: process.env.NODE_ENV || 'development',
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // 限流配置
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
  },

  // 缓存配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 300,
    max: parseInt(process.env.CACHE_MAX, 10) || 100,
  },

  // CORS 配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Swagger 配置
  swagger: {
    title: process.env.SWAGGER_TITLE || 'API Documentation',
    description: process.env.SWAGGER_DESCRIPTION || 'API Documentation',
    version: process.env.SWAGGER_VERSION || '1.0',
    path: process.env.SWAGGER_PATH || 'api-docs',
  },

  // 文件上传配置
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    allowedMimeTypes: process.env.UPLOAD_ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    destination: process.env.UPLOAD_DEST || './uploads',
  },

  // 邮件配置
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },
});
```

### 2. 更新主模块

更新 `app.module.ts` 文件：

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 3. 创建基础目录

创建项目所需的基础目录：

```bash
# 创建目录结构
mkdir -p src/common/{decorators,filters,guards,interceptors,middleware,pipes,utils}
mkdir -p src/config
mkdir -p src/modules/{auth,users,articles,categories,tags,comments}
mkdir -p uploads
```

## ✅ 验证配置

### 1. 启动项目

```bash
npm run start:dev
```

### 2. 检查配置

创建一个简单的配置测试端点：

```typescript
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('config')
  getConfig() {
    return {
      app: this.configService.get('app'),
      environment: this.configService.get('app.environment'),
      port: this.configService.get('app.port'),
    };
  }
}
```

访问 `http://localhost:3000/config` 查看配置是否正确加载。

## 🎉 小结

在本章中，我们完成了：
- ✅ 创建了 NestJS 项目
- ✅ 安装了所有必要的依赖包
- ✅ 配置了环境变量
- ✅ 创建了配置管理模块
- ✅ 规划了项目目录结构

在下一章中，我们将开始配置数据库和 Prisma ORM，设计博客系统的数据模型。
