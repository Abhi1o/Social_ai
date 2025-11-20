import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export class AnalyzeInfluencerDto {
  @IsNotEmpty()
  @IsString()
  @IsEnum(['instagram', 'twitter', 'tiktok', 'youtube', 'linkedin'])
  platform: string;

  @IsNotEmpty()
  @IsString()
  username: string;
}
