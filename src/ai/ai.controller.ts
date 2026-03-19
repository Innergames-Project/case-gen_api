import { Body, Controller, Get, Post } from '@nestjs/common';
import type { GenerateCaseDto } from './dto/generate-case.dto';
import { GroqService } from './groq.service';

@Controller('ai')
export class AiController {
  constructor(private readonly groqService: GroqService) {}

  @Get('health')
  health() {
    // Lightweight endpoint to confirm whether the Groq API key is configured.
    return {
      provider: 'groq',
      configured: this.groqService.isConfigured(),
    };
  }

  @Post('generate-case')
  async generateCase(@Body() input: GenerateCaseDto) {
    // Public for now while auth is disabled.
    return this.groqService.generateCaseDraft(input.prompt);
  }
}
