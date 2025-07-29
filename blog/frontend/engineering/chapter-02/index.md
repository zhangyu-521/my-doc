# 第2章：包管理与依赖管理

## 本章目标

- 深入理解npm、yarn、pnpm的工作原理
- 掌握package.json的完整配置
- 学会依赖版本管理策略
- 了解私有包管理与发布流程

## 2.1 包管理器深度对比

### npm工作原理

#### 1. 依赖安装机制
```bash
# npm安装过程
npm install lodash

# 1. 解析依赖树
# 2. 检查缓存
# 3. 下载包到缓存
# 4. 解压到node_modules
# 5. 生成package-lock.json
```

#### 2. node_modules结构
```
node_modules/
├── lodash/
│   ├── package.json
│   ├── index.js
│   └── ...
├── .package-lock.json
└── ...
```

### yarn工作原理

#### 1. 并行安装
```bash
# yarn的并行安装
yarn add lodash react

# 同时下载多个包，提高安装速度
```

#### 2. 扁平化依赖
```javascript
// yarn.lock文件示例
lodash@^4.17.21:
  version "4.17.21"
  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz"
  integrity sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==
```

### pnpm工作原理

#### 1. 硬链接机制
```bash
# pnpm的存储结构
~/.pnpm-store/
├── v3/
│   └── files/
│       └── 00/
│           └── 1a2b3c...
└── ...

# 项目中的node_modules
node_modules/
├── .pnpm/
│   └── lodash@4.17.21/
│       └── node_modules/
│           └── lodash/ -> ~/.pnpm-store/v3/files/...
└── lodash -> .pnpm/lodash@4.17.21/node_modules/lodash
```

#### 2. 性能对比
```bash
# 安装速度测试（100个依赖）
npm: 45s
yarn: 30s
pnpm: 15s

# 磁盘占用（相同项目）
npm: 200MB
yarn: 180MB
pnpm: 50MB
```

## 2.2 package.json详解

### 基础字段

```json
{
  "name": "my-frontend-project",
  "version": "1.0.0",
  "description": "A modern frontend project",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "keywords": ["frontend", "react", "typescript"],
  "homepage": "https://github.com/username/project#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/username/project.git"
  },
  "bugs": {
    "url": "https://github.com/username/project/issues"
  }
}
```

### 依赖管理

#### 1. 依赖类型详解
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "lodash": "~4.17.21"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "vite": "^4.0.0"
  },
  "peerDependencies": {
    "react": ">=16.8.0"
  },
  "optionalDependencies": {
    "fsevents": "^2.3.0"
  }
}
```

#### 2. 版本号规则
```bash
# 语义化版本控制 (SemVer)
主版本号.次版本号.修订号

# 版本范围符号
^1.2.3  # 兼容版本：>=1.2.3 <2.0.0
~1.2.3  # 近似版本：>=1.2.3 <1.3.0
1.2.3   # 精确版本：=1.2.3
>=1.2.3 # 大于等于：>=1.2.3
<1.2.3  # 小于：<1.2.3
*       # 任意版本
latest  # 最新版本
```

### 脚本配置

#### 1. 常用脚本
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "clean": "rimraf dist",
    "prebuild": "npm run clean && npm run lint",
    "postbuild": "npm run test"
  }
}
```

#### 2. 脚本钩子
```json
{
  "scripts": {
    "preinstall": "node scripts/check-node-version.js",
    "postinstall": "husky install",
    "prepublishOnly": "npm run build && npm run test",
    "preversion": "npm run lint",
    "version": "npm run format && git add -A src",
    "postversion": "git push && git push --tags"
  }
}
```

### 高级配置

#### 1. 引擎限制
```json
{
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0",
    "pnpm": ">=7.0.0"
  }
}
```

#### 2. 文件配置
```json
{
  "files": [
    "dist",
    "src",
    "README.md",
    "LICENSE"
  ],
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./package.json": "./package.json"
  }
}
```

## 2.3 依赖版本管理策略

### 锁文件管理

#### 1. package-lock.json (npm)
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "my-project",
      "version": "1.0.0",
      "dependencies": {
        "lodash": "^4.17.21"
      }
    },
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg=="
    }
  }
}
```

#### 2. pnpm-lock.yaml (pnpm)
```yaml
lockfileVersion: '6.0'

dependencies:
  lodash:
    specifier: ^4.17.21
    version: 4.17.21

packages:
  /lodash@4.17.21:
    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==}
    dev: false
```

### 依赖更新策略

#### 1. 安全更新
```bash
# 检查安全漏洞
npm audit
pnpm audit

# 自动修复
npm audit fix
pnpm audit --fix

