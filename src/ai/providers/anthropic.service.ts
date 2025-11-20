import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AICompletionRequest,
  AICompletionResponse,
  AIModel,
} from '../interfaces/ai.interface';

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured');
    }
    this.client = new Anthropic({
      apiKey: apiKey || 'dummy-key',
    });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();

    try {
      // Convert messages format (OpenAI -> Anthropic)
      const systemMessage = request.messages.find((m) => m.role === 'system');
      const conversationMessages = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await this.client.messages.create({
        model: request.model || AIModel.CLAUDE_HAIKU,
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: conversationMessages,
      });

      const content =
        response.content[0]?.type === 'text' ? response.content[0].text : '';

      const tokensUsed = {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      };

      const cost = this.calculateCost(
        request.model || AIModel.CLAUDE_HAIKU,
        tokensUsed,
      );

      this.logger.log(
        `Anthropic completion: ${tokensUsed.total} tokens, $${cost.toFixed(4)}, ${Date.now() - startTime}ms`,
      );

      return {
        content,
        model: request.model || AIModel.CLAUDE_HAIKU,
        tokensUsed,
        cost,
        cached: false,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Anthropic API error: ${err.message}`, err.stack);
      throw error;
    }
  }

  private calculateCost(model: AIModel, tokensUsed: any): number {
    // Pricing as of 2024 (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      [AIModel.CLAUDE_3_5_SONNET]: { input: 3.0, output: 15.0 },
      [AIModel.CLAUDE_HAIKU]: { input: 0.25, output: 1.25 },
    };

    const modelPricing = pricing[model];
    if (!modelPricing) {
      return 0;
    }

    const inputCost = (tokensUsed.prompt / 1_000_000) * modelPricing.input;
    const outputCost =
      (tokensUsed.completion / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  isConfigured(): boolean {
    return !!this.configService.get<string>('ANTHROPIC_API_KEY');
  }
}
