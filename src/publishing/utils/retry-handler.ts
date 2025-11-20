import { Logger } from '@nestjs/common';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[]; // Error messages that should trigger retry
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Utility class for handling retries with exponential backoff
 */
export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name);

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context?: string,
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < config.maxAttempts) {
      attempt++;

      try {
        const result = await fn();
        if (attempt > 1) {
          this.logger.log(
            `${context || 'Operation'} succeeded on attempt ${attempt}`,
          );
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config)) {
          this.logger.error(
            `${context || 'Operation'} failed with non-retryable error: ${lastError.message}`,
          );
          throw lastError;
        }

        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          this.logger.warn(
            `${context || 'Operation'} failed on attempt ${attempt}/${config.maxAttempts}. ` +
              `Retrying in ${delay}ms. Error: ${lastError.message}`,
          );
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      `${context || 'Operation'} failed after ${config.maxAttempts} attempts`,
    );
    throw lastError || new Error('Max retry attempts reached');
  }

  /**
   * Execute with retry and return result object instead of throwing
   */
  async executeWithRetryResult<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context?: string,
  ): Promise<RetryResult<T>> {
    try {
      const data = await this.executeWithRetry(fn, config, context);
      return {
        success: true,
        data,
        attempts: 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: config.maxAttempts,
      };
    }
  }

  /**
   * Calculate delay for next retry using exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Check if an error should trigger a retry
   */
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    // If specific retryable errors are configured, check against them
    if (config.retryableErrors && config.retryableErrors.length > 0) {
      return config.retryableErrors.some((retryableError) =>
        error.message.toLowerCase().includes(retryableError.toLowerCase()),
      );
    }

    // Default retryable error patterns
    const retryablePatterns = [
      'timeout',
      'network',
      'econnrefused',
      'econnreset',
      'etimedout',
      'rate limit',
      'too many requests',
      '429',
      '500',
      '502',
      '503',
      '504',
      'temporary',
      'unavailable',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute multiple operations with retry in parallel
   */
  async executeAllWithRetry<T>(
    operations: Array<() => Promise<T>>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
  ): Promise<RetryResult<T>[]> {
    const promises = operations.map((op, index) =>
      this.executeWithRetryResult(op, config, `Operation ${index + 1}`),
    );

    return Promise.all(promises);
  }

  /**
   * Execute operations with retry in sequence
   */
  async executeSequentiallyWithRetry<T>(
    operations: Array<() => Promise<T>>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
  ): Promise<RetryResult<T>[]> {
    const results: RetryResult<T>[] = [];

    for (let i = 0; i < operations.length; i++) {
      const result = await this.executeWithRetryResult(
        operations[i],
        config,
        `Operation ${i + 1}`,
      );
      results.push(result);

      // Stop if operation failed and it's critical
      if (!result.success) {
        this.logger.error(`Sequential operation ${i + 1} failed, stopping execution`);
        break;
      }
    }

    return results;
  }
}
