## Language and Environment(语言和环境，语法)
- `target`: 打包后的一个语法支持，默认引入对应的ts的类型声明文件，可以在lib中自己定义所需的语法声明文件
- `lib：` 手动指定要加载的声明文件
- `jsx`: 为了区分jsx环境，是否需要转化，以及是否转化
- `experimentalDecorators：` 是否支持装饰器
- `emitDecoratorMetadata：` 是否支持装饰器元数据（自动生成元数据）
- `jsxFactory：` 区分创建虚拟节点的方法是react的createElement还是preact的h方法
- `jsxFragmentFactory：` 文档碎片采用的是React.Fragment还是Fragment
- `jsxImportSource`: 自动导入模块的时候，解析的路径名
- `reactNamespace：` 指定谁调用的createElement方法，默认是React，如果是preact，则指定为preact
- `noLib：` 不加载所有的文件库
- `useDefineForClassFields：` 采用Object.defineProperty来定义class的属性，而不是直接赋值
- `moduleDetection`: 模块检测，默认是auto，可以指定为force，表示强制检测，或者legacy，表示不检测


## modules（模块相关）

- `module：` commonjs, es模块， AMD， SystemJS(微前端)等
- `rootDir：` 当前项目的根目录，指定打包目录配合include使用
- `moduleResolution：` 模块解析策略，默认是node，还有classic（不建议用）
- `baseUrl：` 指定模块解析的基准目录，默认是当前目录，可以指定为其他目录
- `paths：` 指定模块解析的路径，可以指定多个，可以指定别名比如@/
- `rootDirs：` 指定文件项目在一起，将两个或多个目录映射在一起
- `typeRoots：` 查找声明文件的存放路径，可以通过types字段指定那些要加载
- `allowUmdGlobalAccess：` 允许访问UMD全局变量
- `moduleSuffixes：` 指定模块的后缀名，比如ts,tsx,js,jsx
- `allowImportingTsExtensions：` 允许导入ts后缀的文件
- `resolveJsonModule：` 是否支持解析json文件

## JavaScript

- `allowJs：` 是否允许编译js文件，在ts中可以使用js文件
- `checkJs：` 是否检查js文件语法，允许检测js
- `maxNodeModuleJsDepth：` 指定node_modules的深度，默认是1，表示不限制

## Emit（输出相关）

- `declaration：` 是否生成声明文件，默认是false
- `declarationMap：` 是否生成声明文件map，默认是false
- `emitDeclarationOnly：` 只生成声明文件
- `sourceMap：` 是否生成map文件，默认是false
- `outDir：` 指定输出目录
- `outFile：` 指定输出文件，如果指定了，则所有的文件都会输出到一个文件中（amd和systemjs用）
- `removeComments：` 是否移除注释
- `noEmitOnError：` 是否在发生错误的时候不输出文件
- `noEmit：` 是否不输出文件
- `importHelpers：` 是否引入ts的辅助函数（tslib），默认是false
- `downlevelIteration`:  是否对iterator进行降级处理，默认是true
- `sourceRoot和mapRoot`:  给debuggerger指定调试路径，sourceRoot是源码路径，mapRoot是map文件路径
- `inlineSourceMap：` 是否将map文件嵌入到输出文件中
- `emitBOM`:  给文件生成bom头
- `newLine：` 换行符
- `stripInternal：` 标识为internal的jsdoc注释会被移除
- `noEmitHelpers：` 是否不生成辅助函数，默认是false
- `noEmitOnError：` 出错了，是否还要生成文件
- `preserveConstEnums：` 将常量枚举转换成对象
- `declarationDir：` 声明文件输出目录


## Interop and Isolation(互操作和隔离)

- `isolatedModules：` 严格模块导出，默认是false
- `verbatimModuleSyntax：` 可以替代isolatedModules，
- `preserveSymlinks`:  nodejs的符号链接
- `forceConsistentCasingInFileNames：` 是否强制区分文件大小写


## Type Checking(类型检查)

- `strict：` 是否开启严格模式，默认是false
- `noImplicitAny：` 是否校验没有赋予类型的变量，默认启用any
- `strictNullChecks：` 是否严格校验null和undefined，默认是false
- `strictFunctionTypes：` 开启双向协变（让参数进行协变操作）
- `strictBindCallApply：` 保证调用这个函数时，参数的类型与函数定义的类型严格匹配
- `strictPropertyInitialization：` 是否严格校验类的属性是否初始化
- `noImplicitThis：` 是否严格校验this，默认是false
- `useUnknownInCatchVariables：` 是否在catch语句中，将错误类型设置为unknown
- `alwaysStrict：` 是否在文件中添加use strict
- `noUnusedLocals：` 是否校验未使用的局部变量
- `noUnusedParameters：` 是否校验未使用的参数
- `exactOptionalPropertyTypes：` 是否严格校验可选属性的类型
- `noImplicitReturns：` 是否校验函数没有返回值
- `noFallthroughCasesInSwitch：` switch的case缺少break语句
- `noUncheckedIndexedAccess：` 正常通过索引访问对象时，会返回any类型，开启这个选项后，会返回更具体的类型
- `noImplicitOverride：` 是否校验子类没有重写父类的方法（子类重写父类有提示加一个描述Override）
- `noPropertyAccessFromIndexSignature：` 是否允许通过索引签名访问对象属性，开启后，只能通过索引签名访问对象属性[]的形式
- `allowUnusedLabels：` 是否允许未使用的标签比如for循环的loop
- `allowUnreachableCode`:  代码未触达发生异常
  

## Completeness(完整性)
- `skipDefaultLibCheck：` 跳过ts中的内置类型检查
- `skipLibCheck：` 跳过（第三方）库文件的检查

## Projects(项目)
- `incremental`:  是否开启增量编译
- `tsBuildInfoFile：` 增量文件编译的名字
- `disableSourceOfProjectReferenceRedirect：` 符合项目的时候，引用选用的是哪个文件，源文件，还是声明文件
- `disableSolutionSearching：` 引用其他项目时，是否检测引用的项目
- `disableReferencedProjectLoad：` 禁用引用项目的加载
- `composite`:  （被引用的需要增加）是否开启复合项目(tsconfig.base.json,tsconifg.node.json,tsconfig.app.json)可以继承，extends字段
  

## 其他常用
- `references`:  引用其他项目
- `include`:  包含的文件需要打包[**/*]两个\*任意目录，一个\*任意文件（glob语法）
- `exclude`:  排除include中不需要打包的文件
- `lib`:  指定需要包含的库文件[]数组形式