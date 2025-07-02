# 第5章：文章管理模块

## 🎯 本章目标

在这一章中，我们将：
- 创建文章管理模块
- 实现文章的 CRUD 操作
- 创建分类和标签管理
- 实现文章搜索和分页
- 创建评论系统
- 实现文章状态管理

## 📁 创建模块结构

### 1. 生成文章相关模块

```bash
# 生成文章模块
nest g mo modules/articles
nest g s modules/articles
nest g co modules/articles

# 生成分类模块
nest g mo modules/categories
nest g s modules/categories
nest g co modules/categories

# 生成标签模块
nest g mo modules/tags
nest g s modules/tags
nest g co modules/tags

# 生成评论模块
nest g mo modules/comments
nest g s modules/comments
nest g co modules/comments
```

### 2. 创建目录结构

```
src/modules/
├── articles/
│   ├── dto/
│   │   ├── create-article.dto.ts
│   │   ├── update-article.dto.ts
│   │   └── query-article.dto.ts
│   ├── entities/
│   │   └── article.entity.ts
│   ├── articles.controller.ts
│   ├── articles.service.ts
│   └── articles.module.ts
├── categories/
│   ├── dto/
│   ├── entities/
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   └── categories.module.ts
├── tags/
│   ├── dto/
│   ├── entities/
│   ├── tags.controller.ts
│   ├── tags.service.ts
│   └── tags.module.ts
└── comments/
    ├── dto/
    ├── entities/
    ├── comments.controller.ts
    ├── comments.service.ts
    └── comments.module.ts
```

## 📝 创建文章 DTO

### 1. 文章创建和更新 DTO

```typescript
// src/modules/articles/dto/create-article.dto.ts
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
    example: 'NestJS 实战指南',
    maxLength: 255
  })
  @IsString({ message: '标题必须是字符串' })
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(255, { message: '标题最多255个字符' })
  title: string;

  @ApiProperty({ 
    description: '文章内容',
    example: '这是一篇关于 NestJS 的详细教程...'
  })
  @IsString({ message: '内容必须是字符串' })
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;

  @ApiPropertyOptional({ 
    description: '文章摘要',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: '摘要必须是字符串' })
  @MaxLength(500, { message: '摘要最多500个字符' })
  excerpt?: string;

  @ApiPropertyOptional({ 
    description: '封面图片URL'
  })
  @IsOptional()
  @IsString({ message: '封面图片URL必须是字符串' })
  coverImage?: string;

  @ApiProperty({ 
    description: '分类ID',
    format: 'uuid'
  })
  @IsUUID(4, { message: '分类ID必须是有效的UUID' })
  @IsNotEmpty({ message: '分类ID不能为空' })
  categoryId: string;

  @ApiPropertyOptional({ 
    description: '标签ID列表',
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: '标签ID必须是数组' })
  @IsUUID(4, { each: true, message: '每个标签ID必须是有效的UUID' })
  tagIds?: string[];

  @ApiPropertyOptional({ 
    description: '文章状态',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT
  })
  @IsOptional()
  status?: ArticleStatus;

  @ApiPropertyOptional({ 
    description: '是否允许评论',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: '允许评论必须是布尔值' })
  allowComments?: boolean;

  @ApiPropertyOptional({ 
    description: '是否置顶',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '置顶必须是布尔值' })
  isPinned?: boolean;

  @ApiPropertyOptional({ 
    description: '是否推荐',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '推荐必须是布尔值' })
  isFeatured?: boolean;

  // SEO 相关字段
  @ApiPropertyOptional({ 
    description: 'SEO标题',
    maxLength: 255
  })
  @IsOptional()
  @IsString({ message: 'SEO标题必须是字符串' })
  @MaxLength(255, { message: 'SEO标题最多255个字符' })
  metaTitle?: string;

  @ApiPropertyOptional({ 
    description: 'SEO描述',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'SEO描述必须是字符串' })
  @MaxLength(500, { message: 'SEO描述最多500个字符' })
  metaDescription?: string;

  @ApiPropertyOptional({ 
    description: 'SEO关键词'
  })
  @IsOptional()
  @IsString({ message: 'SEO关键词必须是字符串' })
  metaKeywords?: string;
}
```

```typescript
// src/modules/articles/dto/update-article.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
```

