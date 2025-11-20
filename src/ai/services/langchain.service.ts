import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { AIModel } from '../interfaces/ai.interface';

/**
 * LangChain Service
 * Provides advanced LLM capabilities using LangChain framework
 */
@Injectable()
export class LangChainService {
  private readonly logger = new Logger(LangChainService.name);
  private openaiModels: Map<AIModel, ChatOpenAI>;
  private anthropicModels: Map<AIModel, ChatAnthropic>;

  constructor(private configService: ConfigService) {
    this.initializeModels();
  }

  /**
   * Initialize LangChain models
   */
  private initializeModels(): void {
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    // Initialize OpenAI models
    this.openaiModels = new Map();
    if (openaiKey) {
      this.openaiModels.set(
        AIModel.GPT_4O,
        new ChatOpenAI({
          modelName: AIModel.GPT_4O,
          openAIApiKey: openaiKey,
          temperature: 0.7,
        }),
      );
      this.openaiModels.set(
        AIModel.GPT_4O_MINI,
        new ChatOpenAI({
          modelName: AIModel.GPT_4O_MINI,
          openAIApiKey: openaiKey,
          temperature: 0.7,
        }),
      );
    }

    // Initialize Anthropic models
    this.anthropicModels = new Map();
    if (anthropicKey) {
      this.anthropicModels.set(
        AIModel.CLAUDE_3_5_SONNET,
        new ChatAnthropic({
          modelName: AIModel.CLAUDE_3_5_SONNET,
          anthropicApiKey: anthropicKey,
          temperature: 0.7,
        }),
      );
      this.anthropicModels.set(
        AIModel.CLAUDE_HAIKU,
        new ChatAnthropic({
          modelName: AIModel.CLAUDE_HAIKU,
          anthropicApiKey: anthropicKey,
          temperature: 0.7,
        }),
      );
    }

    this.logger.log('LangChain models initialized');
  }

  /**
   * Get model instance
   */
  getModel(model: AIModel): ChatOpenAI | ChatAnthropic {
    const openaiModel = this.openaiModels.get(model);
    if (openaiModel) return openaiModel;

    const anthropicModel = this.anthropicModels.get(model);
    if (anthropicModel) return anthropicModel;

    throw new Error(`Model ${model} not initialized`);
  }

