import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutomationMode,
  AutomationConfig,
  AutomationRule,
  RuleCondition,
  RuleAction,
} from '../interfaces/orchestration.interface';
import { AgentType } from '../interfaces/ai.interface';

/**
 * Automation Configuration Service
 * Manages automation modes and rules for AI agents
 */
@Injectable()
export class AutomationConfigService {
  private readonly logger = new Logger(AutomationConfigService.name);
  private configs: Map<string, AutomationConfig> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get automation configuration for a workspace
   */
  async getConfig(workspaceId: string): Promise<AutomationConfig> {
    this.logger.debug(`Getting automation config for workspace ${workspaceId}`);

    // Check cache first
    if (this.configs.has(workspaceId)) {
      return this.configs.get(workspaceId)!;
    }

    // In a real implementation, this would query the database
    // For now, return default config
    const defaultConfig: AutomationConfig = {
      workspaceId,
      mode: AutomationMode.ASSISTED,
      enabledAgents: Object.values(AgentType),
      scheduleAutomation: false,
      contentApprovalRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(workspaceId, defaultConfig);
    return defaultConfig;
  }

  /**
   * Update automation configuration
   */
  async updateConfig(
    workspaceId: string,
    updates: Partial<AutomationConfig>,
  ): Promise<AutomationConfig> {
    this.logger.log(
      `Updating automation config for workspace ${workspaceId}: mode=${updates.mode}`,
    );

    const currentConfig = await this.getConfig(workspaceId);
    const updatedConfig: AutomationConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date(),
    };

    this.configs.set(workspaceId, updatedConfig);

    // In a real implementation, this would update the database
    return updatedConfig;
  }

  /**
   * Set automation mode
   */
  async setMode(
    workspaceId: string,
    mode: AutomationMode,
  ): Promise<AutomationConfig> {
    this.logger.log(
      `Setting automation mode for workspace ${workspaceId} to ${mode}`,
    );

    return this.updateConfig(workspaceId, { mode });
  }

