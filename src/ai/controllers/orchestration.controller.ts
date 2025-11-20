import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EnhancedMultiAgentOrchestratorService } from '../services/enhanced-multi-agent-orchestrator.service';
import { AutomationConfigService } from '../services/automation-config.service';
import { AgentTaskHistoryService } from '../services/agent-task-history.service';
import { AgentPerformanceMonitorService } from '../services/agent-performance-monitor.service';
import { AgentCommunicationService } from '../services/agent-communication.service';
import { AgentType } from '../interfaces/ai.interface';
import {
  AutomationMode,
  AutomationRule,
} from '../interfaces/orchestration.interface';

/**
 * Orchestration Controller
 * Manages multi-agent orchestration, automation configuration, and performance monitoring
 */
@Controller('api/ai/orchestration')
@UseGuards(JwtAuthGuard)
export class OrchestrationController {
  constructor(
    private readonly orchestrator: EnhancedMultiAgentOrchestratorService,
    private readonly automationConfig: AutomationConfigService,
    private readonly taskHistory: AgentTaskHistoryService,
    private readonly performanceMonitor: AgentPerformanceMonitorService,
    private readonly communication: AgentCommunicationService,
  ) {}

  /**
   * Execute a collaborative workflow
   */
  @Post('workflows/execute')
  async executeWorkflow(
    @Request() req: any,
    @Body()
    body: {
      workflowName: string;
      agents: AgentType[];
      input: any;
      context?: any;
    },
  ) {
    const workspaceId = req.user.workspaceId;

    if (body.context) {
      return this.orchestrator.executeWithAutomation(
        workspaceId,
        body.workflowName,
        body.agents,
        body.input,
        body.context,
      );
    }

    const result = await this.orchestrator.executeCollaborativeWorkflow(
      workspaceId,
      body.workflowName,
      body.agents,
      body.input,
    );

    return { result };
  }

  /**
   * Execute agent with learning
   */
  @Post('agents/:agentType/execute-with-learning')
  async executeWithLearning(
    @Request() req: any,
    @Param('agentType') agentType: AgentType,
    @Body() body: { input: any },
  ) {
    const workspaceId = req.user.workspaceId;

    return this.orchestrator.executeWithLearning(
      workspaceId,
      agentType,
      body.input,
    );
  }

  /**
   * Get workflow context
   */
  @Get('workflows/:workflowId/context')
  async getWorkflowContext(@Param('workflowId') workflowId: string) {
    return this.orchestrator.getWorkflowContext(workflowId);
  }

  /**
   * Get orchestration statistics
   */
  @Get('stats')
  async getOrchestrationStats(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.orchestrator.getOrchestrationStats(workspaceId);
  }

  // ===== Automation Configuration =====

  /**
   * Get automation configuration
   */
  @Get('automation/config')
  async getAutomationConfig(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.getConfig(workspaceId);
  }

  /**
   * Update automation configuration
   */
  @Put('automation/config')
  async updateAutomationConfig(
    @Request() req: any,
    @Body() body: { mode?: AutomationMode; [key: string]: any },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.updateConfig(workspaceId, body);
  }

  /**
   * Set automation mode
   */
  @Put('automation/mode')
  async setAutomationMode(
    @Request() req: any,
    @Body() body: { mode: AutomationMode },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.setMode(workspaceId, body.mode);
  }

  /**
   * Add automation rule
   */
  @Post('automation/rules')
  async addAutomationRule(
    @Request() req: any,
    @Body() body: Omit<AutomationRule, 'id'>,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.addRule(workspaceId, body);
  }

  /**
   * Update automation rule
   */
  @Put('automation/rules/:ruleId')
  async updateAutomationRule(
    @Request() req: any,
    @Param('ruleId') ruleId: string,
    @Body() body: Partial<AutomationRule>,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.updateRule(workspaceId, ruleId, body);
  }

  /**
   * Delete automation rule
   */
  @Delete('automation/rules/:ruleId')
  async deleteAutomationRule(
    @Request() req: any,
    @Param('ruleId') ruleId: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.removeRule(workspaceId, ruleId);
  }

  /**
   * Create default automation rules
   */
  @Post('automation/rules/defaults')
  async createDefaultRules(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.createDefaultRules(workspaceId);
  }

  /**
   * Evaluate automation rules
   */
  @Post('automation/rules/evaluate')
  async evaluateRules(
    @Request() req: any,
    @Body()
    body: {
      platform?: string;
      contentType?: string;
      time?: Date;
      performance?: any;
      sentiment?: number;
    },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.evaluateRules(workspaceId, body);
  }

