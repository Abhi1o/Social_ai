import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { Conversation, Message } from '@prisma/client';

/**
 * WebSocket Gateway for real-time inbox updates
 * Handles real-time message sync, typing indicators, and presence
 */
@WebSocketGateway({
  namespace: 'inbox',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InboxGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly workspaceRooms = new Map<string, Set<string>>(); // workspaceId -> Set of socketIds

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // In a real implementation, you would:
    // 1. Verify JWT token from handshake
    // 2. Extract userId and workspaceId
    // 3. Join appropriate rooms

    const userId = client.handshake.auth?.userId;
    const workspaceId = client.handshake.auth?.workspaceId;

    if (userId && workspaceId) {
      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join workspace room
      client.join(`workspace:${workspaceId}`);
      if (!this.workspaceRooms.has(workspaceId)) {
        this.workspaceRooms.set(workspaceId, new Set());
      }
      this.workspaceRooms.get(workspaceId)!.add(client.id);

      this.logger.log(
        `User ${userId} joined workspace ${workspaceId} with socket ${client.id}`,
      );
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const userId = client.handshake.auth?.userId;
    const workspaceId = client.handshake.auth?.workspaceId;

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    if (workspaceId) {
      const sockets = this.workspaceRooms.get(workspaceId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.workspaceRooms.delete(workspaceId);
        }
      }
    }
  }

  /**
   * Subscribe to conversation updates
   */
  @SubscribeMessage('subscribe:conversation')
  handleSubscribeConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
    this.logger.log(
      `Client ${client.id} subscribed to conversation ${data.conversationId}`,
    );
    return { success: true };
  }

  /**
   * Unsubscribe from conversation updates
   */
  @SubscribeMessage('unsubscribe:conversation')
  handleUnsubscribeConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    this.logger.log(
      `Client ${client.id} unsubscribed from conversation ${data.conversationId}`,
    );
    return { success: true };
  }

  /**
   * Handle typing indicator
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('typing:user', { userId: data.userId, typing: true });
  }

  /**
   * Handle typing stop
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('typing:user', { userId: data.userId, typing: false });
  }

  /**
   * Emit new message to conversation subscribers
   */
  emitNewMessage(conversationId: string, message: Message) {
    this.server.to(`conversation:${conversationId}`).emit('message:new', {
      conversationId,
      message,
    });

    this.logger.log(
      `Emitted new message ${message.id} to conversation ${conversationId}`,
    );
  }

  /**
   * Emit conversation update to workspace
   */
  emitConversationUpdate(workspaceId: string, conversation: Conversation) {
    this.server.to(`workspace:${workspaceId}`).emit('conversation:update', {
      conversation,
    });

    this.logger.log(
      `Emitted conversation update ${conversation.id} to workspace ${workspaceId}`,
    );
  }

  /**
   * Emit new conversation to workspace
   */
  emitNewConversation(workspaceId: string, conversation: Conversation) {
    this.server.to(`workspace:${workspaceId}`).emit('conversation:new', {
      conversation,
    });

    this.logger.log(
      `Emitted new conversation ${conversation.id} to workspace ${workspaceId}`,
    );
  }

  /**
   * Emit conversation assignment to specific user
   */
  emitConversationAssignment(
    userId: string,
    conversation: Conversation,
  ) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('conversation:assigned', {
          conversation,
        });
      });

      this.logger.log(
        `Emitted conversation assignment ${conversation.id} to user ${userId}`,
      );
    }
  }

  /**
   * Emit unread count update to user
   */
  emitUnreadCountUpdate(userId: string, count: number) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('unread:count', { count });
      });

      this.logger.log(`Emitted unread count ${count} to user ${userId}`);
    }
  }

  /**
   * Emit presence update (user online/offline)
   */
  emitPresenceUpdate(
    workspaceId: string,
    userId: string,
    status: 'online' | 'offline',
  ) {
    this.server.to(`workspace:${workspaceId}`).emit('presence:update', {
      userId,
      status,
    });
  }

  /**
   * Get online users in a workspace
   */
  getOnlineUsers(workspaceId: string): string[] {
    const sockets = this.workspaceRooms.get(workspaceId);
    if (!sockets) {
      return [];
    }

    const userIds = new Set<string>();
    sockets.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        const userId = socket.handshake.auth?.userId;
        if (userId) {
          userIds.add(userId);
        }
      }
    });

    return Array.from(userIds);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Broadcast to entire workspace
   */
  broadcastToWorkspace(workspaceId: string, event: string, data: any) {
    this.server.to(`workspace:${workspaceId}`).emit(event, data);
  }

  /**
   * Send to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Emit SLA escalation alert
   */
  emitSLAEscalation(
    workspaceId: string,
    conversationId: string,
    tracking: any,
  ) {
    this.server.to(`workspace:${workspaceId}`).emit('sla:escalation', {
      conversationId,
      tracking,
    });

    // Also notify escalation recipients
    if (tracking.escalateTo && Array.isArray(tracking.escalateTo)) {
      tracking.escalateTo.forEach((userId: string) => {
        this.sendToUser(userId, 'sla:escalation:assigned', {
          conversationId,
          tracking,
        });
      });
    }

    this.logger.log(
      `Emitted SLA escalation for conversation ${conversationId} to workspace ${workspaceId}`,
    );
  }
}
