/**
 * Example webhook handler for processing incoming messages from social platforms
 * This demonstrates how to integrate the Community module with platform webhooks
 */

import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { MessageCollectionService, IncomingMessage } from '../services/message-collection.service';
import { InboxGateway } from '../gateways/inbox.gateway';
import { Platform, ConversationType } from '@prisma/client';

/**
 * Example Instagram webhook payload
 */
interface InstagramWebhookPayload {
  object: 'instagram';
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text: string;
      };
    }>;
    changes?: Array<{
      field: string;
      value: {
        from: {
          id: string;
          username: string;
        };
        id: string;
        text: string;
        media?: {
          id: string;
          media_product_type: string;
        };
      };
    }>;
  }>;
}

/**
 * Example Twitter webhook payload
 */
interface TwitterWebhookPayload {
  for_user_id: string;
  direct_message_events?: Array<{
    id: string;
    created_timestamp: string;
    message_create: {
      sender_id: string;
      target: {
        recipient_id: string;
      };
      message_data: {
        text: string;
      };
    };
  }>;
  tweet_create_events?: Array<{
    id_str: string;
    created_at: string;
    text: string;
    user: {
      id_str: string;
      screen_name: string;
      name: string;
      profile_image_url_https: string;
    };
    in_reply_to_status_id_str?: string;
  }>;
}

@Controller('webhooks')
export class WebhookHandlerExample {
  constructor(
    private messageCollectionService: MessageCollectionService,
    private inboxGateway: InboxGateway,
  ) {}

