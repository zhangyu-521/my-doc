# Python 虚拟环境

## 一个真实场景

- 小满项目要用 pandas 2.0 的新接口，装上新版跑得飞快
- 大满项目是老代码，只兼容 pandas 1.5，一升级就报错

如果所有包都直接装到全局环境，两个项目就只能互相打架：我升级你报错，你降级我报错。

虚拟环境就是给每个项目一个"独立小房间"，各自拥有一套 Python 和依赖包，互不干扰、随建随删。

::: tip
每个项目建一个虚拟环境，依赖就不打架。
:::

## 为什么要用虚拟环境

- 不同项目需要的包版本可能完全相反，全局环境装不下
- 公司服务器、别人的电脑上不方便乱动全局 Python
- 项目随时可能删掉重建，环境跟着项目走最省心

## 虚拟环境是什么

虚拟环境本质上就是一个独立的目录，里面包含：

- 自己的 Python 解释器
- 自己的 pip
- 自己的一份已安装包

激活环境后，所有 `pip install` 都只装进这个目录，不影响全局环境和其他项目。

## 主流工具对比

| 工具 | 特点 | 适用场景 |
| --- | --- | --- |
| `venv` | Python 3.3+ 自带，零安装 | 日常最常用，推荐 |
| `virtualenv` | 老牌工具，兼容旧 Python | 维护老项目 |
| `conda` | 连 Python 版本和 C 库一起管 | 科学计算、数据挖掘 |
| `poetry` / `uv` | 依赖管理 + 打包一体化 | 工程化项目 |

本文以最常用的 `venv` 为主线，末尾补充其他工具的用法。

## 实战：创建"小满"环境

### 1. 创建

```bash
# 在当前目录下创建一个名为 小满 的虚拟环境
python -m venv 小满
```

创建成功后，当前目录会出现一个 `小满` 文件夹，里面就是一套独立环境。

### 2. 激活

Windows（PowerShell / CMD）：

```powershell
小满\Scripts\activate
```

macOS / Linux：

```bash
source 小满/bin/activate
```

激活成功后，命令行前面会出现 `(小满)` 前缀，说明现在已经在环境里了。

### 3. 确认

```bash
# Windows 用 where python，macOS / Linux 用 which python
which python
```

路径指向 `小满` 目录，就说明激活成功。

### 4. 安装依赖

```bash
pip install pandas requests
```

此时装的包都只进"小满"这一个环境。

### 5. 查看已装包

```bash
pip list
```

### 6. 退出环境

```bash
deactivate
```

### 7. 删除环境

```bash
# Windows: rmdir /s 小满
# macOS / Linux: rm -rf 小满
```

直接删目录即可，不残留任何系统文件。

::: tip
演示用中文名方便区分，实际项目建议用英文名（如 `xiaoman_venv`），避免跨平台和命令行兼容问题。
:::

## 实战：小满和大满各用各的版本

### 1. 创建两个环境

```bash
python -m venv 小满
python -m venv 大满
```

### 2. 小满装 pandas 2.0

```bash
source 小满/bin/activate
pip install pandas==2.0.3
python -c "import pandas; print(pandas.__version__)"
# 输出: 2.0.3
deactivate
```

### 3. 大满装 pandas 1.5

```bash
source 大满/bin/activate
pip install pandas==1.5.3
python -c "import pandas; print(pandas.__version__)"
# 输出: 1.5.3
deactivate
```

两个环境各装各的版本，互不影响。这就是虚拟环境的核心价值。

## 实战：用 requirements.txt 移植环境

### 1. 导出"小满"的依赖

```bash
source 小满/bin/activate
pip freeze > requirements.txt
```

### 2. 在新环境一键还原

```bash
# 创建并激活一个全新的 芒种 环境
python -m venv 芒种
source 芒种/bin/activate
pip install -r requirements.txt
```

`requirements.txt` 记录每个包的名字和精确版本，别人拿到文件就能完整复现你的环境。

::: tip
`pip freeze` 会包含不少间接依赖；想更精简，可以用 `pipreqs` 按代码中实际 import 的包来生成。
:::

## 补充：virtualenv 和 conda 怎么用

### virtualenv

```bash
pip install virtualenv
virtualenv 立秋
source 立秋/bin/activate
```

### conda

```bash
# -n 指定环境名，后面跟 Python 版本
conda create -n 冬至 python=3.11
conda activate 冬至
```

`conda` 可以直接指定 Python 大版本，适合需要多版本 Python 的场景。

## 常见问题避坑

| 问题 | 原因 | 解决 |
| --- | --- | --- |
| Windows 激活报"禁止运行脚本" | PowerShell 执行策略限制 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| 激活后 `which python` 仍是全局路径 | 没激活成功或换了终端 | 重新激活，确认出现 `(小满)` 前缀 |
| 把项目拷到别的机器环境用不了 | 环境目录绑定了原路径 | 别拷环境，用 `requirements.txt` 重建 |
| 环境目录被提交进 git | 体积大且换机器没用 | 在 `.gitignore` 里加上 `小满/`、`大满/` |

## 小结

- 每个项目建一个虚拟环境，依赖就不打架
- 五步记住：创建 → 激活 → 安装 → 使用 → 退出
- 用 `requirements.txt` 让环境可复现、可移植
- 环境目录不进 git，坏了直接删除重建

实践建议：从今天起，每个 Python 项目都建一个独立环境——小满的活让"小满"干，大满的活让"大满"干。