  /**
   * Add automation rule
   */
  async addRule(
    workspaceId: string,
    rule: Omit<AutomationRule, 'id'>,
  ): Promise<AutomationConfig> {
    this.logger.debug(`Adding automation rule for workspace ${workspaceId}`);

    const config = await this.getConfig(workspaceId);
    const newRule: AutomationRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random()}`,
    };

    const rules = config.rules || [];
    rules.push(newRule);

    return this.updateConfig(workspaceId, { rules });
  }

  /**
   * Remove automation rule
   */
  async removeRule(
    workspaceId: string,
    ruleId: string,
  ): Promise<AutomationConfig> {
    this.logger.debug(
      `Removing automation rule ${ruleId} for workspace ${workspaceId}`,
    );

    const config = await this.getConfig(workspaceId);
    const rules = (config.rules || []).filter((r) => r.id !== ruleId);

    return this.updateConfig(workspaceId, { rules });
  }

  /**
   * Update automation rule
   */
  async updateRule(
    workspaceId: string,
    ruleId: string,
    updates: Partial<AutomationRule>,
  ): Promise<AutomationConfig> {
    this.logger.debug(
      `Updating automation rule ${ruleId} for workspace ${workspaceId}`,
    );

    const config = await this.getConfig(workspaceId);
    const rules = (config.rules || []).map((r) =>
      r.id === ruleId ? { ...r, ...updates } : r,
    );

    return this.updateConfig(workspaceId, { rules });
  }

  /**
   * Evaluate rules for a given context
   */
  async evaluateRules(
    workspaceId: string,
    context: {
      platform?: string;
      contentType?: string;
      time?: Date;
      performance?: any;
      sentiment?: number;
    },
  ): Promise<{
    shouldAutoPublish: boolean;
    requiresApproval: boolean;
    matchedRules: AutomationRule[];
  }> {
    this.logger.debug(`Evaluating rules for workspace ${workspaceId}`);

    const config = await this.getConfig(workspaceId);

    // If no rules or not in hybrid mode, use default behavior
    if (!config.rules || config.mode !== AutomationMode.HYBRID) {
      return {
        shouldAutoPublish: config.mode === AutomationMode.FULL_AUTONOMOUS,
        requiresApproval:
          config.mode === AutomationMode.ASSISTED ||
          config.contentApprovalRequired,
        matchedRules: [],
      };
    }

    // Evaluate rules
    const matchedRules: AutomationRule[] = [];
    for (const rule of config.rules) {
      if (!rule.isActive) continue;

      if (this.evaluateCondition(rule.condition, context)) {
        matchedRules.push(rule);
      }
    }

    // Sort by priority (higher first)
    matchedRules.sort((a, b) => b.priority - a.priority);

    // Apply highest priority rule
    let shouldAutoPublish = false;
    let requiresApproval = true;

    if (matchedRules.length > 0) {
      const topRule = matchedRules[0];
      if (topRule.action.type === 'auto_publish') {
        shouldAutoPublish = true;
        requiresApproval = false;
      } else if (topRule.action.type === 'require_approval') {
        shouldAutoPublish = false;
        requiresApproval = true;
      }
    }

    return {
      shouldAutoPublish,
      requiresApproval,
      matchedRules,
    };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: any,
  ): boolean {
    const contextValue = context[condition.type];
    if (contextValue === undefined) return false;

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'contains':
        return String(contextValue).includes(String(condition.value));
      case 'greater_than':
        return Number(contextValue) > Number(condition.value);
      case 'less_than':
        return Number(contextValue) < Number(condition.value);
      default:
        return false;
    }
  }

  /**
   * Enable/disable specific agents
   */
  async setEnabledAgents(
    workspaceId: string,
    agents: AgentType[],
  ): Promise<AutomationConfig> {
    this.logger.log(
      `Setting enabled agents for workspace ${workspaceId}: ${agents.join(', ')}`,
    );

    return this.updateConfig(workspaceId, { enabledAgents: agents });
  }

  /**
   * Check if an agent is enabled
   */
  async isAgentEnabled(
    workspaceId: string,
    agentType: AgentType,
  ): Promise<boolean> {
    const config = await this.getConfig(workspaceId);
    return config.enabledAgents.includes(agentType);
  }

  /**
   * Get automation statistics
   */
  async getAutomationStats(workspaceId: string): Promise<{
    mode: AutomationMode;
    totalRules: number;
    activeRules: number;
    enabledAgents: number;
    automationRate: number;
  }> {
    const config = await this.getConfig(workspaceId);

    return {
      mode: config.mode,
      totalRules: config.rules?.length || 0,
      activeRules: config.rules?.filter((r) => r.isActive).length || 0,
      enabledAgents: config.enabledAgents.length,
      automationRate: 0, // Would be calculated from historical data
    };
  }

  /**
   * Create default rules for hybrid mode
   */
  async createDefaultRules(workspaceId: string): Promise<AutomationConfig> {
    this.logger.log(`Creating default rules for workspace ${workspaceId}`);

    const defaultRules: Omit<AutomationRule, 'id'>[] = [
      {
        name: 'Auto-publish high-performing content types',
        condition: {
          type: 'performance',
          operator: 'greater_than',
          value: 0.8,
        },
        action: {
          type: 'auto_publish',
        },
        priority: 10,
        isActive: true,
      },
      {
        name: 'Require approval for negative sentiment',
        condition: {
          type: 'sentiment',
          operator: 'less_than',
          value: 0.3,
        },
        action: {
          type: 'require_approval',
        },
        priority: 20,
        isActive: true,
      },
      {
        name: 'Auto-publish during peak hours',
        condition: {
          type: 'time',
          operator: 'equals',
          value: 'peak',
        },
        action: {
          type: 'auto_publish',
        },
        priority: 5,
        isActive: true,
      },
    ];

    let config = await this.getConfig(workspaceId);
    for (const rule of defaultRules) {
      config = await this.addRule(workspaceId, rule);
    }

    return config;
  }
}
