# 第7章：TypeScript高级特性

## 📖 本章概述

TypeScript作为JavaScript的超集，提供了强大的类型系统。本章将深入探讨TypeScript的高级特性，包括泛型编程、条件类型、映射类型、模板字面量类型等，帮助你构建类型安全且灵活的应用。

## 🎯 学习目标

完成本章学习后，你将能够：

- 掌握泛型的高级用法和约束技巧
- 理解和应用条件类型进行类型推断
- 熟练使用映射类型进行类型转换
- 运用模板字面量类型构建复杂类型
- 编写高质量的类型声明文件

## 🔧 泛型编程深入

### 泛型基础与约束

```typescript
// 基础泛型函数
function identity<T>(arg: T): T {
    return arg;
}

// 泛型约束
interface Lengthwise {
    length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
    console.log(arg.length);
    return arg;
}

// 使用示例
loggingIdentity("hello");        // ✅ 字符串有length属性
loggingIdentity([1, 2, 3]);      // ✅ 数组有length属性
// loggingIdentity(123);         // ❌ 数字没有length属性

// 多重泛型约束
interface Serializable {
    serialize(): string;
}

interface Timestamped {
    timestamp: number;
}

function processData<T extends Serializable & Timestamped>(data: T): string {
    return `${data.timestamp}: ${data.serialize()}`;
}

// 条件约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const person = { name: "John", age: 30, city: "New York" };
const name = getProperty(person, "name");     // string
const age = getProperty(person, "age");       // number
// const invalid = getProperty(person, "invalid"); // ❌ 编译错误
```

### 高级泛型模式

```typescript
// 泛型工厂模式
interface Constructor<T = {}> {
    new (...args: any[]): T;
}

function Timestamped<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        timestamp = Date.now();
        
        getTimestamp() {
            return this.timestamp;
        }
    };
}

function Serializable<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        serialize() {
            return JSON.stringify(this);
        }
    };
}

// 使用混入
class User {
    constructor(public name: string) {}
}

const TimestampedUser = Timestamped(User);
const SerializableUser = Serializable(User);
const EnhancedUser = Serializable(Timestamped(User));

const user = new EnhancedUser("John");
console.log(user.getTimestamp());
console.log(user.serialize());

// 泛型单例模式
class Singleton<T> {
    private static instances: Map<any, any> = new Map();
    
    static getInstance<T>(this: new () => T): T {
        if (!Singleton.instances.has(this)) {
            Singleton.instances.set(this, new this());
        }
        return Singleton.instances.get(this);
    }
}

class DatabaseConnection extends Singleton<DatabaseConnection> {
    private constructor() {
        super();
    }
    
    connect() {
        console.log("Connected to database");
    }
}

const db1 = DatabaseConnection.getInstance();
const db2 = DatabaseConnection.getInstance();
console.log(db1 === db2); // true

// 泛型建造者模式
class QueryBuilder<T> {
    private conditions: string[] = [];
    private selectFields: string[] = [];
    private orderByField?: string;
    private limitValue?: number;
    
    select(...fields: (keyof T)[]): this {
        this.selectFields = fields as string[];
        return this;
    }
    
    where(field: keyof T, operator: string, value: any): this {
        this.conditions.push(`${String(field)} ${operator} ${JSON.stringify(value)}`);
        return this;
    }
    
    orderBy(field: keyof T, direction: 'ASC' | 'DESC' = 'ASC'): this {
        this.orderByField = `${String(field)} ${direction}`;
        return this;
    }
    
    limit(count: number): this {
        this.limitValue = count;
        return this;
    }
    
    build(): string {
        let query = `SELECT ${this.selectFields.join(', ')} FROM table`;
        
        if (this.conditions.length > 0) {
            query += ` WHERE ${this.conditions.join(' AND ')}`;
        }
        
        if (this.orderByField) {
            query += ` ORDER BY ${this.orderByField}`;
        }
        
        if (this.limitValue) {
            query += ` LIMIT ${this.limitValue}`;
        }
        
        return query;
    }
}

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

const query = new QueryBuilder<User>()
    .select('name', 'email')
    .where('age', '>', 18)
    .where('name', 'LIKE', '%john%')
    .orderBy('name', 'ASC')
    .limit(10)
    .build();

console.log(query);
// SELECT name, email FROM table WHERE age > 18 AND name LIKE "%john%" ORDER BY name ASC LIMIT 10
```

