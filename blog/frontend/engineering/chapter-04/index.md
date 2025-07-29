# 第4章：代码质量保障

## 本章目标

- 掌握ESLint代码检查配置与规则
- 学会使用Prettier进行代码格式化
- 了解TypeScript类型检查最佳实践
- 配置Husky Git钩子自动化质量检查

## 4.1 ESLint代码检查

### ESLint基础配置

#### 1. 安装和初始化
```bash
# 安装ESLint
npm install --save-dev eslint

# 初始化配置
npx eslint --init

# 或手动安装相关包
npm install --save-dev \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-import
```

#### 2. 配置文件详解
```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  
  parser: '@typescript-eslint/parser',
  
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'import'
  ],
  
  rules: {
    // 基础规则
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    
    // React规则
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // TypeScript规则
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // 导入规则
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ]
  },
  
  settings: {
    react: {
      version: 'detect'
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    }
  },
  
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '*.config.js'
  ]
};
```

### 自定义规则配置

#### 1. 项目特定规则
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // 命名规范
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I']
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase']
      },
      {
        selector: 'enum',
        format: ['PascalCase']
      }
    ],
    
    // 复杂度控制
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines': ['error', 300],
    'max-params': ['error', 4],
    
    // 代码风格
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error'
  }
};
```

#### 2. 环境特定配置
```javascript
// .eslintrc.js
module.exports = {
  overrides: [
    // 测试文件特殊规则
    {
      files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines': 'off'
      }
    },
    
    // 配置文件特殊规则
    {
      files: ['*.config.{js,ts}', 'scripts/**/*'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};
```

## 4.2 Prettier代码格式化

### Prettier配置

#### 1. 安装和基础配置
```bash
# 安装Prettier
npm install --save-dev prettier

# 安装ESLint集成
npm install --save-dev eslint-config-prettier eslint-plugin-prettier
```

```javascript
// .prettierrc.js
module.exports = {
  // 基础格式化选项
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // JSX选项
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // 其他选项
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  
  // 文件特定配置
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200
      }
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always'
      }
    }
  ]
};
```

#### 2. 忽略文件配置
```bash
# .prettierignore
dist
build
coverage
node_modules
*.min.js
*.bundle.js
package-lock.json
yarn.lock
pnpm-lock.yaml
```

### ESLint与Prettier集成

#### 1. 配置集成
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'prettier', // 必须放在最后
    'plugin:prettier/recommended' // 必须放在最后
  ],
  
  plugins: [
    'prettier'
  ],
  
  rules: {
    'prettier/prettier': 'error'
  }
};
```

#### 2. VS Code集成
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 4.3 TypeScript类型检查

### TypeScript配置优化

#### 1. 严格模式配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    
    // 严格检查选项
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    
    // 路径映射
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  
  "exclude": [
    "node_modules",
    "dist",
    "build"
  ]
}
```

#### 2. 类型定义最佳实践
```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface ListResponse<T> {
  list: T[];
  pagination: PaginationParams;
}

// 工具类型
export type UserCreateInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UserUpdateInput = Partial<UserCreateInput>;
export type UserListItem = Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
```

### 类型检查工具

#### 1. 类型覆盖率检查
```bash
# 安装type-coverage
npm install --save-dev type-coverage

# 检查类型覆盖率
npx type-coverage --detail
```

```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-coverage": "type-coverage --detail --at-least 95"
  }
}
```

#### 2. 类型导入优化
```typescript
// 推荐：使用type-only导入
import type { User, ApiResponse } from '@/types/api';
import type { FC, ReactNode } from 'react';

// 混合导入
import React, { type FC, type ReactNode } from 'react';
import { getUserList, type User } from '@/api/user';
```

## 4.4 Husky Git钩子管理

### Husky配置

#### 1. 安装和初始化
```bash
# 安装husky
npm install --save-dev husky

# 初始化husky
npx husky install

# 添加到package.json
npm pkg set scripts.prepare="husky install"
```

#### 2. 配置Git钩子
```bash
# pre-commit钩子
npx husky add .husky/pre-commit "npm run lint-staged"

# commit-msg钩子
npx husky add .husky/commit-msg "npx commitlint --edit $1"

# pre-push钩子
npx husky add .husky/pre-push "npm run test && npm run type-check"
```

### lint-staged配置

#### 1. 安装和配置
```bash
# 安装lint-staged
npm install --save-dev lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{json,css,scss,md}": [
      "prettier --write",
      "git add"
    ],
    "*.{ts,tsx}": [
      "bash -c 'npm run type-check'"
    ]
  }
}
```

#### 2. 高级配置
```javascript
// lint-staged.config.js
module.exports = {
  // JavaScript/TypeScript文件
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    () => 'tsc --noEmit' // 类型检查
  ],
  
  // 样式文件
  '*.{css,scss,less}': [
    'stylelint --fix',
    'prettier --write'
  ],
  
  // 测试文件
  '*.test.{js,jsx,ts,tsx}': [
    'jest --bail --findRelatedTests'
  ],
  
  // 文档文件
  '*.md': [
    'markdownlint --fix',
    'prettier --write'
  ]
};
```

### Commitlint配置

#### 1. 安装和配置
```bash
# 安装commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复bug
        'docs',     // 文档更新
        'style',    // 代码格式化
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试
        'chore',    // 构建过程或辅助工具的变动
        'ci',       // CI配置
        'build'     // 构建系统
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72]
  }
};
```

#### 2. 提交信息模板
```bash
# .gitmessage
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# 示例:
# feat(auth): add login functionality
#
# - Add login form component
# - Implement JWT authentication
# - Add user session management
#
# Closes #123
```

## 4.5 质量门禁配置

### 完整的质量检查流程

#### 1. package.json脚本
```json
{
  "scripts": {
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "quality-check": "npm run lint && npm run type-check && npm run test",
    "pre-commit": "lint-staged",
    "prepare": "husky install"
  }
}
```

#### 2. CI/CD集成
```yaml
# .github/workflows/quality-check.yml
name: Quality Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint check
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 本章小结

本章我们学习了：

1. **ESLint配置**：代码检查规则和自定义配置
2. **Prettier格式化**：代码风格统一和编辑器集成
3. **TypeScript检查**：严格模式配置和类型定义最佳实践
4. **Git钩子管理**：Husky、lint-staged和commitlint配置
5. **质量门禁**：完整的代码质量保障流程

## 练习题

1. 配置一套完整的ESLint规则，适用于React+TypeScript项目
2. 设置Prettier和ESLint的集成配置
3. 配置Husky Git钩子，实现自动化质量检查
4. 创建一个质量检查的CI/CD流程

## 下一章预告

下一章我们将学习自动化测试体系，包括单元测试、集成测试和E2E测试的配置与实践。

---

[上一章：模块化与构建工具](../chapter-03/README.md) | [返回目录](../README.md) | [下一章：自动化测试体系](../chapter-05/README.md)
