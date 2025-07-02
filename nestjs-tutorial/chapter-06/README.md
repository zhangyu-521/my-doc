# 第6章：公共组件与工具

## 🎯 本章目标

在这一章中，我们将：
- 创建高级拦截器（日志、缓存、转换）
- 实现自定义管道和验证器
- 创建全局异常过滤器
- 开发实用工具函数和装饰器
- 实现文件上传和处理
- 创建邮件服务和通知系统

## 📁 创建目录结构

```
src/
├── common/
│   ├── decorators/
│   │   ├── api-paginated-response.decorator.ts
│   │   ├── transform.decorator.ts
│   │   └── validate-object-id.decorator.ts
│   ├── filters/
│   │   ├── all-exceptions.filter.ts
│   │   ├── http-exception.filter.ts
│   │   └── prisma-exception.filter.ts
│   ├── guards/
│   │   ├── throttler.guard.ts
│   │   └── api-key.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── cache.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   └── timeout.interceptor.ts
│   ├── pipes/
│   │   ├── parse-object-id.pipe.ts
│   │   ├── validation.pipe.ts
│   │   └── file-validation.pipe.ts
│   ├── middleware/
│   │   ├── logger.middleware.ts
│   │   └── cors.middleware.ts
│   └── utils/
│       ├── crypto.util.ts
│       ├── date.util.ts
│       ├── file.util.ts
│       └── pagination.util.ts
├── modules/
│   ├── upload/
│   │   ├── dto/
│   │   ├── upload.controller.ts
│   │   ├── upload.service.ts
│   │   └── upload.module.ts
│   ├── mail/
│   │   ├── templates/
│   │   ├── mail.service.ts
│   │   └── mail.module.ts
│   └── notification/
│       ├── dto/
│       ├── notification.service.ts
│       └── notification.module.ts
```

## 🔍 高级拦截器

### 1. 日志拦截器

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip;

    const now = Date.now();
    const requestId = this.generateRequestId();

    // 记录请求信息
    this.logger.log(
      `[${requestId}] ${method} ${url} - ${ip} - ${userAgent}`,
      'REQUEST',
    );

    // 记录请求详情（开发环境）
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `[${requestId}] Body: ${JSON.stringify(body)} Query: ${JSON.stringify(query)} Params: ${JSON.stringify(params)}`,
        'REQUEST_DETAILS',
      );
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `[${requestId}] ${method} ${url} ${response.statusCode} - ${responseTime}ms`,
            'RESPONSE',
          );

          // 记录响应详情（开发环境）
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(
              `[${requestId}] Response: ${JSON.stringify(data)}`,
              'RESPONSE_DETAILS',
            );
          }
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `[${requestId}] ${method} ${url} ${error.status || 500} - ${responseTime}ms - ${error.message}`,
            error.stack,
            'ERROR',
          );
        },
      }),
    );
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
```

### 2. 缓存拦截器

```typescript
// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

// 缓存装饰器
export const CacheKey = (key: string) => Reflector.createDecorator<string>({ key });
export const CacheTTL = (ttl: number) => Reflector.createDecorator<number>({ ttl });

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheKey = this.reflector.get(CacheKey, context.getHandler());
    const cacheTTL = this.reflector.get(CacheTTL, context.getHandler()) || 60000; // 默认1分钟

    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const fullCacheKey = this.generateCacheKey(cacheKey, request);

    // 检查缓存
    const cached = this.cache.get(fullCacheKey);
    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        // 存储到缓存
        this.cache.set(fullCacheKey, {
          data,
          expiry: Date.now() + cacheTTL,
        });

        // 清理过期缓存
        this.cleanExpiredCache();
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const { method, url, query, params } = request;
    const queryString = JSON.stringify(query);
    const paramsString = JSON.stringify(params);
    return `${baseKey}:${method}:${url}:${queryString}:${paramsString}`;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  // 清除指定缓存
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 3. 响应转换拦截器

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message: data?.message || 'Success',
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}
```

### 4. 超时拦截器

```typescript
// src/common/interceptors/timeout.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutValue: number = 30000) {} // 默认30秒

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutValue),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('请求超时'));
        }
        return throwError(() => err);
      }),
    );
  }
}
```

## 🔧 自定义管道

### 1. 对象ID验证管道

```typescript
// src/common/pipes/parse-object-id.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate as isUUID } from 'uuid';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException('ID不能为空');
    }

    if (!isUUID(value)) {
      throw new BadRequestException('无效的ID格式');
    }

    return value;
  }
}
```

### 2. 文件验证管道

```typescript
// src/common/pipes/file-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

