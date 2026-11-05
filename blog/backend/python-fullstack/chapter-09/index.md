# 第9章：部署与生产化

## 概述

经过前面 8 章的学习，我们已经完成了一个功能完整的 AI 书签系统：

```
✅ 用户系统（JWT 认证）
✅ 书签 CRUD（完整的增删改查）
✅ 标签分类（多对多关系）
✅ 性能优化（缓存、连接池、索引）
✅ AI 摘要（LLM 集成）
✅ 智能问答（RAG）
✅ AI Agent（Function Calling）
```

这一章我们要做的：
- ✅ Docker 容器化
- ✅ Docker Compose 编排
- ✅ 云服务器部署
- ✅ 域名与 HTTPS
- ✅ 监控与日志
- ✅ 性能调优

::: tip
生产环境和开发环境差别很大，这一章教你如何让项目真正可用。
:::

---

## 容器化

### 1. 编写 Dockerfile

创建 `Dockerfile`：

```dockerfile
# 使用官方 Python 镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. 创建 requirements.txt

```bash
# 导出当前依赖
pip freeze > requirements.txt
```

或手动创建：

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
redis==5.0.1
openai==1.10.0
tiktoken==0.5.2
python-dotenv==1.0.0
qdrant-client==1.7.0
celery==5.3.6
```

### 3. 创建 .dockerignore

```txt
__pycache__/
*.py[cod]
*$py.class
.env
.venv
venv/
*.db
*.log
.git/
.vscode/
.idea/
```

### 4. 构建镜像

```bash
docker build -t bookmark-api:latest .
```

### 5. 运行容器

```bash
docker run -d \
  --name bookmark-api \
  -p 8000:8000 \
  -e DATABASE_URL="sqlite:///./bookmark.db" \
  -e SECRET_KEY="your-secret-key" \
  -e OPENAI_API_KEY="sk-xxx" \
  bookmark-api:latest
```

---

## Docker Compose 编排

### 1. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  # FastAPI 应用
  api:
    build: .
    container_name: bookmark-api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://bookmark:password@db:5432/bookmark
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
      - SECRET_KEY=${SECRET_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL}
    depends_on:
      - db
      - redis
      - qdrant
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  # PostgreSQL 数据库
  db:
    image: postgres:16-alpine
    container_name: bookmark-db
    environment:
      - POSTGRES_USER=bookmark
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=bookmark
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: bookmark-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data

  # Qdrant 向量数据库
  qdrant:
    image: qdrant/qdrant:latest
    container_name: bookmark-qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

  # Celery Worker
  celery-worker:
    build: .
    container_name: bookmark-celery
    command: celery -A app.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://bookmark:password@db:5432/bookmark
      - REDIS_HOST=redis
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    container_name: bookmark-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
```

### 2. 创建 .env 文件

```bash
# 应用配置
SECRET_KEY=your-production-secret-key-change-this
DATABASE_URL=postgresql://bookmark:password@db:5432/bookmark

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Qdrant
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# OpenAI/DeepSeek
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.deepseek.com
```

### 3. 配置 Nginx

创建 `nginx.conf`：

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:8000;
    }

    # HTTP 重定向到 HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS 配置
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL 证书
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # SSL 配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # 请求体大小限制
        client_max_body_size 10M;

        # 代理配置
        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket 支持（如果需要）
        location /ws {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # 静态文件缓存
        location /static {
            alias /app/static;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 4. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

---

## 云服务器部署

### 1. 准备服务器

推荐配置：
- **CPU**: 2 核
- **内存**: 4GB
- **硬盘**: 40GB SSD
- **系统**: Ubuntu 22.04 LTS

云服务商：
- 阿里云
- 腾讯云
- AWS
- DigitalOcean

### 2. 安装 Docker

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加用户到 docker 组
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt install docker-compose-plugin
```

### 3. 上传代码

**方式1：Git（推荐）**：

```bash
# 在服务器上
git clone https://github.com/your-username/bookmark-api.git
cd bookmark-api
```

**方式2：SCP**：

```bash
# 在本地
scp -r ./bookmark-api user@server-ip:/home/user/
```

### 4. 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑配置
nano .env

