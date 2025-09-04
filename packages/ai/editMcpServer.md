# 用nodejs编写一个基础的MCP SERVER

::: tip
[需要用到的SDK](https://github.com/modelcontextprotocol/typescript-sdk)

[npm @modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
:::

## 编写一个js文件
``` js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new McpServer({
  name: "MCP Server Boilerplate",
  version: "1.0.0",
})

server.tool("add", "Add two numbers", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}))

server.tool("getApiKey", "Get the API key", {}, async ({}) => ({
  content: [{ type: "text", text: process.env.API_KEY }],
}))

const transport = new StdioServerTransport()
await server.connect(transport)
```


## 配置MCP文件
``` json
{
  "mcpServers": {
    "mcp-server-hotnews": {
      "command": "npx",
      "args": [
        "-y",
        "@wopal/mcp-server-hotnews"
      ]
    },
    "mcp-server": {
      "command": "node",
      "args": [
        "E:/desktop/mcp-server-node/mcp-server.js"
      ]
    }
  }
}
```

**这样我们在向`Cline`,提出问题，要求两数相加，`Cline`就会调用我们的`MCP server`的`tool`，进而就调到add函数**


> 详细这个`SDK`相关的`api` 和 概念请参考[文档](https://modelcontextprotocol.io/docs/concepts/resources)