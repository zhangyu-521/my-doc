# AST 语法树
## 1. 什么是AST
`AST`是抽象语法树`（Abstract Syntax Tree）`的缩写，它是源代码的抽象语法结构的树状表现形式。`AST`可以用于代码的静态分析，代码转换，代码优化，代码高亮等场景。

::: tip
[AST在线转换网站](https://astexplorer.net/)
:::

## 2. AST的结构
`AST` 的数据结构通常是一个`嵌套的对象结构`，每个节点包含以下信息：
- **类型（type）**: 表示节点的种类，例如 `VariableDeclaration`（变量声明）、`FunctionDeclaration`（函数声明）、`CallExpression`（函数调用）等。
- **子节点（children 或其他属性）**: 表示当前节点的子节点，通常是一个数组或嵌套的对象结构。
- **其他属性**: 根据节点类型，可能还会包含其他属性，例如变量名、函数名、操作符等。
假设有一下简单代码：
```js
const x = 10;
console.log(x);
```
对应的ast可能如下：
``` json
{
  "type": "Program",
  "body": [
    {
      "type": "VariableDeclaration",
      "declarations": [
        {
          "type": "VariableDeclarator",
          "id": {
            "type": "Identifier",
            "name": "x"
          },
          "init": {
            "type": "Literal",
            "value": 10
          }
        }
      ],
      "kind": "const"
    },
    {
      "type": "ExpressionStatement",
      "expression": {
        "type": "CallExpression",
        "callee": {
          "type": "MemberExpression",
          "object": {
            "type": "Identifier",
            "name": "console"
          },
          "property": {
            "type": "Identifier",
            "name": "log"
          }
        },
        "arguments": [
          {
            "type": "Identifier",
            "name": "x"
          }
        ]
      }
    }
  ]
}
````


## 3. 如何生成AST
生成 `AST` 的过程通常称为 解析`（Parsing）`。解析器会根据语言的语法规则将源代码转换为 `AST`。不同的语言有不同的解析器，例如：
- **javascript**: 可以使用 `@babel/parser` 或 `Esprima` 等解析器。
- **typescript**: 可以使用 `typescript` 自带的 `typescript` 解析器。
- **html**: 可以使用 `htmlparser2` 等解析器。
- **css**: 可以使用 `cssom` 等解析器。
使用 `@babel/parser` 解析器生成 `AST` 的示例代码如下：

``` js
import { parse } from '@babel/parser';

const code = `
  const x = 10;
  console.log(x);
`;

const ast = parse(code, {
  sourceType: 'module', // ES 模块
  plugins: ['jsx'] // 支持 JSX
});

console.log(JSON.stringify(ast, null, 2));
```


## 4. 如何操作AST
操作 `AST` 的过程通常称为 遍历（`Traversing`） 和 转换（`Transforming`）。以下是一些常见的操作方式：

### 4.1 遍历AST
``` js
import traverse from '@babel/traverse';

const ast = /* 生成的 AST */;

traverse(ast, {
  enter(path) {
    console.log(`Visiting node of type ${path.node.type}`);
  }
});
```

### 4.2 修改 AST
移除所有 console.log 调用
```js
import traverse from '@babel/traverse';
import * as t from '@babel/types';

traverse(ast, {
  CallExpression(path) {
    const callee = path.get('callee');
    if (
      callee.isMemberExpression() &&
      callee.get('object').isIdentifier({ name: 'console' }) &&
      callee.get('property').isIdentifier({ name: 'log' })
    ) {
      path.remove(); // 移除 console.log 调用
    }
  }
});
```

### 4.3 生成新的 AST
```js
import { generate } from '@babel/generator';

const modifiedCode = generate(ast).code;
console.log(modifiedCode);
```


## 5 AST 的数据结构（详细）
`AST` 的数据结构是由节点组成的树形结构。每个节点都有一个 `type` 属性，表示节点的种类。以下是一些常见的节点类型及其结构：

- Program: 表示整个程序，是 AST 的根节点。
- VariableDeclaration: 表示变量声明，包含一个 `declarations` 属性，表示声明的变量列表。
- FunctionDeclaration: 表示函数声明，包含一个 `id` 属性，表示函数名，以及一个 `params` 属性，表示函数参数列表，以及一个 `body` 属性，表示函数体。
- CallExpression: 表示函数调用，包含一个 `callee` 属性，表示被调用的函数，以及一个 `arguments` 属性，表示传递给函数的参数列表。
- MemberExpression: 表示成员表达式，包含一个 `object` 属性，表示对象，以及一个 `property` 属性，表示成员名。（如 obj.prop 或 obj['prop']）
- Literal: 表示字面量，包含一个 `value` 属性，表示字面量的值。（如字符串、数字、布尔值等）
- Identifier: 表示标识符，包含一个 `name` 属性，表示标识符的名称 (如变量名、函数名等)。


``` json
{
  "type": "Program",
  "body": [ /* 子节点数组，包含模块的所有语句 */ ]
}


{
  "type": "VariableDeclaration",
  "declarations": [
    {
      "type": "VariableDeclarator",
      "id": { "type": "Identifier", "name": "x" },
      "init": { "type": "Literal", "value": 10 }
    }
  ],
  "kind": "const"
}

{
  "type": "FunctionDeclaration",
  "id": { "type": "Identifier", "name": "myFunction" },
  "params": [ /* 函数参数 */ ],
  "body": { /* 函数体 */ }
}

{
  "type": "CallExpression",
  "callee": { /* 被调用的函数 */ },
  "arguments": [ /* 函数的参数 */ ]
}

{
  "type": "MemberExpression",
  "object": { "type": "Identifier", "name": "obj" },
  "property": { "type": "Identifier", "name": "prop" }
}

{
  "type": "Literal",
  "value": 10
}

{
  "type": "Identifier",
  "name": "x"
}

```


## 6. AST的应用\
- **代码分析工具**：如 ESLint 使用 AST 来检查代码风格和潜在问题。
- **代码转换工具**：如 Babel 使用 AST 来将 ES6+ 代码转换为 ES5 代码。
- **构建工具**：如 Vite 和 Webpack 使用 AST 来优化和打包代码。
- **代码编辑器**：如 VSCode 使用 AST 来提供智能提示、代码格式化等功能。