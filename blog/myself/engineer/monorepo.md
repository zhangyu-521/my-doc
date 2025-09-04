# Monorepo是什么
`Monorepo`是一种将多个项目或模块放在同一个代码仓库中的组织方式。它允许开发者在同一个代码库中管理和协作多个项目，从而提高代码的重用性和一致性。

::: tip
本篇文章用 `pnpm Workspaces` 实现 Monorepo 单仓库
:::

## 创建项目目录结构
```bash
mkdir monorepo
cd monorepo
pnpm init -y
```
在根目录下创建` pnpm-workspace.yaml `文件，用于定义工作空间的包路径
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```
意思就是 `packages` 目录下的所有文件和 `apps` 目录下的所有文件都是工作空间或者叫是子包

## 创建子包
```bash
mkdir packages apps
cd packages
mkdir shared-utils
cd shared-utils
pnpm init -y
```
编辑 `shared-utils/package.json` 设置包的名称和版本
```json
{
  "name": "@monorepo/shared-utils",
  "version": "1.0.0"
}
```
在 `shared-utils` 目录下创建一个 `index.js` 文件，用于导出一些工具函数
```js
export function add(a, b) {
  return a + b;
}
```
接下来，创建一个前端应用
```bash
cd ../../apps
pnpm create vite my-app --template vue
cd my-app

pnpm install
pnpm dev
```
## 配置根目录的 `package.json`
```json
{
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "pnpm -r run dev",
    "build": "pnpm -r run build",
    "preview": "pnpm -r run preview"
  }
}
```
**`pnpm -r `表示递归运行脚本，适用于所有子项目。**


## 在子项目中使用共享模块
在 `apps/my-app `中使用 `packages/shared-utils：`

```bash
cd ../../apps/my-app
pnpm add @monorepo/shared-utils@workspace:*
```
***`@workspace:* `表示从当前工作空间中安装依赖***

在 `apps/my-app/src/App.vue` 中使用 `shared-utils` 模块
```js
// apps/my-app/src/main.js
import { add } from '@monorepo/shared-utils';

console.log(add(1, 2)); // 输出 3
```


## 安装全局依赖
如果某些依赖是所有子项目共用的，可以安装到根目录：
```bash
pnpm add typescript -w
```
***`-w` 表示安装到根目录***


## 常用命令汇总
```bash
pnpm add typescript -w

pnpm add [package-name] --filter [workspace-name]

pnpm add @my-monorepo/utils@workspace:* --filter my-app

pnpm run [script-name] -r

pnpm run [script-name] --filter [workspace-name]

pnpm -C [workspace-path] run [script-name]

```

 - ***`-w` 表示到根目录***

 - ***`-C` 表示为在根目录运行特定工作区的脚本 ***

 - ***`--filter` 表示为特定子项目 ***

 - ***`pnpm add @my-monorepo/utils@workspace:* --filter my-app` 安装工作区依赖，这会在 my-app 的 package.json 中添加 my-monorepo/utils 内部依赖***

 - ***`pnpm run [script-name] -r` 递归运行脚本，适用于所有子项目***

 - ***`pnpm run [script-name] --filter [workspace-name]` 在特定子项目中运行脚本***

 - ***`pnpm list --depth=Infinity`  查看所有工作区的依赖树 ***

