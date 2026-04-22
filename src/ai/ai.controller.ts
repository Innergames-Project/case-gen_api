import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CardPdfService } from './card-pdf.service';
import { DocumentTextService } from './document-text.service';
import type { GenerateCaseDto } from './dto/generate-case.dto';
import { GroqService } from './groq.service';
import type { UploadedDocument } from './types/game-card.type';

@Controller('ai')
export class AiController {
  constructor(
    private readonly groqService: GroqService,
    private readonly documentTextService: DocumentTextService,
    private readonly cardPdfService: CardPdfService,
  ) {}

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

  @Post('generate-cards')
  @UseInterceptors(FileInterceptor('document'))
  async generateCards(
    @UploadedFile() document: UploadedDocument | undefined,
    @Body('prompt') prompt?: string,
  ) {
    const documentText = this.documentTextService.extractText(document);
    const result = await this.groqService.generateCardsFromDocument(
      documentText,
      prompt,
    );
    const pdf = this.cardPdfService.createCardsPdf(result.cards);

    return {
      ...result,
      pdf: {
        filename: 'game-cards.pdf',
        contentType: 'application/pdf',
        base64: pdf.toString('base64'),
      },
    };
  }

  @Post('generate-cards/pdf')
  @UseInterceptors(FileInterceptor('document'))
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="game-cards.pdf"')
  async generateCardsPdf(
    @UploadedFile() document: UploadedDocument | undefined,
    @Body('prompt') prompt: string | undefined,
  ) {
    const documentText = this.documentTextService.extractText(document);
    const result = await this.groqService.generateCardsFromDocument(
      documentText,
      prompt,
    );
    const pdf = this.cardPdfService.createCardsPdf(result.cards);

    return new StreamableFile(pdf);
  }
}
