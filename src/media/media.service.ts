import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Service, UploadResult } from './s3.service';

export interface MediaAsset {
  id: string;
  tenantId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cdnUrl: string;
  s3Key: string;
  folder: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

@Injectable()
export class MediaService {
  constructor(private s3Service: S3Service) {}

  async uploadMedia(
    file: Express.Multer.File,
    tenantId: string,
    folder: string = 'media',
  ): Promise<MediaAsset> {
    // Validate file type
    this.validateFile(file);

    // Upload to S3
    const uploadResult = await this.s3Service.uploadFile(file, tenantId, folder);

    // Create media asset record
    const mediaAsset: MediaAsset = {
      id: this.generateId(),
      tenantId,
      fileName: uploadResult.key.split('/').pop(),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: uploadResult.url,
      cdnUrl: uploadResult.cdnUrl,
      s3Key: uploadResult.key,
      folder,
      metadata: {
        bucket: uploadResult.bucket,
        contentType: uploadResult.contentType,
      },
      createdAt: new Date(),
    };

    return mediaAsset;
  }

  async deleteMedia(s3Key: string): Promise<void> {
    await this.s3Service.deleteFile(s3Key);
  }

  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    return await this.s3Service.getSignedUrl(s3Key, expiresIn);
  }

  private validateFile(file: Express.Multer.File): void {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not supported');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}