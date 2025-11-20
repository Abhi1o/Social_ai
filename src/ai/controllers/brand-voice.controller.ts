import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BrandVoiceService } from '../services/brand-voice.service';
import {
  TrainBrandVoiceDto,
  UpdateBrandVoiceDto,
  CheckBrandVoiceDto,
} from '../dto/train-brand-voice.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai/brand-voice')
export class BrandVoiceController {
  constructor(private readonly brandVoiceService: BrandVoiceService) {}

  @Post()
  async createBrandVoice(
    @Request() req: any,
    @Body() dto: TrainBrandVoiceDto,
  ) {
    const workspaceId = req.user.workspaceId;

    const brandVoice = await this.brandVoiceService.createBrandVoice({
      workspaceId,
      name: dto.name,
      description: dto.description,
      tone: dto.tone,
      vocabulary: dto.vocabulary,
      avoidWords: dto.avoidWords,
      examples: dto.examples,
      guidelines: dto.guidelines,
      isDefault: dto.isDefault,
    });

    return {
      success: true,
      data: brandVoice,
      message: 'Brand voice profile created and trained successfully',
    };
  }

  @Get()
  async getBrandVoices(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    const brandVoices = await this.brandVoiceService.getBrandVoices(workspaceId);

    return {
      success: true,
      data: brandVoices,
      count: brandVoices.length,
    };
  }

  @Get('default')
  async getDefaultBrandVoice(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    const brandVoice = await this.brandVoiceService.getDefaultBrandVoice(workspaceId);

    return {
      success: true,
      data: brandVoice,
    };
  }

  @Get(':id')
  async getBrandVoice(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    const brandVoice = await this.brandVoiceService.getBrandVoice(id, workspaceId);

    return {
      success: true,
      data: brandVoice,
    };
  }

  @Put(':id')
  async updateBrandVoice(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBrandVoiceDto,
  ) {
    const workspaceId = req.user.workspaceId;

    const brandVoice = await this.brandVoiceService.updateBrandVoice(
      id,
      workspaceId,
      dto,
    );

    return {
      success: true,
      data: brandVoice,
      message: 'Brand voice profile updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBrandVoice(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    await this.brandVoiceService.deleteBrandVoice(id, workspaceId);
  }

  @Post('check')
  async checkBrandVoice(@Request() req: any, @Body() dto: CheckBrandVoiceDto) {
    const workspaceId = req.user.workspaceId;

    const result = await this.brandVoiceService.checkBrandVoiceConsistency(
      dto.content,
      dto.brandVoiceId,
      workspaceId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
