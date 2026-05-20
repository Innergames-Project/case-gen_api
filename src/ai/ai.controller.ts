import { Controller, Get } from '@nestjs/common';
import { GroqService } from './groq.service';

@Controller('ai')
export class AiController {
  constructor(private readonly groqService: GroqService) {}

  @Get('health')
  health() {
    return {
      provider: 'groq',
      configured: this.groqService.isConfigured(),
    };
  }
}
