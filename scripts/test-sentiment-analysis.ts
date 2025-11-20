/**
 * Test script for Sentiment Analysis Engine
 * 
 * This script demonstrates the sentiment analysis functionality
 * without requiring a full server setup.
 */

import { SentimentAnalysisService } from '../src/listening/services/sentiment-analysis.service';

// Mock PrismaService for testing
const mockPrismaService = {
  listeningMention: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
} as any;

async function testSentimentAnalysis() {
  console.log('🚀 Testing Sentiment Analysis Engine\n');
  console.log('=' .repeat(60));

  const service = new SentimentAnalysisService(mockPrismaService);

  // Wait for model initialization
  console.log('\n⏳ Initializing AI model (this may take a few seconds)...\n');
  await service.onModuleInit();

  // Test 1: Positive sentiment
  console.log('Test 1: Positive Sentiment');
  console.log('-'.repeat(60));
  const positive = await service.analyzeSentiment(
    'I absolutely love this product! It works amazingly well and exceeded all my expectations.',
  );
  console.log('Text: "I absolutely love this product! It works amazingly well..."');
  console.log(`Result: ${positive.sentiment}`);
  console.log(`Score: ${positive.score.toFixed(2)}`);
  console.log(`Confidence: ${(positive.confidence * 100).toFixed(1)}%`);
  console.log(`Raw Scores:`, {
    positive: (positive.rawScores.positive * 100).toFixed(1) + '%',
    neutral: (positive.rawScores.neutral * 100).toFixed(1) + '%',
    negative: (positive.rawScores.negative * 100).toFixed(1) + '%',
  });

  // Test 2: Negative sentiment
  console.log('\n\nTest 2: Negative Sentiment');
  console.log('-'.repeat(60));
  const negative = await service.analyzeSentiment(
    'This is terrible! Worst experience ever. Completely disappointed and angry.',
  );
  console.log('Text: "This is terrible! Worst experience ever..."');
  console.log(`Result: ${negative.sentiment}`);
  console.log(`Score: ${negative.score.toFixed(2)}`);
  console.log(`Confidence: ${(negative.confidence * 100).toFixed(1)}%`);
  console.log(`Raw Scores:`, {
    positive: (negative.rawScores.positive * 100).toFixed(1) + '%',
    neutral: (negative.rawScores.neutral * 100).toFixed(1) + '%',
    negative: (negative.rawScores.negative * 100).toFixed(1) + '%',
  });

  // Test 3: Neutral sentiment
  console.log('\n\nTest 3: Neutral Sentiment');
  console.log('-'.repeat(60));
  const neutral = await service.analyzeSentiment(
    'The product arrived on time. It has standard features and works as described.',
  );
  console.log('Text: "The product arrived on time. It has standard features..."');
  console.log(`Result: ${neutral.sentiment}`);
  console.log(`Score: ${neutral.score.toFixed(2)}`);
  console.log(`Confidence: ${(neutral.confidence * 100).toFixed(1)}%`);
  console.log(`Raw Scores:`, {
    positive: (neutral.rawScores.positive * 100).toFixed(1) + '%',
    neutral: (neutral.rawScores.neutral * 100).toFixed(1) + '%',
    negative: (neutral.rawScores.negative * 100).toFixed(1) + '%',
  });

  // Test 4: Batch analysis
  console.log('\n\nTest 4: Batch Sentiment Analysis');
  console.log('-'.repeat(60));
  const texts = [
    'Great service!',
    'Not happy with this.',
    'It works fine.',
  ];
  const batchResults = await service.analyzeSentimentBatch(texts);
  
  texts.forEach((text, index) => {
    const result = batchResults[index];
    console.log(`\nText ${index + 1}: "${text}"`);
    console.log(`  Sentiment: ${result.sentiment}`);
    console.log(`  Score: ${result.score.toFixed(2)}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  });

  // Test 5: Text preprocessing
  console.log('\n\nTest 5: Text Preprocessing (URLs, Mentions, Hashtags)');
  console.log('-'.repeat(60));
  const preprocessed = await service.analyzeSentiment(
    'Check out https://example.com @user #amazing product! Love it! #bestever',
  );
  console.log('Text: "Check out https://example.com @user #amazing product! Love it! #bestever"');
  console.log(`Result: ${preprocessed.sentiment}`);
  console.log(`Score: ${preprocessed.score.toFixed(2)}`);
  console.log('Note: URLs, mentions, and hashtag symbols are automatically removed');

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed successfully!\n');
}

// Run tests
testSentimentAnalysis().catch(error => {
  console.error('❌ Error running tests:', error);
  process.exit(1);
});
