import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, UserRepository, UserService, AuthService],
})
export class AppModule { }
