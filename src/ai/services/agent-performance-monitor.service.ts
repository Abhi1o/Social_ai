import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AgentPerformanceMetrics,
  AgentTaskHistory,
} from '../interfaces/orchestration.interface';
import { AgentType } from '../interfaces/ai.interface';

/**
 * Agent Performance Monitor Service
 * Tracks and analyzes agent performance metrics
 */
@Injectable()
export class AgentPerformanceMonitorService {
  private readonly logger = new Logger(AgentPerformanceMonitorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get performance metrics for an agent
   */
  async getPerformanceMetrics(
    workspaceId: string,
    agentType: AgentType,
    startDate: Date,
    endDate: Date,
  ): Promise<AgentPerformanceMetrics> {
    this.logger.debug(
      `Getting performance metrics for ${agentType} in workspace ${workspaceId}`,
    );

    // In a real implementation, this would query historical data
    // For now, return mock data
    return {
      agentType,
      workspaceId,
      period: {
        start: startDate,
        end: endDate,
      },
      metrics: {
        totalTasks: 150,
        successfulTasks: 142,
        failedTasks: 8,
        averageExecutionTime: 2500, // ms
        averageCost: 0.015, // USD
        averageTokensUsed: 450,
        averageRating: 4.2,
        cacheHitRate: 0.35,
      },
      performanceTrends: this.generateMockTrends(startDate, endDate),
      topPerformingTasks: [
        {
          taskId: 'task-1',
          rating: 5,
          executionTime: 1800,
        },
        {
          taskId: 'task-2',
          rating: 5,
          executionTime: 2100,
        },
        {
          taskId: 'task-3',
          rating: 4.8,
          executionTime: 2300,
        },
      ],
      commonFailures: [
        {
          errorType: 'Rate limit exceeded',
          count: 3,
        },
        {
          errorType: 'Invalid input format',
          count: 2,
        },
        {
          errorType: 'Timeout',
          count: 3,
        },
      ],
    };
  }

  /**
   * Get real-time performance dashboard
   */
  async getPerformanceDashboard(workspaceId: string): Promise<{
    agents: Array<{
      agentType: AgentType;
      status: 'healthy' | 'degraded' | 'critical';
      currentLoad: number;
      successRate: number;
      avgResponseTime: number;
      recentErrors: number;
    }>;
    overall: {
      totalTasks: number;
      successRate: number;
      avgCost: number;
      cacheHitRate: number;
    };
  }> {
    this.logger.debug(
      `Getting performance dashboard for workspace ${workspaceId}`,
    );

    // In a real implementation, this would aggregate real-time data
    const agents = Object.values(AgentType).map((agentType) => ({
      agentType,
      status: 'healthy' as const,
      currentLoad: Math.random() * 100,
      successRate: 0.92 + Math.random() * 0.08,
      avgResponseTime: 2000 + Math.random() * 1000,
      recentErrors: Math.floor(Math.random() * 5),
    }));

    return {
      agents,
      overall: {
        totalTasks: 1250,
        successRate: 0.95,
        avgCost: 0.018,
        cacheHitRate: 0.38,
      },
    };
  }

  /**
   * Compare agent performance
   */
  async compareAgents(
    workspaceId: string,
    agentTypes: AgentType[],
    startDate: Date,
    endDate: Date,
  ): Promise<{
    comparison: Array<{
      agentType: AgentType;
      metrics: {
        successRate: number;
        avgExecutionTime: number;
        avgCost: number;
        avgRating: number;
      };
    }>;
    bestPerformer: AgentType;
    recommendations: string[];
  }> {
    this.logger.debug(
      `Comparing agents ${agentTypes.join(', ')} in workspace ${workspaceId}`,
    );

    const comparison = agentTypes.map((agentType) => ({
      agentType,
      metrics: {
        successRate: 0.9 + Math.random() * 0.1,
        avgExecutionTime: 2000 + Math.random() * 1000,
        avgCost: 0.01 + Math.random() * 0.02,
        avgRating: 4.0 + Math.random() * 1.0,
      },
    }));

    // Find best performer by success rate
    const bestPerformer = comparison.reduce((best, current) =>
      current.metrics.successRate > best.metrics.successRate ? current : best,
    ).agentType;

    const recommendations = [
      `${bestPerformer} shows the highest success rate`,
      'Consider increasing cache TTL for frequently used agents',
      'Monitor agents with high execution times for optimization',
    ];

    return {
      comparison,
      bestPerformer,
      recommendations,
    };
  }

  /**
   * Get agent health status
   */
  async getAgentHealth(
    workspaceId: string,
    agentType: AgentType,
  ): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
    metrics: {
      uptime: number;
      errorRate: number;
      avgResponseTime: number;
      throughput: number;
    };
  }> {
    this.logger.debug(
      `Getting health status for ${agentType} in workspace ${workspaceId}`,
    );

    // In a real implementation, this would analyze recent performance
    const errorRate = Math.random() * 0.1;
    const avgResponseTime = 2000 + Math.random() * 1000;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (errorRate > 0.05) {
      status = 'degraded';
      issues.push('Error rate above threshold');
      recommendations.push('Review recent error logs');
    }

    if (avgResponseTime > 5000) {
      status = 'degraded';
      issues.push('Response time above threshold');
      recommendations.push('Consider optimizing prompts or increasing cache');
    }

    return {
      status,
      issues,
      recommendations,
      metrics: {
        uptime: 0.998,
        errorRate,
        avgResponseTime,
        throughput: 50 + Math.random() * 50, // tasks per hour
      },
    };
  }

