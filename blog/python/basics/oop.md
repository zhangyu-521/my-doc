# Python 面向对象

## 什么是面向对象？

一句话解释：面向过程关心"怎么做"，面向对象关心"谁来做"。

先看个对比。以前我们写代码，基本是这样的：

```python
def make_coffee(cup):
    grind()
    boil()
    pour(cup)
    print("咖啡好了！")
```

而面向对象，是把咖啡相关的数据和动作打包进一个"咖啡机"对象里：

```python
machine = CoffeeMachine()
machine.grind()
machine.boil()
machine.pour(cup)
```

数据（豆子、水量）和方法（磨豆、烧水）都归这台机器管，想再开一家店？直接再创建一个实例就行，不用重写。

::: tip
类是图纸，对象是图纸造出来的实例；数据和方法都打包在对象里。
:::

## 类和对象

类（`class`）是图纸、是模板；对象是根据图纸造出来的具体实例。

```python
class Cat:
    def meow(self):
        print("喵~")
```

光定义类不会触发任何代码，要实例化之后才能用：

```python
xiaoman = Cat()   # 创建对象
xiaoman.meow()    # 调用方法，输出：喵~
```

## self 到底是什么？

`self` 表示"当前这个对象自己"。调用 `xiaoman.meow()` 时，Python 会偷偷把它翻译成 `Cat.meow(xiaoman)`，把对象本身传进去。

所以方法里的 `self`，就是用来访问"自己身上"的属性和方法的。

## 属性：给对象存数据

### \_\_init\_\_ 构造方法

创建对象时自动执行，用来初始化属性：

```python
class Cat:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def meow(self):
        print(f"{self.name}：喵~")

xiaoman = Cat("小满", 2)
print(xiaoman.name)   # 小满
print(xiaoman.age)    # 2
```

### 类属性 vs 实例属性

写在 `__init__` 里的是**实例属性**，每个对象各存各的；写在类里的是**类属性**，所有对象共享同一份：

```python
class Cat:
    species = "猫科动物"      # 类属性：所有猫共享

    def __init__(self, name):
        self.name = name    # 实例属性：每只猫自己的
```

用 `Cat.species` 或 `xiaoman.species` 都能访问到同一个值。

## 三大特性：封装、继承、多态

### 封装：把数据藏起来

不想让外部随便改的属性，可以在前面加下划线：

```python
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance   # 私有属性，外部直接访问不到

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount

    def get_balance(self):
        return self.__balance
```

小知识：`__balance` 会被 Python 改写成 `_BankAccount__balance`（名字修饰），单下划线 `_x` 只是"约定俗成"的私有，两者都不是真正的强约束。

### 继承：站在父类肩膀上

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        print(f"{self.name}：汪汪！")

class Cat(Animal):
    def speak(self):
        print(f"{self.name}：喵喵！")
```

子类自动拥有父类的属性和方法，也可以重写（覆盖）父类的方法；想在子类里复用父类的初始化逻辑，用 `super()`：

```python
class Dog(Animal):
    def __init__(self, name, age):
        super().__init__(name)   # 调用父类的 __init__
        self.age = age
```

### 多态：同一句话，不同反应

多态就是"同一接口，不同实现"。上面 `Dog` 和 `Cat` 都有 `speak()`，但叫出来的声音不一样。Python 还特别宽容，不要求你真的继承同一个父类，只要"长得像"就行——这就是**鸭子类型**：

```python
def let_it_speak(animal):
    animal.speak()   # 不管是什么类，只要会 speak 就行

let_it_speak(Dog("大满"))   # 大满：汪汪！
let_it_speak(Cat("小满"))   # 小满：喵喵！
```

## 常用魔术方法

双下划线开头结尾的方法叫魔术方法，Python 会在特定场景自动调用它们：

| 方法 | 什么时候触发 | 用途 |
| --- | --- | --- |
| `__init__(self)` | 创建对象时 | 初始化属性 |
| `__str__(self)` | `print(对象)` 时 | 返回给人看的字符串 |
| `__repr__(self)` | 交互式环境、调试时 | 返回给开发者看的字符串 |
| `__len__(self)` | `len(对象)` 时 | 返回长度 |
| `__eq__(self, other)` | 对象 `==` 比较时 | 自定义相等判断 |

```python
class Cat:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __str__(self):
        return f"Cat({self.name}, {self.age}岁)"

    def __eq__(self, other):
        return self.name == other.name and self.age == other.age

a = Cat("小满", 2)
b = Cat("小满", 2)
print(a)           # Cat(小满, 2岁)
print(a == b)      # True
```

## 实战：一个小型"猫咖"系统

把上面这些串起来，写一个猫咖收银系统：

```python
class Cat:
    def __init__(self, name, price):
        self.name = name
        self.price = price

class CatCafe:
    def __init__(self, name):
        self.name = name
        self.cats = []
        self.total = 0

    def add_cat(self, cat):
        self.cats.append(cat)

    def serve(self, cat):
        self.total += cat.price
        print(f"客人在 {self.name} 撸了 {cat.name}，收费 ${cat.price}")

cafe = CatCafe("满满猫咖")
cafe.add_cat(Cat("小满", 30))
cafe.add_cat(Cat("大满", 25))

for cat in cafe.cats:
    cafe.serve(cat)

print(f"今日营收：${cafe.total}")
```

输出：

```text
客人在 满满猫咖 撸了 小满，收费 $30
客人在 满满猫咖 撸了 大满，收费 $25
今日营收：$55
```

看到没：数据（猫的名单、营收金额）和方法（加猫、接客）都打包在 `CatCafe` 里，外部只管调用，不用管内部细节——这就是面向对象的魅力。

## 什么时候该用类？

- 当你有一组相关的数据，而且经常带着这组数据做同样的操作时——用类很合适。
- 写简单脚本、一次性小工具，直接用函数就够了，别为了用而用。

::: tip
命名建议：类名用大驼峰（PascalCase），如 `MyCat`；变量和方法名用小写加下划线，如 `xiaoman`、`meow()`。
:::
