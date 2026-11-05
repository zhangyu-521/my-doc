# 第7章：智能书签问答（RAG）

## 用户需求

在第 6 章，我们实现了 AI 摘要生成。现在用户提出更高级的需求：

> "我有 1000+ 个书签，想找某个技术相关的资料，能不能直接问 AI？比如'有哪些 React 性能优化的资料？'"

这就是 **RAG（Retrieval-Augmented Generation）** —— 让 AI 基于你的私有数据回答问题。

这一章我们要做的：
- ✅ 理解 RAG 的工作原理
- ✅ 使用向量数据库（Qdrant）
- ✅ 实现书签向量化存储
- ✅ 实现语义搜索
- ✅ 构建问答系统

::: tip
RAG 是目前最实用的 AI 应用模式，让 LLM 能够访问你的私有知识库。
:::

---

## RAG 工作原理

### 传统搜索 vs 语义搜索

**传统搜索（关键词匹配）**：
```
用户：React 性能优化
数据库：WHERE title LIKE '%React%' AND title LIKE '%性能%'
结果：只能找到标题包含这些词的书签
```

**语义搜索（向量检索）**：
```
用户：React 性能优化
系统：将问题转为向量 [0.2, 0.8, 0.1, ...]
向量库：找最相似的书签向量
结果：能找到"如何让 React 组件渲染更快"这类语义相关的内容
```

### RAG 流程

```
用户提问
    ↓
将问题转为向量 (Embedding)
    ↓
在向量数据库中搜索相关书签 (Retrieval)
    ↓
将搜索结果作为上下文
    ↓
让 LLM 生成回答 (Generation)
```

---

## 准备工作

### 1. 安装依赖

```bash
# 向量数据库客户端
pip install qdrant-client

# 额外工具
pip install numpy
```

### 2. 启动 Qdrant（向量数据库）