  /**
   * Create a simple completion with template
   */
  private async createSimpleCompletion(
    model: AIModel,
    template: string,
    variables: Record<string, any>,
  ): Promise<string> {
    try {
      const llm = this.getModel(model);
      
      // Replace variables in template
      let prompt = template;
      for (const [key, value] of Object.entries(variables)) {
        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }

      // Call the model
      const result = await (llm as any).call([{ role: 'user', content: prompt }]);
      
      // Extract content from result
      if (typeof result === 'string') {
        return result;
      } else if (result.content) {
        return result.content as string;
      } else if (result.text) {
        return result.text as string;
      }
      
      return JSON.stringify(result);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Simple completion error: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Create a content generation chain
   */
  async generateContent(
    model: AIModel,
    input: {
      topic: string;
      platform: string;
      tone?: string;
      brandVoice?: string;
      targetAudience?: string;
    },
  ): Promise<string> {
    const template = `You are a creative content creator for social media.

Topic: {topic}
Platform: {platform}
Tone: {tone}
Brand Voice: {brandVoice}
Target Audience: {targetAudience}

Create engaging social media content that:
1. Captures attention in the first few words
2. Aligns with the brand voice and tone
3. Is optimized for the platform's best practices
4. Includes relevant hashtags and call-to-action
5. Resonates with the target audience

Generate the content:`;

    return this.createSimpleCompletion(model, template, {
      topic: input.topic,
      platform: input.platform,
      tone: input.tone || 'professional',
      brandVoice: input.brandVoice || 'authentic and engaging',
      targetAudience: input.targetAudience || 'general audience',
    });
  }

  /**
   * Create a sentiment analysis chain
   */
  async analyzeSentiment(
    model: AIModel,
    text: string,
  ): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    reasoning: string;
  }> {
    const template = `Analyze the sentiment of the following text and provide:
1. Overall sentiment (positive, neutral, or negative)
2. Sentiment score (-1 to 1, where -1 is very negative and 1 is very positive)
3. Brief reasoning for your analysis

Text: {text}

Respond in JSON format:
{{
  "sentiment": "positive|neutral|negative",
  "score": 0.0,
  "reasoning": "explanation"
}}`;

    const result = await this.createSimpleCompletion(model, template, { text });

    try {
      return JSON.parse(result);
    } catch {
      // Fallback if JSON parsing fails
      return {
        sentiment: 'neutral',
        score: 0,
        reasoning: 'Unable to parse sentiment analysis',
      };
    }
  }

  /**
   * Create a hashtag generation chain
   */
  async generateHashtags(
    model: AIModel,
    content: string,
    platform: string,
    count: number = 10,
  ): Promise<string[]> {
    const template = `Generate {count} relevant hashtags for the following social media content on {platform}.

Content: {content}

Requirements:
1. Mix of popular and niche hashtags
2. Relevant to the content and platform
3. Include trending hashtags when applicable
4. Avoid banned or spammy hashtags

Return only the hashtags, one per line, with # prefix:`;

    const result = await this.createSimpleCompletion(model, template, {
      content,
      platform,
      count: count.toString(),
    });

    return result
      .split('\n')
      .map((tag) => tag.trim())
      .filter((tag) => tag.startsWith('#'));
  }

  /**
   * Create a strategy recommendation chain
   */
  async generateStrategy(
    model: AIModel,
    input: {
      goals: string[];
      currentPerformance: any;
      industry: string;
      targetAudience: string;
    },
  ): Promise<string> {
    const template = `You are a social media strategy expert.

Goals: {goals}
Current Performance: {currentPerformance}
Industry: {industry}
Target Audience: {targetAudience}

Analyze the current situation and provide:
1. Key insights from current performance
2. Strategic recommendations to achieve goals
3. Content themes and topics to focus on
4. Optimal posting schedule
5. Engagement tactics
6. Metrics to track

Provide a comprehensive strategy:`;

    return this.createSimpleCompletion(model, template, {
      goals: input.goals.join(', '),
      currentPerformance: JSON.stringify(input.currentPerformance),
      industry: input.industry,
      targetAudience: input.targetAudience,
    });
  }

  /**
   * Create a crisis response chain
   */
  async generateCrisisResponse(
    model: AIModel,
    input: {
      situation: string;
      brand: string;
      tone: string;
    },
  ): Promise<{
    response: string;
    actions: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const template = `You are a crisis management expert.

Brand: {brand}
Situation: {situation}
Desired Tone: {tone}

Provide:
1. A professional crisis response statement
2. Recommended immediate actions
3. Severity assessment (low, medium, high, critical)

Respond in JSON format:
{{
  "response": "crisis response statement",
  "actions": ["action1", "action2", "action3"],
  "severity": "low|medium|high|critical"
}}`;

    const result = await this.createSimpleCompletion(model, template, {
      brand: input.brand,
      situation: input.situation,
      tone: input.tone,
    });

    try {
      return JSON.parse(result);
    } catch {
      return {
        response: result,
        actions: [],
        severity: 'medium',
      };
    }
  }

  /**
   * Create a competitive analysis chain
   */
  async analyzeCompetitors(
    model: AIModel,
    input: {
      competitors: string[];
      competitorData: any[];
      industry: string;
    },
  ): Promise<string> {
    const template = `You are a competitive intelligence analyst.

Industry: {industry}
Competitors: {competitors}
Competitor Data: {competitorData}

Analyze the competitive landscape and provide:
1. Key competitor strategies and tactics
2. Content themes and topics they focus on
3. Engagement patterns and performance
4. Gaps and opportunities for differentiation
5. Recommendations for competitive advantage

Provide detailed analysis:`;

    return this.createSimpleCompletion(model, template, {
      industry: input.industry,
      competitors: input.competitors.join(', '),
      competitorData: JSON.stringify(input.competitorData),
    });
  }

  /**
   * Create a trend detection chain
   */
  async detectTrends(
    model: AIModel,
    input: {
      platform: string;
      industry: string;
      recentContent: any[];
    },
  ): Promise<{
    trends: Array<{
      topic: string;
      relevance: number;
      reasoning: string;
    }>;
  }> {
    const template = `You are a trend detection expert.

Platform: {platform}
Industry: {industry}
Recent Content: {recentContent}

Identify emerging trends and viral topics:
1. Analyze recent content patterns
2. Identify trending topics and hashtags
3. Assess relevance to the industry
4. Provide reasoning for each trend

Respond in JSON format:
{{
  "trends": [
    {{
      "topic": "trend name",
      "relevance": 0.0-1.0,
      "reasoning": "why this is trending"
    }}
  ]
}}`;

    const result = await this.createSimpleCompletion(model, template, {
      platform: input.platform,
      industry: input.industry,
      recentContent: JSON.stringify(input.recentContent),
    });

    try {
      return JSON.parse(result);
    } catch {
      return { trends: [] };
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.openaiModels.size > 0 || this.anthropicModels.size > 0;
  }
}
