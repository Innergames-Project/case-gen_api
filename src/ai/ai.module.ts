import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { CardPdfService } from './card-pdf.service';
import { DocumentTextService } from './document-text.service';
import { GroqService } from './groq.service';

@Module({
  controllers: [AiController],
  providers: [GroqService, DocumentTextService, CardPdfService],
  exports: [GroqService],
})
export class AiModule {}
