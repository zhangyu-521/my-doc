# 微信小程序自动化发布：从本地上传到可控发布流水线

微信小程序的发布，表面上只是打开微信开发者工具、点击上传，实际上包含了代码检查、依赖构建、版本管理、上传、体验验证、提交审核和正式发布等多个步骤。

当项目开始多人协作，手工发布会逐渐暴露出几个问题：

- 发布步骤依赖某一台电脑和某一个人；
- 测试包、正式包容易混淆；
- 上传版本号和备注不统一；
- 发布前缺少固定的检查项；
- 出现问题后，很难追溯当时上传的代码和配置。

本文探索一套适合原生微信小程序的自动化发布方案：先在本机跑通，再平滑接入 GitLab CI、Jenkins 或其他持续集成平台。

## 先明确：自动化发布到底自动什么

自动化发布不是简单地把“点击上传”改成一条命令，而是把发布过程拆成若干个可以验证、可以追踪的阶段：

```text
代码变更
  ↓
前置校验
  ↓
构建 npm / 编译检查
  ↓
上传微信后台
  ↓
生成体验二维码
  ↓
提交审核
  ↓
审核通过后正式发布
```

这里需要区分几个概念：

- `upload`：把当前代码上传到微信后台，类似开发者工具中的“上传”；
- `preview`：生成预览二维码，用于测试人员体验当前代码；
- 体验版：微信后台用于测试的版本状态，不能简单等同于本地上传成功；
- 提交审核：将已上传的版本交给微信审核；
- 正式发布：审核通过后把版本发布给用户。

推荐的安全边界是：上传和生成体验二维码可以自动完成，提交审核可以通过命令显式触发，正式发布必须保留人工确认。

## 核心工具：miniprogram-ci

微信官方提供了 `miniprogram-ci`，它是从微信开发者工具中抽离出来的编译模块，可以通过 Node.js 脚本或命令行完成小程序的构建、预览和上传。

