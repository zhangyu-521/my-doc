# Python 数据类型

Python 是动态类型语言：变量无需声明类型，但其底层数据对象本身具有明确的类型。理解每个类型的三大特性——是否可变、是否有序、元素是否可重复——是学习 Python 的核心基础。

::: tip
记忆口诀：数字、字符串、元组不可变（可作为字典键）；列表、字典、集合可变（不能作为字典键）。
:::

## 一、数据类型总览

### 1.1 内置数据类型分类

| 分类 | 类型 | 可变性 | 示例 |
| --- | --- | --- | --- |
| 数字类型 | `int`、`float` 就是前端的 number | 不可变 | `42`、`3.14` |
| 布尔类型 | `bool` 跟前端一样 boolean | 不可变 | `True`、`False` 只不过开头大写 |
| 字符串 | `str` 跟前端一样 string | 不可变 | `"hello"` |
| 序列类型 | `list`、`tuple`、`range` 类似于前端的数组 | list 可变；tuple、range 不可变 | `[1,2,3]`、`(1,2)`、`range(5)` |
| 映射类型 | `dict` 类似于前端的 map/object | 可变 | `{"name": "Tom"}` |
| 集合类型 | `set`、`frozenset` 类似于前端的 set | set 可变；frozenset 不可变 | `{1,2,3}` |
| 二进制类型 | `bytes`、`bytearray`、`memoryview` 类似于前端的 arrayBuffer | bytes 不可变；bytearray 可变 | `b"abc"` |

## 二、数字类型（Number）

### 2.1 整数 int

- 表示所有整数，精度不受位数限制（仅受内存约束）。
- 支持多种进制书写：`0b` 二进制、`0o` 八进制、`0x` 十六进制。
- 支持下划线分隔数字（Python 3.6+）：`1_000_000` 等价于 `1000000`，便于阅读大数。
- 常用运算符：`+`、`-`、`*`、`/`（浮点除）、`//`（整除向下取整）、`%`（取余）、`**`（幂）。

```python
a = 42
b = 0b1010        # 二进制，值为 10
c = 0xFF          # 十六进制，值为 255
big = 1_000_000   # 下划线分隔，等价于 1000000（Python 3.6+）
print(7 // 2)     # 3，向下取整
print(-7 // 2)    # -4，向下取整（注意不是 -3）
print(7 % 2)      # 1，取余
print(2 ** 10)    # 1024
print(big)        # 1000000
```

### 2.2 浮点数 float

- 表示带小数的数字，支持科学计数法：`1.5e3` 即 `1500.0`。
- 精度问题：浮点数按二进制存储，存在误差，例如 `0.1 + 0.2` 的结果是 `0.30000000000000004`。
- 特殊值：`inf`（无穷大）、`nan`（非数值）。

```python
pi = 3.14159
big = 1.5e3          # 1500.0
print(0.1 + 0.2)     # 0.30000000000000004，精度误差
print(round(0.1 + 0.2, 2))  # 0.3，四舍五入处理
```

### 2.3 布尔值 bool

- 只有 `True` 和 `False` 两个取值。
- 是 `int` 的子类：`True` 等价于 1，`False` 等价于 0。
- `bool()` 转换规则：`0`、空字符串、空列表等"空值"为 `False`，其余为 `True`。
- Python 没有 js 的 `? :` 表达式

```python
print(True == 1)    # True
print(False == 0)   # True
print(bool(0))      # False
print(bool(""))     # False
print(bool([1, 2])) # True
```

## 三、字符串（str）

### 3.1 字符串的创建

- 单引号、双引号均可表示字符串；三引号支持多行文本。
- 原始字符串 `r"..."` 取消转义，常用于路径和正则表达式。
- 字符串不可变：任何修改操作都会生成新字符串，原字符串不变。

```python
s1 = 'hello'
s2 = "world"
s3 = """多行
字符串"""
s4 = r"C:\new\test"   # 原始字符串，不解析 \n 转义
```

### 3.2 索引与切片

- 正向索引从 0 开始，负向索引从 -1 开始。
- 切片语法 `s[start:end:step]`，遵循左闭右开规则：包含起点下标、不包含终点下标（含头不含尾）。
- 省略 start 表示从开头取，省略 end 表示取到末尾；步长为负表示反向取值。

