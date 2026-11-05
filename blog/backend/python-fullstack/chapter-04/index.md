# 第4章：书签标签系统（多对多关系实战）

## 用户需求

在第 3 章，我们实现了基础的书签 CRUD 功能。现在用户反馈：

> "我的书签越来越多了，能不能加个标签功能，方便分类管理？"

这一章我们要做的：
- ✅ 为书签添加标签功能
- ✅ 实现标签管理 API
- ✅ 按标签筛选书签
- ✅ 学习多对多关系设计

::: tip
这是一个真实的功能迭代场景，你会学到如何在现有项目上添加新功能。
:::

## 回顾：当前的数据库设计

在第 3 章，我们有两个表：

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    url = Column(String)
    description = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="bookmarks")
```

**当前关系**：User → Bookmarks（一对多）

---

## 新需求：添加标签功能

### 1. 理解多对多关系

**场景分析**：
- 一个书签可以有多个标签（如："Python"、"教程"、"后端"）
- 一个标签可以属于多个书签（"Python"标签可以打在很多书签上）

**对比前端的多对多**：

如果你用过 TypeORM，应该见过这样的代码：

```typescript
@Entity()
class Bookmark {
  @ManyToMany(() => Tag)
  @JoinTable()
  tags: Tag[];
}

@Entity()
class Tag {
  @ManyToMany(() => Bookmark, bookmark => bookmark.tags)
  bookmarks: Bookmark[];
}
```

在 SQLAlchemy 中，我们需要手动创建**关联表**：

### 2. 设计数据库表结构

### 2. 设计数据库表结构

我们需要三个表：

```
users 表          bookmarks 表          tags 表
┌────────┐       ┌────────────┐        ┌──────────┐
│ id     │       │ id         │        │ id       │
│ email  │       │ title      │        │ name     │
│ ...    │       │ url        │        │ ...      │
└────────┘       │ user_id    │        └──────────┘
                 └────────────┘
                        ↕
                 bookmark_tags 表（关联表）
                 ┌──────────────────┐
                 │ bookmark_id      │
                 │ tag_id           │
                 └──────────────────┘
```

### 3. 更新数据模型

打开 `app/models.py`，添加标签功能：

```python
from sqlalchemy import Table, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

# ====== 新增：关联表 ======
bookmark_tags = Table(
    'bookmark_tags',
    Base.metadata,
    Column('bookmark_id', Integer, ForeignKey('bookmarks.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'))
)

# ====== 原有：用户表 ======
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    bookmarks = relationship("Bookmark", back_populates="owner", cascade="all, delete-orphan")

# ====== 更新：书签表（添加标签关系）======
class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="bookmarks")
    tags = relationship("Tag", secondary=bookmark_tags, back_populates="bookmarks")  # 新增

# ====== 新增：标签表 ======
class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    bookmarks = relationship("Bookmark", secondary=bookmark_tags, back_populates="tags")
```

**关键点解释**：

1. **关联表 `bookmark_tags`**：
   - 不是一个 Model 类，只是一个 Table
   - 存储书签和标签的对应关系
   - `ondelete='CASCADE'`：删除书签或标签时自动清理关联

2. **`secondary` 参数**：
   - 告诉 SQLAlchemy 使用哪个关联表
   - 自动处理多对多关系

---

## 数据库迁移

### 方案1：删除旧数据库（开发环境）

如果你的数据库还没有重要数据：

```bash
# 删除旧数据库
rm bookmark.db

# 重新创建
python -c "from app.database import Base, engine; Base.metadata.create_all(engine)"
```

### 方案2：使用 Alembic（生产环境）

如果有重要数据，使用迁移工具：

```bash
# 安装 Alembic
pip install alembic

# 初始化
alembic init alembic

# 配置 alembic.ini
# 修改 sqlalchemy.url = sqlite:///./bookmark.db

# 配置 alembic/env.py
# 在文件开头添加：
from app.models import Base
target_metadata = Base.metadata