**方式1：Docker（推荐）**：
```bash
docker run -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

**方式2：本地安装**：
```bash
# 下载: https://github.com/qdrant/qdrant/releases
# 解压后运行
./qdrant
```

访问 http://localhost:6333/dashboard 查看管理界面。

---

## 封装向量服务

创建 `app/services/vector.py`：

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from openai import OpenAI
import os
from typing import List, Dict
import hashlib

class VectorService:
    def __init__(self):
        # Qdrant 客户端
        self.qdrant = QdrantClient(
            host=os.getenv("QDRANT_HOST", "localhost"),
            port=int(os.getenv("QDRANT_PORT", 6333))
        )
        
        # OpenAI 客户端（用于生成 embedding）
        self.openai = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL")
        )
        
        self.collection_name = "bookmarks"
        self.embedding_model = "text-embedding-3-small"  # OpenAI
        # 或使用 DeepSeek: "deepseek-embedder"
        
        self._init_collection()
    
    def _init_collection(self):
        """初始化集合"""
        collections = self.qdrant.get_collections().collections
        collection_names = [col.name for col in collections]
        
        if self.collection_name not in collection_names:
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=1536,  # text-embedding-3-small 的维度
                    distance=Distance.COSINE  # 余弦相似度
                )
            )
            print(f"✅ 创建集合：{self.collection_name}")
    
    def get_embedding(self, text: str) -> List[float]:
        """生成文本的向量表示"""
        response = self.openai.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding
    
    def add_bookmark(
        self,
        bookmark_id: int,
        title: str,
        url: str,
        description: str = None,
        ai_summary: str = None,
        tags: List[str] = None
    ):
        """将书签添加到向量库"""
        # 构造文本（用于向量化）
        text_parts = [f"标题：{title}"]
        
        if description:
            text_parts.append(f"描述：{description}")
        
        if ai_summary:
            text_parts.append(f"摘要：{ai_summary}")
        
        if tags:
            text_parts.append(f"标签：{', '.join(tags)}")
        
        text = "\n".join(text_parts)
        
        # 生成向量
        vector = self.get_embedding(text)
        
        # 存储到 Qdrant
        point = PointStruct(
            id=bookmark_id,
            vector=vector,
            payload={
                "bookmark_id": bookmark_id,
                "title": title,
                "url": url,
                "description": description,
                "ai_summary": ai_summary,
                "tags": tags or []
            }
        )
        
        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=[point]
        )
    
    def search_bookmarks(
        self,
        query: str,
        limit: int = 5,
        score_threshold: float = 0.7
    ) -> List[Dict]:
        """语义搜索书签"""
        # 将查询转为向量
        query_vector = self.get_embedding(query)
        
        # 搜索
        results = self.qdrant.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold
        )
        
        # 格式化结果
        bookmarks = []
        for result in results:
            bookmarks.append({
                "bookmark_id": result.payload["bookmark_id"],
                "title": result.payload["title"],
                "url": result.payload["url"],
                "description": result.payload.get("description"),
                "ai_summary": result.payload.get("ai_summary"),
                "tags": result.payload.get("tags", []),
                "score": result.score  # 相似度得分
            })
        
        return bookmarks
    
    def delete_bookmark(self, bookmark_id: int):
        """从向量库删除书签"""
        self.qdrant.delete(
            collection_name=self.collection_name,
            points_selector=[bookmark_id]
        )
    
    def batch_add_bookmarks(self, bookmarks: List[Dict]):
        """批量添加书签"""
        points = []
        
        for bm in bookmarks:
            # 构造文本
            text_parts = [f"标题：{bm['title']}"]
            if bm.get('description'):
                text_parts.append(f"描述：{bm['description']}")
            if bm.get('ai_summary'):
                text_parts.append(f"摘要：{bm['ai_summary']}")
            if bm.get('tags'):
                text_parts.append(f"标签：{', '.join(bm['tags'])}")
            
            text = "\n".join(text_parts)
            vector = self.get_embedding(text)
            
            point = PointStruct(
                id=bm['id'],
                vector=vector,
                payload={
                    "bookmark_id": bm['id'],
                    "title": bm['title'],
                    "url": bm['url'],
                    "description": bm.get('description'),
                    "ai_summary": bm.get('ai_summary'),
                    "tags": bm.get('tags', [])
                }
            )
            points.append(point)
        
        # 批量插入
        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=points
        )

# 全局实例
vector_service = VectorService()
```

---

## 更新书签操作

### 1. 创建时自动向量化

更新 `app/crud.py` 的 `create_bookmark_with_tags` 函数：

```python
from app.services.vector import vector_service

def create_bookmark_with_tags(
    db: Session,
    bookmark: schemas.BookmarkCreate,
    user_id: int
):
    """创建书签并向量化"""
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
    
    # ====== 新增：向量化 ======
    try:
        vector_service.add_bookmark(
            bookmark_id=db_bookmark.id,
            title=db_bookmark.title,
            url=db_bookmark.url,
            description=db_bookmark.description,
            ai_summary=db_bookmark.ai_summary,
            tags=[tag.name for tag in db_bookmark.tags]
        )
    except Exception as e:
        print(f"向量化失败：{e}")
    
    return db_bookmark
```

### 2. 删除时清理向量

```python
def delete_bookmark(db: Session, bookmark_id: int, user_id: int):
    """删除书签及其向量"""
    bookmark = db.query(models.Bookmark).filter(
        models.Bookmark.id == bookmark_id
    ).first()
    
    if not bookmark:
        return False
    
    if bookmark.user_id != user_id:
        return False
    
    # 删除向量
    try:
        vector_service.delete_bookmark(bookmark_id)
    except Exception as e:
        print(f"删除向量失败：{e}")
    
    # 删除数据库记录
    db.delete(bookmark)
    db.commit()
    
    return True
```

---

## 实现问答 API

创建 `app/routers/qa.py`：

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.database import get_db
from app.routers.auth import get_current_user
from app.services.vector import vector_service
from app.services.llm import llm_service

