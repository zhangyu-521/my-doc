# Nuxt Lifecycle  'Nuxt' 生命周期

## Server lifecycle  服务器生命周期

 1. Server plugins   服务器插件
     'Nuxt' 由现代服务器引擎 'Nitro' 提供支持。
     'Nitro' 启动时，会初始化并执行位于 `/server/plugins` 目录下的插件。这些插件可以：
       - 捕获并处理应用程序范围内的错误。
       - 注册在 'Nitro' 关闭时执行的钩子。
       - 注册请求生命周期事件的钩子，例如修改响应。

 2. Server middleware  服务器中间件
    'Nitro' 服务器初始化后，`server/middleware/` 下的中间件会针对每个请求执行。中间件可用于身份验证、日志记录或请求转换等任务。

 3. App plugins  应用插件
    首先创建 'Vue' 和 'Nuxt' 实例。之后，'Nuxt' 执行其应用插件。这包括：
      - 内置插件，例如 'Vue Router' 和 'unhead'。
      - 位于 `app/plugins/` 目录中的自定义插件，包括没有后缀的插件（例如 `'myPlugin.ts'`）和带有 `'.server'` 后缀的插件（例如 `'myServerPlugin.server.ts'`）。

 4. Route validation  路线验证
    在初始化插件之后、执行中间件之前，如果 `'definePageMeta'` 函数中定义了 `'validate'` 'validate' 方法，'Nuxt' 会调用该方法。`'validate'` 方法可以是同步的，也可以是异步的，通常用于验证动态路由参数。

    - 如果参数有效，'validate' 函数应返回 'true'。
    - 如果验证失败，则应返回 'false' 或包含 `'status'` 和/或 `'statusText'` 的对象以终止请求。

 5. App middleware  应用中间件
    中间件允许你在导航到特定路由之前运行代码。它通常用于身份验证、重定向或日志记录等任务。

    'Nuxt' 中有三种类型中间件：
      - Global route middleware  **全局路由中间件**
      - Named route middleware  **命名路由中间件**
      - Anonymous (or inline) route middleware **匿名（或内联）路由中间件**

 6. Page and components  页面和组件
     在此步骤中，'Nuxt' 会渲染页面及其组件，并使用 `'useFetch'` 和 `'useAsyncData'` 获取所需的数据。由于服务器端不会进行动态更新或 'DOM' 操作，因此 'Vue' 生命周期钩子（例如 `'onBeforeMount'`、`'onMounted'` 及后续钩子）不会在 'SSR' 期间执行。

 7. HTML Output  'HTML' 输出
    在获取所有必要数据并渲染组件后，'Nuxt' 会将渲染后的组件与 'unhead' 中的设置结合起来，生成完整的 'HTML' 文档。然后，该 'HTML' 文档及其关联数据会被发送回客户端，以完成 'SSR' 流程。


## Client lifecycle  客户端生命周期

1. App plugins  应用插件
  此步骤类似于服务器端执行，包括内置插件和自定义插件。
  - `app/plugins/` 目录中的自定义插件，例如没有后缀的插件（例如 `'myPlugin.ts'`）和带有 `'.client'` 后缀的插件（例如 `'myClientPlugin.client.ts'`），都在客户端执行。

2. Route validation  路线验证
   此步骤与服务器端执行相同，并且如果 `'definePageMeta'` 函数中定义了 `'validate'` 方法，则此步骤也包含在内。

3. App middleware  应用中间件
    'Nuxt' 中间件同时运行在服务器端和客户端。如果您希望某些代码在特定环境中运行，可以考虑将其拆分，使用 `'import.meta.client'` 导入客户端代码，使用 `'import.meta.server'` 导入服务器端代码。

4. Mount Vue 应用和水合
    调用 `'app.mount('#__nuxt')'` 将 'Vue' 应用挂载到 'DOM' 中。如果应用使用 'SSR' 或 'SSG' 模式，'Vue' 会执行一个水合步骤，使客户端应用具有交互性。在水合过程中，'Vue' 会重新创建应用（不包括**服务器组件**），将每个组件与其对应的 'DOM' 节点匹配，并添加 'DOM' 事件监听器。

    为了确保数据正确加载，保持服务器端和客户端数据的一致性至关重要。对于 'API' 请求，建议使用 `'useAsyncData'`、`'useFetch'` 或其他支持**服务器端渲染 ('SSR')** 的组合方法。这些方法可以确保在数据加载过程中重用服务器端获取的数据，避免重复请求。任何新的请求都应该在数据加载完成后才能触发，从而防止数据加载错误。

5.  Vue 生命周期
