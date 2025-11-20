import { Injectable, Logger } from '@nestjs/common';
import { AICoordinatorService } from '../services/ai-coordinator.service';
import { AgentType, AIModel } from '../interfaces/ai.interface';

export interface ContentGenerationRequest {
  prompt?: string;
  context?: {
    topic?: string;
    tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'humorous';
    platforms: string[];
    targetAudience?: string;
    keywords?: string[];
  };
  variations?: number;
  brandVoiceId?: string;
  workspaceId: string;
}

export interface ContentVariation {
  id: string;
  content: {
    text: string;
    hashtags: string[];
    mentions: string[];
  };
  platform: string;
  score: number;
  reasoning: string;
}

export interface ContentGenerationResponse {
  variations: ContentVariation[];
  cost: number;
  tokensUsed: number;
}

export interface ContentOptimizationRequest {
  content: string;
  platform: string;
  optimizationGoals: ('engagement' | 'reach' | 'conversions')[];
  workspaceId: string;
}

export interface ContentOptimizationResponse {
  optimizedContent: string;
  suggestions: {
    type: string;
    original: string;
    suggested: string;
    reasoning: string;
  }[];
  predictedPerformance: {
    engagementRate: number;
    reachEstimate: number;
  };
}

export interface BrandVoiceProfile {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  tone: string;
  vocabulary: string[];
  avoidWords: string[];
  examples: string[];
  guidelines: string;
}

@Injectable()
export class ContentCreatorAgent {
  private readonly logger = new Logger(ContentCreatorAgent.name);

  // Agent personality and configuration
  private readonly agentPersonality = {
    name: 'Content Creator',
    type: AgentType.CONTENT_CREATOR,
    personality: 'Creative, enthusiastic, and brand-aware',
    description:
      'Specialized in generating engaging social media content with platform-specific optimization',
  };

  constructor(private readonly aiCoordinator: AICoordinatorService) {}

  /**
   * Generate content variations with platform-specific optimization
   */
  async generateContent(
    request: ContentGenerationRequest,
  ): Promise<ContentGenerationResponse> {
    this.logger.log(
      `Generating ${request.variations || 3} content variations for platforms: ${request.context?.platforms.join(', ')}`,
    );

    const variations = request.variations || 3;
    const allVariations: ContentVariation[] = [];
    let totalCost = 0;
    let totalTokens = 0;

    // Generate variations for each platform
    for (const platform of request.context?.platforms || ['instagram']) {
      const platformVariations = await this.generatePlatformVariations(
        request,
        platform,
        variations,
      );

      allVariations.push(...platformVariations.variations);
      totalCost += platformVariations.cost;
      totalTokens += platformVariations.tokensUsed;
    }

    // Score and rank variations
    const scoredVariations = await this.scoreVariations(
      allVariations,
      request.workspaceId,
    );

    return {
      variations: scoredVariations,
      cost: totalCost,
      tokensUsed: totalTokens,
    };
  }

