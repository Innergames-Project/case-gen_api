import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import type { CreateUserRequest } from 'src/types/request/createUser.req';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() req: CreateUserRequest) {
        return this.authService.register(req);
    }

}