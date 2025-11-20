import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType } from '@prisma/client';
import { ExtractedEntity } from '../interfaces/intent-match.interface';

@Injectable()
export class EntityExtractionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Extract entities from user input based on chatbot entity definitions
   */
  async extractEntities(
    chatbotId: string,
    text: string,
    requiredEntities: string[] = [],
  ): Promise<ExtractedEntity[]> {
    const entities = await this.prisma.chatbotEntity.findMany({
      where: { chatbotId },
    });

    const extracted: ExtractedEntity[] = [];

    for (const entity of entities) {
      const values = this.extractEntityValues(text, entity);
      extracted.push(...values);

      // Update extraction count
      if (values.length > 0) {
        await this.prisma.chatbotEntity.update({
          where: { id: entity.id },
          data: { extractionCount: { increment: values.length } },
        });
      }
    }

    return extracted;
  }

  /**
   * Extract entity values based on entity type
   */
  private extractEntityValues(text: string, entity: any): ExtractedEntity[] {
    const extracted: ExtractedEntity[] = [];

    switch (entity.type) {
      case EntityType.SYSTEM_EMAIL:
        extracted.push(...this.extractEmails(text, entity.name));
        break;

      case EntityType.SYSTEM_PHONE:
        extracted.push(...this.extractPhoneNumbers(text, entity.name));
        break;

      case EntityType.SYSTEM_URL:
        extracted.push(...this.extractUrls(text, entity.name));
        break;

      case EntityType.SYSTEM_NUMBER:
        extracted.push(...this.extractNumbers(text, entity.name));
        break;

      case EntityType.SYSTEM_DATE:
        extracted.push(...this.extractDates(text, entity.name));
        break;

      case EntityType.CUSTOM_LIST:
        extracted.push(...this.extractCustomList(text, entity.name, entity.values));
        break;

      case EntityType.CUSTOM_REGEX:
        extracted.push(...this.extractRegex(text, entity.name, entity.pattern));
        break;

      case EntityType.SYSTEM_TEXT:
        // For free text, we don't extract automatically
        break;
    }

    return extracted;
  }

  /**
   * Extract email addresses
   */
  private extractEmails(text: string, entityName: string): ExtractedEntity[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailRegex) || [];

    return matches.map((email) => ({
      name: entityName,
      value: email,
      type: EntityType.SYSTEM_EMAIL,
      confidence: 1.0,
    }));
  }

  /**
   * Extract phone numbers
   */
  private extractPhoneNumbers(text: string, entityName: string): ExtractedEntity[] {
    // Simple phone number patterns
    const phoneRegex = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    const matches = text.match(phoneRegex) || [];

    return matches.map((phone) => ({
      name: entityName,
      value: phone,
      type: EntityType.SYSTEM_PHONE,
      confidence: 0.9,
    }));
  }

  /**
   * Extract URLs
   */
  private extractUrls(text: string, entityName: string): ExtractedEntity[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = text.match(urlRegex) || [];

    return matches.map((url) => ({
      name: entityName,
      value: url,
      type: EntityType.SYSTEM_URL,
      confidence: 1.0,
    }));
  }

  /**
   * Extract numbers
   */
  private extractNumbers(text: string, entityName: string): ExtractedEntity[] {
    const numberRegex = /\b\d+(\.\d+)?\b/g;
    const matches = text.match(numberRegex) || [];

    return matches.map((num) => ({
      name: entityName,
      value: parseFloat(num),
      type: EntityType.SYSTEM_NUMBER,
      confidence: 1.0,
    }));
  }

  /**
   * Extract dates (simple patterns)
   */
  private extractDates(text: string, entityName: string): ExtractedEntity[] {
    const extracted: ExtractedEntity[] = [];

    // Pattern: MM/DD/YYYY or DD/MM/YYYY
    const dateRegex1 = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
    let match;

    while ((match = dateRegex1.exec(text)) !== null) {
      extracted.push({
        name: entityName,
        value: match[0],
        type: EntityType.SYSTEM_DATE,
        confidence: 0.9,
      });
    }

    // Pattern: YYYY-MM-DD
    const dateRegex2 = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;

    while ((match = dateRegex2.exec(text)) !== null) {
      extracted.push({
        name: entityName,
        value: match[0],
        type: EntityType.SYSTEM_DATE,
        confidence: 1.0,
      });
    }

    // Common date words
    const dateWords = ['today', 'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const lowerText = text.toLowerCase();

    for (const word of dateWords) {
      if (lowerText.includes(word)) {
        extracted.push({
          name: entityName,
          value: word,
          type: EntityType.SYSTEM_DATE,
          confidence: 0.8,
        });
      }
    }

    return extracted;
  }

  /**
   * Extract custom list entities
   */
  private extractCustomList(text: string, entityName: string, values: any): ExtractedEntity[] {
    if (!values || !Array.isArray(values)) {
      return [];
    }

    const extracted: ExtractedEntity[] = [];
    const lowerText = text.toLowerCase();

    for (const item of values) {
      const value = item.value?.toLowerCase();
      const synonyms = item.synonyms || [];

      // Check main value
      if (value && lowerText.includes(value)) {
        extracted.push({
          name: entityName,
          value: item.value,
          type: EntityType.CUSTOM_LIST,
          confidence: 1.0,
        });
        continue;
      }

      // Check synonyms
      for (const synonym of synonyms) {
        if (lowerText.includes(synonym.toLowerCase())) {
          extracted.push({
            name: entityName,
            value: item.value,
            type: EntityType.CUSTOM_LIST,
            confidence: 0.95,
          });
          break;
        }
      }
    }

    return extracted;
  }

  /**
   * Extract using custom regex pattern
   */
  private extractRegex(text: string, entityName: string, pattern: string): ExtractedEntity[] {
    if (!pattern) {
      return [];
    }

    try {
      const regex = new RegExp(pattern, 'g');
      const matches = text.match(regex) || [];

      return matches.map((match) => ({
        name: entityName,
        value: match,
        type: EntityType.CUSTOM_REGEX,
        confidence: 1.0,
      }));
    } catch (error) {
      console.error('Invalid regex pattern:', pattern, error);
      return [];
    }
  }

  /**
   * Validate that all required entities are present
   */
  validateRequiredEntities(
    extracted: ExtractedEntity[],
    required: string[],
  ): { valid: boolean; missing: string[] } {
    const extractedNames = new Set(extracted.map((e) => e.name));
    const missing = required.filter((name) => !extractedNames.has(name));

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
