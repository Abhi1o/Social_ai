import { Injectable, BadRequestException } from '@nestjs/common';
import { 
  BooleanOperator,
  QueryNode,
  ParsedQuery,
  PlatformQuery,
} from '../interfaces/boolean-query.interface';
import { Platform } from '@prisma/client';

/**
 * Service for building and parsing boolean search queries
 * Supports operators: AND, OR, NOT
 * Supports grouping with parentheses
 * Supports phrase matching with quotes
 */
@Injectable()
export class BooleanQueryBuilderService {
  /**
   * Parse a boolean query string into a structured query tree
   */
  parse(queryString: string): ParsedQuery {
    if (!queryString || queryString.trim().length === 0) {
      throw new BadRequestException('Query string cannot be empty');
    }

    const tokens = this.tokenize(queryString);
    const root = this.buildQueryTree(tokens);
    
    const keywords: string[] = [];
    const phrases: string[] = [];
    const excludedTerms: string[] = [];
    
    this.extractTerms(root, keywords, phrases, excludedTerms);
    
    return {
      root,
      keywords: [...new Set(keywords)],
      phrases: [...new Set(phrases)],
      excludedTerms: [...new Set(excludedTerms)],
    };
  }

  /**
   * Convert a parsed query to platform-specific format
   */
  toPlatformQuery(parsed: ParsedQuery, platform: Platform): PlatformQuery {
    const query = this.nodeToString(parsed.root, platform);
    
    return {
      platform,
      query,
      filters: this.getPlatformFilters(platform),
    };
  }

