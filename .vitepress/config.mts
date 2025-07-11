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
      { text: '高级JavaScript', link: '/packages/js-doc/index.md' },
      { text: 'NestJS 实战', link: '/nestjs-tutorial/README.md' },
      { text: 'React Native 教程', link: '/react-native-tutorial/README.md' },
      { text: 'Electron 实战', link: '/electron-tutorial/README.md' },
    ],

    sidebar: [
      {
        text: '高级JavaScript开发指南',
        collapsed: false,
        items: [
          {
            text: '教程概览',
            link: '/packages/js-doc/index.md'
          },
          {
            text: '第1章：JavaScript引擎与执行机制',
            link: '/packages/js-doc/chapter-01/README.md'
          },
          {
            text: '第2章：高级异步编程',
            link: '/packages/js-doc/chapter-02/README.md'
          },
          {
            text: '第3章：内存管理与性能优化',
            link: '/packages/js-doc/chapter-03/README.md'
          },
          {
            text: '第4章：函数式编程进阶',
            link: '/packages/js-doc/chapter-04/README.md'
          },
          {
            text: '第5章：元编程与反射',
            link: '/packages/js-doc/chapter-05/README.md'
          },
          {
            text: '第6章：模块系统深度解析',
            link: '/packages/js-doc/chapter-06/README.md'
          },
          {
            text: '第7章：TypeScript高级特性',
            link: '/packages/js-doc/chapter-07/README.md'
          },
          {
            text: '第8章：设计模式在JavaScript中的应用',
            link: '/packages/js-doc/chapter-08/README.md'
          },
          {
            text: '第9章：现代JavaScript工具链',
            link: '/packages/js-doc/chapter-09/README.md'
          },
        ]
      },
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
        text: 'NestJS 基础',
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
        text: 'NestJS 实战教程',
        collapsed: true,
        items: [
          {
            text: '教程概览',
            link: '/nestjs-tutorial/README.md'
          },
          {
            text: '第1章：项目初始化与环境配置',
            link: '/nestjs-tutorial/chapter-01/README.md'
          },
          {
            text: '第2章：数据库设计与Prisma配置',
            link: '/nestjs-tutorial/chapter-02/README.md'
          },
          {
            text: '第3章：用户模块开发',
            link: '/nestjs-tutorial/chapter-03/README.md'
          },
          {
            text: '第4章：JWT认证与授权',
            link: '/nestjs-tutorial/chapter-04/README.md'
          },
          {
            text: '第5章：文章管理模块',
            link: '/nestjs-tutorial/chapter-05/README.md'
          },
          {
            text: '第6章：公共组件与工具',
            link: '/nestjs-tutorial/chapter-06/README.md'
          },
          {
            text: '第7章：API文档与测试',
            link: '/nestjs-tutorial/chapter-07/README.md'
          },
          {
            text: '第8章：部署与优化',
            link: '/nestjs-tutorial/chapter-08/README.md'
          },
          {
            text: '第9章：项目总结与扩展',
            link: '/nestjs-tutorial/chapter-09/README.md'
          },
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
        text: 'Electron 实战教程',
        collapsed: true,
        items: [
          {
            text: '教程概览',
            link: '/electron-tutorial/README.md'
          },
          {
            text: '第1章：Electron基础入门',
            link: '/electron-tutorial/chapter-01/README.md'
          },
          {
            text: '第2章：主进程与渲染进程',
            link: '/electron-tutorial/chapter-02/README.md'
          },
          {
            text: '第3章：窗口管理与BrowserWindow',
            link: '/electron-tutorial/chapter-03/README.md'
          },
          {
            text: '第4章：进程间通信(IPC)',
            link: '/electron-tutorial/chapter-04/README.md'
          },
          {
            text: '第5章：菜单与快捷键',
            link: '/electron-tutorial/chapter-05/README.md'
          },
          {
            text: '第6章：文件系统与对话框',
            link: '/electron-tutorial/chapter-06/README.md'
          },
          {
            text: '第7章：应用打包与分发',
            link: '/electron-tutorial/chapter-07/README.md'
          },
          {
            text: '第8章：性能优化与安全',
            link: '/electron-tutorial/chapter-08/README.md'
          },
          {
            text: '第9章：实战项目：桌面笔记应用',
            link: '/electron-tutorial/chapter-09/README.md'
          },
        ]
      },
      {
        text: "Electron 基础",
        collapsed: true,
        items:[
          { text: 'Electron应用打包与分发指南', link: '/packages/electron/build-option.md' },
          { text: 'Electron进程间通信深度解析', link: '/packages/electron/electron-communication.md' },
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
      },
      {
        text: 'React Native 教程',
        collapsed: true,
        items: [
          {
            text: '教程概览',
            link: '/react-native-tutorial/README.md'
          },
          {
            text: '第1章：React Native入门',
            link: '/react-native-tutorial/chapter-01/README.md'
          },
          {
            text: '第2章：核心组件与布局',
            link: '/react-native-tutorial/chapter-02/README.md'
          },
          {
            text: '第3章：导航与路由',
            link: '/react-native-tutorial/chapter-03/README.md'
          },
          {
            text: '第4章：状态管理',
            link: '/react-native-tutorial/chapter-04/README.md'
          },
          {
            text: '第5章：网络请求与数据处理',
            link: '/react-native-tutorial/chapter-05/README.md'
          },
          {
            text: '第6章：本地存储',
            link: '/react-native-tutorial/chapter-06/README.md'
          },
          {
            text: '第7章：原生功能集成',
            link: '/react-native-tutorial/chapter-07/README.md'
          },
          {
            text: '第8章：性能优化',
            link: '/react-native-tutorial/chapter-08/README.md'
          },
          {
            text: '第9章：打包与发布',
            link: '/react-native-tutorial/chapter-09/README.md'
          },
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