  /**
   * Instagram webhook handler
   * POST /webhooks/instagram
   */
  @Post('instagram')
  @HttpCode(HttpStatus.OK)
  async handleInstagramWebhook(
    @Body() payload: InstagramWebhookPayload,
    @Headers('x-hub-signature') signature: string,
  ) {
    // 1. Verify webhook signature (important for security!)
    // const isValid = this.verifyInstagramSignature(payload, signature);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid signature');
    // }

    // 2. Process each entry
    for (const entry of payload.entry) {
      // Handle direct messages
      if (entry.messaging) {
        for (const messaging of entry.messaging) {
          if (messaging.message) {
            await this.processInstagramMessage(entry.id, messaging);
          }
        }
      }

      // Handle comments
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            await this.processInstagramComment(entry.id, change.value);
          }
        }
      }
    }

    return { success: true };
  }

  /**
   * Twitter webhook handler
   * POST /webhooks/twitter
   */
  @Post('twitter')
  @HttpCode(HttpStatus.OK)
  async handleTwitterWebhook(
    @Body() payload: TwitterWebhookPayload,
    @Headers('x-twitter-webhooks-signature') signature: string,
  ) {
    // 1. Verify webhook signature
    // const isValid = this.verifyTwitterSignature(payload, signature);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid signature');
    // }

    // 2. Process direct messages
    if (payload.direct_message_events) {
      for (const dmEvent of payload.direct_message_events) {
        await this.processTwitterDM(payload.for_user_id, dmEvent);
      }
    }

    // 3. Process mentions/replies
    if (payload.tweet_create_events) {
      for (const tweet of payload.tweet_create_events) {
        if (tweet.in_reply_to_status_id_str) {
          await this.processTwitterMention(payload.for_user_id, tweet);
        }
      }
    }

    return { success: true };
  }

  /**
   * Process Instagram direct message
   */
  private async processInstagramMessage(
    accountId: string,
    messaging: any,
  ): Promise<void> {
    // Map to our internal format
    const incomingMessage: IncomingMessage = {
      platform: Platform.INSTAGRAM,
      accountId: accountId, // This should be mapped to our internal account ID
      type: ConversationType.DM,
      participantId: messaging.sender.id,
      participantName: messaging.sender.id, // Would fetch from Instagram API
      content: messaging.message.text,
      platformMessageId: messaging.message.mid,
      metadata: {
        timestamp: messaging.timestamp,
      },
    };

    // Get workspace ID from account
    const workspaceId = await this.getWorkspaceIdFromAccount(accountId);

    // Process the message
    const result = await this.messageCollectionService.processIncomingMessage(
      workspaceId,
      incomingMessage,
    );

    // Emit real-time update
    this.inboxGateway.emitNewMessage(result.conversationId, {
      id: result.messageId,
      conversationId: result.conversationId,
      direction: 'INBOUND',
      content: incomingMessage.content,
      platformMessageId: incomingMessage.platformMessageId,
      createdAt: new Date(),
    } as any);
  }

  /**
   * Process Instagram comment
   */
  private async processInstagramComment(
    accountId: string,
    comment: any,
  ): Promise<void> {
    const incomingMessage: IncomingMessage = {
      platform: Platform.INSTAGRAM,
      accountId: accountId,
      type: ConversationType.COMMENT,
      participantId: comment.from.id,
      participantName: comment.from.username,
      content: comment.text,
      platformMessageId: comment.id,
      metadata: {
        mediaId: comment.media?.id,
        mediaType: comment.media?.media_product_type,
      },
    };

    const workspaceId = await this.getWorkspaceIdFromAccount(accountId);

    const result = await this.messageCollectionService.processIncomingMessage(
      workspaceId,
      incomingMessage,
    );

    this.inboxGateway.emitNewMessage(result.conversationId, {
      id: result.messageId,
      conversationId: result.conversationId,
      direction: 'INBOUND',
      content: incomingMessage.content,
      platformMessageId: incomingMessage.platformMessageId,
      createdAt: new Date(),
    } as any);
  }

  /**
   * Process Twitter direct message
   */
  private async processTwitterDM(
    accountId: string,
    dmEvent: any,
  ): Promise<void> {
    const incomingMessage: IncomingMessage = {
      platform: Platform.TWITTER,
      accountId: accountId,
      type: ConversationType.DM,
      participantId: dmEvent.message_create.sender_id,
      participantName: dmEvent.message_create.sender_id, // Would fetch from Twitter API
      content: dmEvent.message_create.message_data.text,
      platformMessageId: dmEvent.id,
      metadata: {
        timestamp: dmEvent.created_timestamp,
      },
    };

    const workspaceId = await this.getWorkspaceIdFromAccount(accountId);

    const result = await this.messageCollectionService.processIncomingMessage(
      workspaceId,
      incomingMessage,
    );

    this.inboxGateway.emitNewMessage(result.conversationId, {
      id: result.messageId,
      conversationId: result.conversationId,
      direction: 'INBOUND',
      content: incomingMessage.content,
      platformMessageId: incomingMessage.platformMessageId,
      createdAt: new Date(),
    } as any);
  }

  /**
   * Process Twitter mention/reply
   */
  private async processTwitterMention(
    accountId: string,
    tweet: any,
  ): Promise<void> {
    const incomingMessage: IncomingMessage = {
      platform: Platform.TWITTER,
      accountId: accountId,
      type: ConversationType.MENTION,
      participantId: tweet.user.id_str,
      participantName: tweet.user.screen_name,
      participantAvatar: tweet.user.profile_image_url_https,
      content: tweet.text,
      platformMessageId: tweet.id_str,
      metadata: {
        createdAt: tweet.created_at,
        inReplyTo: tweet.in_reply_to_status_id_str,
      },
    };

    const workspaceId = await this.getWorkspaceIdFromAccount(accountId);

    const result = await this.messageCollectionService.processIncomingMessage(
      workspaceId,
      incomingMessage,
    );

    this.inboxGateway.emitNewMessage(result.conversationId, {
      id: result.messageId,
      conversationId: result.conversationId,
      direction: 'INBOUND',
      content: incomingMessage.content,
      platformMessageId: incomingMessage.platformMessageId,
      createdAt: new Date(),
    } as any);
  }

  /**
   * Helper to get workspace ID from social account ID
   * In a real implementation, this would query the database
   */
  private async getWorkspaceIdFromAccount(accountId: string): Promise<string> {
    // This is a placeholder - implement actual database lookup
    return 'workspace-id';
  }

  /**
   * Verify Instagram webhook signature
   * Important for security!
   */
  private verifyInstagramSignature(payload: any, signature: string): boolean {
    // Implement signature verification using your app secret
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha1', APP_SECRET)
    //   .update(JSON.stringify(payload))
    //   .digest('hex');
    // return signature === `sha1=${expectedSignature}`;
    return true; // Placeholder
  }

  /**
   * Verify Twitter webhook signature
   * Important for security!
   */
  private verifyTwitterSignature(payload: any, signature: string): boolean {
    // Implement signature verification using your consumer secret
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha256', CONSUMER_SECRET)
    //   .update(JSON.stringify(payload))
    //   .digest('base64');
    // return signature === `sha256=${expectedSignature}`;
    return true; // Placeholder
  }
}

/**
 * Usage in your module:
 * 
 * @Module({
 *   imports: [CommunityModule],
 *   controllers: [WebhookHandlerExample],
 * })
 * export class WebhooksModule {}
 */
