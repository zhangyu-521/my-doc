# MCP Skills 开发与团队共享

## 什么是 MCP Skills？

简单来说，`Skills` 是对 `MCP Tools` 的封装和组织，让大模型能够更好地理解和使用一组相关的工具能力。

::: tip
Skills = 一组相关 Tools + 使用说明 + 示例
:::

## 开发自定义 Skill

### 基础结构

一个 Skill 通常包含：
- `tools` - 工具函数集合
- `description` - Skill 的描述说明
- `examples` - 使用示例

```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new McpServer({
  name: "database-skill",
  version: "1.0.0",
})

// 数据库查询 Skill
server.tool("querySQL", "执行 SQL 查询", {
  sql: z.string().describe("SQL 查询语句"),
  params: z.array(z.any()).optional().describe("查询参数")
}, async ({ sql, params }) => {
  // 实现查询逻辑
  const result = await db.query(sql, params || [])
  return {
    content: [{ type: "text", text: JSON.stringify(result) }]
  }
}))

server.tool("getTables", "获取所有表结构", {}, async () => {
  const tables = await db.getTables()
  return {
    content: [{ type: "text", text: JSON.stringify(tables) }]
  }
}))

const transport = new StdioServerTransport()
await server.connect(transport)
```

### 添加 Skill 描述

让 AI 更好地理解 Skill 的用途：

```js
server.resource("skill-docs", "skill://docs", async (uri) => ({
  contents: [{
    uri: uri.href,
    text: `
## 数据库操作 Skill

这个 Skill 提供了数据库操作能力：
- querySQL: 执行 SQL 查询
- getTables: 获取表结构信息

使用示例：
1. 先调用 getTables 了解数据库结构
2. 使用 querySQL 执行具体查询
3. 支持参数化查询防止 SQL 注入
    `
  }]
}))
```

## 团队共享方案

### 方案一：NPM 包发布（推荐）

将 Skill 打包成 npm 包，团队统一安装：

**1. 创建 Skill 包**

```bash
mkdir mcp-skill-database
cd mcp-skill-database
npm init -y
```

**package.json**
```json
{
  "name": "@yourcompany/mcp-skill-database",
  "version": "1.0.0",
  "bin": {
    "mcp-skill-database": "./index.js"
  },
  "files": ["index.js", "dist/"],
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.0.0"
  }
}
```

**2. 团队配置**

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@yourcompany/mcp-skill-database"],
      "env": {
        "DB_HOST": "{{DB_HOST}}",
        "DB_PASSWORD": "{{DB_PASSWORD}}"
      }
    }
  }
}
```

### 方案二：Git 仓库直接引用

适合私有仓库或快速迭代：

**1. 配置文件模板**

创建 `mcp-config.template.json`：
```json
{
  "mcpServers": {
    "company-skill": {
      "command": "node",
      "args": ["{{SKILL_PATH}}/company-skill/index.js"],
      "env": {
        "API_KEY": "{{API_KEY}}"
      }
    }
  }
}
```

**2. 环境变量脚本**

`setup-mcp.js`：
```js
const fs = require('fs')
const path = require('path')
const os = require('os')

// 读取模板
const template = fs.readFileSync('./mcp-config.template.json', 'utf8')

// 替换变量
const config = template
  .replace(/{{SKILL_PATH}}/g, process.env.SKILL_PATH || '/default/path')
  .replace(/{{API_KEY}}/g, process.env.API_KEY || '')

// 写入配置目录
const mcpDir = path.join(os.homedir(), '.config', 'cline')
if (!fs.existsSync(mcpDir)) {
  fs.mkdirSync(mcpDir, { recursive: true })
}

fs.writeFileSync(
  path.join(mcpDir, 'mcp_settings.json'),
  config
)

console.log('✅ MCP 配置已生成')
```

**3. 团队使用**

```bash
# 克隆 Skill 仓库
git clone https://github.com/yourcompany/mcp-skills.git

# 设置环境变量
export SKILL_PATH=/path/to/mcp-skills
export API_KEY=your-api-key

# 生成配置
node setup-mcp.js
```

### 方案三：私有 Registry

使用 Verdaccio 或 Nexus 搭建私有 npm 仓库：

**1. 配置 .npmrc**

```ini
@yourcompany:registry=https://your-npm-registry.com
//your-npm-registry.com/:_authToken=${NPM_TOKEN}
```

**2. 发布和安装**

```bash
# 发布
npm publish --access restricted

# 团队安装
npx -y @yourcompany/mcp-skill-database
```

### 方案四：配置同步工具

开发 CLI 工具统一管理团队配置：

```js
#!/usr/bin/env node
// mcp-manager.js

const { Command } = require('commander')
const program = new Command()

program
  .command('init')
  .description('初始化 MCP 配置')
  .action(() => {
    // 拉取最新配置
    // 验证环境变量
    // 生成配置文件
  })

program
  .command('add <skill>')
  .description('添加 Skill')
  .action((skill) => {
    // 添加 Skill 到配置
  })

program
  .command('sync')
  .description('同步团队配置')
  .action(() => {
    // 从远程拉取最新配置
    // 合并本地配置
  })

program.parse()
```

**使用方式**：
```bash
mcp-manager init
mcp-manager add @yourcompany/database-skill
mcp-manager sync
```

## 团队最佳实践

### 1. 版本管理

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@yourcompany/mcp-skill-database@1.0.0"],
      "description": "数据库操作 Skill v1.0.0"
    }
  }
}
```

### 2. 环境隔离

```json
{
  "mcpServers": {
    "database-dev": {
      "command": "npx",
      "args": ["-y", "@yourcompany/mcp-skill-database"],
      "env": { "DB_HOST": "dev.db.company.com" }
    },
    "database-prod": {
      "command": "npx",
      "args": ["-y", "@yourcompany/mcp-skill-database"],
      "env": { "DB_HOST": "prod.db.company.com" }
    }
  }
}
```

### 3. 权限控制

Skill 内部实现权限检查：

```js
server.tool("deleteTable", "删除表（仅管理员）", {
  table: z.string()
}, async ({ table }) => {
  // 检查用户权限
  if (!process.env.IS_ADMIN) {
    return {
      content: [{
        type: "text",
        text: "❌ 需要管理员权限"
      }],
      isError: true
    }
  }
  // 执行删除...
}))
```

### 4. 文档同步

每个 Skill 包应包含 README：

```markdown
# @yourcompany/mcp-skill-database

## 功能
- querySQL: SQL 查询
- getTables: 获取表结构

## 配置
```json
{
  "env": {
    "DB_HOST": "数据库地址",
    "DB_PASSWORD": "数据库密码"
  }
}
```

## 使用示例
问 AI："查询用户表中最近注册的 10 个用户"
```

## 推荐方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| NPM 包 | 稳定 Skill | 版本管理、易安装 | 需要发布流程 |
| Git 仓库 | 快速迭代 | 实时更新 | 需要手动同步 |
| 私有 Registry | 企业团队 | 安全可控 | 需要搭建维护 |
| 配置同步工具 | 大规模团队 | 统一管理 | 需要开发工具 |

::: tip
小团队推荐 NPM 包 + Git 仓库方案；
大企业推荐 私有 Registry + 配置同步工具。
:::
