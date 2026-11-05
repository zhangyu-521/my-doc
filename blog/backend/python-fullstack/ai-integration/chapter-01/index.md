# 第1章：LLM API 调用基础

## 你将学到

- OpenAI / DeepSeek API 基础使用
- Streaming 响应实现（打字效果）
- Token 计算与成本控制
- 提示词工程入门
- **实战项目**：智能书签摘要生成器

::: tip
这一章会对比 JavaScript 的 AI API 调用，让你快速上手。
:::

## 准备工作

### 1. 安装依赖

```bash
pip install openai tiktoken python-dotenv
```

### 2. 获取 API Key

你可以选择以下任一服务：

| 服务 | 特点 | 价格 | 适合场景 |
|------|------|------|----------|
| **OpenAI** | 最强 | 较贵 | 生产环境 |
| **Claude** | 安全 | 中等 | 企业应用 |
| **DeepSeek** | 便宜 | 超便宜 | 开发测试 |

::: tip
建议初学者用 DeepSeek，便宜且不需要信用卡。
:::

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1

# 或 DeepSeek（兼容 OpenAI 接口）
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com/v1
```

## 第一个 AI 请求

### JavaScript (Node.js) 版本

```js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateText() {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: '用一句话介绍 FastAPI' }
    ]
  });
  
  console.log(completion.choices[0].message.content);
}
```

### Python (FastAPI) 版本

```python
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL")
)

def generate_text():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "用一句话介绍 FastAPI"}
        ]
    )
    
    return completion.choices[0].message.content

print(generate_text())
```

## 封装 LLM 服务

创建 `app/services/llm.py`：

```python
from openai import OpenAI
import os
from typing import List, Dict

class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL")
        )
        self.model = "deepseek-chat"  # 或 "gpt-3.5-turbo"
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """基础对话"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    def generate_summary(self, text: str) -> str:
        """生成摘要"""
        messages = [
            {
                "role": "system",
                "content": "你是一个专业的内容摘要助手。请用 1-2 句话总结内容。"
            },
            {
                "role": "user",
                "content": f"请总结以下内容：\n\n{text}"
            }
        ]
        return self.chat(messages, temperature=0.3)

# 创建全局实例
llm_service = LLMService()
```

## 实战：智能书签摘要

### 1. 添加 API 路由

更新 `app/routers/bookmarks.py`：

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.llm import llm_service
from app import crud, schemas

router = APIRouter(prefix="/bookmarks", tags=["书签"])

@router.post("/{bookmark_id}/generate-summary")
async def generate_bookmark_summary(
    bookmark_id: int,
    db: Session = Depends(get_db)
):
    """为书签生成 AI 摘要"""
    # 获取书签
    bookmark = crud.get_bookmark(db, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不found")
    
    # 构造内容
    content = f"标题：{bookmark.title}\nURL：{bookmark.url}"
    if bookmark.description:
        content += f"\n描述：{bookmark.description}"
    
    # 生成摘要
    summary = llm_service.generate_summary(content)
    
    # 保存到数据库
    bookmark.ai_summary = summary
    db.commit()
    
    return {
        "bookmark_id": bookmark_id,
        "summary": summary
    }
```

### 2. 更新数据模型

在 `app/models.py` 中添加字段：

```python
class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    url = Column(String)
    description = Column(String)
    ai_summary = Column(String)  # 新增：AI 生成的摘要
```

### 3. 测试

```bash
# 启动服务
uvicorn app.main:app --reload

# 调用 API
curl -X POST "http://localhost:8000/bookmarks/1/generate-summary"
```

## Streaming 响应（打字效果）

### 为什么需要 Streaming？

```python
# ❌ 非流式：用户等待 10 秒后一次性看到结果
response = llm.chat(messages)
return {"content": response}

# ✅ 流式：用户实时看到生成过程（体验更好）
for chunk in llm.chat_stream(messages):
    yield chunk
```

### 实现 Streaming

更新 `app/services/llm.py`：

```python
from typing import Generator

class LLMService:
    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7
    ) -> Generator[str, None, None]:
        """流式对话"""
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            stream=True  # 启用流式
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
```

### FastAPI SSE 路由

```python
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def chat_stream(message: str):
    """流式聊天"""
    messages = [
        {"role": "user", "content": message}
    ]
    
    def generate():
        for chunk in llm_service.chat_stream(messages):
            # Server-Sent Events 格式
            yield f"data: {chunk}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

### 前端调用（JavaScript）

```js
async function streamChat(message) {
  const response = await fetch('/bookmarks/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const content = line.slice(6);
        document.getElementById('output').innerHTML += content;
      }
    }
  }
}
```

## Token 计算与成本控制

### 什么是 Token？

```
文本："你好，世界"
Tokens：["你", "好", "，", "世", "界"] = 5 tokens（中文）

文本："Hello, world"
Tokens：["Hello", ",", " world"] = 3 tokens（英文）
```

**规律**：
- 英文：约 4 个字符 = 1 token
- 中文：约 1.5 个字符 = 1 token

### 计算 Token 数量

```bash
pip install tiktoken
```

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """计算文本的 token 数量"""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

# 测试
text = "FastAPI 是一个现代、高性能的 Python Web 框架"
print(count_tokens(text))  # 约 20 tokens
```

### 成本估算

| 模型 | 输入价格 | 输出价格 | 适用场景 |
|------|----------|----------|----------|
| GPT-4 | $0.03 / 1K tokens | $0.06 / 1K tokens | 复杂任务 |
| GPT-3.5 | $0.0015 / 1K tokens | $0.002 / 1K tokens | 日常对话 |
| DeepSeek | ¥0.001 / 1K tokens | ¥0.002 / 1K tokens | 开发测试 |

### 成本控制策略

```python
class LLMService:
    def chat_with_limit(
        self,
        messages: List[Dict[str, str]],
        max_input_tokens: int = 2000
    ) -> str:
        """限制输入 token 数量"""
        # 计算总 token 数
        total_tokens = sum(
            count_tokens(msg["content"])
            for msg in messages
        )
        
        if total_tokens > max_input_tokens:
            raise ValueError(f"输入过长：{total_tokens} tokens（限制 {max_input_tokens}）")
        
        return self.chat(messages)
```

## 提示词工程基础

### 1. 角色定义

```python
system_prompt = """
你是一个专业的书签管理助手。你的任务是：
1. 为用户的书签生成简洁的摘要
2. 提取关键词标签
3. 推荐相关内容

