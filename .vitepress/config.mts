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
      // { text: '前端基础', link: '/packages/js-doc/html5andcss3' },
    ],

    sidebar: [
      {
        text: 'js杂谈',
        collapsed: true,
        items: [
          { text: 'Blob', link: '/packages/js-doc/blob.md' },
          { text: 'axios是怎样取消请求的', link: '/packages/js-doc/cancelPromise.md' },
        ]
      },
      {
        text: '前端工程化',
        collapsed: true,
        items: [
          { text: 'ast', link: '/packages/engineer/ast.md' },
          { text: 'npm', link: '/packages/engineer/npm.md' },
          { text: '将静态网站部署到Github Pages', link: '/packages/CICD/github-actions.md' },
          { text: 'monorepo', link: '/packages/engineer/monorepo.md' },
          { text: 'tsConfig文件详解', link: '/packages/engineer/tsconfig.json文件详解.md' },
          { text: 'vite-plugins-API', link: '/packages/engineer/vite-plugin.md' },

        ]
      },
      {
        text: 'vue',
        collapsed: true,
        items: [
          {text: 'vue中对节点的标记shapeFlag', link: '/packages/vue/vueShapeFlag.md'},
          {text: 'Vue响应式数据实现原理', link: '/packages/vue/vue-reactivity.md'}
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
      },
      {
        text: 'Prisma',
        collapsed: true,
        items: [
          { text: 'prisma', link: '/packages/prisma/prisma.md'}
        ]
      },
      {
        text: "AI探索",
        collapsed: true,
        items:[
          { text: 'mcp基础', link: '/packages/ai/mcp.md' },
          { text: 'mcp进阶', link: '/packages/ai/editMcpServer.md' },
          { text: '万能提示词模板', link: '/packages/ai/prompt.md' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],

    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

        //中文配置
    langMenuLabel: "多语言", 
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
    outlineTitle: "目录",


    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present zhangyu'
    }
  },

  markdown: {
    //显示行数
    lineNumbers: true,
    //中文配置
    container:{
      tipLabel: "提示",
      warningLabel: "警告",
      noteLabel: "注意",
      dangerLabel: "危险",
      detailsLabel: "详情",
      infoLabel: "信息",
    }
   
  },
})
