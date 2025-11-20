import { Injectable, Logger } from '@nestjs/common';
import {
  AgentMessage,
  AgentCommunicationProtocol,
} from '../interfaces/orchestration.interface';
import { AgentType } from '../interfaces/ai.interface';

/**
 * Agent Communication Service
 * Implements communication protocols between AI agents
 */
@Injectable()
export class AgentCommunicationService implements AgentCommunicationProtocol {
  private readonly logger = new Logger(AgentCommunicationService.name);
  private messageQueue: Map<AgentType, AgentMessage[]> = new Map();
  private messageHistory: AgentMessage[] = [];

  /**
   * Send a message from one agent to another
   */
  async sendMessage(message: AgentMessage): Promise<void> {
    this.logger.debug(
      `Message from ${message.fromAgent} to ${message.toAgent}: ${message.messageType}`,
    );

    // Add to recipient's queue
    if (!this.messageQueue.has(message.toAgent)) {
      this.messageQueue.set(message.toAgent, []);
    }
    this.messageQueue.get(message.toAgent)!.push(message);

    // Store in history
    this.messageHistory.push(message);

    // Trim history to last 1000 messages
    if (this.messageHistory.length > 1000) {
      this.messageHistory = this.messageHistory.slice(-1000);
    }
  }

  /**
   * Receive messages for a specific agent
   */
  async receiveMessage(agentType: AgentType): Promise<AgentMessage[]> {
    const messages = this.messageQueue.get(agentType) || [];
    this.messageQueue.set(agentType, []); // Clear queue after reading
    return messages;
  }

  /**
   * Broadcast message to all agents
   */
  async broadcastMessage(
    message: Omit<AgentMessage, 'toAgent'>,
  ): Promise<void> {
    this.logger.debug(
      `Broadcasting message from ${message.fromAgent}: ${message.messageType}`,
    );

    // Send to all agent types except sender
    const allAgents = Object.values(AgentType);
    for (const agentType of allAgents) {
      if (agentType !== message.fromAgent) {
        await this.sendMessage({
          ...message,
          toAgent: agentType,
        } as AgentMessage);
      }
    }
  }

  /**
   * Request feedback from another agent
   */
  async requestFeedback(
    fromAgent: AgentType,
    toAgent: AgentType,
    content: any,
  ): Promise<AgentMessage> {
    const requestMessage: AgentMessage = {
      id: `feedback-${Date.now()}-${Math.random()}`,
      fromAgent,
      toAgent,
      messageType: 'request',
      content: {
        type: 'feedback_request',
        data: content,
      },
      timestamp: new Date(),
    };

    await this.sendMessage(requestMessage);

    // In a real implementation, this would wait for a response
    // For now, we'll return a placeholder
    return requestMessage;
  }

  /**
   * Get message history for a workflow
   */
  getMessageHistory(workflowId: string): AgentMessage[] {
    return this.messageHistory.filter(
      (msg) => msg.metadata?.workflowId === workflowId,
    );
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(): {
    totalMessages: number;
    messagesByType: Record<string, number>;
    messagesByAgent: Record<AgentType, number>;
  } {
    const messagesByType: Record<string, number> = {};
    const messagesByAgent: Record<AgentType, number> = {} as Record<
      AgentType,
      number
    >;

    for (const message of this.messageHistory) {
      // Count by type
      messagesByType[message.messageType] =
        (messagesByType[message.messageType] || 0) + 1;

      // Count by agent
      messagesByAgent[message.fromAgent] =
        (messagesByAgent[message.fromAgent] || 0) + 1;
    }

    return {
      totalMessages: this.messageHistory.length,
      messagesByType,
      messagesByAgent,
    };
  }

  /**
   * Clear message queue for an agent
   */
  clearQueue(agentType: AgentType): void {
    this.messageQueue.set(agentType, []);
  }

  /**
   * Clear all message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.messageQueue.clear();
  }
}
