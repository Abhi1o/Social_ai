import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntentMatch } from '../interfaces/intent-match.interface';

@Injectable()
export class IntentMatchingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Match user input to an intent using simple similarity matching
   * In production, this would use a proper NLP model
   */
  async matchIntent(
    chatbotId: string,
    userInput: string,
    contexts: string[] = [],
  ): Promise<IntentMatch | null> {
    // Get all active intents for this chatbot
    const intents = await this.prisma.chatbotIntent.findMany({
      where: {
        chatbotId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    if (intents.length === 0) {
      return null;
    }

    const normalizedInput = this.normalizeText(userInput);
    let bestMatch: { intent: any; confidence: number } | null = null;

    for (const intent of intents) {
      // Check if required contexts are present
      if (intent.inputContexts.length > 0) {
        const hasRequiredContexts = intent.inputContexts.every((ctx) =>
          contexts.includes(ctx),
        );
        if (!hasRequiredContexts) {
          continue;
        }
      }

      // Calculate confidence based on training phrases
      let maxConfidence = 0;

      for (const phrase of intent.trainingPhrases) {
        const confidence = this.calculateSimilarity(
          normalizedInput,
          this.normalizeText(phrase),
        );
        maxConfidence = Math.max(maxConfidence, confidence);
      }

      // Update best match if this intent has higher confidence
      if (maxConfidence > (bestMatch?.confidence || 0)) {
        bestMatch = { intent, confidence: maxConfidence };
      }
    }

    // Get chatbot confidence threshold
    const chatbot = await this.prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { confidenceThreshold: true },
    });

    const threshold = chatbot?.confidenceThreshold || 0.7;

    // Return match only if confidence exceeds threshold
    if (bestMatch && bestMatch.confidence >= threshold) {
      // Update intent match count
      await this.prisma.chatbotIntent.update({
        where: { id: bestMatch.intent.id },
        data: {
          matchCount: { increment: 1 },
          lastMatchedAt: new Date(),
        },
      });

      return {
        intent: bestMatch.intent.name,
        confidence: bestMatch.confidence,
        entities: [], // Will be populated by entity extraction
        contexts: bestMatch.intent.outputContexts,
      };
    }

    return null;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a score between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    // Check for exact match
    if (str1 === str2) {
      return 1.0;
    }

    // Check for substring match
    if (longer.includes(shorter)) {
      return 0.9;
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Get random response from intent
   */
  async getIntentResponse(chatbotId: string, intentName: string): Promise<string> {
    const intent = await this.prisma.chatbotIntent.findFirst({
      where: {
        chatbotId,
        name: intentName,
        isActive: true,
      },
    });

    if (!intent || intent.responses.length === 0) {
      return 'I understand, but I\'m not sure how to respond to that.';
    }

    // Return random response
    const randomIndex = Math.floor(Math.random() * intent.responses.length);
    return intent.responses[randomIndex];
  }
}
