import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListeningStreamManagerService } from '../services/listening-stream-manager.service';

/**
 * Worker service for managing mention collection
 * Ensures all active queries have running streams
 */
@Injectable()
export class MentionCollectionWorker implements OnModuleInit {
  private readonly logger = new Logger(MentionCollectionWorker.name);
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamManager: ListeningStreamManagerService,
  ) {}

  /**
   * Initialize worker on module startup
   */
  async onModuleInit() {
    this.logger.log('Initializing mention collection worker');
    
    // Start all active queries
    await this.startActiveQueries();
    
    // Set up health check to restart failed streams
    this.startHealthCheck();
  }

  /**
   * Start all active listening queries
   */
  private async startActiveQueries(): Promise<void> {
    try {
      await this.streamManager.startAllActiveQueries();
      this.logger.log('All active queries started successfully');
    } catch (error) {
      this.logger.error(`Error starting active queries: ${error.message}`, error.stack);
    }
  }

  /**
   * Start periodic health check
   */
  private startHealthCheck(): void {
    // Check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000);

    this.logger.log('Health check started');
  }

  /**
   * Perform health check on all streams
   */
  private async performHealthCheck(): Promise<void> {
    try {
      this.logger.debug('Performing health check on listening streams');

      const activeQueries = await this.prisma.listeningQuery.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const query of activeQueries) {
        const status = this.streamManager.getStreamStatus(query.id);
        
        // Check if any streams are inactive
        const inactiveStreams = status.filter(s => !s.active);
        
        if (inactiveStreams.length > 0) {
          this.logger.warn(
            `Query ${query.name} (${query.id}) has ${inactiveStreams.length} inactive streams. Restarting...`,
          );
          
          try {
            await this.streamManager.startQuery(query.id);
          } catch (error) {
            this.logger.error(
              `Failed to restart query ${query.id}: ${error.message}`,
              error.stack,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    this.logger.log('Stopping mention collection worker');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    await this.streamManager.stopAllStreams();
  }
}