### 泛型工具类型

```typescript
// 自定义工具类型
type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type NonNullable<T> = T extends null | undefined ? never : T;

type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;

type ParametersOf<T> = T extends (...args: infer P) => any ? P : never;

// 使用示例
interface Config {
    database: {
        host: string;
        port: number;
        credentials: {
            username: string;
            password: string;
        };
    };
    cache: {
        enabled: boolean;
        ttl: number;
    };
}

type ReadonlyConfig = DeepReadonly<Config>;
type PartialConfig = DeepPartial<Config>;

// 函数类型工具
function fetchUser(id: number, includeProfile: boolean): Promise<User> {
    return Promise.resolve({ id, name: "John", email: "john@example.com", age: 30 });
}

type FetchUserReturn = ReturnTypeOf<typeof fetchUser>; // Promise<User>
type FetchUserParams = ParametersOf<typeof fetchUser>; // [number, boolean]

// 高级类型操作
type KeysOfType<T, U> = {
    [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

type StringKeys<T> = KeysOfType<T, string>;
type NumberKeys<T> = KeysOfType<T, number>;

type UserStringKeys = StringKeys<User>; // "name" | "email"
type UserNumberKeys = NumberKeys<User>; // "id" | "age"

// 递归类型
type JSONValue = 
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };

type Flatten<T> = T extends (infer U)[] ? U : T;
type FlatArray = Flatten<string[]>; // string
type FlatValue = Flatten<number>;   // number
```

## 🔀 条件类型深入

### 条件类型基础

```typescript
// 基础条件类型
type IsString<T> = T extends string ? true : false;

type Test1 = IsString<string>;  // true
type Test2 = IsString<number>;  // false

// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never;
type StringOrNumberArray = ToArray<string | number>; // string[] | number[]

// 排除类型
type Exclude<T, U> = T extends U ? never : T;
type WithoutString = Exclude<string | number | boolean, string>; // number | boolean

// 提取类型
type Extract<T, U> = T extends U ? T : never;
type OnlyString = Extract<string | number | boolean, string>; // string

// 条件类型中的infer
type GetArrayElementType<T> = T extends (infer U)[] ? U : never;
type ElementType = GetArrayElementType<string[]>; // string

type GetPromiseType<T> = T extends Promise<infer U> ? U : never;
type PromiseValue = GetPromiseType<Promise<number>>; // number

type GetFunctionReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type FuncReturn = GetFunctionReturnType<() => string>; // string
```

### 高级条件类型应用

```typescript
// 深度条件类型
type DeepNonNullable<T> = T extends null | undefined 
    ? never 
    : T extends object 
        ? { [K in keyof T]: DeepNonNullable<T[K]> }
        : T;

interface UserWithNulls {
    id: number | null;
    name: string | undefined;
    profile: {
        bio: string | null;
        avatar: string | undefined;
    } | null;
}

type CleanUser = DeepNonNullable<UserWithNulls>;
// {
//     id: number;
//     name: string;
//     profile: {
//         bio: string;
//         avatar: string;
//     };
// }

// 函数重载类型推断
type OverloadedFunction = {
    (x: string): string;
    (x: number): number;
    (x: boolean): boolean;
};

type InferOverload<T> = T extends {
    (x: infer U): infer R;
    (x: any): any;
} ? (x: U) => R : never;

type FirstOverload = InferOverload<OverloadedFunction>; // (x: string) => string

// 递归条件类型
type Reverse<T extends readonly any[]> = T extends readonly [...infer Rest, infer Last]
    ? [Last, ...Reverse<Rest>]
    : [];

type ReversedArray = Reverse<[1, 2, 3, 4]>; // [4, 3, 2, 1]

// 字符串操作条件类型
type StartsWith<T extends string, U extends string> = T extends `${U}${any}` ? true : false;
type EndsWidth<T extends string, U extends string> = T extends `${any}${U}` ? true : false;

type StartsWithHello = StartsWith<"hello world", "hello">; // true
type EndsWithWorld = EndsWidth<"hello world", "world">;    // true

// 类型级别的数学运算
type Length<T extends readonly any[]> = T['length'];
type ArrayLength = Length<[1, 2, 3, 4, 5]>; // 5

type Add<A extends number, B extends number> = 
    [...Array<A>, ...Array<B>]['length'] extends number ? 
    [...Array<A>, ...Array<B>]['length'] : never;

// 注意：这种方法只适用于小数字，因为TypeScript有递归限制
```

