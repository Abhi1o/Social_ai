import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { Platform } from '@prisma/client';

export class InitiateConnectionDto {
  @IsEnum(Platform)
  @IsNotEmpty()
  platform: Platform;
}

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
