import { Injectable } from '@nestjs/common';
import type { CaseDifficulty, ConsequenceCard, StepCard } from '../ai/types/game-card.type';
import { CaseDocument } from './types/case-document.type';

type CaseInput = Pick<CaseDocument, 'title' | 'description'> & {
  difficulty?: CaseDifficulty | null;
  stepCards?: StepCard[];
  consequenceCards?: ConsequenceCard[];
};

type CardUpdate = {
  difficulty: CaseDifficulty;
  stepCards: StepCard[];
  consequenceCards: ConsequenceCard[];
};

@Injectable()
export class CaseRepository {
  // Temporary in-memory store while the project is still defining its database model.
  private readonly cases: CaseDocument[] = [];

  async create(input: CaseInput): Promise<CaseDocument> {
    const now = new Date().toISOString();
    const caseDocument: CaseDocument = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      difficulty: input.difficulty ?? null,
      stepCards: input.stepCards ?? [],
      consequenceCards: input.consequenceCards ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.cases.unshift(caseDocument);
    return caseDocument;
  }

  async findAll(): Promise<CaseDocument[]> {
    return [...this.cases];
  }

  async findById(id: string): Promise<CaseDocument | null> {
    return this.cases.find((c) => c.id === id) ?? null;
  }

  async update(
    id: string,
    input: Partial<CaseInput>,
  ): Promise<CaseDocument | null> {
    const caseDocument = await this.findById(id);

    if (!caseDocument) {
      return null;
    }

    if (input.title !== undefined) caseDocument.title = input.title;
    if (input.description !== undefined) caseDocument.description = input.description;

    caseDocument.updatedAt = new Date().toISOString();
    return { ...caseDocument };
  }

  async updateCards(id: string, cards: CardUpdate): Promise<CaseDocument | null> {
    const caseDocument = await this.findById(id);

    if (!caseDocument) {
      return null;
    }

    caseDocument.difficulty = cards.difficulty;
    caseDocument.stepCards = cards.stepCards;
    caseDocument.consequenceCards = cards.consequenceCards;
    caseDocument.updatedAt = new Date().toISOString();

    return { ...caseDocument };
  }

  async remove(id: string): Promise<boolean> {
    const index = this.cases.findIndex((c) => c.id === id);

    if (index === -1) {
      return false;
    }

    this.cases.splice(index, 1);
    return true;
  }
}
