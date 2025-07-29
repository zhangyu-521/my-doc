# 第9章：CI/CD与自动化部署

## 本章目标

- 掌握GitHub Actions工作流配置
- 学会自动化构建与测试流程
- 了解多环境部署策略
- 实现发布流程自动化

## 9.1 GitHub Actions基础

### 工作流配置

#### 1. 基础CI工作流
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run type checking
      run: npm run type-check
      
    - name: Run tests
      run: npm run test:coverage
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
```

#### 2. 构建工作流
```yaml
# .github/workflows/build.yml
name: Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build for production
      run: npm run build
      env:
        VITE_API_URL: ${{ secrets.PROD_API_URL }}
        VITE_APP_ENV: production
        
    - name: Build for staging
      run: npm run build:staging
      env:
        VITE_API_URL: ${{ secrets.STAGING_API_URL }}
        VITE_APP_ENV: staging
        
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: |
          dist/
          dist-staging/
        retention-days: 30
```

### 高级工作流配置

#### 1. 条件执行和依赖
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm run build
      - name: Get version
        id: version
        run: echo "version=$(npm pkg get version | tr -d '"')" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - name: Deploy to staging
        run: echo "Deploying version ${{ needs.build.outputs.version }} to staging"

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    steps:
      - name: Deploy to production
        run: echo "Deploying version ${{ needs.build.outputs.version }} to production"
```

#### 2. 矩阵构建策略
```yaml
# .github/workflows/cross-platform.yml
name: Cross Platform Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
        include:
          - os: ubuntu-latest
            node-version: 18
            deploy: true
        exclude:
          - os: windows-latest
            node-version: 16
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy
      if: matrix.deploy
      run: echo "Deploying from ${{ matrix.os }} with Node ${{ matrix.node-version }}"
```

## 9.2 自动化构建与测试

### 多阶段构建流程

#### 1. 完整的CI/CD流水线
```yaml
# .github/workflows/pipeline.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码质量检查
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Lint check
        run: npm run lint
        
      - name: Type check
        run: npm run type-check
        
      - name: Format check
        run: npm run format:check

  # 单元测试
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  # E2E测试
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  # 构建
  build:
    needs: [quality-check, unit-tests]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build for ${{ matrix.environment }}
        run: npm run build:${{ matrix.environment }}
        env:
          VITE_API_URL: ${{ secrets[format('{0}_API_URL', upper(matrix.environment))] }}
          VITE_APP_ENV: ${{ matrix.environment }}
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-${{ matrix.environment }}
          path: dist/

  # 安全扫描
  security-scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level high
        
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 缓存优化策略

#### 1. 依赖缓存
```yaml
# 高效的缓存配置
steps:
  - uses: actions/checkout@v4
  
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '18'
      cache: 'npm'
      
  # 自定义缓存
  - name: Cache node modules
    uses: actions/cache@v3
    with:
      path: |
        ~/.npm
        node_modules
        .next/cache
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-
```

#### 2. 构建缓存
```yaml
# 构建产物缓存
- name: Cache build output
  uses: actions/cache@v3
  with:
    path: |
      dist
      .vite
    key: ${{ runner.os }}-build-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-build-
```

## 9.3 多环境部署策略

### 环境配置管理

#### 1. GitHub环境配置
```yaml
# 环境保护规则配置
name: Deploy with Environment Protection

on:
  push:
    branches: [ main ]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          echo "API URL: ${{ vars.API_URL }}"
        env:
          DEPLOY_TOKEN: ${{ secrets.STAGING_DEPLOY_TOKEN }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          echo "API URL: ${{ vars.API_URL }}"
        env:
          DEPLOY_TOKEN: ${{ secrets.PROD_DEPLOY_TOKEN }}
```

#### 2. 动态环境部署
```yaml
# 动态环境部署
name: Dynamic Environment Deploy

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install and build
        run: |
          npm ci
          npm run build
        env:
          VITE_API_URL: https://api-preview-${{ github.event.number }}.example.com
          
      - name: Deploy to preview environment
        run: |
          # 部署到预览环境
          echo "Deploying PR #${{ github.event.number }} to preview"
          
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed to: https://preview-${{ github.event.number }}.example.com'
            })
