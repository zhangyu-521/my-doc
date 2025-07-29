# 第7章：数据库集成与ORM

## 本章目标

- 掌握Node.js中的数据库连接方法
- 学会使用原生SQL进行数据库操作
- 深入学习Prisma ORM的使用
- 了解数据库迁移和版本控制
- 掌握数据库设计最佳实践

## 7.1 数据库连接与配置

### MySQL数据库连接

```javascript
// database/connection.js - 数据库连接

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'nodejs_tutorial',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('数据库连接成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('数据库连接失败:', error.message);
        return false;
    }
}

// 执行查询
async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('查询执行失败:', error.message);
        throw error;
    }
}

// 执行事务
async function transaction(callback) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};
```

### 环境配置

```javascript
// config/database.js - 数据库配置管理

const config = {
    development: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'nodejs_tutorial_dev',
        logging: true
    },
    test: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'nodejs_tutorial_test',
        logging: false
    },
    production: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        logging: false,
        ssl: {
            rejectUnauthorized: false
        }
    }
};

const environment = process.env.NODE_ENV || 'development';

module.exports = config[environment];
```

## 7.2 原生SQL操作

### 基本CRUD操作

```javascript
// models/User.js - 用户模型（原生SQL）

const { query, transaction } = require('../database/connection');

class User {
    // 创建用户表
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                avatar VARCHAR(500),
                status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        
        await query(sql);
        console.log('用户表创建成功');
    }
    
    // 创建用户
    static async create(userData) {
        const { name, email, password, avatar } = userData;
        
        const sql = `
            INSERT INTO users (name, email, password, avatar)
            VALUES (?, ?, ?, ?)
        `;
        
        const result = await query(sql, [name, email, password, avatar]);
        
        return {
            id: result.insertId,
            name,
            email,
            avatar,
            status: 'active',
            created_at: new Date()
        };
    }
    
    // 根据ID查找用户
    static async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const users = await query(sql, [id]);
        return users[0] || null;
    }
    
    // 根据邮箱查找用户
    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const users = await query(sql, [email]);
        return users[0] || null;
    }
    
    // 获取所有用户（分页）
    static async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const countSql = 'SELECT COUNT(*) as total FROM users';
        const dataSql = `
            SELECT id, name, email, avatar, status, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const [countResult, users] = await Promise.all([
            query(countSql),
            query(dataSql, [limit, offset])
        ]);
        
        return {
            data: users,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        };
    }
    
    // 更新用户
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });
        
        if (fields.length === 0) {
            throw new Error('没有要更新的字段');
        }
        
        values.push(id);
        
        const sql = `
            UPDATE users 
            SET ${fields.join(', ')}
            WHERE id = ?
        `;
        
        await query(sql, values);
        return await this.findById(id);
    }
    
    // 删除用户
    static async delete(id) {
        const sql = 'DELETE FROM users WHERE id = ?';
        const result = await query(sql, [id]);
        return result.affectedRows > 0;
    }
    
    // 搜索用户
    static async search(keyword, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const searchTerm = `%${keyword}%`;
        
        const countSql = `
            SELECT COUNT(*) as total 
            FROM users 
            WHERE name LIKE ? OR email LIKE ?
        `;
        
        const dataSql = `
            SELECT id, name, email, avatar, status, created_at
            FROM users
            WHERE name LIKE ? OR email LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const [countResult, users] = await Promise.all([
            query(countSql, [searchTerm, searchTerm]),
            query(dataSql, [searchTerm, searchTerm, limit, offset])
        ]);
        
        return {
            data: users,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        };
    }
}

module.exports = User;
```

### 复杂查询和关联

```javascript
// models/Post.js - 文章模型

const { query, transaction } = require('../database/connection');

class Post {
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                excerpt VARCHAR(500),
                author_id INT NOT NULL,
                category_id INT,
                status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                view_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_author_id (author_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            )
        `;
        
        await query(sql);
        console.log('文章表创建成功');
    }
    
    // 创建文章
    static async create(postData) {
        const { title, content, excerpt, author_id, category_id, status = 'draft' } = postData;
        
        const sql = `
            INSERT INTO posts (title, content, excerpt, author_id, category_id, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const result = await query(sql, [title, content, excerpt, author_id, category_id, status]);
        
        return await this.findById(result.insertId);
    }
    
    // 获取文章详情（包含作者信息）
    static async findById(id) {
        const sql = `
            SELECT 
                p.*,
                u.name as author_name,
                u.email as author_email,
                u.avatar as author_avatar
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = ?
        `;
        
        const posts = await query(sql, [id]);
        return posts[0] || null;
    }
    
    // 获取文章列表（包含作者信息和分页）
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            status = 'published',
            author_id,
            category_id,
            search
        } = options;
        
        const offset = (page - 1) * limit;
        let whereConditions = ['p.status = ?'];
        let params = [status];
        
        if (author_id) {
            whereConditions.push('p.author_id = ?');
            params.push(author_id);
        }
        
        if (category_id) {
            whereConditions.push('p.category_id = ?');
            params.push(category_id);
        }
        
        if (search) {
            whereConditions.push('(p.title LIKE ? OR p.content LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const countSql = `
            SELECT COUNT(*) as total
            FROM posts p
            WHERE ${whereClause}
        `;
        
        const dataSql = `
            SELECT 
                p.id, p.title, p.excerpt, p.status, p.view_count,
                p.created_at, p.updated_at,
                u.name as author_name,
                u.avatar as author_avatar
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const [countResult, posts] = await Promise.all([
            query(countSql, params),
            query(dataSql, [...params, limit, offset])
        ]);
        
        return {
            data: posts,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        };
    }
    
    // 增加浏览量
    static async incrementViewCount(id) {
        const sql = 'UPDATE posts SET view_count = view_count + 1 WHERE id = ?';
        await query(sql, [id]);
    }
    
    // 获取用户的文章统计
    static async getUserStats(userId) {
        const sql = `
            SELECT 
                COUNT(*) as total_posts,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_posts,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_posts,
                SUM(view_count) as total_views,
                AVG(view_count) as avg_views
            FROM posts
            WHERE author_id = ?
        `;
        
        const result = await query(sql, [userId]);
        return result[0];
    }
}