```typescript
// src/modules/articles/dto/query-article.dto.ts
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';

export class QueryArticleDto {
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
    description: '文章状态', 
    enum: ArticleStatus 
  })
  @IsOptional()
  @IsEnum(ArticleStatus, { message: '无效的文章状态' })
  status?: ArticleStatus;

  @ApiPropertyOptional({ 
    description: '分类ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID(4, { message: '分类ID必须是有效的UUID' })
  categoryId?: string;

  @ApiPropertyOptional({ 
    description: '标签ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID(4, { message: '标签ID必须是有效的UUID' })
  tagId?: string;

  @ApiPropertyOptional({ 
    description: '作者ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID(4, { message: '作者ID必须是有效的UUID' })
  authorId?: string;

  @ApiPropertyOptional({ 
    description: '是否只显示置顶文章'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: '置顶状态必须是布尔值' })
  isPinned?: boolean;

  @ApiPropertyOptional({ 
    description: '是否只显示推荐文章'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: '推荐状态必须是布尔值' })
  isFeatured?: boolean;

  @ApiPropertyOptional({ 
    description: '排序字段',
    default: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'likeCount', 'title']
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
}
```

## 🏗️ 创建文章实体

```typescript
// src/modules/articles/entities/article.entity.ts
import { Article, ArticleStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../users/entities/user.entity';

export class ArticleEntity implements Article {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false })
  excerpt: string | null;

  @ApiProperty({ required: false })
  coverImage: string | null;

  @ApiProperty({ enum: ArticleStatus })
  status: ArticleStatus;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ required: false })
  metaTitle: string | null;

  @ApiProperty({ required: false })
  metaDescription: string | null;

  @ApiProperty({ required: false })
  metaKeywords: string | null;

  @ApiProperty({ required: false })
  publishedAt: Date | null;

  @ApiProperty()
  allowComments: boolean;

  @ApiProperty()
  isPinned: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // 关联数据（可选）
  @ApiProperty({ type: () => UserEntity, required: false })
  author?: UserEntity;

  @ApiProperty({ required: false })
  category?: any;

  @ApiProperty({ required: false })
  tags?: any[];

  @ApiProperty({ required: false })
  comments?: any[];

  constructor(article: Article & { author?: any; category?: any; tags?: any[]; comments?: any[] }) {
    Object.assign(this, article);
  }
}
```

## 🔧 实现文章服务

