# 第5章：性能优化实战

## 用户反馈

在第 4 章，我们为书签系统添加了标签功能。现在用户量增加了，开始有人抱怨：

> "我的书签列表加载好慢啊，能优化一下吗？"

这一章我们要做的：
- ✅ 找到性能瓶颈（慢查询）
- ✅ 优化数据库查询
- ✅ 添加 Redis 缓存
- ✅ 改造成异步 API
- ✅ 压力测试验证效果

::: tip
这是一个真实的性能优化场景，你会学到如何发现问题、分析原因、逐步优化。
:::

---

## 阶段 1：发现问题

### 1. 添加性能监控

首先，我们要知道哪里慢。创建 `app/middleware.py`：

```python
import time
from fastapi import Request
import logging

logger = logging.getLogger(__name__)

async def log_requests(request: Request, call_next):
    """记录每个请求的耗时"""
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"completed in {process_time:.2f}s"
    )
    
    # 添加响应头
    response.headers["X-Process-Time"] = str(process_time)
    
    return response
```

在 `app/main.py` 中注册：

```python
from app.middleware import log_requests

app = FastAPI()
app.middleware("http")(log_requests)
```

### 2. 模拟数据生成

创建测试数据脚本 `scripts/generate_test_data.py`：

```python
import sys
sys.path.append(".")

from app.database import SessionLocal
from app.models import User, Bookmark, Tag
from app.auth import get_password_hash
import random

def generate_test_data():
    db = SessionLocal()
    
    # 创建测试用户
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("password123")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 创建标签
    tag_names = ["Python", "JavaScript", "React", "FastAPI", "Tutorial", 
                 "Backend", "Frontend", "Database", "DevOps", "AI"]
    tags = []
    for name in tag_names:
        tag = Tag(name=name)
        db.add(tag)
        tags.append(tag)
    db.commit()
    
    # 创建 1000 个书签
    print("开始生成书签...")
    for i in range(1000):
        bookmark = Bookmark(
            title=f"Bookmark {i+1}",
            url=f"https://example.com/bookmark-{i+1}",
            description=f"This is bookmark number {i+1}",
            user_id=user.id
        )
        
        # 随机添加 1-3 个标签
        num_tags = random.randint(1, 3)
        bookmark.tags = random.sample(tags, num_tags)
        
        db.add(bookmark)
        
        if (i + 1) % 100 == 0:
            print(f"已生成 {i+1} 个书签")
            db.commit()
    
    db.commit()
    db.close()
    print("✅ 测试数据生成完成！")

if __name__ == "__main__":
    generate_test_data()
```

运行脚本：

```bash
python scripts/generate_test_data.py
```

### 3. 压力测试

安装压测工具：

```bash
pip install locust
```

创建 `locustfile.py`：

```python
from locust import HttpUser, task, between
import json

class BookmarkUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """登录获取 token"""
        response = self.client.post("/auth/login", data={
            "username": "testuser",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
    
    @task(3)
    def get_bookmarks(self):
        """获取书签列表（高频操作）"""
        self.client.get(
            "/bookmarks/",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def get_bookmarks_by_tag(self):
        """按标签筛选"""
        self.client.get(
            "/tags/Python/bookmarks",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def get_tags(self):
        """获取标签统计"""
        self.client.get("/tags/stats")
```

启动压测：

```bash
# 启动 Web UI
locust

# 浏览器打开 http://localhost:8089
# 设置：100 用户，每秒增加 10 个
```

**压测结果（优化前）**：
```
请求              平均响应时间    95% 分位
GET /bookmarks/       850ms       1200ms  ❌
GET /tags/Python/...  920ms       1500ms  ❌
GET /tags/stats       450ms       650ms   ⚠️
```

---

## 阶段 2：优化数据库查询

### 问题 1：N+1 查询问题

**当前代码**（在 `app/routers/bookmarks.py`）：

```python
@router.get("/", response_model=List[BookmarkResponse])
def get_bookmarks(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    bookmarks = db.query(Bookmark)\
        .filter(Bookmark.user_id == current_user.id)\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return bookmarks  # 这里会触发 N+1 查询！
```

**问题分析**：