module.exports = Post;
```

## 7.3 Prisma ORM深入应用

### Prisma设置和配置

```javascript
// prisma/schema.prisma - Prisma数据模型

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(100)
  email     String   @unique @db.VarChar(255)
  password  String   @db.VarChar(255)
  avatar    String?  @db.VarChar(500)
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // 关联关系
  posts     Post[]
  comments  Comment[]
  profile   Profile?

  @@map("users")
}

model Profile {
  id       Int     @id @default(autoincrement())
  bio      String? @db.Text
  website  String? @db.VarChar(255)
  location String? @db.VarChar(100)
  userId   Int     @unique @map("user_id")
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Category {
  id          Int    @id @default(autoincrement())
  name        String @db.VarChar(100)
  slug        String @unique @db.VarChar(100)
  description String? @db.Text
  
  posts Post[]

  @@map("categories")
}

model Post {
  id         Int         @id @default(autoincrement())
  title      String      @db.VarChar(255)
  content    String      @db.Text
  excerpt    String?     @db.VarChar(500)
  slug       String      @unique @db.VarChar(255)
  status     PostStatus  @default(DRAFT)
  viewCount  Int         @default(0) @map("view_count")
  authorId   Int         @map("author_id")
  categoryId Int?        @map("category_id")
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  // 关联关系
  author   User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])
  comments Comment[]
  tags     PostTag[]

  @@index([authorId])
  @@index([status])
  @@index([createdAt])
  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique @db.VarChar(50)
  color String @default("#000000") @db.VarChar(7)

  posts PostTag[]

  @@map("tags")
}

