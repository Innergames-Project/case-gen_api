import { Injectable } from '@nestjs/common';
import { CreateCaseDto } from './dto/create-case.dto';
import { CaseRepository } from './case.repository';

@Injectable()
export class CasesService {
  constructor(private readonly caseRepository: CaseRepository) {}

  async create(input: CreateCaseDto) {
    // Business logic stays here, persistence details stay in the repository.
    return this.caseRepository.create(input);
  }

  async findAll() {
    return this.caseRepository.findAll();
  }
}