# 生成迁移脚本
alembic revision --autogenerate -m "add tags table"

# 执行迁移
alembic upgrade head
```

---

## 实现标签 API

### 1. 更新 Schema

创建 `app/schemas/tag.py`：

```python
from pydantic import BaseModel
from datetime import datetime

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# 更新书签 Schema
class BookmarkCreate(BaseModel):
    title: str
    url: str
    description: str | None = None
    tag_names: list[str] = []  # 新增：标签名列表

class BookmarkResponse(BaseModel):
    id: int
    title: str
    url: str
    description: str | None
    created_at: datetime
    tags: list[TagResponse]  # 新增：关联的标签
    
    class Config:
        from_attributes = True
```

### 2. 更新 CRUD 操作

在 `app/crud.py` 添加标签相关函数：

```python
from sqlalchemy.orm import Session
from app import models, schemas

# ====== 标签 CRUD ======
def get_tag_by_name(db: Session, name: str):
    """通过名称获取标签"""
    return db.query(models.Tag).filter(models.Tag.name == name).first()

def get_or_create_tag(db: Session, name: str):
    """获取或创建标签"""
    tag = get_tag_by_name(db, name)
    if not tag:
        tag = models.Tag(name=name)
        db.add(tag)
        db.commit()
        db.refresh(tag)
    return tag

def get_all_tags(db: Session):
    """获取所有标签"""
    return db.query(models.Tag).all()

def get_tag_with_count(db: Session):
    """获取标签及其书签数量"""
    from sqlalchemy import func
    
    return db.query(
        models.Tag.id,
        models.Tag.name,
        func.count(models.Bookmark.id).label('bookmark_count')
    )\
    .outerjoin(models.Tag.bookmarks)\
    .group_by(models.Tag.id)\
    .all()

