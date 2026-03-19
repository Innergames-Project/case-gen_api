import { Injectable, ConflictException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from 'src/types/user.type';
import { CreateUserRequest } from 'src/types/request/createUser.req';
import { CaseRepository } from 'src/repositories/case.repository';
import { Case } from 'src/types/case.type';

@Injectable()
export class CaseService {
    constructor(private readonly caseRepository: CaseRepository) { }

    async findAll(): Promise<Case[]> {
        return this.caseRepository.findAll();
    }

    async findById(id: number): Promise<Case> {
        return this.caseRepository.findById(id);
    }
}
