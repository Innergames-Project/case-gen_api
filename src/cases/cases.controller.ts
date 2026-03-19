import { Body, Controller, Get, Post } from '@nestjs/common';
import type { CreateCaseDto } from './dto/create-case.dto';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async findAll() {
    // Public for now while auth is disabled.
    return this.casesService.findAll();
  }

  @Post()
  async create(@Body() input: CreateCaseDto) {
    // Public for now while auth is disabled.
    return this.casesService.create(input);
  }
}
