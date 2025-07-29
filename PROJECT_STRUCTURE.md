# 项目目录结构说明

## 📁 整理后的目录结构

```
zyDocs/
├── .vitepress/              # VitePress 配置
│   └── config.mts          # 主配置文件
├── blog/                   # 博客内容主目录
│   ├── README.md           # 博客首页
│   ├── javascript/         # JavaScript 系列
│   │   ├── README.md       # 系列概览
│   │   ├── advanced/       # 高级 JavaScript
│   │   └── plugin-system/  # 插件系统教程
│   │       ├── README.md   # 教程概览
│   │       ├── chapter-01/ # 第1章：插件系统概念与原理
│   │       ├── chapter-02/ # 第2章：简单插件系统实现
│   │       ├── chapter-03/ # 第3章：钩子系统设计
│   │       ├── chapter-04/ # 第4章：插件生命周期管理
│   │       ├── chapter-05/ # 第5章：插件间通信机制
│   │       ├── chapter-06/ # 第6章：高级特性实现
│   │       ├── chapter-07/ # 第7章：实战案例 - 构建工具插件
│   │       ├── chapter-08/ # 第8章：性能优化与最佳实践
│   │       ├── chapter-09/ # 第9章：调试与测试
│   │       └── chapter-10/ # 第10章：总结与展望
│   ├── frontend/           # 前端开发
│   │   ├── README.md       # 前端概览
│   │   ├── engineering/    # 前端工程化
│   │   └── vue/           # Vue.js 学习
│   ├── backend/            # 后端开发
│   │   ├── README.md       # 后端概览
│   │   ├── nestjs/        # NestJS 实战
│   │   ├── nodejs/        # Node.js 进阶
│   │   └── prisma/        # Prisma ORM
│   ├── mobile/             # 移动端开发
│   │   ├── README.md       # 移动端概览
│   │   └── react-native/   # React Native 教程
│   ├── desktop/            # 桌面应用开发
│   │   ├── README.md       # 桌面应用概览
│   │   └── electron/       # Electron 实战
│   └── engineering/        # 工程化与运维
│       ├── README.md       # 工程化概览
│       ├── cicd/          # CI/CD 实践
│       └── ai/            # AI 工具应用
├── public/                 # 静态资源
├── index.md               # 网站首页
├── package.json           # 项目配置
└── README.md              # 项目说明
```

## 🔄 整理前后对比

### 整理前（混乱的结构）
```
├── packages/              # 各种文档包
│   ├── js-doc/
│   ├── frontend-engineering/
│   └── nest-doc/
├── plugin-system-tutorial/ # 插件系统教程
├── nestjs-tutorial/        # NestJS 教程
├── react-native-tutorial/  # RN 教程
├── electron-tutorial/      # Electron 教程
└── nodejs-tutorial/        # Node.js 教程
```

### 整理后（清晰的博客结构）
```
└── blog/                  # 统一的博客目录
    ├── javascript/        # 按技术分类
    ├── frontend/
    ├── backend/
    ├── mobile/
    ├── desktop/
    └── engineering/
```

## 🎯 整理的优势

### 1. 统一的组织结构
- 所有内容都在 `blog/` 目录下
- 按技术领域清晰分类
- 每个分类都有概览页面

### 2. 清晰的导航体系
- 顶部导航按技术分类
- 侧边栏根据路径自动匹配
- 面包屑导航清晰

### 3. 更好的用户体验
- 内容发现更容易
- 学习路径更清晰
- 相关内容关联更强

### 4. 便于维护和扩展
- 新增内容有明确的归属
- 目录结构一目了然
- 配置文件更简洁

## 🚀 VitePress 配置更新

### 导航栏配置
- 改为下拉菜单结构
- 按技术分类组织
- 支持快速跳转

### 侧边栏配置
- 路径匹配自动显示
- 每个分类独立侧边栏
- 支持章节导航

### 首页配置
- 更新为博客风格
- 突出主要技术方向
- 提供快速入口

## 📝 后续维护建议

1. **新增内容**：按技术分类放入对应目录
2. **更新导航**：在 `.vitepress/config.mts` 中更新
3. **保持一致**：遵循现有的目录命名规范
4. **定期整理**：定期检查和优化目录结构

---

**整理完成！** 🎉 现在项目结构更加清晰和专业。
