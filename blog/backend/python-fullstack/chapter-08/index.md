# 第8章：AI 助手 Agent

## 用户需求

在第 7 章，我们实现了 RAG 问答系统。现在用户提出更智能的需求：

> "能不能让 AI 主动帮我整理书签？比如自动分类、发现重复、推荐相关内容..."

这就需要 **AI Agent** —— 不只回答问题，还能主动执行任务。

这一章我们要做的：
- ✅ 理解 AI Agent 的工作原理
- ✅ 实现 Function Calling
- ✅ 让 AI 能调用系统功能
- ✅ 构建智能助手
- ✅ 实现对话式操作

::: tip
AI Agent 是 LLM 应用的高级形态，让 AI 从"回答者"变成"执行者"。
:::

---

## AI Agent 工作原理

### 传统对话 vs Agent

**传统对话**：
```
用户：帮我找 Python 相关的书签
AI：[搜索结果] 找到 10 个相关书签
```

**AI Agent**：
```
用户：帮我整理一下书签
AI：好的，我会：
    1. 搜索所有未分类的书签
    2. 分析每个书签的内容
    3. 自动添加标签
    4. 删除重复的书签
    [执行任务...]
    ✅ 完成！已整理 50 个书签，添加了 120 个标签，删除了 3 个重复项。
```

### Agent 工作流程

```
用户输入
    ↓
Agent 分析意图
    ↓
决定需要调用哪些工具（Function）
    ↓
执行工具调用
    ↓
整合结果
    ↓
生成回复
```

---

## 实现 Function Calling

### 1. 定义工具（Functions）

创建 `app/services/agent_tools.py`：

