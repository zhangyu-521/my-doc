# 第2章：数据库设计与Prisma配置

## 🎯 本章目标

在这一章中，我们将：
- 设计博客系统的数据库结构
- 配置 Prisma ORM
- 定义数据模型和关系
- 创建数据库迁移
- 设置数据库连接服务

## 🗄️ 数据库设计

### 博客系统核心实体

我们的博客系统包含以下核心实体：
- **用户 (User)**: 系统用户，包括管理员和普通用户
- **文章 (Article)**: 博客文章
- **分类 (Category)**: 文章分类
- **标签 (Tag)**: 文章标签
- **评论 (Comment)**: 文章评论

### 实体关系图

```
User (用户)
├── 1:N → Article (文章)
└── 1:N → Comment (评论)

Article (文章)
├── N:1 → User (作者)
├── N:1 → Category (分类)
├── N:M → Tag (标签，通过 ArticleTag 中间表)
└── 1:N → Comment (评论)

Category (分类)
└── 1:N → Article (文章)

Tag (标签)
└── N:M → Article (文章，通过 ArticleTag 中间表)

Comment (评论)
├── N:1 → User (作者)
├── N:1 → Article (文章)
└── 自关联 (支持回复)
```

## ⚙️ 配置 Prisma

### 1. 初始化 Prisma

```bash
# 初始化 Prisma
npx prisma init
```

这个命令会创建：
- `prisma/schema.prisma` - Prisma 模式文件
- `.env` 文件（如果不存在）

### 2. 配置数据库连接

确保 `.env` 文件中的数据库连接字符串正确：

```bash
# .env
DATABASE_URL="mysql://username:password@localhost:3306/blog_system"
```

### 3. 创建数据库

在 MySQL 中创建数据库：

```sql
CREATE DATABASE blog_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 📋 定义数据模型

### 1. 编辑 Prisma Schema

编辑 `prisma/schema.prisma` 文件：

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// 用户模型
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  firstName String?
  lastName  String?
  avatar    String?
  bio       String?  @db.Text
  role      UserRole @default(USER)
  status    UserStatus @default(ACTIVE)
  
  // 密码重置相关
  passwordResetToken   String?
  passwordResetExpires DateTime?
  
  // 邮箱验证
  emailVerified        Boolean   @default(false)
  emailVerifyToken     String?
  
  // 时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联关系
  articles     Article[]
  comments     Comment[]
  
  @@map("users")
}

// 用户角色枚举
enum UserRole {
  USER
  ADMIN
  MODERATOR
}

// 用户状态枚举
enum UserStatus {
  ACTIVE
  INACTIVE
  BANNED
}

// 文章模型
model Article {
  id          String        @id @default(cuid())
  title       String        @db.VarChar(255)
  slug        String        @unique @db.VarChar(255)
  content     String        @db.LongText
  excerpt     String?       @db.Text
  coverImage  String?
  status      ArticleStatus @default(DRAFT)
  viewCount   Int           @default(0)
  likeCount   Int           @default(0)
  
  // SEO 相关
  metaTitle       String? @db.VarChar(255)
  metaDescription String? @db.Text
  metaKeywords    String? @db.Text
  
  // 发布相关
  publishedAt   DateTime?
  allowComments Boolean   @default(true)
  isPinned      Boolean   @default(false)
  isFeatured    Boolean   @default(false)
  
  // 关联关系
  authorId   String
  author     User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  
  // 时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联关系
  comments    Comment[]
  articleTags ArticleTag[]
  
  // 索引
  @@index([status])
  @@index([publishedAt])
  @@index([authorId])
  @@index([categoryId])
  @@index([createdAt])
  @@map("articles")
}

// 文章状态枚举
enum ArticleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// 分类模型
model Category {
  id          String  @id @default(cuid())
  name        String  @unique @db.VarChar(100)
  slug        String  @unique @db.VarChar(100)
  description String? @db.Text
  color       String? @db.VarChar(7) // 十六进制颜色值
  icon        String? @db.VarChar(50)
  
  // SEO 相关
  metaTitle       String? @db.VarChar(255)
  metaDescription String? @db.Text
  
  // 排序
  sortOrder Int @default(0)
  
  // 时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联关系
  articles Article[]
  
  @@map("categories")
}

// 标签模型
model Tag {
  id          String  @id @default(cuid())
  name        String  @unique @db.VarChar(50)
  slug        String  @unique @db.VarChar(50)
  description String? @db.Text
  color       String? @db.VarChar(7) // 十六进制颜色值
  
  // 使用统计
  useCount Int @default(0)
  
  // 时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联关系
  articleTags ArticleTag[]
  
  @@map("tags")
}

// 文章标签关联表
model ArticleTag {
  id        String @id @default(cuid())
  articleId String
  tagId     String
  
  // 关联关系
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  // 时间戳
  createdAt DateTime @default(now())
  
  @@unique([articleId, tagId])
  @@map("article_tags")
}

// 评论模型
model Comment {
  id      String        @id @default(cuid())
  content String        @db.Text
  status  CommentStatus @default(PENDING)
  
  // IP 和用户代理（用于反垃圾）
  ipAddress String? @db.VarChar(45)
  userAgent String? @db.Text
  
  // 关联关系
  authorId  String
  author    User    @relation(fields: [authorId], references: [id], onDelete: Cascade)
  articleId String
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  
  // 嵌套评论
  parentId String?
  parent   Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies  Comment[] @relation("CommentReplies")
  
  // 时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 索引
  @@index([articleId])
  @@index([authorId])
  @@index([status])
  @@index([parentId])
  @@map("comments")
}

// 评论状态枚举
enum CommentStatus {
  PENDING
  APPROVED
  REJECTED
  SPAM
}
```