```
1. 查询 20 个书签               → 1 次查询
2. 每个书签加载 tags 关系        → 20 次查询
总计：21 次数据库查询！
```

**解决方案：急切加载**

更新 `app/crud.py`：

```python
from sqlalchemy.orm import joinedload

def get_user_bookmarks(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20
):
    """获取用户书签（优化：急切加载标签）"""
    return db.query(Bookmark)\
        .options(joinedload(Bookmark.tags))  # 关键：一次性加载标签
        .filter(Bookmark.user_id == user_id)\
        .offset(skip)\
        .limit(limit)\
        .all()
```

**效果对比**：
```
优化前：21 次查询，850ms
优化后：1 次查询（JOIN），320ms  ✅ 提升 62%
```

### 问题 2：缺少索引

**慢查询日志**（SQLite 启用方法）：

```python
# 在 app/database.py 中添加
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

**发现的慢查询**：

```sql
SELECT * FROM bookmarks WHERE user_id = 1;  -- 没有索引！
```

**添加索引**：

更新 `app/models.py`：

```python
class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)  # 新增索引
    url = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # 新增索引
    created_at = Column(DateTime, default=datetime.utcnow, index=True)  # 新增索引
```

**使用 Alembic 应用索引**：

```bash
alembic revision --autogenerate -m "add indexes"
alembic upgrade head
```

**效果对比**：
```
优化前：全表扫描 1000 行，320ms
优化后：索引查询 20 行，120ms  ✅ 提升 63%
```

---

## 阶段 3：添加 Redis 缓存

### 1. 安装 Redis

**Windows**：
```bash
# 使用 Chocolatey
choco install redis-64

# 或下载 MSI 安装包
# https://github.com/microsoftarchive/redis/releases
```

**macOS**：
```bash
brew install redis
brew services start redis
```

**Linux**：
```bash
sudo apt install redis-server
sudo systemctl start redis
```

安装 Python 客户端：

```bash
pip install redis hiredis
```

### 2. 封装 Redis 服务

创建 `app/cache.py`：

```python
import redis
import json
from typing import Optional, Any
import os

class RedisCache:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=0,
            decode_responses=True
        )
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        value = self.redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    
    def set(self, key: str, value: Any, expire: int = 300):
        """设置缓存（默认 5 分钟过期）"""
        self.redis_client.setex(
            key,
            expire,
            json.dumps(value, default=str)  # default=str 处理 datetime
        )
    
    def delete(self, key: str):
        """删除缓存"""
        self.redis_client.delete(key)
    
    def delete_pattern(self, pattern: str):
        """删除匹配的所有键"""
        keys = self.redis_client.keys(pattern)
        if keys:
            self.redis_client.delete(*keys)

# 全局实例
cache = RedisCache()
```

### 3. 使用缓存

更新 `app/routers/bookmarks.py`：

```python
from app.cache import cache
import hashlib

def generate_cache_key(user_id: int, skip: int, limit: int) -> str:
    """生成缓存键"""
    return f"bookmarks:user:{user_id}:skip:{skip}:limit:{limit}"

