# 第5章：异步编程与性能优化

## Python 异步编程

作为前端工程师，你已经熟悉 JavaScript 的 async/await。Python 的异步编程概念类似，但有一些细微差别。

::: tip
Python 的异步是**真正的并发**，不像 Node.js 是单线程事件循环。但在 FastAPI 中，用法和 Node.js 非常相似。
:::

## async/await 对比

### JavaScript (Node.js)

```js
// 异步函数
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return data;
}

// 并发请求
async function fetchMultiple() {
  const [users, posts] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/posts')
  ]);
  return { users, posts };
}
```

### Python (FastAPI)

```python
import httpx

# 异步函数
async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get('https://api.example.com/data')
        data = response.json()
        return data

# 并发请求
async def fetch_multiple():
    async with httpx.AsyncClient() as client:
        users_task = client.get('/api/users')
        posts_task = client.get('/api/posts')
        
        users_response, posts_response = await asyncio.gather(
            users_task,
            posts_task
        )
        
        return {
            "users": users_response.json(),
            "posts": posts_response.json()
        }
```

## 同步 vs 异步路由

### 何时使用异步？

```python
from fastapi import FastAPI
import httpx
import time

app = FastAPI()

# ❌ 同步路由 - 阻塞其他请求
@app.get("/sync")
def sync_route():
    time.sleep(2)  # 模拟耗时操作（阻塞）
    return {"message": "Done"}

# ✅ 异步路由 - 不阻塞
@app.get("/async")
async def async_route():
    await asyncio.sleep(2)  # 模拟耗时操作（不阻塞）
    return {"message": "Done"}
```

**测试差异**：
```bash
# 同步：10 个请求总耗时 20 秒（串行执行）
ab -n 10 -c 10 http://localhost:8000/sync

# 异步：10 个请求总耗时 2 秒（并发执行）
ab -n 10 -c 10 http://localhost:8000/async
```

### 规则：什么时候用 async？

| 场景 | 用同步 | 用异步 |
|------|--------|--------|
| CPU 密集型（计算、加密） | ✅ | ❌ |
| I/O 密集型（网络、数据库） | ❌ | ✅ |
| 简单 CRUD | ✅ | 可选 |
| 调用第三方 API | ❌ | ✅ |
| 文件读写 | ❌ | ✅ |

## 异步数据库操作

### 安装异步数据库驱动

```bash
pip install databases[asyncpg]  # PostgreSQL
pip install aiosqlite           # SQLite
```

### 配置异步数据库

创建 `app/database_async.py`：

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# SQLite 异步连接
DATABASE_URL = "sqlite+aiosqlite:///./bookmark_async.db"

# PostgreSQL 异步连接
# DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session
```

### 异步 CRUD 操作

更新 `app/crud.py`：

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models, schemas

# 异步获取用户书签
async def get_bookmarks_async(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Bookmark)
        .filter(models.Bookmark.user_id == user_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

# 异步创建书签
async def create_bookmark_async(db: AsyncSession, bookmark: schemas.BookmarkCreate, user_id: int):
    db_bookmark = models.Bookmark(**bookmark.dict(), user_id=user_id)
    db.add(db_bookmark)
    await db.commit()
    await db.refresh(db_bookmark)
    return db_bookmark

# 异步复杂查询（带关联）
async def get_user_with_bookmarks_async(db: AsyncSession, user_id: int):
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(models.User)
        .options(selectinload(models.User.bookmarks))
        .filter(models.User.id == user_id)
    )
    return result.scalar_one_or_none()
```

### 异步路由实现

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database_async import get_async_db
from app import crud, schemas

router = APIRouter(prefix="/bookmarks", tags=["书签（异步）"])

@router.get("/", response_model=list[schemas.BookmarkResponse])
async def get_bookmarks(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db)
):
    bookmarks = await crud.get_bookmarks_async(db, skip=skip, limit=limit)
    return bookmarks

@router.post("/", response_model=schemas.BookmarkResponse)
async def create_bookmark(
    bookmark: schemas.BookmarkCreate,
    db: AsyncSession = Depends(get_async_db)
):
    return await crud.create_bookmark_async(db, bookmark)
