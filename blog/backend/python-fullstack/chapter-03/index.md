# 第3章：第一个 API 项目实战

## 项目目标

我们要做一个**书签管理 API**，功能包括：
- ✅ 用户管理（注册、登录）
- ✅ 书签 CRUD（增删改查）
- ✅ SQLite 数据库存储
- ✅ JWT 身份验证
- ✅ 完整的项目结构

这个项目会用到前面学的所有知识，并且引入数据库和身份验证。

::: tip
先不用担心复杂度，我会一步步带你实现。完成后你会有一个可以展示的完整后端项目。
:::

## 项目结构

创建如下目录结构：

```
bookmark-api/
├── app/
│   ├── __init__.py
│   ├── main.py           # 应用入口
│   ├── database.py       # 数据库配置
│   ├── models.py         # 数据模型
│   ├── schemas.py        # Pydantic 模型
│   ├── crud.py           # 数据库操作
│   └── routers/
│       ├── __init__.py
│       ├── auth.py       # 认证路由
│       └── bookmarks.py  # 书签路由
├── requirements.txt      # 依赖列表
└── .env                  # 环境变量
```

## 安装依赖

创建 `requirements.txt`：

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
python-dotenv==1.0.0
```

安装：
```bash
pip install -r requirements.txt
```

依赖说明：
- `sqlalchemy` - ORM 框架（类似 TypeORM）
- `python-jose` - JWT 生成和验证
- `passlib` - 密码哈希
- `python-dotenv` - 读取 `.env` 文件

## 数据库配置

创建 `app/database.py`：

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite 数据库文件
SQLALCHEMY_DATABASE_URL = "sqlite:///./bookmark.db"

# 创建数据库引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 需要
)

# 创建 Session 工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 基类
Base = declarative_base()

# 依赖注入：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

::: tip
这个文件的作用类似前端的数据库连接池配置。`get_db()` 函数会在每个请求中创建一个数据库会话，请求结束后自动关闭。
:::

## 数据模型

创建 `app/models.py`：

```python
from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联关系
    bookmarks = relationship("Bookmark", back_populates="owner")

class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 外键
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # 关联关系
    owner = relationship("User", back_populates="bookmarks")
```

对比前端的 TypeScript 类型：
```typescript
interface User {
  id: number;
  email: string;
  username: string;
  hashedPassword: string;
  isActive: boolean;
  createdAt: Date;
  bookmarks: Bookmark[];
}

interface Bookmark {
  id: number;
  title: string;
  url: string;
  description?: string;
  createdAt: Date;
  userId: number;
  owner: User;
}
```

## Pydantic Schema

创建 `app/schemas.py`：

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# ===== User Schemas =====

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True  # 允许从 ORM 模型转换

# ===== Bookmark Schemas =====

class BookmarkCreate(BaseModel):
    title: str = Field(..., max_length=200)
    url: str
    description: str | None = None

class BookmarkUpdate(BaseModel):
    title: str | None = None
    url: str | None = None
    description: str | None = None

class BookmarkResponse(BaseModel):
    id: int
    title: str
    url: str
    description: str | None
    created_at: datetime
    user_id: int
    
    class Config:
        from_attributes = True

# ===== Token Schema =====

class Token(BaseModel):
    access_token: str
    token_type: str
```

::: tip
Pydantic Schema 和 SQLAlchemy Model 的区别：
- **Model**：数据库表结构（ORM 对象）
- **Schema**：API 输入输出结构（序列化/反序列化）
:::

## 数据库操作

创建 `app/crud.py`：

```python
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app import models, schemas

# 密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ===== User CRUD =====

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

# ===== Bookmark CRUD =====

def get_bookmarks(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Bookmark)\
        .filter(models.Bookmark.user_id == user_id)\
        .offset(skip)\
        .limit(limit)\
        .all()

def create_bookmark(db: Session, bookmark: schemas.BookmarkCreate, user_id: int):
    db_bookmark = models.Bookmark(**bookmark.dict(), user_id=user_id)
    db.add(db_bookmark)
    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark

def get_bookmark(db: Session, bookmark_id: int, user_id: int):
    return db.query(models.Bookmark)\
        .filter(models.Bookmark.id == bookmark_id, models.Bookmark.user_id == user_id)\
        .first()

def update_bookmark(db: Session, bookmark_id: int, user_id: int, bookmark: schemas.BookmarkUpdate):
    db_bookmark = get_bookmark(db, bookmark_id, user_id)
    if not db_bookmark:
        return None
    
    update_data = bookmark.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bookmark, key, value)
    
    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark

def delete_bookmark(db: Session, bookmark_id: int, user_id: int):
    db_bookmark = get_bookmark(db, bookmark_id, user_id)
    if not db_bookmark:
        return False
    db.delete(db_bookmark)
    db.commit()
    return True
```

