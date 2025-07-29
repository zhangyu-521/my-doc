# NestJS 实战教程 - 从零到一构建企业级博客系统

## 📚 教程简介

本教程将带你从零开始，使用 NestJS + Prisma + MySQL 构建一个完整的企业级博客系统。教程内容详细，通俗易懂，适合有一定 Node.js 基础的开发者学习。

## 🎯 学习目标

通过本教程，你将学会：
- NestJS 框架的核心概念和最佳实践
- 使用 Prisma ORM 进行数据库操作
- JWT 认证与权限控制系统
- RESTful API 设计与实现
- 单元测试和集成测试
- Docker 容器化部署

## 🛠 技术栈

- **后端框架**: NestJS 10.x
- **数据库**: MySQL 8.0
- **ORM**: Prisma 5.x
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI
- **测试**: Jest
- **部署**: Docker

## 📖 教程目录

### [第1章：项目初始化与环境配置](./chapter-01/README.md)
- NestJS 项目创建
- 依赖包安装与配置
- 环境变量设置
- 项目结构规划

### [第2章：数据库设计与Prisma配置](./chapter-02/README.md)
- MySQL 数据库设计
- Prisma ORM 配置
- 数据模型定义
- 数据库迁移

### [第3章：用户模块开发](./chapter-03/README.md)
- 用户注册与登录
- 用户信息管理
- 密码加密与验证
- 用户权限设计

### [第4章：JWT认证与授权](./chapter-04/README.md)
- JWT Token 实现
- 认证守卫开发
- 权限控制系统
- 刷新令牌机制

### [第5章：文章管理模块](./chapter-05/README.md)
- 文章 CRUD 操作
- 分类与标签系统
- 文章搜索与分页
- 评论系统实现

### [第6章：公共组件与工具](./chapter-06/README.md)
- 拦截器开发
- 管道验证
- 异常过滤器
- 自定义装饰器

### [第7章：API文档与测试](./chapter-07/README.md)
- Swagger 文档配置
- 单元测试编写
- 集成测试实现
- 测试覆盖率

### [第8章：部署与优化](./chapter-08/README.md)
- Docker 容器化
- 生产环境配置
- 性能优化技巧
- 监控与日志

## 🚀 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd nestjs-tutorial

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动数据库
docker-compose up -d mysql

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run start:dev
```

## 📋 前置要求

- Node.js 18.x 或更高版本
- MySQL 8.0 或更高版本
- 基础的 TypeScript 知识
- 了解 RESTful API 概念

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进本教程！

## 📄 许可证

本教程采用 MIT 许可证。

---

**开始你的 NestJS 学习之旅吧！** 🎉
