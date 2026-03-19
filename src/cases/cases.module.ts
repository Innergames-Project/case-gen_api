import { Module } from '@nestjs/common';
import { CaseRepository } from './case.repository';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  controllers: [CasesController],
  providers: [CaseRepository, CasesService],
  exports: [CaseRepository, CasesService],
})
export class CasesModule {}
