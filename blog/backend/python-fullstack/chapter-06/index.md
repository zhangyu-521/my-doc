# 第6章：AI 摘要生成器

## 用户需求

在第 5 章，我们优化了书签系统的性能。现在用户提出新需求：

> "我的书签太多了，能不能用 AI 自动生成摘要？这样我就能快速了解每个书签的内容。"

这一章我们要做的：
- ✅ 集成 OpenAI/DeepSeek API
- ✅ 为书签生成 AI 摘要
- ✅ 实现流式响应（打字效果）
- ✅ 批量生成（后台任务）
- ✅ Token 成本控制

::: tip
这是你的第一个 AI 功能！我们会用最简单的方式集成 LLM。
:::

---

## 准备工作

### 1. 安装依赖

```bash
pip install openai tiktoken python-dotenv
```

### 2. 获取 API Key

推荐使用 **DeepSeek**（便宜且兼容 OpenAI 接口）：

1. 访问 [https://platform.deepseek.com](https://platform.deepseek.com)
2. 注册账号
3. 创建 API Key
4. 充值 10 元（够用很久）

### 3. 配置环境变量

在项目根目录的 `.env` 文件中添加：

```bash
# DeepSeek API（兼容 OpenAI 格式）
OPENAI_API_KEY=sk-你的密钥
OPENAI_BASE_URL=https://api.deepseek.com

# 或使用 OpenAI
# OPENAI_API_KEY=sk-你的密钥
# OPENAI_BASE_URL=https://api.openai.com/v1
```

---

## 封装 LLM 服务

创建 `app/services/llm.py`：

```python
from openai import OpenAI
import os
from typing import List, Dict, Generator
import tiktoken

class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL")
        )
        self.model = "deepseek-chat"  # 或 "gpt-3.5-turbo"
        self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """计算文本的 token 数量"""
        return len(self.encoding.encode(text))
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """基础对话"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Generator[str, None, None]:
        """流式对话（打字效果）"""
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    def generate_bookmark_summary(
        self,
        title: str,
        url: str,
        description: str = None
    ) -> str:
        """生成书签摘要"""
        # 构造提示词
        content = f"标题：{title}\nURL：{url}"
        if description:
            content += f"\n描述：{description}"
        
        messages = [
            {
                "role": "system",
                "content": (
                    "你是一个专业的内容摘要助手。"
                    "请根据书签信息，生成一句话摘要（不超过 50 字）。"
                    "摘要要准确、简洁，突出核心内容。"
                )
            },
            {
                "role": "user",
                "content": f"请为以下书签生成摘要：\n\n{content}"
            }
        ]
        
        return self.chat(messages, temperature=0.3)
    
    def generate_tags_suggestion(
        self,
        title: str,
        description: str = None
    ) -> List[str]:
        """智能推荐标签"""
        content = f"标题：{title}"
        if description:
            content += f"\n描述：{description}"
        
        messages = [
            {
                "role": "system",
                "content": (
                    "你是一个标签推荐助手。"
                    "请根据书签信息，推荐 3-5 个合适的标签。"
                    "标签要简洁、准确，用逗号分隔。"
                    "只返回标签，不要其他内容。"
                )
            },
            {
                "role": "user",
                "content": content
            }
        ]
        
        result = self.chat(messages, temperature=0.5, max_tokens=50)
        
        # 解析标签
        tags = [tag.strip() for tag in result.split(',')]
        return tags[:5]  # 最多 5 个

# 创建全局实例
llm_service = LLMService()
```

---

## 更新数据模型

在 `app/models.py` 的 `Bookmark` 类中添加字段：

```python
class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    url = Column(String)
    description = Column(String)
    ai_summary = Column(String)  # 新增：AI 生成的摘要
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    owner = relationship("User", back_populates="bookmarks")
    tags = relationship("Tag", secondary=bookmark_tags, back_populates="bookmarks")
```

### 数据库迁移

```bash
# 方法1：删除重建（开发环境）
rm bookmark.db
python -c "from app.database import Base, engine; Base.metadata.create_all(engine)"

# 方法2：使用 Alembic（生产环境）
alembic revision --autogenerate -m "add ai_summary field"
alembic upgrade head
```

---

## 实现 AI 摘要 API

### 1. 更新 Schema

在 `app/schemas.py` 更新 `BookmarkResponse`：

```python
class BookmarkResponse(BaseModel):
    id: int
    title: str
    url: str
    description: str | None
    ai_summary: str | None  # 新增
    created_at: datetime
    tags: List[TagResponse]
    
    class Config:
        from_attributes = True
```

### 2. 添加路由

在 `app/routers/bookmarks.py` 添加：

```python
from fastapi.responses import StreamingResponse
from app.services.llm import llm_service

@router.post("/{bookmark_id}/generate-summary")
def generate_summary(
    bookmark_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """为书签生成 AI 摘要"""
    # 获取书签
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")
    
    # 验证权限
    if bookmark.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限")
    
    # 生成摘要
    summary = llm_service.generate_bookmark_summary(
        title=bookmark.title,
        url=bookmark.url,
        description=bookmark.description
    )
    
    # 保存到数据库
    bookmark.ai_summary = summary
    db.commit()
    
    # 清除缓存
    from app.cache import cache
    cache.delete_pattern(f"bookmarks:user:{current_user.id}:*")
    
    return {
        "bookmark_id": bookmark_id,
        "summary": summary
    }

@router.post("/{bookmark_id}/generate-summary/stream")
def generate_summary_stream(
    bookmark_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """流式生成摘要（打字效果）"""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not bookmark or bookmark.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="书签不存在")
    
    # 构造消息
    messages = [
        {
            "role": "system",
            "content": "你是一个专业的内容摘要助手。请生成一句话摘要（不超过 50 字）。"
        },
        {
            "role": "user",
            "content": f"标题：{bookmark.title}\nURL：{bookmark.url}"
        }
    ]
    
    def generate():
        full_summary = ""
        for chunk in llm_service.chat_stream(messages, temperature=0.3):
            full_summary += chunk
            # Server-Sent Events 格式
            yield f"data: {chunk}\n\n"
        
        # 生成完成后保存到数据库
        bookmark.ai_summary = full_summary
        db.commit()
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

@router.post("/{bookmark_id}/suggest-tags")
def suggest_tags(
    bookmark_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """AI 推荐标签"""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not bookmark or bookmark.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="书签不存在")
    
    # 生成标签建议
    suggested_tags = llm_service.generate_tags_suggestion(
        title=bookmark.title,
        description=bookmark.description
    )
    
    return {
        "bookmark_id": bookmark_id,
        "suggested_tags": suggested_tags
    }
```

---

## 批量生成摘要（后台任务）

### 1. 安装任务队列

```bash
pip install celery redis
```

### 2. 创建 Celery 配置

创建 `app/celery_app.py`：

```python
from celery import Celery
import os

celery_app = Celery(
    "bookmark_tasks",
    broker=f"redis://{os.getenv('REDIS_HOST', 'localhost')}:6379/0",
    backend=f"redis://{os.getenv('REDIS_HOST', 'localhost')}:6379/0"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
```

### 3. 创建任务

创建 `app/tasks.py`：

```python
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import Bookmark
from app.services.llm import llm_service
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def generate_summary_task(bookmark_id: int):
    """后台任务：生成单个书签摘要"""
    db = SessionLocal()
    
    try:
        bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
        if not bookmark:
            logger.error(f"书签 {bookmark_id} 不存在")
            return
        
        # 生成摘要
        summary = llm_service.generate_bookmark_summary(
            title=bookmark.title,
            url=bookmark.url,
            description=bookmark.description
        )
        
        # 保存
        bookmark.ai_summary = summary
        db.commit()
        
        logger.info(f"✅ 书签 {bookmark_id} 摘要生成完成")
        
    except Exception as e:
        logger.error(f"❌ 生成摘要失败：{e}")
    finally:
        db.close()

@celery_app.task
def batch_generate_summaries(user_id: int):
    """批量生成用户所有书签的摘要"""
    db = SessionLocal()
    
    try:
        bookmarks = db.query(Bookmark)\
            .filter(
                Bookmark.user_id == user_id,
                Bookmark.ai_summary == None  # 只处理未生成的
            )\
            .all()
        
        total = len(bookmarks)
        logger.info(f"开始批量生成 {total} 个书签摘要...")
        
        for i, bookmark in enumerate(bookmarks, 1):
            try:
                summary = llm_service.generate_bookmark_summary(
                    title=bookmark.title,
                    url=bookmark.url,
                    description=bookmark.description
                )
                
                bookmark.ai_summary = summary
                db.commit()
                
                logger.info(f"进度：{i}/{total}")
                
            except Exception as e:
                logger.error(f"书签 {bookmark.id} 处理失败：{e}")
                continue
        
        logger.info(f"✅ 批量生成完成！")
        
    finally:
        db.close()
```

### 4. 添加批量生成 API

在 `app/routers/bookmarks.py` 添加：

```python
from app.tasks import batch_generate_summaries

@router.post("/batch-generate-summaries")
def batch_generate(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """批量生成所有书签的摘要（后台任务）"""
    # 统计未生成摘要的书签数量
    count = db.query(Bookmark)\
        .filter(
            Bookmark.user_id == current_user.id,
            Bookmark.ai_summary == None
        )\
        .count()
    
    if count == 0:
        return {"message": "所有书签都已生成摘要"}
    
    # 提交后台任务
    task = batch_generate_summaries.delay(current_user.id)
    
    return {
        "message": f"已提交批量生成任务，共 {count} 个书签",
        "task_id": task.id
    }

@router.get("/task-status/{task_id}")
def get_task_status(task_id: str):
    """查询任务状态"""
    from celery.result import AsyncResult
    
    task = AsyncResult(task_id)
    
    return {
        "task_id": task_id,
        "status": task.state,
        "result": task.result if task.ready() else None
    }
```

### 5. 启动 Celery Worker

```bash
# 终端1：启动 FastAPI
uvicorn app.main:app --reload

# 终端2：启动 Celery Worker
celery -A app.celery_app worker --loglevel=info

# Windows 用户需要添加 --pool=solo
celery -A app.celery_app worker --loglevel=info --pool=solo
```

---

## Token 成本控制

### 1. 添加成本追踪

更新 `app/services/llm.py`：

```python
class LLMService:
    def __init__(self):
        # ... 之前的代码 ...
        
        # 价格配置（DeepSeek）
        self.price_per_1k_input = 0.001  # ¥0.001 / 1K tokens
        self.price_per_1k_output = 0.002  # ¥0.002 / 1K tokens
    
    def calculate_cost(
        self,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """计算成本（人民币）"""
        input_cost = (input_tokens / 1000) * self.price_per_1k_input
        output_cost = (output_tokens / 1000) * self.price_per_1k_output
        return input_cost + output_cost
    
    def chat_with_cost(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> tuple[str, dict]:
        """带成本统计的对话"""
        # 计算输入 tokens
        input_text = "\n".join(msg["content"] for msg in messages)
        input_tokens = self.count_tokens(input_text)
        
        # 调用 API
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # 计算输出 tokens
        output_text = response.choices[0].message.content
        output_tokens = self.count_tokens(output_text)
        
        # 计算成本
        cost = self.calculate_cost(input_tokens, output_tokens)
        
        stats = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cost_rmb": round(cost, 4)
        }
        
        return output_text, stats
```

### 2. 添加成本统计表

在 `app/models.py` 添加：

```python
class AIUsage(Base):
    """AI 使用统计"""
    __tablename__ = "ai_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    operation = Column(String)  # "summary", "tags", "chat"
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    cost_rmb = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
```

### 3. 记录使用情况

更新摘要生成路由：

```python
from app.models import AIUsage

@router.post("/{bookmark_id}/generate-summary")
def generate_summary(
    bookmark_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not bookmark or bookmark.user_id != current_user.id:
        raise HTTPException(status_code=404)
    
    # 生成摘要（带成本统计）
    messages = [
        {
            "role": "system",
            "content": "你是一个专业的内容摘要助手。"
        },
        {
            "role": "user",
            "content": f"标题：{bookmark.title}\nURL：{bookmark.url}"
        }
    ]
    
    summary, stats = llm_service.chat_with_cost(messages, temperature=0.3)
    
    # 保存摘要
    bookmark.ai_summary = summary
    
    # 记录使用情况
    usage = AIUsage(
        user_id=current_user.id,
        operation="summary",
        input_tokens=stats["input_tokens"],
        output_tokens=stats["output_tokens"],
        cost_rmb=stats["cost_rmb"]
    )
    db.add(usage)
    db.commit()
    
    return {
        "bookmark_id": bookmark_id,
        "summary": summary,
        "stats": stats
    }

@router.get("/ai-usage-stats")
def get_ai_usage_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """查看 AI 使用统计"""
    from sqlalchemy import func
    
    # 总体统计
    total_stats = db.query(
        func.sum(AIUsage.input_tokens).label("total_input"),
        func.sum(AIUsage.output_tokens).label("total_output"),
        func.sum(AIUsage.cost_rmb).label("total_cost"),
        func.count(AIUsage.id).label("total_calls")
    )\
    .filter(AIUsage.user_id == current_user.id)\
    .first()
    
    # 按操作类型统计
    by_operation = db.query(
        AIUsage.operation,
        func.count(AIUsage.id).label("count"),
        func.sum(AIUsage.cost_rmb).label("cost")
    )\
    .filter(AIUsage.user_id == current_user.id)\
    .group_by(AIUsage.operation)\
    .all()
    
    return {
        "total": {
            "input_tokens": total_stats[0] or 0,
            "output_tokens": total_stats[1] or 0,
            "cost_rmb": round(total_stats[2] or 0, 2),
            "total_calls": total_stats[3] or 0
        },
        "by_operation": [
            {"operation": op, "count": count, "cost_rmb": round(cost, 2)}
            for op, count, cost in by_operation
        ]
    }
```

---

## 前端集成示例

### 1. 普通调用

```javascript
async function generateSummary(bookmarkId) {
  const response = await fetch(`/bookmarks/${bookmarkId}/generate-summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  console.log('摘要：', data.summary);
  console.log('成本：', data.stats.cost_rmb, '元');
}
```

### 2. 流式调用（打字效果）

```javascript
async function generateSummaryStream(bookmarkId) {
  const response = await fetch(
    `/bookmarks/${bookmarkId}/generate-summary/stream`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  const outputDiv = document.getElementById('summary-output');
  outputDiv.innerHTML = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const content = line.slice(6);
        if (content === '[DONE]') {
          console.log('✅ 生成完成');
          break;
        }
        outputDiv.innerHTML += content;
      }
    }
  }
}
```

---

## 测试与验证

### 1. 测试单个书签

```bash
curl -X POST "http://localhost:8000/bookmarks/1/generate-summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

