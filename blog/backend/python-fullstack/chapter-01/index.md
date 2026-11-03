# 第1章：Python vs JavaScript 核心差异

## 为什么要对比？

作为前端工程师，你已经理解了编程的核心概念：变量、函数、循环、异步等。学 Python 不需要从零开始，只需要理解**它和 JavaScript 的差异**。

::: tip
本章会用大量对比代码，帮你快速建立 Python 思维模型。不要死记语法，重点理解设计哲学的不同。
:::

## 语法差异速览

### 1. 缩进 vs 大括号

**JavaScript**：
```js
function greet(name) {
  if (name) {
    console.log(`Hello, ${name}!`);
  } else {
    console.log('Hello, stranger!');
  }
}
```

**Python**：
```python
def greet(name):
    if name:
        print(f"Hello, {name}!")
    else:
        print("Hello, stranger!")
```

::: warning
Python 用**缩进**表示代码块，必须统一（推荐 4 个空格）。VSCode 会自动处理，但要注意不要混用 Tab 和空格。
:::

### 2. 变量声明

**JavaScript**：
```js
const name = "Alice";    // 常量
let age = 25;            // 变量
var old = true;          // 过时的写法
```

**Python**：
```python
name = "Alice"  # 直接赋值，没有 const/let/var
age = 25
old = True
```

Python 没有 `const`，如果想表示常量，约定用**全大写命名**：
```python
MAX_CONNECTIONS = 100
API_KEY = "sk-xxxxx"
```

### 3. 字符串操作

**JavaScript**：
```js
const name = "Alice";
const age = 25;

// 模板字符串
const msg1 = `${name} is ${age} years old`;

// 字符串拼接
const msg2 = name + " is " + age + " years old";

// 多行字符串
const text = `
  This is
  a multiline
  string
`;
```

**Python**：
```python
name = "Alice"
age = 25

# f-string (推荐，Python 3.6+)
msg1 = f"{name} is {age} years old"

# format 方法
msg2 = "{} is {} years old".format(name, age)

# 字符串拼接（不推荐）
msg3 = name + " is " + str(age) + " years old"  # 注意：必须转成字符串

# 多行字符串
text = """
This is
a multiline
string
"""
```

::: tip
Python 的 f-string 和 JS 的模板字符串几乎一样，优先使用它。
:::

### 4. 数组 vs 列表

**JavaScript**：
```js
const fruits = ["apple", "banana", "cherry"];

// 添加元素
fruits.push("date");

// 访问元素
console.log(fruits[0]);  // "apple"

// 遍历
fruits.forEach(fruit => {
  console.log(fruit);
});

// map
const upper = fruits.map(f => f.toUpperCase());

// filter
const long = fruits.filter(f => f.length > 5);
```

**Python**：
```python
fruits = ["apple", "banana", "cherry"]

# 添加元素
fruits.append("date")

# 访问元素
print(fruits[0])  # "apple"

# 遍历
for fruit in fruits:
    print(fruit)

# map (用列表推导式更 Pythonic)
upper = [f.upper() for f in fruits]

# filter
long = [f for f in fruits if len(f) > 5]
```

::: tip
Python 的**列表推导式**非常强大，比 `map/filter` 更简洁易读。
:::

### 5. 对象 vs 字典

**JavaScript**：
```js
const user = {
  name: "Alice",
  age: 25,
  email: "alice@example.com"
};

// 访问属性
console.log(user.name);
console.log(user["age"]);

// 添加属性
user.active = true;

// 遍历
Object.keys(user).forEach(key => {
  console.log(`${key}: ${user[key]}`);
});
```

**Python**：
```python
user = {
    "name": "Alice",
    "age": 25,
    "email": "alice@example.com"
}

# 访问属性（只能用方括号）
print(user["name"])
print(user.get("age"))  # 更安全，不存在返回 None

# 添加属性
user["active"] = True

# 遍历
for key, value in user.items():
    print(f"{key}: {value}")
```

::: warning
Python 字典**不能用点号访问**，必须用 `dict["key"]` 或 `dict.get("key")`。
:::

### 6. 函数定义

**JavaScript**：
```js
// 普通函数
function add(a, b) {
  return a + b;
}

// 箭头函数
const multiply = (a, b) => a * b;

// 默认参数
function greet(name = "stranger") {
  return `Hello, ${name}!`;
}

// 解构参数
function createUser({ name, age }) {
  return { name, age, active: true };
}
```

**Python**：
```python
# 普通函数
def add(a, b):
    return a + b

# Lambda (匿名函数)
multiply = lambda a, b: a * b

# 默认参数
def greet(name="stranger"):
    return f"Hello, {name}!"

# 关键字参数
def create_user(name, age, active=True):
    return {"name": name, "age": age, "active": active}

# 调用时可以指定参数名
user = create_user(name="Alice", age=25)
```

