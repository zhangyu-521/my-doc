# vite 插件
`Vite` 插件是基于 `Rollup` 插件接口设计的，同时扩展了 `Vite` 特有的功能选项。这意味着大多数 Rollup 插件可以直接在 `Vite` 中使用，同时 `Vite` 插件还可以控制开发服务器的行为，例如拦截请求、自定义模块加载和转换逻辑、实现热模块替换（HMR）等

::: tip
约定：`Vite` 插件通常以 `vite-plugin-` 为前缀，语义清晰的名称   `Rollup` 插件通常以 `rollup-plugin-` 前缀、语义清晰的名称。
:::

## 插件分类
- 官方插件：由 `Vite` 团队维护，用于支持主流框架（如 `Vue、React、Svelte` 等）和功能的插件
  - `@vitejs/plugin-vue`：支持 `Vue 3` 单文件组件`（SFC）`
  - `@vitejs/plugin-react`：支持 `React Fast Refresh`
  - `@vitejs/plugin-legacy`：为传统浏览器提供支持
  - ....
- 社区插件
  - `vite-plugin-remove-console`：移除生产环境中的 `console` 语句
  - `vite-plugin-compression`：将代码压缩为 `gzip` 或 `br` 格式
  - `vite-plugin-purgecss`：移除未使用的 `CSS` 样式
  - .....
- 兼容的 `Rollup` 插件：许多现有的 `Rollup` 插件可以直接或稍作修改后在 `Vite` 中使用
  - `rollup-plugin-visualizer`：可视化分析打包后的模块大小
  - `rollup-plugin-external-globals`：将外部依赖映射为全局变量
  - ....

## vite独有钩子
## config
- `config`：在解析 `Vite` 配置前调用。可以用来修改配置。
  在解析 `Vite` 配置前调用。钩子接收原始用户配置（命令行选项指定的会与配置文件合并）和一个描述配置环境的变量，包含正在使用的 mode 和 command。它可以返回一个将被深度合并到现有配置中的部分配置对象，或者直接改变配置（如果默认的合并不能达到预期的结果）。
``` js
// 返回部分配置（推荐）
const partialConfigPlugin = () => ({
  name: 'return-partial',
  config: () => ({
    resolve: {
      alias: {
        foo: 'bar',
      },
    },
  }),
})

// 直接改变配置（应仅在合并不起作用时使用）
const mutateConfigPlugin = () => ({
  name: 'mutate-config',
  config(config, { command }) {
    if (command === 'build') {
      config.root = 'foo'
    }
  },
})
```
::: tip
用户插件在运行这个钩子之前会被解析，因此在 `config` 钩子中注入其他插件不会有任何效果。
:::




## configResolved
- `configResolved`：在解析 `Vite` 配置后调用。`使用这个钩子读取和存储最终解析的配置`。当插件需要根据运行的命令做一些不同的事情时，它也很有用。
```js
const examplePlugin = () => {
  let config

  return {
    name: 'read-config',

    configResolved(resolvedConfig) {
      // 存储最终解析的配置
      config = resolvedConfig
    },

    // 在其他钩子中使用存储的配置
    transform(code, id) {
      if (config.command === 'serve') {
        // dev: 由开发服务器调用的插件
      } else {
        // build: 由 Rollup 调用的插件
      }
    },
  }
}
```



## configureServer
- `configureServer`：在开发服务器启动时调用。可以用来修改开发服务器配置,最常见的用例是在内部 connect 应用程序中添加自定义中间件。
  ``` js
  const myPlugin = () => ({
  name: 'configure-server',
  configureServer(server) {
    server.middlewares.use((req, res, next) => { // 和node的中间件一样
      // 自定义请求处理...
    })
   },
  })
  ```
  ::: tip
  `configureServer` 钩子将在内部中间件被安装前调用，所以自定义的中间件将会默认会比内部中间件早运行。如果你想注入一个在内部中间件 之后 运行的中间件，你可以从 `configureServer` 返回一个函数，将会在内部中间件安装后被调用
  :::
  ``` js
    const myPlugin = () => ({
  name: 'configure-server',
  configureServer(server) {
    // 返回一个在内部中间件安装后
    // 被调用的后置钩子
    return () => {
      server.middlewares.use((req, res, next) => {
        // 自定义请求处理...
        })
        }
    },
  })
  ```
