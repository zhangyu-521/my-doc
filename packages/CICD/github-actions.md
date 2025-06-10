## 创建示例工作流

::: tip
这篇文章是部署到github pages的静态站点文章.
:::

GitHub Actions 使用 YAML 语法来定义工作流程。 每个工作流都作为单独的 YAML 文件存储在代码存储库中名为 .github/workflows 的目录中

您可以在仓库中创建示例工作流程，只要推送代码，该工作流程就会自动触发一系列命令。 在此工作流中，GitHub Actions 签出推送的代码，安装 bats 测试框架，并运行基本命令来输出 bats 版本：bats -v。

- 在存储库中，创建 .github/workflows/ 目录来存储工作流文件。
- 在 .github/workflows/ 目录中，创建一个名为 learn-github-actions.yml 的新文件并添加以下代码。
  
```yaml
    # 可选 - 工作流在 GitHub 仓库的 "Actions" 选项卡中显示的名称。如果省略此字段，将使用工作流文件的名称。
    name: learn-github-actions
    # 可选 - 工作流生成的运行任务的名称，该名称将显示在仓库的 "Actions" 选项卡中的工作流运行列表中。此示例使用带有 github 上下文的表达式来显示触发工作流运行的执行者的用户名。更多信息
    run-name: ${{ github.actor }} is learning GitHub Actions
    # 指定此工作流的触发器。此示例使用 push 事件，因此每次有人向仓库推送更改或合并拉取请求时都会触发工作流运行。这是通过向每个分支推送来触发的；有关仅在特定分支、路径或标签上推送时运行的语法示例，
    on: [push]
    # 将 learn-github-actions 工作流中运行的所有任务组合在一起。
    jobs:
    # 定义一个名为 check-bats-version 的工作。子键将定义工作的属性。
    check-bats-version:
    # 配置工作在 Ubuntu Linux 运行的最新版本上执行。这意味着工作将在 GitHub 托管的全新虚拟机上运行
        runs-on: ubuntu-latest
        # 将 check-bats-version 工作中运行的步骤全部组合在一起。此部分下的每个项目都是一个单独的操作或 shell 脚本。
        steps:
        # uses 关键字指定此步骤将运行 v4 的 actions/checkout 操作。这是一个将您的仓库检出至运行器的操作，允许您对代码运行脚本或其他操作（例如构建和测试工具）。当您的流程将使用仓库的代码时，您应该使用 checkout 操作。
        - uses: actions/checkout@v4
        # 这个步骤使用 actions/setup-node@v4 动作来安装指定的 Node.js 版本。（此示例使用版本 20。）这会将 node 和 npm 命令放入你的 PATH 中。
        - uses: actions/setup-node@v4
            with:
            node-version: '20'
        # run 关键字告诉作业在运行器上执行命令。在这种情况下，你正在使用 npm 来安装 bats 软件测试包。
        - run: npm install -g bats
        # run 关键字告诉作业在运行器上执行命令。在这种情况下，你正在运行 bats -v 命令来输出 bats 版本。
        - run: bats -v

```
-  推送此文件到您的仓库。
-  每次有人推送更改到仓库时都会自动运行此工作流程。


## 下面是本片文档的自动构建工作流
``` yml
# 构建 VitePress 站点并将其部署到 GitHub Pages 的示例工作流程
#
name: Deploy VitePress site to Pages

on:
  # 在针对 `main` 分支的推送上运行。如果你
  # 使用 `master` 分支作为默认分支，请将其更改为 `master`
  push:
    branches: [master]

  # 允许你从 Actions 选项卡手动运行此工作流程
  workflow_dispatch:

# 设置 GITHUB_TOKEN 的权限，以允许部署到 GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# 只允许同时进行一次部署，跳过正在运行和最新队列之间的运行队列
# 但是，不要取消正在进行的运行，因为我们希望允许这些生产部署完成
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  # 构建工作
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # 如果未启用 lastUpdated，则不需要
      - uses: pnpm/action-setup@v3 # 如果使用 pnpm，请取消此区域注释
        with:
          version: 9
      # - uses: oven-sh/setup-bun@v1 # 如果使用 Bun，请取消注释
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm # 或 pnpm / yarn
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Install dependencies
        run: pnpm i # 或 pnpm install / yarn install / bun install
      - name: Build with VitePress
        run: npm run docs:build # 或 pnpm docs:build / yarn docs:build / bun run docs:build
      - name: Debug build output
        run: ls
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .vitepress/dist

  # 部署工作
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```






> 参考文档[GitHub Actions](https://docs.github.com/zh/actions/use-cases-and-examples/creating-an-example-workflow)、[vitepress](https://vitepress.dev/zh/guide/deploy#github-pages)