```python
s = "Python"
print(s[0])     # P
print(s[-1])    # n
print(s[1:4])   # yth，左闭右开：含索引 1，不含索引 4
print(s[::2])   # Pto，每隔一个取一个
print(s[::-1])  # nohtyP，反转字符串
```

### 3.3 字符串常用方法

| 类别 | 方法 | 作用 |
| --- | --- | --- |
| 大小写 | `upper()` / `lower()` / `title()` / `capitalize()` | 转大写 / 转小写 / 单词首字母大写 / 句首大写 |
| 去除空白 | `strip()` / `lstrip()` / `rstrip()` | 去除两端 / 左侧 / 右侧空白或指定字符 |
| 查找统计 | `find()` / `index()` / `count()` | 查找下标（找不到返回 -1）/ 查找下标（找不到报错）/ 统计次数 |
| 判断开头结尾 | `startswith()` / `endswith()` | 是否以某字符串开头 / 结尾 |
| 替换 | `replace(old, new)` | 替换所有匹配子串 |
| 分割与拼接 | `split()` / `join()` | 按分隔符拆成列表 / 用分隔符拼接序列 |
| 字符判断 | `isdigit()` / `isalpha()` / `isspace()` | 是否全为数字 / 全为字母 / 全为空白 |

```python
s = "  Hello Python  "
print(s.strip())            # "Hello Python"
words = "a,b,c".split(",")  # ['a', 'b', 'c']
print("-".join(words))      # "a-b-c"
print(s.replace("Python", "World"))  # "  Hello World  "
print(s.upper().strip())    # "HELLO PYTHON"
```

### 3.4 字符串格式化

- `%` 格式化（旧式）：`"Hello %s" % name`。
- `str.format()` 方法：`"Hello {}".format(name)`。
- f-string（推荐）：`f"Hello {name}"`，Python 3.6+ 支持，直观高效。

```python
name = "Tom"
age = 18
print("Hello %s" % name)          # Hello Tom
print("{} is {} years old".format(name, age))
print(f"{name} is {age} years old")  # 推荐：f-string
print(f"{age * 2}")               # 36，f-string 内可写表达式
```

## 四、列表（list）

### 4.1 列表的特性与创建

- 有序、可变、可重复，可存放任意类型元素，支持嵌套。
- 创建方式：`[]` 字面量、`list()` 构造、`list(range(n))` 生成。

```python
nums = [1, 2, 3]
mix = [1, "a", 3.14, [2, 3]]   # 可混合类型、可嵌套
empty = []
lst = list("abc")              # ['a', 'b', 'c']
nums2 = list(range(5))         # [0, 1, 2, 3, 4]
```

### 4.2 列表常用操作与方法

| 操作 | 方法 / 语法 | 作用 |
| --- | --- | --- |
| 追加元素 | `append(x)` / `extend(iterable)` | 末尾加一个元素 / 末尾批量添加 |
| 插入元素 | `insert(index, x)` | 在指定位置插入 |
| 删除元素 | `remove(x)` / `pop(i)` / `clear()` / `del` | 按值删（无则报错）/ 按下标删并返回 / 清空 / 切片删除 |
| 查找统计 | `index(x)` / `count(x)` / `in` | 元素下标 / 出现次数 / 是否包含 |
| 排序反转 | `sort()` / `sorted()` / `reverse()` | 原地排序 / 返回新排序列表 / 原地反转 |
| 通用函数 | `len()` / `max()` / `min()` / `sum()` | 长度 / 最大值 / 最小值 / 求和 |

```python
nums = [3, 1, 2]
nums.append(4)         # [3, 1, 2, 4]
nums.insert(0, 0)      # [0, 3, 1, 2, 4]
nums.sort()            # [0, 1, 2, 3, 4]，原地排序
last = nums.pop()      # last = 4
print(nums)            # [0, 1, 2, 3]
print(2 in nums)       # True
```

### 4.3 列表切片

```python
nums = [0, 1, 2, 3, 4, 5]
print(nums[1:4])   # [1, 2, 3]
print(nums[::-1])  # [5, 4, 3, 2, 1, 0]，反转
print(nums[::2])   # [0, 2, 4]
```

### 4.4 列表推导式

- 语法：`[表达式 for 变量 in 可迭代对象 if 条件]`。
- 相比 for 循环 + append，代码更简洁、性能更好。

