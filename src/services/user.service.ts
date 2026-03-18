import { Injectable, ConflictException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from 'src/types/user.type';
import { CreateUserRequest } from 'src/types/request/createUser.req';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) { }

    async create(req: CreateUserRequest): Promise<User> {
        const existingUser = await this.userRepository.findByEmail(req.email);
        
        if (existingUser) {
            throw new ConflictException('A user with this email already exists');
        }

        return this.userRepository.create(req);
    }

    async findAll(): Promise<User[]> {
        const users = await this.userRepository.findAll();

        users.map(user =>{
            delete user.password;
        })

        return users;
    }

    async findById(id: number): Promise<User> {
        const user = await this.userRepository.findById(id);
        delete user.password;
        return user;
    }

    async findByEmail(email: string): Promise<User> {
        const user = await this.userRepository.findByEmail(email);
        delete user.password;
        return user;

    }
}