  /**
   * Get automation statistics
   */
  @Get('automation/stats')
  async getAutomationStats(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.getAutomationStats(workspaceId);
  }

  /**
   * Set enabled agents
   */
  @Put('automation/agents')
  async setEnabledAgents(
    @Request() req: any,
    @Body() body: { agents: AgentType[] },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.automationConfig.setEnabledAgents(workspaceId, body.agents);
  }

  // ===== Task History =====

  /**
   * Get task history
   */
  @Get('tasks/history')
  async getTaskHistory(
    @Request() req: any,
    @Query('agentType') agentType?: AgentType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.taskHistory.getTaskHistory(workspaceId, {
      agentType,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  /**
   * Get task by ID
   */
  @Get('tasks/:taskId')
  async getTaskById(@Param('taskId') taskId: string) {
    return this.taskHistory.getTaskById(taskId);
  }

  /**
   * Add feedback to task
   */
  @Post('tasks/:taskId/feedback')
  async addTaskFeedback(
    @Param('taskId') taskId: string,
    @Body()
    body: {
      rating: number;
      wasUseful: boolean;
      userModifications?: string;
      performanceMetrics?: any;
      comments?: string;
    },
  ) {
    return this.taskHistory.addFeedback(taskId, body);
  }

  /**
   * Get learning insights
   */
  @Get('learning/:agentType')
  async getLearningInsights(
    @Request() req: any,
    @Param('agentType') agentType: AgentType,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.taskHistory.getLearningInsights(workspaceId, agentType);
  }

  /**
   * Get successful patterns
   */
  @Get('learning/:agentType/patterns')
  async getSuccessfulPatterns(
    @Request() req: any,
    @Param('agentType') agentType: AgentType,
    @Query('minRating') minRating?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.taskHistory.getSuccessfulPatterns(
      workspaceId,
      agentType,
      minRating ? parseFloat(minRating) : undefined,
    );
  }

  /**
   * Analyze performance trends
   */
  @Get('learning/:agentType/trends')
  async analyzePerformanceTrends(
    @Request() req: any,
    @Param('agentType') agentType: AgentType,
    @Query('days') days?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.taskHistory.analyzePerformanceTrends(
      workspaceId,
      agentType,
      days ? parseInt(days) : undefined,
    );
  }

  // ===== Performance Monitoring =====

  /**
   * Get performance metrics
   */
  @Get('performance/:agentType')
  async getPerformanceMetrics(
    @Request() req: any,
    @Param('agentType') agentType: AgentType,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.performanceMonitor.getPerformanceMetrics(
      workspaceId,
      agentType,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Get performance dashboard
   */
  @Get('performance/dashboard')
  async getPerformanceDashboard(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.performanceMonitor.getPerformanceDashboard(workspaceId);
  }

  /**
   * Compare agents
   */
  @Post('performance/compare')
  async compareAgents(
    @Request() req: any,
    @Body()
    body: {
      agentTypes: AgentType[];
      startDate: string;
      endDate: string;
    },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.performanceMonitor.compareAgents(
      workspaceId,
      body.agentTypes,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  /**
   * Get agent health
   */
  @Get('performance/:agentType/health')
  async getAgentHealth(
    @Request() req: any,
    @Param('agentType') agentType: AgentType,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.performanceMonitor.getAgentHealth(workspaceId, agentType);
  }

  /**
   * Get cost analysis
   */
  @Get('performance/cost-analysis')
  async getCostAnalysis(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.performanceMonitor.getCostAnalysis(
      workspaceId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Get performance alerts
   */
  @Get('performance/alerts')
  async getPerformanceAlerts(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.performanceMonitor.getPerformanceAlerts(workspaceId);
  }

  /**
   * Generate performance report
   */
  @Post('performance/report')
  async generatePerformanceReport(
    @Request() req: any,
    @Body() body: { startDate: string; endDate: string },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.performanceMonitor.generatePerformanceReport(
      workspaceId,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  // ===== Communication =====

  /**
   * Get communication statistics
   */
  @Get('communication/stats')
  async getCommunicationStats() {
    return this.communication.getCommunicationStats();
  }

  /**
   * Get message history for workflow
   */
  @Get('communication/workflows/:workflowId/messages')
  async getWorkflowMessages(@Param('workflowId') workflowId: string) {
    return this.communication.getMessageHistory(workflowId);
  }
}
