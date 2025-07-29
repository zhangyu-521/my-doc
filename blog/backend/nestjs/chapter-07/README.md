# 第7章：API文档与测试

## 🎯 本章目标

在这一章中，我们将：
- 配置完整的 Swagger API 文档
- 编写单元测试和集成测试
- 实现测试数据库和模拟服务
- 创建端到端测试
- 设置测试覆盖率报告
- 实现 API 性能测试

## 📚 Swagger API 文档配置

### 1. 安装依赖

```bash
npm install @nestjs/swagger swagger-ui-express
npm install --save-dev @types/swagger-ui-express
```

### 2. 配置 Swagger

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 启用 CORS
  app.enableCors({
    origin: configService.get('cors.origin'),
    credentials: configService.get('cors.credentials'),
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('NestJS 博客 API')
    .setDescription('基于 NestJS + Prisma + MySQL 的博客系统 API 文档')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '输入 JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('认证', '用户认证相关接口')
    .addTag('用户管理', '用户管理相关接口')
    .addTag('文章管理', '文章管理相关接口')
    .addTag('分类管理', '分类管理相关接口')
    .addTag('标签管理', '标签管理相关接口')
    .addTag('评论管理', '评论管理相关接口')
    .addTag('文件上传', '文件上传相关接口')
    .addServer('http://localhost:3000', '开发环境')
    .addServer('https://api.yourdomain.com', '生产环境')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // 自定义 Swagger UI 配置
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'NestJS 博客 API 文档',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  const port = configService.get('app.port');
  await app.listen(port);
  
  console.log(`应用运行在: http://localhost:${port}`);
  console.log(`API 文档地址: http://localhost:${port}/api-docs`);
}
bootstrap();
```

### 3. 增强实体文档

```typescript
// src/modules/users/entities/user.entity.ts (更新)
import { User, UserRole, UserStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserEntity implements User {
  @ApiProperty({ 
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  id: string;

  @ApiProperty({ 
    description: '邮箱地址',
    example: 'user@example.com',
    format: 'email'
  })
  email: string;

  @ApiProperty({ 
    description: '用户名',
    example: 'johndoe',
    minLength: 3,
    maxLength: 20
  })
  username: string;

  @ApiPropertyOptional({ 
    description: '名字',
    example: 'John',
    maxLength: 50
  })
  firstName: string | null;

  @ApiPropertyOptional({ 
    description: '姓氏',
    example: 'Doe',
    maxLength: 50
  })
  lastName: string | null;

  @ApiPropertyOptional({ 
    description: '头像URL',
    example: 'https://example.com/avatar.jpg'
  })
  avatar: string | null;

  @ApiPropertyOptional({ 
    description: '个人简介',
    example: '这是我的个人简介',
    maxLength: 500
  })
  bio: string | null;

  @ApiProperty({ 
    description: '用户角色',
    enum: UserRole,
    example: UserRole.USER
  })
  role: UserRole;

  @ApiProperty({ 
    description: '用户状态',
    enum: UserStatus,
    example: UserStatus.ACTIVE
  })
  status: UserStatus;

  @ApiProperty({ 
    description: '邮箱验证状态',
    example: true
  })
  emailVerified: boolean;

  @ApiPropertyOptional({ 
    description: '最后登录时间',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  lastLoginAt: Date | null;

  @ApiProperty({ 
    description: '创建时间',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: '更新时间',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  updatedAt: Date;

  // 排除敏感字段
  @Exclude()
  password: string;

  @Exclude()
  refreshToken: string | null;

  @Exclude()
  resetPasswordToken: string | null;

  @Exclude()
  resetPasswordExpires: Date | null;

  @Exclude()
  emailVerificationToken: string | null;

  constructor(user: User) {
    Object.assign(this, user);
  }
}
```

### 4. 增强 DTO 文档

```typescript
// src/modules/articles/dto/create-article.dto.ts (更新示例)
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({ 
    description: '文章标题',
    example: 'NestJS 实战指南：从入门到精通',
    minLength: 1,
    maxLength: 255
  })
  @IsString({ message: '标题必须是字符串' })
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(255, { message: '标题最多255个字符' })
  title: string;

  @ApiProperty({ 
    description: '文章内容',
    example: '这是一篇关于 NestJS 的详细教程，涵盖了从基础到高级的所有内容...'
  })
  @IsString({ message: '内容必须是字符串' })
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;

  @ApiPropertyOptional({ 
    description: '文章摘要',
    example: '学习如何使用 NestJS 构建企业级应用程序',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: '摘要必须是字符串' })
  @MaxLength(500, { message: '摘要最多500个字符' })
  excerpt?: string;

  @ApiPropertyOptional({ 
    description: '封面图片URL',
    example: 'https://example.com/cover.jpg'
  })
  @IsOptional()
  @IsString({ message: '封面图片URL必须是字符串' })
  coverImage?: string;

  @ApiProperty({ 
    description: '分类ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsUUID(4, { message: '分类ID必须是有效的UUID' })
  @IsNotEmpty({ message: '分类ID不能为空' })
  categoryId: string;

  @ApiPropertyOptional({ 
    description: '标签ID列表',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002']
  })
  @IsOptional()
  @IsArray({ message: '标签ID必须是数组' })
  @IsUUID(4, { each: true, message: '每个标签ID必须是有效的UUID' })
  tagIds?: string[];

  @ApiPropertyOptional({ 
    description: '文章状态',
    enum: ArticleStatus,
    example: ArticleStatus.DRAFT,
    default: ArticleStatus.DRAFT
  })
  @IsOptional()
  status?: ArticleStatus;

  @ApiPropertyOptional({ 
    description: '是否允许评论',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: '允许评论必须是布尔值' })
  allowComments?: boolean;

  // SEO 相关字段
  @ApiPropertyOptional({ 
    description: 'SEO标题',
    example: 'NestJS 实战指南 - 最全面的 NestJS 教程',
    maxLength: 255
  })
  @IsOptional()
  @IsString({ message: 'SEO标题必须是字符串' })
  @MaxLength(255, { message: 'SEO标题最多255个字符' })
  metaTitle?: string;

  @ApiPropertyOptional({ 
    description: 'SEO描述',
    example: '这是一篇全面的 NestJS 教程，适合初学者和有经验的开发者',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'SEO描述必须是字符串' })
  @MaxLength(500, { message: 'SEO描述最多500个字符' })
  metaDescription?: string;

  @ApiPropertyOptional({ 
    description: 'SEO关键词',
    example: 'NestJS, Node.js, TypeScript, 后端开发, API'
  })
  @IsOptional()
  @IsString({ message: 'SEO关键词必须是字符串' })
  metaKeywords?: string;
}
```

## 🧪 单元测试

### 1. 安装测试依赖

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
npm install --save-dev @nestjs/testing
npm install --save-dev jest-mock-extended  # 用于创建类型安全的模拟对象
```

### 2. Jest 配置

```json
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/$1',
  },
};
```

### 3. 测试设置文件

```typescript
// src/test/setup.ts
import { PrismaClient } from '@prisma/client';

// 全局测试设置
beforeAll(async () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/blog_test';
});

afterAll(async () => {
  // 清理测试数据
  const prisma = new PrismaClient();
  await prisma.$disconnect();
});
```

### 4. 用户服务单元测试

```typescript
// src/modules/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: false,
    avatar: null,
    bio: null,
    refreshToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    emailVerificationToken: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建用户', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: createUserDto.email },
            { username: createUserDto.username },
          ],
        },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createUserDto.email,
          username: createUserDto.username,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
        }),
      });
    });

    it('当邮箱已存在时应该抛出异常', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('应该返回分页用户列表', async () => {
      const users = [mockUser];
      const total = 1;

      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(total);

      const result = await service.findAll(1, 10);

      expect(result.data).toEqual(users);
      expect(result.meta.total).toBe(total);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('应该返回指定用户', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('当用户不存在时应该抛出异常', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该成功更新用户', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateUserDto,
      });
    });
  });

  describe('remove', () => {
    it('应该成功删除用户', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);

      await service.remove('1');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });
});
```

### 5. 认证服务单元测试

```typescript
// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: DeepMockProxy<UsersService>;
  let jwtService: DeepMockProxy<JwtService>;
  let prisma: DeepMockProxy<PrismaService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    bio: null,
    refreshToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    emailVerificationToken: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockDeep<UsersService>(),
        },
        {
          provide: JwtService,
          useValue: mockDeep<JwtService>(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'jwt.accessTokenExpiration': '15m',
                'jwt.refreshTokenExpiration': '7d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('应该验证用户凭据并返回用户信息', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
      });
    });

    it('当密码错误时应该返回null', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('当用户不存在时应该返回null', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('应该成功登录并返回tokens', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password',
      };

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValueOnce(tokens.accessToken);
      jwtService.sign.mockReturnValueOnce(tokens.refreshToken);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
        }),
        ...tokens,
      });
    });

    it('当凭据无效时应该抛出异常', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const newUser = { ...mockUser, ...registerDto };

      usersService.create.mockResolvedValue(newUser);
      jwtService.sign.mockReturnValueOnce('access-token');
      jwtService.sign.mockReturnValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: expect.objectContaining({
          email: registerDto.email,
          username: registerDto.username,
        }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });
});
```

### 6. 控制器单元测试

```typescript
// src/modules/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('UsersController', () => {
  let controller: UsersController;
  let service: DeepMockProxy<UsersService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: false,
    avatar: null,
    bio: null,
    refreshToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    emailVerificationToken: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockDeep<UsersService>(),
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建新用户', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      service.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('应该返回用户列表', async () => {
      const paginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(1, 10);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });
  });

  describe('findOne', () => {
    it('应该返回指定用户', async () => {
      service.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('应该更新用户', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('1', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('1', updateUserDto);
    });
  });

  describe('remove', () => {
    it('应该删除用户', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
```

## 🔗 集成测试

### 1. 测试数据库配置

```typescript
// src/test/test-database.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export class TestDatabase {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_TEST_URL || 'mysql://test:test@localhost:3306/blog_test',
        },
      },
    });
  }

  async setup(): Promise<void> {
    // 运行数据库迁移
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_TEST_URL,
      },
    });

    // 清空所有表
    await this.cleanup();
  }

  async cleanup(): Promise<void> {
    // 按照依赖关系的逆序删除数据
    await this.prisma.comment.deleteMany();
    await this.prisma.articleTag.deleteMany();
    await this.prisma.article.deleteMany();
    await this.prisma.tag.deleteMany();
    await this.prisma.category.deleteMany();
    await this.prisma.user.deleteMany();
  }

  async teardown(): Promise<void> {
    await this.cleanup();
    await this.prisma.$disconnect();
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}
```

### 2. 测试工厂

```typescript
// src/test/factories/user.factory.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<any> = {}) {
    const defaultData = {
      email: faker.internet.email(),
      username: faker.internet.userName(),
      password: await bcrypt.hash('password123', 12),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      ...overrides,
    };

    return this.prisma.user.create({
      data: defaultData,
    });
  }

  async createMany(count: number, overrides: Partial<any> = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }

  async createAdmin(overrides: Partial<any> = {}) {
    return this.create({
      role: UserRole.ADMIN,
      ...overrides,
    });
  }
}
```

```typescript
// src/test/factories/article.factory.ts
import { PrismaClient, ArticleStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

export class ArticleFactory {
  constructor(private prisma: PrismaClient) {}

  async create(authorId: string, categoryId: string, overrides: Partial<any> = {}) {
    const title = faker.lorem.sentence();
    const defaultData = {
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      content: faker.lorem.paragraphs(5),
      excerpt: faker.lorem.paragraph(),
      authorId,
      categoryId,
      status: ArticleStatus.PUBLISHED,
      allowComments: true,
      viewCount: faker.number.int({ min: 0, max: 1000 }),
      ...overrides,
    };

    return this.prisma.article.create({
      data: defaultData,
      include: {
        author: true,
        category: true,
        tags: true,
        comments: true,
      },
    });
  }

  async createMany(count: number, authorId: string, categoryId: string, overrides: Partial<any> = {}) {
    const articles = [];
    for (let i = 0; i < count; i++) {
      articles.push(await this.create(authorId, categoryId, overrides));
    }
    return articles;
  }
}
```

### 3. 用户模块集成测试

```typescript
// src/modules/users/users.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { TestDatabase } from '../../test/test-database';
import { UserFactory } from '../../test/factories/user.factory';
import { UserRole, UserStatus } from '@prisma/client';

describe('Users Integration', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let userFactory: UserFactory;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userFactory = new UserFactory(testDb.getPrismaClient());
  });

  afterAll(async () => {
    await testDb.teardown();
    await app.close();
  });

  beforeEach(async () => {
    await testDb.cleanup();
  });

  describe('POST /users', () => {
    it('应该创建新用户', async () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject({
        email: createUserDto.email,
        username: createUserDto.username,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      expect(response.body.password).toBeUndefined();
    });

    it('当邮箱已存在时应该返回400', async () => {
      await userFactory.create({ email: 'existing@example.com' });

      const createUserDto = {
        email: 'existing@example.com',
        username: 'testuser',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('应该返回用户列表', async () => {
      await userFactory.createMany(5);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta).toMatchObject({
        total: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('应该支持分页', async () => {
      await userFactory.createMany(15);

      const response = await request(app.getHttpServer())
        .get('/users?page=2&limit=5')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta).toMatchObject({
        total: 15,
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });
  });

  describe('GET /users/:id', () => {
    it('应该返回指定用户', async () => {
      const user = await userFactory.create();

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    });

    it('当用户不存在时应该返回404', async () => {
      await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /users/:id', () => {
    it('应该更新用户信息', async () => {
      const user = await userFactory.create();
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
      });
    });
  });

  describe('DELETE /users/:id', () => {
    it('应该删除用户', async () => {
      const user = await userFactory.create();

      await request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .expect(204);

      // 验证用户已被删除
      await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(404);
    });
  });
});
```

### 4. 认证模块集成测试

```typescript
// src/modules/auth/auth.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { TestDatabase } from '../../test/test-database';
import { UserFactory } from '../../test/factories/user.factory';

describe('Auth Integration', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let userFactory: UserFactory;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userFactory = new UserFactory(testDb.getPrismaClient());
  });

  afterAll(async () => {
    await testDb.teardown();
    await app.close();
  });

  beforeEach(async () => {
    await testDb.cleanup();
  });

  describe('POST /auth/register', () => {
    it('应该成功注册新用户', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        user: {
          email: registerDto.email,
          username: registerDto.username,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  describe('POST /auth/login', () => {
    it('应该成功登录', async () => {
      const user = await userFactory.create({
        email: 'test@example.com',
        password: await require('bcrypt').hash('password123', 12),
      });

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('当凭据无效时应该返回401', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('应该刷新访问令牌', async () => {
      // 首先注册并登录获取refresh token
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      const { refreshToken } = loginResponse.body;

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeEach(async () => {
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      accessToken = response.body.accessToken;
    });

    it('应该允许访问受保护的路由', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('没有token时应该返回401', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('无效token时应该返回401', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
```

## 🎭 端到端测试

### 1. E2E 测试配置

```typescript
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "setupFilesAfterEnv": ["<rootDir>/setup-e2e.ts"]
}
```

```typescript
// test/setup-e2e.ts
import { TestDatabase } from '../src/test/test-database';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = new TestDatabase();
  await testDb.setup();
});

afterAll(async () => {
  if (testDb) {
    await testDb.teardown();
  }
});

beforeEach(async () => {
  if (testDb) {
    await testDb.cleanup();
  }
});
```

### 2. 完整的用户流程 E2E 测试

```typescript
// test/user-flow.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestDatabase } from '../src/test/test-database';
import { UserFactory } from '../src/test/factories/user.factory';
import { ArticleFactory } from '../src/test/factories/article.factory';

describe('User Flow E2E', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let userFactory: UserFactory;
  let articleFactory: ArticleFactory;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const prisma = testDb.getPrismaClient();
    userFactory = new UserFactory(prisma);
    articleFactory = new ArticleFactory(prisma);
  });

  afterAll(async () => {
    await testDb.teardown();
    await app.close();
  });

  beforeEach(async () => {
    await testDb.cleanup();
  });

  describe('完整的博客系统用户流程', () => {
    it('用户注册 -> 登录 -> 创建文章 -> 评论 -> 删除', async () => {
      // 1. 用户注册
      const registerDto = {
        email: 'blogger@example.com',
        username: 'blogger',
        password: 'password123',
        firstName: 'Blog',
        lastName: 'Writer',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const { user, accessToken } = registerResponse.body;
      expect(user.email).toBe(registerDto.email);
      expect(accessToken).toBeDefined();

      // 2. 创建分类
      const categoryDto = {
        name: '技术分享',
        description: '技术相关的文章',
      };

      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(categoryDto)
        .expect(201);

      const category = categoryResponse.body;

      // 3. 创建标签
      const tagDto = {
        name: 'NestJS',
        description: 'NestJS 相关内容',
      };

      const tagResponse = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tagDto)
        .expect(201);

      const tag = tagResponse.body;

      // 4. 创建文章
      const articleDto = {
        title: '我的第一篇 NestJS 文章',
        content: '这是一篇关于 NestJS 的详细教程...',
        excerpt: '学习 NestJS 的基础知识',
        categoryId: category.id,
        tagIds: [tag.id],
        status: 'PUBLISHED',
      };

      const articleResponse = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(articleDto)
        .expect(201);

      const article = articleResponse.body;
      expect(article.title).toBe(articleDto.title);
      expect(article.author.id).toBe(user.id);

      // 5. 获取文章列表
      const articlesResponse = await request(app.getHttpServer())
        .get('/articles')
        .expect(200);

      expect(articlesResponse.body.data).toHaveLength(1);
      expect(articlesResponse.body.data[0].id).toBe(article.id);

      // 6. 创建另一个用户来评论
      const commenterDto = {
        email: 'commenter@example.com',
        username: 'commenter',
        password: 'password123',
      };

      const commenterResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(commenterDto)
        .expect(201);

      const commenterToken = commenterResponse.body.accessToken;

      // 7. 添加评论
      const commentDto = {
        content: '这是一篇很好的文章！',
        articleId: article.id,
      };

      const commentResponse = await request(app.getHttpServer())
        .post('/comments')
        .set('Authorization', `Bearer ${commenterToken}`)
        .send(commentDto)
        .expect(201);

      const comment = commentResponse.body;
      expect(comment.content).toBe(commentDto.content);

      // 8. 获取文章详情（包含评论）
      const articleDetailResponse = await request(app.getHttpServer())
        .get(`/articles/${article.id}`)
        .expect(200);

      expect(articleDetailResponse.body.comments).toHaveLength(1);
      expect(articleDetailResponse.body.comments[0].id).toBe(comment.id);

      // 9. 作者回复评论
      const replyDto = {
        content: '谢谢你的评论！',
        articleId: article.id,
        parentId: comment.id,
      };

      const replyResponse = await request(app.getHttpServer())
        .post('/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(replyDto)
        .expect(201);

      expect(replyResponse.body.parentId).toBe(comment.id);

      // 10. 更新文章
      const updateArticleDto = {
        title: '我的第一篇 NestJS 文章（已更新）',
        content: '这是一篇关于 NestJS 的详细教程...（已更新内容）',
      };

      const updatedArticleResponse = await request(app.getHttpServer())
        .put(`/articles/${article.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateArticleDto)
        .expect(200);

      expect(updatedArticleResponse.body.title).toBe(updateArticleDto.title);

      // 11. 搜索文章
      const searchResponse = await request(app.getHttpServer())
        .get('/articles/search?q=NestJS')
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].id).toBe(article.id);

      // 12. 删除评论
      await request(app.getHttpServer())
        .delete(`/comments/${comment.id}`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .expect(204);

      // 13. 删除文章
      await request(app.getHttpServer())
        .delete(`/articles/${article.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // 14. 验证文章已删除
      await request(app.getHttpServer())
        .get(`/articles/${article.id}`)
        .expect(404);
    });
  });

  describe('权限控制流程', () => {
    it('应该正确处理权限控制', async () => {
      // 创建普通用户
      const user = await userFactory.create();
      const userLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        });

      const userToken = userLoginResponse.body.accessToken;

      // 创建管理员
      const admin = await userFactory.createAdmin();
      const adminLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: admin.email,
          password: 'password123',
        });

      const adminToken = adminLoginResponse.body.accessToken;

      // 普通用户尝试访问管理员接口应该被拒绝
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // 管理员可以访问管理员接口
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 用户只能编辑自己的资料
      await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      // 用户不能编辑其他用户的资料
      await request(app.getHttpServer())
        .put(`/users/${admin.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });
  });
});
```

## 📊 性能测试

### 1. 安装性能测试工具

```bash
npm install --save-dev artillery
npm install --save-dev clinic
```

### 2. Artillery 配置

```yaml
# test/performance/load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "User Registration and Login"
    weight: 30
    flow:
      - post:
          url: "/auth/register"
          json:
            email: "user{{ $randomNumber() }}@example.com"
            username: "user{{ $randomNumber() }}"
            password: "password123"
            firstName: "Test"
            lastName: "User"
          capture:
            - json: "$.accessToken"
              as: "accessToken"
      - post:
          url: "/auth/login"
          json:
            email: "user{{ $randomNumber() }}@example.com"
            password: "password123"

  - name: "Article Operations"
    weight: 50
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "admin@example.com"
            password: "password123"
          capture:
            - json: "$.accessToken"
              as: "accessToken"
      - get:
          url: "/articles"
          headers:
            Authorization: "Bearer {{ accessToken }}"
      - get:
          url: "/articles/{{ $randomNumber(1, 100) }}"
          headers:
            Authorization: "Bearer {{ accessToken }}"

  - name: "Search Operations"
    weight: 20
    flow:
      - get:
          url: "/articles/search?q=nestjs"
      - get:
          url: "/articles/search?q=tutorial"
      - get:
          url: "/categories"
      - get:
          url: "/tags"
```

### 3. 性能测试脚本

```typescript
// test/performance/benchmark.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { TestDatabase } from '../../src/test/test-database';
import { UserFactory } from '../../src/test/factories/user.factory';
import { ArticleFactory } from '../../src/test/factories/article.factory';
import * as request from 'supertest';

describe('Performance Benchmarks', () => {
  let app: INestApplication;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // 创建测试数据
    await setupTestData();
  });

  afterAll(async () => {
    await testDb.teardown();
    await app.close();
  });

  async function setupTestData() {
    const prisma = testDb.getPrismaClient();
    const userFactory = new UserFactory(prisma);
    const articleFactory = new ArticleFactory(prisma);

    // 创建用户
    const users = await userFactory.createMany(100);

    // 创建分类
    const category = await prisma.category.create({
      data: {
        name: 'Performance Test',
        slug: 'performance-test',
        description: 'Performance test category',
      },
    });

    // 创建大量文章
    for (const user of users.slice(0, 10)) {
      await articleFactory.createMany(10, user.id, category.id);
    }
  }

  describe('API Response Times', () => {
    it('文章列表查询应该在100ms内完成', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/articles?page=1&limit=20')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('文章搜索应该在200ms内完成', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/articles/search?q=test&page=1&limit=10')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });

    it('用户列表查询应该在50ms内完成', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Concurrent Requests', () => {
    it('应该能处理并发请求', async () => {
      const concurrentRequests = 50;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/articles')
            .expect(200)
        );
      }

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      // 50个并发请求应该在2秒内完成
      expect(duration).toBeLessThan(2000);
    });
  });
});
```

## 📈 测试覆盖率配置

### 1. 更新 package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:e2e:cov": "jest --config ./test/jest-e2e.json --coverage",
    "test:performance": "artillery run test/performance/load-test.yml",
    "test:benchmark": "jest --config ./test/jest-benchmark.json"
  }
}
```

### 2. 覆盖率配置

```javascript
// jest.config.js (更新)
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!main.ts',
    '!**/*.module.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## 🎉 小结

在本章中，我们完成了：
- ✅ 配置了完整的 Swagger API 文档
- ✅ 编写了单元测试（服务、控制器）
- ✅ 实现了集成测试和测试工厂
- ✅ 创建了端到端测试
- ✅ 设置了性能测试和基准测试
- ✅ 配置了测试覆盖率报告

这些测试确保了应用的质量和稳定性，API文档提供了清晰的接口说明。

在下一章中，我们将实现部署和优化，包括Docker配置、CI/CD流水线和生产环境优化。
