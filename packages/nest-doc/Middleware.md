# Middleware中间件
中间件是一个在路由处理器之前被调用的函数。中间件函数可以访问请求和响应对象，以及在应用程序的请求-响应周期中的第 next() 个中间件函数。下一个中间件函数通常用名为 next 的变量表示。


您可以通过函数或带有 @Injectable() 装饰器的类来实现自定义 Nest 中间件。类应实现 NestMiddleware 接口，而函数则没有任何特殊要求。让我们从使用类方法实现一个简单的中间件功能开始。

``` ts
// logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('Request...');
    next();
  }
}

```

Nest 中间件完全支持依赖注入。与提供者和控制器一样，它们能够注入同一模块中可用的依赖项。一如既往，这是通过 `constructor` 完成的


## 应用中间件

在 @Module() 装饰器中没有位置放置中间件。相反，我们使用模块类的 configure() 方法来设置它们。包含中间件的模块必须实现 NestModule 接口。让我们在 AppModule 层级设置 LoggerMiddleware 。

``` ts
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('cats');
  }
}

```


在上述示例中，我们为先前在 CatsController 中定义的 /cats 路由处理器设置了 LoggerMiddleware 。我们还可以通过在配置中间件时将包含路由 path 和请求 method 的对象传递给 forRoutes() 方法来将中间件限制为特定的请求方法。在下面的示例中，请注意我们导入了 RequestMethod 枚举来引用所需的请求方法类型。

``` ts
// app.module.ts
import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: 'cats', method: RequestMethod.GET });
  }
}

```


## 路由通配符
在 NestJS 中间件中，也支持基于模式的路由。例如，命名通配符（ *splat ）可以用作通配符，匹配路由中任意字符的组合。在以下示例中，只要路由以 abcd/ 开头，无论后面跟着多少字符，中间件都会被执行。

``` ts

forRoutes({
  path: 'abcd/*splat',
  method: RequestMethod.ALL,
});

```


## 中间件消费者
`MiddlewareConsumer` 是一个辅助类。它提供了多种内置方法来管理中间件。所有这些方法都可以简单地以流畅风格链式调用。 `forRoutes()` 方法可以接受单个字符串、多个字符串、一个 `RouteInfo` 对象、控制器类，甚至多个控制器类。在大多数情况下，你可能会直接传递一个用逗号分隔的控制器列表。下面是一个包含单个控制器的示例：

``` ts
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CatsModule } from './cats/cats.module';
import { CatsController } from './cats/cats.controller';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(CatsController);
  }
}

```     

## 排除路由
有时，我们可能希望排除某些路由不应用中间件。这可以通过 exclude() 方法轻松实现。 exclude() 方法接受单个字符串、多个字符串或 RouteInfo 对象来标识要排除的路由
``` ts

consumer
  .apply(LoggerMiddleware)
  .exclude(
    { path: 'cats', method: RequestMethod.GET },
    { path: 'cats', method: RequestMethod.POST },
    'cats/{*splat}',
  )
  .forRoutes(CatsController);

```

以上示例中， LoggerMiddleware 将绑定到 CatsController 内定义的所有路由，除了传递给 exclude() 方法的三个路由。

## 功能中间件
我们一直在使用的 LoggerMiddleware 类非常简单。它没有成员、没有额外的方法，也没有依赖。我们为什么不能直接用一个简单的函数来定义它，而不是用类呢？实际上，我们可以这样做。这种类型的中间件称为函数式中间件。让我们将基于类的日志记录中间件转换为函数式中间件，以说明它们的区别：

``` ts
// logger.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request...`);
  next();
};

```
::: tip
当你的中间件不需要任何依赖时，考虑使用更简单的函数式中间件替代方案。
:::

并在 AppModule 中使用它：
``` ts
// app.module.ts
consumer
  .apply(logger)
  .forRoutes(CatsController);

```



## 多个中间件
如上所述，为了绑定多个按顺序执行的中间件，只需在 apply() 方法中提供一个用逗号分隔的列表：

``` ts

consumer.apply(cors(), helmet(), logger).forRoutes(CatsController);

```


## 全局中间件
如果我们希望一次性将中间件绑定到所有注册的路由上，可以使用由 INestApplication 实例提供的 use() 方法：

``` ts
// main.ts
const app = await NestFactory.create(AppModule);
app.use(logger);
await app.listen(process.env.PORT ?? 3000);

```

::: tip

在全局中间件中无法访问 DI 容器。当使用 app.use() 时，你可以使用函数式中间件。或者，你可以使用类中间件，并在 AppModule （或任何其他模块）中使用 .forRoutes('*') 来消费它。
:::