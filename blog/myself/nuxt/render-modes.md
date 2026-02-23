# Rendering Modes  渲染模式

 1. 通用渲染
 2. 客户端渲染
 3. 混合渲染


 ## 通用渲染
当浏览器请求启用了通用渲染的 'URL' 时，'Nuxt' 会在服务器环境中运行 'JavaScript' ('Vue.js') 代码，并将完全渲染的 'HTML' 页面返回给浏览器。如果页面是预先生成的，'Nuxt' 也可能从缓存中返回完全渲染的 'HTML' 页面。与客户端渲染不同，用户可以立即获得应用程序的全部初始内容。

'HTML' 文档下载完成后，浏览器会解析它，'Vue.js' 会接管文档的控制权。之前在服务器端运行的 'JavaScript' 代码会在客户端（浏览器）后台再次运行，通过将监听器绑定到 'HTML' 来实现交互功能（因此称为**通用渲染**）。这个过程称为**"水合"**（**'Hydration'**）。水合完成后，页面就可以享受动态界面和页面过渡等效果。

**哪些是服务器端渲染的，哪些是客户端渲染的？**

``` vue
<script setup lang="ts">
const counter = ref(0) // executes in server and client environments

const handleClick = () => {
  counter.value++ // executes only in a client environment
}
</script>

<template>
  <div>
    <p>Count: {{ counter }}</p>
    <button @click="handleClick">
      Increment
    </button>
  </div>
</template>

```

在初始请求时，由于 'counter' 引用位于 `<p>` 标签内，因此它在服务器端初始化。此时 'handleClick' 的内容不会执行。在浏览器加载过程中，'counter' 引用会被重新初始化。`'handleClick'` 最终会绑定到按钮；因此可以合理推断，'handleClick' 'handleClick' 的主体始终在浏览器环境中运行。


中间件和页面在服务器端和客户端运行，用于数据填充。插件可以在服务器端、客户端或两者上渲染。组件也可以强制仅在客户端运行。可组合组件和实用工具会根据其使用上下文进行渲染。


## 客户端渲染

传统的 'Vue.js' 应用默认在浏览器（或**客户端**）中渲染。然后，'Vue.js' 会在浏览器下载并解析所有包含创建当前界面指令的 'JavaScript' 代码后生成 'HTML' 元素。

您可以在 `'nuxt.config.ts'` 文件中启用 'Nuxt' 的客户端渲染：

``` ts
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,
})
```


## 混合渲染
混合渲染允许使用**路由规则**为每个路由设置不同的缓存规则，并决定服务器应如何响应给定 'URL' 上的新请求。

``` ts
export default defineNuxtConfig({
  routeRules: {
    // Homepage pre-rendered at build time
    '/': { prerender: true },
    // Products page generated on demand, revalidates in background, cached until API response changes
    '/products': { swr: true },
    // Product pages generated on demand, revalidates in background, cached for 1 hour (3600 seconds)
    '/products/**': { swr: 3600 },
    // Blog posts page generated on demand, revalidates in background, cached on CDN for 1 hour (3600 seconds)
    '/blog': { isr: 3600 },
    // Blog post page generated on demand once until next deployment, cached on CDN
    '/blog/**': { isr: true },
    // Admin dashboard renders only on client-side
    '/admin/**': { ssr: false },
    // Add cors headers on API routes
    '/api/**': { cors: true },
    // Redirects legacy urls
    '/old-page': { redirect: '/new-page' },
  },
})

```
### Route Rules  路由规则
- `'redirect'` : 'string' - 定义服务器端重定向。
- `'ssr'` : 'boolean' - 禁用应用程序部分 'HTML' 的服务器端渲染，使其仅在浏览器中渲染（ `'ssr: false'`）
- `'cors'` : 'boolean' - 如果 `'cors: true'` 则自动添加 'CORS' 标头 - 您可以通过覆盖 `'headers'` 来自定义输出
- `'headers'` : 'object' - 为网站的各个部分添加特定的标头，例如，您的资源。
- `'swr'` : 'number' | 'boolean' - 向服务器响应添加缓存头，并将其缓存在服务器或反向代理上，缓存时间 ('TTL') 可配置。'Nitro' 的 `'node-server'` 预设能够缓存完整的响应。当 'TTL' 过期时，将发送缓存的响应，同时在后台重新生成页面。如果设置为 'true'，则会添加一个不带 'MaxAge' 的 `'stale-while-revalidate'` 标头。
- `'isr'` : 'number' | 'boolean' - 其行为与 `'swr'` 相同，区别在于我们可以将响应添加到支持此功能的平台（目前为 'Netlify' 或 'Vercel'）的 'CDN' 缓存中。如果设置为 'true'，则内容将保留在 'CDN' 中，直到下次部署。
- `'prerender'` : 'boolean' - 在构建时预渲染路由，并将其作为静态资源包含在构建中。
- `'noScripts'` : 'boolean' - 禁用网站部分 'Nuxt' 脚本和 'JS' 资源提示的渲染。
- `'appMiddleware'`: 'string' | 'string[]' | 'Record<string, boolean>' - 允许您定义中间件，该中间件应该或不应该在应用程序的 'Vue' 应用部分（即，不是您的 'Nitro' 路由）中的页面路径上运行。