router = APIRouter(prefix="/qa", tags=["问答"])

class QuestionRequest(BaseModel):
    question: str
    max_results: int = 5

class AnswerResponse(BaseModel):
    question: str
    answer: str
    sources: List[dict]

@router.post("/ask", response_model=AnswerResponse)
def ask_question(
    request: QuestionRequest,
    current_user = Depends(get_current_user)
):
    """基于书签库回答问题（RAG）"""
    # 1. 语义搜索相关书签
    relevant_bookmarks = vector_service.search_bookmarks(
        query=request.question,
        limit=request.max_results,
        score_threshold=0.6  # 相似度阈值
    )
    
    if not relevant_bookmarks:
        return AnswerResponse(
            question=request.question,
            answer="抱歉，我在你的书签库中没有找到相关内容。",
            sources=[]
        )
    
    # 2. 构造上下文
    context_parts = []
    for i, bm in enumerate(relevant_bookmarks, 1):
        ctx = f"【书签 {i}】\n"
        ctx += f"标题：{bm['title']}\n"
        ctx += f"URL：{bm['url']}\n"
        
        if bm.get('ai_summary'):
            ctx += f"摘要：{bm['ai_summary']}\n"
        elif bm.get('description'):
            ctx += f"描述：{bm['description']}\n"
        
        if bm.get('tags'):
            ctx += f"标签：{', '.join(bm['tags'])}\n"
        
        ctx += f"相似度：{bm['score']:.2f}\n"
        context_parts.append(ctx)
    
    context = "\n".join(context_parts)
    
    # 3. 构造提示词
    messages = [
        {
            "role": "system",
            "content": (
                "你是一个书签助手，帮助用户从他们的书签库中找到答案。\n"
                "基于提供的书签信息回答问题，引用具体的书签。\n"
                "如果书签中没有相关信息，明确说明。"
            )
        },
        {
            "role": "user",
            "content": (
                f"问题：{request.question}\n\n"
                f"相关书签：\n{context}\n\n"
                f"请基于以上书签回答问题。"
            )
        }
    ]
    
    # 4. 生成回答
    answer = llm_service.chat(messages, temperature=0.7)
    
    # 5. 返回结果
    return AnswerResponse(
        question=request.question,
        answer=answer,
        sources=[
            {
                "title": bm["title"],
                "url": bm["url"],
                "score": round(bm["score"], 2)
            }
            for bm in relevant_bookmarks
        ]
    )

@router.post("/search")
def semantic_search(
    request: QuestionRequest,
    current_user = Depends(get_current_user)
):
    """纯语义搜索（不生成答案）"""
    results = vector_service.search_bookmarks(
        query=request.question,
        limit=request.max_results
    )
    
    return {
        "query": request.question,
        "results": results
    }
```

在 `app/main.py` 注册路由：

```python
from app.routers import bookmarks, auth, tags, qa

app.include_router(qa.router)
```

---

## 批量向量化现有书签

创建脚本 `scripts/vectorize_bookmarks.py`：

```python
import sys
sys.path.append(".")

from app.database import SessionLocal
from app.models import Bookmark
from app.services.vector import vector_service

def vectorize_all_bookmarks():
    """将数据库中的所有书签向量化"""
    db = SessionLocal()
    
    try:
        bookmarks = db.query(Bookmark).all()
        total = len(bookmarks)
        
        print(f"开始向量化 {total} 个书签...")
        
        batch = []
        for i, bm in enumerate(bookmarks, 1):
            batch.append({
                "id": bm.id,
                "title": bm.title,
                "url": bm.url,
                "description": bm.description,
                "ai_summary": bm.ai_summary,
                "tags": [tag.name for tag in bm.tags]
            })
            
            # 每 10 个批量处理一次
            if len(batch) >= 10:
                vector_service.batch_add_bookmarks(batch)
                print(f"进度：{i}/{total}")
                batch = []
        
        # 处理剩余的
        if batch:
            vector_service.batch_add_bookmarks(batch)
        
        print("✅ 向量化完成！")
        
    finally:
        db.close()