```python
from typing import List, Dict, Callable
from app.database import SessionLocal
from app.models import Bookmark, Tag
from app.services.vector import vector_service
from app.services.llm import llm_service
import json

class AgentTools:
    """Agent 可用的工具集"""
    
    def __init__(self):
        self.db = SessionLocal()
    
    def search_bookmarks(self, query: str, limit: int = 10) -> List[Dict]:
        """搜索书签"""
        results = vector_service.search_bookmarks(query, limit=limit)
        return results
    
    def get_all_bookmarks(self, user_id: int) -> List[Dict]:
        """获取用户所有书签"""
        bookmarks = self.db.query(Bookmark)\
            .filter(Bookmark.user_id == user_id)\
            .all()
        
        return [
            {
                "id": bm.id,
                "title": bm.title,
                "url": bm.url,
                "description": bm.description,
                "tags": [tag.name for tag in bm.tags]
            }
            for bm in bookmarks
        ]
    
    def add_tags_to_bookmark(
        self,
        bookmark_id: int,
        tag_names: List[str]
    ) -> Dict:
        """为书签添加标签"""
        bookmark = self.db.query(Bookmark)\
            .filter(Bookmark.id == bookmark_id)\
            .first()
        
        if not bookmark:
            return {"error": "书签不存在"}
        
        added_tags = []
        for tag_name in tag_names:
            # 查找或创建标签
            tag = self.db.query(Tag)\
                .filter(Tag.name == tag_name)\
                .first()
            
            if not tag:
                tag = Tag(name=tag_name)
                self.db.add(tag)
            
            if tag not in bookmark.tags:
                bookmark.tags.append(tag)
                added_tags.append(tag_name)
        
        self.db.commit()
        
        return {
            "bookmark_id": bookmark_id,
            "added_tags": added_tags,
            "message": f"成功添加 {len(added_tags)} 个标签"
        }
    
    def delete_bookmark(self, bookmark_id: int) -> Dict:
        """删除书签"""
        bookmark = self.db.query(Bookmark)\
            .filter(Bookmark.id == bookmark_id)\
            .first()
        
        if not bookmark:
            return {"error": "书签不存在"}
        
        title = bookmark.title
        self.db.delete(bookmark)
        self.db.commit()
        
        # 删除向量
        vector_service.delete_bookmark(bookmark_id)
        
        return {
            "bookmark_id": bookmark_id,
            "message": f"已删除书签：{title}"
        }
    
    def find_duplicate_bookmarks(self, user_id: int) -> List[Dict]:
        """查找重复的书签"""
        from sqlalchemy import func
        
        # 按 URL 分组，找出重复的
        duplicates = self.db.query(
            Bookmark.url,
            func.count(Bookmark.id).label("count")
        )\
        .filter(Bookmark.user_id == user_id)\
        .group_by(Bookmark.url)\
        .having(func.count(Bookmark.id) > 1)\
        .all()
        
        result = []
        for url, count in duplicates:
            bookmarks = self.db.query(Bookmark)\
                .filter(
                    Bookmark.user_id == user_id,
                    Bookmark.url == url
                )\
                .all()
            
            result.append({
                "url": url,
                "count": count,
                "bookmarks": [
                    {"id": bm.id, "title": bm.title}
                    for bm in bookmarks
                ]
            })
        
        return result
    
    def get_untagged_bookmarks(self, user_id: int) -> List[Dict]:
        """获取未打标签的书签"""
        bookmarks = self.db.query(Bookmark)\
            .filter(Bookmark.user_id == user_id)\
            .all()
        
        untagged = [
            {
                "id": bm.id,
                "title": bm.title,
                "url": bm.url,
                "description": bm.description
            }
            for bm in bookmarks
            if len(bm.tags) == 0
        ]
        
        return untagged
    
    def generate_summary_for_bookmark(self, bookmark_id: int) -> Dict:
        """为书签生成摘要"""
        bookmark = self.db.query(Bookmark)\
            .filter(Bookmark.id == bookmark_id)\
            .first()
        
        if not bookmark:
            return {"error": "书签不存在"}
        
        if bookmark.ai_summary:
            return {
                "bookmark_id": bookmark_id,
                "message": "该书签已有摘要",
                "summary": bookmark.ai_summary
            }
        
        # 生成摘要
        summary = llm_service.generate_bookmark_summary(
            title=bookmark.title,
            url=bookmark.url,
            description=bookmark.description
        )
        
        bookmark.ai_summary = summary
        self.db.commit()
        
        return {
            "bookmark_id": bookmark_id,
            "summary": summary,
            "message": "摘要生成成功"
        }
    
    def close(self):
        """关闭数据库连接"""
        self.db.close()

# 工具描述（OpenAI Function Calling 格式）
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_bookmarks",
            "description": "搜索用户的书签库，支持语义搜索",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索关键词或问题"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回结果数量，默认 10"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_tags_to_bookmark",
            "description": "为指定书签添加标签",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookmark_id": {
                        "type": "integer",
                        "description": "书签 ID"
                    },
                    "tag_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "要添加的标签名称列表"
                    }
                },
                "required": ["bookmark_id", "tag_names"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_duplicate_bookmarks",
            "description": "查找用户书签库中的重复书签",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "integer",
                        "description": "用户 ID"
                    }
                },
                "required": ["user_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_untagged_bookmarks",
            "description": "获取所有未打标签的书签",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "integer",
                        "description": "用户 ID"
                    }
                },
                "required": ["user_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_bookmark",
            "description": "删除指定的书签",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookmark_id": {
                        "type": "integer",
                        "description": "要删除的书签 ID"
                    }
                },
                "required": ["bookmark_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_summary_for_bookmark",
            "description": "为书签生成 AI 摘要",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookmark_id": {
                        "type": "integer",
                        "description": "书签 ID"
                    }
                },
                "required": ["bookmark_id"]
            }
        }
    }
]
```

---

## 实现 Agent 服务

创建 `app/services/agent.py`：