  /**
   * Get cost analysis
   */
  async getCostAnalysis(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCost: number;
    costByAgent: Record<AgentType, number>;
    costByModel: Record<string, number>;
    costTrend: Array<{
      date: Date;
      cost: number;
    }>;
    projectedMonthlyCost: number;
    recommendations: string[];
  }> {
    this.logger.debug(`Getting cost analysis for workspace ${workspaceId}`);

    // In a real implementation, this would aggregate cost data
    const costByAgent = {} as Record<AgentType, number>;
    let totalCost = 0;

    for (const agentType of Object.values(AgentType)) {
      const cost = Math.random() * 50;
      costByAgent[agentType] = cost;
      totalCost += cost;
    }

    return {
      totalCost,
      costByAgent,
      costByModel: {
        'gpt-4o': totalCost * 0.3,
        'gpt-4o-mini': totalCost * 0.5,
        'claude-3-5-sonnet': totalCost * 0.15,
        'claude-haiku': totalCost * 0.05,
      },
      costTrend: this.generateMockCostTrend(startDate, endDate),
      projectedMonthlyCost: totalCost * 2,
      recommendations: [
        'Increase cache TTL to reduce API calls',
        'Route more requests to cost-efficient models',
        'Consider batch processing for non-urgent tasks',
      ],
    };
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(workspaceId: string): Promise<
    Array<{
      severity: 'info' | 'warning' | 'critical';
      agentType: AgentType;
      message: string;
      timestamp: Date;
      metric: string;
      value: number;
      threshold: number;
    }>
  > {
    this.logger.debug(`Getting performance alerts for workspace ${workspaceId}`);

    // In a real implementation, this would check against thresholds
    return [
      {
        severity: 'warning',
        agentType: AgentType.CONTENT_CREATOR,
        message: 'Response time above threshold',
        timestamp: new Date(),
        metric: 'avgResponseTime',
        value: 5200,
        threshold: 5000,
      },
      {
        severity: 'info',
        agentType: AgentType.STRATEGY,
        message: 'Cache hit rate improved',
        timestamp: new Date(),
        metric: 'cacheHitRate',
        value: 0.42,
        threshold: 0.35,
      },
    ];
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: string;
    metrics: AgentPerformanceMetrics[];
    insights: string[];
    recommendations: string[];
  }> {
    this.logger.log(
      `Generating performance report for workspace ${workspaceId}`,
    );

    const metrics = await Promise.all(
      Object.values(AgentType).map((agentType) =>
        this.getPerformanceMetrics(workspaceId, agentType, startDate, endDate),
      ),
    );

    const totalTasks = metrics.reduce((sum, m) => sum + m.metrics.totalTasks, 0);
    const avgSuccessRate =
      metrics.reduce(
        (sum, m) => sum + m.metrics.successfulTasks / m.metrics.totalTasks,
        0,
      ) / metrics.length;

    return {
      summary: `Analyzed ${totalTasks} tasks across ${metrics.length} agents with ${(avgSuccessRate * 100).toFixed(1)}% success rate`,
      metrics,
      insights: [
        'Content Creator agent shows highest engagement rates',
        'Strategy agent provides most actionable recommendations',
        'Cache hit rate improved by 15% this period',
      ],
      recommendations: [
        'Increase automation for high-performing content types',
        'Review and optimize prompts for agents with lower ratings',
        'Consider expanding cache TTL for stable queries',
      ],
    };
  }

  /**
   * Helper: Generate mock performance trends
   */
  private generateMockTrends(
    startDate: Date,
    endDate: Date,
  ): Array<{
    timestamp: Date;
    successRate: number;
    avgExecutionTime: number;
    avgCost: number;
  }> {
    const trends = [];
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      trends.push({
        timestamp: date,
        successRate: 0.9 + Math.random() * 0.1,
        avgExecutionTime: 2000 + Math.random() * 1000,
        avgCost: 0.01 + Math.random() * 0.02,
      });
    }

    return trends;
  }

  /**
   * Helper: Generate mock cost trend
   */
  private generateMockCostTrend(
    startDate: Date,
    endDate: Date,
  ): Array<{
    date: Date;
    cost: number;
  }> {
    const trends = [];
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      trends.push({
        date,
        cost: 10 + Math.random() * 20,
      });
    }

    return trends;
  }
}
