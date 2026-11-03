# Python 模块与包

## 1. 什么是模块

模块（Module）其实就是一个 `.py` 文件，里面放着函数、变量、类等代码，供其他 Python 文件导入使用。你可以把它理解成 Node.js 的 `require` / 前端的 `import`，本质都是"把别人写好的代码拿过来用"。

为什么要用模块？

- **代码复用**：写一次，到处导入，不用反复复制粘贴
- **避免冲突**：不同模块里的同名函数、变量互不影响
- **方便维护**：按功能拆分成多个文件，改一处不用翻整个项目
- **生态丰富**：Python 官方和社区提供了海量现成模块，直接拿来用

## 2. 模块的导入方式

最常用的有四种写法：

### 2.1 import 模块名

导入整个模块，使用时必须带 `模块名.xxx` 前缀。

```python
import math

print(math.sqrt(16))   # 4.0
print(math.pi)         # 3.141592653589793
```

### 2.2 from 模块名 import 成员

只导入模块里的某个函数或变量，用的时候不用带前缀。

```python
from math import sqrt, pi

print(sqrt(16))  # 4.0
print(pi)        # 3.141592653589793
```

### 2.3 import 模块名 as 别名

给模块起个别名，适合名字太长或者容易冲突的情况。

```python
import numpy as np
import pandas as pd

# 之后都用 np / pd 来调用
```

### 2.4 from 模块名 import *

一次性导入模块里的所有成员，很方便，但容易污染命名空间，不推荐在正式代码里用。

```python
from math import *   # 不推荐

print(sqrt(16))
```

| 导入方式 | 写法 | 调用时 | 适用场景 |
| --- | --- | --- | --- |
| 整体导入 | `import math` | `math.sqrt(16)` | 最常用，命名清晰 |
| 按需导入 | `from math import sqrt` | `sqrt(16)` | 只用少数几个成员 |
| 别名导入 | `import numpy as np` | `np.array(...)` | 名字长 / 约定俗成 |
| 通配导入 | `from math import *` | `sqrt(16)` | 不推荐，易冲突 |

## 3. 自定义模块

自己写一个模块非常简单，新建一个 `.py` 文件就行。

先创建 `my_math.py`：

```python
def add(a, b):
    return a + b

def mul(a, b):
    return a * b

PI = 3.14159
```

然后在另一个文件里导入使用：

```python
import my_math

print(my_math.add(3, 5))  # 8
print(my_math.mul(3, 5))  # 15
print(my_math.PI)         # 3.14159
```

::: warning
模块在第一次被导入时，顶层代码会执行一遍。所以不要把"运行时才该执行"的代码直接写在模块顶层，后面会讲到用 `if __name__ == "__main__"` 来保护。
:::

## 4. if \_\_name\_\_ == "\_\_main\_\_" 的作用

`__name__` 是 Python 的内置特殊变量：

- 直接运行该文件时，`__name__` 的值是 `"__main__"`
- 被 `import` 导入时，`__name__` 的值是模块名

```python
def main():
    print("程序开始运行")

if __name__ == "__main__":
    main()
```

这样写的好处：直接运行 `python main.py` 时会执行 `main()`；被其他文件 `import` 时不会执行，避免导入时产生副作用。

## 5. 什么是包

包（Package）就是一个带有 `__init__.py` 文件的文件夹，用来组织多个相关的模块。

```text
my_pkg/
├── __init__.py      # 包的初始化文件，可以为空
├── math_utils.py    # 模块1
└── str_utils.py     # 模块2
```

```python
from my_pkg import math_utils
from my_pkg.str_utils import upper_all

print(math_utils.add(1, 2))
print(upper_all("abc"))
```

从 Python 3.3 开始，没有 `__init__.py` 的文件夹也能被当作包（叫"命名空间包"），但建议还是加上，方便管理。

## 6. 模块的搜索路径 sys.path

当你 `import` 一个模块时，Python 会按顺序在下面这些路径里查找：

1. 当前脚本所在目录
2. 环境变量 `PYTHONPATH` 指定的目录
3. Python 标准库目录
4. 第三方包安装目录（site-packages）

```python
import sys

for p in sys.path:
    print(p)
```

如果模块和当前文件不在同一个目录，可以把模块所在目录临时加进去：`sys.path.append("/你的目录")`

## 7. 常用标准库模块

标准库是 Python 自带的模块，装完 Python 就有，不用额外安装。下面是最常用的几个：

| 模块 | 作用 | 常用例子 |
| --- | --- | --- |
| `os` | 操作系统交互：文件、目录、路径 | `os.listdir(".")` 列出目录 |
| `sys` | 解释器相关：参数、退出、路径 | `sys.argv` 获取命令行参数 |
| `math` | 数学计算 | `math.sqrt`、`math.pi` |
| `random` | 随机数 | `random.randint(1, 100)` |
| `datetime` | 日期和时间 | `datetime.now()` |
| `json` | JSON 数据解析 | `json.dumps`、`json.loads` |
| `re` | 正则表达式 | `re.findall(r"\d+", text)` |
| `collections` | 高级容器类型 | `Counter`、`defaultdict` |

## 8. 安装第三方模块

第三方模块需要用 `pip` 安装：

```bash
pip install requests
pip install numpy pandas matplotlib
# 指定版本
pip install requests==2.32.0
```

```python
import requests

resp = requests.get("https://api.github.com")
print(resp.status_code)  # 200
```

下载太慢可以换国内镜像源：`pip install xxx -i https://pypi.tuna.tsinghua.edu.cn/simple`