```

## 并发请求优化

### 场景：调用多个外部 API

**❌ 同步方式（慢）**：
```python
@app.get("/user-info/{user_id}")
async def get_user_info(user_id: int):
    # 串行执行，总耗时 = 各请求之和
    user = await fetch_user(user_id)          # 100ms
    posts = await fetch_user_posts(user_id)   # 200ms
    comments = await fetch_user_comments(user_id)  # 150ms
    # 总耗时：450ms
    
    return {"user": user, "posts": posts, "comments": comments}
```

**✅ 异步并发（快）**：
```python
import asyncio

@app.get("/user-info/{user_id}")
async def get_user_info(user_id: int):
    # 并发执行，总耗时 = 最慢的请求
    user, posts, comments = await asyncio.gather(
        fetch_user(user_id),
        fetch_user_posts(user_id),
        fetch_user_comments(user_id)
    )
    # 总耗时：200ms（最慢的那个）
    
    return {"user": user, "posts": posts, "comments": comments}
```

### 实战示例：聚合 API

```python
import httpx
import asyncio

@app.get("/dashboard")
async def get_dashboard():
    async with httpx.AsyncClient() as client:
        # 并发请求多个数据源
        tasks = [
            client.get("https://api1.example.com/data"),
            client.get("https://api2.example.com/stats"),
            client.get("https://api3.example.com/summary"),
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果（包括错误处理）
        results = []
        for resp in responses:
            if isinstance(resp, Exception):
                results.append({"error": str(resp)})
            else:
                results.append(resp.json())
        
        return {
            "data": results[0],
            "stats": results[1],
            "summary": results[2]
        }
```

## 缓存策略

### 安装 Redis

```bash
pip install redis[hiredis] aioredis
```

### Redis 缓存封装

创建 `app/cache.py`：

```python
import json
from functools import wraps
import redis.asyncio as redis
from typing import Optional, Any

# Redis 连接
redis_client = redis.from_url("redis://localhost", decode_responses=True)

async def get_cache(key: str) -> Optional[Any]:
    """获取缓存"""
    value = await redis_client.get(key)
    return json.loads(value) if value else None

async def set_cache(key: str, value: Any, expire: int = 300):
    """设置缓存（默认 5 分钟）"""
    await redis_client.set(key, json.dumps(value), ex=expire)

async def delete_cache(key: str):
    """删除缓存"""
    await redis_client.delete(key)

# 缓存装饰器
def cached(key_prefix: str, expire: int = 300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{key_prefix}:{args}:{kwargs}"
            
            # 尝试从缓存获取
            cached_value = await get_cache(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 缓存未命中，执行函数
            result = await func(*args, **kwargs)
            
            # 保存到缓存
            await set_cache(cache_key, result, expire)
            
            return result
        return wrapper
    return decorator
```

### 使用缓存

```python
from app.cache import cached, delete_cache

# 缓存 API 响应
@app.get("/bookmarks/{bookmark_id}")
@cached(key_prefix="bookmark", expire=600)  # 缓存 10 分钟
async def get_bookmark(bookmark_id: int, db: AsyncSession = Depends(get_async_db)):
    bookmark = await crud.get_bookmark_async(db, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Not found")
    return bookmark

# 更新时清除缓存
@app.put("/bookmarks/{bookmark_id}")
async def update_bookmark(bookmark_id: int, data: schemas.BookmarkUpdate):
    # 清除缓存
    await delete_cache(f"bookmark:{bookmark_id}")
    
    # 更新数据库
    updated = await crud.update_bookmark_async(db, bookmark_id, data)
    return updated
```

## 数据库连接池配置

### 同步数据库连接池

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,          # 连接池大小
    max_overflow=20,       # 最大溢出连接数
    pool_pre_ping=True,    # 连接前检查有效性
    pool_recycle=3600,     # 连接回收时间（秒）
    echo_pool=True         # 打印连接池日志
)
```

### 异步数据库连接池

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True
)
```

## 性能测试

### 安装工具

```bash
pip install locust
```

### 编写测试脚本

创建 `locustfile.py`：

```python
from locust import HttpUser, task, between

class BookmarkUser(HttpUser):
    wait_time = between(1, 3)  # 每个请求间隔 1-3 秒
    
    def on_start(self):
        """登录获取 token"""
        response = self.client.post("/auth/login", data={
            "username": "testuser",
            "password": "testpass"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)  # 权重 3（更频繁）
    def get_bookmarks(self):
        self.client.get("/bookmarks", headers=self.headers)
    
    @task(1)  # 权重 1（较少）
    def create_bookmark(self):
        self.client.post("/bookmarks", headers=self.headers, json={
            "title": "Test Bookmark",
            "url": "https://example.com"
        })
```

### 运行测试

```bash
# 启动 Locust Web UI
locust -f locustfile.py

# 打开 http://localhost:8089，设置用户数和启动速率
```

## 性能优化清单

### 1. 数据库优化

```python
# ✅ 使用索引
class Bookmark(Base):
    __tablename__ = "bookmarks"
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, index=True)

# ✅ 选择性加载字段
bookmarks = db.query(Bookmark.id, Bookmark.title).filter(...).all()

# ✅ 批量操作
db.bulk_insert_mappings(Bookmark, [{"title": "..."}, ...])
```

### 2. 缓存策略

```python
# ✅ 热数据缓存
@cached(key_prefix="popular_bookmarks", expire=3600)
async def get_popular_bookmarks():
    return await db.query(Bookmark).order_by(Bookmark.views.desc()).limit(10).all()

# ✅ 用户会话缓存
await redis_client.setex(f"session:{user_id}", 1800, session_data)
```

### 3. 异步优化

```python
# ✅ I/O 密集型用异步
@app.get("/external-data")
async def get_external_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com")
        return response.json()

# ❌ CPU 密集型不要用异步
def compute_hash(data):  # 不要加 async
    return hashlib.sha256(data).hexdigest()
```

### 4. 响应压缩

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### 5. 限流保护

```bash
pip install slowapi
```

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

@app.get("/api/data")
@limiter.limit("10/minute")  # 每分钟最多 10 次请求
async def get_data(request: Request):
    return {"data": "..."}
```

## 实战：优化书签 API

综合应用所有优化技巧：

```python
from fastapi import FastAPI, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.cache import cached, delete_cache
from app.database_async import get_async_db
import asyncio

@app.get("/bookmarks")
@cached(key_prefix="user_bookmarks", expire=300)
async def get_bookmarks(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_async_db)
):
    """获取书签（带缓存）"""
    bookmarks = await crud.get_bookmarks_async(db, user_id, skip, limit)
    return bookmarks

@app.get("/dashboard/{user_id}")
async def get_dashboard(user_id: int, db: AsyncSession = Depends(get_async_db)):
    """并发获取用户仪表盘数据"""
    # 并发执行多个数据库查询
    bookmarks_task = crud.get_bookmarks_async(db, user_id, limit=10)
    stats_task = crud.get_user_stats_async(db, user_id)
    tags_task = crud.get_user_tags_async(db, user_id)
    
    bookmarks, stats, tags = await asyncio.gather(
        bookmarks_task,
        stats_task,
        tags_task
    )
    
    return {
        "bookmarks": bookmarks,
        "stats": stats,
        "tags": tags
    }
```

## 监控与日志

### 添加请求日志

```python
import time
from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    print(f"{request.method} {request.url.path} - {process_time:.2f}s")
    
    return response
```

## 小结

这一章我们学习了：

- ✅ Python 异步编程原理
- ✅ 同步 vs 异步路由选择
- ✅ 异步数据库操作
- ✅ 并发请求优化
- ✅ Redis 缓存策略
- ✅ 数据库连接池配置
- ✅ 性能测试方法
- ✅ 完整的优化清单

::: tip
性能优化是渐进式的，先让代码跑起来，再根据性能瓶颈针对性优化。不要过早优化！
:::

---

**恭喜你完成基础篇！** 你现在已经掌握了：
- Python 后端开发核心技能
- FastAPI 完整开发流程
- 数据库设计与优化
- 异步编程与性能优化

**下一步：AI 集成篇** - 这才是重点，让你的后端具备 AI 能力！
