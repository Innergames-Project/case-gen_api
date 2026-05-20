import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { DocumentTextService } from './document-text.service';
import { GroqService } from './groq.service';

@Module({
  controllers: [AiController],
  providers: [GroqService, DocumentTextService],
  exports: [GroqService, DocumentTextService],
})
export class AiModule {}
