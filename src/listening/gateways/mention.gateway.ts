import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * WebSocket gateway for real-time mention updates
 */
@WebSocketGateway({
  namespace: '/listening',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class MentionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MentionGateway.name);
  
  // Track which queries each client is subscribed to
  private readonly subscriptions = new Map<string, Set<string>>();

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.subscriptions.set(client.id, new Set());
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.subscriptions.delete(client.id);
  }

  /**
   * Subscribe to mentions for a specific query
   */
  @SubscribeMessage('subscribe:query')
  handleSubscribeQuery(
    @MessageBody() data: { queryId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { queryId } = data;
    const clientSubs = this.subscriptions.get(client.id);

    if (clientSubs) {
      clientSubs.add(queryId);
      client.join(`query:${queryId}`);
      this.logger.debug(`Client ${client.id} subscribed to query ${queryId}`);
    }

    return { success: true, queryId };
  }

  /**
   * Unsubscribe from mentions for a specific query
   */
  @SubscribeMessage('unsubscribe:query')
  handleUnsubscribeQuery(
    @MessageBody() data: { queryId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { queryId } = data;
    const clientSubs = this.subscriptions.get(client.id);

    if (clientSubs) {
      clientSubs.delete(queryId);
      client.leave(`query:${queryId}`);
      this.logger.debug(`Client ${client.id} unsubscribed from query ${queryId}`);
    }

    return { success: true, queryId };
  }

  /**
   * Subscribe to all mentions for a workspace
   */
  @SubscribeMessage('subscribe:workspace')
  handleSubscribeWorkspace(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { workspaceId } = data;
    client.join(`workspace:${workspaceId}`);
    this.logger.debug(`Client ${client.id} subscribed to workspace ${workspaceId}`);

    return { success: true, workspaceId };
  }

  /**
   * Unsubscribe from workspace mentions
   */
  @SubscribeMessage('unsubscribe:workspace')
  handleUnsubscribeWorkspace(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { workspaceId } = data;
    client.leave(`workspace:${workspaceId}`);
    this.logger.debug(`Client ${client.id} unsubscribed from workspace ${workspaceId}`);

    return { success: true, workspaceId };
  }

  /**
   * Emit a new mention to subscribed clients
   */
  emitNewMention(queryId: string, workspaceId: string, mention: any) {
    // Emit to query subscribers
    this.server.to(`query:${queryId}`).emit('mention:new', {
      queryId,
      mention,
    });

    // Emit to workspace subscribers
    this.server.to(`workspace:${workspaceId}`).emit('mention:new', {
      queryId,
      mention,
    });

    this.logger.debug(`Emitted new mention for query ${queryId}`);
  }

  /**
   * Emit mention update to subscribed clients
   */
  emitMentionUpdate(queryId: string, workspaceId: string, mention: any) {
    this.server.to(`query:${queryId}`).emit('mention:update', {
      queryId,
      mention,
    });

    this.server.to(`workspace:${workspaceId}`).emit('mention:update', {
      queryId,
      mention,
    });

    this.logger.debug(`Emitted mention update for query ${queryId}`);
  }

  /**
   * Emit alert to subscribed clients
   */
  emitAlert(queryId: string, workspaceId: string, alert: any) {
    this.server.to(`query:${queryId}`).emit('alert:new', {
      queryId,
      alert,
    });

    this.server.to(`workspace:${workspaceId}`).emit('alert:new', {
      queryId,
      alert,
    });

    this.logger.warn(`Emitted alert for query ${queryId}: ${alert.type}`);
  }

  /**
   * Emit sentiment update to subscribed clients
   */
  emitSentimentUpdate(queryId: string, workspaceId: string, sentiment: any) {
    this.server.to(`query:${queryId}`).emit('sentiment:update', {
      queryId,
      sentiment,
    });

    this.server.to(`workspace:${workspaceId}`).emit('sentiment:update', {
      queryId,
      sentiment,
    });
  }
}
