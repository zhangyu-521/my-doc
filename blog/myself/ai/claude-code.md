# Claude Code 入门指南

`Claude Code` 是 Anthropic 推出的 AI 编程助手工具，直接在终端中通过自然语言与 Claude 对话，完成代码编写、调试、重构等开发任务。

::: tip
Claude Code 不同于传统的代码补全工具，它更像是一个`会思考的编程搭档`，可以理解整个项目上下文，执行复杂的开发任务。
:::

## 安装与配置

### 系统要求

- Node.js 18+
- Git
- macOS / Linux / Windows (WSL)

### 安装步骤

```bash
# 通过 npm 全局安装
npm install -g @anthropic-ai/claude-code

# 或使用 npx 临时运行
npx @anthropic-ai/claude-code
```

### 初始配置

首次运行时会提示登录 Anthropic 账号：

```bash
claude
# 按提示完成浏览器授权

```

::: tip
需要先在 [Anthropic Console](https://console.anthropic.com/) 注册账号并获取 API 权限。
:::

**也可以配置别的厂商模型**
- 找到 用户目录 .claude 文件夹
- 添加 settings.json 文件  
- 写入以下配置 重启 Claude Code
- 以kimi2.5为例
```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.moonshot.cn/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "your key",
    "ANTHROPIC_MODEL": "kimi-k2.5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "kimi-k2.5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "kimi-k2.5",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "kimi-k2.5"
  }
}
``` 

## 常用快捷键

- `shift + tab`: 切换模式， 有3种模式
    1. 默认模式：每次修改文件，创建文件都会提问。
    2. 自动模式：全自动，较危险，执行终端命令会访问。
    3. 规划模式：讨论、讨论、规划，创建文件也会提问。

    ::: tip
    还有一种模式，在打开claude code 时，带上参数 `--dangerously-skip-permissions`,claude code 会彻底放飞自我
    :::

- `!`: 输入感叹号，可以输入bash命令
- `shift + enter`: 换行
- `crtl + b`: 将运行中的任务放在后台，不会阻塞聊天
- `esc + esc`: 两下esc查看回滚点和`/rewind`一样
- `ctrl + o`: 显示当前未展示的内容


## 常用命令
- `/plan`: 切换为规划模式
- `/resume`: 恢复会话,然后选择要恢复的会话
- `/tasks`: 查看后台运行的任务
- `/rewind`: 查看回滚点 （选择一个回滚点后，会有4个选项）
   1. 恢复代码和会话
   2. 恢复会话
   3. 恢复代码
   4. 放弃回滚

``` bash
# 打开claude code 自动恢复上一次会话
claude -c 
```
:::

   ::: warning
   claude code只能回滚自己写入的文件，使用终端命令创建的文件不会删除，比如 `node_modules` 等
   **建议使用git， 不建议使用claude code 回滚**
   :::

- `/mcp`: 查看安装的mcp
- `/compact`: 压缩上下文
- `/clear`: 清空上下文
- `/memory`: 查看CLAUDE.md文件,分为 项目级别 和 用户级别
- `/init`: 生成 CLAUDE.md 文件
- `/hooks`: 添加钩子
- `/btw`: 在claude干活时，插入一个问题，但问题不会加入对话历史，不会阻塞任务，不会污染上下文

- `/insights`: 生成HTML报告，分析过去一个月使用claude的习惯，就是ai反向观察你
- `/simplify`: 用三个agent分别从代码复用、代码质量、运行效率三个角度审查代码
- `/branch`: 当前对话分叉出一个新会话，新会话会保留前的上下文，原来的会话不受影响
- `/loop`: 定时任务
- `/remote-control`: 生成一个url，可远程控制claude code，两边对话一致
- `/Export`: 当前整段对话被导出一个markdown文件


## MCP

::: tip
claude mcp add --transport http figma https://mcp.figma.com/mcp
:::




## Agent Skills


> 官方文档：[Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code/overview)
