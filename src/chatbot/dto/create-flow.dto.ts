import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { FlowTriggerType } from '@prisma/client';

export class CreateFlowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(FlowTriggerType)
  triggerType: FlowTriggerType;

  @IsOptional()
  @IsString()
  triggerValue?: string;

  @IsObject()
  nodes: any; // Flow nodes configuration

  @IsObject()
  edges: any; // Flow edges configuration

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
