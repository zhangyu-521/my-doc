# 使用 Node.js 编写 MCP Server

本章将带你一步步使用 Node.js 实现一个功能完整的 MCP Server，涵盖工具（Tools）、资源（Resources）和服务配置等核心知识点。

## 准备工作

### 1. 安装依赖

首先确保你已安装 Node.js 环境，并在项目中添加 MCP SDK：

```bash
npm install @modelcontextprotocol/sdk zod
```

> 推荐使用 pnpm 或 npm 包管理器。当前 myDoc 项目使用的是 `pnpm`。

### 2. 创建 MCP Server 文件

创建 `mcp-server.js` 文件作为服务器入口：

```js
// mcp-server.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "My First MCP Server",
  version: "1.0.0",
});

// 在这里注册你的 Tools 和 Resources

const transport = new StdioServerTransport();
await server.connect(transport);
```

## 实现核心功能：Tools

### 什么是 Tool？

Tool 是 MCP Server 提供的可调用功能，允许 LLM 发起请求来执行特定操作，例如数学计算、API 调用或数据查询。

### 定义一个简单的加法工具

```js
server.tool(
  "add", // 工具名称
  "Add two numbers", // 描述
  { a: z.number(), b: z.number() }, // 输入参数 schema
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);
```

### 异步工具示例：获取天气信息

```js
import axios from 'axios';

server.tool(
  "get_weather",
  "Get current weather for a location",
  {
    location: z.string().describe("City name or zip code")
  },
  async ({ location }) => {
    try {
      const response = await axios.get(`https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`);
      const { temp_c, condition } = response.data.current;
      return {
        content: [{ 
          type: "text", 
          text: `Temperature: ${temp_c}°C, Condition: ${condition.text}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: "Failed to fetch weather data" }],
        isError: true
      };
    }
  }
);
```

> 注意：敏感信息如 API Key 应通过环境变量注入，避免硬编码。

## 配置 MCP Server 连接

为了让 Host（如 Cline）能够启动你的 MCP Server，需要提供一个配置文件 `mcp.json`：

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": [
        "./mcp-server.js"
      ]
    }
  }
}
```

然后在 Host 中加载此配置即可发现并连接到你的 Server。

## 错误处理与最佳实践

- **输入验证**：使用 Zod 对传入参数进行严格校验
- **错误返回**：设置 `isError: true` 标识失败结果
- **超时控制**：为异步操作设置合理的超时时间
- **日志记录**：添加调试日志便于排查问题