# 修改以下配置：
# - SECRET_KEY（生成新的密钥）
# - OPENAI_API_KEY（你的 API Key）
# - DATABASE_URL（生产数据库）
```

### 5. 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 6. 初始化数据库

```bash
# 进入容器
docker-compose exec api bash

# 运行迁移
python -c "from app.database import Base, engine; Base.metadata.create_all(engine)"

# 或使用 Alembic
alembic upgrade head

# 退出容器
exit
```

---

## 域名与 HTTPS

### 1. 购买域名

推荐域名注册商：
- 阿里云
- 腾讯云
- Cloudflare
- GoDaddy

### 2. DNS 解析

在域名管理后台添加 A 记录：

```
类型: A
主机记录: @
记录值: 你的服务器 IP
TTL: 600
```

### 3. 申请 SSL 证书

**方式1：Let's Encrypt（免费）**：

```bash
# 安装 Certbot
sudo apt install certbot

# 申请证书
sudo certbot certonly --standalone -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 复制证书到项目
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
sudo chown -R $USER:$USER ./ssl

# 设置自动续期
sudo certbot renew --dry-run
```

**方式2：云服务商免费证书**：
- 阿里云 SSL 证书
- 腾讯云 SSL 证书
- 下载证书文件
- 上传到 `./ssl` 目录

### 4. 更新 Nginx 配置

修改 `nginx.conf` 中的 `server_name`：

```nginx
server_name your-domain.com;
```

### 5. 重启 Nginx

```bash
docker-compose restart nginx
```

### 6. 测试

访问 `https://your-domain.com/docs` 查看 API 文档。

---

## 数据库迁移（SQLite → PostgreSQL）

### 1. 更新依赖

```bash
pip install psycopg2-binary
```

### 2. 更新配置

在 `.env` 中：

```bash
DATABASE_URL=postgresql://bookmark:password@db:5432/bookmark
```

### 3. 数据迁移

创建脚本 `scripts/migrate_to_postgres.py`：

```python
import sys
sys.path.append(".")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User, Bookmark, Tag
import os

# 原数据库（SQLite）
sqlite_engine = create_engine("sqlite:///./bookmark.db")
SQLiteSession = sessionmaker(bind=sqlite_engine)
sqlite_session = SQLiteSession()

# 新数据库（PostgreSQL）
postgres_url = os.getenv("DATABASE_URL")
postgres_engine = create_engine(postgres_url)
PostgresSession = sessionmaker(bind=postgres_engine)
postgres_session = PostgresSession()

# 创建表
Base.metadata.create_all(postgres_engine)

def migrate():
    """迁移数据"""
    try:
        # 迁移用户
        users = sqlite_session.query(User).all()
        for user in users:
            postgres_session.merge(user)
        print(f"✅ 迁移了 {len(users)} 个用户")
        
        # 迁移标签
        tags = sqlite_session.query(Tag).all()
        for tag in tags:
            postgres_session.merge(tag)
        print(f"✅ 迁移了 {len(tags)} 个标签")
        
        # 迁移书签
        bookmarks = sqlite_session.query(Bookmark).all()
        for bookmark in bookmarks:
            postgres_session.merge(bookmark)
        print(f"✅ 迁移了 {len(bookmarks)} 个书签")
        
        postgres_session.commit()
        print("✅ 数据迁移完成！")
        
    except Exception as e:
        postgres_session.rollback()
        print(f"❌ 迁移失败：{e}")
    finally:
        sqlite_session.close()
        postgres_session.close()

if __name__ == "__main__":
    migrate()
```

运行迁移：

```bash
python scripts/migrate_to_postgres.py
```

---

## 监控与日志

### 1. 配置日志

创建 `app/logging_config.py`：

```python
import logging
from logging.handlers import RotatingFileHandler
import os

def setup_logging():
    """配置日志"""
    # 创建日志目录
    os.makedirs("logs", exist_ok=True)
    
    # 配置格式
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    
    # 文件处理器（自动轮转）
    file_handler = RotatingFileHandler(
        'logs/app.log',
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)
    
    # 错误日志
    error_handler = RotatingFileHandler(
        'logs/error.log',
        maxBytes=10 * 1024 * 1024,
        backupCount=10
    )
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)
    
    # 根日志器
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    logger.addHandler(error_handler)
    
    # 控制台输出
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
```

在 `app/main.py` 中启用：

