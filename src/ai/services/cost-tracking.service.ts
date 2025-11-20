import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  CostTrackingEntry,
  WorkspaceBudget,
  AIModel,
} from '../interfaces/ai.interface';

@Injectable()
export class CostTrackingService {
  private readonly logger = new Logger(CostTrackingService.name);
  private readonly DEFAULT_MONTHLY_BUDGET = 100; // $100 default
  private readonly DEFAULT_ALERT_THRESHOLD = 0.8; // 80%

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Track AI cost for a workspace
   */
  async trackCost(entry: CostTrackingEntry): Promise<void> {
    try {
      const month = this.getCurrentMonth();
      const key = `ai:cost:${entry.workspaceId}:${month}`;

      // Store individual entry
      await this.redis.zadd(
        `${key}:entries`,
        entry.timestamp.getTime(),
        JSON.stringify({
          model: entry.model,
          tokensUsed: entry.tokensUsed,
          cost: entry.cost,
          requestType: entry.requestType,
          timestamp: entry.timestamp,
        }),
      );

      // Increment total cost
      await this.redis.incrbyfloat(key, entry.cost);

      // Set expiry (keep for 13 months)
      await this.redis.expire(key, 13 * 30 * 24 * 60 * 60);
      await this.redis.expire(`${key}:entries`, 13 * 30 * 24 * 60 * 60);

      // Check budget threshold
      await this.checkBudgetThreshold(entry.workspaceId);

      this.logger.debug(
        `Tracked cost: ${entry.workspaceId} - $${entry.cost.toFixed(4)}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cost tracking error: ${err.message}`);
    }
  }

  /**
   * Get current month's spending for a workspace
   */
  async getCurrentSpend(workspaceId: string): Promise<number> {
    try {
      const month = this.getCurrentMonth();
      const key = `ai:cost:${workspaceId}:${month}`;
      const spend = await this.redis.get(key);
      return spend ? parseFloat(spend) : 0;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Get current spend error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Get workspace budget configuration
   */
  async getWorkspaceBudget(workspaceId: string): Promise<WorkspaceBudget> {
    try {
      const budgetKey = `ai:budget:${workspaceId}`;
      const budgetData = await this.redis.get(budgetKey);

      let monthlyBudget = this.DEFAULT_MONTHLY_BUDGET;
      let alertThreshold = this.DEFAULT_ALERT_THRESHOLD;

      if (budgetData) {
        const parsed = JSON.parse(budgetData);
        monthlyBudget = parsed.monthlyBudget || this.DEFAULT_MONTHLY_BUDGET;
        alertThreshold =
          parsed.alertThreshold || this.DEFAULT_ALERT_THRESHOLD;
      }

      const currentSpend = await this.getCurrentSpend(workspaceId);
      const isThrottled = currentSpend >= monthlyBudget;

      return {
        workspaceId,
        monthlyBudget,
        currentSpend,
        alertThreshold,
        isThrottled,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Get workspace budget error: ${err.message}`);
      return {
        workspaceId,
        monthlyBudget: this.DEFAULT_MONTHLY_BUDGET,
        currentSpend: 0,
        alertThreshold: this.DEFAULT_ALERT_THRESHOLD,
        isThrottled: false,
      };
    }
  }

  /**
   * Set workspace budget
   */
  async setWorkspaceBudget(
    workspaceId: string,
    monthlyBudget: number,
    alertThreshold?: number,
  ): Promise<void> {
    try {
      const budgetKey = `ai:budget:${workspaceId}`;
      await this.redis.set(
        budgetKey,
        JSON.stringify({
          monthlyBudget,
          alertThreshold: alertThreshold || this.DEFAULT_ALERT_THRESHOLD,
        }),
      );
      this.logger.log(
        `Set budget for ${workspaceId}: $${monthlyBudget}/month`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Set workspace budget error: ${err.message}`);
    }
  }

  /**
   * Check if workspace has exceeded budget threshold
   */
  private async checkBudgetThreshold(workspaceId: string): Promise<void> {
    try {
      const budget = await this.getWorkspaceBudget(workspaceId);

      if (budget.currentSpend >= budget.monthlyBudget) {
        this.logger.warn(
          `Workspace ${workspaceId} has exceeded budget: $${budget.currentSpend.toFixed(2)} / $${budget.monthlyBudget}`,
        );
        // TODO: Trigger alert/notification
      } else if (
        budget.currentSpend >=
        budget.monthlyBudget * budget.alertThreshold
      ) {
        this.logger.warn(
          `Workspace ${workspaceId} approaching budget limit: $${budget.currentSpend.toFixed(2)} / $${budget.monthlyBudget}`,
        );
        // TODO: Trigger warning notification
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Check budget threshold error: ${err.message}`);
    }
  }

  /**
   * Get cost breakdown by model
   */
  async getCostBreakdown(
    workspaceId: string,
    month?: string,
  ): Promise<Record<AIModel, number>> {
    try {
      const targetMonth = month || this.getCurrentMonth();
      const key = `ai:cost:${workspaceId}:${targetMonth}:entries`;

      const entries = await this.redis.zrange(key, 0, -1);
      const breakdown: Record<string, number> = {};

      for (const entryStr of entries) {
        const entry = JSON.parse(entryStr);
        breakdown[entry.model] = (breakdown[entry.model] || 0) + entry.cost;
      }

      return breakdown as Record<AIModel, number>;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Get cost breakdown error: ${err.message}`);
      return {} as Record<AIModel, number>;
    }
  }

  /**
   * Get cost history for a workspace
   */
  async getCostHistory(
    workspaceId: string,
    months: number = 6,
  ): Promise<Array<{ month: string; cost: number }>> {
    try {
      const history: Array<{ month: string; cost: number }> = [];
      const currentDate = new Date();

      for (let i = 0; i < months; i++) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1,
        );
        const month = this.formatMonth(date);
        const key = `ai:cost:${workspaceId}:${month}`;
        const cost = await this.redis.get(key);

        history.push({
          month,
          cost: cost ? parseFloat(cost) : 0,
        });
      }

      return history.reverse();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Get cost history error: ${err.message}`);
      return [];
    }
  }

  /**
   * Get current month string (YYYY-MM)
   */
  private getCurrentMonth(): string {
    return this.formatMonth(new Date());
  }

  /**
   * Format date to YYYY-MM
   */
  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
