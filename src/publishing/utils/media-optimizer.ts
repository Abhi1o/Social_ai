import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { PublishMediaAsset } from '../interfaces/platform-publisher.interface';

/**
 * Media optimization configuration
 */
export interface MediaOptimizationConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100
  format?: 'jpeg' | 'png' | 'webp';
  maxFileSize?: number; // bytes
}

/**
 * Optimized media result
 */
export interface OptimizedMedia {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Service for optimizing images and videos for social media platforms
 */
@Injectable()
export class MediaOptimizer {
  private readonly logger = new Logger(MediaOptimizer.name);

  /**
   * Optimize an image for platform requirements
   */
  async optimizeImage(
    imageBuffer: Buffer,
    config: MediaOptimizationConfig,
  ): Promise<OptimizedMedia> {
    try {
      let pipeline = sharp(imageBuffer);

      // Get original metadata
      const metadata = await pipeline.metadata();
      this.logger.debug(
        `Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}, size: ${imageBuffer.length} bytes`,
      );

      // Resize if needed
      if (config.maxWidth || config.maxHeight) {
        pipeline = pipeline.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert format if specified
      if (config.format) {
        switch (config.format) {
          case 'jpeg':
            pipeline = pipeline.jpeg({ quality: config.quality || 85 });
            break;
          case 'png':
            pipeline = pipeline.png({ quality: config.quality || 85 });
            break;
          case 'webp':
            pipeline = pipeline.webp({ quality: config.quality || 85 });
            break;
        }
      }

      // Generate optimized image
      const optimizedBuffer = await pipeline.toBuffer();
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();

      // Check if we need to reduce quality further to meet file size limit
      if (config.maxFileSize && optimizedBuffer.length > config.maxFileSize) {
        return this.compressToSize(
          imageBuffer,
          config.maxFileSize,
          config.format || 'jpeg',
          config.maxWidth,
          config.maxHeight,
        );
      }

      this.logger.debug(
        `Optimized image: ${optimizedMetadata.width}x${optimizedMetadata.height}, size: ${optimizedBuffer.length} bytes`,
      );

      return {
        buffer: optimizedBuffer,
        format: optimizedMetadata.format || config.format || 'jpeg',
        width: optimizedMetadata.width || 0,
        height: optimizedMetadata.height || 0,
        size: optimizedBuffer.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to optimize image: ${errorMessage}`);
      throw new Error(`Image optimization failed: ${errorMessage}`);
    }
  }

  /**
   * Compress image to meet specific file size requirement
   */
  private async compressToSize(
    imageBuffer: Buffer,
    maxSize: number,
    format: 'jpeg' | 'png' | 'webp',
    maxWidth?: number,
    maxHeight?: number,
  ): Promise<OptimizedMedia> {
    let quality = 85;
    let optimizedBuffer: Buffer;
    let metadata: sharp.Metadata;

    // Binary search for optimal quality
    let minQuality = 10;
    let maxQuality = 85;

    while (minQuality <= maxQuality) {
      quality = Math.floor((minQuality + maxQuality) / 2);

      let pipeline = sharp(imageBuffer);

      if (maxWidth || maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality });
          break;
        case 'png':
          pipeline = pipeline.png({ quality });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
      }

      optimizedBuffer = await pipeline.toBuffer();

      if (optimizedBuffer.length <= maxSize) {
        minQuality = quality + 1;
      } else {
        maxQuality = quality - 1;
      }
    }

    // Use the last successful compression
    let pipeline = sharp(imageBuffer);
    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: maxQuality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: maxQuality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: maxQuality });
        break;
    }

    optimizedBuffer = await pipeline.toBuffer();
    metadata = await sharp(optimizedBuffer).metadata();

    this.logger.debug(
      `Compressed to size: quality=${maxQuality}, size=${optimizedBuffer.length} bytes`,
    );

    return {
      buffer: optimizedBuffer,
      format: metadata.format || format,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: optimizedBuffer.length,
    };
  }

  /**
   * Validate image aspect ratio
   */
  validateAspectRatio(
    width: number,
    height: number,
    minRatio: number,
    maxRatio: number,
  ): boolean {
    const ratio = width / height;
    return ratio >= minRatio && ratio <= maxRatio;
  }

  /**
   * Calculate aspect ratio
   */
  calculateAspectRatio(width: number, height: number): number {
    return width / height;
  }

  /**
   * Crop image to specific aspect ratio
   */
  async cropToAspectRatio(
    imageBuffer: Buffer,
    targetRatio: number,
  ): Promise<OptimizedMedia> {
    const metadata = await sharp(imageBuffer).metadata();
    const currentRatio = (metadata.width || 1) / (metadata.height || 1);

    let width = metadata.width || 0;
    let height = metadata.height || 0;

    if (currentRatio > targetRatio) {
      // Image is too wide, crop width
      width = Math.floor(height * targetRatio);
    } else if (currentRatio < targetRatio) {
      // Image is too tall, crop height
      height = Math.floor(width / targetRatio);
    }

    const optimizedBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .toBuffer();

    const optimizedMetadata = await sharp(optimizedBuffer).metadata();

    return {
      buffer: optimizedBuffer,
      format: optimizedMetadata.format || 'jpeg',
      width: optimizedMetadata.width || 0,
      height: optimizedMetadata.height || 0,
      size: optimizedBuffer.length,
    };
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(imageBuffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: imageBuffer.length,
    };
  }
}
