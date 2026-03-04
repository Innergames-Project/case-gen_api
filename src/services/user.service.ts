import { Injectable, ConflictException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from 'src/types/user.type';
import { CreateUserRequest } from 'src/types/request/createUser.req';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) { }

    async findAll(): Promise<User[]> {
        return this.userRepository.findAll();
    }

    async findById(id: number): Promise<User> {
        return this.userRepository.findById(id);
    }
}