if __name__ == "__main__":
    vectorize_all_bookmarks()
```

运行脚本：

```bash
python scripts/vectorize_bookmarks.py
```

---

## 测试问答系统

### 1. 纯语义搜索

```bash
curl -X POST "http://localhost:8000/qa/search" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "React 性能优化",
    "max_results": 5
  }'
```

响应：
```json
{
  "query": "React 性能优化",
  "results": [
    {
      "bookmark_id": 42,
      "title": "React 组件渲染优化技巧",
      "url": "https://example.com/react-perf",
      "ai_summary": "介绍 React.memo、useMemo 等性能优化方法",
      "tags": ["React", "性能"],
      "score": 0.89
    },
    {
      "bookmark_id": 156,
      "title": "如何避免 React 重复渲染",
      "url": "https://example.com/react-render",
      "score": 0.82
    }
  ]
}
```

### 2. 问答（RAG）

```bash
curl -X POST "http://localhost:8000/qa/ask" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "有哪些 React 性能优化的资料？"
  }'
```

响应：
```json
{
  "question": "有哪些 React 性能优化的资料？",
  "answer": "根据你的书签库，我找到了以下相关资料：\n\n1. **React 组件渲染优化技巧**：介绍了 React.memo、useMemo、useCallback 等性能优化方法。\n\n2. **如何避免 React 重复渲染**：详细讲解了组件重复渲染的原因和解决方案。\n\n这些资料都适合学习 React 性能优化。",
  "sources": [
    {
      "title": "React 组件渲染优化技巧",
      "url": "https://example.com/react-perf",
      "score": 0.89
    },
    {
      "title": "如何避免 React 重复渲染",
      "url": "https://example.com/react-render",
      "score": 0.82
    }
  ]
}
```

---

## 优化与改进

### 1. 混合搜索（向量 + 关键词）

```python
def hybrid_search(
    query: str,
    user_id: int,
    db: Session,
    limit: int = 5
):
    """混合搜索：语义 + 关键词"""
    # 1. 向量搜索
    vector_results = vector_service.search_bookmarks(query, limit=10)
    vector_ids = {bm["bookmark_id"] for bm in vector_results}
    
    # 2. 关键词搜索
    keyword_results = db.query(Bookmark)\
        .filter(
            Bookmark.user_id == user_id,
            or_(
                Bookmark.title.contains(query),
                Bookmark.description.contains(query)
            )
        )\
        .limit(10)\
        .all()
    
    keyword_ids = {bm.id for bm in keyword_results}
    
    # 3. 合并结果（去重）
    combined_ids = vector_ids.union(keyword_ids)
    
    # 4. 按相似度排序
    final_results = [
        bm for bm in vector_results
        if bm["bookmark_id"] in combined_ids
    ]
    
    return final_results[:limit]
```

### 2. 上下文压缩（节省 Token）

```python
def compress_context(bookmarks: List[Dict], max_tokens: int = 2000) -> str:
    """压缩上下文，只保留最重要的信息"""
    context_parts = []
    current_tokens = 0
    
    for bm in bookmarks:
        # 只保留标题和摘要（最重要）
        snippet = f"• {bm['title']}"
        if bm.get('ai_summary'):
            snippet += f"：{bm['ai_summary'][:100]}"
        
        snippet_tokens = llm_service.count_tokens(snippet)
        
        if current_tokens + snippet_tokens > max_tokens:
            break
        
        context_parts.append(snippet)
        current_tokens += snippet_tokens
    
    return "\n".join(context_parts)
```

### 3. 缓存常见问题

```python
from app.cache import cache
import hashlib