### 条件类型实用工具

```typescript
// API响应类型推断
type APIResponse<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};

type ExtractAPIData<T> = T extends { success: true; data: infer D } ? D : never;
type ExtractAPIError<T> = T extends { success: false; error: infer E } ? E : never;

type UserResponse = APIResponse<User>;
type UserData = ExtractAPIData<UserResponse>; // User
type UserError = ExtractAPIError<UserResponse>; // string

// 状态机类型
type State = 'idle' | 'loading' | 'success' | 'error';

type StateTransitions = {
    idle: 'loading';
    loading: 'success' | 'error';
    success: 'idle' | 'loading';
    error: 'idle' | 'loading';
};

type CanTransitionTo<From extends State, To extends State> = 
    To extends StateTransitions[From] ? true : false;

type CanGoFromIdleToLoading = CanTransitionTo<'idle', 'loading'>; // true
type CanGoFromIdleToSuccess = CanTransitionTo<'idle', 'success'>; // false

// 表单验证类型
type ValidationRule<T> = {
    required?: boolean;
    minLength?: T extends string ? number : never;
    maxLength?: T extends string ? number : never;
    min?: T extends number ? number : never;
    max?: T extends number ? number : never;
    pattern?: T extends string ? RegExp : never;
};

type FormSchema<T> = {
    [K in keyof T]: ValidationRule<T[K]>;
};

interface LoginForm {
    username: string;
    password: string;
    age: number;
}

type LoginFormSchema = FormSchema<LoginForm>;
// {
//     username: {
//         required?: boolean;
//         minLength?: number;
//         maxLength?: number;
//         pattern?: RegExp;
//     };
//     password: {
//         required?: boolean;
//         minLength?: number;
//         maxLength?: number;
//         pattern?: RegExp;
//     };
//     age: {
//         required?: boolean;
//         min?: number;
//         max?: number;
//     };
// }
```

## 🗺️ 映射类型深入

### 基础映射类型

```typescript
// 基础映射类型语法
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

type Partial<T> = {
    [P in keyof T]?: T[P];
};

type Required<T> = {
    [P in keyof T]-?: T[P];
};

// 键名映射
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type Setters<T> = {
    [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

interface Person {
    name: string;
    age: number;
    email: string;
}

type PersonGetters = Getters<Person>;
// {
//     getName: () => string;
//     getAge: () => number;
//     getEmail: () => string;
// }

type PersonSetters = Setters<Person>;
// {
//     setName: (value: string) => void;
//     setAge: (value: number) => void;
//     setEmail: (value: string) => void;
// }

// 条件映射
type NonFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

class Example {
    name: string = "";
    age: number = 0;
    getName() { return this.name; }
    setAge(age: number) { this.age = age; }
}

type ExampleData = NonFunctionProperties<Example>; // { name: string; age: number; }
```

### 高级映射类型

```typescript
// 深度映射
type DeepMutable<T> = {
    -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// 类型转换映射
type Stringify<T> = {
    [K in keyof T]: string;
};

type Numberify<T> = {
    [K in keyof T]: number;
};

type StringifiedPerson = Stringify<Person>;
// {
//     name: string;
//     age: string;
//     email: string;
// }

// 选择性映射
type PickByType<T, U> = {
    [K in keyof T as T[K] extends U ? K : never]: T[K];
};

type OmitByType<T, U> = {
    [K in keyof T as T[K] extends U ? never : K]: T[K];
};

interface MixedTypes {
    id: number;
    name: string;
    isActive: boolean;
    tags: string[];
    createdAt: Date;
    count: number;
}

type StringProperties = PickByType<MixedTypes, string>; // { name: string; }
type NonStringProperties = OmitByType<MixedTypes, string>;
// {
//     id: number;
//     isActive: boolean;
//     tags: string[];
//     createdAt: Date;
//     count: number;
// }

// 递归映射类型
type Paths<T, K extends keyof T = keyof T> = K extends string
    ? T[K] extends object
        ? K | `${K}.${Paths<T[K]>}`
        : K
    : never;

type NestedObject = {
    user: {
        profile: {
            name: string;
            settings: {
                theme: string;
                notifications: boolean;
            };
        };
        posts: Array<{
            title: string;
            content: string;
        }>;
    };
    config: {
        apiUrl: string;
        timeout: number;
    };
};

type AllPaths = Paths<NestedObject>;
// "user" | "config" | "user.profile" | "user.posts" | "user.profile.name" | 
// "user.profile.settings" | "user.profile.settings.theme" | 
// "user.profile.settings.notifications" | "config.apiUrl" | "config.timeout"
```