在某些情况下，其他插件钩子可能需要访问开发服务器实例（例如访问 `websocket` 服务器、文件系统监视程序或模块图）。这个钩子也可以用来存储服务器实例以供其他钩子访问:
``` js
const myPlugin = () => {
  let server
  return {
    name: 'configure-server',
    configureServer(_server) {
      server = _server
    },
    transform(code, id) {
      if (server) {
        // 使用 server...
      }
    },
  }
}
```
::: warning
注意 `configureServer` 在运行生产版本时不会被调用，所以其他钩子需要防范它缺失。
:::


## configurePreviewServer 
与 `configureServer` 相同，但用于预览服务器。`configurePreviewServer` 这个钩子与 `configureServer` 类似，也是在其他中间件安装前被调用。如果你想要在其他中间件 之后 安装一个插件，你可以从 `configurePreviewServer` 返回一个函数，它将会在内部中间件被安装之后再调用：
```js
const myPlugin = () => ({
  name: 'configure-preview-server',
  configurePreviewServer(server) {
    // 返回一个钩子，会在其他中间件安装完成后调用
    return () => {
      server.middlewares.use((req, res, next) => {
        // 自定义处理请求 ...
      })
    }
  },
})
```


## transformIndexHtml
转换 `index.html` 的专用钩子。钩子接收当前的 `HTML` 字符串和转换上下文。上下文在开发期间暴露`ViteDevServer`实例，在构建期间暴露 `Rollup` 输出的包。

这个钩子可以是异步的，并且可以返回以下其中之一:
- 经过转换的 `HTML` 字符串
- 注入到现有 `HTML` 中的标签描述符对象数组（{ `tag, attrs, children `}）。每个标签也可以指定它应该被注入到哪里（默认是在 `<head>` 之前）
- 一个包含` { html, tags }` 的对象
``` js
const htmlPlugin = () => {
  return {
    name: 'html-transform',
    transformIndexHtml(html) {
      return html.replace(
        /<title>(.*?)<\/title>/,
        `<title>Title replaced!</title>`,
      )
    },
  }
}
```

## handleHotUpdate
执行自定义 HMR 更新处理。钩子接收一个带有以下签名的上下文对象：
``` ts
interface HmrContext {
  file: string
  timestamp: number
  modules: Array<ModuleNode>
  read: () => string | Promise<string>
  server: ViteDevServer
}
```

## 其他钩子(Rollup的钩子)
- `buildStart`：在构建启动时调用。钩子接收解析后的 `Rollup` 选项对象。这个钩子在内部中间件安装后调用，因此插件可以添加自定义中间件。
- `buildEnd`：在构建结束时调用。钩子接收 `Rollup` 的输出包。
- `closeBundle`：在构建关闭时调用。钩子接收 `Rollup` 的输出包。
- `transform`: 会在每个模块的代码被处理时触发。用来对代码魔改等


## 插件执行顺序
一个 `Vite` 插件可以额外指定一个 `enforce` 属性（类似于 `webpack` 加载器）来调整它的应用顺序。`enforce` 的值可以是`pre` 或 `post`。解析后的插件将按照以下顺序排列：
- `Alias` 插件(配置别名的插件)
- `enforce: 'pre'` 的用户插件
- Vite 核心插件
- 没有 `enforce` 的用户插件
- Vite 构建用的插件
- `enforce: 'post'` 的用户插件
- Vite 后置构建插件（最小化，manifest，报告）


## 编写一个在build时删除console语句的vite插件
思路：**使用babel操作ast语法树，将console语句删除**

``` bash
npm install @babel/parser @babel/traverse @babel/types --save-dev
```

``` js
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

// 插件名称
const PLUGIN_NAME = 'vite-plugin-remove-console';

// 移除 console 语句的函数
function removeConsoleStatements(code) {
  // 解析代码为 AST
  const ast = parse(code, {
    sourceType: 'module', // ES 模块
    plugins: ['jsx'], // 支持 JSX
  });

  // 遍历 AST 并移除 console 调用
  traverse(ast, {
    CallExpression(path) {
      const callee = path.get('callee');
      if (
        callee.isMemberExpression() &&
        callee.get('object').isIdentifier({ name: 'console' }) &&
        t.isIdentifier(callee.get('property').node, { name: 'log' })
      ) {
        path.remove(); // 移除 console.log 调用
      }
    },
  });

  // 将 AST 转换回代码
  return generate(ast);
}

// Vite 插件定义
export default function vitePluginRemoveConsole() {
  return {
    name: PLUGIN_NAME,
    transform(code, id) {
      // 仅在构建时生效
      if (this.env.MODE === 'production') {
        return removeConsoleStatements(code);
      }
      return code;
    },
  };
}
```









> [参考vite插件](https://cn.vite.dev/guide/api-plugin.html)