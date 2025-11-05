import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsString, MinLength, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['tenantId'] as const)
) {
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}