### 实用映射类型工具

```typescript
// 事件处理器映射
type EventHandlers<T> = {
    [K in keyof T as `on${Capitalize<string & K>}`]: (value: T[K]) => void;
};

interface FormData {
    username: string;
    password: string;
    email: string;
}

type FormEventHandlers = EventHandlers<FormData>;
// {
//     onUsername: (value: string) => void;
//     onPassword: (value: string) => void;
//     onEmail: (value: string) => void;
// }

// API端点映射
type APIEndpoints<T> = {
    [K in keyof T as `${string & K}Endpoint`]: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        path: string;
        body?: T[K];
        response: T[K];
    };
};

interface APIData {
    user: User;
    post: Post;
    comment: Comment;
}

type Endpoints = APIEndpoints<APIData>;
// {
//     userEndpoint: {
//         method: 'GET' | 'POST' | 'PUT' | 'DELETE';
//         path: string;
//         body?: User;
//         response: User;
//     };
//     // ... 其他端点
// }

// 状态管理映射
type Actions<T> = {
    [K in keyof T as `set${Capitalize<string & K>}`]: {
        type: `SET_${Uppercase<string & K>}`;
        payload: T[K];
    };
}[keyof T];

type Reducers<T> = {
    [K in keyof T]: (state: T, action: Actions<T>) => T;
};

interface AppState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

type AppActions = Actions<AppState>;
// {
//     type: "SET_USER";
//     payload: User | null;
// } | {
//     type: "SET_LOADING";
//     payload: boolean;
// } | {
//     type: "SET_ERROR";
//     payload: string | null;
// }

// 数据库模型映射
type DatabaseModel<T> = {
    [K in keyof T]: {
        type: T[K] extends string ? 'VARCHAR' :
              T[K] extends number ? 'INTEGER' :
              T[K] extends boolean ? 'BOOLEAN' :
              T[K] extends Date ? 'TIMESTAMP' :
              'TEXT';
        nullable: T[K] extends null | undefined ? true : false;
        primaryKey?: boolean;
        unique?: boolean;
    };
};

type UserModel = DatabaseModel<User>;
// {
//     id: { type: 'INTEGER'; nullable: false; primaryKey?: boolean; unique?: boolean; };
//     name: { type: 'VARCHAR'; nullable: false; primaryKey?: boolean; unique?: boolean; };
//     email: { type: 'VARCHAR'; nullable: false; primaryKey?: boolean; unique?: boolean; };
//     age: { type: 'INTEGER'; nullable: false; primaryKey?: boolean; unique?: boolean; };
// }
```

## 📝 本章小结

本章深入探讨了TypeScript的高级类型系统：

1. **泛型编程**：约束、工厂模式、工具类型等高级用法
2. **条件类型**：类型推断、分布式条件类型、递归类型
3. **映射类型**：键名映射、条件映射、深度映射等技术
4. **实用工具**：API类型、状态管理、数据库模型等应用

这些技术将帮助你：
- 构建类型安全的大型应用
- 创建灵活且可复用的类型系统
- 提供更好的开发体验和IDE支持
- 减少运行时错误和调试时间

## 🚀 下一章预告

下一章我们将学习**设计模式在JavaScript中的应用**，探讨经典设计模式的现代JavaScript实现。

---

**继续学习：[第8章：设计模式在JavaScript中的应用](../chapter-08/)**
