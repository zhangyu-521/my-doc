# 第3章：用户模块开发

## 🎯 本章目标

在这一章中，我们将：
- 创建用户模块的基础结构
- 实现用户的 CRUD 操作
- 创建数据传输对象 (DTO)
- 实现数据验证
- 创建用户控制器和路由

## 📁 创建模块结构

### 1. 生成用户模块

使用 NestJS CLI 生成用户模块：

```bash
# 生成用户模块
nest generate module modules/users
nest generate service modules/users
nest generate controller modules/users

# 或者使用简写
nest g mo modules/users
nest g s modules/users
nest g co modules/users
```

### 2. 创建目录结构

```
src/modules/users/
├── dto/                    # 数据传输对象
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── query-user.dto.ts
├── entities/               # 实体类型定义
│   └── user.entity.ts
├── users.controller.ts     # 控制器
├── users.service.ts        # 服务
└── users.module.ts         # 模块
```

## 📝 创建 DTO (数据传输对象)

### 1. 创建用户 DTO

```typescript
// src/modules/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ 
    description: '邮箱地址', 
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({ 
    description: '用户名', 
    example: 'johndoe',
    minLength: 3,
    maxLength: 20
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { 
    message: '用户名只能包含字母、数字和下划线' 
  })
  username: string;

  @ApiProperty({ 
    description: '密码', 
    example: 'Password123!',
    minLength: 8
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码至少8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '密码必须包含大小写字母、数字和特殊字符'
  })
  password: string;

  @ApiPropertyOptional({ 
    description: '名字', 
    example: 'John',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '名字必须是字符串' })
  @MaxLength(50, { message: '名字最多50个字符' })
  firstName?: string;

  @ApiPropertyOptional({ 
    description: '姓氏', 
    example: 'Doe',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '姓氏必须是字符串' })
  @MaxLength(50, { message: '姓氏最多50个字符' })
  lastName?: string;

  @ApiPropertyOptional({ 
    description: '头像URL',
    format: 'uri'
  })
  @IsOptional()
  @IsString({ message: '头像URL必须是字符串' })
  avatar?: string;

  @ApiPropertyOptional({ 
    description: '个人简介',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: '个人简介必须是字符串' })
  @MaxLength(500, { message: '个人简介最多500个字符' })
  bio?: string;

  @ApiPropertyOptional({ 
    description: '用户角色', 
    enum: UserRole,
    default: UserRole.USER
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: UserRole;
}
```

```typescript
// src/modules/users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const)
) {}

// src/modules/users/dto/change-password.dto.ts
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString({ message: '当前密码必须是字符串' })
  @IsNotEmpty({ message: '当前密码不能为空' })
  currentPassword: string;

  @ApiProperty({ 
    description: '新密码',
    minLength: 8
  })
  @IsString({ message: '新密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '新密码至少8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '新密码必须包含大小写字母、数字和特殊字符'
  })
  newPassword: string;
}
```

```typescript
// src/modules/users/dto/query-user.dto.ts
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class QueryUserDto {
  @ApiPropertyOptional({ 
    description: '页码', 
    default: 1, 
    minimum: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: '每页数量', 
    default: 10, 
    minimum: 1, 
    maximum: 100 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  search?: string;

  @ApiPropertyOptional({ 
    description: '用户角色', 
    enum: UserRole 
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: UserRole;

  @ApiPropertyOptional({ 
    description: '用户状态', 
    enum: UserStatus 
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: '无效的用户状态' })
  status?: UserStatus;

  @ApiPropertyOptional({ 
    description: '排序字段',
    default: 'createdAt'
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ 
    description: '排序方向',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsString({ message: '排序方向必须是字符串' })
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ 
    description: '是否只显示已验证邮箱的用户'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: '邮箱验证状态必须是布尔值' })
  emailVerified?: boolean;
}
```

## 🔧 实现用户服务

### 1. 创建用户实体类型

