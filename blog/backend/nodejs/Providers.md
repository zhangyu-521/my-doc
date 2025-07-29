# 提供者

提供者是 Nest 的核心概念。Nest 中的许多基本类，如服务、仓库、工厂和助手，都可以被视为提供者。提供者的关键思想是它可以作为依赖注入，使对象之间能够形成各种关系。将这些对象“连接起来”的责任主要由 Nest 运行时系统处理


## 服务
让我们从创建一个简单的 CatsService 开始。这个服务将处理数据存储和检索，它将被 CatsController 使用。由于它在管理应用程序逻辑中的作用，它是一个理想的候选者，可以作为提供者来定义

``` ts
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    return this.cats;
  }
}
```
我们的 CatsService 是一个包含一个属性和两个方法的简单类。这里的重点添加是 @Injectable() 装饰器。这个装饰器将元数据附加到类上，表明 CatsService 是一个可以被 Nest `IoC` 容器管理的类
::: tip
要使用 CLI 创建服务，只需执行 $ nest g service cats 命令
:::

现在我们已经有了用于获取猫的服务类，让我们在 CatsController 中使用它。

``` ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}

```

依赖注入通过类构造函数进行。注意使用了 `private` 关键字。这种简写方式让我们能够在同一行中声明和初始化 catsService 成员，简化了流程。


## 依赖注入
Nest 基于强大的设计模式——依赖注入构建
```ts

constructor(private catsService: CatsService) {}

```

## 作用域
提供者通常具有与其生命周期相匹配的生存期（"作用域"）。当应用程序启动时，必须解析每个依赖项，这意味着每个提供者都会被实例化。类似地，当应用程序关闭时，所有提供者都会被销毁。然而，也可以将提供者设置为请求作用域，这意味着其生存期与特定请求相关联，而不是应用程序的生命周期

## 自定义提供者
Nest 带有一个内置的控制反转 ("IoC") 容器，用于管理提供者之间的关系。这一功能是依赖注入的基础，但它实际上比我们目前所涵盖的内容要强大得多。定义提供者有几种方法：你可以使用纯值、类，以及同步或异步工厂

## 基于属性注入

我们之前使用的技术称为基于构造函数的注入，其中通过构造函数方法注入提供者。在某些特定情况下，基于属性的注入可能很有用。例如，如果您的顶级类依赖于一个或多个提供者，在子类中将它们全部通过 super() 传递上可能会变得繁琐。为了避免这种情况，您可以直接在属性级别使用 @Inject() 装饰器

``` ts

import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class HttpService<T> {
  @Inject('HTTP_OPTIONS')
  private readonly httpClient: T;
}

```


::: warning
如果你的类没有继承另一个类，通常最好使用基于构造函数的注入。构造函数明确指定了所需的依赖项，与带有 @Inject 注释的类属性相比，这提供了更好的可见性，并使代码更易于理解
:::

## 提供者注册

现在我们已经定义了一个提供者（ CatsService ）和一个消费者（ CatsController ），需要将服务注册到 Nest 中以使其能够处理注入。这通过编辑模块文件（ app.module.ts ）并在 @Module() 装饰器的 providers 数组中添加服务来完成

``` ts

import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';
import { CatsService } from './cats/cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class AppModule {}

```

