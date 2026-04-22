import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { CreateCaseDto, UpdateCaseDto } from './dto/create-case.dto';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async findAll() {
    // Public for now while auth is disabled.
    return this.casesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Post()
  async create(@Body() input: CreateCaseDto) {
    // Public for now while auth is disabled.
    return this.casesService.create(input);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() input: UpdateCaseDto) {
    return this.casesService.update(id, input);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.casesService.remove(id);

    return {
      deleted: true,
      id,
    };
  }
}
