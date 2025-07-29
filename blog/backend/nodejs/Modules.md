# 模块

模块是一个带有 @Module() 装饰器的类。这个装饰器提供了元数据，Nest 使用这些元数据来高效地组织和管理工作簿结构


每个 Nest 应用至少有一个模块，即根模块，它作为 Nest 构建应用图的起点。这个图是 Nest 用于解析模块之间关系和依赖的内部结构。虽然小应用可能只有一个根模块，但这通常不是情况。强烈推荐使用模块作为组织组件的有效方式。对于大多数应用，你很可能有多个模块，每个模块封装了一组密切相关的能力。

`@Module()` 装饰器接受一个描述模块属性的元数据对象。这些属性包括：

- `providers`：此模块提供的控制器
- `controllers`：此模块中定义的控制器
- `imports`：此模块导入的模块
- `exports`：此模块导出的提供者，供其他模块使用

## 功能模块
接下来，我们将创建 CatsModule 来演示如何将控制器和服务分组。
``` ts
// cats.module.ts
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}

```
::: tip
要使用 CLI 创建模块，只需执行 $ nest g module cats 命令
:::


在上面，我们在 cats.module.ts 文件中定义了 CatsModule ，并将与此模块相关的一切移至 cats 目录。我们需要做的最后一件事是将此模块导入根模块（在 app.module.ts 文件中定义的 AppModule ）

``` ts
// app.module.ts
import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule {}

```
## 共享模块
在 Nest 中，模块默认是单例的，因此你可以毫不费力地在多个模块之间共享任何提供者的同一个实例。

每个模块自动就是一个共享模块。一旦创建，它就可以被任何其他模块重用。让我们想象一下，我们想要在几个其他模块之间共享 `CatsService` 的实例。为了实现这一点，我们首先需要通过将其添加到模块的 `exports` 数组中来导出 `CatsService` 提供者，如下所示：

``` ts 
// cats.module.ts
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService]
})
export class CatsModule {}

```

现在任何导入 CatsModule 的模块都可以访问 CatsService ，并且会与其他所有导入它的模块共享同一个实例

如果我们直接在每个需要它的模块中注册 CatsService ，确实可以工作，但这会导致每个模块都获得 CatsService 的独立实例。这会增加内存使用，因为创建了相同服务的多个实例，还可能导致意外行为，例如如果服务维护任何内部状态，可能会出现状态不一致的情况。

通过将 CatsService 封装在模块内，例如 CatsModule ，并导出它，我们确保 CatsService 的同一实例在所有导入 CatsModule 的模块中复用。这不仅减少了内存消耗，还带来了更可预测的行为，因为所有模块共享同一实例，从而更容易管理共享状态或资源。这是像 NestJS 这样的框架中模块化和依赖注入的关键优势之一——允许服务在整个应用程序中高效共享

## 模块重新导出
如上所述，模块可以导出其内部提供者。此外，它们还可以重新导出所导入的模块。在下面的示例中， CommonModule 被导入到 CoreModule 中，同时也从 CoreModule 中导出，使其可供导入此模块的其他模块使用

``` ts

@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}

```

## 依赖注入
模块类也可以注入提供者（例如，用于配置目的）：
``` ts
// cats.module.ts
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {
  constructor(private catsService: CatsService) {}
}

```
然而，由于循环依赖，模块类本身不能作为提供者被注入。

## 全局模块
如果你必须在每个地方导入相同的模块集，这可能会很繁琐。与 Nest 不同，Angular 中的模块 providers 在全局范围内注册。一旦定义，它们就到处可用。然而，Nest 将提供者封装在模块范围内。在不首先导入封装模块的情况下，你无法在其他地方使用模块的提供者

当你想要提供一组应该开箱即用的提供者（例如，辅助工具、数据库连接等）时，使用 `@Global()` 装饰器将模块设为全局。


``` ts
import { Module, Global } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Global()
@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}

```

`@Global()` 装饰器使模块具有全局作用域。全局模块应该只注册一次，通常由根模块或核心模块注册。在上述示例中， `CatsService` 提供者将是无处不在的，希望注入服务的模块不需要在它们的 imports 数组中导入 `CatsModule`

::: tip
将所有内容设为全局并不是推荐的设计实践。虽然全局模块可以减少样板代码，但通常更好的做法是使用 `imports` 数组以受控和清晰的方式使模块的 API 对其他模块可用。这种方法提供了更好的结构和可维护性，确保仅与必要部分共享模块，同时避免应用程序中不相关部分之间的不必要耦合
:::

## 动态模块
Nest 支持动态模块，允许你在运行时创建模块。动态模块对于创建可扩展的应用程序非常有用，因为它们允许你根据应用程序的需求动态添加或删除模块。

``` ts

import { Module, DynamicModule } from '@nestjs/common';
import { createDatabaseProviders } from './database.providers';
import { Connection } from './connection.provider';

@Module({
  providers: [Connection],
  exports: [Connection],
})
export class DatabaseModule {
  static forRoot(entities = [], options?): DynamicModule {
    const providers = createDatabaseProviders(options, entities);
    return {
      module: DatabaseModule,
      providers: providers,
      exports: providers,
    };
  }
}

```

::: tip
`forRoot()` 方法可以同步或异步（即通过 Promise ）返回一个动态模块。
:::

该模块默认通过 @Module() 装饰器元数据定义了 Connection 提供者，但根据传递给 forRoot() 方法的 entities 和 options 对象，还会额外暴露一系列提供者，例如存储库。请注意，动态模块返回的属性扩展（而不是覆盖）在 @Module() 装饰器中定义的基础模块元数据。这就是静态声明的 Connection 提供者和动态生成的存储库提供者如何从模块中导出的方式


如果你想在全局范围内注册一个动态模块，将 global 属性设置为 true 。
``` ts

{
  global: true,
  module: DatabaseModule,
  providers: providers,
  exports: providers,
}

```

::: warning
如上所述，将所有内容设为全局并不是一个好的设计决策。
:::

DatabaseModule 可以按照以下方式导入和配置：
``` ts

import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [DatabaseModule.forRoot([User])],
})
export class AppModule {}

```


如果你想要转而重新导出一个动态模块，你可以在导出数组中省略 forRoot() 方法调用：
``` ts

import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [DatabaseModule.forRoot([User])],
  exports: [DatabaseModule],
})
export class AppModule {}

```