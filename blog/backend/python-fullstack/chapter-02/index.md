# 第2章：FastAPI 快速上手

## 什么是 FastAPI？

如果你用过 Express.js 或 Koa，那 FastAPI 就是 Python 世界的对应框架。它是一个**现代、快速、易用**的 Web 框架，特别适合构建 API。

::: tip
FastAPI 的核心特点：
- **快** - 性能接近 Node.js 和 Go
- **自动文档** - 写完代码就有 Swagger UI
- **类型提示** - 类似 TypeScript，运行时校验参数
- **异步支持** - 原生支持 async/await
:::

## 为什么选 FastAPI？

### 对比其他 Python 框架

| 框架 | 特点 | 适合场景 |
|------|------|----------|
| **FastAPI** | 现代、快速、自动文档 | API 开发、微服务 |
| Django | 大而全、ORM 强大 | 传统 Web 应用、管理后台 |
| Flask | 轻量、灵活 | 小项目、学习 |

作为前端工程师，**FastAPI 是最佳选择**：
- 学习曲线平缓（类似 Express）
- 自动生成 API 文档（前端调试方便）
- 性能好、适合 AI 应用

## 环境准备

### 安装 Python

检查 Python 版本（需要 3.8+）：
```bash
python --version
# 或
python3 --version
```

如果没有安装，去[官网下载](https://www.python.org/downloads/)，推荐 **Python 3.11** 或更高版本。

### 创建项目目录

```bash
mkdir fastapi-demo
cd fastapi-demo
```

### 创建虚拟环境

虚拟环境类似 Node.js 的 `node_modules`，隔离项目依赖：

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate
```

激活后命令行前面会显示 `(venv)`。

### 安装 FastAPI

```bash
pip install fastapi
pip install "uvicorn[standard]"
```

- `fastapi` - 框架本身
- `uvicorn` - ASGI 服务器（类似 Node.js 中的 http.createServer）

## 第一个 FastAPI 应用

创建 `main.py`：

```python
from fastapi import FastAPI

# 创建 FastAPI 实例（类似 Express 的 app）
app = FastAPI()

# 定义路由（类似 Express 的 app.get）
@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/users/{user_id}")
def read_user(user_id: int):
    return {"user_id": user_id, "name": "Alice"}
```

### 对比 Express.js

**Express**：
```js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/users/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  res.json({ userId, name: 'Alice' });
});

app.listen(3000);
```

**FastAPI**：
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/users/{user_id}")
def read_user(user_id: int):
    return {"user_id": user_id, "name": "Alice"}
```

看出区别了吗？
- FastAPI 用**装饰器**（`@app.get`）定义路由
- 路径参数用 `{user_id}` 包裹，函数参数自动匹配
- `user_id: int` 会自动校验类型，传入非数字会返回 422 错误
- 直接 `return` 字典，自动转成 JSON

## 运行服务

```bash
uvicorn main:app --reload
```

参数说明：
- `main` - 文件名（`main.py`）
- `app` - FastAPI 实例变量名
- `--reload` - 代码改动自动重启（开发模式）

看到这样的输出就成功了：
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

## 测试 API

### 方式1：浏览器访问

打开 http://127.0.0.1:8000

你会看到：
```json
{"message": "Hello World"}
```

访问 http://127.0.0.1:8000/users/123

你会看到：
```json
{"user_id": 123, "name": "Alice"}
```

### 方式2：自动文档（重点！）

FastAPI 最强大的功能来了，打开：

**Swagger UI**：http://127.0.0.1:8000/docs

你会看到一个交互式 API 文档，可以直接在浏览器里测试 API！

**ReDoc**：http://127.0.0.1:8000/redoc

另一种风格的文档，更适合阅读。

::: tip
这个自动文档是**零配置自动生成的**，你只需要写代码，文档就有了。前端调试 API 再也不用抓包或者看 Postman 了。
:::

## 请求参数类型

### 1. 路径参数（Path Parameters）

```python
@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
```

对比 Express：
```js
app.get('/items/:itemId', (req, res) => {
  const itemId = parseInt(req.params.itemId);
  res.json({ itemId });
});
```

### 2. 查询参数（Query Parameters）

```python
@app.get("/items")
def read_items(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}
```

调用：`http://127.0.0.1:8000/items?skip=20&limit=50`

对比 Express：
```js
app.get('/items', (req, res) => {
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 10;
  res.json({ skip, limit });
});
```

