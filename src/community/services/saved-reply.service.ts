import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSavedReplyDto } from '../dto/create-saved-reply.dto';
import { UpdateSavedReplyDto } from '../dto/update-saved-reply.dto';
import { SavedReply } from '@prisma/client';

@Injectable()
export class SavedReplyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new saved reply template
   */
  async create(
    workspaceId: string,
    createdBy: string,
    dto: CreateSavedReplyDto,
  ): Promise<SavedReply> {
    // Extract variables from content (e.g., {{name}}, {{product}})
    const extractedVariables = this.extractVariables(dto.content);

    return this.prisma.savedReply.create({
      data: {
        workspaceId,
        createdBy,
        name: dto.name,
        content: dto.content,
        category: dto.category,
        variables: dto.variables || extractedVariables,
        tags: dto.tags || [],
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Get all saved replies for a workspace
   */
  async findAll(
    workspaceId: string,
    options?: {
      category?: string;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<SavedReply[]> {
    const where: any = { workspaceId };

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { content: { contains: options.search, mode: 'insensitive' } },
        { tags: { has: options.search } },
      ];
    }

    return this.prisma.savedReply.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single saved reply by ID
   */
  async findOne(workspaceId: string, id: string): Promise<SavedReply> {
    const reply = await this.prisma.savedReply.findFirst({
      where: { id, workspaceId },
    });

    if (!reply) {
      throw new NotFoundException('Saved reply not found');
    }

    return reply;
  }

  /**
   * Update a saved reply
   */
  async update(
    workspaceId: string,
    id: string,
    dto: UpdateSavedReplyDto,
  ): Promise<SavedReply> {
    // Verify the reply exists and belongs to workspace
    await this.findOne(workspaceId, id);

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.content !== undefined) {
      updateData.content = dto.content;
      // Re-extract variables if content changed
      updateData.variables = this.extractVariables(dto.content);
    }
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.variables !== undefined) updateData.variables = dto.variables;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.savedReply.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a saved reply
   */
  async delete(workspaceId: string, id: string): Promise<void> {
    // Verify the reply exists and belongs to workspace
    await this.findOne(workspaceId, id);

    await this.prisma.savedReply.delete({
      where: { id },
    });
  }

  /**
   * Apply a template with variable substitution
   */
  async applyTemplate(
    workspaceId: string,
    templateId: string,
    variables: Record<string, string> = {},
  ): Promise<{ content: string; template: SavedReply }> {
    const template = await this.findOne(workspaceId, templateId);

    // Substitute variables in content
    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, value);
    }

    // Update usage statistics
    await this.prisma.savedReply.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return { content, template };
  }

  /**
   * Get template categories
   */
  async getCategories(workspaceId: string): Promise<string[]> {
    const replies = await this.prisma.savedReply.findMany({
      where: { workspaceId, isActive: true },
      select: { category: true },
      distinct: ['category'],
    });

    return replies
      .map((r) => r.category)
      .filter((c): c is string => c !== null)
      .sort();
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(workspaceId: string): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    totalUsage: number;
    topTemplates: Array<{ id: string; name: string; usageCount: number }>;
  }> {
    const [all, active, topTemplates] = await Promise.all([
      this.prisma.savedReply.count({ where: { workspaceId } }),
      this.prisma.savedReply.count({ where: { workspaceId, isActive: true } }),
      this.prisma.savedReply.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, name: true, usageCount: true },
        orderBy: { usageCount: 'desc' },
        take: 10,
      }),
    ]);

    const totalUsage = topTemplates.reduce(
      (sum, t) => sum + t.usageCount,
      0,
    );

    return {
      totalTemplates: all,
      activeTemplates: active,
      totalUsage,
      topTemplates,
    };
  }

  /**
   * Extract variables from template content
   * Finds patterns like {{variable}} or {{ variable }}
   */
  private extractVariables(content: string): string[] {
    const regex = /{{\\s*([a-zA-Z0-9_]+)\\s*}}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }
}
