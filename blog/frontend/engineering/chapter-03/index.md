# 第3章：模块化与构建工具

## 本章目标

- 深入理解ES Modules与CommonJS的区别
- 掌握Webpack的核心概念和配置
- 学会使用Vite进行现代化开发
- 了解Rollup在库打包中的应用

## 3.1 JavaScript模块化演进

### 模块化发展历程

#### 1. 无模块化时代
```html
<!-- 全局变量污染 -->
<script src="jquery.js"></script>
<script src="utils.js"></script>
<script src="app.js"></script>

<script>
// 全局变量冲突
var name = 'App';
var utils = {
  getName: function() {
    return name; // 可能被其他脚本覆盖
  }
};
</script>
```

#### 2. IIFE模块模式
```javascript
// 立即执行函数表达式
var MyModule = (function() {
  var privateVar = 'private';
  
  return {
    publicMethod: function() {
      return privateVar;
    }
  };
})();
```

#### 3. CommonJS (Node.js)
```javascript
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = {
  add,
  subtract
};

// app.js
const { add, subtract } = require('./math');
console.log(add(2, 3)); // 5
```

#### 4. AMD (RequireJS)
```javascript
// 异步模块定义
define(['jquery', 'lodash'], function($, _) {
  return {
    init: function() {
      // 模块初始化
    }
  };
});
```

#### 5. ES Modules (现代标准)
```javascript
// math.js
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export default function multiply(a, b) {
  return a * b;
}

// app.js
import multiply, { add, subtract } from './math.js';
console.log(add(2, 3)); // 5
```

### ES Modules vs CommonJS

#### 核心差异对比

| 特性 | ES Modules | CommonJS |
|------|------------|----------|
| 加载时机 | 编译时 | 运行时 |
| 加载方式 | 静态分析 | 动态加载 |
| 循环依赖 | 更好支持 | 可能有问题 |
| Tree Shaking | 支持 | 不支持 |
| 顶层await | 支持 | 不支持 |

#### 1. 静态 vs 动态
```javascript
// ES Modules - 静态导入
import { utils } from './utils.js'; // 编译时确定

// CommonJS - 动态导入
const moduleName = './utils';
const utils = require(moduleName); // 运行时确定
```

#### 2. Tree Shaking支持
```javascript
// utils.js
export function usedFunction() {
  return 'used';
}

export function unusedFunction() {
  return 'unused'; // 会被Tree Shaking移除
}

// app.js
import { usedFunction } from './utils.js';
```

#### 3. 循环依赖处理
```javascript
// ES Modules - 更好的循环依赖支持
// a.js
import { b } from './b.js';
export const a = 'a';

// b.js
import { a } from './a.js';
export const b = 'b';
```

## 3.2 Webpack深度解析

### 核心概念

#### 1. Entry（入口）
```javascript
// webpack.config.js
module.exports = {
  // 单入口
  entry: './src/index.js',
  
  // 多入口
  entry: {
    app: './src/app.js',
    admin: './src/admin.js'
  },
  
  // 动态入口
  entry: () => {
    return {
      app: './src/app.js',
      admin: './src/admin.js'
    };
  }
};
```

#### 2. Output（输出）
```javascript
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    publicPath: '/assets/',
    clean: true // 清理输出目录
  }
};
```

#### 3. Loaders（加载器）
```javascript
module.exports = {
  module: {
    rules: [
      // JavaScript/TypeScript
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      
      // CSS
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      
      // Sass/SCSS
      {
        test: /\.(sass|scss)$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
      
      // 图片资源
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      },
      
      // 字体文件
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      }
    ]
  }
};
```

#### 4. Plugins（插件）
```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  plugins: [
    // 清理输出目录
    new CleanWebpackPlugin(),
    
    // 生成HTML文件
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true
      }
    }),
    
    // 提取CSS
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css'
    })
  ]
};
```

### 高级配置

#### 1. 代码分割
```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 第三方库
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        
        // 公共代码
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

#### 2. 开发服务器配置
```javascript
module.exports = {
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  }
};
```

#### 3. 性能优化配置
```javascript
module.exports = {
  optimization: {
    // 压缩
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true
          }
        }
      }),
      new CssMinimizerPlugin()
    ],
    
    // 运行时代码分离
    runtimeChunk: 'single',
    
    // 模块ID生成策略
    moduleIds: 'deterministic',
    chunkIds: 'deterministic'
  }
};
```

## 3.3 Vite现代化构建

### Vite核心特性

#### 1. 极速冷启动
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]'
      }
    }
  }
})
```

