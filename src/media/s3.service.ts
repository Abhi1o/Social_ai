import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl: string;
  bucket: string;
  size: number;
  contentType: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: AWS.S3;
  private readonly bucketName: string;
  private readonly cloudFrontDomain: string;

  constructor(private configService: ConfigService) {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION', 'us-east-1'),
    });

    this.s3 = new AWS.S3();
    this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    this.cloudFrontDomain = this.configService.get('AWS_CLOUDFRONT_DOMAIN');
  }

  async uploadFile(
    file: Express.Multer.File,
    tenantId: string,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `${tenantId}/${folder}/${fileName}`;

    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
      Metadata: {
        originalName: file.originalname,
        tenantId: tenantId,
        uploadedAt: new Date().toISOString(),
      },
    };

    try {
      const result = await this.s3.upload(uploadParams).promise();
      
      const cdnUrl = this.cloudFrontDomain 
        ? `https://${this.cloudFrontDomain}/${key}`
        : result.Location;

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url: result.Location,
        cdnUrl,
        bucket: this.bucketName,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const deleteParams: AWS.S3.DeleteObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      await this.s3.deleteObject(deleteParams).promise();
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn,
    };

    try {
      return await this.s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`, error.stack);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const copyParams: AWS.S3.CopyObjectRequest = {
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
      ACL: 'public-read',
    };

    try {
      await this.s3.copyObject(copyParams).promise();
      this.logger.log(`File copied from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      this.logger.error(`Failed to copy file: ${error.message}`, error.stack);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }
}