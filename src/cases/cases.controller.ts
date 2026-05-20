import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { CaseDifficulty, UploadedDocument } from '../ai/types/game-card.type';
import { DocumentTextService } from '../ai/document-text.service';
import { GroqService } from '../ai/groq.service';
import type { CreateCaseDto, UpdateCaseDto } from './dto/create-case.dto';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly groqService: GroqService,
    private readonly documentTextService: DocumentTextService,
  ) {}

  @Get()
  async findAll() {
    return this.casesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Post()
  async create(@Body() input: CreateCaseDto) {
    return this.casesService.create(input);
  }

  @Post('generate')
  @UseInterceptors(FileInterceptor('document'))
  async generateCase(
    @UploadedFile() document: UploadedDocument | undefined,
    @Body('prompt') prompt?: string,
    @Body('difficulty') difficulty?: string,
  ) {
    const fileText = this.documentTextService.extractOptionalText(document);
    const userText = typeof prompt === 'string' ? prompt.trim() : '';

    if (!fileText && !userText) {
      throw new BadRequestException(
        'Provide a text prompt, a document file, or both.',
      );
    }

    const sourceText = [userText, fileText].filter(Boolean).join('\n\n');
    const resolvedDifficulty = this.readDifficulty(difficulty);

    const { title, description } =
      await this.groqService.generateCaseDescription(sourceText);

    const { model, difficulty: aiDifficulty, stepCards, consequenceCards } =
      await this.groqService.generateCaseCards(description, resolvedDifficulty);

    const caseDocument = await this.casesService.createWithCards({
      title,
      description,
      difficulty: aiDifficulty,
      stepCards,
      consequenceCards,
    });

    return { model, case: caseDocument };
  }

  @Post(':id/cards')
  async regenerateCards(
    @Param('id') id: string,
    @Body('difficulty') difficulty?: string,
  ) {
    const caseDocument = await this.casesService.findOne(id);
    const resolvedDifficulty =
      this.readDifficulty(difficulty) ?? caseDocument.difficulty ?? undefined;

    const { difficulty: aiDifficulty, stepCards, consequenceCards } =
      await this.groqService.generateCaseCards(caseDocument.description, resolvedDifficulty);

    return this.casesService.regenerateCards(id, {
      difficulty: aiDifficulty,
      stepCards,
      consequenceCards,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() input: UpdateCaseDto) {
    return this.casesService.update(id, input);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.casesService.remove(id);
    return { deleted: true, id };
  }

  private readDifficulty(value: unknown): CaseDifficulty | undefined {
    if (value === 'easy' || value === 'medium' || value === 'hard') {
      return value;
    }
    return undefined;
  }
}
