import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/my-doc/',
  title: "zyDocs",
  description: "该学习了，少年",
  head: [['link', { rel: 'icon', href: '/my-doc/zy.ico' }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/zy.png',
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
          {text: 'Blob', link: '/packages/js-doc/blob.md' },
        ]
      },
      {
        text: 'CICD',
        collapsed: true,
        items: [
          { text: 'GitHub Actions', link: '/packages/CICD/github-actions.md' },
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
