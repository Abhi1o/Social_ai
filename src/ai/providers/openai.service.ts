import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AICompletionRequest,
  AICompletionResponse,
  AIModel,
} from '../interfaces/ai.interface';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
    }
    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: request.model || AIModel.GPT_4O_MINI,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      };

      const cost = this.calculateCost(
        request.model || AIModel.GPT_4O_MINI,
        tokensUsed,
      );

      this.logger.log(
        `OpenAI completion: ${tokensUsed.total} tokens, $${cost.toFixed(4)}, ${Date.now() - startTime}ms`,
      );

      return {
        content,
        model: request.model || AIModel.GPT_4O_MINI,
        tokensUsed,
        cost,
        cached: false,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`OpenAI API error: ${err.message}`, err.stack);
      throw error;
    }
  }

  private calculateCost(model: AIModel, tokensUsed: any): number {
    // Pricing as of 2024 (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      [AIModel.GPT_4O]: { input: 2.5, output: 10.0 },
      [AIModel.GPT_4O_MINI]: { input: 0.15, output: 0.6 },
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
    return !!this.configService.get<string>('OPENAI_API_KEY');
  }
}
