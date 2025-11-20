import { IsString, IsArray, IsOptional, IsBoolean, IsInt, IsEnum, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class CreateListeningQueryDto {
  @ApiProperty({ description: 'Name of the listening query' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Description of what this query monitors' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Keywords to monitor', type: [String] })
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({ description: 'Boolean search query string' })
  @IsString()
  @MinLength(1)
  query: string;

  @ApiProperty({ 
    description: 'Platforms to monitor', 
    enum: Platform,
    isArray: true 
  })
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms: Platform[];

  @ApiPropertyOptional({ 
    description: 'ISO language codes to monitor (e.g., en, es, fr)', 
    type: [String],
    example: ['en', 'es', 'fr']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ 
    description: 'Geographic locations to monitor', 
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({ 
    description: 'Keywords to exclude from results', 
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @ApiPropertyOptional({ 
    description: 'Include retweets/shares in results',
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  includeRetweets?: boolean;

  @ApiPropertyOptional({ 
    description: 'Minimum follower count for authors' 
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minFollowers?: number;

  @ApiPropertyOptional({ 
    description: 'Enable alerts for this query',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @ApiPropertyOptional({ 
    description: 'Number of mentions to trigger an alert' 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  alertThreshold?: number;

  @ApiPropertyOptional({ 
    description: 'Email addresses to receive alerts', 
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertRecipients?: string[];
}