```typescript
// src/modules/articles/articles.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { ArticleEntity } from './entities/article.entity';
import { Article, ArticleStatus, Prisma, UserRole } from '@prisma/client';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createArticleDto: CreateArticleDto,
    authorId: string,
  ): Promise<ArticleEntity> {
    const { tagIds, ...articleData } = createArticleDto;

    // 生成 slug
    const slug = await this.generateUniqueSlug(createArticleDto.title);

    // 验证分类是否存在
    const category = await this.prisma.category.findUnique({
      where: { id: createArticleDto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('指定的分类不存在');
    }

    // 验证标签是否存在
    if (tagIds && tagIds.length > 0) {
      const existingTags = await this.prisma.tag.findMany({
        where: { id: { in: tagIds } },
      });

      if (existingTags.length !== tagIds.length) {
        throw new BadRequestException('部分标签不存在');
      }
    }

    try {
      const article = await this.prisma.article.create({
        data: {
          ...articleData,
          slug,
          authorId,
          publishedAt: articleData.status === ArticleStatus.PUBLISHED ? new Date() : null,
          // 创建文章标签关联
          articleTags: tagIds
            ? {
                create: tagIds.map((tagId) => ({
                  tag: { connect: { id: tagId } },
                })),
              }
            : undefined,
        },
        include: {
          author: true,
          category: true,
          articleTags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // 更新标签使用次数
      if (tagIds && tagIds.length > 0) {
        await this.prisma.tag.updateMany({
          where: { id: { in: tagIds } },
          data: { useCount: { increment: 1 } },
        });
      }

      return new ArticleEntity({
        ...article,
        tags: article.articleTags.map((at) => at.tag),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('文章标题已存在');
        }
      }
      throw error;
    }
  }

  async findAll(queryDto: QueryArticleDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      categoryId,
      tagId,
      authorId,
      isPinned,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.ArticleWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { excerpt: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tagId) {
      where.articleTags = {
        some: {
          tagId: tagId,
        },
      };
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (isPinned !== undefined) {
      where.isPinned = isPinned;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    // 构建排序条件
    const orderBy: Prisma.ArticleOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: true,
          category: true,
          articleTags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles.map(
        (article) =>
          new ArticleEntity({
            ...article,
            tags: article.articleTags.map((at) => at.tag),
            commentsCount: article._count.comments,
          }),
      ),
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

  async findBySlug(slug: string): Promise<ArticleEntity | null> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: true,
        category: true,
        articleTags: {
          include: {
            tag: true,
          },
        },
        comments: {
          where: { status: 'APPROVED' },
          include: {
            author: true,
            replies: {
              include: {
                author: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!article) {
      return null;
    }

    // 增加浏览次数
    await this.prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    return new ArticleEntity({
      ...article,
      tags: article.articleTags.map((at) => at.tag),
    });
  }

  async findById(id: string): Promise<ArticleEntity | null> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: true,
        category: true,
        articleTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return article
      ? new ArticleEntity({
          ...article,
          tags: article.articleTags.map((at) => at.tag),
        })
      : null;
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    currentUser: UserEntity,
  ): Promise<ArticleEntity> {
    const article = await this.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 权限检查：只有作者或管理员可以编辑
    if (
      article.authorId !== currentUser.id &&
      !['ADMIN', 'MODERATOR'].includes(currentUser.role)
    ) {
      throw new ForbiddenException('无权编辑此文章');
    }

    const { tagIds, ...articleData } = updateArticleDto;

    // 如果状态改为已发布且之前未发布，设置发布时间
    if (
      articleData.status === ArticleStatus.PUBLISHED &&
      article.status !== ArticleStatus.PUBLISHED
    ) {
      articleData.publishedAt = new Date();
    }

    try {
      // 更新文章标签关联
      if (tagIds !== undefined) {
        // 删除现有标签关联
        await this.prisma.articleTag.deleteMany({
          where: { articleId: id },
        });

        // 创建新的标签关联
        if (tagIds.length > 0) {
          await this.prisma.articleTag.createMany({
            data: tagIds.map((tagId) => ({
              articleId: id,
              tagId,
            })),
          });

          // 更新标签使用次数
          await this.prisma.tag.updateMany({
            where: { id: { in: tagIds } },
            data: { useCount: { increment: 1 } },
          });
        }
      }

      const updatedArticle = await this.prisma.article.update({
        where: { id },
        data: articleData,
        include: {
          author: true,
          category: true,
          articleTags: {
            include: {
              tag: true,
            },
          },
        },
      });

      return new ArticleEntity({
        ...updatedArticle,
        tags: updatedArticle.articleTags.map((at) => at.tag),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('文章标题已存在');
        }
      }
      throw error;
    }
  }

  async remove(id: string, currentUser: UserEntity): Promise<void> {
    const article = await this.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 权限检查：只有作者或管理员可以删除
    if (
      article.authorId !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('无权删除此文章');
    }

    await this.prisma.article.delete({
      where: { id },
    });
  }

  async toggleLike(id: string): Promise<{ liked: boolean; likeCount: number }> {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 简单的点赞实现（实际项目中应该记录用户点赞状态）
    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        likeCount: { increment: 1 },
      },
    });

    return {
      liked: true,
      likeCount: updatedArticle.likeCount,
    };
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async getArticleStats(authorId?: string) {
    const where: Prisma.ArticleWhereInput = authorId ? { authorId } : {};

    const [total, published, draft, archived] = await Promise.all([
      this.prisma.article.count({ where }),
      this.prisma.article.count({
        where: { ...where, status: ArticleStatus.PUBLISHED },
      }),
      this.prisma.article.count({
        where: { ...where, status: ArticleStatus.DRAFT },
      }),
      this.prisma.article.count({
        where: { ...where, status: ArticleStatus.ARCHIVED },
      }),
    ]);

    return {
      total,
      published,
      draft,
      archived,
    };
  }
}
```

## 🎮 实现文章控制器

