import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContentCreatorAgent } from '../agents/content-creator.agent';
import {
  GenerateContentDto,
  OptimizeContentDto,
  CheckBrandVoiceDto,
  TrainBrandVoiceDto,
} from '../dto/generate-content.dto';
import { BrandVoiceService } from '../services/brand-voice.service';

@Controller('ai/content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(
    private readonly contentCreator: ContentCreatorAgent,
    private readonly brandVoiceService: BrandVoiceService,
  ) {}

  /**
   * Generate content variations
   * POST /api/ai/content/generate
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateContent(
    @Body() dto: GenerateContentDto,
    @Request() req: any,
  ) {
    const request = {
      ...dto,
      workspaceId: req.user.workspaceId,
    };

    return this.contentCreator.generateContent(request);
  }

  /**
   * Optimize existing content
   * POST /api/ai/content/optimize
   */
  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  async optimizeContent(
    @Body() dto: OptimizeContentDto,
    @Request() req: any,
  ) {
    const request = {
      ...dto,
      workspaceId: req.user.workspaceId,
    };

    return this.contentCreator.optimizeContent(request);
  }

  /**
   * Check brand voice consistency
   * POST /api/ai/content/check-brand-voice
   */
  @Post('check-brand-voice')
  @HttpCode(HttpStatus.OK)
  async checkBrandVoice(
    @Body() dto: CheckBrandVoiceDto,
    @Request() req: any,
  ) {
    const brandVoice = await this.brandVoiceService.getBrandVoice(
      dto.brandVoiceId,
      req.user.workspaceId,
    );

    return this.contentCreator.checkBrandVoice(
      dto.content,
      brandVoice,
      req.user.workspaceId,
    );
  }

  /**
   * Train brand voice
   * POST /api/ai/content/brand-voice
   */
  @Post('brand-voice')
  @HttpCode(HttpStatus.CREATED)
  async trainBrandVoice(
    @Body() dto: TrainBrandVoiceDto,
    @Request() req: any,
  ) {
    return this.brandVoiceService.createBrandVoice({
      ...dto,
      workspaceId: req.user.workspaceId,
    });
  }

  /**
   * Get brand voice profiles
   * GET /api/ai/content/brand-voice
   */
  @Get('brand-voice')
  async getBrandVoices(@Request() req: any) {
    return this.brandVoiceService.getBrandVoices(req.user.workspaceId);
  }

  /**
   * Get specific brand voice
   * GET /api/ai/content/brand-voice/:id
   */
  @Get('brand-voice/:id')
  async getBrandVoice(@Param('id') id: string, @Request() req: any) {
    return this.brandVoiceService.getBrandVoice(id, req.user.workspaceId);
  }

  /**
   * Update brand voice
   * PUT /api/ai/content/brand-voice/:id
   */
  @Put('brand-voice/:id')
  async updateBrandVoice(
    @Param('id') id: string,
    @Body() dto: TrainBrandVoiceDto,
    @Request() req: any,
  ) {
    return this.brandVoiceService.updateBrandVoice(
      id,
      req.user.workspaceId,
      dto,
    );
  }

  /**
   * Delete brand voice
   * DELETE /api/ai/content/brand-voice/:id
   */
  @Delete('brand-voice/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBrandVoice(@Param('id') id: string, @Request() req: any) {
    await this.brandVoiceService.deleteBrandVoice(id, req.user.workspaceId);
  }
}
