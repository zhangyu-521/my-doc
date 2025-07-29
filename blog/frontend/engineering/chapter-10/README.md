# 第10章：微前端与大型项目架构

## 本章目标

- 掌握Monorepo项目管理策略
- 学会微前端架构设计与实现
- 了解组件库开发与维护
- 掌握大型项目最佳实践

## 10.1 Monorepo项目管理

### 项目结构设计

#### 1. 典型Monorepo结构
```
my-monorepo/
├── apps/                    # 应用程序
│   ├── web-app/            # 主Web应用
│   ├── admin-app/          # 管理后台
│   ├── mobile-app/         # 移动端应用
│   └── docs/               # 文档站点
├── packages/               # 共享包
│   ├── ui-components/      # UI组件库
│   ├── utils/              # 工具函数
│   ├── api-client/         # API客户端
│   ├── types/              # 类型定义
│   └── config/             # 配置包
├── tools/                  # 工具和脚本
│   ├── build-scripts/      # 构建脚本
│   ├── eslint-config/      # ESLint配置
│   └── jest-config/        # Jest配置
├── docs/                   # 项目文档
├── package.json            # 根package.json
├── pnpm-workspace.yaml     # pnpm工作区配置
├── turbo.json              # Turborepo配置
└── nx.json                 # Nx配置（可选）
```

#### 2. pnpm工作区配置
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

```json
// 根目录package.json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo run build --filter=!@repo/docs && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.26.0",
    "turbo": "^1.10.0",
    "typescript": "^5.0.0"
  },
  "packageManager": "pnpm@8.6.0"
}
```

### Turborepo配置

#### 1. 基础Turborepo配置
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

#### 2. 高级构建配置
```json
// turbo.json - 高级配置
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "env": ["NODE_ENV", "API_URL"]
    },
    "build:prod": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "env": ["NODE_ENV", "API_URL", "ANALYTICS_ID"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "remoteCache": {
    "signature": true
  }
}
```

### 依赖管理策略

#### 1. 包间依赖配置
```json
// apps/web-app/package.json
{
  "name": "@repo/web-app",
  "dependencies": {
    "@repo/ui-components": "workspace:*",
    "@repo/utils": "workspace:*",
    "@repo/api-client": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*"
  }
}
```

```json
// packages/ui-components/package.json
{
  "name": "@repo/ui-components",
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*"
  }
}
```

#### 2. 版本管理
```javascript
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@repo/docs"]
}
```

## 10.2 微前端架构设计

### 微前端基础架构

#### 1. Module Federation配置
```javascript
// apps/shell/webpack.config.js - 主应用配置
const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  mode: 'development',
  devServer: {
    port: 3000,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        userApp: 'userApp@http://localhost:3001/remoteEntry.js',
        productApp: 'productApp@http://localhost:3002/remoteEntry.js',
        orderApp: 'orderApp@http://localhost:3003/remoteEntry.js',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
      },
    }),
  ],
};
```

```javascript
// apps/user-app/webpack.config.js - 微应用配置
const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  mode: 'development',
  devServer: {
    port: 3001,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'userApp',
      filename: 'remoteEntry.js',
      exposes: {
        './UserApp': './src/App',
        './UserList': './src/components/UserList',
        './UserProfile': './src/components/UserProfile',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
      },
    }),
  ],
};
```

#### 2. 微前端路由管理
```typescript
// apps/shell/src/App.tsx - 主应用路由
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';

// 动态导入微应用
const UserApp = React.lazy(() => import('userApp/UserApp'));
const ProductApp = React.lazy(() => import('productApp/ProductApp'));
const OrderApp = React.lazy(() => import('orderApp/OrderApp'));

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<div>欢迎来到主应用</div>} />
          
          <Route
            path="/users/*"
            element={
              <ErrorBoundary>
                <Suspense fallback={<div>加载用户模块中...</div>}>
                  <UserApp />
                </Suspense>
              </ErrorBoundary>
            }
          />
          
          <Route
            path="/products/*"
            element={
              <ErrorBoundary>
                <Suspense fallback={<div>加载产品模块中...</div>}>
                  <ProductApp />
                </Suspense>
              </ErrorBoundary>
            }
          />
          
          <Route
            path="/orders/*"
            element={
              <ErrorBoundary>
                <Suspense fallback={<div>加载订单模块中...</div>}>
                  <OrderApp />
                </Suspense>
              </ErrorBoundary>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
```

### 微前端通信机制

#### 1. 事件总线通信
```typescript
// packages/shared/src/eventBus.ts
type EventCallback = (data: any) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();
  
  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
    
    // 返回取消订阅函数
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
  
  off(event: string, callback?: EventCallback) {
    if (!callback) {
      this.events.delete(event);
      return;
    }
    
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

export const eventBus = new EventBus();

// 预定义事件类型
export const EVENTS = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  CART_UPDATE: 'cart:update',
  NOTIFICATION_SHOW: 'notification:show',
} as const;
```