```typescript
// src/modules/articles/articles.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { ArticleEntity } from './entities/article.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('文章管理')
@Controller('articles')
@UseGuards(RolesGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: '创建文章' })
  @ApiResponse({
    status: 201,
    description: '文章创建成功',
    type: ArticleEntity
  })
  async create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser('id') authorId: string,
  ): Promise<ArticleEntity> {
    return this.articlesService.create(createArticleDto, authorId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: '获取文章列表' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ArticleEntity' }
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
  async findAll(@Query() queryDto: QueryArticleDto) {
    return this.articlesService.findAll(queryDto);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: '根据 slug 获取文章详情' })
  @ApiParam({ name: 'slug', description: '文章 slug' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: ArticleEntity
  })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async findBySlug(@Param('slug') slug: string): Promise<ArticleEntity> {
    const article = await this.articlesService.findBySlug(slug);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    return article;
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: '获取文章统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStats(@Query('authorId') authorId?: string) {
    return this.articlesService.getArticleStats(authorId);
  }

  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: '获取当前用户的文章列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMyArticles(
    @CurrentUser('id') authorId: string,
    @Query() queryDto: QueryArticleDto,
  ) {
    return this.articlesService.findAll({ ...queryDto, authorId });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '根据ID获取文章详情' })
  @ApiParam({ name: 'id', description: '文章ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: ArticleEntity
  })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ArticleEntity> {
    const article = await this.articlesService.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    return article;
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: '更新文章' })
  @ApiParam({ name: 'id', description: '文章ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: ArticleEntity
  })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @ApiResponse({ status: 403, description: '无权编辑此文章' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<ArticleEntity> {
    return this.articlesService.update(id, updateArticleDto, currentUser);
  }

  @ApiBearerAuth()
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '点赞文章' })
  @ApiParam({ name: 'id', description: '文章ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: '点赞成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async toggleLike(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.toggleLike(id);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除文章' })
  @ApiParam({ name: 'id', description: '文章ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @ApiResponse({ status: 403, description: '无权删除此文章' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<void> {
    return this.articlesService.remove(id, currentUser);
  }
}
```

## 📂 实现分类模块

### 1. 分类 DTO

```typescript
// src/modules/categories/dto/create-category.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: '分类名称',
    example: '技术',
    maxLength: 100
  })
  @IsString({ message: '分类名称必须是字符串' })
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(100, { message: '分类名称最多100个字符' })
  name: string;

  @ApiPropertyOptional({
    description: '分类描述',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: '分类描述必须是字符串' })
  @MaxLength(500, { message: '分类描述最多500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '分类颜色（十六进制）',
    example: '#3B82F6',
    pattern: '^#[0-9A-Fa-f]{6}$'
  })
  @IsOptional()
  @IsString({ message: '分类颜色必须是字符串' })
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: '分类颜色必须是有效的十六进制颜色值' })
  color?: string;

  @ApiPropertyOptional({
    description: '分类图标',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '分类图标必须是字符串' })
  @MaxLength(50, { message: '分类图标最多50个字符' })
  icon?: string;

  @ApiPropertyOptional({
    description: '排序顺序',
    default: 0
  })
  @IsOptional()
  @IsInt({ message: '排序顺序必须是整数' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'SEO标题',
    maxLength: 255
  })
  @IsOptional()
  @IsString({ message: 'SEO标题必须是字符串' })
  @MaxLength(255, { message: 'SEO标题最多255个字符' })
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO描述',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'SEO描述必须是字符串' })
  @MaxLength(500, { message: 'SEO描述最多500个字符' })
  metaDescription?: string;
}
```