export interface FileValidationOptions {
  maxSize?: number; // 最大文件大小（字节）
  allowedMimeTypes?: string[]; // 允许的MIME类型
  allowedExtensions?: string[]; // 允许的文件扩展名
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions = {}) {}

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    // 验证文件大小
    if (this.options.maxSize && file.size > this.options.maxSize) {
      throw new BadRequestException(
        `文件大小不能超过 ${this.formatFileSize(this.options.maxSize)}`,
      );
    }

    // 验证MIME类型
    if (
      this.options.allowedMimeTypes &&
      !this.options.allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException(
        `不支持的文件类型，支持的类型：${this.options.allowedMimeTypes.join(', ')}`,
      );
    }

    // 验证文件扩展名
    if (this.options.allowedExtensions) {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension || !this.options.allowedExtensions.includes(extension)) {
        throw new BadRequestException(
          `不支持的文件扩展名，支持的扩展名：${this.options.allowedExtensions.join(', ')}`,
        );
      }
    }

    return file;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
```

## 🚨 全局异常过滤器

### 1. 全局异常过滤器

```typescript
// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // 处理 HTTP 异常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || error;
      }
    }
    // 处理 Prisma 异常
    else if (exception instanceof PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      error = prismaError.error;
    }
    // 处理其他异常
    else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : 'Unknown error',
    );

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(exception: PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: '数据已存在，违反唯一约束',
          error: 'Conflict',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: '记录不存在',
          error: 'Not Found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: '外键约束失败',
          error: 'Bad Request',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: '数据关系冲突',
          error: 'Bad Request',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '数据库操作失败',
          error: 'Internal Server Error',
        };
    }
  }
}
```

### 2. HTTP异常过滤器

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else {
      message = (exceptionResponse as any).message || exception.message;
      error = (exceptionResponse as any).error || exception.name;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // 记录错误日志（4xx错误记录为warn，5xx错误记录为error）
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
        exception.stack,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
```

## 🛠️ 实用工具函数

### 1. 加密工具

```typescript
// src/common/utils/crypto.util.ts
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class CryptoUtil {
  /**
   * 生成随机字符串
   */
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * MD5哈希
   */
  static md5(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * SHA256哈希
   */
  static sha256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * 密码哈希
   */
  static async hashPassword(password: string, rounds: number = 12): Promise<string> {
    return bcrypt.hash(password, rounds);
  }

  /**
   * 验证密码
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * AES加密
   */
  static encrypt(text: string, key: string): string {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * AES解密
   */
  static decrypt(encryptedText: string, key: string): string {
    const algorithm = 'aes-256-cbc';
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipher(algorithm, key);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 生成JWT密钥
   */
  static generateJWTSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}
```

### 2. 日期工具

```typescript
// src/common/utils/date.util.ts
export class DateUtil {
  /**
   * 格式化日期
   */
  static format(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 获取时间差（毫秒）
   */
  static diff(date1: Date, date2: Date): number {
    return Math.abs(date1.getTime() - date2.getTime());
  }

  /**
   * 添加天数
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 添加小时
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * 添加分钟
   */
  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * 获取日期范围的开始和结束
   */
  static getDateRange(type: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (type) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }

  /**
   * 判断是否为同一天
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * 获取相对时间描述
   */
  static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return this.format(date, 'YYYY-MM-DD');
    }
  }
}
```

### 3. 分页工具