# ====== 更新书签 CRUD ======
def create_bookmark_with_tags(
    db: Session,
    bookmark: schemas.BookmarkCreate,
    user_id: int
):
    """创建书签并关联标签"""
    # 创建书签
    db_bookmark = models.Bookmark(
        title=bookmark.title,
        url=bookmark.url,
        description=bookmark.description,
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

def update_bookmark_tags(
    db: Session,
    bookmark_id: int,
    tag_names: list[str]
):
    """更新书签的标签"""
    bookmark = db.query(models.Bookmark).filter(models.Bookmark.id == bookmark_id).first()
    if not bookmark:
        return None
    
    # 清空现有标签
    bookmark.tags.clear()
    
    # 添加新标签
    for tag_name in tag_names:
        tag = get_or_create_tag(db, tag_name)
        bookmark.tags.append(tag)
    
    db.commit()
    db.refresh(bookmark)
    return bookmark

def get_bookmarks_by_tag(
    db: Session,
    tag_name: str,
    user_id: int,
    skip: int = 0,
    limit: int = 100
):
    """通过标签筛选书签"""
    return db.query(models.Bookmark)\
        .join(models.Bookmark.tags)\
        .filter(
            models.Tag.name == tag_name,
            models.Bookmark.user_id == user_id
        )\
        .offset(skip)\
        .limit(limit)\
        .all()
```

### 3. 创建标签路由

创建 `app/routers/tags.py`：

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import crud, schemas
from app.routers.auth import get_current_user

router = APIRouter(prefix="/tags", tags=["标签"])

@router.get("/", response_model=List[schemas.TagResponse])
def get_tags(db: Session = Depends(get_db)):
    """获取所有标签"""
    return crud.get_all_tags(db)

@router.get("/stats")
def get_tags_stats(db: Session = Depends(get_db)):
    """获取标签统计"""
    results = crud.get_tag_with_count(db)
    return [
        {
            "id": tag_id,
            "name": name,
            "bookmark_count": count
        }
        for tag_id, name, count in results
    ]

@router.get("/{tag_name}/bookmarks", response_model=List[schemas.BookmarkResponse])
def get_bookmarks_by_tag(
    tag_name: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """通过标签获取书签"""
    return crud.get_bookmarks_by_tag(db, tag_name, current_user.id, skip, limit)
```

### 4. 更新书签路由

在 `app/routers/bookmarks.py` 中更新：

```python
@router.post("/", response_model=schemas.BookmarkResponse, status_code=201)
def create_bookmark(
    bookmark: schemas.BookmarkCreate,  # 现在包含 tag_names
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """创建书签（支持标签）"""
    return crud.create_bookmark_with_tags(db, bookmark, current_user.id)

@router.put("/{bookmark_id}/tags")
def update_tags(
    bookmark_id: int,
    tag_names: List[str],
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """更新书签的标签"""
    bookmark = crud.update_bookmark_tags(db, bookmark_id, tag_names)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")
    
    # 验证权限
    if bookmark.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限")
    
    return {"message": "标签更新成功", "tags": [tag.name for tag in bookmark.tags]}
```

### 5. 注册路由

在 `app/main.py` 中添加：

```python
from app.routers import bookmarks, auth, tags  # 新增 tags

app.include_router(auth.router)
app.include_router(bookmarks.router)
app.include_router(tags.router)  # 新增
```

---

## 测试标签功能

### 1. 创建带标签的书签

```bash
curl -X POST "http://localhost:8000/bookmarks/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "FastAPI 官方文档",
    "url": "https://fastapi.tiangolo.com",
    "description": "FastAPI 官方教程",
    "tag_names": ["Python", "FastAPI", "后端"]
  }'
```

响应：
```json
{
  "id": 1,
  "title": "FastAPI 官方文档",
  "url": "https://fastapi.tiangolo.com",
  "description": "FastAPI 官方教程",
  "created_at": "2024-01-01T00:00:00",
  "tags": [
    {"id": 1, "name": "Python", "created_at": "..."},
    {"id": 2, "name": "FastAPI", "created_at": "..."},
    {"id": 3, "name": "后端", "created_at": "..."}
  ]
}
```

### 2. 获取所有标签

```bash
curl "http://localhost:8000/tags/"
```

### 3. 通过标签筛选书签

```bash
curl "http://localhost:8000/tags/Python/bookmarks" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 更新书签标签

```bash
curl -X PUT "http://localhost:8000/bookmarks/1/tags" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '["Python", "教程", "Web开发"]'
```

---

## 常见问题

### 1. 如何避免标签重复？

在创建标签时，使用 `get_or_create_tag` 函数：

```python
def get_or_create_tag(db: Session, name: str):
    tag = db.query(Tag).filter(Tag.name == name).first()
    if not tag:
        tag = Tag(name=name)
        db.add(tag)
        db.commit()
    return tag
```

### 2. 删除书签时标签怎么处理？

使用 `CASCADE` 级联删除：

```python
bookmark_tags = Table(
    'bookmark_tags',
    Base.metadata,
    Column('bookmark_id', ForeignKey('bookmarks.id', ondelete='CASCADE')),
    Column('tag_id', ForeignKey('tags.id', ondelete='CASCADE'))
)
```

删除书签时，关联表的记录会自动删除，但 `tags` 表的标签会保留。

### 3. 如何实现标签搜索？

```python
def search_tags(db: Session, keyword: str):
    return db.query(Tag)\
        .filter(Tag.name.contains(keyword))\
        .all()
```

---

## 小结

这一章我们完成了：

- ✅ 理解多对多关系设计
- ✅ 创建关联表（`bookmark_tags`）
- ✅ 实现标签 CRUD 操作
- ✅ 为书签添加标签功能
- ✅ 按标签筛选书签

**你的项目现在有**：
```
用户系统（注册/登录）→ 书签管理（CRUD）→ 标签系统（分类）
```

**下一步**：用户量增加后，系统变慢了，怎么优化？

---

上一章：[第一个 API 项目实战](/blog/backend/python-fullstack/chapter-03/)

下一章：[性能优化实战](/blog/backend/python-fullstack/chapter-05/)