## 认证路由

创建 `app/routers/auth.py`：

```python
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.database import get_db

# JWT 配置
SECRET_KEY = "your-secret-key-change-this-in-production"  # 生产环境用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(prefix="/auth", tags=["认证"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查邮箱是否已存在
    if crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 检查用户名是否已存在
    if crud.get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    return crud.create_user(db, user)

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """用户登录"""
    user = crud.get_user_by_username(db, form_data.username)
    if not user or not crud.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user
```

## 书签路由

创建 `app/routers/bookmarks.py`：

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.database import get_db
from app.routers.auth import get_current_user

router = APIRouter(prefix="/bookmarks", tags=["书签"])

@router.get("/", response_model=list[schemas.BookmarkResponse])
def get_bookmarks(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有书签"""
    bookmarks = crud.get_bookmarks(db, user_id=current_user.id, skip=skip, limit=limit)
    return bookmarks

@router.post("/", response_model=schemas.BookmarkResponse)
def create_bookmark(
    bookmark: schemas.BookmarkCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建书签"""
    return crud.create_bookmark(db, bookmark, current_user.id)

@router.get("/{bookmark_id}", response_model=schemas.BookmarkResponse)
def get_bookmark(
    bookmark_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取单个书签"""
    bookmark = crud.get_bookmark(db, bookmark_id, current_user.id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark

@router.put("/{bookmark_id}", response_model=schemas.BookmarkResponse)
def update_bookmark(
    bookmark_id: int,
    bookmark: schemas.BookmarkUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新书签"""
    updated = crud.update_bookmark(db, bookmark_id, current_user.id, bookmark)
    if not updated:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return updated

@router.delete("/{bookmark_id}")
def delete_bookmark(
    bookmark_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除书签"""
    success = crud.delete_bookmark(db, bookmark_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"message": "Bookmark deleted successfully"}
```

## 主应用

创建 `app/main.py`：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, bookmarks

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 创建 FastAPI 实例
app = FastAPI(
    title="Bookmark API",
    description="书签管理 API",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境改成具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(bookmarks.router)

@app.get("/")
def root():
    return {"message": "Bookmark API is running", "docs": "/docs"}
```

创建 `app/__init__.py`（空文件）：
```bash
# Windows
New-Item -ItemType File app/__init__.py
New-Item -ItemType File app/routers/__init__.py

# macOS/Linux
touch app/__init__.py
touch app/routers/__init__.py
```

## 运行项目

```bash
uvicorn app.main:app --reload
```

打开 http://127.0.0.1:8000/docs，你会看到完整的 API 文档。

## 测试 API

### 1. 注册用户

在 Swagger UI 中测试 `POST /auth/register`：

```json
{
  "email": "alice@example.com",
  "username": "alice",
  "password": "password123"
}
```

### 2. 登录

测试 `POST /auth/login`（点击 Try it out，填写表单）：
- username: `alice`
- password: `password123`

复制返回的 `access_token`。

### 3. 认证

点击 Swagger UI 右上角的 **Authorize** 按钮，输入：
```
Bearer <your_access_token>
```

### 4. 创建书签

测试 `POST /bookmarks/`：

```json
{
  "title": "FastAPI 官方文档",
  "url": "https://fastapi.tiangolo.com",
  "description": "最好的 FastAPI 学习资源"
}
```

### 5. 查看书签

测试 `GET /bookmarks/`，会返回你创建的所有书签。

## 项目结构解析

```
app/
├── main.py           # 应用入口，注册路由
├── database.py       # 数据库连接和会话管理
├── models.py         # SQLAlchemy 模型（数据库表）
├── schemas.py        # Pydantic 模型（API 输入输出）
├── crud.py           # 数据库操作函数
└── routers/
    ├── auth.py       # 认证相关路由（注册、登录）
    └── bookmarks.py  # 书签 CRUD 路由
```

这个结构类似前端的：
```
src/
├── index.ts          # main.py
├── db/
│   └── connection.ts # database.py
├── models/           # models.py
├── types/            # schemas.py
├── services/         # crud.py
└── routes/           # routers/
```

## 小结

恭喜！你已经完成了第一个完整的 Python 后端项目，包含：

- ✅ FastAPI 应用架构
- ✅ SQLAlchemy ORM 数据库操作
- ✅ Pydantic 数据验证
- ✅ JWT 身份验证
- ✅ RESTful API 设计
- ✅ 自动生成的 API 文档

::: tip
这个项目可以直接放到你的 GitHub，作为求职作品。下一章我们会深入学习 SQLAlchemy ORM 和数据库设计。
:::

下一章：[SQLAlchemy ORM 与数据库设计](/blog/backend/python-fullstack/chapter-04/)