```python
from app.logging_config import setup_logging

setup_logging()

@app.on_event("startup")
def startup_event():
    logging.info("应用启动")
```

### 2. 添加健康检查

```python
@app.get("/health")
def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/readiness")
def readiness_check(db: Session = Depends(get_db)):
    """就绪检查（包含数据库连接）"""
    try:
        # 测试数据库连接
        db.execute("SELECT 1")
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database not ready")
```

### 3. 监控指标

使用 Prometheus + Grafana：

```bash
# docker-compose.yml 添加
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 性能调优

### 1. Uvicorn 优化

```bash
# 使用多进程
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --limit-concurrency 1000 \
  --timeout-keep-alive 5
```

### 2. Gunicorn + Uvicorn

```bash
pip install gunicorn

# 启动
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log
```

### 3. 数据库连接池

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,          # 连接池大小
    max_overflow=10,       # 最大溢出连接
    pool_timeout=30,       # 获取连接超时
    pool_recycle=3600,     # 连接回收时间
    pool_pre_ping=True     # 连接前检查
)
```

### 4. Redis 优化

```python
from redis import ConnectionPool

pool = ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    max_connections=50,
    decode_responses=True
)

redis_client = redis.Redis(connection_pool=pool)
```

---

## 备份策略

### 1. 数据库备份

创建脚本 `scripts/backup.sh`：

```bash
#!/bin/bash

# 配置
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份 PostgreSQL
docker-compose exec -T db pg_dump -U bookmark bookmark > \
  $BACKUP_DIR/bookmark_$DATE.sql

# 压缩
gzip $BACKUP_DIR/bookmark_$DATE.sql

# 删除旧备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ 备份完成：bookmark_$DATE.sql.gz"
```

### 2. 定时备份

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/scripts/backup.sh
```

### 3. 恢复备份

```bash
# 解压
gunzip bookmark_20240101_020000.sql.gz

# 恢复
docker-compose exec -T db psql -U bookmark bookmark < \
  bookmark_20240101_020000.sql
```

---

## 安全加固

### 1. 环境变量安全

```bash
# 不要将 .env 提交到 Git
echo ".env" >> .gitignore

# 生成强密钥
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. 限流

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/auth/login")
@limiter.limit("5/minute")
def login(request: Request):
    pass
```

### 3. 防火墙

```bash
# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 完整部署清单

```bash
# 1. 准备服务器
✅ 购买云服务器
✅ 安装 Docker & Docker Compose
✅ 配置防火墙

# 2. 代码部署
✅ 上传代码
✅ 配置环境变量
✅ 构建镜像

# 3. 服务启动
✅ 启动 Docker Compose
✅ 初始化数据库
✅ 查看日志确认正常

# 4. 域名配置
✅ 购买域名
✅ DNS 解析
✅ 申请 SSL 证书
✅ 配置 Nginx

# 5. 测试
✅ API 接口测试
✅ 性能测试
✅ 安全测试

# 6. 监控
✅ 配置日志
✅ 设置健康检查
✅ 配置备份

# 7. 上线
✅ 正式发布
✅ 通知用户
```

---

## 小结

恭喜！你已经完成了整个教程：

**技术栈**：
```
FastAPI + SQLAlchemy + PostgreSQL + Redis + Qdrant
+ OpenAI/DeepSeek + Celery + Docker + Nginx
```

**功能列表**：
- ✅ 用户认证（JWT）
- ✅ 书签管理（CRUD）
- ✅ 标签系统（多对多）
- ✅ 性能优化（缓存、索引）
- ✅ AI 摘要生成
- ✅ 智能问答（RAG）
- ✅ AI Agent
- ✅ 生产部署

**你学到了**：
1. FastAPI 从零到部署
2. 数据库关系设计
3. 性能优化技巧
4. AI 应用开发（LLM、RAG、Agent）
5. Docker 容器化
6. 生产环境部署

**接下来**：
- 添加前端界面（React/Vue）
- 实现更多 AI 功能
- 集成第三方服务
- 优化用户体验
- 扩展到更多场景

---

**全系列完结！** 🎉

希望这个教程对你有帮助。如果有任何问题，欢迎交流！

---

上一章：[AI 助手 Agent](/blog/backend/python-fullstack/chapter-08/)

[返回目录](/blog/backend/python-fullstack/)