@router.get("/", response_model=List[BookmarkResponse])
def get_bookmarks(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. 尝试从缓存获取
    cache_key = generate_cache_key(current_user.id, skip, limit)
    cached_data = cache.get(cache_key)
    
    if cached_data:
        return cached_data
    
    # 2. 缓存未命中，查询数据库
    bookmarks = crud.get_user_bookmarks(db, current_user.id, skip, limit)
    
    # 3. 转换为可序列化格式
    result = [BookmarkResponse.model_validate(b) for b in bookmarks]
    result_dict = [r.model_dump() for r in result]
    
    # 4. 写入缓存
    cache.set(cache_key, result_dict, expire=300)  # 5 分钟
    
    return result

@router.post("/", response_model=BookmarkResponse, status_code=201)
def create_bookmark(
    bookmark: BookmarkCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 创建书签
    new_bookmark = crud.create_bookmark_with_tags(db, bookmark, current_user.id)
    
    # 清除该用户的缓存
    cache.delete_pattern(f"bookmarks:user:{current_user.id}:*")
    
    return new_bookmark
```

### 4. 缓存标签统计

更新 `app/routers/tags.py`：

```python
@router.get("/stats")
def get_tags_stats(db: Session = Depends(get_db)):
    """获取标签统计（带缓存）"""
    cache_key = "tags:stats"
    cached = cache.get(cache_key)
    
    if cached:
        return cached
    
    results = crud.get_tag_with_count(db)
    data = [
        {"id": tag_id, "name": name, "bookmark_count": count}
        for tag_id, name, count in results
    ]
    
    cache.set(cache_key, data, expire=600)  # 10 分钟
    return data
```

**效果对比**：
```
优化前：120ms（数据库查询）
优化后（缓存命中）：8ms  ✅ 提升 93%
```

---

## 阶段 4：改造成异步 API

### 1. 安装异步数据库驱动

```bash
pip install asyncpg aiosqlite  # PostgreSQL / SQLite
pip install sqlalchemy[asyncio]
```

### 2. 创建异步数据库配置

创建 `app/database_async.py`：

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

# SQLite 异步连接
ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./bookmark.db"

# PostgreSQL 异步连接（生产环境）
# ASYNC_DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/dbname"

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_async_db():
    """异步数据库依赖"""
    async with AsyncSessionLocal() as session:
        yield session
```

### 3. 异步 CRUD 操作

创建 `app/crud_async.py`：

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app import models, schemas

async def get_user_bookmarks_async(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 20
):
    """异步获取用户书签"""
    query = (
        select(models.Bookmark)
        .options(selectinload(models.Bookmark.tags))  # 异步版本的 joinedload
        .filter(models.Bookmark.user_id == user_id)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    return result.scalars().all()

async def create_bookmark_async(
    db: AsyncSession,
    bookmark: schemas.BookmarkCreate,
    user_id: int
):
    """异步创建书签"""
    db_bookmark = models.Bookmark(
        title=bookmark.title,
        url=bookmark.url,
        description=bookmark.description,
        user_id=user_id
    )
    
    # 添加标签
    for tag_name in bookmark.tag_names:
        query = select(models.Tag).filter(models.Tag.name == tag_name)
        result = await db.execute(query)
        tag = result.scalar_one_or_none()
        
        if not tag:
            tag = models.Tag(name=tag_name)
            db.add(tag)
            await db.flush()  # 获取 tag.id
        
        db_bookmark.tags.append(tag)
    
    db.add(db_bookmark)
    await db.commit()
    await db.refresh(db_bookmark)
    
    return db_bookmark
```

### 4. 异步路由

创建 `app/routers/bookmarks_async.py`：

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database_async import get_async_db
from app import crud_async, schemas
from app.routers.auth import get_current_user
from app.cache import cache

router = APIRouter(prefix="/async/bookmarks", tags=["书签（异步）"])

@router.get("/", response_model=List[schemas.BookmarkResponse])
async def get_bookmarks_async(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_current_user)
):
    """异步获取书签列表"""
    cache_key = f"bookmarks:user:{current_user.id}:skip:{skip}:limit:{limit}"
    
    # 尝试缓存
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    # 异步查询数据库
    bookmarks = await crud_async.get_user_bookmarks_async(
        db, current_user.id, skip, limit
    )
    
    # 序列化并缓存
    result = [schemas.BookmarkResponse.model_validate(b) for b in bookmarks]
    result_dict = [r.model_dump() for r in result]
    cache.set(cache_key, result_dict)
    
    return result

@router.post("/", response_model=schemas.BookmarkResponse, status_code=201)
async def create_bookmark_async(
    bookmark: schemas.BookmarkCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_current_user)
):
    """异步创建书签"""
    new_bookmark = await crud_async.create_bookmark_async(
        db, bookmark, current_user.id
    )
    
    # 清除缓存
    cache.delete_pattern(f"bookmarks:user:{current_user.id}:*")
    
    return new_bookmark
```

### 5. 注册异步路由

在 `app/main.py`：

```python
from app.routers import bookmarks, bookmarks_async

app.include_router(bookmarks.router)
app.include_router(bookmarks_async.router)  # 新增
```

---

## 阶段 5：性能对比测试

### 压测配置

更新 `locustfile.py`：

```python
class BookmarkUser(HttpUser):
    @task
    def test_sync_api(self):
        """测试同步 API"""
        self.client.get(
            "/bookmarks/",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task
    def test_async_api(self):
        """测试异步 API"""
        self.client.get(
            "/async/bookmarks/",
            headers={"Authorization": f"Bearer {self.token}"}
        )
```

### 最终性能对比

| 优化阶段 | 平均响应时间 | 95% 分位 | 提升 |
|---------|-------------|---------|------|
| **原始版本** | 850ms | 1200ms | - |
| + 急切加载 | 320ms | 450ms | 62% ✅ |
| + 添加索引 | 120ms | 180ms | 86% ✅ |
| + Redis 缓存 | 8ms（命中） | 15ms | 99% 🎉 |
| + 异步改造 | 5ms（命中） | 12ms | 99.4% 🚀 |

**并发能力对比**：

```
同步 API：最大 50 QPS（之后响应时间暴增）
异步 API：最大 500+ QPS（稳定）  ✅ 10 倍提升
```

---

## 缓存策略最佳实践

### 1. 缓存失效策略

```python
class CacheManager:
    @staticmethod
    def invalidate_user_bookmarks(user_id: int):
        """用户书签变更时清除缓存"""
        cache.delete_pattern(f"bookmarks:user:{user_id}:*")
    
    @staticmethod
    def invalidate_tag_stats():
        """标签变更时清除统计缓存"""
        cache.delete("tags:stats")
    
    @staticmethod
    def invalidate_all_bookmarks():
        """清除所有书签缓存"""
        cache.delete_pattern("bookmarks:*")
```

### 2. 缓存穿透保护

```python
def get_bookmark_with_cache(bookmark_id: int, db: Session):
    """防止缓存穿透"""
    cache_key = f"bookmark:{bookmark_id}"
    
    # 尝试缓存
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    # 查询数据库
    bookmark = crud.get_bookmark(db, bookmark_id)
    
    if bookmark:
        cache.set(cache_key, bookmark, expire=600)
    else:
        # 缓存空结果，防止重复查询不存在的数据
        cache.set(cache_key, {"not_found": True}, expire=60)
    
    return bookmark
```

### 3. 缓存预热

```python
@app.on_event("startup")
async def warmup_cache():
    """应用启动时预热缓存"""
    db = SessionLocal()
    
    # 预热热门标签
    tags = crud.get_tag_with_count(db)
    cache.set("tags:stats", tags, expire=3600)
    
    db.close()
    print("✅ 缓存预热完成")
```

---

## 监控与调试

### 1. 添加性能指标

创建 `app/metrics.py`：

```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import Response

# 请求计数
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# 响应时间直方图
request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

@app.get("/metrics")
def metrics():
    """Prometheus 监控指标"""
    return Response(generate_latest(), media_type="text/plain")
```

### 2. 慢查询日志

```python
import time
import logging
from sqlalchemy import event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.time()

@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total_time = time.time() - context._query_start_time
    
    if total_time > 0.1:  # 慢查询阈值 100ms
        logger.warning(
            f"慢查询 ({total_time:.2f}s): {statement[:100]}..."
        )
```

---

## 小结

这一章我们完成了完整的性能优化：

- ✅ **发现问题**：性能监控 + 压力测试
- ✅ **优化查询**：解决 N+1 问题、添加索引
- ✅ **添加缓存**：Redis 缓存热门数据
- ✅ **异步改造**：提升并发能力 10 倍
- ✅ **监控验证**：确保优化效果

**性能提升总结**：
```
响应时间：850ms → 5ms（缓存命中） ✅ 99.4% 提升
并发能力：50 QPS → 500+ QPS      ✅ 10 倍提升
```

**你的项目现在具备**：
```
用户系统 → 书签 CRUD → 标签分类 → 高性能 API ✅
```

**下一步**：给书签加上 AI 功能，自动生成摘要！

---

上一章：[书签标签系统](/blog/backend/python-fullstack/chapter-04/)

下一章：[AI 摘要生成器](/blog/backend/python-fullstack/chapter-06/)
