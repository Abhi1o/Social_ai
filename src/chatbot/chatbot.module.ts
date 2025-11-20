import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './services/chatbot.service';
import { FlowEngineService } from './services/flow-engine.service';
import { IntentMatchingService } from './services/intent-matching.service';
import { EntityExtractionService } from './services/entity-extraction.service';
import { ChatbotAnalyticsService } from './services/chatbot-analytics.service';
import { ChatbotSessionService } from './services/chatbot-session.service';
import { AutomatedResponseService } from './services/automated-response.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    FlowEngineService,
    IntentMatchingService,
    EntityExtractionService,
    ChatbotAnalyticsService,
    ChatbotSessionService,
    AutomatedResponseService,
  ],
  exports: [
    ChatbotService,
    FlowEngineService,
    IntentMatchingService,
    EntityExtractionService,
    AutomatedResponseService,
  ],
})
export class ChatbotModule {}
