import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandVoiceProfile } from '../agents/content-creator.agent';

interface TrainingData {
  patterns: {
    sentenceStructure: Array<'short' | 'medium' | 'long'>;
    commonPhrases: string[];
    punctuationStyle: 'formal' | 'enthusiastic' | 'inquisitive';
    averageWordLength: number;
    vocabularyComplexity: 'simple' | 'medium' | 'complex';
  };
  analyzedAt: Date;
}

type ToneKeyword = 'professional' | 'casual' | 'friendly' | 'formal';

@Injectable()
export class BrandVoiceService {
  private readonly logger = new Logger(BrandVoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create brand voice profile with training
   */
  async createBrandVoice(data: {
    workspaceId: string;
    name: string;
    description?: string;
    tone: string;
    vocabulary?: string[];
    avoidWords?: string[];
    examples: string[];
    guidelines?: string;
    isDefault?: boolean;
  }): Promise<BrandVoiceProfile> {
    // Validate examples
    if (!data.examples || data.examples.length === 0) {
      throw new BadRequestException('At least one example is required for training');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.brandVoice.updateMany({
        where: {
          workspaceId: data.workspaceId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Analyze training data from examples
    const trainingData = this.analyzeExamples(data.examples);
    const consistencyScore = this.calculateConsistencyScore(data.examples, trainingData);

    const brandVoice = await this.prisma.brandVoice.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        tone: data.tone,
        vocabulary: data.vocabulary || [],
        avoidWords: data.avoidWords || [],
        examples: data.examples,
        guidelines: data.guidelines,
        isDefault: data.isDefault || false,
        trainingData: trainingData as any,
        consistencyScore,
      },
    });

    this.logger.log(`Brand voice created: ${brandVoice.id} for workspace ${data.workspaceId}`);

    return this.mapToProfile(brandVoice);
  }

  /**
   * Update brand voice profile
   */
  async updateBrandVoice(
    id: string,
    workspaceId: string,
    data: {
      name?: string;
      description?: string;
      tone?: string;
      vocabulary?: string[];
      avoidWords?: string[];
      examples?: string[];
      guidelines?: string;
      isDefault?: boolean;
    },
  ): Promise<BrandVoiceProfile> {
    // Verify ownership
    const existing = await this.prisma.brandVoice.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Brand voice ${id} not found`);
    }

    if (existing.workspaceId !== workspaceId) {
      throw new ForbiddenException('Cannot access this brand voice profile');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.brandVoice.updateMany({
        where: {
          workspaceId,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Re-analyze if examples changed
    let trainingData = existing.trainingData as unknown as TrainingData;
    let consistencyScore = existing.consistencyScore;

    if (data.examples && data.examples.length > 0) {
      trainingData = this.analyzeExamples(data.examples);
      consistencyScore = this.calculateConsistencyScore(data.examples, trainingData);
    }

    const updated = await this.prisma.brandVoice.update({
      where: { id },
      data: {
        ...data,
        trainingData: trainingData as any,
        consistencyScore,
      },
    });

    this.logger.log(`Brand voice updated: ${id}`);

    return this.mapToProfile(updated);
  }

  /**
   * Get brand voice by ID
   */
  async getBrandVoice(
    id: string,
    workspaceId: string,
  ): Promise<BrandVoiceProfile> {
    const brandVoice = await this.prisma.brandVoice.findUnique({
      where: { id },
    });

    if (!brandVoice) {
      throw new NotFoundException(`Brand voice ${id} not found`);
    }

    if (brandVoice.workspaceId !== workspaceId) {
      throw new ForbiddenException('Cannot access this brand voice profile');
    }

    return this.mapToProfile(brandVoice);
  }

  /**
   * Get all brand voices for workspace
   */
  async getBrandVoices(workspaceId: string): Promise<BrandVoiceProfile[]> {
    const voices = await this.prisma.brandVoice.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return voices.map(v => this.mapToProfile(v));
  }

  /**
   * Delete brand voice
   */
  async deleteBrandVoice(id: string, workspaceId: string): Promise<void> {
    const brandVoice = await this.prisma.brandVoice.findUnique({
      where: { id },
    });

    if (!brandVoice) {
      throw new NotFoundException(`Brand voice ${id} not found`);
    }

    if (brandVoice.workspaceId !== workspaceId) {
      throw new ForbiddenException('Cannot access this brand voice profile');
    }

    await this.prisma.brandVoice.delete({
      where: { id },
    });

    this.logger.log(`Brand voice deleted: ${id}`);
  }

  /**
   * Get default brand voice for workspace
   */
  async getDefaultBrandVoice(
    workspaceId: string,
  ): Promise<BrandVoiceProfile | null> {
    const brandVoice = await this.prisma.brandVoice.findFirst({
      where: {
        workspaceId,
        isDefault: true,
        isActive: true,
      },
    });

    return brandVoice ? this.mapToProfile(brandVoice) : null;
  }

  /**
   * Analyze examples to extract patterns
   */
  private analyzeExamples(examples: string[]): TrainingData {
    const patterns: TrainingData['patterns'] = {
      sentenceStructure: [],
      commonPhrases: [],
      punctuationStyle: 'formal',
      averageWordLength: 0,
      vocabularyComplexity: 'medium',
    };

    // Analyze sentence structure
    const sentences = examples.flatMap(ex => ex.split(/[.!?]+/).filter(s => s.trim()));
    patterns.sentenceStructure = sentences.map(s => {
      const words = s.trim().split(/\s+/).length;
      if (words <= 5) return 'short';
      if (words <= 15) return 'medium';
      return 'long';
    });

    // Extract common phrases (2-3 word combinations)
    const words = examples.join(' ').toLowerCase().split(/\s+/);
    const phrases = new Map<string, number>();
    
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
    }

    patterns.commonPhrases = Array.from(phrases.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);

    // Analyze punctuation style
    const exclamations = (examples.join('').match(/!/g) || []).length;
    const questions = (examples.join('').match(/\?/g) || []).length;
    const periods = (examples.join('').match(/\./g) || []).length;
    
    if (exclamations > periods * 0.3) {
      patterns.punctuationStyle = 'enthusiastic';
    } else if (questions > periods * 0.2) {
      patterns.punctuationStyle = 'inquisitive';
    } else {
      patterns.punctuationStyle = 'formal';
    }

    // Calculate average word length
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    patterns.averageWordLength = Math.round(totalLength / words.length * 10) / 10;

    // Determine vocabulary complexity
    const longWords = words.filter(w => w.length > 8).length;
    const complexity = longWords / words.length;
    
    if (complexity > 0.15) {
      patterns.vocabularyComplexity = 'complex';
    } else if (complexity < 0.05) {
      patterns.vocabularyComplexity = 'simple';
    } else {
      patterns.vocabularyComplexity = 'medium';
    }

    return {
      patterns,
      analyzedAt: new Date(),
    };
  }

  /**
   * Calculate consistency score across examples
   */
  private calculateConsistencyScore(examples: string[], trainingData: TrainingData): number {
    if (examples.length < 2) return 100;

    let score = 100;

    // Check sentence structure consistency
    const structures = trainingData.patterns.sentenceStructure;
    const structureVariety = new Set(structures).size / structures.length;
    if (structureVariety > 0.7) score -= 15; // Too much variety

    // Check if examples use similar vocabulary
    const allWords = examples.map(ex => 
      ex.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    
    const uniqueWords = new Set(allWords.flat());
    const totalWords = allWords.flat().length;
    const vocabularyRepetition = totalWords > 0 ? 1 - (uniqueWords.size / totalWords) : 0;
    
    if (vocabularyRepetition < 0.3) score -= 10; // Too little repetition
    if (vocabularyRepetition > 0.7) score -= 10; // Too much repetition

    // Check tone consistency through punctuation
    const punctuationVariety = examples.map(ex => {
      const hasExclamation = ex.includes('!');
      const hasQuestion = ex.includes('?');
      return `${hasExclamation}-${hasQuestion}`;
    });
    
    const uniquePunctuation = new Set(punctuationVariety).size;
    if (uniquePunctuation > examples.length * 0.5) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check content against brand voice
   */
  async checkBrandVoiceConsistency(
    content: string,
    brandVoiceId: string,
    workspaceId: string,
  ): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const brandVoice = await this.getBrandVoice(brandVoiceId, workspaceId);
    const trainingData = await this.prisma.brandVoice.findUnique({
      where: { id: brandVoiceId },
      select: { trainingData: true },
    });

    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for avoided words
    const contentLower = content.toLowerCase();
    const foundAvoidWords = brandVoice.avoidWords.filter(word =>
      contentLower.includes(word.toLowerCase())
    );

    if (foundAvoidWords.length > 0) {
      score -= foundAvoidWords.length * 10;
      issues.push(`Contains words to avoid: ${foundAvoidWords.join(', ')}`);
      suggestions.push(`Remove or replace: ${foundAvoidWords.join(', ')}`);
    }

    // Check for preferred vocabulary
    const hasPreferredWords = brandVoice.vocabulary.some(word =>
      contentLower.includes(word.toLowerCase())
    );

    if (brandVoice.vocabulary.length > 0 && !hasPreferredWords) {
      score -= 15;
      issues.push('Missing preferred vocabulary');
      suggestions.push(`Consider using: ${brandVoice.vocabulary.slice(0, 3).join(', ')}`);
    }

    // Check sentence structure if training data exists
    if (trainingData?.trainingData) {
      const data = trainingData.trainingData as unknown as TrainingData;
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      const avgWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

      const expectedStructure = data.patterns.sentenceStructure[0];
      let currentStructure = 'medium';
      if (avgWords <= 5) currentStructure = 'short';
      else if (avgWords > 15) currentStructure = 'long';

      if (currentStructure !== expectedStructure) {
        score -= 10;
        issues.push(`Sentence structure differs from brand voice (${currentStructure} vs ${expectedStructure})`);
        suggestions.push(`Adjust sentence length to match ${expectedStructure} sentences`);
      }

      // Check punctuation style
      const exclamations = (content.match(/!/g) || []).length;
      const questions = (content.match(/\?/g) || []).length;
      const periods = (content.match(/\./g) || []).length;

      let currentStyle = 'formal';
      if (exclamations > periods * 0.3) currentStyle = 'enthusiastic';
      else if (questions > periods * 0.2) currentStyle = 'inquisitive';

      if (currentStyle !== data.patterns.punctuationStyle) {
        score -= 10;
        issues.push(`Punctuation style differs (${currentStyle} vs ${data.patterns.punctuationStyle})`);
        suggestions.push(`Match the ${data.patterns.punctuationStyle} tone of your brand`);
      }
    }

    // Check tone alignment
    const toneKeywords: Record<ToneKeyword, string[]> = {
      professional: ['expertise', 'solution', 'optimize', 'strategic'],
      casual: ['hey', 'awesome', 'cool', 'fun'],
      friendly: ['welcome', 'happy', 'love', 'enjoy'],
      formal: ['therefore', 'furthermore', 'consequently', 'accordingly'],
    };

    const expectedTone = brandVoice.tone.toLowerCase() as ToneKeyword;
    if (toneKeywords[expectedTone]) {
      const hasToneWords = toneKeywords[expectedTone].some((word: string) =>
        contentLower.includes(word)
      );

      if (!hasToneWords) {
        score -= 10;
        suggestions.push(`Add ${expectedTone} tone with words like: ${toneKeywords[expectedTone].slice(0, 2).join(', ')}`);
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      suggestions,
    };
  }

  /**
   * Map database model to profile interface
   */
  private mapToProfile(brandVoice: any): BrandVoiceProfile {
    return {
      id: brandVoice.id,
      workspaceId: brandVoice.workspaceId,
      name: brandVoice.name,
      description: brandVoice.description || '',
      tone: brandVoice.tone,
      vocabulary: brandVoice.vocabulary || [],
      avoidWords: brandVoice.avoidWords || [],
      examples: brandVoice.examples || [],
      guidelines: brandVoice.guidelines || '',
    };
  }
}