#### 2. 状态共享机制
```typescript
// packages/shared/src/store.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface GlobalState {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  cart: {
    items: Array<{ id: string; quantity: number }>;
    total: number;
  };
  theme: 'light' | 'dark';
}

interface GlobalActions {
  setUser: (user: GlobalState['user']) => void;
  clearUser: () => void;
  addToCart: (item: { id: string; quantity: number }) => void;
  removeFromCart: (id: string) => void;
  setTheme: (theme: GlobalState['theme']) => void;
}

export const useGlobalStore = create<GlobalState & GlobalActions>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    user: {
      id: null,
      name: null,
      email: null,
    },
    cart: {
      items: [],
      total: 0,
    },
    theme: 'light',
    
    // 操作方法
    setUser: (user) => set({ user }),
    clearUser: () => set({ 
      user: { id: null, name: null, email: null } 
    }),
    
    addToCart: (item) => set((state) => {
      const existingItem = state.cart.items.find(i => i.id === item.id);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        state.cart.items.push(item);
      }
      return { cart: { ...state.cart } };
    }),
    
    removeFromCart: (id) => set((state) => ({
      cart: {
        ...state.cart,
        items: state.cart.items.filter(item => item.id !== id)
      }
    })),
    
    setTheme: (theme) => set({ theme }),
  }))
);

// 订阅状态变化
useGlobalStore.subscribe(
  (state) => state.user,
  (user) => {
    // 用户状态变化时的副作用
    if (user.id) {
      console.log('用户已登录:', user);
    } else {
      console.log('用户已登出');
    }
  }
);
```

## 10.3 组件库开发与维护

### 组件库架构

#### 1. 组件库项目结构
```
packages/ui-components/
├── src/
│   ├── components/         # 组件源码
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   └── index.ts
│   ├── hooks/             # 自定义Hook
│   ├── utils/             # 工具函数
│   ├── types/             # 类型定义
│   └── index.ts           # 主入口
├── dist/                  # 构建输出
├── docs/                  # 组件文档
├── .storybook/            # Storybook配置
├── package.json
├── tsconfig.json
├── rollup.config.js       # 构建配置
└── README.md
```

#### 2. 组件开发规范
```typescript
// src/components/Button/Button.tsx
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否为加载状态 */
  loading?: boolean;
  /** 加载状态文本 */
  loadingText?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 图标位置 */
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    disabled,
    ...props
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variantClasses = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    };
    
    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 px-4 py-2',
      lg: 'h-11 px-8 text-lg',
    };
    
    const isDisabled = disabled || loading;
    
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2">{icon}</span>
        )}
        
        {loading ? loadingText || children : children}
        
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### 组件文档与测试

#### 1. Storybook配置
```typescript
// src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '通用按钮组件，支持多种变体和状态。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
    loadingText: 'Loading...',
  },
};

export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    icon: '🚀',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};
```

#### 2. 组件测试
```typescript
// src/components/Button/Button.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
  });
  
  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
    
    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state', () => {
    render(<Button loading loadingText="Loading...">Submit</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  it('renders with icon', () => {
    render(<Button icon="🚀">With Icon</Button>);
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });
});
```

### 组件库构建与发布

#### 1. Rollup构建配置
```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.ts',
  
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
    }),
    postcss({
      extract: true,
      minimize: true,
    }),
    terser(),
  ],
  
  external: ['react', 'react-dom'],
};
```

#### 2. 自动化发布流程
```yaml
# .github/workflows/release-ui.yml
name: Release UI Components

on:
  push:
    paths:
      - 'packages/ui-components/**'
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build components
        run: pnpm --filter @repo/ui-components build
        
      - name: Run tests
        run: pnpm --filter @repo/ui-components test
        
      - name: Build Storybook
        run: pnpm --filter @repo/ui-components build-storybook
        
      - name: Deploy Storybook
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./packages/ui-components/storybook-static
          
      - name: Release
        run: pnpm changeset publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 本章小结

本章我们学习了：

1. **Monorepo管理**：项目结构设计、Turborepo配置和依赖管理
2. **微前端架构**：Module Federation配置、路由管理和通信机制
3. **组件库开发**：组件规范、文档测试和构建发布
4. **大型项目实践**：架构设计、工程化配置和团队协作

## 练习题

1. 搭建一个完整的Monorepo项目，包含多个应用和共享包
2. 实现一个微前端架构，支持独立开发和部署
3. 开发一个组件库，包含完整的文档和测试
4. 配置自动化的构建、测试和发布流程

## 教程总结

通过本教程的学习，您已经掌握了现代前端工程化的完整体系：

### 🎯 核心技能
- **工程化思维**：理解前端工程化的价值和必要性
- **工具链掌握**：熟练使用现代构建工具和开发工具
- **质量保障**：建立完整的代码质量和测试体系
- **性能优化**：掌握构建和运行时性能优化技巧
- **自动化流程**：实现CI/CD和自动化部署

### 🚀 实践能力
- 能够搭建现代化的前端开发环境
- 能够设计和实现可扩展的项目架构
- 能够建立完整的开发工作流和质量保障体系
- 能够优化项目性能和开发体验
- 能够管理大型项目和团队协作

### 📈 持续学习
前端技术发展迅速，建议您：
- 关注新技术和工具的发展趋势
- 参与开源项目和技术社区
- 在实际项目中应用所学知识
- 分享经验和最佳实践

**恭喜您完成了前端工程化的学习之旅！** 🎉

---

[上一章：CI/CD与自动化部署](../chapter-09/README.md) | [返回目录](../README.md)