#### 2. 插件生态
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    
    // 自动导入
    AutoImport({
      imports: ['react', 'react-router-dom'],
      dts: true
    }),
    
    // 组件自动导入
    Components({
      dts: true,
      resolvers: [AntdResolver()]
    }),
    
    // PWA支持
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  }
})
```

#### 3. 环境变量配置
```javascript
// .env.development
VITE_API_URL=http://localhost:8080
VITE_APP_TITLE=Development App

// .env.production
VITE_API_URL=https://api.production.com
VITE_APP_TITLE=Production App

// 使用环境变量
const apiUrl = import.meta.env.VITE_API_URL;
const appTitle = import.meta.env.VITE_APP_TITLE;
```

### Vite vs Webpack对比

#### 开发体验对比
```bash
# 冷启动时间
Webpack: 30-60秒
Vite: 1-3秒

# 热更新时间
Webpack: 1-5秒
Vite: <100ms

# 构建时间
Webpack: 2-10分钟
Vite: 30秒-2分钟
```

#### 适用场景
```javascript
// Webpack适用场景
- 大型复杂项目
- 需要复杂的构建配置
- 对构建产物有特殊要求
- 需要兼容老旧浏览器

// Vite适用场景
- 现代前端项目
- 快速原型开发
- 中小型项目
- 追求开发体验
```

## 3.4 Rollup库打包

### Rollup配置

#### 1. 基础配置
```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.ts',
  
  output: [
    // UMD格式
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'MyLibrary',
      globals: {
        'react': 'React',
        'react-dom': 'ReactDOM'
      }
    },
    
    // ES模块格式
    {
      file: 'dist/index.esm.js',
      format: 'es'
    },
    
    // CommonJS格式
    {
      file: 'dist/index.cjs.js',
      format: 'cjs'
    }
  ],
  
  external: ['react', 'react-dom'],
  
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json'
    }),
    terser()
  ]
};
```

#### 2. 多入口配置
```javascript
export default [
  // 主包
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es'
    },
    plugins: [typescript()]
  },
  
  // 工具包
  {
    input: 'src/utils/index.ts',
    output: {
      file: 'dist/utils.js',
      format: 'es'
    },
    plugins: [typescript()]
  }
];
```

### 库开发最佳实践

#### 1. package.json配置
```json
{
  "name": "my-ui-library",
  "version": "1.0.0",
  "main": "dist/index.cjs.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils.esm.js",
      "require": "./dist/utils.cjs.js",
      "types": "./dist/utils.d.ts"
    }
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  }
}
```

#### 2. TypeScript声明文件
```typescript
// src/index.ts
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export declare const Button: React.FC<ButtonProps>;

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export declare const Input: React.FC<InputProps>;
```

## 3.5 构建优化策略

### Bundle分析

#### 1. Webpack Bundle Analyzer
```bash
# 安装分析工具
npm install --save-dev webpack-bundle-analyzer

# 生成分析报告
npx webpack-bundle-analyzer dist/static/js/*.js
```

#### 2. Vite Bundle分析
```bash
# 构建时生成分析报告
npm run build -- --report

# 或使用rollup-plugin-visualizer
npm install --save-dev rollup-plugin-visualizer
```

### 性能优化技巧

#### 1. 代码分割策略
```javascript
// 路由级别分割
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

// 组件级别分割
const HeavyComponent = lazy(() => import('./components/HeavyComponent'));

// 第三方库分割
import(/* webpackChunkName: "lodash" */ 'lodash').then((_) => {
  // 使用lodash
});
```

#### 2. Tree Shaking优化
```javascript
// 正确的导入方式
import { debounce } from 'lodash-es';

// 避免的导入方式
import _ from 'lodash'; // 会导入整个库
```

## 本章小结

本章我们深入学习了：

1. **模块化演进**：从无模块化到ES Modules的发展历程
2. **Webpack配置**：核心概念、高级配置和性能优化
3. **Vite构建**：现代化开发体验和配置方法
4. **Rollup打包**：库开发的最佳选择和配置技巧
5. **构建优化**：Bundle分析和性能优化策略

## 练习题

1. 配置一个完整的Webpack项目，支持React和TypeScript
2. 使用Vite创建一个现代化的Vue项目
3. 用Rollup打包一个可复用的组件库
4. 分析并优化一个现有项目的Bundle大小

## 下一章预告

下一章我们将学习代码质量保障，包括ESLint、Prettier、TypeScript和Git钩子的配置与使用。

---

[上一章：包管理与依赖管理](../chapter-02/) | [返回目录](../) | [下一章：代码质量保障](../chapter-04/)
