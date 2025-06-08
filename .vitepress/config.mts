import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "mydoc",
  description: "学习笔记",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '前端基础', link: '/packages/js-doc/html5andcss3' },
      { text: 'Examples', link: '/packages/pa' }
    ],

    sidebar: [
      {
        text: 'js杂谈',
        collapsed: true,
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
        ]
      },
      {
        text: 'Nest',
        collapsed: true,
        items: [
          { text: 'Nest初识', link: '/packages/nest-doc' },
          { text: 'CLI', link: '/packages/nest-doc/cli.md' },
          { text: 'Controllers控制器', link: '/packages/nest-doc/Controllers.md' },
          { text: 'Providers提供者', link: '/packages/nest-doc/Providers.md' },
          { text: 'Modules模块', link: '/packages/nest-doc/Modules.md' },
          { text: 'Middleware中间件', link: '/packages/nest-doc/Middleware.md' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
