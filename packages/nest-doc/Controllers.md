控制器负责处理传入的请求并将响应发送回客户端。


控制器的目的是处理应用程序的特定请求。路由机制决定了哪个控制器将处理每个请求。通常，一个控制器有多个路由，每个路由可以执行不同的操作。



要创建一个基本控制器，我们使用类和装饰器。装饰器将类与必要的元数据关联起来，允许 Nest 创建一个路由映射，将请求连接到相应的控制器。

::: tip
要快速创建具有内置验证的 CRUD 控制器，您可以使用 CLI 的 CRUD 生成器： nest g resource [name]
:::


在以下示例中，我们将使用 @Controller() 装饰器，这是定义基本控制器所必需的。我们将指定一个可选的路由路径前缀 cats 。在 @Controller() 装饰器中使用路径前缀有助于我们将相关的路由分组在一起，并减少重复代码。例如，如果我们想将管理猫实体交互的路由分组到 /cats 路径下，我们可以在 @Controller() 装饰器中指定 cats 路径前缀。这样，我们就不需要在文件中的每个路由中都重复这一部分路径。


```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll() {
    return 'This action returns all cats';
  }
}
```

::: tip
使用 CLI 创建控制器，只需执行 $ nest g controller [name] 命令
:::

## 路由
放在 findAll() 方法之前的 @Get() HTTP 请求方法装饰器告诉 Nest 为特定的端点创建 HTTP 请求处理器。这个端点由 HTTP 请求方法（此处为 GET）和路由路径定义。那么，什么是路由路径呢？处理器的路由路径由控制器声明的（可选）前缀与方法装饰器中指定的任何路径组合而成。由于我们为每个路由设置了前缀（ cats ），并且在方法装饰器中没有添加任何特定路径，Nest 将 GET /cats 请求映射到此处理器


如前所述，路由路径包括可选的控制器路径前缀和与方法装饰器中指定的任何路径字符串。例如，如果控制器前缀是 cats ，方法装饰器是 @Get('breed') ，则生成的路由将是 GET /cats/breed

## 请求对象
处理器通常需要访问客户端的请求详情。Nest 提供了从底层平台（默认为 Express）访问请求对象的方式。您可以通过在处理器签名中指示 Nest 使用 @Req() 装饰器注入请求对象来访问该对象

```typescript
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(@Req() request: Request) {
    return 'This action returns all cats';
  }
}
```
## 资源
Nest 为所有标准 HTTP 方法提供了装饰器： @Get() 、 @Post() 、 @Put() 、 @Delete() 、 @Patch() 、 @Options() 和 @Head() 。此外， @All() 定义了一个处理所有这些方法的端点

## 路由通配符
``` ts
@Get('abcd/*')
findAll() {
  return 'This route uses a wildcard';
}

```

## 状态码
默认情况下，Nest 为每个路由返回 200 OK 状态码。您可以使用 @HttpCode() 装饰器来更改此行为

``` ts
@Get()
@HttpCode(204)
findAll() {
  return 'This action returns all cats';
}
```

## 响应头
您可以使用 @Header() 装饰器来设置响应头

``` ts
@Get()
@Header('Cache-Control', 'none')
findAll() {
  return 'This action returns all cats';
}
```

## 重定向
您可以使用 @Redirect() 装饰器来重定向请求

``` ts
@Get()
@Redirect('https://nestjs.com', 301)
findAll() {
  return 'This action returns all cats';
}
```

## 路由参数
您可以使用 @Param() 装饰器来访问路由参数

``` ts
@Get(':id')
findOne(@Param() params) {
  console.log(params.id);
  return 'This action returns a #${params.id} cat';
}
```

## 请求体
您可以使用 @Body() 装饰器来访问请求体

``` ts
@Post()
create(@Body() createCatDto: CreateCatDto) {
  return 'This action adds a new cat';
}


@Get(':id')
findOne(@Param('id') id: string): string {
  return `This action returns a #${id} cat`;
}

```

## 查询参数

您可以使用 @Query() 装饰器来访问查询参数

``` ts
@Get()
findAll(@Query() query: any) {
  console.log(query);
  return 'This action returns all cats';
}

or

@Get()
findAll(@Query('age') age: number) {
  console.log(age);
  return 'This action returns all cats';
}
```

## 完整示例
``` ts

import { Controller, Get, Query, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { CreateCatDto, UpdateCatDto, ListAllEntities } from './dto';

@Controller('cats')
export class CatsController {
  @Post()
  create(@Body() createCatDto: CreateCatDto) {
    return 'This action adds a new cat';
  }

  @Get()
  findAll(@Query() query: ListAllEntities) {
    return `This action returns all cats (limit: ${query.limit} items)`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns a #${id} cat`;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
    return `This action updates a #${id} cat`;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return `This action removes a #${id} cat`;
  }
}

```

## cat控制器注入Module装饰器

控制器必须始终是模块的一部分，这就是为什么我们要在 @Module() 装饰器中包含 controllers 数组。由于除了根 AppModule 之外我们没有定义其他模块，我们将使用它来注册 CatsController

``` ts
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';

@Module({
  controllers: [CatsController],
})
export class AppModule {}
```
我们使用 @Module() 装饰器将元数据附加到模块类上，现在 Nest 可以轻松确定哪些控制器需要被挂载