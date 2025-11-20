import { PartialType } from '@nestjs/swagger';
import { CreateListeningQueryDto } from './create-listening-query.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateListeningQueryDto extends PartialType(CreateListeningQueryDto) {
  @ApiPropertyOptional({ description: 'Activate or deactivate the query' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
