import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FlowNode,
  FlowNodeType,
  FlowEdge,
  FlowExecutionContext,
  QuickReply,
} from '../interfaces/flow-node.interface';
import { IntentMatchingService } from './intent-matching.service';
import { EntityExtractionService } from './entity-extraction.service';
import { ExecutionStatus, ResponseType } from '@prisma/client';

@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger(FlowEngineService.name);

  constructor(
    private prisma: PrismaService,
    private intentMatching: IntentMatchingService,
    private entityExtraction: EntityExtractionService,
  ) {}

  /**
   * Execute a chatbot flow based on user input
   */
  async executeFlow(
    flowId: string,
    sessionId: string,
    userMessage: string,
    context: FlowExecutionContext,
  ): Promise<{
    response: string;
    responseType: ResponseType;
    quickReplies?: QuickReply[];
    handoff?: boolean;
    updatedContext: FlowExecutionContext;
  }> {
    const flow = await this.prisma.chatbotFlow.findUnique({
      where: { id: flowId },
      include: { chatbot: true },
    });

    if (!flow || !flow.isActive) {
      throw new Error('Flow not found or inactive');
    }

    // Create flow execution record
    const execution = await this.prisma.chatbotFlowExecution.create({
      data: {
        flowId,
        sessionId,
        startNode: context.currentNode || 'start',
        path: [context.currentNode || 'start'],
        inputVariables: context.variables,
        outputVariables: {},
        status: ExecutionStatus.RUNNING,
      },
    });

    try {
      const nodes = flow.nodes as unknown as FlowNode[];
      const edges = flow.edges as unknown as FlowEdge[];

      // Find starting node
      let currentNode = nodes.find((n) => n.id === context.currentNode) || 
                        nodes.find((n) => n.type === FlowNodeType.START);

      if (!currentNode) {
        throw new Error('No starting node found');
      }

      const path: string[] = [currentNode.id];
      let response = '';
      let responseType = ResponseType.TEXT;
      let quickReplies: QuickReply[] | undefined;
      let handoff = false;

      // Execute flow nodes
      while (currentNode && currentNode.type !== FlowNodeType.END) {
        const result = await this.executeNode(
          currentNode,
          userMessage,
          context,
          flow.chatbot.id,
        );

        // Update context with node results
        if (result.variables) {
          context.variables = { ...context.variables, ...result.variables };
        }

        if (result.contexts) {
          context.contexts = result.contexts;
        }

        // Store response
        if (result.response) {
          response = result.response;
          responseType = (result.responseType as any) || 'TEXT';
          quickReplies = result.quickReplies;
        }

        // Check for handoff
        if (currentNode.type === FlowNodeType.HANDOFF) {
          handoff = true;
          break;
        }

        // Find next node
        const nextNodeId: string | undefined = result.nextNode || this.findNextNode(currentNode, edges, context);
        
        if (!nextNodeId) {
          break;
        }

        currentNode = nodes.find((n: FlowNode) => n.id === nextNodeId);
        
        if (currentNode) {
          path.push(currentNode.id);
          context.currentNode = currentNode.id;
          context.visitedNodes.push(currentNode.id);
        }

        // Prevent infinite loops
        if (path.length > 50) {
          this.logger.warn(`Flow execution exceeded maximum depth: ${flowId}`);
          break;
        }
      }

      // Update execution record
      await this.prisma.chatbotFlowExecution.update({
        where: { id: execution.id },
        data: {
          endNode: currentNode?.id,
          path,
          outputVariables: context.variables,
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date(),
          duration: Date.now() - execution.startedAt.getTime(),
        },
      });

      return {
        response: response || 'I understand. How can I help you further?',
        responseType,
        quickReplies,
        handoff,
        updatedContext: context,
      };
    } catch (error: any) {
      this.logger.error(`Flow execution failed: ${error.message}`, error.stack);

      // Update execution record with error
      await this.prisma.chatbotFlowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute a single flow node
   */
  private async executeNode(
    node: FlowNode,
    userMessage: string,
    context: FlowExecutionContext,
    chatbotId: string,
  ): Promise<{
    response?: string;
    responseType?: ResponseType;
    quickReplies?: QuickReply[];
    nextNode?: string;
    variables?: Record<string, any>;
    contexts?: string[];
  }> {
    switch (node.type) {
      case FlowNodeType.START:
        return { nextNode: node.data.nextNode };

      case FlowNodeType.MESSAGE:
        return {
          response: this.interpolateVariables(node.data.message || '', context.variables),
          responseType: ResponseType.TEXT,
          nextNode: node.data.nextNode,
        };

      case FlowNodeType.QUESTION:
        return {
          response: this.interpolateVariables(node.data.message || '', context.variables),
          responseType: node.data.quickReplies ? ResponseType.QUICK_REPLY : ResponseType.TEXT,
          quickReplies: node.data.quickReplies,
          nextNode: node.data.nextNode,
        };

      case FlowNodeType.CONDITION:
        const conditionResult = this.evaluateCondition(node.data.condition || '', context.variables);
        return {
          nextNode: conditionResult ? node.data.nextNode : undefined,
        };

      case FlowNodeType.SET_VARIABLE:
        const variables: Record<string, any> = {};
        if (node.data.variable) {
          // Extract value from user message or use default
          variables[node.data.variable] = userMessage;
        }
        return {
          variables,
          nextNode: node.data.nextNode,
        };

      case FlowNodeType.API_CALL:
        try {
          const apiResult = await this.executeApiCall(node, context.variables);
          return {
            variables: { api_response: apiResult },
            nextNode: node.data.nextNode,
          };
        } catch (error: any) {
          this.logger.error(`API call failed: ${error.message}`);
          return {
            response: 'I encountered an error processing your request. Please try again.',
            nextNode: node.data.nextNode,
          };
        }

      case FlowNodeType.HANDOFF:
        return {
          response: node.data.message || 'Let me connect you with a team member who can help.',
          responseType: ResponseType.HANDOFF,
        };

      case FlowNodeType.END:
        return {
          response: node.data.message || 'Thank you for chatting with me!',
        };

      default:
        return { nextNode: node.data.nextNode };
    }
  }

  /**
   * Find the next node based on edges and conditions
   */
  private findNextNode(
    currentNode: FlowNode,
    edges: FlowEdge[],
    context: FlowExecutionContext,
  ): string | undefined {
    // Find all edges from current node
    const outgoingEdges = edges.filter((e) => e.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      return undefined;
    }

    // If there's only one edge, follow it
    if (outgoingEdges.length === 1) {
      return outgoingEdges[0].target;
    }

    // If there are multiple edges, evaluate conditions
    for (const edge of outgoingEdges) {
      if (edge.condition) {
        const conditionMet = this.evaluateCondition(edge.condition, context.variables);
        if (conditionMet) {
          return edge.target;
        }
      }
    }

    // If no condition matched, take the first edge without a condition
    const defaultEdge = outgoingEdges.find((e) => !e.condition);
    return defaultEdge?.target;
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Simple condition evaluation
      // Supports: variable == value, variable != value, variable > value, etc.
      const interpolated = this.interpolateVariables(condition, variables);
      
      // Use Function constructor for safe evaluation (limited scope)
      const func = new Function('variables', `return ${interpolated}`);
      return func(variables);
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${condition}`, error);
      return false;
    }
  }

  /**
   * Interpolate variables in a string
   */
  private interpolateVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName]?.toString() || match;
    });
  }

  /**
   * Execute an API call node
   */
  private async executeApiCall(
    node: FlowNode,
    variables: Record<string, any>,
  ): Promise<any> {
    const { apiEndpoint, apiMethod = 'GET', apiHeaders = {}, apiBody } = node.data;

    if (!apiEndpoint) {
      throw new Error('API endpoint not specified');
    }

    // Interpolate variables in endpoint and body
    const endpoint = this.interpolateVariables(apiEndpoint, variables);
    const body = apiBody ? JSON.parse(this.interpolateVariables(JSON.stringify(apiBody), variables)) : undefined;

    const response = await fetch(endpoint, {
      method: apiMethod,
      headers: {
        'Content-Type': 'application/json',
        ...apiHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API call failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Find the best matching flow for user input
   */
  async findMatchingFlow(
    chatbotId: string,
    userMessage: string,
    contexts: string[],
  ): Promise<string | null> {
    const flows = await this.prisma.chatbotFlow.findMany({
      where: {
        chatbotId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    for (const flow of flows) {
      switch (flow.triggerType) {
        case 'INTENT':
          const intentMatch = await this.intentMatching.matchIntent(
            chatbotId,
            userMessage,
            contexts,
          );
          if (intentMatch && intentMatch.intent === flow.triggerValue) {
            return flow.id;
          }
          break;

        case 'KEYWORD':
          if (flow.triggerValue && userMessage.toLowerCase().includes(flow.triggerValue.toLowerCase())) {
            return flow.id;
          }
          break;

        case 'CONDITION':
          // Condition-based triggers would need context evaluation
          break;

        case 'FALLBACK':
          // Fallback flows are used when no other flow matches
          continue;

        case 'MANUAL':
          // Manual flows are not automatically triggered
          continue;
      }
    }

    // If no flow matched, look for fallback flow
    const fallbackFlow = flows.find((f) => f.triggerType === 'FALLBACK');
    return fallbackFlow?.id || null;
  }
}
