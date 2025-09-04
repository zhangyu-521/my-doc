# npm你了解吗

## npm是什么
npm（Node Package Manager） 是一个用于管理 Node.js 包的工具，同时也是全球最大的软件注册表之一。它提供了丰富的功能，帮助开发者安装、发布和管理 JavaScript 项目中的依赖包。

## npm命令
以下是一些常用的 npm 命令及其作用：

| 命令 | 作用 |
| :--- | :--- |
| npm link | 将当前项目链接到全局环境中 |
| npm link [package-name] | 将指定的 npm 包链接到当前项目中 |
| npm unlink | 取消链接当前项目或指定的 npm 包 |
| npm install [package-name] | 安装指定的 npm 包 |
| npm uninstall [package-name] | 卸载指定的 npm 包 |
| npm update [package-name] | 更新指定的 npm 包 |
| npm publish | 发布当前项目到 npm 注册表 |
| npm init | 初始化一个package.json文件 |
| npm version patch | 小版本更新 |
| npm version minor | 中版本更新 |
| npm version major | 大版本更新 |
| npm run [script-name] | 执行 package.json 中定义的脚本命令 |
| npm config set registry [url] | 设置 npm 注册表的地址 |
| npm config list | 查看当前配置 |
| npm config get registry | 获取 npm 注册表的地址 |
| npm search [package-name] | 搜索指定的 npm 包 |
| npm list | 列出当前项目中的所有依赖包 |
| npm outdated | 列出当前项目中的所有过时的依赖包 |
| npm prune | 删除当前项目中的未使用的依赖包 |
| npm cache clean | 清除 npm 缓存 |
| npm help [command] | 查看指定命令的帮助文档 |


## package.json文件
package.json 是 npm 项目的核心配置文件，它定义了项目的元数据、依赖关系、脚本等信息。以下是一些常见的 package.json 字段及其含义：

### 项目的基本信息
- name: 项目的名称，必须是小写字母，不能以 _ 或 . 开头，不能包含 URL 非法字符
- version: 项目的版本号，遵循语义化版本规范（SemVer）
- description: 项目的简短描述，用于说明项目的用途
- keywords: 项目的关键词，用于搜索和分类
- homepage: 项目的主页地址，通常是项目的 GitHub 仓库地址
- bugs: 用于报告问题的链接
- repository: 项目的代码仓库信息
- license: 项目的许可证类型

### 作者和维护者信息
- author: 项目的作者信息
- contributors: 项目的贡献者信息

### 依赖关系
- dependencies: 项目运行时需要的依赖包
- devDependencies: 项目开发时需要的依赖包
- peerDependencies: 项目与其他包的兼容性要求
- optionalDependencies: 可选的依赖包，即使安装失败也不会导致安装失败

### 脚本
- scripts: 定义项目的脚本命令，例如启动、测试、构建等

### 其他配置
- engines: 指定项目支持的 Node.js 和 npm 版本范围
- engineStrict: 如果设置为 true，则强制执行 engines 字段中的版本限制
- browserslist: 指定项目支持的浏览器版本
- main: 指定项目的入口文件,默认是index.js
- bin: 定义可执行文件的路径，用于将项目中的脚本安装为全局命令
- files: 指定项目中的哪些文件应该被包含在发布的包中
- directories: 指定项目中的一些目录用途
- os: 指定项目支持的操作系统
- cpu: 指定项目支持的 CPU 架构
- private: 如果设置为 true，则防止项目被意外发布到 npm 注册表
- preferGlobal: 如果设置为 true，则建议用户全局安装项目
- publishConfig: 指定发布到 npm 注册表时的配置
- resolutions: 指定依赖包的版本冲突解决方案
- workspaces: 指定工作区的配置，用于管理多个包
- exports: 指定模块的入口点,在引入时可以根据模块规范来引入对应文件
  ``` js
  {
    "exports": {
      ".": {
        "require": "./index.js",
        "import": "./index.mjs"
      }
    }
  }
  ```
  
## package.json文件的script字段
在 package.json 的 scripts 中，除了可以自定义脚本命令外，npm 提供了一系列`生命周期钩子`，这些钩子会在特定的脚本执行前后`自动触发`。以下是常见的生命周期钩子及其用途：
- `pre[event]`和`post[event]`: 为每个自定义脚本提供前置和后置钩子, 在执行 event 脚本前后自动执行

``` tip
这里的event可以是install、publish、start、test等
```

## 开发npm包怎样在本地测试
有了以上的知识储备，我们接下来看看怎样本地调试一个自己开发的npm包

`主要用npm pack和 npm link命令`
- `npm pack` 用于将项目打包为一个 tarball 文件，适合在发布前测试包的内容，或者分发私有包。
- `npm link` 用于创建全局链接，适合在本地开发过程中快速测试包的更改。

1. 在命令行中运行 `npm link` 命令，将你的 npm 包链接到全局环境中。
2. 在其他项目中，使用 `npm link <package-name>` 命令将你的 npm 包链接到项目中`对源包的任何更改都会立即反映在链接的项目中，无需重新安装。`。
3. 在其他项目中，使用 `require` 或 `import` 语句引入你的 npm 包，并进行测试。
4. 在测试完成后，使用 `npm unlink` 命令取消链接。


## 发布npm包
1. 在命令行中运行 `npm login` 命令，登录到 npm 注册表。
2. 在命令行中运行 `npm publish` 命令，将当前项目发布到 npm 注册表。
3. 在命令行中运行 `npm unpublish <package-name>@<version>` 命令，取消发布指定的 npm 包版本。
4. 在命令行中运行 `npm deprecate <package-name>@<version> <message>` 命令，将指定的 npm 包版本标记为已弃用，并提供弃用信息。