```python
from openai import OpenAI
import os
import json
from typing import List, Dict
from app.services.agent_tools import AgentTools, AGENT_TOOLS

class BookmarkAgent:
    """书签智能助手"""
    
    def __init__(self, user_id: int):
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL")
        )
        self.model = "deepseek-chat"  # 或 "gpt-4"
        self.user_id = user_id
        self.tools = AgentTools()
        
        # 对话历史
        self.conversation_history = [
            {
                "role": "system",
                "content": (
                    "你是一个书签管理助手，帮助用户整理和管理他们的书签。\n"
                    "你可以：\n"
                    "- 搜索书签\n"
                    "- 添加标签\n"
                    "- 查找重复书签\n"
                    "- 生成摘要\n"
                    "- 删除书签\n\n"
                    "当用户提出需求时，主动调用相应的工具完成任务。"
                )
            }
        ]
    
    def chat(self, user_message: str) -> str:
        """与 Agent 对话"""
        # 添加用户消息
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        # 调用 LLM（可能触发工具调用）
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.conversation_history,
            tools=AGENT_TOOLS,
            tool_choice="auto"  # 自动决定是否调用工具
        )
        
        assistant_message = response.choices[0].message
        
        # 如果 AI 决定调用工具
        if assistant_message.tool_calls:
            # 添加 AI 的响应
            self.conversation_history.append(assistant_message)
            
            # 执行工具调用
            for tool_call in assistant_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                # 自动注入 user_id
                if "user_id" in function_args:
                    function_args["user_id"] = self.user_id
                
                # 调用工具
                result = self._call_tool(function_name, function_args)
                
                # 添加工具结果到对话历史
                self.conversation_history.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": json.dumps(result, ensure_ascii=False)
                })
            
            # 再次调用 LLM，让它整合结果生成回复
            final_response = self.client.chat.completions.create(
                model=self.model,
                messages=self.conversation_history
            )
            
            final_message = final_response.choices[0].message.content
            self.conversation_history.append({
                "role": "assistant",
                "content": final_message
            })
            
            return final_message
        
        else:
            # 没有工具调用，直接返回回复
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_message.content
            })
            return assistant_message.content
    
    def _call_tool(self, function_name: str, arguments: Dict):
        """执行工具调用"""
        try:
            if hasattr(self.tools, function_name):
                method = getattr(self.tools, function_name)
                result = method(**arguments)
                return result
            else:
                return {"error": f"未知工具：{function_name}"}
        except Exception as e:
            return {"error": str(e)}
    
    def reset(self):
        """重置对话"""
        self.conversation_history = self.conversation_history[:1]  # 只保留系统消息
    
    def close(self):
        """释放资源"""
        self.tools.close()
```

---

## 实现 Agent API

创建 `app/routers/agent.py`：

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from app.routers.auth import get_current_user
from app.services.agent import BookmarkAgent

router = APIRouter(prefix="/agent", tags=["AI 助手"])

# 存储每个用户的 Agent 实例（生产环境应该用 Redis）
user_agents: Dict[int, BookmarkAgent] = {}

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    conversation_history: List[Dict]

@router.post("/chat", response_model=ChatResponse)
def chat_with_agent(
    request: ChatRequest,
    current_user = Depends(get_current_user)
):
    """与 AI 助手对话"""
    user_id = current_user.id
    
    # 获取或创建 Agent 实例
    if user_id not in user_agents:
        user_agents[user_id] = BookmarkAgent(user_id)
    
    agent = user_agents[user_id]
    
    # 处理消息
    reply = agent.chat(request.message)
    
    return ChatResponse(
        reply=reply,
        conversation_history=agent.conversation_history
    )

@router.post("/reset")
def reset_conversation(current_user = Depends(get_current_user)):
    """重置对话"""
    user_id = current_user.id
    
    if user_id in user_agents:
        user_agents[user_id].reset()
    
    return {"message": "对话已重置"}

@router.get("/history")
def get_conversation_history(current_user = Depends(get_current_user)):
    """获取对话历史"""
    user_id = current_user.id
    
    if user_id not in user_agents:
        return {"history": []}
    
    return {
        "history": user_agents[user_id].conversation_history
    }
```

在 `app/main.py` 注册路由：

```python
from app.routers import bookmarks, auth, tags, qa, agent

app.include_router(agent.router)
```

---

## 测试 Agent

### 1. 搜索书签

```bash
curl -X POST "http://localhost:8000/agent/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "帮我找一下 React 相关的书签"
  }'
```

**Agent 响应**：
```json
{
  "reply": "我找到了 5 个 React 相关的书签：\n\n1. React 官方文档\n2. React 性能优化指南\n3. React Hooks 完全指南\n4. React 状态管理最佳实践\n5. React Native 入门教程\n\n需要我帮你做什么吗？",
  "conversation_history": [...]
}
```

### 2. 自动添加标签

```bash
curl -X POST "http://localhost:8000/agent/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "帮我给所有未打标签的书签自动添加标签"
  }'
```

**Agent 工作流程**：
```
1. 调用 get_untagged_bookmarks() → 找到 20 个未打标签的书签
2. 对每个书签：
   - 分析标题和描述
   - 推荐合适的标签
   - 调用 add_tags_to_bookmark()
3. 返回：✅ 已为 20 个书签添加了 60 个标签
```

### 3. 查找并删除重复

```bash
curl -X POST "http://localhost:8000/agent/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "帮我找出重复的书签，保留最新的，删除旧的"
  }'
```

**Agent 工作流程**：
```
1. 调用 find_duplicate_bookmarks() → 找到 3 组重复
2. 对每组重复：
   - 分析创建时间
   - 保留最新的
   - 调用 delete_bookmark() 删除旧的