::: tip
FastAPI 自动处理了：
- 类型转换（字符串转整数）
- 默认值
- 类型校验（传入非数字会报错）
:::

### 3. 请求体（Request Body）

先安装 Pydantic（FastAPI 的依赖，但显式安装更清楚）：
```bash
pip install pydantic
```

定义数据模型：
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# 定义请求体结构（类似 TypeScript 的 interface）
class User(BaseModel):
    name: str
    age: int
    email: str | None = None  # 可选字段

@app.post("/users")
def create_user(user: User):
    return {"message": f"User {user.name} created", "data": user}
```

对比 Express + TypeScript：
```typescript
interface User {
  name: string;
  age: number;
  email?: string;
}

app.post('/users', (req, res) => {
  const user: User = req.body;
  // 需要手动校验
  res.json({ message: `User ${user.name} created`, data: user });
});
```

FastAPI 的优势：
- `BaseModel` 自动校验请求体
- 缺少必填字段会自动返回 422 错误
- 类型不匹配会自动返回详细错误信息

测试：
```bash
curl -X POST http://127.0.0.1:8000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "age": 25}'
```

## 完整示例

创建一个简单的 Todo API：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Todo API")

# 数据模型
class TodoCreate(BaseModel):
    title: str
    completed: bool = False

class Todo(BaseModel):
    id: int
    title: str
    completed: bool

# 模拟数据库（真实项目用数据库）
todos = []
next_id = 1

@app.get("/")
def root():
    return {"message": "Todo API is running"}

@app.get("/todos", response_model=list[Todo])
def get_todos():
    """获取所有 Todo"""
    return todos

@app.post("/todos", response_model=Todo)
def create_todo(todo: TodoCreate):
    """创建 Todo"""
    global next_id
    new_todo = Todo(id=next_id, **todo.dict())
    todos.append(new_todo)
    next_id += 1
    return new_todo

@app.get("/todos/{todo_id}", response_model=Todo)
def get_todo(todo_id: int):
    """获取单个 Todo"""
    for todo in todos:
        if todo.id == todo_id:
            return todo
    raise HTTPException(status_code=404, detail="Todo not found")

@app.put("/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, todo: TodoCreate):
    """更新 Todo"""
    for i, t in enumerate(todos):
        if t.id == todo_id:
            updated = Todo(id=todo_id, **todo.dict())
            todos[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Todo not found")

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int):
    """删除 Todo"""
    for i, todo in enumerate(todos):
        if todo.id == todo_id:
            todos.pop(i)
            return {"message": "Todo deleted"}
    raise HTTPException(status_code=404, detail="Todo not found")
```

运行后打开 http://127.0.0.1:8000/docs，你会看到完整的 CRUD API 文档。

## 常用功能

### 1. CORS（跨域）

前端开发必备：

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许的前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. 异步路由

```python
@app.get("/async-data")
async def get_async_data():
    # 这里可以用 await 调用异步函数
    return {"message": "This is async"}
```

后续章节会详细讲异步编程。

### 3. 依赖注入

类似 NestJS 的依赖注入：

```python
from fastapi import Depends

def get_current_user():
    return {"user_id": 1, "name": "Alice"}

@app.get("/me")
def read_me(user: dict = Depends(get_current_user)):
    return user
```

## 练习任务

创建一个 `practice.py`，实现以下 API：

1. `GET /` - 返回欢迎信息
2. `GET /health` - 健康检查接口
3. `POST /calculate` - 接收两个数字和运算符，返回计算结果

提示：
```python
from pydantic import BaseModel

class Calculation(BaseModel):
    a: float
    b: float
    operator: str  # "+", "-", "*", "/"

@app.post("/calculate")
def calculate(calc: Calculation):
    # 你的代码
    pass
```

## 小结

这一章我们学习了：

- ✅ FastAPI 的核心概念和优势
- ✅ 如何创建第一个 API
- ✅ 路径参数、查询参数、请求体
- ✅ Pydantic 模型和自动校验
- ✅ 自动生成的 API 文档
- ✅ 完整的 CRUD 示例

::: tip
FastAPI 的核心思想是**用类型提示替代手动校验**，这让代码更简洁、更安全。下一章我们会做一个完整的项目，包括数据库操作。
:::

下一章：[第一个 API 项目实战](/blog/backend/python-fullstack/chapter-03/)
