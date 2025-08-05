import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/my-doc/',
  title: "zyDocs",
  description: "该学习了，少年",
  head: [['link', { rel: 'icon', href: '/zy.ico' }]],

  // 构建优化配置
  vite: {
    build: {
      chunkSizeWarningLimit: 2000, // 提高警告阈值到2MB，避免警告
    }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/zy.png',
    nav: [
      // { text: '博客首页', link: '/blog/' },
      {
        text: 'JavaScript',
        items: [
          { text: '高级 JavaScript', link: '/blog/javascript/advanced/' },
          { text: '插件系统教程', link: '/blog/javascript/plugin-system/' },
        ]
      },
      {
        text: '前端开发',
        items: [
          { text: '前端工程化', link: '/blog/frontend/engineering/' },
          { text: 'Vue.js 学习', link: '/blog/frontend/vue/' },
        ]
      },
      {
        text: '后端开发',
        items: [
          { text: 'NestJS 实战', link: '/blog/backend/nestjs/' },
          { text: 'Node.js 进阶', link: '/blog/backend/nodejs/chapter-01' },
        ]
      },
      {
        text: '移动端',
        items: [
          { text: 'React Native', link: '/blog/mobile/react-native/' },
        ]
      },
      {
        text: '桌面应用',
        items: [
          { text: 'Electron 实战', link: '/blog/desktop/electron/' },
        ]
      },
      // {
      //   text: '工程化',
      //   items: [
      //     { text: 'CI/CD 实践', link: '/blog/engineering/cicd/' },
      //     { text: 'AI 工具应用', link: '/blog/engineering/ai/' },
      //   ]
      // },
    ],

    sidebar: {
      // JavaScript 插件系统教程
      '/blog/javascript/plugin-system/': [
        {
          text: 'JavaScript 插件系统完整教程',
          collapsed: false,
          items: [
            { text: '教程概览', link: '/blog/javascript/plugin-system/' },
            { text: '第1章：插件系统概念与原理', link: '/blog/javascript/plugin-system/chapter-01/' },
            { text: '第2章：简单插件系统实现', link: '/blog/javascript/plugin-system/chapter-02/' },
            { text: '第3章：钩子系统设计', link: '/blog/javascript/plugin-system/chapter-03/' },
            { text: '第4章：插件生命周期管理', link: '/blog/javascript/plugin-system/chapter-04/' },
            { text: '第5章：插件间通信机制', link: '/blog/javascript/plugin-system/chapter-05/' },
            { text: '第6章：高级特性实现', link: '/blog/javascript/plugin-system/chapter-06/' },
            { text: '第7章：实战案例 - 构建工具插件', link: '/blog/javascript/plugin-system/chapter-07/' },
            { text: '第8章：性能优化与最佳实践', link: '/blog/javascript/plugin-system/chapter-08/' },
            { text: '第9章：调试与测试', link: '/blog/javascript/plugin-system/chapter-09/' },
            { text: '第10章：总结与展望', link: '/blog/javascript/plugin-system/chapter-10/' },
          ]
        }
      ],

      // JavaScript 高级教程
      '/blog/javascript/advanced/': [
        {
          text: '高级 JavaScript 开发指南',
          collapsed: false,
          items: [
            { text: '教程概览', link: '/blog/javascript/advanced/' },
            { text: '第1章：JavaScript引擎与执行机制', link: '/blog/javascript/advanced/chapter-01/' },
            { text: '第2章：高级异步编程', link: '/blog/javascript/advanced/chapter-02/' },
            { text: '第3章：内存管理与性能优化', link: '/blog/javascript/advanced/chapter-03/' },
            { text: '第4章：函数式编程进阶', link: '/blog/javascript/advanced/chapter-04/' },
            { text: '第5章：元编程与反射', link: '/blog/javascript/advanced/chapter-05/' },
            { text: '第6章：模块系统深入', link: '/blog/javascript/advanced/chapter-06/' },
            { text: '第7章：TypeScript 进阶', link: '/blog/javascript/advanced/chapter-07/' },
            { text: '第8章：设计模式', link: '/blog/javascript/advanced/chapter-08/' },
            { text: '第9章：项目实战', link: '/blog/javascript/advanced/chapter-09/' },
          ]
        }
      ],

      // NestJS 实战教程
      '/blog/backend/nestjs/': [
        {
          text: 'NestJS 实战教程',
          collapsed: false,
          items: [
            { text: '教程概览', link: '/blog/backend/nestjs/' },
            { text: '第1章：项目初始化与环境配置', link: '/blog/backend/nestjs/chapter-01/' },
            { text: '第2章：控制器与路由', link: '/blog/backend/nestjs/chapter-02/' },
            { text: '第3章：服务与依赖注入', link: '/blog/backend/nestjs/chapter-03/' },
            { text: '第4章：模块系统', link: '/blog/backend/nestjs/chapter-04/' },
            { text: '第5章：中间件与拦截器', link: '/blog/backend/nestjs/chapter-05/' },
            { text: '第6章：异常处理与过滤器', link: '/blog/backend/nestjs/chapter-06/' },
            { text: '第7章：数据库集成与ORM', link: '/blog/backend/nestjs/chapter-07/' },
            { text: '第8章：认证授权与安全', link: '/blog/backend/nestjs/chapter-08/' },
            { text: '第9章：测试与部署', link: '/blog/backend/nestjs/chapter-09/' },
          ]
        }
      ],

      // Node.js 进阶教程
      '/blog/backend/nodejs/': [
        {
          text: 'Node.js 进阶指南',
          collapsed: false,
          items: [
            { text: '教程概览', link: '/blog/backend/nodejs/' },
            { text: '第1章：Node.js 核心概念', link: '/blog/backend/nodejs/chapter-01/' },
            { text: '第2章：异步编程深入', link: '/blog/backend/nodejs/chapter-02/' },
            { text: '第3章：文件系统与流', link: '/blog/backend/nodejs/chapter-03/' },
            { text: '第4章：网络编程', link: '/blog/backend/nodejs/chapter-04/' },
            { text: '第5章：进程与集群', link: '/blog/backend/nodejs/chapter-05/' },
            { text: '第6章：性能优化', link: '/blog/backend/nodejs/chapter-06/' },
            { text: '第7章：数据库集成', link: '/blog/backend/nodejs/chapter-07/' },
            { text: '第8章：安全与最佳实践', link: '/blog/backend/nodejs/chapter-08/' },
            { text: '第9章：部署与运维', link: '/blog/backend/nodejs/chapter-09/' },
          ]
        }
      ],

      // 前端工程化教程
      '/blog/frontend/engineering/': [
        {
          text: '前端工程化实践',
          collapsed: false,
          items: [
            { text: '教程概览', link: '/blog/frontend/engineering/' },
            { text: '第1章：项目初始化与规范', link: '/blog/frontend/engineering/chapter-01/' },
            { text: '第2章：构建工具配置', link: '/blog/frontend/engineering/chapter-02/' },
            { text: '第3章：代码质量控制', link: '/blog/frontend/engineering/chapter-03/' },
            { text: '第4章：自动化测试', link: '/blog/frontend/engineering/chapter-04/' },
            { text: '第5章：CI/CD 流程', link: '/blog/frontend/engineering/chapter-05/' },
            { text: '第6章：性能优化', link: '/blog/frontend/engineering/chapter-06/' },
            { text: '第7章：监控与错误追踪', link: '/blog/frontend/engineering/chapter-07/' },
            { text: '第8章：微前端架构', link: '/blog/frontend/engineering/chapter-08/' },
            { text: '第9章：组件库开发', link: '/blog/frontend/engineering/chapter-09/' },
            { text: '第10章：最佳实践总结', link: '/blog/frontend/engineering/chapter-10/' },
          ]
        }
      ],

      // React Native 教程
      '/blog/mobile/react-native/': [
        {
          text: 'React Native 完整教程',
          collapsed: false,
          items: [
            { text: '教程概览', link: '/blog/mobile/react-native/' },
            { text: '第1章：环境搭建与项目初始化', link: '/blog/mobile/react-native/chapter-01/' },
            { text: '第2章：基础组件与布局', link: '/blog/mobile/react-native/chapter-02/' },
            { text: '第3章：导航与路由', link: '/blog/mobile/react-native/chapter-03/' },
            { text: '第4章：状态管理', link: '/blog/mobile/react-native/chapter-04/' },
            { text: '第5章：网络请求与数据处理', link: '/blog/mobile/react-native/chapter-05/' },
            { text: '第6章：原生模块集成', link: '/blog/mobile/react-native/chapter-06/' },
            { text: '第7章：性能优化', link: '/blog/mobile/react-native/chapter-07/' },
            { text: '第8章：调试与测试', link: '/blog/mobile/react-native/chapter-08/' },
            { text: '第9章：发布与部署', link: '/blog/mobile/react-native/chapter-09/' },
          ]
        }
      ],

      // Electron 实战教程
      '/blog/desktop/electron/': [
        {
          text: 'Electron 实战指南',
          collapsed: false,
          items: [
            { text: '教程概览', link: '/blog/desktop/electron/' },
            { text: '第1章：Electron 基础与环境搭建', link: '/blog/desktop/electron/chapter-01/' },
            { text: '第2章：主进程与渲染进程', link: '/blog/desktop/electron/chapter-02/' },
            { text: '第3章：窗口管理与菜单', link: '/blog/desktop/electron/chapter-03/' },
            { text: '第4章：进程间通信', link: '/blog/desktop/electron/chapter-04/' },
            { text: '第5章：原生API集成', link: '/blog/desktop/electron/chapter-05/' },
            { text: '第6章：应用打包与分发', link: '/blog/desktop/electron/chapter-06/' },
            { text: '第7章：性能优化与安全', link: '/blog/desktop/electron/chapter-07/' },
            { text: '第8章：自动更新机制', link: '/blog/desktop/electron/chapter-08/' },
            { text: '第9章：项目实战与部署', link: '/blog/desktop/electron/chapter-09/' },
          ]
        }
      ],

      // JavaScript 系列
      '/blog/javascript/': [
        {
          text: 'JavaScript 系列',
          collapsed: false,
          items: [
            { text: '系列概览', link: '/blog/javascript/' },
            { text: '高级 JavaScript', link: '/blog/javascript/advanced/' },
            { text: '插件系统教程', link: '/blog/javascript/plugin-system/' },
          ]
        }
      ],

      // 前端开发
      '/blog/frontend/': [
        {
          text: '前端开发',
          collapsed: false,
          items: [
            { text: '前端概览', link: '/blog/frontend/' },
            { text: '前端工程化', link: '/blog/frontend/engineering/' },
            { text: 'Vue.js 学习', link: '/blog/frontend/vue/' },
          ]
        }
      ],

      // 后端开发
      '/blog/backend/': [
        {
          text: '后端开发',
          collapsed: false,
          items: [
            { text: '后端概览', link: '/blog/backend/' },
            { text: 'NestJS 实战', link: '/blog/backend/nestjs/' },
            { text: 'Node.js 进阶', link: '/blog/backend/nodejs/' },
            { text: 'Prisma ORM', link: '/blog/backend/prisma/' },
          ]
        }
      ],

      // 移动端开发
      '/blog/mobile/': [
        {
          text: '移动端开发',
          collapsed: false,
          items: [
            { text: '移动端概览', link: '/blog/mobile/' },
            { text: 'React Native', link: '/blog/mobile/react-native/' },
          ]
        }
      ],

      // 桌面应用开发
      '/blog/desktop/': [
        {
          text: '桌面应用开发',
          collapsed: false,
          items: [
            { text: '桌面应用概览', link: '/blog/desktop/' },
            { text: 'Electron 实战', link: '/blog/desktop/electron/' },
          ]
        }
      ],

      // 工程化与运维
      '/blog/engineering/': [
        {
          text: '工程化与运维',
          collapsed: false,
          items: [
            { text: '工程化概览', link: '/blog/engineering/' },
            { text: 'CI/CD 实践', link: '/blog/engineering/cicd/' },
            { text: 'AI 工具应用', link: '/blog/engineering/ai/' },
          ]
        }
      ],

      // 博客首页侧边栏
      '/blog/': [
        {
          text: 'zyDocs 博客',
          collapsed: false,
          items: [
            { text: '博客首页', link: '/blog/' },
            { text: 'JavaScript 系列', link: '/blog/javascript/' },
            { text: '前端开发', link: '/blog/frontend/' },
            { text: '后端开发', link: '/blog/backend/' },
            { text: '移动端开发', link: '/blog/mobile/' },
            { text: '桌面应用开发', link: '/blog/desktop/' },
            { text: '工程化与运维', link: '/blog/engineering/' },
          ]
        }
      ],

      // 默认侧边栏（保持原有内容作为备用）
      '/': [
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
        text: '前端工程化完全指南',
        collapsed: true,
        items: [
          {
            text: '教程概览',
            link: '/packages/frontend-engineering/README.md'
          },
          {
            text: '第1章：前端工程化概述与环境搭建',
            link: '/packages/frontend-engineering/chapter-01/README.md'
          },
          {
            text: '第2章：包管理与依赖管理',
            link: '/packages/frontend-engineering/chapter-02/README.md'
          },
          {
            text: '第3章：模块化与构建工具',
            link: '/packages/frontend-engineering/chapter-03/README.md'
          },
          {
            text: '第4章：代码质量保障',
            link: '/packages/frontend-engineering/chapter-04/README.md'
          },
          {
            text: '第5章：自动化测试体系',
            link: '/packages/frontend-engineering/chapter-05/README.md'
          },
          {
            text: '第6章：性能优化与监控',
            link: '/packages/frontend-engineering/chapter-06/README.md'
          },
          {
            text: '第7章：开发体验优化',
            link: '/packages/frontend-engineering/chapter-07/README.md'
          },
          {
            text: '第8章：多环境管理与配置',
            link: '/packages/frontend-engineering/chapter-08/README.md'
          },
          {
            text: '第9章：CI/CD与自动化部署',
            link: '/packages/frontend-engineering/chapter-09/README.md'
          },
          {
            text: '第10章：微前端与大型项目架构',
            link: '/packages/frontend-engineering/chapter-10/README.md'
          },
        ]
      },
      {
        text: '前端工程化杂谈',
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
        text: 'JavaScript 插件系统完整教程',
        collapsed: false,
        items: [
          {
            text: '教程概览',
            link: '/plugin-system-tutorial/README.md'
          },
          {
            text: '第1章：基础概念与设计原则',
            link: '/plugin-system-tutorial/chapter-01/index.md'
          },
          {
            text: '第2章：基础插件系统实现',
            link: '/plugin-system-tutorial/chapter-02/index.md'
          },
          {
            text: '第3章：钩子系统设计',
            link: '/plugin-system-tutorial/chapter-03/index.md'
          },
          {
            text: '第4章：插件生命周期管理',
            link: '/plugin-system-tutorial/chapter-04/index.md'
          },
          {
            text: '第5章：插件间通信机制',
            link: '/plugin-system-tutorial/chapter-05/index.md'
          },
          {
            text: '第6章：高级特性实现',
            link: '/plugin-system-tutorial/chapter-06/index.md'
          },
          {
            text: '第7章：实战案例 - 构建工具插件',
            link: '/plugin-system-tutorial/chapter-07/index.md'
          },
          {
            text: '第8章：性能优化与最佳实践',
            link: '/plugin-system-tutorial/chapter-08/index.md'
          },
          {
            text: '第9章：调试与测试',
            link: '/plugin-system-tutorial/chapter-09/index.md'
          },
          {
            text: '第10章：总结与展望',
            link: '/plugin-system-tutorial/chapter-10/index.md'
          },
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
          { text: 'node开发MCP server', link: '/packages/ai/nodejs-mcp-server-guide.md' },
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
      },
      {
        text: 'Node.js 深度教程',
        collapsed: true,
        items: [
          {
            text: '教程概览',
            link: '/nodejs-tutorial/README.md'
          },
          {
            text: '第1章：Node.js基础与环境搭建',
            link: '/nodejs-tutorial/chapter-01/README.md'
          },
          {
            text: '第2章：模块系统深入理解',
            link: '/nodejs-tutorial/chapter-02/README.md'
          },
          {
            text: '第3章：异步编程与事件循环',
            link: '/nodejs-tutorial/chapter-03/README.md'
          },
          {
            text: '第4章：文件系统与流操作',
            link: '/nodejs-tutorial/chapter-04/README.md'
          },
          {
            text: '第5章：HTTP服务器与网络编程',
            link: '/nodejs-tutorial/chapter-05/README.md'
          },
          {
            text: '第6章：Express框架深度应用',
            link: '/nodejs-tutorial/chapter-06/README.md'
          },
          {
            text: '第7章：数据库集成与ORM',
            link: '/nodejs-tutorial/chapter-07/README.md'
          },
          {
            text: '第8章：认证授权与安全',
            link: '/nodejs-tutorial/chapter-08/README.md'
          },
          {
            text: '第9章：测试与部署',
            link: '/nodejs-tutorial/chapter-09/README.md'
          },
        ]
      }
    ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zhangyu-521' }
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
