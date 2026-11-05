# 第4章：SQLAlchemy ORM 与数据库设计

## 回顾与展望

在第 3 章中，我们已经用到了 SQLAlchemy 的基础功能。这一章会深入讲解：
- ORM 的工作原理
- 数据库关系设计
- 复杂查询
- 数据库迁移

::: tip
如果你用过 TypeORM 或 Prisma，会发现 SQLAlchemy 的概念很相似。
:::

## SQLAlchemy 核心概念

### 对比前端的 ORM

| 前端 ORM | SQLAlchemy | 说明 |
|----------|-----------|------|
| TypeORM Entity | Model (继承 Base) | 数据库表映射 |
| `@Column()` | `Column()` | 字段定义 |
| `@OneToMany()` | `relationship()` | 关系定义 |
| `@ManyToOne()` | `ForeignKey()` | 外键 |
| Repository | Session | 数据库操作 |

## 数据库关系详解

### 1. 一对多关系（One-to-Many）

**场景**：一个用户有多个书签

```python
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    
    # 关系：一个用户有多个书签
    bookmarks = relationship("Bookmark", back_populates="owner", cascade="all, delete-orphan")

class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    url = Column(String)
    
    # 外键：指向 users 表的 id
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # 关系：反向引用
    owner = relationship("User", back_populates="bookmarks")
```

**使用示例**：
```python
# 获取用户的所有书签
user = db.query(User).filter(User.id == 1).first()
print(user.bookmarks)  # 自动加载所有书签

# 获取书签的所有者
bookmark = db.query(Bookmark).filter(Bookmark.id == 1).first()
print(bookmark.owner.username)  # 自动加载用户
```

**对比 TypeORM**：
```typescript
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Bookmark, bookmark => bookmark.owner)
  bookmarks: Bookmark[];
}

@Entity()
class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.bookmarks)
  owner: User;
}
```

### 2. 多对多关系（Many-to-Many）

**场景**：书签可以有多个标签，标签可以属于多个书签

```python
from sqlalchemy import Table, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# 关联表（中间表）
bookmark_tags = Table(
    'bookmark_tags',
    Base.metadata,
    Column('bookmark_id', Integer, ForeignKey('bookmarks.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    
    # 多对多关系
    tags = relationship("Tag", secondary=bookmark_tags, back_populates="bookmarks")

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    
    # 反向关系
    bookmarks = relationship("Bookmark", secondary=bookmark_tags, back_populates="tags")
```

**使用示例**：
```python
# 创建标签
tag1 = Tag(name="Python")
tag2 = Tag(name="Tutorial")

# 创建书签并关联标签
bookmark = Bookmark(title="FastAPI Docs")
bookmark.tags.append(tag1)
bookmark.tags.append(tag2)

db.add(bookmark)
db.commit()

# 查询：获取所有包含 "Python" 标签的书签
python_bookmarks = db.query(Bookmark)\
    .join(Bookmark.tags)\
    .filter(Tag.name == "Python")\
    .all()
```

### 3. 级联操作（Cascade）

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String)
    
    # cascade="all, delete-orphan"：删除用户时自动删除其书签
    bookmarks = relationship(
        "Bookmark",
        back_populates="owner",
        cascade="all, delete-orphan"  # 重点！
    )
```

级联选项：
- `all` - 包含所有级联操作
- `delete` - 删除父对象时删除子对象
- `delete-orphan` - 删除失去父对象的子对象
- `merge` - 合并父对象时合并子对象
- `save-update` - 保存父对象时保存子对象

## 复杂查询

### 1. 连接查询（Join）

```python
from sqlalchemy import func

# 查询每个用户的书签数量
results = db.query(
    User.username,
    func.count(Bookmark.id).label('bookmark_count')
)\
.join(Bookmark, User.id == Bookmark.user_id)\
.group_by(User.username)\
.all()

for username, count in results:
    print(f"{username}: {count} bookmarks")
```

### 2. 过滤与排序

```python
# 多条件查询
bookmarks = db.query(Bookmark)\
    .filter(
        Bookmark.user_id == user_id,
        Bookmark.title.contains("FastAPI")  # 模糊搜索
    )\
    .order_by(Bookmark.created_at.desc())\
    .limit(10)\
    .all()

# OR 查询
from sqlalchemy import or_

bookmarks = db.query(Bookmark)\
    .filter(
        or_(
            Bookmark.title.contains("Python"),
            Bookmark.description.contains("Python")
        )
    )\
    .all()
```

### 3. 分页查询

```python
def get_bookmarks_paginated(
    db: Session,
    user_id: int,
    page: int = 1,
    page_size: int = 20
):
    skip = (page - 1) * page_size
    
    bookmarks = db.query(Bookmark)\
        .filter(Bookmark.user_id == user_id)\
        .offset(skip)\
        .limit(page_size)\
        .all()
    
    total = db.query(Bookmark)\
        .filter(Bookmark.user_id == user_id)\
        .count()
    
    return {
        "items": bookmarks,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size
    }
```

## 数据库迁移（Alembic）

### 为什么需要迁移？

在开发过程中，数据库结构会变化（添加字段、修改类型等）。**Alembic** 类似前端的数据库迁移工具。

### 安装与初始化

```bash
pip install alembic
alembic init alembic
```

### 配置 Alembic

编辑 `alembic.ini`：
```ini
# 修改数据库连接
sqlalchemy.url = sqlite:///./bookmark.db
```

编辑 `alembic/env.py`：
```python
from app.database import Base
from app.models import User, Bookmark  # 导入所有模型