# 查看过期依赖
npm outdated
pnpm outdated
```

#### 2. 版本更新工具
```bash
# 安装npm-check-updates
npm install -g npm-check-updates

# 检查可更新的依赖
ncu

# 更新package.json
ncu -u

# 安装新版本
npm install
```

#### 3. 渐进式更新策略
```javascript
// scripts/update-deps.js
const { execSync } = require('child_process');

const updateStrategy = {
  patch: '^', // 自动更新补丁版本
  minor: '~', // 手动更新次版本
  major: ''   // 谨慎更新主版本
};

function updateDependencies() {
  // 1. 更新补丁版本
  execSync('ncu -u -t patch');
  
  // 2. 运行测试
  execSync('npm test');
  
  // 3. 如果测试通过，提交更改
  execSync('git add package.json package-lock.json');
  execSync('git commit -m "chore: update patch dependencies"');
}
```

## 2.4 私有包管理

### npm私有仓库

#### 1. 配置私有仓库
```bash
# 设置私有仓库地址
npm config set registry http://your-private-registry.com

# 设置作用域仓库
npm config set @yourcompany:registry http://your-private-registry.com
```

#### 2. 发布私有包
```json
// package.json
{
  "name": "@yourcompany/ui-components",
  "version": "1.0.0",
  "private": false,
  "publishConfig": {
    "registry": "http://your-private-registry.com"
  }
}
```

```bash
# 登录私有仓库
npm login --registry=http://your-private-registry.com

# 发布包
npm publish
```

### Monorepo包管理

#### 1. pnpm workspace配置
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/test/**'
```

```json
// 根目录package.json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0"
  }
}
```

#### 2. 包间依赖管理
```json
// packages/ui/package.json
{
  "name": "@mycompany/ui",
  "dependencies": {
    "@mycompany/utils": "workspace:*"
  }
}
```

```bash
# 安装依赖到特定包
pnpm add lodash --filter @mycompany/ui

# 运行特定包的脚本
pnpm --filter @mycompany/ui build

# 运行所有包的脚本
pnpm -r build
```

### 包版本发布流程

#### 1. 自动化发布脚本
```javascript
// scripts/release.js
const { execSync } = require('child_process');
const semver = require('semver');

function release(type = 'patch') {
  // 1. 运行测试
  console.log('Running tests...');
  execSync('npm test', { stdio: 'inherit' });
  
  // 2. 构建项目
  console.log('Building project...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 3. 更新版本号
  console.log(`Bumping ${type} version...`);
  execSync(`npm version ${type}`, { stdio: 'inherit' });
  
  // 4. 发布包
  console.log('Publishing package...');
  execSync('npm publish', { stdio: 'inherit' });
  
  // 5. 推送到Git
  console.log('Pushing to git...');
  execSync('git push && git push --tags', { stdio: 'inherit' });
}

// 使用方式：node scripts/release.js patch
const releaseType = process.argv[2] || 'patch';
release(releaseType);
```

#### 2. GitHub Actions自动发布
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 2.5 依赖安全管理

### 安全审计

#### 1. 定期安全检查
```bash
# 安全审计
npm audit
pnpm audit

# 查看详细信息
npm audit --audit-level moderate

# 自动修复
npm audit fix --force
```

#### 2. 依赖许可证检查
```bash
# 安装许可证检查工具
npm install -g license-checker

# 检查许可证
license-checker --summary
license-checker --csv --out licenses.csv
```

### 依赖分析工具

#### 1. 包大小分析
```bash
# 安装分析工具
npm install -g bundlephobia-cli

# 分析包大小
bundlephobia lodash
```

#### 2. 依赖树分析
```bash
# 查看依赖树
npm ls
pnpm ls

# 查看特定包的依赖
npm ls lodash
pnpm why lodash
```

## 本章小结

本章我们深入学习了：

1. **包管理器原理**：npm、yarn、pnpm的工作机制和性能对比
2. **package.json配置**：完整的配置选项和最佳实践
3. **版本管理策略**：语义化版本控制和更新策略
4. **私有包管理**：私有仓库配置和Monorepo管理
5. **安全管理**：依赖安全审计和许可证检查

## 练习题

1. 配置一个完整的package.json文件，包含所有必要字段
2. 实现一个自动化的依赖更新脚本
3. 搭建一个简单的Monorepo项目结构
4. 创建一个私有npm包并发布到私有仓库

## 下一章预告

下一章我们将学习模块化与构建工具，深入了解ES Modules、Webpack、Vite等现代构建工具的使用。

---

[上一章：前端工程化概述与环境搭建](../chapter-01/) | [返回目录](../) | [下一章：模块化与构建工具](../chapter-03/)