  /**
   * Generate variations for a specific platform
   */
  private async generatePlatformVariations(
    request: ContentGenerationRequest,
    platform: string,
    count: number,
  ): Promise<{
    variations: ContentVariation[];
    cost: number;
    tokensUsed: number;
  }> {
    const systemPrompt = this.buildSystemPrompt(platform, request.context?.tone);
    const userPrompt = this.buildUserPrompt(request, platform);

    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.8,
      maxTokens: 1500,
      workspaceId: request.workspaceId,
    });

    // Parse the response to extract variations
    const variations = this.parseVariations(result.content, platform);

    return {
      variations: variations.slice(0, count),
      cost: result.cost,
      tokensUsed: result.tokensUsed.total,
    };
  }

  /**
   * Build system prompt for content generation
   */
  private buildSystemPrompt(platform: string, tone?: string): string {
    const platformSpecs = this.getPlatformSpecifications(platform);
    const toneGuidance = tone ? this.getToneGuidance(tone) : '';

    return `You are a creative content creator AI agent specialized in generating engaging social media content.

Your personality: Creative, enthusiastic, and brand-aware. You understand platform-specific best practices and can adapt tone and style.

Platform: ${platform}
${platformSpecs}

${toneGuidance}

Generate authentic, engaging content optimized for the target platform. Focus on:
1. Platform-specific formatting and best practices
2. Engaging hooks and calls-to-action
3. Strategic hashtag placement
4. Audience resonance
5. Brand voice consistency

Return your response as a JSON array of content variations, each with:
{
  "text": "the post content",
  "hashtags": ["hashtag1", "hashtag2"],
  "mentions": ["@mention1"],
  "reasoning": "why this variation works"
}`;
  }

  /**
   * Build user prompt for content generation
   */
  private buildUserPrompt(
    request: ContentGenerationRequest,
    platform: string,
  ): string {
    const parts: string[] = [];

    if (request.prompt) {
      parts.push(`Prompt: ${request.prompt}`);
    }

    if (request.context?.topic) {
      parts.push(`Topic: ${request.context.topic}`);
    }

    if (request.context?.targetAudience) {
      parts.push(`Target Audience: ${request.context.targetAudience}`);
    }

    if (request.context?.keywords && request.context.keywords.length > 0) {
      parts.push(`Keywords to include: ${request.context.keywords.join(', ')}`);
    }

    parts.push(
      `\nGenerate ${request.variations || 3} unique content variations for ${platform}.`,
    );

    return parts.join('\n');
  }

  /**
   * Get platform-specific specifications
   */
  private getPlatformSpecifications(platform: string): string {
    const specs: Record<string, string> = {
      instagram: `
Character Limit: 2,200 (but first 125 characters are most important)
Best Practices:
- Use 3-5 relevant hashtags (up to 30 allowed)
- Place hashtags at the end or in first comment
- Include emojis for visual appeal
- Ask questions to drive engagement
- Use line breaks for readability`,

      twitter: `
Character Limit: 280 characters
Best Practices:
- Be concise and punchy
- Use 1-2 hashtags maximum
- Include relevant mentions
- Front-load important information
- Use threads for longer content`,

      linkedin: `
Character Limit: 3,000 (but first 140 characters are preview)
Best Practices:
- Professional tone
- Value-driven content
- Use 3-5 hashtags
- Include industry insights
- Encourage professional discussion`,

      facebook: `
Character Limit: 63,206 (but shorter is better)
Best Practices:
- Conversational tone
- Ask questions
- Use emojis moderately
- Include clear call-to-action
- Optimal length: 40-80 characters`,

      tiktok: `
Character Limit: 2,200
Best Practices:
- Casual, authentic tone
- Use trending hashtags
- Include call-to-action
- Leverage trending sounds/challenges
- Encourage duets and stitches`,
    };

    return specs[platform.toLowerCase()] || specs.instagram;
  }

  /**
   * Get tone guidance
   */
  private getToneGuidance(tone: string): string {
    const guidance: Record<string, string> = {
      professional: `
Tone: Professional
- Use formal language
- Focus on expertise and credibility
- Avoid slang and casual expressions
- Maintain authoritative voice`,

      casual: `
Tone: Casual
- Use conversational language
- Include relatable expressions
- Be friendly and approachable
- Use contractions naturally`,

      friendly: `
Tone: Friendly
- Warm and welcoming language
- Use inclusive pronouns (we, us)
- Show empathy and understanding
- Create connection with audience`,

      formal: `
Tone: Formal
- Sophisticated vocabulary
- Structured sentences
- Avoid colloquialisms
- Maintain professional distance`,

      humorous: `
Tone: Humorous
- Light-hearted and playful
- Use wit and clever wordplay
- Include appropriate humor
- Keep it tasteful and brand-appropriate`,
    };

    return guidance[tone] || '';
  }

  /**
   * Parse variations from AI response
   */
  private parseVariations(
    content: string,
    platform: string,
  ): ContentVariation[] {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      const variations = Array.isArray(parsed) ? parsed : [parsed];

      return variations.map((v, index) => ({
        id: `var-${Date.now()}-${index}`,
        content: {
          text: v.text || '',
          hashtags: v.hashtags || [],
          mentions: v.mentions || [],
        },
        platform,
        score: 0, // Will be scored later
        reasoning: v.reasoning || '',
      }));
    } catch (error) {
      // Fallback: treat as single text variation
      this.logger.warn('Failed to parse JSON response, using fallback');
      return [
        {
          id: `var-${Date.now()}-0`,
          content: {
            text: content,
            hashtags: [],
            mentions: [],
          },
          platform,
          score: 0,
          reasoning: 'Generated content',
        },
      ];
    }
  }

  /**
   * Score content variations based on quality metrics
   */
  private async scoreVariations(
    variations: ContentVariation[],
    workspaceId: string,
  ): Promise<ContentVariation[]> {
    const scoredVariations = variations.map((variation) => {
      const score = this.calculateQualityScore(variation);
      return { ...variation, score };
    });

    // Sort by score descending
    return scoredVariations.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate quality score for content
   */
  private calculateQualityScore(variation: ContentVariation): number {
    let score = 50; // Base score

    const text = variation.content.text;
    const platform = variation.platform.toLowerCase();

    // Length appropriateness (0-20 points)
    const lengthScore = this.scoreLengthAppropriate(text, platform);
    score += lengthScore;

    // Hashtag usage (0-15 points)
    const hashtagScore = this.scoreHashtagUsage(
      variation.content.hashtags,
      platform,
    );
    score += hashtagScore;

    // Engagement elements (0-15 points)
    const engagementScore = this.scoreEngagementElements(text);
    score += engagementScore;

    // Readability (0-10 points)
    const readabilityScore = this.scoreReadability(text);
    score += readabilityScore;

    // Emoji usage (0-10 points)
    const emojiScore = this.scoreEmojiUsage(text, platform);
    score += emojiScore;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Score length appropriateness
   */
  private scoreLengthAppropriate(text: string, platform: string): number {
    const length = text.length;
    const optimalRanges: Record<string, { min: number; max: number }> = {
      twitter: { min: 100, max: 280 },
      instagram: { min: 100, max: 300 },
      linkedin: { min: 150, max: 500 },
      facebook: { min: 40, max: 200 },
      tiktok: { min: 100, max: 300 },
    };

    const range = optimalRanges[platform] || { min: 100, max: 300 };

    if (length >= range.min && length <= range.max) {
      return 20;
    } else if (length < range.min) {
      return Math.max(0, 20 - (range.min - length) / 10);
    } else {
      return Math.max(0, 20 - (length - range.max) / 20);
    }
  }

  /**
   * Score hashtag usage
   */
  private scoreHashtagUsage(hashtags: string[], platform: string): number {
    const count = hashtags.length;
    const optimalCounts: Record<string, { min: number; max: number }> = {
      twitter: { min: 1, max: 2 },
      instagram: { min: 5, max: 15 },
      linkedin: { min: 3, max: 5 },
      facebook: { min: 1, max: 3 },
      tiktok: { min: 3, max: 8 },
    };

    const range = optimalCounts[platform] || { min: 3, max: 10 };

    if (count >= range.min && count <= range.max) {
      return 15;
    } else if (count === 0) {
      return 0;
    } else if (count < range.min) {
      return 10;
    } else {
      return Math.max(0, 15 - (count - range.max) * 2);
    }
  }

  /**
   * Score engagement elements
   */
  private scoreEngagementElements(text: string): number {
    let score = 0;

    // Check for questions
    if (text.includes('?')) score += 5;

    // Check for call-to-action words
    const ctaWords = [
      'click',
      'learn',
      'discover',
      'explore',
      'join',
      'share',
      'comment',
      'tag',
      'follow',
    ];
    if (ctaWords.some((word) => text.toLowerCase().includes(word))) score += 5;

    // Check for emotional words
    const emotionalWords = [
      'love',
      'amazing',
      'excited',
      'incredible',
      'awesome',
      'fantastic',
    ];
    if (emotionalWords.some((word) => text.toLowerCase().includes(word)))
      score += 5;

    return score;
  }

  /**
   * Score readability
   */
  private scoreReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;

    // Optimal: 10-20 words per sentence
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      return 10;
    } else if (avgWordsPerSentence < 10) {
      return Math.max(0, 10 - (10 - avgWordsPerSentence));
    } else {
      return Math.max(0, 10 - (avgWordsPerSentence - 20) / 2);
    }
  }

  /**
   * Score emoji usage
   */
  private scoreEmojiUsage(text: string, platform: string): number {
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojiCount = (text.match(emojiRegex) || []).length;

    const optimalCounts: Record<string, number> = {
      twitter: 2,
      instagram: 5,
      linkedin: 1,
      facebook: 3,
      tiktok: 4,
    };

    const optimal = optimalCounts[platform] || 3;

    if (emojiCount === optimal) {
      return 10;
    } else if (emojiCount === 0 && platform === 'linkedin') {
      return 10; // LinkedIn can work without emojis
    } else if (emojiCount === 0) {
      return 5;
    } else {
      return Math.max(0, 10 - Math.abs(emojiCount - optimal) * 2);
    }
  }

  /**
   * Optimize existing content
   */
  async optimizeContent(
    request: ContentOptimizationRequest,
  ): Promise<ContentOptimizationResponse> {
    this.logger.log(
      `Optimizing content for ${request.platform} with goals: ${request.optimizationGoals.join(', ')}`,
    );

    const systemPrompt = `You are a content optimization specialist. Analyze the provided content and suggest improvements to maximize ${request.optimizationGoals.join(', ')}.

Platform: ${request.platform}
${this.getPlatformSpecifications(request.platform)}

Provide your response as JSON:
{
  "optimizedContent": "the improved version",
  "suggestions": [
    {
      "type": "category",
      "original": "original text",
      "suggested": "improved text",
      "reasoning": "why this improves performance"
    }
  ],
  "predictedPerformance": {
    "engagementRate": 0.05,
    "reachEstimate": 10000
  }
}`;

    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Original content:\n${request.content}\n\nOptimize this content.`,
        },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.7,
      maxTokens: 1000,
      workspaceId: request.workspaceId,
    });

    try {
      const parsed = JSON.parse(result.content);
      return parsed;
    } catch (error) {
      // Fallback response
      return {
        optimizedContent: request.content,
        suggestions: [],
        predictedPerformance: {
          engagementRate: 0.03,
          reachEstimate: 5000,
        },
      };
    }
  }

  /**
   * Check brand voice consistency
   */
  async checkBrandVoice(
    content: string,
    brandVoice: BrandVoiceProfile,
    workspaceId: string,
  ): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    this.logger.log(`Checking brand voice consistency for workspace ${workspaceId}`);

    const systemPrompt = `You are a brand voice consistency checker. Analyze the content against the brand voice profile and identify any inconsistencies.

Brand Voice Profile:
- Tone: ${brandVoice.tone}
- Description: ${brandVoice.description}
- Guidelines: ${brandVoice.guidelines}
- Vocabulary to use: ${brandVoice.vocabulary.join(', ')}
- Words to avoid: ${brandVoice.avoidWords.join(', ')}

Provide your response as JSON:
{
  "score": 85,
  "issues": ["list of issues"],
  "suggestions": ["list of suggestions"]
}`;

    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Content to check:\n${content}` },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.3,
      maxTokens: 500,
      workspaceId,
    });

    try {
      return JSON.parse(result.content);
    } catch (error) {
      return {
        score: 75,
        issues: [],
        suggestions: [],
      };
    }
  }
}
