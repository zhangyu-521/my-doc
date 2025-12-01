# MCP 综合实践与调试指南

本章将整合前三章的知识点，构建一个完整的 MCP Server 应用，并介绍调试、测试和部署的最佳实践。

## 构建一个完整的 MCP Server

我们将创建一个名为 `Project Assistant` 的 MCP Server，它具备以下功能：

- **Tool**: 列出当前项目的依赖包（`list_dependencies`）
- **Resource**: 暴露项目中的 `package.json` 文件
- **Resource Template**: 支持查看任意 `.md` 文档内容

### 完整代码示例

```js
// project-assistant.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

const server = new McpServer({
  name: "Project Assistant",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: { subscribe: true }
  }
});

// Tool: 列出 dependencies
server.tool(
  "list_dependencies",
  "List all npm dependencies in package.json",
  {},
  async () => {
    try {
      const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const deps = Object.keys(pkg.dependencies || {});
      return {
        content: [{
          type: "text",
          text: `Dependencies: ${deps.join(', ')}`
        }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: "Failed to read package.json" }],
        isError: true
      };
    }
  }
);

// Resource: 暴露 package.json
server.resource(
  "file:///project/package.json",
  {
    name: "package.json",
    title: "项目依赖配置文件",
    mimeType: "application/json",
    annotations: {
      priority: 1.0,
      audience: ["assistant"]
    },
    async loader() {
      const content = await fs.readFile('package.json', 'utf-8');
      return { text: content };
    }
  }
);

// Resource Template: 动态加载 Markdown 文件
server.resourceTemplate(
  "file:///{docPath}.md",
  {
    name: "Documentation",
    title: "📄 项目文档",
    mimeType: "text/markdown",
    async loader(params) {
      const filePath = path.resolve(`./docs/${params.docPath}.md`);
      // 简单路径遍历防护
      if (!filePath.startsWith(path.resolve('./docs'))) {
        throw new Error('Invalid path');
      }
      const content = await fs.readFile(filePath, 'utf-8');
      return { text: content };
    }
  }
);

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 对应的 mcp.json 配置

```json
{
  "mcpServers": {
    "project-assistant": {
      "command": "node",
      "args": [
        "./project-assistant.js"
      ]
    }
  }
}
```

## 调试技巧

### 1. 查看通信日志

大多数 Host（如 Cline）提供“开发者工具”或日志面板，可查看完整的 JSON-RPC 请求与响应。

### 2. 添加本地日志

在关键逻辑中添加 `console.log` 输出调试信息：

```js
console.log('[MCP Server] Received tool call:', method, params);
```

> 注意：避免输出敏感信息。

### 3. 使用单元测试

使用 Jest 或 Vitest 编写测试用例验证 Tool 行为：

```js
// test/project-assistant.test.js
describe('list_dependencies tool', () => {
  it('should return dependency list', async () => {
    const result = await server.invokeTool('list_dependencies', {});
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('pnpm');
  });
});
```

## 部署建议

- **本地开发**：直接运行 `node mcp-server.js`，Host 通过 stdio 连接
- **生产环境**：可封装为 CLI 工具发布到 npm，便于他人安装使用
- **安全性**：始终校验输入、限制权限、避免执行任意命令
- **兼容性**：遵循 MCP 协议规范，确保与其他 Host 兼容

## 总结

通过本系列教程，你已经掌握了使用 Node.js 编写 MCP Server 的完整技能链：

1. 理解 MCP 架构三大角色（Host/Client/Server）
2. 实现功能性 Tools 提供操作能力
3. 暴露上下文 Resources 提供数据支持
4. 构建完整应用并掌握调试部署方法

现在你可以开始构建自己的 MCP 插件，为 LLM 注入无限可能！