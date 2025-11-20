import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChatbotDto } from '../dto/create-chatbot.dto';
import { UpdateChatbotDto } from '../dto/update-chatbot.dto';
import { CreateFlowDto } from '../dto/create-flow.dto';
import { CreateIntentDto } from '../dto/create-intent.dto';
import { CreateEntityDto } from '../dto/create-entity.dto';

@Injectable()
export class ChatbotService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateChatbotDto) {
    return this.prisma.chatbot.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        platforms: dto.platforms,
        accountIds: dto.accountIds,
        greeting: dto.greeting,
        fallbackMessage: dto.fallbackMessage || 'I\'m sorry, I didn\'t understand that. Can you please rephrase?',
        confidenceThreshold: dto.confidenceThreshold || 0.7,
        language: dto.language || 'en',
        isActive: dto.isActive || false,
        createdBy: userId,
      },
      include: {
        flows: true,
        intents: true,
        entities: true,
      },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.chatbot.findMany({
      where: { workspaceId },
      include: {
        flows: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            triggerType: true,
            isActive: true,
          },
        },
        intents: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            matchCount: true,
          },
        },
        _count: {
          select: {
            flows: true,
            intents: true,
            entities: true,
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const chatbot = await this.prisma.chatbot.findFirst({
      where: { id, workspaceId },
      include: {
        flows: {
          orderBy: { priority: 'desc' },
        },
        intents: {
          orderBy: { priority: 'desc' },
        },
        entities: true,
        _count: {
          select: {
            sessions: true,
            analytics: true,
          },
        },
      },
    });

    if (!chatbot) {
      throw new NotFoundException('Chatbot not found');
    }

    return chatbot;
  }

  async update(id: string, workspaceId: string, dto: UpdateChatbotDto) {
    await this.findOne(id, workspaceId);

    return this.prisma.chatbot.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        platforms: dto.platforms,
        accountIds: dto.accountIds,
        greeting: dto.greeting,
        fallbackMessage: dto.fallbackMessage,
        confidenceThreshold: dto.confidenceThreshold,
        language: dto.language,
        isActive: dto.isActive,
      },
      include: {
        flows: true,
        intents: true,
        entities: true,
      },
    });
  }

  async remove(id: string, workspaceId: string) {
    await this.findOne(id, workspaceId);
    return this.prisma.chatbot.delete({ where: { id } });
  }

  // Flow management
  async createFlow(chatbotId: string, workspaceId: string, dto: CreateFlowDto) {
    await this.findOne(chatbotId, workspaceId);

    return this.prisma.chatbotFlow.create({
      data: {
        chatbotId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        triggerValue: dto.triggerValue,
        nodes: dto.nodes,
        edges: dto.edges,
        priority: dto.priority || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async findFlows(chatbotId: string, workspaceId: string) {
    await this.findOne(chatbotId, workspaceId);

    return this.prisma.chatbotFlow.findMany({
      where: { chatbotId },
      orderBy: { priority: 'desc' },
    });
  }

  async findFlow(flowId: string, chatbotId: string, workspaceId: string) {
    await this.findOne(chatbotId, workspaceId);

    const flow = await this.prisma.chatbotFlow.findFirst({
      where: { id: flowId, chatbotId },
    });

    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    return flow;
  }

  async updateFlow(flowId: string, chatbotId: string, workspaceId: string, dto: Partial<CreateFlowDto>) {
    await this.findFlow(flowId, chatbotId, workspaceId);

    return this.prisma.chatbotFlow.update({
      where: { id: flowId },
      data: {
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        triggerValue: dto.triggerValue,
        nodes: dto.nodes,
        edges: dto.edges,
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });
  }

  async removeFlow(flowId: string, chatbotId: string, workspaceId: string) {
    await this.findFlow(flowId, chatbotId, workspaceId);
    return this.prisma.chatbotFlow.delete({ where: { id: flowId } });
  }

  // Intent management
  async createIntent(chatbotId: string, workspaceId: string, dto: CreateIntentDto) {
    await this.findOne(chatbotId, workspaceId);

    // Check for duplicate intent name
    const existing = await this.prisma.chatbotIntent.findFirst({
      where: { chatbotId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Intent with this name already exists');
    }

    return this.prisma.chatbotIntent.create({
      data: {
        chatbotId,
        name: dto.name,
        description: dto.description,
        trainingPhrases: dto.trainingPhrases,
        responses: dto.responses,
        requiredEntities: dto.requiredEntities || [],
        optionalEntities: dto.optionalEntities || [],
        inputContexts: dto.inputContexts || [],
        outputContexts: dto.outputContexts || [],
        lifespan: dto.lifespan || 5,
        priority: dto.priority || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async findIntents(chatbotId: string, workspaceId: string) {
    await this.findOne(chatbotId, workspaceId);

    return this.prisma.chatbotIntent.findMany({
      where: { chatbotId },
      orderBy: { priority: 'desc' },
    });
  }

  async updateIntent(intentId: string, chatbotId: string, workspaceId: string, dto: Partial<CreateIntentDto>) {
    await this.findOne(chatbotId, workspaceId);

    const intent = await this.prisma.chatbotIntent.findFirst({
      where: { id: intentId, chatbotId },
    });

    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    return this.prisma.chatbotIntent.update({
      where: { id: intentId },
      data: {
        name: dto.name,
        description: dto.description,
        trainingPhrases: dto.trainingPhrases,
        responses: dto.responses,
        requiredEntities: dto.requiredEntities,
        optionalEntities: dto.optionalEntities,
        inputContexts: dto.inputContexts,
        outputContexts: dto.outputContexts,
        lifespan: dto.lifespan,
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });
  }

  async removeIntent(intentId: string, chatbotId: string, workspaceId: string) {
    await this.findOne(chatbotId, workspaceId);

    const intent = await this.prisma.chatbotIntent.findFirst({
      where: { id: intentId, chatbotId },
    });

    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    return this.prisma.chatbotIntent.delete({ where: { id: intentId } });
  }

  // Entity management
  async createEntity(chatbotId: string, workspaceId: string, dto: CreateEntityDto) {
    await this.findOne(chatbotId, workspaceId);

    // Check for duplicate entity name
    const existing = await this.prisma.chatbotEntity.findFirst({
      where: { chatbotId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Entity with this name already exists');
    }

    return this.prisma.chatbotEntity.create({
      data: {
        chatbotId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        values: dto.values,
        pattern: dto.pattern,
        isRequired: dto.isRequired || false,
      },
    });
  }

  async findEntities(chatbotId: string, workspaceId: string) {
    await this.findOne(chatbotId, workspaceId);

    return this.prisma.chatbotEntity.findMany({
      where: { chatbotId },
      orderBy: { name: 'asc' },
    });
  }

  async updateEntity(entityId: string, chatbotId: string, workspaceId: string, dto: Partial<CreateEntityDto>) {
    await this.findOne(chatbotId, workspaceId);

    const entity = await this.prisma.chatbotEntity.findFirst({
      where: { id: entityId, chatbotId },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return this.prisma.chatbotEntity.update({
      where: { id: entityId },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        values: dto.values,
        pattern: dto.pattern,
        isRequired: dto.isRequired,
      },
    });
  }

  async removeEntity(entityId: string, chatbotId: string, workspaceId: string) {
    await this.findOne(chatbotId, workspaceId);

    const entity = await this.prisma.chatbotEntity.findFirst({
      where: { id: entityId, chatbotId },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return this.prisma.chatbotEntity.delete({ where: { id: entityId } });
  }

  // Training
  async trainChatbot(chatbotId: string, workspaceId: string) {
    const chatbot = await this.findOne(chatbotId, workspaceId);

    // Mark as training
    await this.prisma.chatbot.update({
      where: { id: chatbotId },
      data: { isTraining: true },
    });

    try {
      // In a real implementation, this would trigger ML model training
      // For now, we'll just mark intents as trained
      await this.prisma.chatbotIntent.updateMany({
        where: { chatbotId, isActive: true },
        data: { isTrained: true, accuracy: 0.85 },
      });

      // Mark training complete
      await this.prisma.chatbot.update({
        where: { id: chatbotId },
        data: { isTraining: false },
      });

      return { success: true, message: 'Chatbot trained successfully' };
    } catch (error) {
      await this.prisma.chatbot.update({
        where: { id: chatbotId },
        data: { isTraining: false },
      });
      throw error;
    }
  }
}
