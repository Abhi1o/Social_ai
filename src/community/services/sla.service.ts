import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSLAConfigDto } from '../dto/create-sla-config.dto';
import { UpdateSLAConfigDto } from '../dto/update-sla-config.dto';
import {
  SLAConfig,
  SLATracking,
  SLAStatus,
  Conversation,
  Priority,
  Platform,
  ConversationType,
} from '@prisma/client';

@Injectable()
export class SLAService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new SLA configuration
   */
  async createConfig(
    workspaceId: string,
    dto: CreateSLAConfigDto,
  ): Promise<SLAConfig> {
    return this.prisma.sLAConfig.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        platform: dto.platform,
        type: dto.type,
        firstResponseTime: dto.firstResponseTime,
        resolutionTime: dto.resolutionTime,
        businessHoursOnly: dto.businessHoursOnly ?? false,
        businessHours: dto.businessHours,
        timezone: dto.timezone || 'UTC',
        escalationEnabled: dto.escalationEnabled ?? false,
        escalationTime: dto.escalationTime,
        escalateTo: dto.escalateTo || [],
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Get all SLA configs for a workspace
   */
  async findAllConfigs(
    workspaceId: string,
    isActive?: boolean,
  ): Promise<SLAConfig[]> {
    const where: any = { workspaceId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.sLAConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single SLA config
   */
  async findOneConfig(workspaceId: string, id: string): Promise<SLAConfig> {
    const config = await this.prisma.sLAConfig.findFirst({
      where: { id, workspaceId },
    });

    if (!config) {
      throw new NotFoundException('SLA config not found');
    }

    return config;
  }

  /**
   * Update an SLA config
   */
  async updateConfig(
    workspaceId: string,
    id: string,
    dto: UpdateSLAConfigDto,
  ): Promise<SLAConfig> {
    // Verify config exists
    await this.findOneConfig(workspaceId, id);

    return this.prisma.sLAConfig.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete an SLA config
   */
  async deleteConfig(workspaceId: string, id: string): Promise<void> {
    // Verify config exists
    await this.findOneConfig(workspaceId, id);

    await this.prisma.sLAConfig.delete({
      where: { id },
    });
  }

  /**
   * Find matching SLA config for a conversation
   */
  async findMatchingConfig(
    workspaceId: string,
    priority: Priority,
    platform: Platform,
    type: ConversationType,
  ): Promise<SLAConfig | null> {
    // Try to find most specific match first
    const configs = await this.prisma.sLAConfig.findMany({
      where: {
        workspaceId,
        isActive: true,
        priority,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Find best match: priority + platform + type > priority + platform > priority + type > priority
    const exactMatch = configs.find(
      (c) => c.platform === platform && c.type === type,
    );
    if (exactMatch) return exactMatch;

    const platformMatch = configs.find(
      (c) => c.platform === platform && !c.type,
    );
    if (platformMatch) return platformMatch;

    const typeMatch = configs.find((c) => !c.platform && c.type === type);
    if (typeMatch) return typeMatch;

    const priorityMatch = configs.find((c) => !c.platform && !c.type);
    if (priorityMatch) return priorityMatch;

    return null;
  }

  /**
   * Start SLA tracking for a conversation
   */
  async startTracking(conversation: Conversation): Promise<SLATracking | null> {
    // Find matching SLA config
    const config = await this.findMatchingConfig(
      conversation.workspaceId,
      conversation.priority,
      conversation.platform,
      conversation.type,
    );

    if (!config) {
      return null; // No SLA config applies
    }

    // Check if tracking already exists
    const existing = await this.prisma.sLATracking.findFirst({
      where: { conversationId: conversation.id },
    });

    if (existing) {
      return existing;
    }

    // Create new tracking
    return this.prisma.sLATracking.create({
      data: {
        conversationId: conversation.id,
        slaConfigId: config.id,
      },
    });
  }

  /**
   * Record first response
   */
  async recordFirstResponse(conversationId: string): Promise<SLATracking | null> {
    const tracking = await this.prisma.sLATracking.findFirst({
      where: { conversationId },
      include: { slaConfig: true },
    });

    if (!tracking || tracking.firstResponseAt) {
      return tracking;
    }

    const now = new Date();
    const responseTime = this.calculateMinutes(tracking.startedAt, now);
    const config = await this.prisma.sLAConfig.findUnique({
      where: { id: tracking.slaConfigId },
    });

    if (!config) return tracking;

    const breached = responseTime > config.firstResponseTime;

    return this.prisma.sLATracking.update({
      where: { id: tracking.id },
      data: {
        firstResponseAt: now,
        firstResponseTime: responseTime,
        firstResponseStatus: breached ? SLAStatus.BREACHED : SLAStatus.MET,
        firstResponseBreached: breached,
      },
    });
  }

  /**
   * Record resolution
   */
  async recordResolution(conversationId: string): Promise<SLATracking | null> {
    const tracking = await this.prisma.sLATracking.findFirst({
      where: { conversationId },
    });

    if (!tracking || tracking.resolvedAt) {
      return tracking;
    }

    const now = new Date();
    const resolutionTime = this.calculateMinutes(tracking.startedAt, now);
    const config = await this.prisma.sLAConfig.findUnique({
      where: { id: tracking.slaConfigId },
    });

    if (!config) return tracking;

    const breached = resolutionTime > config.resolutionTime;

    return this.prisma.sLATracking.update({
      where: { id: tracking.id },
      data: {
        resolvedAt: now,
        resolutionTime,
        resolutionStatus: breached ? SLAStatus.BREACHED : SLAStatus.MET,
        resolutionBreached: breached,
      },
    });
  }

  /**
   * Get SLA tracking for a conversation
   */
  async getTracking(conversationId: string): Promise<SLATracking | null> {
    return this.prisma.sLATracking.findFirst({
      where: { conversationId },
      include: {
        slaConfig: true,
      },
    });
  }

  /**
   * Get SLA statistics for workspace
   */
  async getStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalTracked: number;
    firstResponseMet: number;
    firstResponseBreached: number;
    resolutionMet: number;
    resolutionBreached: number;
    avgFirstResponseTime: number;
    avgResolutionTime: number;
    escalated: number;
  }> {
    const where: any = {
      conversation: { workspaceId },
    };

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = startDate;
      if (endDate) where.startedAt.lte = endDate;
    }

    const [
      total,
      firstResponseMet,
      firstResponseBreached,
      resolutionMet,
      resolutionBreached,
      escalated,
      avgTimes,
    ] = await Promise.all([
      this.prisma.sLATracking.count({ where }),
      this.prisma.sLATracking.count({
        where: { ...where, firstResponseStatus: SLAStatus.MET },
      }),
      this.prisma.sLATracking.count({
        where: { ...where, firstResponseStatus: SLAStatus.BREACHED },
      }),
      this.prisma.sLATracking.count({
        where: { ...where, resolutionStatus: SLAStatus.MET },
      }),
      this.prisma.sLATracking.count({
        where: { ...where, resolutionStatus: SLAStatus.BREACHED },
      }),
      this.prisma.sLATracking.count({
        where: { ...where, escalated: true },
      }),
      this.prisma.sLATracking.aggregate({
        where,
        _avg: {
          firstResponseTime: true,
          resolutionTime: true,
        },
      }),
    ]);

    return {
      totalTracked: total,
      firstResponseMet,
      firstResponseBreached,
      resolutionMet,
      resolutionBreached,
      avgFirstResponseTime: avgTimes._avg.firstResponseTime || 0,
      avgResolutionTime: avgTimes._avg.resolutionTime || 0,
      escalated,
    };
  }

  /**
   * Check for SLA breaches and escalate if needed
   */
  async checkAndEscalate(conversationId: string): Promise<{
    shouldEscalate: boolean;
    tracking: SLATracking | null;
  }> {
    const tracking = await this.prisma.sLATracking.findFirst({
      where: { conversationId },
      include: { slaConfig: true },
    });

    if (!tracking || tracking.escalated) {
      return { shouldEscalate: false, tracking };
    }

    const config = await this.prisma.sLAConfig.findUnique({
      where: { id: tracking.slaConfigId },
    });

    if (!config || !config.escalationEnabled || !config.escalationTime) {
      return { shouldEscalate: false, tracking };
    }

    const now = new Date();
    const elapsedMinutes = this.calculateMinutes(tracking.startedAt, now);

    if (elapsedMinutes >= config.escalationTime) {
      // Escalate
      const updatedTracking = await this.prisma.sLATracking.update({
        where: { id: tracking.id },
        data: {
          escalated: true,
          escalatedAt: now,
          escalateTo: config.escalateTo,
        },
      });

      return { shouldEscalate: true, tracking: updatedTracking };
    }

    return { shouldEscalate: false, tracking };
  }

  /**
   * Get conversations at risk of SLA breach
   */
  async getAtRiskConversations(workspaceId: string): Promise<
    Array<{
      conversation: Conversation;
      tracking: SLATracking;
      minutesUntilBreach: number;
    }>
  > {
    const trackings = await this.prisma.sLATracking.findMany({
      where: {
        conversation: { workspaceId },
        firstResponseStatus: SLAStatus.PENDING,
      },
      include: {
        conversation: true,
        slaConfig: true,
      },
    });

    const atRisk: Array<{
      conversation: Conversation;
      tracking: SLATracking;
      minutesUntilBreach: number;
    }> = [];

    for (const tracking of trackings) {
      const config = await this.prisma.sLAConfig.findUnique({
        where: { id: tracking.slaConfigId },
      });

      if (!config) continue;

      const elapsedMinutes = this.calculateMinutes(
        tracking.startedAt,
        new Date(),
      );
      const minutesUntilBreach = config.firstResponseTime - elapsedMinutes;

      // Consider at risk if less than 25% of time remaining
      if (minutesUntilBreach < config.firstResponseTime * 0.25) {
        atRisk.push({
          conversation: tracking.conversation,
          tracking,
          minutesUntilBreach,
        });
      }
    }

    return atRisk.sort((a, b) => a.minutesUntilBreach - b.minutesUntilBreach);
  }

  /**
   * Calculate minutes between two dates
   */
  private calculateMinutes(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }
}