```python
squares = [x * x for x in range(5)]        # [0, 1, 4, 9, 16]
evens = [x for x in range(10) if x % 2 == 0]  # [0, 2, 4, 6, 8]
pairs = [(a, b) for a in [1, 2] for b in [3, 4]]  # 嵌套推导
```

## 五、元组（tuple）

### 5.1 元组的特性与创建

- 有序、不可变、可重复：创建后不能增删改元素。
- 创建方式：`(1, 2, 3)`；单元素元组必须加逗号 `(1,)`；`tuple()` 转换。
- 不可变使其可哈希，可作为字典键或集合元素。

```python
t1 = (1, 2, 3)
t2 = (1,)          # 单元素元组，逗号不能省略
t3 = tuple([1, 2]) # (1, 2)
empty = ()
print(t1[0])       # 1，支持索引
# t1[0] = 9        # 报错：元组不可修改
```

### 5.2 元组解包

```python
a, b, c = (1, 2, 3)     # 分别赋值 a=1, b=2, c=3
x, y = y, x             # 经典交换变量写法
first, *rest = (1, 2, 3, 4)  # first=1, rest=[2, 3, 4]（星号收集）
name, age = ("Tom", 18)      # 函数返回多个值常用
```

### 5.3 元组 vs 列表

| 对比项 | 列表 list | 元组 tuple |
| --- | --- | --- |
| 可变性 | 可变，可增删改 | 不可变，创建后固定 |
| 可哈希（可作字典键） | 否 | 是（元素均不可变时） |
| 性能 | 相对较慢 | 更省内存、更快 |
| 典型用途 | 需要动态增删的集合 | 固定结构数据、函数多返回值、字典键 |

## 六、字典（dict）

### 6.1 字典的特性与创建

- 以键值对存储，键唯一，键必须可哈希（通常用 `str`、`int`、`tuple`）。
- Python 3.7+ 字典保持插入顺序。
- 创建方式：`{}` 字面量、`dict(name="Tom")`、`dict([("a", 1)])`。

```python
d1 = {"name": "Tom", "age": 18}
d2 = dict(name="Tom", age=18)      # 关键字创建
d3 = dict([("a", 1), ("b", 2)])    # 键值对序列创建
d4 = {}                            # 空字典
```

### 6.2 字典常用操作

| 操作 | 方法 / 语法 | 作用 |
| --- | --- | --- |
| 取值 | `d[key]` / `get(key, default)` | 键不存在报错 / 键不存在返回默认值（不报错） |
| 增改 | `d[key] = value` / `update()` | 键存在则改、不存在则增 / 批量更新 |
| 删除 | `pop(key)` / `popitem()` / `del` / `clear()` | 按键删并返回值 / 删除最后一项 / 删除指定键 / 清空 |
| 遍历 | `keys()` / `values()` / `items()` | 所有键 / 所有值 / 所有键值对 |
| 其他 | `setdefault(k, v)` / `len()` / `in` | 键不存在时设默认值 / 长度 / 判断键是否存在 |

```python
d = {"name": "Tom", "age": 18}
print(d.get("score", 0))        # 0，键不存在返回默认值
d["city"] = "Beijing"           # 新增键值对
d.update({"age": 19, "job": "dev"})  # 批量更新
for k, v in d.items():          # 遍历键值对
    print(k, v)
print("name" in d)              # True
age = d.pop("age")              # 删除并取值
```

### 6.3 字典推导式

```python
squares = {x: x * x for x in range(5)}   # {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}
filtered = {k: v for k, v in squares.items() if v % 2 == 0}
```

## 七、集合（set / frozenset）

### 7.1 集合的特性与创建

- 无序、元素唯一（自动去重）、元素必须可哈希（不可变类型）。
- 创建方式：`{1, 2, 3}` 字面量、`set(可迭代对象)`。注意：空集合必须写 `set()`，`{}` 是空字典。
- `frozenset` 是不可变版本，可作字典键。

```python
s1 = {1, 2, 2, 3}        # {1, 2, 3}，自动去重
s2 = set([1, 2, 2, 3])   # {1, 2, 3}
empty = set()            # 空集合（{} 是空字典！）
fs = frozenset([1, 2])   # 不可变集合
```

### 7.2 集合常用操作

- 增：`add(x)` 添加单个元素；`update(iterable)` 批量添加。
- 删：`remove(x)` 元素不存在会报错；`discard(x)` 不存在不报错；`pop()` 随机删除；`clear()` 清空。

