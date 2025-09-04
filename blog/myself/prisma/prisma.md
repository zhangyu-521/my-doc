# prisma
::: tip
> 引用    [prisma文档](https://prisma.yoga/reference/api-reference/prisma-schema-reference/#%E6%95%B0%E6%8D%AE%E6%BA%90%EF%BC%88datasource%EF%BC%89)
:::

👋`Prisma`是一个开源的下一代`ORM`。它由以下几部分组成:

- `Prisma Client`: 为`Node.js`和`TypeScript`自动生成和类型安全的查询生成器
- `Prisma Migrate:` 迁移工具，可以轻松地将数据库模式从原型设计应用到生产
- `Prisma Studio:` 用于查看和编辑数据库中数据的GUI


## Prisma schema

`Prisma schema `文件（简写：schema file, Prisma schema 或 schema）是你的 Primsa 组织结构中主要的配置文件。它通常被命名为 `schema.prisma`，其中包含以下几部分：
- `数据源`： 指明 Prisma 将要连接的数据库的细节 (例如一个 PostgreSQL 数据库)
- `生成器`： 指明基于数据模型生成的客户端 (例如 Prisma Client)
- `数据模型定义`： 定义数据库中的表和字段，以及它们之间的关系

## 数据源
一个数据源决定了 `Prisma` 如何连接你的数据库，它被定义在 `Prisma schema` 中的 `datasource`  代码块中。 以下数据源使用了 `mysql` 作为 `provider` 同时包含了一个连接 URL：

``` prisma
datasource db {
  provider = "mysql"
  url      = "mysql://root:123456@localhost:3306/text_db"
}
```

## 生成器
生成器定义了 Prisma Client 的生成方式，被定义在 `Prisma schema` 中的 `generator` 代码块中。

``` prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}
```

## 数据模型
数据模型定义了数据库中的表结构，被定义在 `Prisma schema` 中的 `model` 代码块中。

以下 `schema` 描述了一个博客平台

``` prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id      String   @id @default(dbgenerated()) @map("_id") @db.ObjectId
  email   String   @unique
  name    String?
  role    Role     @default(USER)
  posts   Post[]
  profile Profile?
}

model Profile {
  id     String @id @default(dbgenerated()) @map("_id") @db.ObjectId
  bio    String
  user   User   @relation(fields: [userId], references: [id])
  userId String @db.ObjectId
}

model Post {
  id         String     @id @default(dbgenerated()) @map("_id") @db.ObjectId
  createdAt  DateTime   @default(now())
  title      String
  published  Boolean    @default(false)
  author     User       @relation(fields: [authorId], references: [id])
  authorId   String     @db.ObjectId
  categories Category[] @relation(references: [id])
}

model Category {
  id    String @id @default(dbgenerated()) @map("_id") @db.ObjectId
  name  String
  posts Post[] @relation(references: [id])
}

enum Role {
  USER
  ADMIN
}
```

**数据模型定义可分解为：**

- 模型 (model  原语) ，定义了若干字段，包括 模型之间的关系
- 枚举 (enum  原语) （如果你的连接器支持枚举）
- 属性 和 函数 ，改变字段和模型的行为
  
**相应的数据库如下所示：**

<img src="https://prisma.yoga/static/fc0ed56f4213ebf4d2309c0965b166da/a6d36/sample-database.png">

::: tip
模型会映射到数据源的底层结构。
- 在 PostgreSQL 和 MySQL 等关系型数据库中，model 映射至 表
- MongoDB 中，model 映射至 集合
:::

以下查询使用由上数据模型生成的`Prisma Client API`来创建

- 一条 `User` 记录
- 两条嵌套的 `Post` 记录
- 三条嵌套的 `Category` 记录

``` ts
const user = await prisma.user.create({
  data: {
    email: 'ariadne@prisma.io',
    name: 'Ariadne',
    posts: {
      create: [
        {
          title: 'My first day at Prisma',
          categories: {
            create: {
              name: 'Office',
            },
          },
        },
        {
          title: 'How to connect to a SQLite database',
          categories: {
            create: [{ name: 'Databases' }, { name: 'Tutorials' }],
          },
        },
      ],
    },
  },
})

```

## 定义模型
``` prisma
model Comment {
  // Fields
}

model Tag {
  // Fields
}
```

## 定义字段
**模型的属性被称为 字段**
包括：
- 字段名
- 字段类型
- 选填的类型修饰符
- 选填的属性

生成一个md语法的table结构

| 字段名 | 字段类型 | 选填 | 属性 |
| --- | --- | --- | --- |
| id | Int | 否 | @id @default(autoincrement()) |
| createdAt | DateTime | 否 | @default(now()) |
| updatedAt | DateTime | 否 | @updatedAt |
| content | String | 否 |  |
| published | Boolean | 否 |  |
| authorId | Int | 否 |  |
| author | User | 否 |  |
| comments | Comment[] | 是 |  |
| likes | Like[] | 是 |  |
| tags | Tag[] | 是 |  |
| categories | Category[] | 是 |  |
| likesCount | Int | 是 | @default(0) |
| commentsCount | Int | 是 | @default(0) |
| tagsCount | Int | 是 | @default(0) |


## 关系字段

一个关系字段的类型是另一个模型 - 例如，一篇博文 (Post) 可以有多条评论 (Comment[])：
``` prisma
model Post {
  id       Int       @id @default(autoincrement())
  // Other fields
  comments Comment[] // 一篇博文可以有许多评论
}

model Comment {
  id     Int
  // Other fields
  Post   Post? @relation(fields: [postId], references: [id]) // 一条评论对应最多一篇博文
  postId Int?
}
```

## 类型修饰符
- [] 使字段成为列表
- ？使字段成为可选

## 原生类型映射

``` prisma
model Post {
  id      Int    @id
  title   String @db.VarChar(200)
  content String
}
```

## 定义属性

详细请参考： [属性](https://prisma.yoga/reference/api-reference/prisma-schema-reference/#%E5%B1%9E%E6%80%A7)
``` prisma
model Post {
    id     Int    @id @default(autoincrement())
    title  String @unique
    content String
    published Boolean @default(false)
    authorId Int
    author  User
}
```


## 定义枚举
``` prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  role  Role    @default(USER)
}

enum Role {
  USER
  ADMIN
}
```

## 使用函数
参考[函数](https://prisma.yoga/reference/api-reference/prisma-schema-reference/#%E5%B1%9E%E6%80%A7%E5%87%BD%E6%95%B0)


## 关系
参考 [关系](https://prisma.yoga/concepts/components/prisma-schema/relations/)




## Prisma Client API

查询(CRUD)

数据模型定义中的每个模型都会在生成的 Prisma Client API 中带有若干 CRUD 查询：
- findMany
- findUnique
- create
- update
- upsert
- delete
- updateMany
- deleteMany

这些操作可通过 `Prisma Client` 实例的属性调用。属性名默认为模型名的小写形式，例如 user 对应 User 模型，post 对应 Post 模型。

以下示例说明了如何使用 `Prisma Client API` 的 user 属性：
```typescript
const newUser = await prisma.user.create({
  data: {
    name: 'Alice',
  },
})
const allUsers = await prisma.user.findMany()
```
## 类型定义
`Prisma Client` 还会生成反映你模型结构的 类型定义。这些定义是生成的 `@prisma/client node module` 的一部分。
::: tip
注：实际类型储存在 .prisma/client 文件夹中。`@prisma/client/index.d.ts` 对外暴露此文件夹内容。
:::


例如，上述 User 模型的类型定义如下所示：
```ts
export type User = {
  id: number
  email: string
  name: string | null
  role: string
}
```


## Prisma Migrate
Prisma Migrate 是一个**命令式数据库架构迁移工具**


### 第一次迁移
每次更改prisma schema 中的模型后执行
```bash
prisma migrate dev --name init
```


现在您的Prisma架构与数据库架构已同步，并且已初始化了迁移历史记录：
**同时字段的ts提示也会更新**

``` txt
migrations/
  └─ 20210313140442_init/
    └─ migration.sql
```

### 修改模型后第二次迁移
```bash
prisma migrate dev --name added_job_title
```

**Prisma架构再次与数据库架构同步，迁移历史记录里包含了两次迁移：**
``` txt
migrations/
  └─ 20210313140442_init/
    └─ migration.sql
  └─ 20210313140442_added_job_title/
    └─ migration.sql
```

## migrate 命令汇总
``` bash
prisma migrate dev --name [ 迁移名称 ] # 开发环境同步迁移

npx prisma migrate reset # 重置数据库开发时使用

prisma migrate deploy # 生产环境同步迁移

prisma migrate resolve # 解决冲突，回滚迁移

prisma migrate status # 查看迁移状态
```

## studio 命令汇总
studio 就是在 浏览器打开一个 可视化的 数据库界面器
``` bash
prisma studio # 启动 prisma studio
prisma studio --port [ 端口 ] # 启动 prisma studio 指定端口
prisma studio --experimental # 启动 prisma studio 实验功能
```




> 引用   [prisma文档](https://prisma.yoga/reference/api-reference/prisma-schema-reference/#%E6%95%B0%E6%8D%AE%E6%BA%90%EF%BC%88datasource%EF%BC%89)




