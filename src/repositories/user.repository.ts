import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User } from '../types/user.type';
import { CreateUserRequest } from 'src/types/request/createUser.req';

@Injectable()
export class UserRepository {
    constructor(private readonly db: DatabaseService) { }

    // async findAll(): Promise<User[]> {
    //     return this.db.query('SELECT * FROM users');
    // }

    // async findById(id: number): Promise<User> {
    //     const users = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    //     return users[0];
    // }

    // async findByEmail(email: string): Promise<User> {
    //     const users = await this.db.query('SELECT * FROM users WHERE email = ?', [email]);
    //     return users[0];
    // }

    // async create(req: CreateUserRequest): Promise<User> {
    //     const result = await this.db.query('INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())', [req.name, req.email, req.password]);
    //     return this.findById(result.insertId);
    // }
}