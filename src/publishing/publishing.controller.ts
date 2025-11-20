import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Header,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublishingService } from './publishing.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { BulkEditDto } from './dto/bulk-edit.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { ExportPostsDto } from './dto/export-posts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/posts')
@UseGuards(JwtAuthGuard)
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  /**
   * Create a new post
   * POST /api/posts
   */
  @Post()
  async createPost(@Request() req: any, @Body() createPostDto: CreatePostDto) {
    return this.publishingService.createPost(
      req.user.workspaceId,
      req.user.userId,
      createPostDto,
    );
  }

  /**
   * Get all posts with filtering
   * GET /api/posts
   */
  @Get()
  async getPosts(@Request() req: any, @Query() query: QueryPostsDto) {
    return this.publishingService.getPosts(req.user.workspaceId, query);
  }

  /**
   * Get a single post
   * GET /api/posts/:id
   */
  @Get(':id')
  async getPost(@Request() req: any, @Param('id') id: string) {
    return this.publishingService.getPost(req.user.workspaceId, id);
  }

  /**
   * Update a post
   * PUT /api/posts/:id
   */
  @Put(':id')
  async updatePost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.publishingService.updatePost(req.user.workspaceId, id, updatePostDto);
  }

  /**
   * Delete a post
   * DELETE /api/posts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Request() req: any, @Param('id') id: string) {
    await this.publishingService.deletePost(req.user.workspaceId, id);
  }

  /**
   * Publish a post immediately
   * POST /api/posts/:id/publish
   */
  @Post(':id/publish')
  async publishPost(@Request() req: any, @Param('id') id: string) {
    return this.publishingService.publishPost(req.user.workspaceId, id);
  }

  /**
   * Bulk schedule posts from CSV upload
   * POST /api/posts/bulk/schedule
   */
  @Post('bulk/schedule')
  @UseInterceptors(FileInterceptor('file'))
  async bulkSchedule(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    const csvContent = file.buffer.toString('utf-8');
    return this.publishingService.bulkScheduleFromCsv(
      req.user.workspaceId,
      req.user.userId,
      csvContent,
    );
  }

  /**
   * Bulk edit posts
   * PUT /api/posts/bulk/edit
   */
  @Put('bulk/edit')
  async bulkEdit(@Request() req: any, @Body() bulkEditDto: BulkEditDto) {
    return this.publishingService.bulkEditPosts(req.user.workspaceId, bulkEditDto);
  }

  /**
   * Bulk delete posts
   * DELETE /api/posts/bulk/delete
   */
  @Delete('bulk/delete')
  async bulkDelete(@Request() req: any, @Body() bulkDeleteDto: BulkDeleteDto) {
    return this.publishingService.bulkDeletePosts(req.user.workspaceId, bulkDeleteDto);
  }

  /**
   * Export posts to CSV
   * GET /api/posts/export
   */
  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="posts-export.csv"')
  async exportPosts(@Request() req: any, @Query() exportDto: ExportPostsDto) {
    return this.publishingService.exportPosts(req.user.workspaceId, exportDto);
  }

  /**
   * Get CSV template for bulk upload
   * GET /api/posts/bulk/template
   */
  @Get('bulk/template')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="bulk-schedule-template.csv"')
  async getCsvTemplate() {
    return this.publishingService.getCsvTemplate();
  }
}
