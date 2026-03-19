import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GroqService } from './groq.service';

@Module({
  controllers: [AiController],
  providers: [GroqService],
  exports: [GroqService],
})
export class AiModule {}
