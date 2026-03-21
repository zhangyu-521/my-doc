# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供该仓库的代码操作指南。

## 项目概述

这是一个基于 VitePress 的技术文档站点（中文），包含 JavaScript、前端工程化、后端开发（NestJS/Node.js）、移动端（React Native）和桌面端（Electron）开发的教程和博客文章。

## 构建命令

```bash
# 安装依赖（使用 pnpm）
pnpm install

# 启动开发服务器
pnpm docs:dev

# 生产环境构建（因站点较大，需要 4GB 内存）
pnpm docs:build

# 预览生产构建
pnpm docs:preview

# 监控构建并记录资源使用情况
node monitor-build.js
```

## 项目结构

```
├── .vitepress/
│   ├── config.mts          # 站点配置、导航栏、侧边栏
│   ├── theme/
│   │   ├── index.js        # 主题入口（继承默认主题）
│   │   └── style.css       # 项目卡片的自定义样式
│   └── dist/               # 构建输出（GitHub Pages）
├── blog/
│   ├── javascript/         # JS 教程（进阶、插件系统）
│   ├── frontend/           # 前端工程化教程
│   ├── backend/            # NestJS 和 Node.js 教程
│   ├── mobile/             # React Native 教程
│   ├── desktop/            # Electron 教程
│   └── myself/             # 个人项目展示、速记笔记
├── public/                 # 静态资源（图片、网站图标）
└── index.md                # 首页功能卡片
```

## 关键配置

- **基础 URL**: `/my-doc/`（在 `.vitepress/config.mts` 中配置）
- **包管理器**: pnpm（存在 lockfile）
- **Node 版本**: 22（来自 GitHub Actions 工作流）
- **构建输出**: `.vitepress/dist/`

## 部署

推送到 `master` 分支时，GitHub Actions 会自动部署到 GitHub Pages：
- 工作流: `.github/workflows/deploy.yml`
- 使用 `actions/deploy-pages@v4`

## 内容组织

教程采用基于章节的结构，侧边栏在 `config.mts` 中定义：
- 每个教程类别都有一个与其 URL 路径匹配的 `sidebar` 条目
- 索引文件 (`index.md`) 作为章节概览
- 内容支持标准 VitePress 的 Markdown，并启用了行号显示

## 自定义组件

"我的开源项目"页面 (`blog/myself/index.md`) 使用自定义 HTML/CSS 卡片，通过 `.vitepress/theme/style.css` 设置样式，并采用响应式网格布局。

## 编写规范
请参考 WRITING-GUIDE.md 文件
