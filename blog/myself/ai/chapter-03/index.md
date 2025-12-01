# MCP 资源管理（Resources）

本章将深入讲解 MCP 的 **Resources** 概念，以及如何使用 Node.js 实现资源暴露与动态更新机制。

## 什么是 Resource？

Resource 是 MCP Server 提供的可读取数据源，允许 LLM 获取上下文信息，例如项目文件、数据库表结构、文档内容等。与 Tool 不同，Resource 更侧重于“提供信息”而非“执行操作”。

每个 Resource 由一个唯一的 URI 标识，支持文本或二进制内容，并可携带元数据（如 MIME 类型、大小、修改时间等）。

## 注册静态资源

你可以通过 `server.resource()` 方法注册固定路径的资源：

```js
server.resource(
  "file:///project/README.md", // 唯一 URI
  {
    name: "README.md",
    title: "项目说明文档",
    mimeType: "text/markdown",
    async loader() {
      const content = await fs.promises.readFile("./README.md", "utf-8");
      return {
        text: content
      };
    }
  }
);
```

> 注意：`loader` 函数是异步的，仅在客户端请求时才加载内容，有助于提升性能。

## 动态资源列表

如果需要暴露多个或动态生成的资源，可以使用 `server.listResources()`：

```js
server.listResources(async () => {
  const files = await fs.promises.readdir("./docs");
  return files.map(file => ({
    uri: `file:///docs/${file}`,
    name: file,
    mimeType: "text/markdown"
  }));
});
```

这样 Host 可以通过 `resources/list` 请求获取所有可用资源。

## 支持资源变更通知

为了实现实时同步，Server 可以声明支持 `subscribe` 和 `listChanged` 能力：

```js
const server = new McpServer({
  name: "Resource-aware MCP Server",
  version: "1.0.0",
  capabilities: {
    resources: {
      subscribe: true,      // 支持订阅单个资源变化
      listChanged: true     // 支持资源列表变更通知
    }
  }
});
```

当某个资源发生变化时，发送更新通知：

```js
// 模拟文件变更
fs.watch("./docs", (eventType) => {
  if (eventType === 'change') {
    server.notifyResourceUpdated("file:///docs/guide.md");
  }
});
```

## 使用 Resource Templates 参数化资源

Resource Templates 允许你定义参数化的资源路径，例如按用户 ID 查询配置文件：

```js
server.resourceTemplate(
  "file:///{userId}/config.json",
  {
    name: "User Config",
    title: "📁 用户配置文件",
    mimeType: "application/json",
    async loader(params) {
      const { userId } = params;
      const path = `./users/${userId}/config.json`;
      if (await fsExists(path)) {
        const content = await fs.promises.readFile(path, 'utf-8');
        return { text: content };
      }
      throw new Error('User config not found');
    }
  }
);
```

## 安全与权限控制

- **URI 验证**：始终验证传入的 URI 是否合法
- **访问控制**：检查用户权限后再返回敏感资源
- **路径遍历防护**：防止 `../../../etc/passwd` 类型攻击
- **内容编码**：二进制数据应使用 Base64 编码传输