回答要求：
- 摘要不超过 50 字
- 标签不超过 5 个
- 语气专业、友好
"""
```

### 2. Few-Shot Learning

```python
messages = [
    {"role": "system", "content": "你是一个分类助手。"},
    # 示例 1
    {"role": "user", "content": "FastAPI 教程"},
    {"role": "assistant", "content": "类别：编程/Python"},
    # 示例 2
    {"role": "user", "content": "如何做红烧肉"},
    {"role": "assistant", "content": "类别：美食/烹饪"},
    # 实际任务
    {"role": "user", "content": "机器学习入门"}
]
```

### 3. 结构化输出

```python
prompt = """
请分析以下书签，并以 JSON 格式返回：

书签：{title} - {url}

返回格式：
{{
  "category": "类别",
  "tags": ["标签1", "标签2"],
  "summary": "摘要",
  "importance": "high/medium/low"
}}
"""

response = llm_service.chat([
    {"role": "user", "content": prompt.format(title="...", url="...")}
])

import json
result = json.loads(response)
```

## 完整示例：智能书签分析

```python
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.services.llm import llm_service
import json

@router.post("/{bookmark_id}/analyze")
async def analyze_bookmark(
    bookmark_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """分析书签（后台任务）"""
    bookmark = crud.get_bookmark(db, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")
    
    # 异步执行分析
    background_tasks.add_task(
        perform_analysis,
        bookmark_id,
        bookmark.title,
        bookmark.url
    )
    
    return {"message": "分析任务已提交"}

async def perform_analysis(bookmark_id: int, title: str, url: str):
    """执行 AI 分析"""
    prompt = f"""
    请分析以下书签，并以 JSON 格式返回：
    
    标题：{title}
    URL：{url}
    
    返回格式：
    {{
      "category": "类别（如：编程、设计、新闻等）",
      "tags": ["标签1", "标签2", "标签3"],
      "summary": "一句话摘要",
      "importance": "high/medium/low"
    }}
    """
    
    response = llm_service.chat([
        {"role": "user", "content": prompt}
    ])
    
    # 解析结果
    analysis = json.loads(response)
    
    # 保存到数据库
    from app.database import SessionLocal
    db = SessionLocal()
    bookmark = db.query(models.Bookmark).filter(models.Bookmark.id == bookmark_id).first()
    
    bookmark.category = analysis["category"]
    bookmark.ai_summary = analysis["summary"]
    bookmark.importance = analysis["importance"]
    
    # 添加标签
    for tag_name in analysis["tags"]:
        tag = crud.get_or_create_tag(db, tag_name)
        if tag not in bookmark.tags:
            bookmark.tags.append(tag)
    
    db.commit()
    db.close()
```

## 错误处理

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class LLMService:
    @retry(
        stop=stop_after_attempt(3),           # 最多重试 3 次
        wait=wait_exponential(multiplier=1, min=2, max=10)  # 指数退避
    )
    def chat_with_retry(self, messages: List[Dict[str, str]]) -> str:
        """带重试的对话"""
        try:
            return self.chat(messages)
        except Exception as e:
            print(f"LLM 调用失败：{e}")
            raise
```

## 小结

这一章我们学习了：

- ✅ OpenAI API 基础使用
- ✅ Streaming 响应实现
- ✅ Token 计算与成本控制
- ✅ 提示词工程基础
- ✅ 完整的智能书签分析功能

::: tip
LLM API 调用是 AI 应用的基础，但直接调用 API 开发效率低。下一章我们会学习 LangChain，大幅简化开发流程。
:::

**下一章：** [LangChain 快速上手](/blog/backend/python-fullstack/ai-integration/chapter-02/)