model PostTag {
  postId Int @map("post_id")
  tagId  Int @map("tag_id")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String   @db.Text
  authorId  Int      @map("author_id")
  postId    Int      @map("post_id")
  parentId  Int?     @map("parent_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // 关联关系
  author   User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  post     Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  parent   Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies  Comment[] @relation("CommentReplies")

  @@index([postId])
  @@index([authorId])
  @@map("comments")
}

enum Status {
  ACTIVE
  INACTIVE
  BANNED
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### Prisma客户端使用

```javascript
// lib/prisma.js - Prisma客户端配置

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty',
});

// 连接事件监听
prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
});

// 优雅关闭
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = prisma;
```

```javascript
// services/UserService.js - 用户服务（Prisma版本）

const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');

class UserService {
    // 创建用户
    static async createUser(userData) {
        const { name, email, password, bio, website, location } = userData;
        
        // 检查邮箱是否已存在
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        
        if (existingUser) {
            throw new Error('邮箱已被使用');
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 使用事务创建用户和档案
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                profile: bio || website || location ? {
                    create: {
                        bio,
                        website,
                        location
                    }
                } : undefined
            },
            include: {
                profile: true
            }
        });
        
        // 移除密码字段
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    
    // 获取用户详情
    static async getUserById(id) {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                profile: true,
                posts: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        title: true,
                        excerpt: true,
                        createdAt: true,
                        viewCount: true
                    }
                },
                _count: {
                    select: {
                        posts: {
                            where: { status: 'PUBLISHED' }
                        },
                        comments: true
                    }
                }
            }
        });
        
        if (!user) {
            throw new Error('用户不存在');
        }
        
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    
    // 获取用户列表
    static async getUsers(options = {}) {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;
        
        const skip = (page - 1) * limit;
        
        const where = {};
        
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } }
            ];
        }
        
        if (status) {
            where.status = status;
        }
        
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    status: true,
                    createdAt: true,
                    _count: {
                        select: {
                            posts: true,
                            comments: true
                        }
                    }
                }
            }),
            prisma.user.count({ where })
        ]);
        
        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    
    // 更新用户
    static async updateUser(id, updateData) {
        const { name, email, avatar, bio, website, location, ...userData } = updateData;
        
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                ...userData,
                ...(name && { name }),
                ...(email && { email }),
                ...(avatar && { avatar }),
                profile: (bio !== undefined || website !== undefined || location !== undefined) ? {
                    upsert: {
                        create: { bio, website, location },
                        update: {
                            ...(bio !== undefined && { bio }),
                            ...(website !== undefined && { website }),
                            ...(location !== undefined && { location })
                        }
                    }
                } : undefined
            },
            include: {
                profile: true
            }
        });
        
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    
    // 删除用户
    static async deleteUser(id) {
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });
        
        return { message: '用户删除成功' };
    }
    
    // 用户认证
    static async authenticateUser(email, password) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { profile: true }
        });
        
        if (!user) {
            throw new Error('用户不存在');
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            throw new Error('密码错误');
        }
        
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}

module.exports = UserService;
```

## 本章小结

本章我们深入学习了：

1. **数据库连接**：MySQL连接池配置和环境管理
2. **原生SQL操作**：CRUD操作、复杂查询和事务处理
3. **Prisma ORM**：数据模型定义、客户端使用和高级功能
4. **最佳实践**：数据库设计、性能优化和错误处理

## 练习题

1. 设计一个电商系统的数据库模型
2. 实现数据库迁移和种子数据功能
3. 创建复杂的查询和报表功能
4. 实现数据库连接池监控和优化

## 下一章预告

下一章我们将学习认证授权与安全，了解如何实现用户认证、权限控制和应用安全防护。

---

[上一章：Express框架深度应用](../chapter-06/) | [返回目录](../) | [下一章：认证授权与安全](../chapter-08/)
