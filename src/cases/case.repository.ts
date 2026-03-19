import { Injectable } from '@nestjs/common';
import { CreateCaseDto } from './dto/create-case.dto';
import { CaseDocument } from './types/case-document.type';

@Injectable()
export class CaseRepository {
  // Temporary in-memory store while the project is still defining its database model.
  private readonly cases: CaseDocument[] = [];

  async create(input: CreateCaseDto): Promise<CaseDocument> {
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
}
