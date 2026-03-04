import { Injectable, ConflictException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from 'src/types/user.type';
import { CreateUserRequest } from 'src/types/request/createUser.req';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private readonly userRepository: UserRepository) { }

    async register(req: CreateUserRequest): Promise<User> {
        const existingUser = await this.userRepository.findByEmail(req.email);
        if (existingUser) {
            throw new ConflictException('A user with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(req.password, 10);
        req.password = hashedPassword;
        return this.userRepository.create(req);

    }
}