```typescript
// src/modules/users/entities/user.entity.ts
import { User } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity implements Omit<User, 'password'> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false })
  firstName: string | null;

  @ApiProperty({ required: false })
  lastName: string | null;

  @ApiProperty({ required: false })
  avatar: string | null;

  @ApiProperty({ required: false })
  bio: string | null;

  @ApiProperty({ enum: ['USER', 'ADMIN', 'MODERATOR'] })
  role: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'BANNED'] })
  status: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // 排除密码字段
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  emailVerifyToken: string | null;

  constructor(user: User) {
    Object.assign(this, user);
    delete (this as any).password;
  }
}
```

### 2. 实现用户服务

```typescript
// src/modules/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserStatus, Prisma } from '@prisma/client';
import { UserEntity } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { email, username, password, ...rest } = createUserDto;

    // 检查用户是否已存在
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('邮箱已被使用');
      }
      if (existingUser.username === username) {
        throw new ConflictException('用户名已被使用');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      // 创建用户
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          ...rest,
        },
      });

      return new UserEntity(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('邮箱或用户名已存在');
        }
      }
      throw error;
    }
  }

  async findAll(queryDto: QueryUserDto) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      emailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = queryDto;

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    // 构建排序条件
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(user => new UserEntity(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? new UserEntity(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户名是否已被其他用户使用
    if (updateUserDto.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: updateUserDto.username,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new ConflictException('用户名已被使用');
      }
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });

      return new UserEntity(updatedUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('用户名已存在');
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('当前密码错误');
    }

    // 检查新密码是否与当前密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedNewPassword,
      },
    });
  }

  async updateStatus(id: string, status: UserStatus): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    return new UserEntity(updatedUser);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async getUserStats(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const [articleCount, commentCount] = await Promise.all([
      this.prisma.article.count({
        where: { authorId: id },
      }),
      this.prisma.comment.count({
        where: { authorId: id },
      }),
    ]);

    return {
      user,
      stats: {
        articleCount,
        commentCount,
        joinedDays: Math.floor(
          (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    };
  }
}
```

## 🎮 实现用户控制器

### 1. 创建用户控制器

```typescript
// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserEntity } from './entities/user.entity';

@ApiTags('用户管理')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({
    status: 201,
    description: '用户创建成功',
    type: UserEntity
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '用户已存在' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserEntity' }
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
          }
        }
      }
    }
  })
  async findAll(@Query() queryDto: QueryUserDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取用户信息' })
  @ApiParam({ name: 'id', description: '用户ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserEntity
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserEntity> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取用户统计信息' })
  @ApiParam({ name: 'id', description: '用户ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiParam({ name: 'id', description: '用户ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: UserEntity
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '修改用户密码' })
  @ApiParam({ name: 'id', description: '用户ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '当前密码错误' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(id, changePasswordDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新用户状态' })
  @ApiParam({ name: 'id', description: '用户ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: '状态更新成功',
    type: UserEntity
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: UserStatus,
  ): Promise<UserEntity> {
    return this.usersService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除用户' })
  @ApiParam({ name: 'id', description: '用户ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
```

### 2. 配置用户模块

```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 导出服务供其他模块使用
})
export class UsersModule {}
```

### 3. 在主模块中注册

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## ✅ 测试用户模块

### 1. 启动应用

```bash
npm run start:dev
```

### 2. 测试 API 端点

使用 Postman 或 curl 测试以下端点：

#### 创建用户
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### 获取用户列表
```bash
curl -X GET "http://localhost:3000/users?page=1&limit=10"
```

#### 获取单个用户
```bash
curl -X GET http://localhost:3000/users/{user-id}
```

#### 更新用户信息
```bash
curl -X PATCH http://localhost:3000/users/{user-id} \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "bio": "Updated bio"
  }'
```

### 3. 验证数据验证

尝试发送无效数据来测试验证：

```bash
# 测试无效邮箱
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "username": "test",
    "password": "weak"
  }'
```

## 🎉 小结

在本章中，我们完成了：
- ✅ 创建了用户模块的完整结构
- ✅ 实现了用户的 CRUD 操作
- ✅ 创建了详细的 DTO 和数据验证
- ✅ 实现了用户服务和控制器
- ✅ 配置了模块导出和导入

在下一章中，我们将实现 JWT 认证与授权系统，为用户登录和权限控制做准备。
