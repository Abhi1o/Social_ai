import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { MessageCollectionService } from './services/message-collection.service';
import { ConversationThreadingService } from './services/conversation-threading.service';
import { InboxFilterService } from './services/inbox-filter.service';
import { SmartInboxRoutingService } from './services/smart-inbox-routing.service';
import { SavedReplyService } from './services/saved-reply.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { SLAService } from './services/sla.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { InboxGateway } from './gateways/inbox.gateway';

@Module({
  imports: [PrismaModule, AIModule],
  controllers: [CommunityController],
  providers: [
    ConversationService,
    MessageService,
    MessageCollectionService,
    ConversationThreadingService,
    InboxFilterService,
    SmartInboxRoutingService,
    SavedReplyService,
    ConversationHistoryService,
    SLAService,
    InboxGateway,
  ],
  exports: [
    ConversationService,
    MessageService,
    MessageCollectionService,
    SmartInboxRoutingService,
    SavedReplyService,
    ConversationHistoryService,
    SLAService,
  ],
})
export class CommunityModule {}
