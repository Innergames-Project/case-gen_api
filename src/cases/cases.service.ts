import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCaseDto, UpdateCaseDto } from './dto/create-case.dto';
import { CaseRepository } from './case.repository';

@Injectable()
export class CasesService {
  constructor(private readonly caseRepository: CaseRepository) {}

  async create(input: CreateCaseDto) {
    const title = this.readRequiredText(input.title, 'title');
    const description = this.readRequiredText(input.description, 'description');

    // Business logic stays here, persistence details stay in the repository.
    return this.caseRepository.create({ title, description });
  }

  async findAll() {
    return this.caseRepository.findAll();
  }

  async findOne(id: string) {
    const caseDocument = await this.caseRepository.findById(id);

    if (!caseDocument) {
      throw new NotFoundException(`Case ${id} was not found`);
    }

    return caseDocument;
  }

  async update(id: string, input: UpdateCaseDto) {
    const update = {
      title: this.readOptionalText(input.title, 'title'),
      description: this.readOptionalText(input.description, 'description'),
    };

    if (update.title === undefined && update.description === undefined) {
      throw new BadRequestException('At least one field is required');
    }

    const caseDocument = await this.caseRepository.update(id, update);

    if (!caseDocument) {
      throw new NotFoundException(`Case ${id} was not found`);
    }

    return caseDocument;
  }

  async remove(id: string) {
    const deleted = await this.caseRepository.remove(id);

    if (!deleted) {
      throw new NotFoundException(`Case ${id} was not found`);
    }
  }

  private readRequiredText(value: unknown, field: string): string {
    const text = this.readOptionalText(value, field);

    if (!text) {
      throw new BadRequestException(`${field} is required`);
    }

    return text;
  }

  private readOptionalText(value: unknown, field: string): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const text = value.trim();

    if (!text) {
      throw new BadRequestException(`${field} cannot be empty`);
    }

    return text;
  }
}
