#!/usr/bin/env ts-node

/**
 * AI Infrastructure Verification Script
 * 
 * This script verifies that all AI infrastructure components are properly configured
 * and can be initialized without errors.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AICoordinatorService } from '../src/ai/services/ai-coordinator.service';
import { ModelRoutingService } from '../src/ai/services/model-routing.service';
import { CostTrackingService } from '../src/ai/services/cost-tracking.service';
import { CacheService } from '../src/ai/services/cache.service';
import { MultiAgentOrchestratorService } from '../src/ai/services/multi-agent-orchestrator.service';
import { LangChainService } from '../src/ai/services/langchain.service';
import { OpenAIService } from '../src/ai/providers/openai.service';
import { AnthropicService } from '../src/ai/providers/anthropic.service';

async function verifyAIInfrastructure() {
  console.log('🔍 Verifying AI Infrastructure...\n');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    // Get service instances
    const aiCoordinator = app.get(AICoordinatorService);
    const modelRouting = app.get(ModelRoutingService);
    const costTracking = app.get(CostTrackingService);
    const cache = app.get(CacheService);
    const orchestrator = app.get(MultiAgentOrchestratorService);
    const langchain = app.get(LangChainService);
    const openai = app.get(OpenAIService);
    const anthropic = app.get(AnthropicService);

    // Verification checks
    const checks = [
      {
        name: 'AI Coordinator Service',
        check: () => !!aiCoordinator,
        service: aiCoordinator,
      },
      {
        name: 'Model Routing Service',
        check: () => !!modelRouting,
        service: modelRouting,
      },
      {
        name: 'Cost Tracking Service',
        check: () => !!costTracking,
        service: costTracking,
      },
      {
        name: 'Cache Service',
        check: () => !!cache,
        service: cache,
      },
      {
        name: 'Multi-Agent Orchestrator',
        check: () => !!orchestrator,
        service: orchestrator,
      },
      {
        name: 'LangChain Service',
        check: () => !!langchain,
        service: langchain,
      },
      {
        name: 'OpenAI Service',
        check: () => !!openai,
        service: openai,
      },
      {
        name: 'Anthropic Service',
        check: () => !!anthropic,
        service: anthropic,
      },
    ];

    let allPassed = true;

    for (const { name, check, service } of checks) {
      const passed = check();
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${name}: ${passed ? 'Initialized' : 'Failed'}`);

      if (!passed) {
        allPassed = false;
      }
    }

    console.log('\n📊 Configuration Status:\n');

    // Check API key configuration
    const openaiConfigured = openai.isConfigured();
    const anthropicConfigured = anthropic.isConfigured();
    const langchainConfigured = langchain.isConfigured();

    console.log(
      `${openaiConfigured ? '✅' : '⚠️ '} OpenAI API Key: ${openaiConfigured ? 'Configured' : 'Not configured (set OPENAI_API_KEY)'}`,
    );
    console.log(
      `${anthropicConfigured ? '✅' : '⚠️ '} Anthropic API Key: ${anthropicConfigured ? 'Configured' : 'Not configured (set ANTHROPIC_API_KEY)'}`,
    );
    console.log(
      `${langchainConfigured ? '✅' : '⚠️ '} LangChain: ${langchainConfigured ? 'Configured' : 'Not configured'}`,
    );

    // Get routing stats
    console.log('\n📈 Model Routing Statistics:\n');
    const routingStats = modelRouting.getRoutingStats();
    console.log(`   Total Requests: ${routingStats.totalRequests}`);
    console.log(
      `   Cost-Efficient: ${routingStats.costEfficientPercentage.toFixed(1)}%`,
    );
    console.log(`   Premium: ${routingStats.premiumPercentage.toFixed(1)}%`);

    // Get cache stats
    console.log('\n💾 Cache Statistics:\n');
    const cacheStats = await cache.getStats();
    console.log(`   Total Keys: ${cacheStats.totalKeys}`);
    console.log(`   Memory Used: ${cacheStats.memoryUsed}`);
    console.log(`   Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

    // Test budget tracking
    console.log('\n💰 Budget Tracking Test:\n');
    const testWorkspaceId = 'test-workspace-verification';
    const budget = await costTracking.getWorkspaceBudget(testWorkspaceId);
    console.log(`   Monthly Budget: $${budget.monthlyBudget}`);
    console.log(`   Current Spend: $${budget.currentSpend.toFixed(2)}`);
    console.log(`   Alert Threshold: ${(budget.alertThreshold * 100).toFixed(0)}%`);
    console.log(`   Throttled: ${budget.isThrottled ? 'Yes' : 'No'}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ All AI infrastructure components verified successfully!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Set OPENAI_API_KEY in .env file');
      console.log('   2. Set ANTHROPIC_API_KEY in .env file');
      console.log('   3. Start the application: npm run start:dev');
      console.log('   4. Test AI endpoints: POST /api/ai/complete');
    } else {
      console.log('❌ Some components failed verification');
      console.log('   Please check the error messages above');
    }
    console.log('='.repeat(60) + '\n');

    await app.close();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyAIInfrastructure();