官方仓库：[miniprogram-ci](https://github.com/wechat-miniprogram/miniprogram-ci-dist)

它的主要能力包括：

- 上传小程序代码；
- 生成预览二维码；
- 构建小程序 npm；
- 获取编译后的代码包；
- 检查代码质量；
- 获取最近上传版本的 SourceMap；
- 上传云函数；
- 通过 Node.js API 或命令行调用。

它的定位是“开发者工具的自动化能力”，不是完整的发布审批系统。因此审核和正式发布通常需要在它之外增加微信开放接口调用和权限控制。

## 它会不会占小程序主包

不会，前提是安装和引用方式正确。

`miniprogram-ci` 运行在本机或 CI 服务器的 Node.js 环境中，不运行在微信小程序内部。它应该作为普通的 Node.js 开发依赖放在项目的 `node_modules` 中，而不是放进 `miniprogram_npm`。

两者要区分开：

```text
node_modules/
└─ miniprogram-ci       本机发布工具，不进入小程序运行包

miniprogram_npm/
└─ 业务运行时依赖        可能进入小程序代码包
```

发布工具不应被小程序业务代码 `require` 或 `import`，上传时也应该忽略 `node_modules`、脚本目录和构建产物目录。

安装方式：

```bash
npm install --save-dev miniprogram-ci
```

## 微信侧需要准备什么

要让本机自动上传，至少需要以下条件。

### AppID

AppID 用于确认目标小程序。测试号和正式号必须明确区分，不能只依赖项目描述或开发人员记忆。

建议为不同环境提供不同配置：

```text
test   → 测试小程序 AppID
prod   → 正式小程序 AppID
```

### 代码上传私钥

在微信公众平台中，使用小程序管理员进入开发设置，下载代码上传密钥。私钥通常是一个 `.key` 文件。

私钥具备代码预览和上传权限，不能提交到 Git，也不要通过聊天工具随意传递。建议保存到项目目录之外，例如：

```text
E:\secrets\wechat\private.wxXXXXXXXX.key
```

### IP 白名单

微信后台可以限制只有指定出口 IP 才能使用代码上传能力。如果本机或 CI 服务器配置了 IP 白名单，必须确保实际出口 IP 在白名单中。

本机调试时可以暂时放宽限制，但正式使用建议保留白名单，并固定 CI 服务器的出口地址。

### 审核和发布权限

上传权限、提交审核权限和正式发布权限不是一个概念。自动化工具能否调用某个接口，取决于小程序主体类型、管理员权限、开放接口权限和微信侧当前规则。

因此发布系统必须把“上传成功”和“正式上线”视为两个不同的结果。

## 推荐的项目结构

在已有小程序项目中，可以增加一个独立的发布脚本目录：

```text
project-root/
├─ app.json
├─ project.config.json
├─ pages/
├─ miniprogram_npm/
├─ scripts/
│  └─ wechat-release.js
├─ artifacts/
│  └─ .gitkeep
├─ package.json
└─ .gitignore
```

其中：

- `scripts/wechat-release.js`：发布入口；
- `artifacts/`：二维码、日志和临时报告；
- 私钥文件：放在项目外，不进入仓库；
- `miniprogram_npm/`：只放小程序运行时需要的 npm 依赖。

## 第一步：前置校验

自动上传前，应该先失败得足够早。一个实用的校验脚本至少检查：

- `app.json` 是否存在且可解析；
- `project.config.json` 是否存在且可解析；
- AppID 是否存在；
- AppID 是否和目标环境匹配；
- 私钥文件是否存在且可读；
- 页面路径和分包路径是否存在；
- `node_modules` 是否完整；
- npm 构建是否成功；
- 版本号是否符合约定；
- 是否包含明显的测试配置；
- 当前 Git 分支是否允许发布；
- 是否存在未提交变更；
- 代码包是否超过微信限制。

示例：

```js
const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const requiredFiles = ['app.json', 'project.config.json']

for (const file of requiredFiles) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) {
    throw new Error(`缺少必要文件：${file}`)
  }
}

const appConfig = JSON.parse(
  fs.readFileSync(path.join(root, 'app.json'), 'utf8')
)

const projectConfig = JSON.parse(
  fs.readFileSync(path.join(root, 'project.config.json'), 'utf8')
)

if (!projectConfig.appid) {
  throw new Error('project.config.json 中没有 appid')
}

if (!Array.isArray(appConfig.pages) || appConfig.pages.length === 0) {
  throw new Error('app.json 中没有配置页面')
}

console.log(`校验通过：${projectConfig.appid}`)
```

真实项目还应该递归校验 `subpackages`、`independent subpackages`、插件和云函数配置。

## 第二步：使用 miniprogram-ci 上传

基本上传脚本如下：

```js
const path = require('node:path')
const ci = require('miniprogram-ci')

const projectRoot = process.cwd()
const appid = process.env.WECHAT_APPID
const privateKeyPath = process.env.WECHAT_PRIVATE_KEY
const version = process.env.WECHAT_VERSION || '0.0.1'
const desc = process.env.WECHAT_DESC || '本地自动化上传'

if (!appid) {
  throw new Error('缺少 WECHAT_APPID')
}

if (!privateKeyPath) {
  throw new Error('缺少 WECHAT_PRIVATE_KEY')
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: projectRoot,
  privateKeyPath,
  ignores: [
    'node_modules/**/*',
    '.git/**/*',
    'scripts/**/*',
    'artifacts/**/*'
  ]
})

async function main() {
  const result = await ci.upload({
    project,
    version,
    desc,
    setting: {
      useProjectConfig: true
    },
    onProgressUpdate: console.log
  })

  console.log('上传成功')
  console.dir(result, { depth: null })
}

main().catch(error => {
  console.error('上传失败')
  console.error(error)
  process.exitCode = 1
})
```

运行前设置环境变量：

```powershell
$env:WECHAT_APPID = "wxXXXXXXXX"
$env:WECHAT_PRIVATE_KEY = "E:\secrets\wechat\private.wxXXXXXXXX.key"
$env:WECHAT_VERSION = "1.0.1"
$env:WECHAT_DESC = "修复登录和首页展示问题"
node scripts/wechat-release.js
```

上传成功后，微信后台会保存一个代码版本。这个版本可以继续被设置为体验版本，或者进入审核流程。

## 第三步：生成体验二维码

上传之外，还可以自动生成预览二维码：

```js
const result = await ci.preview({
  project,
  desc: '自动化预览',
  setting: {
    useProjectConfig: true
  },
  qrcodeFormat: 'image',
  qrcodeOutputDest: path.join(projectRoot, 'artifacts', 'preview.jpg'),
  onProgressUpdate: console.log
})

console.log(result)
```

这一步适合接入测试流程：脚本完成后将二维码保存到 `artifacts/preview.jpg`，再通过企业微信、钉钉或邮件发送给测试人员。

需要注意，预览二维码和“体验版”不是完全相同的产品概念。预览更适合一次性验证某个代码包；体验版更适合团队长期测试。具体采用哪一种，应结合项目的测试流程和微信后台权限来决定。

## 审核和正式发布怎么接

完整的审核和正式发布一般需要在 `miniprogram-ci` 之外增加一个微信开放接口客户端。

逻辑上可以拆成：

```text
上传版本
  ↓
记录版本号和版本描述
  ↓
提交审核资料
  ↓
轮询审核状态
  ↓
审核通过
  ↓
人工确认
  ↓
正式发布
```

审核资料不应该硬编码在脚本中，建议使用配置文件：

```json
{
  "version": "1.0.1",
  "desc": "修复登录和首页展示问题",
  "audit": {
    "itemList": [],
    "contact": "发布联系人",
    "contactPhone": "发布联系电话",
    "remark": "本版本主要修复登录流程和首页展示问题"
  }
}
```

正式发布命令必须设计成显式确认，例如：

```bash
npm run mp:release -- --version 1.0.1 --confirm-release
```

没有 `--confirm-release` 时，脚本只允许查询状态，不执行正式发布。

## 命令设计建议

建议将操作拆成粒度清晰的命令，而不是只提供一个不可控的“一键发布”：

```json
{
  "scripts": {
    "mp:check": "node scripts/wechat-release.js check",
    "mp:build": "node scripts/wechat-release.js build",
    "mp:upload": "node scripts/wechat-release.js upload",
    "mp:preview": "node scripts/wechat-release.js preview",
    "mp:audit": "node scripts/wechat-release.js audit",
    "mp:status": "node scripts/wechat-release.js status",
    "mp:release": "node scripts/wechat-release.js release"
  }
}
```

推荐的权限边界：

| 命令 | 默认是否允许自动执行 | 说明 |
| --- | --- | --- |
| `check` | 是 | 不产生微信侧版本 |
| `build` | 是 | 本地构建和检查 |
| `upload` | 是 | 上传开发版本 |
| `preview` | 是 | 生成预览二维码 |
| `audit` | 否或显式参数 | 提交审核资料 |
| `status` | 是 | 查询审核状态 |
| `release` | 否 | 必须人工确认正式发布 |

## 如何避免误发正式版本

小程序自动化发布最大的风险，不是上传失败，而是把错误环境发布到了正式小程序。

建议同时使用三层保护：

### 配置层

测试和生产使用不同配置文件：

```text
config/wechat.test.json
config/wechat.prod.json
```

### 命令层

没有明确传入 `--env prod` 时，只允许操作测试环境。

### 确认层

生产发布前打印关键摘要：

```text
目标环境：生产
AppID：wxXXXXXXXX
版本号：1.0.1
版本说明：修复登录问题
Git Commit：abc1234

请输入 RELEASE 确认：
```

输入不匹配时直接退出。

## 发布日志应该记录什么

每次发布都应该生成一份机器可读的记录：

```json
{
  "appid": "wxXXXXXXXX",
  "environment": "test",
  "version": "1.0.1",
  "description": "修复登录问题",
  "gitCommit": "abc1234",
  "branch": "dev",
  "operator": "developer",
  "startedAt": "2026-10-02T10:00:00+08:00",
  "status": "uploaded"
}
```

这样出现线上问题时，可以回答几个关键问题：

- 哪个提交被上传了？
- 上传给了哪个 AppID？
- 谁执行的？
- 使用了哪个版本号？
- 是否提交过审核？
- 是否正式发布过？

## 第一期落地范围

对于已有项目，最适合的第一期不是直接做全自动正式发布，而是完成下面这条链路：

```text
前置校验
  ↓
构建 npm
  ↓
上传测试小程序
  ↓
生成体验二维码
  ↓
保存版本日志
```

这一期完成后，再增加：

```text
提交审核
  ↓
查询审核状态
  ↓
人工确认正式发布
```

最后才考虑接入 GitLab CI、Jenkins 或其他持续集成平台。

## 结语

微信小程序自动化发布的核心，不是把几个命令拼起来，而是建立一套可控的发布边界：

- 先校验，再上传；
- 先体验，再审核；
- 先审核通过，再发布；
- 生产发布必须可追踪、可确认、可回溯。

`miniprogram-ci` 解决的是“开发者工具自动化”问题；项目脚本解决的是“发布流程标准化”问题；权限、审核和确认机制解决的是“生产安全”问题。

三者组合起来，才是一套真正适合团队长期使用的微信小程序自动化发布方案。