::: tip
Python 的 lambda 功能有限（只能单行表达式），复杂逻辑用 `def` 定义。
:::

### 7. 类和对象

**JavaScript**：
```js
class User {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  greet() {
    return `Hello, I'm ${this.name}`;
  }

  get info() {
    return `${this.name} (${this.age})`;
  }
}

const user = new User("Alice", 25);
console.log(user.greet());
```

**Python**：
```python
class User:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def greet(self):
        return f"Hello, I'm {self.name}"
    
    @property
    def info(self):
        return f"{self.name} ({self.age})"

user = User("Alice", 25)
print(user.greet())
print(user.info)  # 当作属性访问
```

关键差异：
- Python 用 `__init__` 代替 `constructor`
- 所有方法第一个参数必须是 `self`（类似 JS 的 `this`）
- `@property` 装饰器实现 getter

## 数据类型对比

| JavaScript | Python | 说明 |
|-----------|--------|------|
| `null` | `None` | 空值 |
| `undefined` | 没有对应 | Python 只有 `None` |
| `true/false` | `True/False` | 注意大小写 |
| `Number` | `int` / `float` | Python 区分整数和浮点数 |
| `String` | `str` | - |
| `Array` | `list` | - |
| `Object` | `dict` | - |
| `Set` | `set` | 两者都有 |
| `Map` | `dict` | Python 的 dict 就是 Map |

## 常见陷阱

### 1. 等号判断

**JavaScript**：
```js
if (value === 5) {  // 严格相等
  // ...
}
```

**Python**：
```python
if value == 5:  # Python 只有 ==
    # ...

# 判断类型用 isinstance
if isinstance(value, int):
    # ...
```

### 2. 逻辑运算符

**JavaScript**：
```js
if (a && b) { }
if (a || b) { }
if (!a) { }
```

**Python**：
```python
if a and b:
    pass

if a or b:
    pass

if not a:
    pass
```

### 3. 空值检查

**JavaScript**：
```js
if (value) {
  // value 不是 null/undefined/0/false/""
}
```

**Python**：
```python
if value:
    # value 不是 None/0/False/""/[]/{}
    pass

# 明确检查 None
if value is not None:
    pass
```

### 4. 数组/列表是引用类型

**JavaScript & Python 都一样**：
```python
# Python
list1 = [1, 2, 3]
list2 = list1       # list2 引用 list1
list2.append(4)
print(list1)        # [1, 2, 3, 4] - list1 也变了！

# 正确的复制方式
list3 = list1.copy()  # 或 list1[:]
```

## 异步编程对比

这部分会在后面章节详细讲，这里先了解基本概念：

**JavaScript**：
```js
// Promise
async function fetchData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}

fetchData().then(data => console.log(data));
```

**Python**：
```python
# asyncio
import asyncio
import httpx

async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get('/api/data')
        data = response.json()
        return data

# 运行异步函数
asyncio.run(fetch_data())
```

## 实践练习

创建一个 `practice.py` 文件，尝试以下任务：

```python
# 练习1：列表推导式
numbers = [1, 2, 3, 4, 5]
# 生成每个数字的平方
squares = [n ** 2 for n in numbers]
print(squares)  # [1, 4, 9, 16, 25]

# 练习2：字典操作
users = [
    {"name": "Alice", "age": 25},
    {"name": "Bob", "age": 30},
    {"name": "Charlie", "age": 35}
]

# 找出年龄大于 28 的用户名
adults = [user["name"] for user in users if user["age"] > 28]
print(adults)  # ['Bob', 'Charlie']

# 练习3：函数定义
def calculate_total(items, tax_rate=0.1):
    """计算总价（含税）"""
    subtotal = sum(item["price"] for item in items)
    total = subtotal * (1 + tax_rate)
    return round(total, 2)

items = [
    {"name": "Apple", "price": 1.5},
    {"name": "Banana", "price": 0.8}
]
print(calculate_total(items))  # 2.53
```

运行方式：
```bash
python practice.py
```

## 小结

这一章我们对比了 Python 和 JavaScript 的核心差异：

- ✅ **语法差异** - 缩进、变量声明、字符串、函数
- ✅ **数据类型** - 列表、字典、None、True/False
- ✅ **常见陷阱** - 等号判断、逻辑运算符、引用类型
- ✅ **列表推导式** - Python 特有的简洁写法

::: tip
不要纠结于记住所有语法，动手写代码才是最快的学习方式。下一章我们会直接用 FastAPI 写第一个 Web 服务。
:::

下一章：[FastAPI 快速上手](/blog/backend/python-fullstack/chapter-02/)
