/**
 * Boolean query operators for building complex search queries
 */
export enum BooleanOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

/**
 * Represents a parsed boolean query node
 */
export interface QueryNode {
  type: 'term' | 'phrase' | 'operator' | 'group';
  value?: string;
  operator?: BooleanOperator;
  children?: QueryNode[];
}

/**
 * Result of parsing a boolean query
 */
export interface ParsedQuery {
  root: QueryNode;
  keywords: string[];
  phrases: string[];
  excludedTerms: string[];
}

/**
 * Platform-specific query format
 */
export interface PlatformQuery {
  platform: string;
  query: string;
  filters?: Record<string, any>;
}