target_metadata = Base.metadata
```

### 创建迁移

```bash
# 自动生成迁移脚本
alembic revision --autogenerate -m "Add tags table"

# 执行迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

### 示例：添加新字段

假设我们要给 `Bookmark` 添加 `is_public` 字段：

1. **修改模型**：
```python
class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    url = Column(String)
    is_public = Column(Boolean, default=False)  # 新字段
```

2. **生成迁移**：
```bash
alembic revision --autogenerate -m "Add is_public to bookmarks"
```

3. **执行迁移**：
```bash
alembic upgrade head
```

## 完整示例：带标签的书签系统

更新 `app/models.py`：

```python
from sqlalchemy import Table, Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

# 关联表
bookmark_tags = Table(
    'bookmark_tags',
    Base.metadata,
    Column('bookmark_id', Integer, ForeignKey('bookmarks.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'))
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    bookmarks = relationship("Bookmark", back_populates="owner", cascade="all, delete-orphan")

class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    description = Column(String)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="bookmarks")
    tags = relationship("Tag", secondary=bookmark_tags, back_populates="bookmarks")

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    
    bookmarks = relationship("Bookmark", secondary=bookmark_tags, back_populates="tags")
```

更新 `app/schemas.py`：

```python
from pydantic import BaseModel
from datetime import datetime

class TagBase(BaseModel):
    name: str

class TagResponse(TagBase):
    id: int
    
    class Config:
        from_attributes = True

class BookmarkCreate(BaseModel):
    title: str
    url: str
    description: str | None = None
    is_public: bool = False
    tag_names: list[str] = []  # 标签名列表

class BookmarkResponse(BaseModel):
    id: int
    title: str
    url: str
    description: str | None
    is_public: bool
    created_at: datetime
    tags: list[TagResponse]
    
    class Config:
        from_attributes = True
```

更新 `app/crud.py`：

```python
from sqlalchemy.orm import Session
from app import models, schemas

def get_or_create_tag(db: Session, tag_name: str):
    """获取或创建标签"""
    tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
    if not tag:
        tag = models.Tag(name=tag_name)
        db.add(tag)
        db.commit()
        db.refresh(tag)
    return tag

def create_bookmark_with_tags(db: Session, bookmark: schemas.BookmarkCreate, user_id: int):
    """创建书签并关联标签"""
    # 创建书签
    db_bookmark = models.Bookmark(
        title=bookmark.title,
        url=bookmark.url,
        description=bookmark.description,
        is_public=bookmark.is_public,
        user_id=user_id
    )
    
    # 添加标签
    for tag_name in bookmark.tag_names:
        tag = get_or_create_tag(db, tag_name)
        db_bookmark.tags.append(tag)
    
    db.add(db_bookmark)
    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark

def search_bookmarks(db: Session, user_id: int, keyword: str):
    """搜索书签（标题、描述、标签）"""
    from sqlalchemy import or_
    
    return db.query(models.Bookmark)\
        .outerjoin(models.Bookmark.tags)\
        .filter(
            models.Bookmark.user_id == user_id,
            or_(
                models.Bookmark.title.contains(keyword),
                models.Bookmark.description.contains(keyword),
                models.Tag.name.contains(keyword)
            )
        )\
        .distinct()\
        .all()
```

## 性能优化技巧

### 1. 延迟加载 vs 急切加载

```python
# 延迟加载（默认）- 访问关系时才查询
user = db.query(User).first()
print(user.bookmarks)  # 此时才查数据库

# 急切加载 - 一次性加载所有关系
from sqlalchemy.orm import joinedload

user = db.query(User)\
    .options(joinedload(User.bookmarks))\
    .first()
print(user.bookmarks)  # 不会再查数据库
```

### 2. 批量插入

```python
# ❌ 慢：一条条插入
for item in items:
    db.add(Bookmark(**item))
    db.commit()

# ✅ 快：批量插入
bookmarks = [Bookmark(**item) for item in items]
db.bulk_save_objects(bookmarks)
db.commit()
```

### 3. 索引优化

```python
class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True)
    title = Column(String, index=True)  # 添加索引
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
```

## PostgreSQL vs SQLite

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| **适用场景** | 开发、小型应用 | 生产环境 |
| **并发** | 单写多读 | 多写多读 |
| **数据类型** | 简单 | 丰富（JSON、数组） |
| **全文搜索** | 有限 | 强大 |
| **配置** | 零配置 | 需要安装 |

### 切换到 PostgreSQL

1. **安装依赖**：
```bash
pip install psycopg2-binary
```

2. **修改 `database.py`**：
```python
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
```

## 小结

这一章我们深入学习了：

- ✅ SQLAlchemy 的核心概念
- ✅ 数据库关系设计（一对多、多对多）
- ✅ 复杂查询（连接、过滤、分页）
- ✅ 数据库迁移（Alembic）
- ✅ 性能优化技巧
- ✅ 完整的标签系统实现

::: tip
数据库设计是后端开发的核心能力。建议多练习复杂查询，理解 ORM 的查询原理。
:::

下一章：[异步编程与性能优化](/blog/backend/python-fullstack/chapter-05/)