  /**
   * Validate a boolean query string
   */
  validate(queryString: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Check for empty query
      if (!queryString || queryString.trim().length === 0) {
        errors.push('Query cannot be empty');
        return { valid: false, errors };
      }

      // Check for balanced parentheses
      if (!this.hasBalancedParentheses(queryString)) {
        errors.push('Unbalanced parentheses');
      }

      // Check for balanced quotes
      if (!this.hasBalancedQuotes(queryString)) {
        errors.push('Unbalanced quotes');
      }

      // Try to parse
      this.parse(queryString);
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      return { valid: false, errors };
    }
  }

  /**
   * Build a query string from keywords and operators
   */
  build(keywords: string[], operator: BooleanOperator = BooleanOperator.OR): string {
    if (!keywords || keywords.length === 0) {
      throw new BadRequestException('Keywords array cannot be empty');
    }

    if (keywords.length === 1) {
      return this.escapeKeyword(keywords[0]);
    }

    return keywords
      .map(k => this.escapeKeyword(k))
      .join(` ${operator} `);
  }

  /**
   * Tokenize a query string
   */
  private tokenize(query: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let inParentheses = 0;

    for (let i = 0; i < query.length; i++) {
      const char = query[i];

      if (char === '"') {
        if (inQuotes) {
          current += char;
          tokens.push(current);
          current = '';
          inQuotes = false;
        } else {
          if (current.trim()) {
            tokens.push(current.trim());
          }
          current = char;
          inQuotes = true;
        }
      } else if (char === '(' && !inQuotes) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        tokens.push('(');
        inParentheses++;
      } else if (char === ')' && !inQuotes) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        tokens.push(')');
        inParentheses--;
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  /**
   * Build a query tree from tokens
   */
  private buildQueryTree(tokens: string[]): QueryNode {
    if (tokens.length === 0) {
      throw new BadRequestException('No tokens to parse');
    }

    const stack: QueryNode[] = [];
    const operators: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token === '(') {
        operators.push(token);
      } else if (token === ')') {
        while (operators.length > 0 && operators[operators.length - 1] !== '(') {
          this.processOperator(stack, operators.pop()!);
        }
        operators.pop(); // Remove '('
      } else if (this.isOperator(token)) {
        // For NOT operator, handle it with higher precedence
        if (token === BooleanOperator.NOT) {
          while (
            operators.length > 0 &&
            operators[operators.length - 1] !== '(' &&
            this.precedence(operators[operators.length - 1]) > this.precedence(token)
          ) {
            this.processOperator(stack, operators.pop()!);
          }
        } else {
          while (
            operators.length > 0 &&
            operators[operators.length - 1] !== '(' &&
            this.precedence(operators[operators.length - 1]) >= this.precedence(token)
          ) {
            this.processOperator(stack, operators.pop()!);
          }
        }
        operators.push(token);
      } else {
        // It's a term or phrase
        stack.push(this.createTermNode(token));
      }
    }

    while (operators.length > 0) {
      const op = operators.pop()!;
      if (op !== '(') {
        this.processOperator(stack, op);
      }
    }

    if (stack.length !== 1) {
      throw new BadRequestException('Invalid query structure');
    }

    return stack[0];
  }

  /**
   * Process an operator and combine nodes
   */
  private processOperator(stack: QueryNode[], operator: string): void {
    if (operator === BooleanOperator.NOT) {
      if (stack.length < 1) {
        throw new BadRequestException('NOT operator requires an operand');
      }
      const operand = stack.pop()!;
      stack.push({
        type: 'operator',
        operator: BooleanOperator.NOT,
        children: [operand],
      });
    } else {
      if (stack.length < 2) {
        throw new BadRequestException(`${operator} operator requires two operands`);
      }
      const right = stack.pop()!;
      const left = stack.pop()!;
      stack.push({
        type: 'operator',
        operator: operator as BooleanOperator,
        children: [left, right],
      });
    }
  }

  /**
   * Create a term or phrase node
   */
  private createTermNode(token: string): QueryNode {
    if (token.startsWith('"') && token.endsWith('"')) {
      return {
        type: 'phrase',
        value: token.slice(1, -1),
      };
    }
    return {
      type: 'term',
      value: token,
    };
  }

  /**
   * Check if a token is an operator
   */
  private isOperator(token: string): boolean {
    return token === BooleanOperator.AND || 
           token === BooleanOperator.OR || 
           token === BooleanOperator.NOT;
  }

  /**
   * Get operator precedence
   */
  private precedence(operator: string): number {
    switch (operator) {
      case BooleanOperator.NOT:
        return 3;
      case BooleanOperator.AND:
        return 2;
      case BooleanOperator.OR:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Extract terms from query tree
   */
  private extractTerms(
    node: QueryNode,
    keywords: string[],
    phrases: string[],
    excludedTerms: string[],
    isNegated = false,
  ): void {
    if (node.type === 'term') {
      if (isNegated) {
        excludedTerms.push(node.value!);
      } else {
        keywords.push(node.value!);
      }
    } else if (node.type === 'phrase') {
      if (isNegated) {
        excludedTerms.push(node.value!);
      } else {
        phrases.push(node.value!);
      }
    } else if (node.type === 'operator') {
      const isNot = node.operator === BooleanOperator.NOT;
      node.children?.forEach(child => {
        this.extractTerms(child, keywords, phrases, excludedTerms, isNegated || isNot);
      });
    }
  }

  /**
   * Convert query node to string for a specific platform
   */
  private nodeToString(node: QueryNode, platform: Platform): string {
    if (node.type === 'term') {
      return this.formatTerm(node.value!, platform);
    } else if (node.type === 'phrase') {
      return this.formatPhrase(node.value!, platform);
    } else if (node.type === 'operator') {
      const operator = this.formatOperator(node.operator!, platform);
      const children = node.children!.map(child => this.nodeToString(child, platform));
      
      if (node.operator === BooleanOperator.NOT) {
        return `${operator}${children[0]}`;
      }
      
      return `(${children.join(` ${operator} `)})`;
    }
    return '';
  }

  /**
   * Format a term for a specific platform
   */
  private formatTerm(term: string, platform: Platform): string {
    switch (platform) {
      case Platform.TWITTER:
        return term;
      case Platform.INSTAGRAM:
        return term;
      case Platform.FACEBOOK:
        return term;
      case Platform.LINKEDIN:
        return term;
      case Platform.TIKTOK:
        return term;
      default:
        return term;
    }
  }

  /**
   * Format a phrase for a specific platform
   */
  private formatPhrase(phrase: string, platform: Platform): string {
    return `"${phrase}"`;
  }

  /**
   * Format an operator for a specific platform
   */
  private formatOperator(operator: BooleanOperator, platform: Platform): string {
    switch (platform) {
      case Platform.TWITTER:
        if (operator === BooleanOperator.NOT) return '-';
        return operator;
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
      case Platform.LINKEDIN:
      case Platform.TIKTOK:
      default:
        return operator;
    }
  }

  /**
   * Get platform-specific filters
   */
  private getPlatformFilters(platform: Platform): Record<string, any> {
    const filters: Record<string, any> = {};
    
    switch (platform) {
      case Platform.TWITTER:
        filters.tweet_mode = 'extended';
        break;
      case Platform.INSTAGRAM:
        filters.media_type = 'all';
        break;
      default:
        break;
    }
    
    return filters;
  }

  /**
   * Check if parentheses are balanced
   */
  private hasBalancedParentheses(query: string): boolean {
    let count = 0;
    for (const char of query) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Check if quotes are balanced
   */
  private hasBalancedQuotes(query: string): boolean {
    let count = 0;
    for (const char of query) {
      if (char === '"') count++;
    }
    return count % 2 === 0;
  }

  /**
   * Escape special characters in a keyword
   */
  private escapeKeyword(keyword: string): string {
    // If keyword contains spaces, wrap in quotes
    if (keyword.includes(' ')) {
      return `"${keyword}"`;
    }
    return keyword;
  }
}
