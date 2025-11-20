export interface IntentMatch {
  intent: string;
  confidence: number;
  entities: ExtractedEntity[];
  contexts: string[];
}

export interface ExtractedEntity {
  name: string;
  value: any;
  type: string;
  confidence?: number;
  startIndex?: number;
  endIndex?: number;
}

export interface NLPResult {
  text: string;
  intent?: IntentMatch;
  entities: ExtractedEntity[];
  sentiment?: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
}