```python
s = {1, 2, 3}
s.add(4)           # {1, 2, 3, 4}
s.discard(99)      # 不存在也不报错
s.remove(1)        # {2, 3, 4}，不存在则报 KeyError
```

### 7.3 集合运算

| 运算 | 符号 / 方法 | 含义 |
| --- | --- | --- |
| 并集 | `a \| b` / `union()` | 两集合所有元素 |
| 交集 | `a & b` / `intersection()` | 两集合共有元素 |
| 差集 | `a - b` / `difference()` | 在 a 中但不在 b 中 |
| 对称差 | `a ^ b` / `symmetric_difference()` | 不同时属于 a 和 b 的元素 |
| 子集判断 | `a <= b` / `issubset()` | a 是否为 b 的子集 |

```python
a = {1, 2, 3}
b = {2, 3, 4}
print(a | b)   # {1, 2, 3, 4}
print(a & b)   # {2, 3}
print(a - b)   # {1}
print(a ^ b)   # {1, 4}
print({1, 2} <= a)  # True，子集判断
```

## 八、类型转换

### 8.1 显式转换

| 函数 | 说明 | 示例 |
| --- | --- | --- |
| `int(x)` | 转整数；字符串必须是整数格式 | `int("42")` → 42；`int(3.9)` → 3（截断） |
| `float(x)` | 转浮点数 | `float("3.14")` → 3.14 |
| `str(x)` | 转字符串 | `str(42)` → "42" |
| `bool(x)` | 转布尔值，空值为 False | `bool(0)` → False；`bool("abc")` → True |
| `list(x)` / `tuple(x)` / `set(x)` | 在序列间转换 | `list("ab")` → ["a","b"]；`set([1,1])` → {1} |
| `dict(x)` | 由键值对序列转字典 | `dict([("a",1)])` → {"a": 1} |

```python
print(int(3.9))          # 3，直接截断小数部分
print(int("42"))         # 42
# print(int("3.14"))     # 报错：字符串含小数点不能直接转 int
print(int(float("3.14")))  # 正确做法：先转 float 再转 int
```

### 8.2 隐式转换

- 不同类型运算时 Python 自动转换：`int` 与 `float` 运算结果自动提升为 `float`。
- `bool` 参与数值运算时视为 0 / 1。

```python
print(1 + 2.0)   # 3.0，自动提升为 float
print(True + 1)  # 2，True 视为 1
```

## 九、类型判断

- `type(x)`：返回对象的类型，适合查看确切类型。
- `isinstance(x, type)`：判断是否为某类型（或其子类）的实例，推荐使用。
- 注意 `bool` 是 `int` 的子类：`isinstance(True, int)` 结果为 `True`。

```python
x = 42
print(type(x))               # <class 'int'>
print(isinstance(x, int))    # True
print(isinstance(True, int)) # True，bool 是 int 子类
print(type(3.14) == float)   # True

# type() 查看各数据类型的输出类型
print(type(42))          # <class 'int'>
print(type(3.14))        # <class 'float'>
print(type(True))        # <class 'bool'>
print(type("hello"))     # <class 'str'>
print(type([1, 2]))      # <class 'list'>
print(type((1, 2)))      # <class 'tuple'>
print(type({"a": 1}))    # <class 'dict'>
print(type({1, 2}))      # <class 'set'>
```

## 十、可变与不可变总结

| 类别 | 类型 | 关键影响 |
| --- | --- | --- |
| 可变类型 | `list`、`dict`、`set`、`bytearray` | 内容可修改；不可哈希，不能作字典键 / 集合元素；作为函数参数修改会影响原对象 |
| 不可变类型 | `int`、`float`、`complex`、`bool`、`str`、`tuple`、`frozenset`、`bytes` | 内容不可修改；可哈希；修改操作都会产生新对象 |

```python
# 不可变：修改产生新对象
s = "abc"
s2 = s.upper()     # s 不变，s2 是新字符串

# 可变：原地修改
lst = [1, 2]
lst.append(3)      # lst 本身变为 [1, 2, 3]

# 函数参数传递的影响
def add_item(container):
    container.append(9)   # 可变类型：原列表被修改

nums = [1]
add_item(nums)
print(nums)        # [1, 9]，外部对象被修改
```