```typescript
// src/common/utils/pagination.util.ts
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage?: number;
  prevPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export class PaginationUtil {
  /**
   * 计算跳过的记录数
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * 创建分页元数据
   */
  static createMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : undefined,
      prevPage: hasPrevPage ? page - 1 : undefined,
    };
  }

  /**
   * 创建分页结果
   */
  static createResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return {
      data,
      meta: this.createMeta(total, page, limit),
    };
  }

  /**
   * 验证分页参数
   */
  static validatePagination(page: number, limit: number): void {
    if (page < 1) {
      throw new Error('页码必须大于0');
    }
    if (limit < 1) {
      throw new Error('每页数量必须大于0');
    }
    if (limit > 100) {
      throw new Error('每页数量不能超过100');
    }
  }
}
```

### 4. 文件工具

```typescript
// src/common/utils/file.util.ts
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export class FileUtil {
  /**
   * 获取文件扩展名
   */
  static getExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  /**
   * 获取文件名（不含扩展名）
   */
  static getBasename(filename: string): string {
    return path.basename(filename, path.extname(filename));
  }

  /**
   * 生成唯一文件名
   */
  static generateUniqueFilename(originalName: string): string {
    const ext = this.getExtension(originalName);
    const basename = this.getBasename(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${basename}-${timestamp}-${random}${ext}`;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查文件是否存在
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建目录（如果不存在）
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // 忽略目录已存在的错误
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 复制文件
   */
  static async copyFile(src: string, dest: string): Promise<void> {
    await this.ensureDir(path.dirname(dest));
    await pipeline(createReadStream(src), createWriteStream(dest));
  }

  /**
   * 删除文件
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // 忽略文件不存在的错误
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(filePath: string) {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }

  /**
   * 读取文件内容
   */
  static async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    return fs.readFile(filePath, encoding);
  }

  /**
   * 写入文件内容
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
  }
}
```

## 📁 文件上传服务

### 1. 安装依赖

```bash
npm install multer @types/multer
npm install sharp  # 图片处理库
```

### 2. 文件上传 DTO

```typescript
// src/modules/upload/dto/upload.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: '文件URL' })
  url: string;

  @ApiProperty({ description: '文件名' })
  filename: string;

  @ApiProperty({ description: '原始文件名' })
  originalName: string;

  @ApiProperty({ description: '文件大小（字节）' })
  size: number;

  @ApiProperty({ description: '文件类型' })
  mimetype: string;

  @ApiProperty({ description: '上传时间' })
  uploadedAt: Date;
}
```

### 3. 文件上传服务

```typescript
// src/modules/upload/upload.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as sharp from 'sharp';
import { FileUtil } from '../../common/utils/file.util';
import { UploadResponseDto } from './dto/upload.dto';

@Injectable()
export class UploadService {
  private readonly uploadPath: string;
  private readonly maxFileSize: number;
  private readonly allowedImageTypes: string[];
  private readonly allowedDocumentTypes: string[];

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('upload.path') || './uploads';
    this.maxFileSize = this.configService.get<number>('upload.maxSize') || 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedDocumentTypes = ['application/pdf', 'text/plain', 'application/msword'];
  }

  async uploadImage(file: Express.Multer.File): Promise<UploadResponseDto> {
    this.validateImageFile(file);

    const filename = FileUtil.generateUniqueFilename(file.originalname);
    const uploadDir = path.join(this.uploadPath, 'images');
    const filePath = path.join(uploadDir, filename);

    try {
      // 确保上传目录存在
      await FileUtil.ensureDir(uploadDir);

      // 处理图片（压缩、调整大小）
      await sharp(file.buffer)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(filePath);

      // 生成缩略图
      const thumbnailPath = path.join(uploadDir, 'thumbnails', filename);
      await FileUtil.ensureDir(path.dirname(thumbnailPath));
      await sharp(file.buffer)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return {
        url: `/uploads/images/${filename}`,
        filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new InternalServerErrorException('文件上传失败');
    }
  }

  async uploadDocument(file: Express.Multer.File): Promise<UploadResponseDto> {
    this.validateDocumentFile(file);

    const filename = FileUtil.generateUniqueFilename(file.originalname);
    const uploadDir = path.join(this.uploadPath, 'documents');
    const filePath = path.join(uploadDir, filename);

    try {
      await FileUtil.ensureDir(uploadDir);
      await FileUtil.writeFile(filePath, file.buffer.toString('base64'));

      return {
        url: `/uploads/documents/${filename}`,
        filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new InternalServerErrorException('文件上传失败');
    }
  }

  async deleteFile(filename: string, type: 'images' | 'documents'): Promise<void> {
    const filePath = path.join(this.uploadPath, type, filename);

    try {
      await FileUtil.deleteFile(filePath);

      // 如果是图片，同时删除缩略图
      if (type === 'images') {
        const thumbnailPath = path.join(this.uploadPath, type, 'thumbnails', filename);
        await FileUtil.deleteFile(thumbnailPath);
      }
    } catch (error) {
      throw new InternalServerErrorException('文件删除失败');
    }
  }

  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('请选择文件');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `文件大小不能超过 ${FileUtil.formatFileSize(this.maxFileSize)}`
      );
    }

    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的图片格式，支持格式：${this.allowedImageTypes.join(', ')}`
      );
    }
  }

  private validateDocumentFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('请选择文件');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `文件大小不能超过 ${FileUtil.formatFileSize(this.maxFileSize)}`
      );
    }

    if (!this.allowedDocumentTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文档格式，支持格式：${this.allowedDocumentTypes.join(', ')}`
      );
    }
  }
}
```

### 4. 文件上传控制器

```typescript
// src/modules/upload/upload.controller.ts
import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload.dto';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';

@ApiTags('文件上传')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传图片' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: '上传成功',
    type: UploadResponseDto
  })
  async uploadImage(
    @UploadedFile(
      new FileValidationPipe({
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      })
    )
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.uploadService.uploadImage(file);
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传文档' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: '上传成功',
    type: UploadResponseDto
  })
  async uploadDocument(
    @UploadedFile(
      new FileValidationPipe({
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword'],
        allowedExtensions: ['pdf', 'txt', 'doc', 'docx'],
      })
    )
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.uploadService.uploadDocument(file);
  }

  @Delete('image/:filename')
  @ApiOperation({ summary: '删除图片' })
  @ApiResponse({ status: 204, description: '删除成功' })
  async deleteImage(@Param('filename') filename: string): Promise<void> {
    return this.uploadService.deleteFile(filename, 'images');
  }

  @Delete('document/:filename')
  @ApiOperation({ summary: '删除文档' })
  @ApiResponse({ status: 204, description: '删除成功' })
  async deleteDocument(@Param('filename') filename: string): Promise<void> {
    return this.uploadService.deleteFile(filename, 'documents');
  }
}
```

## 📧 邮件服务

### 1. 安装依赖

```bash
npm install nodemailer @types/nodemailer
npm install handlebars  # 邮件模板引擎
```

### 2. 邮件服务

```typescript
// src/modules/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { FileUtil } from '../../common/utils/file.util';

export interface MailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private templatesPath: string;

  constructor(private configService: ConfigService) {
    this.templatesPath = path.join(process.cwd(), 'src/modules/mail/templates');
    this.createTransporter();
  }

  private createTransporter(): void {
    const config = {
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: this.configService.get<boolean>('mail.secure'),
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.password'),
      },
    };

    this.transporter = nodemailer.createTransporter(config);
  }

  async sendMail(options: MailOptions): Promise<void> {
    try {
      let html = options.html;

      // 如果指定了模板，渲染模板
      if (options.template) {
        html = await this.renderTemplate(options.template, options.context || {});
      }

      const mailOptions = {
        from: this.configService.get<string>('mail.from'),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`邮件发送成功: ${result.messageId}`);
    } catch (error) {
      this.logger.error('邮件发送失败:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    await this.sendMail({
      to,
      subject: '欢迎注册！',
      template: 'welcome',
      context: {
        username,
        loginUrl: `${this.configService.get<string>('app.url')}/login`,
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('app.url')}/reset-password?token=${resetToken}`;

    await this.sendMail({
      to,
      subject: '密码重置',
      template: 'password-reset',
      context: {
        resetUrl,
        expiresIn: '1小时',
      },
    });
  }

  async sendVerificationEmail(to: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('app.url')}/verify-email?token=${verificationToken}`;

    await this.sendMail({
      to,
      subject: '邮箱验证',
      template: 'email-verification',
      context: {
        verificationUrl,
      },
    });
  }

  private async renderTemplate(templateName: string, context: Record<string, any>): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
      const templateContent = await FileUtil.readFile(templatePath);
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error(`模板渲染失败: ${templateName}`, error);
      throw new Error(`邮件模板渲染失败: ${templateName}`);
    }
  }
}
```

### 3. 邮件模板

```html
<!-- src/modules/mail/templates/welcome.hbs -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>欢迎注册</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>欢迎加入我们！</h1>
        </div>
        <div class="content">
            <p>亲爱的 {{username}}，</p>
            <p>欢迎注册我们的平台！您的账户已经创建成功。</p>
            <p>您现在可以登录并开始使用我们的服务了。</p>
            <p style="text-align: center;">
                <a href="{{loginUrl}}" class="button">立即登录</a>
            </p>
            <p>如果您有任何问题，请随时联系我们。</p>
            <p>祝您使用愉快！</p>
        </div>
    </div>
</body>
</html>
```

```html
<!-- src/modules/mail/templates/password-reset.hbs -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>密码重置</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .button { display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>密码重置</h1>
        </div>
        <div class="content">
            <p>您好，</p>
            <p>我们收到了您的密码重置请求。请点击下面的按钮来重置您的密码：</p>
            <p style="text-align: center;">
                <a href="{{resetUrl}}" class="button">重置密码</a>
            </p>
            <div class="warning">
                <strong>注意：</strong>此链接将在 {{expiresIn}} 后过期。如果您没有请求重置密码，请忽略此邮件。
            </div>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
        </div>
    </div>
</body>
</html>
```

## 🔧 模块配置

### 1. 上传模块

```typescript
// src/modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get<string>('upload.path') || './uploads',
        limits: {
          fileSize: configService.get<number>('upload.maxSize') || 10 * 1024 * 1024,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
```

### 2. 邮件模块

```typescript
// src/modules/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

### 3. 通知服务

```typescript
// src/modules/notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

export interface NotificationOptions {
  type: 'email' | 'sms' | 'push';
  recipient: string;
  title: string;
  content: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private mailService: MailService) {}

  async send(options: NotificationOptions): Promise<void> {
    try {
      switch (options.type) {
        case 'email':
          await this.sendEmail(options);
          break;
        case 'sms':
          await this.sendSMS(options);
          break;
        case 'push':
          await this.sendPush(options);
          break;
        default:
          throw new Error(`不支持的通知类型: ${options.type}`);
      }
    } catch (error) {
      this.logger.error(`通知发送失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async sendEmail(options: NotificationOptions): Promise<void> {
    await this.mailService.sendMail({
      to: options.recipient,
      subject: options.title,
      html: options.content,
    });
  }

  private async sendSMS(options: NotificationOptions): Promise<void> {
    // 实现短信发送逻辑
    this.logger.log(`发送短信到 ${options.recipient}: ${options.content}`);
  }

  private async sendPush(options: NotificationOptions): Promise<void> {
    // 实现推送通知逻辑
    this.logger.log(`发送推送通知到 ${options.recipient}: ${options.title}`);
  }

  // 批量发送通知
  async sendBatch(notifications: NotificationOptions[]): Promise<void> {
    const promises = notifications.map(notification => this.send(notification));
    await Promise.allSettled(promises);
  }

  // 发送系统通知
  async sendSystemNotification(
    recipients: string[],
    title: string,
    content: string,
  ): Promise<void> {
    const notifications = recipients.map(recipient => ({
      type: 'email' as const,
      recipient,
      title,
      content,
    }));

    await this.sendBatch(notifications);
  }
}
```

### 4. 更新配置文件

```typescript
// src/config/configuration.ts (添加新配置)
export default () => ({
  // ... 现有配置

  // 文件上传配置
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'text/plain', 'application/msword'],
  },

  // 邮件配置
  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM || 'noreply@example.com',
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
});
```

### 5. 更新环境变量

```bash
# .env (添加新的环境变量)

# 文件上传配置
UPLOAD_PATH=./uploads
UPLOAD_MAX_SIZE=10485760

# 邮件配置
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com

# CORS配置
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
```

### 6. 更新主模块

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// 现有导入
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TagsModule } from './modules/tags/tags.module';
import { CommentsModule } from './modules/comments/comments.module';

// 新增导入
import { UploadModule } from './modules/upload/upload.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationModule } from './modules/notification/notification.module';

// 守卫和拦截器
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 静态文件服务
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ArticlesModule,
    CategoriesModule,
    TagsModule,
    CommentsModule,
    UploadModule,
    MailModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局守卫
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 全局拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
```

## 🎨 自定义装饰器

### 1. API分页响应装饰器

```typescript
// src/common/decorators/api-paginated-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  totalPages: { type: 'number' },
                  hasNextPage: { type: 'boolean' },
                  hasPrevPage: { type: 'boolean' },
                },
              },
            },
          },
        ],
      },
    }),
  );
};
```

### 2. 数据转换装饰器

```typescript
// src/common/decorators/transform.decorator.ts
import { Transform } from 'class-transformer';

// 转换为数字
export const ToNumber = () => Transform(({ value }) => {
  const num = Number(value);
  return isNaN(num) ? value : num;
});

// 转换为布尔值
export const ToBoolean = () => Transform(({ value }) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
});

// 转换为日期
export const ToDate = () => Transform(({ value }) => {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  }
  return value;
});

// 去除字符串两端空格
export const Trim = () => Transform(({ value }) => {
  return typeof value === 'string' ? value.trim() : value;
});

// 转换为小写
export const ToLowerCase = () => Transform(({ value }) => {
  return typeof value === 'string' ? value.toLowerCase() : value;
});

// 转换为大写
export const ToUpperCase = () => Transform(({ value }) => {
  return typeof value === 'string' ? value.toUpperCase() : value;
});
```

## ✅ 使用示例

### 1. 在控制器中使用拦截器

```typescript
// 使用缓存拦截器
@Get('popular')
@CacheKey('popular-articles')
@CacheTTL(300000) // 5分钟缓存
async getPopularArticles() {
  return this.articlesService.getPopularArticles();
}

// 使用超时拦截器
@Get('slow-operation')
@UseInterceptors(new TimeoutInterceptor(5000)) // 5秒超时
async slowOperation() {
  return this.someService.slowOperation();
}
```

### 2. 在服务中使用工具函数

```typescript
// 使用加密工具
const hashedPassword = await CryptoUtil.hashPassword(password);
const isValid = await CryptoUtil.comparePassword(password, hashedPassword);

// 使用日期工具
const formattedDate = DateUtil.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
const relativeTime = DateUtil.getRelativeTime(article.createdAt);

// 使用分页工具
const { data, meta } = PaginationUtil.createResult(
  articles,
  total,
  page,
  limit,
);
```

### 3. 发送邮件通知

```typescript
// 在用户注册后发送欢迎邮件
await this.mailService.sendWelcomeEmail(user.email, user.username);

// 发送密码重置邮件
await this.mailService.sendPasswordResetEmail(user.email, resetToken);

// 发送系统通知
await this.notificationService.sendSystemNotification(
  adminEmails,
  '新用户注册',
  `用户 ${user.username} 已注册`,
);
```

## 🎉 小结

在本章中，我们完成了：
- ✅ 创建了高级拦截器（日志、缓存、转换、超时）
- ✅ 实现了自定义管道和验证器
- ✅ 创建了全局异常过滤器
- ✅ 开发了实用工具函数和装饰器
- ✅ 实现了文件上传和处理功能
- ✅ 创建了邮件服务和通知系统
- ✅ 配置了全局组件和中间件

这些公共组件和工具将大大提高开发效率，并为应用提供统一的错误处理、日志记录、数据转换等功能。

在下一章中，我们将实现API文档和测试，包括Swagger配置、单元测试和集成测试。
