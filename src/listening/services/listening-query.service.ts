import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListeningQueryDto } from '../dto/create-listening-query.dto';
import { UpdateListeningQueryDto } from '../dto/update-listening-query.dto';
import { BooleanQueryBuilderService } from './boolean-query-builder.service';
import { Platform } from '@prisma/client';

/**
 * Service for managing listening queries
 */
@Injectable()
export class ListeningQueryService {
  // Supported languages (42+ languages as per requirements)
  private readonly SUPPORTED_LANGUAGES = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
    'ar', 'hi', 'bn', 'pa', 'te', 'mr', 'ta', 'ur', 'gu', 'kn',
    'ml', 'or', 'as', 'mai', 'bho', 'ne', 'si', 'my', 'km', 'lo',
    'th', 'vi', 'id', 'ms', 'tl', 'nl', 'pl', 'uk', 'ro', 'cs',
    'sv', 'no', 'da', 'fi', 'el', 'he', 'tr', 'fa',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBuilder: BooleanQueryBuilderService,
  ) {}

  /**
   * Create a new listening query
   */
  async create(workspaceId: string, dto: CreateListeningQueryDto) {
    // Validate the boolean query
    const validation = this.queryBuilder.validate(dto.query);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid query: ${validation.errors.join(', ')}`);
    }

    // Validate languages
    if (dto.languages && dto.languages.length > 0) {
      const invalidLanguages = dto.languages.filter(
        lang => !this.SUPPORTED_LANGUAGES.includes(lang.toLowerCase()),
      );
      if (invalidLanguages.length > 0) {
        throw new BadRequestException(
          `Unsupported languages: ${invalidLanguages.join(', ')}. ` +
          `Supported languages: ${this.SUPPORTED_LANGUAGES.join(', ')}`,
        );
      }
    }

    // Validate platforms
    if (!dto.platforms || dto.platforms.length === 0) {
      throw new BadRequestException('At least one platform must be specified');
    }

    // Parse the query to extract keywords
    const parsed = this.queryBuilder.parse(dto.query);

    return this.prisma.listeningQuery.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        keywords: dto.keywords,
        query: dto.query,
        platforms: dto.platforms,
        languages: dto.languages?.map(l => l.toLowerCase()) || [],
        locations: dto.locations || [],
        excludeKeywords: dto.excludeKeywords || [],
        includeRetweets: dto.includeRetweets ?? true,
        minFollowers: dto.minFollowers,
        alertsEnabled: dto.alertsEnabled ?? false,
        alertThreshold: dto.alertThreshold,
        alertRecipients: dto.alertRecipients || [],
        isActive: true,
      },
    });
  }

  /**
   * Find all listening queries for a workspace
   */
  async findAll(workspaceId: string, includeInactive = false) {
    const where: any = { workspaceId };
    
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.listeningQuery.findMany({
      where,
      include: {
        _count: {
          select: {
            mentions: true,
            alerts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find a listening query by ID
   */
  async findOne(id: string, workspaceId: string) {
    const query = await this.prisma.listeningQuery.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mentions: true,
            alerts: true,
          },
        },
      },
    });

    if (!query) {
      throw new NotFoundException(`Listening query with ID ${id} not found`);
    }

    if (query.workspaceId !== workspaceId) {
      throw new ForbiddenException('Access denied to this listening query');
    }

    return query;
  }

  /**
   * Update a listening query
   */
  async update(id: string, workspaceId: string, dto: UpdateListeningQueryDto) {
    // Verify ownership
    await this.findOne(id, workspaceId);

    // Validate query if provided
    if (dto.query) {
      const validation = this.queryBuilder.validate(dto.query);
      if (!validation.valid) {
        throw new BadRequestException(`Invalid query: ${validation.errors.join(', ')}`);
      }
    }

    // Validate languages if provided
    if (dto.languages && dto.languages.length > 0) {
      const invalidLanguages = dto.languages.filter(
        lang => !this.SUPPORTED_LANGUAGES.includes(lang.toLowerCase()),
      );
      if (invalidLanguages.length > 0) {
        throw new BadRequestException(
          `Unsupported languages: ${invalidLanguages.join(', ')}`,
        );
      }
    }

    // Validate platforms if provided
    if (dto.platforms && dto.platforms.length === 0) {
      throw new BadRequestException('At least one platform must be specified');
    }

    const updateData: any = {};
    
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.keywords !== undefined) updateData.keywords = dto.keywords;
    if (dto.query !== undefined) updateData.query = dto.query;
    if (dto.platforms !== undefined) updateData.platforms = dto.platforms;
    if (dto.languages !== undefined) {
      updateData.languages = dto.languages.map(l => l.toLowerCase());
    }
    if (dto.locations !== undefined) updateData.locations = dto.locations;
    if (dto.excludeKeywords !== undefined) updateData.excludeKeywords = dto.excludeKeywords;
    if (dto.includeRetweets !== undefined) updateData.includeRetweets = dto.includeRetweets;
    if (dto.minFollowers !== undefined) updateData.minFollowers = dto.minFollowers;
    if (dto.alertsEnabled !== undefined) updateData.alertsEnabled = dto.alertsEnabled;
    if (dto.alertThreshold !== undefined) updateData.alertThreshold = dto.alertThreshold;
    if (dto.alertRecipients !== undefined) updateData.alertRecipients = dto.alertRecipients;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.listeningQuery.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            mentions: true,
            alerts: true,
          },
        },
      },
    });
  }

  /**
   * Delete a listening query
   */
  async remove(id: string, workspaceId: string) {
    // Verify ownership
    await this.findOne(id, workspaceId);

    await this.prisma.listeningQuery.delete({
      where: { id },
    });

    return { message: 'Listening query deleted successfully' };
  }

  /**
   * Activate a listening query
   */
  async activate(id: string, workspaceId: string) {
    await this.findOne(id, workspaceId);

    return this.prisma.listeningQuery.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Deactivate a listening query
   */
  async deactivate(id: string, workspaceId: string) {
    await this.findOne(id, workspaceId);

    return this.prisma.listeningQuery.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get platform-specific query configuration
   */
  async getPlatformQuery(id: string, workspaceId: string, platform: Platform) {
    const query = await this.findOne(id, workspaceId);

    if (!query.platforms.includes(platform)) {
      throw new BadRequestException(
        `Query is not configured for platform: ${platform}`,
      );
    }

    const parsed = this.queryBuilder.parse(query.query);
    const platformQuery = this.queryBuilder.toPlatformQuery(parsed, platform);

    return {
      query: platformQuery,
      config: {
        keywords: query.keywords,
        languages: query.languages,
        locations: query.locations,
        excludeKeywords: query.excludeKeywords,
        includeRetweets: query.includeRetweets,
        minFollowers: query.minFollowers,
      },
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return {
      languages: this.SUPPORTED_LANGUAGES,
      count: this.SUPPORTED_LANGUAGES.length,
    };
  }

  /**
   * Validate a query without saving
   */
  validateQuery(query: string) {
    const validation = this.queryBuilder.validate(query);
    
    if (validation.valid) {
      const parsed = this.queryBuilder.parse(query);
      return {
        valid: true,
        parsed: {
          keywords: parsed.keywords,
          phrases: parsed.phrases,
          excludedTerms: parsed.excludedTerms,
        },
      };
    }

    return {
      valid: false,
      errors: validation.errors,
    };
  }

  /**
   * Get query statistics
   */
  async getStatistics(id: string, workspaceId: string) {
    const query = await this.findOne(id, workspaceId);

    const [
      totalMentions,
      mentionsLast24h,
      mentionsLast7d,
      sentimentBreakdown,
      platformBreakdown,
    ] = await Promise.all([
      // Total mentions
      this.prisma.listeningMention.count({
        where: { queryId: id },
      }),
      
      // Mentions in last 24 hours
      this.prisma.listeningMention.count({
        where: {
          queryId: id,
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Mentions in last 7 days
      this.prisma.listeningMention.count({
        where: {
          queryId: id,
          publishedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Sentiment breakdown
      this.prisma.listeningMention.groupBy({
        by: ['sentiment'],
        where: { queryId: id },
        _count: true,
      }),
      
      // Platform breakdown
      this.prisma.listeningMention.groupBy({
        by: ['platform'],
        where: { queryId: id },
        _count: true,
      }),
    ]);

    return {
      query: {
        id: query.id,
        name: query.name,
        isActive: query.isActive,
      },
      mentions: {
        total: totalMentions,
        last24h: mentionsLast24h,
        last7d: mentionsLast7d,
      },
      sentiment: sentimentBreakdown.reduce((acc, item) => {
        acc[item.sentiment.toLowerCase()] = item._count;
        return acc;
      }, {} as Record<string, number>),
      platforms: platformBreakdown.reduce((acc, item) => {
        acc[item.platform] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