@router.post("/ask")
def ask_question(request: QuestionRequest, current_user = Depends(get_current_user)):
    # 生成缓存键
    cache_key = f"qa:{hashlib.md5(request.question.encode()).hexdigest()}"
    
    # 尝试缓存
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    # ... 正常流程 ...
    
    result = AnswerResponse(...)
    
    # 缓存结果（10 分钟）
    cache.set(cache_key, result.model_dump(), expire=600)
    
    return result
```

---

## 实战案例

### 案例1：技术问答

**用户问**："Python 异步编程有哪些资料？"

**系统响应**：
```
找到 3 个相关书签：

1. 【Python asyncio 完全指南】
   介绍了 async/await、事件循环、协程等核心概念
   https://example.com/asyncio-guide
   相似度：0.92

2. 【FastAPI 异步最佳实践】
   实战案例：如何在 FastAPI 中使用异步数据库
   https://example.com/fastapi-async
   相似度：0.85

基于以上资料，建议你先学习 asyncio 基础，再看 FastAPI 实战。
```

### 案例2：项目推荐

**用户问**："有没有 React + TypeScript 的实战项目？"

**系统响应**：
```
找到 2 个相关项目：

1. 【React TypeScript 管理后台】
   企业级后台模板，包含权限、路由、状态管理
   https://github.com/xxx/admin-template
   相似度：0.88

2. 【React + TS 组件库】
   从零搭建 UI 组件库的完整教程
   https://example.com/ui-lib-tutorial
   相似度：0.81

推荐先看管理后台项目学习架构，再研究组件库深入学习。
```

---

## 监控与调试

### 1. 向量搜索质量监控

```python
@router.get("/qa/stats")
def get_qa_stats(db: Session = Depends(get_db)):
    """问答系统统计"""
    # 统计向量数量
    collection_info = vector_service.qdrant.get_collection(
        collection_name="bookmarks"
    )
    
    return {
        "total_vectors": collection_info.points_count,
        "vector_dimension": collection_info.config.params.vectors.size,
        "distance_metric": collection_info.config.params.vectors.distance
    }
```

### 2. 搜索结果质量评估

```python
def evaluate_search_quality(query: str, expected_ids: List[int]):
    """评估搜索质量（离线测试）"""
    results = vector_service.search_bookmarks(query, limit=10)
    result_ids = [bm["bookmark_id"] for bm in results]
    
    # 计算精确率（Precision）
    hits = len(set(result_ids) & set(expected_ids))
    precision = hits / len(result_ids) if result_ids else 0
    
    # 计算召回率（Recall）
    recall = hits / len(expected_ids) if expected_ids else 0
    
    return {
        "precision": precision,
        "recall": recall,
        "f1": 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    }
```

---

## 成本优化

### Embedding 成本对比

| 模型 | 价格（$/1M tokens） | 维度 | 适用场景 |
|------|-------------------|------|---------|
| **text-embedding-3-small** | $0.02 | 1536 | 通用（推荐） |
| **text-embedding-3-large** | $0.13 | 3072 | 高精度 |
| **deepseek-embedder** | ¥0.0002 | 1024 | 极低成本 |

**建议**：
- 个人项目：DeepSeek Embedder（便宜 100 倍）
- 企业项目：OpenAI text-embedding-3-small（质量好）

---

## 小结

这一章我们完成了 RAG 问答系统：

- ✅ 理解 RAG 工作原理
- ✅ 集成 Qdrant 向量数据库
- ✅ 实现书签向量化存储
- ✅ 实现语义搜索
- ✅ 构建问答系统

**你的项目现在具备**：
```
用户系统 → 书签 CRUD → 标签分类 → 高性能 API → AI 摘要 → 智能问答 ✅
```

**下一步**：更进一步，实现 AI Agent，让系统能主动帮你整理书签！

---

上一章：[AI 摘要生成器](/blog/backend/python-fullstack/chapter-06/)

下一章：[AI 助手 Agent](/blog/backend/python-fullstack/chapter-08/)