```typescript
// src/modules/categories/dto/update-category.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

### 2. 分类服务

```typescript
// src/modules/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, ...rest } = createCategoryDto;

    // 生成 slug
    const slug = this.generateSlug(name);

    // 检查名称和 slug 是否已存在
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existingCategory) {
      throw new ConflictException('分类名称已存在');
    }

    try {
      return await this.prisma.category.create({
        data: {
          name,
          slug,
          ...rest,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('分类名称已存在');
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            articles: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    // 如果更新名称，需要重新生成 slug
    let slug = category.slug;
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      slug = this.generateSlug(updateCategoryDto.name);

      // 检查新的名称和 slug 是否已存在
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          OR: [{ name: updateCategoryDto.name }, { slug }],
          NOT: { id },
        },
      });

      if (existingCategory) {
        throw new ConflictException('分类名称已存在');
      }
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...updateCategoryDto,
          slug,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('分类名称已存在');
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    if (category._count.articles > 0) {
      throw new BadRequestException('该分类下还有文章，无法删除');
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
```

## 🏷️ 实现标签模块

### 1. 标签服务（简化版）

```typescript
// src/modules/tags/tags.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Tag, Prisma } from '@prisma/client';

export interface CreateTagDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  description?: string;
  color?: string;
}

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const { name, ...rest } = createTagDto;
    const slug = this.generateSlug(name);

    try {
      return await this.prisma.tag.create({
        data: {
          name,
          slug,
          ...rest,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('标签名称已存在');
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      orderBy: [{ useCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { articleTags: true },
        },
      },
    });
  }

  async findById(id: string): Promise<Tag | null> {
    return this.prisma.tag.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findById(id);
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    let slug = tag.slug;
    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      slug = this.generateSlug(updateTagDto.name);
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        ...updateTagDto,
        slug,
      },
    });
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findById(id);
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    await this.prisma.tag.delete({
      where: { id },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
```

## 💬 实现评论系统

### 1. 评论 DTO

```typescript
// src/modules/comments/dto/create-comment.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: '评论内容',
    example: '这篇文章写得很好！',
    maxLength: 1000
  })
  @IsString({ message: '评论内容必须是字符串' })
  @IsNotEmpty({ message: '评论内容不能为空' })
  @MaxLength(1000, { message: '评论内容最多1000个字符' })
  content: string;

  @ApiProperty({
    description: '文章ID',
    format: 'uuid'
  })
  @IsUUID(4, { message: '文章ID必须是有效的UUID' })
  @IsNotEmpty({ message: '文章ID不能为空' })
  articleId: string;

  @ApiPropertyOptional({
    description: '父评论ID（回复评论时使用）',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID(4, { message: '父评论ID必须是有效的UUID' })
  parentId?: string;
}
```

### 2. 评论服务

```typescript
// src/modules/comments/comments.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment, CommentStatus, UserRole } from '@prisma/client';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCommentDto: CreateCommentDto,
    authorId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Comment> {
    const { articleId, parentId, content } = createCommentDto;

    // 验证文章是否存在且允许评论
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (!article.allowComments) {
      throw new BadRequestException('该文章不允许评论');
    }

    // 如果是回复评论，验证父评论是否存在
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('父评论不存在');
      }

      if (parentComment.articleId !== articleId) {
        throw new BadRequestException('父评论不属于该文章');
      }
    }

    return this.prisma.comment.create({
      data: {
        content,
        articleId,
        authorId,
        parentId,
        ipAddress,
        userAgent,
        status: CommentStatus.PENDING, // 默认待审核
      },
      include: {
        author: true,
        replies: {
          include: {
            author: true,
          },
        },
      },
    });
  }

  async findByArticle(articleId: string) {
    return this.prisma.comment.findMany({
      where: {
        articleId,
        status: CommentStatus.APPROVED,
        parentId: null, // 只获取顶级评论
      },
      include: {
        author: true,
        replies: {
          where: { status: CommentStatus.APPROVED },
          include: {
            author: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: CommentStatus,
    currentUser: UserEntity,
  ): Promise<Comment> {
    // 只有管理员和版主可以更新评论状态
    if (!['ADMIN', 'MODERATOR'].includes(currentUser.role)) {
      throw new ForbiddenException('无权更新评论状态');
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string, currentUser: UserEntity): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 只有评论作者或管理员可以删除评论
    if (
      comment.authorId !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('无权删除此评论');
    }

    await this.prisma.comment.delete({
      where: { id },
    });
  }
}
```

## 🔧 配置模块

### 1. 文章模块

```typescript
// src/modules/articles/articles.module.ts
import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';

@Module({
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
```

### 2. 分类模块

```typescript
// src/modules/categories/categories.module.ts
import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

### 3. 更新主模块

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TagsModule } from './modules/tags/tags.module';
import { CommentsModule } from './modules/comments/comments.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
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
    AuthModule,
    ArticlesModule,
    CategoriesModule,
    TagsModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

## ✅ 测试文章管理功能

### 1. 创建分类

```bash
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "技术",
    "description": "技术相关文章",
    "color": "#3B82F6"
  }'
```

### 2. 创建标签

```bash
curl -X POST http://localhost:3000/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "NestJS",
    "description": "NestJS框架相关",
    "color": "#E11D48"
  }'
```

### 3. 创建文章

```bash
curl -X POST http://localhost:3000/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "NestJS 实战指南",
    "content": "这是一篇关于 NestJS 的详细教程...",
    "excerpt": "学习如何使用 NestJS 构建企业级应用",
    "categoryId": "CATEGORY_ID",
    "tagIds": ["TAG_ID_1", "TAG_ID_2"],
    "status": "PUBLISHED"
  }'
```

### 4. 获取文章列表

```bash
curl -X GET "http://localhost:3000/articles?page=1&limit=10&status=PUBLISHED"
```

### 5. 添加评论

```bash
curl -X POST http://localhost:3000/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "这篇文章写得很好！",
    "articleId": "ARTICLE_ID"
  }'
```

## 🎉 小结

在本章中，我们完成了：
- ✅ 创建了完整的文章管理系统
- ✅ 实现了文章的 CRUD 操作
- ✅ 创建了分类和标签管理
- ✅ 实现了文章搜索和分页功能
- ✅ 创建了评论系统
- ✅ 实现了权限控制和状态管理

在下一章中，我们将创建公共组件与工具，包括拦截器、管道、过滤器等通用组件。
