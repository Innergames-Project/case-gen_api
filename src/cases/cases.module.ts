import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CaseRepository } from './case.repository';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [AiModule],
  controllers: [CasesController],
  providers: [CaseRepository, CasesService],
  exports: [CaseRepository, CasesService],
})
export class CasesModule {}