3. 返回：✅ 已删除 5 个重复的书签
```

---

## 高级功能

### 1. 多轮对话

```python
# 第 1 轮
用户：帮我找 Python 相关的书签
Agent：找到 10 个 Python 书签

# 第 2 轮（基于上下文）
用户：只保留关于异步编程的
Agent：[筛选] 保留了 3 个异步编程相关的书签

# 第 3 轮
用户：给它们加上"异步"标签
Agent：[调用工具] ✅ 已添加标签
```

### 2. 智能推荐

```python
@router.post("/agent/recommendations")
def get_recommendations(current_user = Depends(get_current_user)):
    """获取 AI 推荐"""
    agent = BookmarkAgent(current_user.id)
    
    prompt = (
        "分析我的书签库，给出以下建议：\n"
        "1. 哪些书签应该添加标签？\n"
        "2. 有哪些重复的书签？\n"
        "3. 哪些书签缺少摘要？\n"
        "4. 推荐的整理方案"
    )
    
    recommendations = agent.chat(prompt)
    agent.close()
    
    return {"recommendations": recommendations}
```

### 3. 定时任务

```python
from celery import Celery
from app.services.agent import BookmarkAgent

@celery_app.task
def daily_bookmark_maintenance(user_id: int):
    """每日书签维护任务"""
    agent = BookmarkAgent(user_id)
    
    tasks = [
        "查找重复的书签",
        "为未打标签的书签添加标签",
        "为缺少摘要的书签生成摘要"
    ]
    
    report = []
    for task in tasks:
        result = agent.chat(f"帮我{task}")
        report.append(result)
    
    agent.close()
    
    # 发送报告给用户
    return "\n\n".join(report)
```

---

## 实战案例

### 案例1：批量整理

**用户**：帮我整理一下书签库

**Agent 执行**：
```
✅ 任务开始...

1. 查找未打标签的书签
   → 找到 30 个

2. 自动添加标签
   → 已为 30 个书签添加了 85 个标签

3. 查找重复书签
   → 找到 2 组重复，已删除 3 个

4. 生成缺失的摘要
   → 为 15 个书签生成了摘要

✅ 整理完成！
```

### 案例2：智能推荐

**用户**：我最近在学 React，推荐一些相关资料

**Agent 执行**：
```
基于你的书签库，我推荐：

【基础学习】
1. React 官方文档 - 系统学习基础
2. React 核心概念详解 - 深入理解原理

【实战项目】
3. React 管理后台模板 - 实战练习
4. React 组件库开发 - 进阶实践

【性能优化】
5. React 性能优化指南 - 提升技能

这个学习路径比较合理，建议按顺序学习。
```

---

## 成本控制

### Function Calling 成本

```python
class CostTracker:
    """成本追踪器"""
    
    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.function_calls_count = 0
    
    def track_completion(self, response):
        """追踪单次调用成本"""
        usage = response.usage
        self.total_input_tokens += usage.prompt_tokens
        self.total_output_tokens += usage.completion_tokens
        
        # 统计工具调用次数
        if response.choices[0].message.tool_calls:
            self.function_calls_count += len(
                response.choices[0].message.tool_calls
            )
    
    def get_report(self):
        """生成成本报告"""
        input_cost = (self.total_input_tokens / 1000) * 0.001
        output_cost = (self.total_output_tokens / 1000) * 0.002
        
        return {
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "function_calls": self.function_calls_count,
            "total_cost_rmb": round(input_cost + output_cost, 4)
        }
```

---

## 小结

这一章我们完成了 AI Agent：

- ✅ 理解 AI Agent 工作原理
- ✅ 实现 Function Calling
- ✅ 让 AI 能调用系统功能
- ✅ 构建智能助手
- ✅ 实现对话式操作

**你的项目现在具备**：
```
用户系统 → 书签 CRUD → 标签分类 → 高性能 API → AI 摘要 → 智能问答 → AI Agent ✅
```

**功能完整度**：
- ✅ 基础 CRUD
- ✅ 关系管理
- ✅ 性能优化
- ✅ AI 集成
- ✅ 智能助手

**下一步**：部署到生产环境，让你的项目上线！

---

上一章：[智能书签问答（RAG）](/blog/backend/python-fullstack/chapter-07/)

下一章：[部署与生产化](/blog/backend/python-fullstack/chapter-09/)