```

### 部署策略

#### 1. 蓝绿部署
```yaml
# 蓝绿部署策略
name: Blue-Green Deployment

on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build application
        run: npm run build
        
      - name: Deploy to green environment
        run: |
          # 部署到绿色环境
          ./scripts/deploy-green.sh
          
      - name: Run health checks
        run: |
          # 健康检查
          ./scripts/health-check.sh green
          
      - name: Switch traffic to green
        run: |
          # 切换流量到绿色环境
          ./scripts/switch-traffic.sh green
          
      - name: Cleanup blue environment
        run: |
          # 清理蓝色环境
          ./scripts/cleanup-blue.sh
```

#### 2. 滚动部署
```yaml
# 滚动部署策略
name: Rolling Deployment

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        instance: [1, 2, 3, 4]
      max-parallel: 2  # 每次最多更新2个实例
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to instance ${{ matrix.instance }}
        run: |
          echo "Deploying to instance ${{ matrix.instance }}"
          # 部署逻辑
          
      - name: Health check instance ${{ matrix.instance }}
        run: |
          # 健康检查
          ./scripts/health-check.sh ${{ matrix.instance }}
```

## 9.4 发布流程自动化

### 版本管理

#### 1. 自动版本发布
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [ main ]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v3
        with:
          semantic_version: 19
          extra_plugins: |
            @semantic-release/changelog
            @semantic-release/git
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### 2. 发布配置
```javascript
// .releaserc.js
module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
};
```

### Docker化部署

#### 1. Dockerfile
```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源码并构建
COPY . .
RUN npm run build

# 生产镜像
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 2. Docker构建和推送
```yaml
# Docker构建和推送
name: Docker Build and Push

on:
  push:
    tags: ['v*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 部署脚本

#### 1. 部署脚本示例
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}

echo "🚀 Deploying version $VERSION to $ENVIRONMENT"

# 构建Docker镜像
docker build -t myapp:$VERSION .

# 推送到镜像仓库
docker tag myapp:$VERSION registry.example.com/myapp:$VERSION
docker push registry.example.com/myapp:$VERSION

# 更新Kubernetes部署
kubectl set image deployment/myapp-$ENVIRONMENT myapp=registry.example.com/myapp:$VERSION

# 等待部署完成
kubectl rollout status deployment/myapp-$ENVIRONMENT

# 运行健康检查
./scripts/health-check.sh $ENVIRONMENT

echo "✅ Deployment completed successfully"
```

#### 2. 健康检查脚本
```bash
#!/bin/bash
# scripts/health-check.sh

ENVIRONMENT=${1:-staging}
MAX_ATTEMPTS=30
ATTEMPT=1

echo "🔍 Running health checks for $ENVIRONMENT"

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS"
  
  if curl -f -s "https://api-$ENVIRONMENT.example.com/health" > /dev/null; then
    echo "✅ Health check passed"
    exit 0
  fi
  
  echo "❌ Health check failed, retrying in 10 seconds..."
  sleep 10
  ATTEMPT=$((ATTEMPT + 1))
done

echo "💥 Health check failed after $MAX_ATTEMPTS attempts"
exit 1
```

## 本章小结

本章我们学习了：

1. **GitHub Actions**：工作流配置、矩阵构建和条件执行
2. **自动化构建**：多阶段流水线、缓存优化和安全扫描
3. **多环境部署**：环境管理、蓝绿部署和滚动部署
4. **发布自动化**：版本管理、Docker化和部署脚本

## 练习题

1. 配置一个完整的CI/CD流水线，包含测试、构建和部署
2. 实现多环境部署策略，支持预览环境
3. 创建自动化发布流程，包含版本管理
4. 配置Docker化部署和健康检查

## 下一章预告

下一章我们将学习微前端与大型项目架构，包括Monorepo管理、微前端架构设计和组件库开发。

---

[上一章：多环境管理与配置](../chapter-08/) | [返回目录](../) | [下一章：微前端与大型项目架构](../chapter-10/)