## 🔄 创建数据库迁移

### 1. 生成迁移文件

```bash
# 创建初始迁移
npx prisma migrate dev --name init
```

这个命令会：
- 创建迁移文件
- 应用迁移到数据库
- 生成 Prisma Client

### 2. 生成 Prisma Client

如果需要单独生成客户端：

```bash
npx prisma generate
```

### 3. 查看数据库

使用 Prisma Studio 查看数据库：

```bash
npx prisma studio
```

## 🔧 创建 Prisma 服务

### 1. 创建 Prisma 服务

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // 清理数据库（仅用于测试）
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(key => key[0] !== '_');

    return Promise.all(
      models.map((modelKey) => this[modelKey].deleteMany())
    );
  }

  // 健康检查
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2. 创建 Prisma 模块

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 3. 在主模块中注册

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## 🌱 创建种子数据

### 1. 创建种子文件

```typescript
// prisma/seed.ts
import { PrismaClient, UserRole, ArticleStatus, CommentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...');

  // 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  // 创建普通用户
  const userPassword = await bcrypt.hash('user123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'user',
      password: userPassword,
      firstName: 'John',
      lastName: 'Doe',
      bio: '一个热爱技术的开发者',
      emailVerified: true,
    },
  });

  // 创建分类
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'technology' },
      update: {},
      create: {
        name: '技术',
        slug: 'technology',
        description: '技术相关文章',
        color: '#3B82F6',
        icon: 'tech',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'lifestyle' },
      update: {},
      create: {
        name: '生活',
        slug: 'lifestyle',
        description: '生活感悟和经验分享',
        color: '#10B981',
        icon: 'life',
        sortOrder: 2,
      },
    }),
  ]);

  // 创建标签
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'nestjs' },
      update: {},
      create: {
        name: 'NestJS',
        slug: 'nestjs',
        description: 'NestJS框架相关',
        color: '#E11D48',
      },
    }),
    prisma.tag.upsert({
      where: { slug: 'typescript' },
      update: {},
      create: {
        name: 'TypeScript',
        slug: 'typescript',
        description: 'TypeScript语言相关',
        color: '#3178C6',
      },
    }),
    prisma.tag.upsert({
      where: { slug: 'database' },
      update: {},
      create: {
        name: '数据库',
        slug: 'database',
        description: '数据库相关技术',
        color: '#F59E0B',
      },
    }),
  ]);

  console.log('种子数据创建完成！');
  console.log({ admin, user, categories, tags });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 2. 配置 package.json

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio"
  }
}
```

### 3. 运行种子数据

```bash
# 安装 ts-node（如果还没安装）
npm install -D ts-node

# 运行种子数据
npm run db:seed
```

## ✅ 验证配置

### 1. 测试数据库连接

创建一个健康检查端点：

```typescript
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const dbHealthy = await this.prismaService.isHealthy();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      environment: this.configService.get('app.environment'),
    };
  }
}
```

### 2. 启动项目并测试

```bash
npm run start:dev
```

访问 `http://localhost:3000/health` 检查数据库连接状态。

## 🎉 小结

在本章中，我们完成了：
- ✅ 设计了博客系统的数据库结构
- ✅ 配置了 Prisma ORM
- ✅ 定义了完整的数据模型
- ✅ 创建了数据库迁移
- ✅ 设置了 Prisma 服务
- ✅ 创建了种子数据

在下一章中，我们将开始开发用户模块，实现用户注册、登录等功能。
