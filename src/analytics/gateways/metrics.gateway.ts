import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MetricsCacheService } from '../services/metrics-cache.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/metrics',
})
export class MetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MetricsGateway.name);
  private readonly workspaceSubscriptions = new Map<string, Set<string>>();

  constructor(private readonly metricsCacheService: MetricsCacheService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up subscriptions
    this.workspaceSubscriptions.forEach((clients, workspaceId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.workspaceSubscriptions.delete(workspaceId);
      }
    });
  }

  /**
   * Subscribe to workspace metrics updates
   */
  @SubscribeMessage('subscribe:workspace')
  handleSubscribeWorkspace(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { workspaceId } = data;

    if (!this.workspaceSubscriptions.has(workspaceId)) {
      this.workspaceSubscriptions.set(workspaceId, new Set());
    }

    this.workspaceSubscriptions.get(workspaceId)!.add(client.id);
    client.join(`workspace:${workspaceId}`);

    this.logger.log(`Client ${client.id} subscribed to workspace ${workspaceId}`);

    return { success: true, message: `Subscribed to workspace ${workspaceId}` };
  }

  /**
   * Unsubscribe from workspace metrics updates
   */
  @SubscribeMessage('unsubscribe:workspace')
  handleUnsubscribeWorkspace(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { workspaceId } = data;

    if (this.workspaceSubscriptions.has(workspaceId)) {
      this.workspaceSubscriptions.get(workspaceId)!.delete(client.id);
    }

    client.leave(`workspace:${workspaceId}`);

    this.logger.log(`Client ${client.id} unsubscribed from workspace ${workspaceId}`);

    return { success: true, message: `Unsubscribed from workspace ${workspaceId}` };
  }

  /**
   * Subscribe to account metrics updates
   */
  @SubscribeMessage('subscribe:account')
  handleSubscribeAccount(
    @MessageBody() data: { accountId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { accountId } = data;
    client.join(`account:${accountId}`);

    this.logger.log(`Client ${client.id} subscribed to account ${accountId}`);

    return { success: true, message: `Subscribed to account ${accountId}` };
  }

  /**
   * Unsubscribe from account metrics updates
   */
  @SubscribeMessage('unsubscribe:account')
  handleUnsubscribeAccount(
    @MessageBody() data: { accountId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { accountId } = data;
    client.leave(`account:${accountId}`);

    this.logger.log(`Client ${client.id} unsubscribed from account ${accountId}`);

    return { success: true, message: `Unsubscribed from account ${accountId}` };
  }

  /**
   * Broadcast new metrics to workspace subscribers
   */
  emitWorkspaceMetrics(workspaceId: string, metrics: any) {
    this.server.to(`workspace:${workspaceId}`).emit('metrics:update', {
      workspaceId,
      metrics,
      timestamp: new Date(),
    });

    this.logger.debug(`Emitted metrics update to workspace ${workspaceId}`);
  }

  /**
   * Broadcast new metrics to account subscribers
   */
  emitAccountMetrics(accountId: string, metrics: any) {
    this.server.to(`account:${accountId}`).emit('metrics:update', {
      accountId,
      metrics,
      timestamp: new Date(),
    });

    this.logger.debug(`Emitted metrics update to account ${accountId}`);
  }

  /**
   * Broadcast post metrics update
   */
  emitPostMetrics(workspaceId: string, postId: string, metrics: any) {
    this.server.to(`workspace:${workspaceId}`).emit('metrics:post', {
      postId,
      metrics,
      timestamp: new Date(),
    });

    this.logger.debug(`Emitted post metrics update for ${postId}`);
  }

  /**
   * Broadcast aggregated metrics update
   */
  emitAggregatedMetrics(workspaceId: string, period: string, metrics: any) {
    this.server.to(`workspace:${workspaceId}`).emit('metrics:aggregated', {
      period,
      metrics,
      timestamp: new Date(),
    });

    this.logger.debug(`Emitted aggregated metrics for workspace ${workspaceId}`);
  }
}
