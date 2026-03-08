# Nuxt速成

## 约定式路由
``` plain
pages/                    # 自动生成的路由
├── index.vue             # 首页 /
├── about.vue             # /about
├── blog/                 # 嵌套路由
│   ├── index.vue         # /blog
│   └── [slug].vue        # 动态路由 /blog/:slug
└── users/
    └── [...id].vue       # 全匹配路由 /users/1/2/3
```

### 动态路由
``` vue 
<!-- pages/user/[id].vue -->
<script setup>
const route = useRoute()
const { id } = route.params  // 获取 URL 参数
</script>

<template>
  <h1>用户 ID: {{ id }}</h1>
</template>
```

## 自动导入
Nuxt 3 自动导入 Vue/Nuxt API，无需 import：
``` vue
<script setup>
// 这些都不用 import，直接使用！
const count = ref(0)           // Vue
const route = useRoute()       // Nuxt 组合式函数
const { data } = await useFetch('/api/hello')  // 数据获取
</script>
```

### 常用自动导入
| 函数                      | 用途          |
| ----------------------- | ----------- |
| `useRoute()`            | 获取当前路由信息    |
| `useRouter()`           | 路由导航        |
| `useFetch(url)`         | 客户端/服务端数据获取 |
| `useState(key, fn)`     | 跨组件共享状态     |
| `useAsyncData(key, fn)` | 更灵活的数据获取    |


## 数据获取
``` vue
<script setup>
// 方式1: useFetch - 最简单
const { data: posts, pending, error } = await useFetch('https://api.example.com/posts')

// 方式2: useAsyncData - 更灵活，可处理复杂逻辑
const { data: user } = await useAsyncData('user', () => {
  return $fetch(`/api/user/${route.params.id}`)
})

// 方式3: 客户端-only（ssr: false）
const { data: clientData } = await useFetch('/api/stats', {
  server: false  // 只在浏览器执行
})
</script>

<template>
  <div v-if="pending">加载中...</div>
  <div v-else-if="error">错误: {{ error.message }}</div>
  <ul v-else>
    <li v-for="post in posts" :key="post.id">{{ post.title }}</li>
  </ul>
</template>
```


## 服务端api
在 server/api/ 创建后端接口，零配置：

``` ts
// server/api/hello.get.ts
export default defineEventHandler((event) => {
  return {
    message: 'Hello from Nuxt Server!',
    time: new Date().toISOString()
  }
})
// 带参数
// server/api/users/[id].get.ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  return { id, name: `User ${id}` }
})
```


## 状态管理
``` ts
// composables/useCounter.ts（自动导入）
export const useCounter = () => useState('counter', () => 0)

// 页面中使用
<script setup>
const counter = useCounter()  // 跨页面共享状态
</script>
```

## 布局系统
``` vue
<!-- layouts/default.vue -->
<template>
  <div>
    <AppHeader />
    <slot />  <!-- 页面内容插入这里 -->
    <AppFooter />
  </div>
</template>
```

``` vue
<!-- pages/index.vue -->
<script setup>
definePageMeta({
  layout: 'default'  // 指定布局（可省略）
})
</script>
```

### 自定义布局

``` vue
<!-- layouts/admin.vue -->
<template>
  <div class="admin-layout">
    <Sidebar />
    <main><slot /></main>
  </div>
</template>
```

## 常用配置速查
``` ts
// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },     // 开发工具
  
  modules: [                        // 模块
    '@nuxt/ui',                     // UI 组件库
    '@nuxtjs/i18n',                 // 国际化
    '@pinia/nuxt',                  // 状态管理
  ],
  
  css: ['~/assets/css/main.css'],   // 全局样式
  
  runtimeConfig: {                  // 环境变量
    apiSecret: '',                  // 服务端-only
    public: {
      apiBase: '/api'               // 客户端可访问
    }
  },
  
  nitro: {                          // 服务端配置
    routeRules: {
      '/api/**': { cors: true }     // 跨域
    }
  }
})
```

## 部署
``` bash
# 生成静态站点（SSG）
npm run generate  # 输出 dist/ 目录

# 服务端渲染（SSR）
npm run build     # 输出 .output/ 目录
node .output/server/index.mjs
```