响应：
```json
{
  "bookmark_id": 1,
  "summary": "FastAPI 官方文档，Python Web 框架的完整教程。",
  "stats": {
    "input_tokens": 45,
    "output_tokens": 18,
    "total_tokens": 63,
    "cost_rmb": 0.0008
  }
}
```

### 2. 批量生成

```bash
curl -X POST "http://localhost:8000/bookmarks/batch-generate-summaries" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 查看成本

```bash
curl "http://localhost:8000/bookmarks/ai-usage-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

响应：
```json
{
  "total": {
    "input_tokens": 2500,
    "output_tokens": 800,
    "cost_rmb": 4.1,
    "total_calls": 50
  },
  "by_operation": [
    {"operation": "summary", "count": 45, "cost_rmb": 3.8},
    {"operation": "tags", "count": 5, "cost_rmb": 0.3}
  ]
}
```

---

## 小结

这一章我们完成了第一个 AI 功能：

- ✅ 集成 OpenAI/DeepSeek API
- ✅ 为书签生成 AI 摘要
- ✅ 实现流式响应（打字效果）
- ✅ 批量生成（Celery 后台任务）
- ✅ Token 成本统计

**你的项目现在具备**：
```
用户系统 → 书签 CRUD → 标签分类 → 高性能 API → AI 摘要 ✅
```

**下一步**：让用户能"问"自己的书签库！（RAG 检索增强生成）

---

上一章：[性能优化实战](/blog/backend/python-fullstack/chapter-05/)

下一章：[智能书签问答（RAG）](/blog/backend/python-fullstack/chapter-07/)
