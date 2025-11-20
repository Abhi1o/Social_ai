import { IsOptional, IsString, IsArray, IsEnum, IsObject } from 'class-validator';

export class UpdateInfluencerDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niche?: string[];

  @IsOptional()
  @IsEnum(['discovered', 'contacted', 'collaborating', 'archived'])
  status?: string;

  @IsOptional()
  @IsObject()
  contactInfo?: {
    email?: string;
    website?: string;
    businessInquiries?: string;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}
