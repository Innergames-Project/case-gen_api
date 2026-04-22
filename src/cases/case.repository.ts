import { Injectable } from '@nestjs/common';
import { CaseDocument } from './types/case-document.type';

type CaseInput = Pick<CaseDocument, 'title' | 'description'>;

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
      cardIds: [],
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
    return this.cases.find((caseDocument) => caseDocument.id === id) ?? null;
  }

  async update(
    id: string,
    input: Partial<CaseInput>,
  ): Promise<CaseDocument | null> {
    const caseDocument = await this.findById(id);

    if (!caseDocument) {
      return null;
    }

    if (input.title !== undefined) {
      caseDocument.title = input.title;
    }

    if (input.description !== undefined) {
      caseDocument.description = input.description;
    }

    caseDocument.updatedAt = new Date().toISOString();

    return { ...caseDocument };
  }

  async remove(id: string): Promise<boolean> {
    const index = this.cases.findIndex(
      (caseDocument) => caseDocument.id === id,
    );

    if (index === -1) {
      return false;
    }

    this.cases.splice(index, 1);
    return true;
  }
}
